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
      <div className="bg-white rounded-xl shadow-2xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Bill Books Configuration</h2>
                <p className="text-red-100">Edit current numbers with extreme caution</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCurrentNumbers(!showCurrentNumbers)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {showCurrentNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showCurrentNumbers ? 'Hide' : 'Show'} Current Numbers
              </button>
              <button
                onClick={fetchBillBooks}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Bill Books List */}
        <div className="p-6">
          {billBooks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No bill books found in the system.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {billBooks.map((billBook) => (
                <div key={billBook.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-red-300 transition-colors">
                  {/* Bill Book Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {formatBillNumber(billBook, billBook.from_number)} - {formatBillNumber(billBook, billBook.to_number)}
                      </h3>
                      <p className="text-sm text-gray-600">{getBranchName(billBook.branch_id)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {billBook.is_active ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Active</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Inactive</span>
                      )}
                      {billBook.is_completed && (
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">Completed</span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{getProgress(billBook)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          getProgress(billBook) > 80 ? 'bg-red-500' : 
                          getProgress(billBook) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${getProgress(billBook)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Bill Book Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Range:</span>
                      <div className="font-medium">{billBook.from_number} - {billBook.to_number}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <div className={`font-medium ${getRemainingNumbers(billBook) < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {getRemainingNumbers(billBook)} numbers
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Next Bill:</span>
                      <div className="font-medium">
                        {formatBillNumber(billBook, billBook.current_number)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Digits:</span>
                      <div className="font-medium">{billBook.digits}</div>
                    </div>
                  </div>

                  {/* Current Number Display/Edit */}
                  {showCurrentNumbers && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-800">CRITICAL: Current Number</span>
                      </div>
                      
                      {editingId === billBook.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-red-700 mb-1">
                              Current Number (Next bill will be this number)
                            </label>
                            <input
                              type="number"
                              value={formData.current_number || ''}
                              onChange={(e) => handleCurrentNumberChange(e.target.value)}
                              className="w-full border-2 border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              min={billBook.from_number}
                              max={billBook.to_number}
                            />
                            <p className="text-xs text-red-600 mt-1">
                              Range: {billBook.from_number} - {billBook.to_number}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-2xl font-bold text-red-800">
                              {billBook.current_number}
                            </div>
                            <div className="text-sm text-red-600">
                              Next bill: {formatBillNumber(billBook, billBook.current_number)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleEdit(billBook)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {getRemainingNumbers(billBook) < 10 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          Low remaining numbers: Only {getRemainingNumbers(billBook)} left!
                        </span>
                      </div>
                    </div>
                  )}

                  {billBook.is_completed && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
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
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && pendingChanges && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-900 mb-2">Confirm Critical Change</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <p className="text-sm text-red-800 mb-2">
                  <strong>Bill Book:</strong> {formatBillNumber(pendingChanges.billBook, pendingChanges.billBook.from_number)} - {formatBillNumber(pendingChanges.billBook, pendingChanges.billBook.to_number)}
                </p>
                <p className="text-sm text-red-800 mb-2">
                  <strong>Current Number Change:</strong>
                </p>
                <p className="text-sm text-red-800">
                  From: <span className="font-mono bg-red-100 px-2 py-1 rounded">{pendingChanges.oldCurrentNumber}</span> → 
                  To: <span className="font-mono bg-red-100 px-2 py-1 rounded">{pendingChanges.newCurrentNumber}</span>
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type "CONFIRM CHANGE" to proceed:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="CONFIRM CHANGE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmSave}
                disabled={saving || confirmationText !== 'CONFIRM CHANGE'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Confirm Change'}
              </button>
              <button
                onClick={cancelConfirmation}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
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