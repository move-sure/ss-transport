'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Truck, Package, MapPin, Plus, AlertTriangle, CheckCircle, X, User, Phone, CreditCard } from 'lucide-react';

const ChallanSelector = ({ 
  challans, 
  challanBooks, 
  selectedChallan, 
  setSelectedChallan,
  selectedChallanBook, 
  setSelectedChallanBook,
  onAddToTransit,
  saving,
  selectedBiltiesCount,
  branches = [],
  trucks,
  staff,
  transitBilties = []
}) => {
  const [showChallanDropdown, setShowChallanDropdown] = useState(false);
  const [showChallanBookDropdown, setShowChallanBookDropdown] = useState(false);
  
  const challanRef = useRef(null);
  const challanBookRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (challanRef.current && !challanRef.current.contains(event.target)) {
        setShowChallanDropdown(false);
      }
      if (challanBookRef.current && !challanBookRef.current.contains(event.target)) {
        setShowChallanBookDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Separate dispatched and non-dispatched challans
  const activeChallans = challans.filter(c => !c.is_dispatched);
  const dispatchedChallans = challans.filter(c => c.is_dispatched);

  // Calculate bilty counts from transit data
  const getTransitBiltyCounts = () => {
    if (!selectedChallan || !transitBilties) {
      return { regCount: 0, stnCount: 0, totalCount: 0 };
    }

    const regCount = transitBilties.filter(bilty => bilty.bilty_type === 'regular').length;
    const stnCount = transitBilties.filter(bilty => bilty.bilty_type === 'station').length;
    const totalCount = regCount + stnCount;

    return { regCount, stnCount, totalCount };
  };

  const { regCount, stnCount, totalCount } = getTransitBiltyCounts();

  const generateChallanNumber = (challanBook) => {
    if (!challanBook) return '';
    const { prefix, current_number, digits, postfix } = challanBook;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  const getDestinationBranchName = (challanBookId) => {
    const book = challanBooks.find(b => b.id === challanBookId);
    if (!book) return 'Unknown';
    
    const branch = branches.find(b => b.id === book.to_branch_id);
    return branch ? `${branch.branch_name} (${branch.branch_code})` : `Branch-${book.to_branch_id?.slice(0, 8)}`;
  };

  const handleChallanSelect = (challan) => {
    setSelectedChallan(challan);
    setShowChallanDropdown(false);
  };

  const handleChallanBookSelect = (book) => {
    setSelectedChallanBook(book);
    setShowChallanBookDropdown(false);
  };

  return (
    <div className="space-y-4 relative">
      {/* Challan Selection Card */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-visible">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <Truck className="w-5 h-5" />
            Select Challan
          </h3>
        </div>
        
        <div className="p-4">
          <div className="relative" ref={challanRef}>
            <button
              onClick={() => setShowChallanDropdown(!showChallanDropdown)}
              className="w-full px-4 py-3 text-left bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg hover:border-blue-300 transition-all duration-200 flex items-center justify-between group"
            >
              <div className="flex-1">
                {selectedChallan ? (
                  <div>
                    <div className="font-bold text-blue-900 text-base">{selectedChallan.challan_no}</div>                  <div className="text-sm text-blue-600">
                    {format(new Date(selectedChallan.date), 'dd/MM/yyyy')} • {totalCount} bilties
                    {selectedChallan.is_dispatched && ' • DISPATCHED'}
                  </div>
                  </div>
                ) : (
                  <div className="text-gray-500 font-medium">Choose a challan...</div>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform flex-shrink-0 ml-2 ${showChallanDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showChallanDropdown && (
              <div className="absolute z-[150000] mt-2 w-full bg-white border-2 border-blue-200 rounded-lg shadow-2xl">
                <div className="max-h-80 overflow-y-auto overscroll-contain">
                  {challans.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <div className="font-medium">No challans available</div>
                      <div className="text-sm">Create a challan first</div>
                    </div>
                  ) : (
                    <>
                      {/* Active Challans */}
                      {activeChallans.length > 0 && (
                        <div>
                          <div className="bg-green-50 px-4 py-3 border-b border-green-200 sticky top-0 z-10">
                            <div className="text-sm font-bold text-green-800 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Active Challans ({activeChallans.length})
                            </div>
                          </div>
                          {activeChallans.map((challan) => (
                            <button
                              key={challan.id}
                              onClick={() => handleChallanSelect(challan)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 transition-colors group"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-blue-900 group-hover:text-blue-600 truncate">
                                    {challan.challan_no}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {format(new Date(challan.date), 'dd/MM/yyyy')}
                                  </div>                                  <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                    <Package className="w-3 h-3" />
                                    {challan.id === selectedChallan?.id ? totalCount : challan.total_bilty_count} bilties
                                  </div>
                                </div>
                                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold ml-2 flex-shrink-0">
                                  ACTIVE
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Dispatched Challans */}
                      {dispatchedChallans.length > 0 && (
                        <div>
                          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 sticky top-0 z-10">
                            <div className="text-sm font-bold text-orange-800 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Dispatched Challans ({dispatchedChallans.length})
                            </div>
                          </div>
                          {dispatchedChallans.map((challan) => (
                            <div
                              key={challan.id}
                              className="w-full px-4 py-3 text-left bg-gray-50 border-b border-gray-100 opacity-60"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-gray-700 truncate">
                                    {challan.challan_no}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {format(new Date(challan.date), 'dd/MM/yyyy')}
                                    {challan.dispatch_date && (
                                      <span> • Dispatched: {format(new Date(challan.dispatch_date), 'dd/MM/yyyy')}</span>
                                    )}
                                  </div>                                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Package className="w-3 h-3" />
                                    {challan.id === selectedChallan?.id ? totalCount : challan.total_bilty_count} bilties
                                  </div>
                                </div>
                                <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-bold ml-2 flex-shrink-0">
                                  DISPATCHED
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>          {/* Bilty Summary - Show when challan is selected */}
          {selectedChallan && (
            <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
              <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Bilty Summary
              </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                  <div className="text-xs text-gray-600 mb-1">Station Bilties (MNL)</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {stnCount}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                  <div className="text-xs text-gray-600 mb-1">Regular Bilties (REG)</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {regCount}
                  </div>
                </div>
              </div>
              
              {/* Total Count */}
              <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                <div className="text-xs text-gray-600 mb-1">Total Bilties in Transit</div>
                <div className="text-2xl font-bold text-emerald-800">
                  {totalCount}
                </div>
              </div>
            </div>
          )}

          {/* Challan Details Card - Show when challan is selected */}
          {selectedChallan && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Challan Details
              </h4>
              
              <div className="space-y-2 text-sm">
                {/* Truck Details */}
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Truck:</span>
                  <span className="text-blue-900 font-bold">
                    {selectedChallan.truck?.truck_number || 'Not Assigned'}
                  </span>
                </div>

                {/* Driver Details */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Driver:</span>
                  <span className="text-green-900 font-bold">
                    {selectedChallan.driver?.name || 'Not Assigned'}
                  </span>
                  {selectedChallan.driver?.mobile_number && (
                    <span className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedChallan.driver.mobile_number}
                    </span>
                  )}
                </div>

                {/* Owner Details */}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Owner:</span>
                  <span className="text-purple-900 font-bold">
                    {selectedChallan.owner?.name || 'Not Assigned'}
                  </span>
                  {selectedChallan.owner?.mobile_number && (
                    <span className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedChallan.owner.mobile_number}
                    </span>
                  )}
                </div>

                {/* Status and Date */}
                <div className="pt-2 border-t border-blue-200 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      Created: {format(new Date(selectedChallan.date), 'dd/MM/yyyy')}
                    </span>
                    <span className={`px-2 py-1 rounded-full font-bold ${
                      selectedChallan.is_dispatched 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedChallan.is_dispatched ? 'DISPATCHED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to Transit Button */}
      <div className="bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden">
        <div className="p-4">
          <button
            onClick={onAddToTransit}
            disabled={!selectedChallan || !selectedChallanBook || selectedBiltiesCount === 0 || saving || selectedChallan?.is_dispatched}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold text-base hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            {saving ? 'Adding to Transit...' : `Add ${selectedBiltiesCount} Bilties to Transit`}
          </button>
          
          {/* Status Messages */}
          <div className="mt-3 space-y-1">
            {!selectedChallan && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <X className="w-4 h-4" />
                Select a challan
              </div>
            )}
            {selectedChallan?.is_dispatched && (
              <div className="text-sm text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Cannot add to dispatched challan
              </div>
            )}
            {!selectedChallanBook && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <X className="w-4 h-4" />
                Select a challan book below
              </div>
            )}
            {selectedBiltiesCount === 0 && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <X className="w-4 h-4" />
                Select at least one bilty
              </div>
            )}
            {selectedChallan && !selectedChallan.is_dispatched && selectedChallanBook && selectedBiltiesCount > 0 && (
              <div className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Ready to add to transit
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Challan Book Selection - Moved to bottom */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-visible">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4" />
            Challan Book
          </h4>
        </div>
        
        <div className="p-3">
          <div className="relative" ref={challanBookRef}>
            <button
              onClick={() => setShowChallanBookDropdown(!showChallanBookDropdown)}
              className="w-full px-3 py-2 text-left bg-purple-50 border border-purple-200 rounded-lg hover:border-purple-300 transition-all duration-200 flex items-center justify-between text-sm"
            >
              <div className="flex-1 min-w-0">
                {selectedChallanBook ? (
                  <div>
                    <div className="font-bold text-purple-900 text-sm truncate">
                      Next: {generateChallanNumber(selectedChallanBook)}
                    </div>
                    <div className="text-xs text-purple-600 truncate">
                      To: {getDestinationBranchName(selectedChallanBook.id)}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 font-medium text-sm">Choose challan book...</div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform flex-shrink-0 ml-2 ${showChallanBookDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showChallanBookDropdown && (
              <div className="absolute z-[9999] mt-2 w-full bg-white border border-purple-200 rounded-lg shadow-xl">
                <div className="max-h-48 overflow-y-auto">
                  {challanBooks.length > 0 ? (
                    challanBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => handleChallanBookSelect(book)}
                        className="w-full px-3 py-2 text-left hover:bg-purple-50 border-b border-gray-100 transition-colors text-sm"
                      >
                        <div className="font-bold text-purple-900 text-xs truncate">
                          {book.prefix || ''}{String(book.from_number).padStart(book.digits, '0')} - 
                          {book.prefix || ''}{String(book.to_number).padStart(book.digits, '0')}{book.postfix || ''}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          Next: {generateChallanNumber(book)}
                        </div>
                        <div className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">To: {getDestinationBranchName(book.id)}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <div className="font-medium text-sm">No challan books</div>
                      <div className="text-xs">Create one first</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanSelector;