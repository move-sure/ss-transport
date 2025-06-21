'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { 
  AlertTriangle, 
  Edit, 
  Save, 
  X, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  Book,
  Shield,
  Zap,
  RefreshCw
} from 'lucide-react';

export default function BillBookEditor() {
  const { user } = useAuth();
  const [billBooks, setBillBooks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCurrentNumbers, setShowCurrentNumbers] = useState(false);
  const [formData, setFormData] = useState({});
  const [confirmationText, setConfirmationText] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  useEffect(() => {
    fetchBillBooks();
    fetchBranches();
  }, []);

  const fetchBillBooks = async () => {
    try {
      setLoading(true);
      const { data: billBooksData, error } = await supabase
        .from('bill_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBillBooks(billBooksData || []);
    } catch (error) {
      console.error('Error fetching bill books:', error);
      alert('Error fetching bill books: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, branch_name, branch_code')
        .eq('is_active', true)
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleEdit = (billBook) => {
    setEditingId(billBook.id);
    setFormData({
      current_number: billBook.current_number
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleCurrentNumberChange = (value) => {
    setFormData({
      ...formData,
      current_number: parseInt(value) || 0
    });
  };

  const validateCurrentNumber = (billBook, newCurrentNumber) => {
    const errors = [];
    
    if (newCurrentNumber < billBook.from_number) {
      errors.push(`Current number (${newCurrentNumber}) cannot be less than from number (${billBook.from_number})`);
    }
    
    if (newCurrentNumber > billBook.to_number) {
      errors.push(`Current number (${newCurrentNumber}) cannot be greater than to number (${billBook.to_number})`);
    }

    // Warning for going backwards
    if (newCurrentNumber < billBook.current_number) {
      errors.push(`WARNING: Setting current number backwards from ${billBook.current_number} to ${newCurrentNumber} may cause duplicate bill numbers!`);
    }

    return errors;
  };

  const handleSave = async () => {
    const billBook = billBooks.find(b => b.id === editingId);
    const newCurrentNumber = formData.current_number;
    
    const validationErrors = validateCurrentNumber(billBook, newCurrentNumber);
    
    if (validationErrors.length > 0) {
      alert('Validation Errors:\n' + validationErrors.join('\n'));
      return;
    }

    // Show confirmation modal for critical changes
    setPendingChanges({
      billBookId: editingId,
      oldCurrentNumber: billBook.current_number,
      newCurrentNumber: newCurrentNumber,
      billBook: billBook
    });
    setShowConfirmationModal(true);
  };

  const confirmSave = async () => {
    if (confirmationText !== 'CONFIRM CHANGE') {
      alert('Please type "CONFIRM CHANGE" to proceed');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('bill_books')
        .update({
          current_number: pendingChanges.newCurrentNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingChanges.billBookId);

      if (error) throw error;

      alert(`Bill book current number updated successfully!\nOld: ${pendingChanges.oldCurrentNumber}\nNew: ${pendingChanges.newCurrentNumber}`);
      
      await fetchBillBooks();
      setEditingId(null);
      setFormData({});
      setShowConfirmationModal(false);
      setConfirmationText('');
      setPendingChanges(null);
      
    } catch (error) {
      console.error('Error updating bill book:', error);
      alert('Error updating bill book: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmationModal(false);
    setConfirmationText('');
    setPendingChanges(null);
  };

  const formatBillNumber = (billBook, number) => {
    const paddedNumber = number.toString().padStart(billBook.digits, '0');
    return `${billBook.prefix || ''}${paddedNumber}${billBook.postfix || ''}`;
  };

  const getProgress = (billBook) => {
    const total = billBook.to_number - billBook.from_number + 1;
    const used = billBook.current_number - billBook.from_number;
    return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
  };

  const getBranchName = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? `${branch.branch_name} (${branch.branch_code})` : 'Unknown Branch';
  };

  const getRemainingNumbers = (billBook) => {
    return billBook.to_number - billBook.current_number + 1;
  };
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-2xl p-8 border-2 border-red-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-red-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-red-100 rounded"></div>
            <div className="h-4 bg-red-100 rounded w-5/6"></div>
            <div className="h-4 bg-red-100 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden">        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 via-red-100 to-red-50 border-b-2 border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-full">
                <Book className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-800">Bill Books Configuration</h2>
                <p className="text-red-600 font-medium">Edit current numbers with extreme caution</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCurrentNumbers(!showCurrentNumbers)}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 border border-red-200 hover:border-red-300 font-medium"
              >
                {showCurrentNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showCurrentNumbers ? 'Hide' : 'Show'} Current Numbers
              </button>
              <button
                onClick={fetchBillBooks}
                className="bg-red-200 hover:bg-red-300 text-red-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 border border-red-300 hover:border-red-400 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Bill Books List */}
        <div className="p-6">          {billBooks.length === 0 ? (
            <div className="text-center py-12 bg-red-50 rounded-xl border-2 border-red-200">
              <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Book className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-700 font-medium text-lg">No bill books found in the system.</p>
            </div>
          ) : (            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {billBooks.map((billBook) => (
                <div key={billBook.id} className="bg-red-25 border-2 border-red-200 rounded-xl p-6 hover:border-red-300 hover:shadow-md transition-all duration-200 hover:bg-red-50">
                  {/* Bill Book Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-red-900">
                        {formatBillNumber(billBook, billBook.from_number)} - {formatBillNumber(billBook, billBook.to_number)}
                      </h3>
                      <p className="text-sm text-red-700 font-medium">{getBranchName(billBook.branch_id)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {billBook.is_active ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200">Active</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium border border-red-200">Inactive</span>
                      )}
                      {billBook.is_completed && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium border border-gray-200">Completed</span>
                      )}
                    </div>
                  </div>                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-red-700 mb-2 font-medium">
                      <span>Progress</span>
                      <span className="bg-red-100 px-2 py-1 rounded-full">{getProgress(billBook)}%</span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-4 border border-red-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          getProgress(billBook) > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' : 
                          getProgress(billBook) > 60 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-green-400 to-green-500'
                        }`}
                        style={{ width: `${getProgress(billBook)}%` }}
                      ></div>
                    </div>
                  </div>                  {/* Bill Book Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <span className="text-red-600 font-medium">Range:</span>
                      <div className="font-bold text-red-800">{billBook.from_number} - {billBook.to_number}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <span className="text-red-600 font-medium">Remaining:</span>
                      <div className={`font-bold ${getRemainingNumbers(billBook) < 10 ? 'text-red-700' : 'text-red-800'}`}>
                        {getRemainingNumbers(billBook)} numbers
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <span className="text-red-600 font-medium">Next Bill:</span>
                      <div className="font-bold text-red-800 font-mono">
                        {formatBillNumber(billBook, billBook.current_number)}
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <span className="text-red-600 font-medium">Digits:</span>
                      <div className="font-bold text-red-800">{billBook.digits}</div>
                    </div>
                  </div>                  {/* Current Number Display/Edit */}
                  {showCurrentNumbers && (
                    <div className="bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-300 rounded-lg p-4 mb-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-red-200 p-1 rounded-full">
                          <AlertTriangle className="w-4 h-4 text-red-700" />
                        </div>
                        <span className="font-bold text-red-800">CRITICAL: Current Number</span>
                      </div>
                      
                      {editingId === billBook.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-bold text-red-800 mb-2">
                              Current Number (Next bill will be this number)
                            </label>
                            <input
                              type="number"
                              value={formData.current_number || ''}
                              onChange={(e) => handleCurrentNumberChange(e.target.value)}
                              className="w-full border-2 border-red-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white text-red-900 font-mono text-lg"
                              min={billBook.from_number}
                              max={billBook.to_number}
                            />
                            <p className="text-xs text-red-700 mt-1 font-medium bg-red-100 px-2 py-1 rounded">
                              Range: {billBook.from_number} - {billBook.to_number}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all duration-200 disabled:opacity-50 border border-red-600 shadow-sm"
                            >
                              <Save className="w-4 h-4" />
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="bg-red-200 hover:bg-red-300 text-red-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all duration-200 border border-red-300"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-3xl font-bold text-red-800 font-mono bg-white px-3 py-2 rounded-lg border border-red-300">
                              {billBook.current_number}
                            </div>
                            <div className="text-sm text-red-700 mt-2 font-medium">
                              Next bill: <span className="font-mono bg-red-100 px-2 py-1 rounded">{formatBillNumber(billBook, billBook.current_number)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleEdit(billBook)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all duration-200 border border-red-600 shadow-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}                  {/* Warnings */}
                  {getRemainingNumbers(billBook) < 10 && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-3 mb-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="bg-yellow-200 p-1 rounded-full">
                          <AlertCircle className="w-4 h-4 text-yellow-700" />
                        </div>
                        <span className="text-sm font-bold text-yellow-800">
                          Low remaining numbers: Only {getRemainingNumbers(billBook)} left!
                        </span>
                      </div>
                    </div>
                  )}

                  {billBook.is_completed && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-200 p-1 rounded-full">
                          <CheckCircle className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          This bill book has been completed
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>      {/* Confirmation Modal */}
      {showConfirmationModal && pendingChanges && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border-2 border-red-200 shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-900 mb-3">Confirm Critical Change</h3>
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-4 text-left">
                <p className="text-sm text-red-800 mb-2 font-medium">
                  <strong>Bill Book:</strong> {formatBillNumber(pendingChanges.billBook, pendingChanges.billBook.from_number)} - {formatBillNumber(pendingChanges.billBook, pendingChanges.billBook.to_number)}
                </p>
                <p className="text-sm text-red-800 mb-2 font-medium">
                  <strong>Current Number Change:</strong>
                </p>
                <p className="text-sm text-red-800 font-medium">
                  From: <span className="font-mono bg-red-200 px-2 py-1 rounded font-bold">{pendingChanges.oldCurrentNumber}</span> → 
                  To: <span className="font-mono bg-red-200 px-2 py-1 rounded font-bold">{pendingChanges.newCurrentNumber}</span>
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-red-800 mb-2">
                Type CONFIRM CHANGE to proceed:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full border-2 border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-center"
                placeholder="CONFIRM CHANGE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmSave}
                disabled={saving || confirmationText !== 'CONFIRM CHANGE'}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-600 shadow-sm"
              >
                {saving ? 'Saving...' : 'Confirm Change'}
              </button>
              <button
                onClick={cancelConfirmation}
                className="flex-1 bg-red-200 hover:bg-red-300 text-red-800 px-4 py-3 rounded-lg font-bold transition-all duration-200 border border-red-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}