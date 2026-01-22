'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';
import { Package, X, Check, Trash2, Download, Upload } from 'lucide-react';

const BiltyListManager = ({ user, onComplaintCreated }) => {
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Load saved list from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bilty_bulk_list');
    if (saved) {
      try {
        setSelectedBilties(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved list:', error);
      }
    }
  }, []);

  // Save to localStorage whenever list changes
  useEffect(() => {
    localStorage.setItem('bilty_bulk_list', JSON.stringify(selectedBilties));
  }, [selectedBilties]);

  const addToList = (bilty) => {
    if (!selectedBilties.find(b => b.gr_no === bilty.gr_no)) {
      setSelectedBilties([...selectedBilties, bilty]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFromList = (grNo) => {
    setSelectedBilties(selectedBilties.filter(b => b.gr_no !== grNo));
  };

  const clearList = () => {
    if (confirm('Are you sure you want to clear the entire list?')) {
      setSelectedBilties([]);
      localStorage.removeItem('bilty_bulk_list');
    }
  };

  const exportList = () => {
    const dataStr = JSON.stringify(selectedBilties, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bilty-list-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Bilty Bulk Actions</h2>
              <p className="text-xs text-slate-600">Create a list and perform bulk operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-bold text-white">
              {selectedBilties.length} Selected
            </div>
          </div>
        </div>
      </div>

      {/* Search and Add Section */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-md">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Add Bilties to List</h3>
        <BiltySearchAdd
          user={user}
          onAdd={addToList}
          existingGrNos={selectedBilties.map(b => b.gr_no)}
        />
      </div>

      {/* Selected Bilties List */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Selected Bilties ({selectedBilties.length})</h3>
          <div className="flex gap-2">
            {selectedBilties.length > 0 && (
              <>
                <button
                  onClick={exportList}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  <Download className="h-3 w-3" />
                  Export
                </button>
                <button
                  onClick={clearList}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {selectedBilties.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No bilties selected. Search and add bilties above.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedBilties.map((bilty) => (
              <div
                key={bilty.gr_no}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-indigo-600">{bilty.gr_no}</div>
                  <div className="text-xs text-gray-700 truncate">
                    {bilty.consignor_name} → {bilty.consignee_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {bilty.destination && `📍 ${bilty.destination} | `}
                    {new Date(bilty.bilty_date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => removeFromList(bilty.gr_no)}
                  className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedBilties.length > 0 && (
        <BulkActionsPanel
          selectedBilties={selectedBilties}
          user={user}
          onSuccess={() => {
            // Optionally refresh or clear list
          }}
          processing={processing}
          setProcessing={setProcessing}
        />
      )}
    </div>
  );
};

// Search and Add Component
const BiltySearchAdd = ({ user, onAdd, existingGrNos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const searchBilties = async () => {
      if (!searchTerm.trim() || !user) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .single();

        const { data: bilties } = await supabase
          .from('bilty')
          .select('*')
          .eq('branch_id', userData.branch_id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .ilike('gr_no', `%${searchTerm}%`)
          .order('bilty_date', { ascending: false })
          .limit(20);

        // Fetch destination for each bilty
        const biltiesWithDestination = await Promise.all(
          (bilties || []).map(async (bilty) => {
            if (bilty.to_city_id) {
              const { data: cityData } = await supabase
                .from('cities')
                .select('city_name')
                .eq('id', bilty.to_city_id)
                .single();
              
              return {
                ...bilty,
                destination: cityData?.city_name || null
              };
            }
            return {
              ...bilty,
              destination: null
            };
          })
        );

        setSearchResults(biltiesWithDestination);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchBilties, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, user]);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        placeholder="🔍 Search GR Number..."
        className="w-full px-4 py-2 text-sm font-semibold border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
      />

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {searchResults.map((bilty) => {
            const alreadyAdded = existingGrNos.includes(bilty.gr_no);
            return (
              <button
                key={bilty.id}
                onClick={() => {
                  if (!alreadyAdded) {
                    onAdd(bilty);
                  }
                }}
                disabled={alreadyAdded}
                className={`w-full px-3 py-2 text-left border-b border-slate-100 transition ${
                  alreadyAdded
                    ? 'bg-gray-100 cursor-not-allowed opacity-60'
                    : 'hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 truncate">{bilty.gr_no}</div>
                    <div className="text-xs text-black font-medium truncate">
                      {bilty.consignor_name} → {bilty.consignee_name}
                    </div>
                    {bilty.destination && (
                      <div className="text-xs text-indigo-700 font-semibold">
                        📍 {bilty.destination}
                      </div>
                    )}
                  </div>
                  {alreadyAdded && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Bulk Actions Panel Component
const BulkActionsPanel = ({ selectedBilties, user, onSuccess, processing, setProcessing }) => {
  const handleBulkDelivered = async () => {
    if (!confirm(`Mark ${selectedBilties.length} bilties as delivered?`)) return;

    setProcessing(true);
    try {
      const grNumbers = selectedBilties.map(b => b.gr_no);

      // Update transit details
      const { error: transitError } = await supabase
        .from('transit_details')
        .update({
          is_delivered_at_destination: true,
          delivered_at_destination_date: new Date().toISOString()
        })
        .in('gr_no', grNumbers);

      if (transitError) throw transitError;

      // Update complaints if any exist
      const { error: complaintsError } = await supabase
        .from('complaints')
        .update({
          is_delivered_at_destination: true,
          actual_delivery_date: new Date().toISOString(),
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: 'Bilty marked as delivered via bulk action'
        })
        .in('gr_no', grNumbers)
        .eq('is_delivered_at_destination', false);

      // Don't throw error if no complaints exist
      if (complaintsError && complaintsError.code !== 'PGRST116') {
        console.warn('Error updating complaints:', complaintsError);
      }

      alert(`Successfully marked ${selectedBilties.length} bilties as delivered!`);
      onSuccess();
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update bilties');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-md">
      <h3 className="text-sm font-bold text-slate-900 mb-3">Bulk Actions</h3>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleBulkDelivered}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {processing ? 'Processing...' : 'Mark All Delivered'}
        </button>
      </div>
    </div>
  );
};

export default BiltyListManager;
