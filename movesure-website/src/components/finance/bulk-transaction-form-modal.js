import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, FileText, RefreshCw, Check, Building2, Plus, Trash2, ChevronDown } from 'lucide-react';

// Branch to Sender mapping
const BRANCH_SENDER_MAP = {
  'DUBE PARAO OLD': 'NEHA JI',
  'DUBE PARAO NEW': 'KOMAL JI',
  'KANPUR BRANCH': 'DUBEY JI'
};

const SENDER_OPTIONS = ['KOMAL JI', 'NEHA JI', 'DUBEY JI', 'Other'];

// Helper function to get sender based on branch name
const getSenderByBranch = (branchName) => {
  if (!branchName) return '';
  const upperBranchName = branchName.toUpperCase();
  for (const [key, value] of Object.entries(BRANCH_SENDER_MAP)) {
    if (upperBranchName.includes(key) || key.includes(upperBranchName)) {
      return value;
    }
  }
  return '';
};

export default function BulkTransactionFormModal({
  showModal,
  transactionType,
  branches,
  onClose,
  onSubmit
}) {
  const [commonData, setCommonData] = useState({
    branch_id: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  const [transactions, setTransactions] = useState([{
    id: 1,
    party_name: '',
    amount: '',
    payment_mode: 'cash',
    receiver: '',
    sender: '',
    description: ''
  }]);

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  // Get selected branch name
  const selectedBranch = branches.find(b => String(b.id) === String(commonData.branch_id));
  const branchName = selectedBranch?.branch_name || '';

  // Auto-select sender/receiver based on branch when branch changes
  useEffect(() => {
    if (branchName) {
      const autoSender = getSenderByBranch(branchName);
      if (autoSender) {
        // Update all transactions with auto-selected sender/receiver
        setTransactions(prev => prev.map(t => ({
          ...t,
          sender: transactionType === 'expense' ? autoSender : t.sender,
          receiver: transactionType === 'income' ? autoSender : t.receiver
        })));
        // Update selected options for all transactions
        const newSelectedOptions = {};
        transactions.forEach(t => {
          newSelectedOptions[t.id] = autoSender;
        });
        setSelectedOptions(newSelectedOptions);
        setShowOtherInput({});
      }
    }
  }, [branchName, transactionType]);

  if (!showModal) return null;

  const handleCommonChange = (e) => {
    const { name, value } = e.target;
    setCommonData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTransactionChange = (id, field, value) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
    if (formErrors[`transaction_${id}_${field}`]) {
      setFormErrors(prev => ({ ...prev, [`transaction_${id}_${field}`]: '' }));
    }
  };

  const addTransaction = () => {
    const newId = Math.max(...transactions.map(t => t.id)) + 1;
    setTransactions(prev => [...prev, {
      id: newId,
      party_name: '',
      amount: '',
      payment_mode: 'cash',
      receiver: '',
      sender: '',
      description: ''
    }]);
  };

  const removeTransaction = (id) => {
    if (transactions.length > 1) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!commonData.branch_id) {
      errors.branch_id = 'Branch is required';
    }
    
    if (!commonData.transaction_date) {
      errors.transaction_date = 'Date is required';
    }

    transactions.forEach((transaction) => {
      if (!transaction.party_name.trim()) {
        errors[`transaction_${transaction.id}_party_name`] = 'Party name is required';
      }
      
      if (!transaction.amount || parseFloat(transaction.amount) <= 0) {
        errors[`transaction_${transaction.id}_amount`] = 'Valid amount required';
      }

      if (transactionType === 'income' && !transaction.receiver.trim()) {
        errors[`transaction_${transaction.id}_receiver`] = 'Receiver is required';
      }

      if (transactionType === 'expense' && !transaction.sender.trim()) {
        errors[`transaction_${transaction.id}_sender`] = 'Sender is required';
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const bulkData = {
        ...commonData,
        transactions: transactions.map(t => ({
          party_name: t.party_name.trim(),
          amount: parseFloat(t.amount),
          payment_mode: t.payment_mode,
          receiver: transactionType === 'income' ? t.receiver.trim() : undefined,
          sender: transactionType === 'expense' ? t.sender.trim() : undefined,
          description: t.description.trim()
        })),
        transactionType
      };

      await onSubmit(bulkData);
      
      // Reset form
      setCommonData({
        branch_id: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      setTransactions([{
        id: 1,
        party_name: '',
        amount: '',
        payment_mode: 'cash',
        receiver: '',
        sender: '',
        description: ''
      }]);
      setFormErrors({});
    } catch (error) {
      console.error('Error submitting bulk transactions:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        {/* Modal Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${
          transactionType === 'income' 
            ? 'from-green-600 to-emerald-600' 
            : 'from-red-600 to-rose-600'
        } px-6 py-4 flex items-center justify-between rounded-t-2xl z-10`}>
          <div>
            <h3 className="text-xl font-bold text-white">
              Add Multiple {transactionType === 'income' ? 'Income' : 'Expense'} Entries
            </h3>
            <p className="text-white text-sm opacity-90 mt-1">
              Add multiple transactions for the same date and branch
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Common Fields */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Common Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    name="branch_id"
                    value={commonData.branch_id}
                    onChange={handleCommonChange}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                      formErrors.branch_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.branch_id && <p className="text-red-500 text-xs mt-1">{formErrors.branch_id}</p>}
              </div>

              {/* Transaction Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    name="transaction_date"
                    value={commonData.transaction_date}
                    onChange={handleCommonChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium"
                  />
                </div>
                {formErrors.transaction_date && <p className="text-red-500 text-xs mt-1">{formErrors.transaction_date}</p>}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Transaction Entries ({transactions.length})</h4>
              <button
                type="button"
                onClick={addTransaction}
                className={`flex items-center gap-2 px-3 py-2 text-white rounded-lg transition-all text-sm font-semibold ${
                  transactionType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Plus size={16} />
                Add Entry
              </button>
            </div>

            {transactions.map((transaction, index) => (
              <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4 relative">
                {transactions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTransaction(transaction.id)}
                    className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove Entry"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <h5 className="font-semibold text-gray-700 mb-3">Entry #{index + 1}</h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Party Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Party Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={transaction.party_name}
                        onChange={(e) => handleTransactionChange(transaction.id, 'party_name', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                          formErrors[`transaction_${transaction.id}_party_name`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter party name"
                      />
                    </div>
                    {formErrors[`transaction_${transaction.id}_party_name`] && (
                      <p className="text-red-500 text-xs mt-1">{formErrors[`transaction_${transaction.id}_party_name`]}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="number"
                        value={transaction.amount}
                        onChange={(e) => handleTransactionChange(transaction.id, 'amount', e.target.value)}
                        step="0.01"
                        min="0"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                          formErrors[`transaction_${transaction.id}_amount`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                    </div>
                    {formErrors[`transaction_${transaction.id}_amount`] && (
                      <p className="text-red-500 text-xs mt-1">{formErrors[`transaction_${transaction.id}_amount`]}</p>
                    )}
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 mt-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="cash"
                          checked={transaction.payment_mode === 'cash'}
                          onChange={(e) => handleTransactionChange(transaction.id, 'payment_mode', e.target.value)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 font-medium">Cash</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="online"
                          checked={transaction.payment_mode === 'online'}
                          onChange={(e) => handleTransactionChange(transaction.id, 'payment_mode', e.target.value)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 font-medium">Online</span>
                      </label>
                    </div>
                  </div>

                  {/* Receiver (Income) or Sender (Expense) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {transactionType === 'income' ? 'Receiver' : 'Sender'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <select
                        value={selectedOptions[transaction.id] || ''}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setSelectedOptions(prev => ({ ...prev, [transaction.id]: selected }));
                          
                          if (selected === 'Other') {
                            setShowOtherInput(prev => ({ ...prev, [transaction.id]: true }));
                            handleTransactionChange(
                              transaction.id,
                              transactionType === 'income' ? 'receiver' : 'sender',
                              ''
                            );
                          } else {
                            setShowOtherInput(prev => ({ ...prev, [transaction.id]: false }));
                            handleTransactionChange(
                              transaction.id,
                              transactionType === 'income' ? 'receiver' : 'sender',
                              selected
                            );
                          }
                        }}
                        className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium appearance-none bg-white ${
                          formErrors[`transaction_${transaction.id}_${transactionType === 'income' ? 'receiver' : 'sender'}`] 
                            ? 'border-red-500' 
                            : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select {transactionType === 'income' ? 'receiver' : 'sender'}</option>
                        {SENDER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                    
                    {showOtherInput[transaction.id] && (
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={transactionType === 'income' ? transaction.receiver : transaction.sender}
                          onChange={(e) => handleTransactionChange(
                            transaction.id, 
                            transactionType === 'income' ? 'receiver' : 'sender', 
                            e.target.value
                          )}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium ${
                            formErrors[`transaction_${transaction.id}_${transactionType === 'income' ? 'receiver' : 'sender'}`] 
                              ? 'border-red-500' 
                              : 'border-gray-300'
                          }`}
                          placeholder={transactionType === 'income' ? 'Enter receiver name' : 'Enter sender name'}
                        />
                      </div>
                    )}
                    
                    {formErrors[`transaction_${transaction.id}_${transactionType === 'income' ? 'receiver' : 'sender'}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`transaction_${transaction.id}_${transactionType === 'income' ? 'receiver' : 'sender'}`]}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                      <textarea
                        value={transaction.description}
                        onChange={(e) => handleTransactionChange(transaction.id, 'description', e.target.value)}
                        rows="2"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 font-medium"
                        placeholder="Add any notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                transactionType === 'income' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Saving {transactions.length} {transactions.length === 1 ? 'Entry' : 'Entries'}...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save {transactions.length} {transactions.length === 1 ? 'Entry' : 'Entries'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
