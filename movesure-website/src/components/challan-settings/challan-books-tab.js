'use client';

import React from 'react';
import supabase from '../../app/utils/supabase';
import { format } from 'date-fns';
import { FileText, Edit2, Trash2 } from 'lucide-react';

const ChallanBooksTab = ({ 
  challanBooks, 
  onCreateNew, 
  onEdit, 
  onRefresh, 
  userBranch 
}) => {

  const handleDeleteBook = async (bookId) => {
    if (!confirm('Are you sure you want to delete this challan book?')) return;

    try {
      const { error } = await supabase
        .from('challan_books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      alert('Challan book deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting challan book:', error);
      alert('Error deleting challan book');
    }
  };

  const generateChallanNumber = (book) => {
    if (!book) return '';
    const { prefix, current_number, digits, postfix } = book;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border border-blue-200 overflow-hidden">
      <div className="bg-blue-600 text-white p-4">
        <h2 className="text-lg font-bold">Your Accessible Challan Books</h2>
      </div>
      
      {challanBooks.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">No Challan Books Found</h3>
          <p className="text-gray-600 mb-4">Create your first challan book to get started</p>
          <button
            onClick={onCreateNew}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Challan Book
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Number Range</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Current</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Access Branches</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {challanBooks.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-black">
                      {book.from_branch?.branch_name} → {book.to_branch?.branch_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {book.from_branch?.branch_code} → {book.to_branch?.branch_code}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-black">
                      {book.prefix || ''}{String(book.from_number).padStart(book.digits, '0')} - 
                      {book.prefix || ''}{String(book.to_number).padStart(book.digits, '0')}{book.postfix || ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {book.to_number - book.from_number + 1} numbers
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-black">
                      {generateChallanNumber(book)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {book.current_number} / {book.to_number}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${((book.current_number - book.from_number) / (book.to_number - book.from_number)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs space-y-1">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Primary: {book.branch1?.branch_name}
                      </div>
                      {book.branch2 && (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Secondary: {book.branch2.branch_name}
                        </div>
                      )}
                      {book.branch3 && (
                        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Tertiary: {book.branch3.branch_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        book.is_completed 
                          ? 'bg-red-100 text-red-800' 
                          : book.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {book.is_completed ? 'Completed' : book.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {book.auto_continue && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Auto Continue
                        </span>
                      )}
                      {book.is_fixed && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Fixed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-black">
                      {format(new Date(book.created_at), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-xs text-gray-500">
                      By: {book.creator?.name || book.creator?.username}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(book)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete"
                        disabled={book.current_number > book.from_number}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChallanBooksTab;