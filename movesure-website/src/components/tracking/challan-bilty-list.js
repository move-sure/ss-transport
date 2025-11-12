'use client';

import React, { useState, useMemo } from 'react';
import { Package, Search, Filter, Loader2, MapPin, Calendar, Wallet, Truck, FileText, Phone } from 'lucide-react';
import { format } from 'date-fns';

const ChallanBiltyList = ({ bilties, transitDetails, loading, branches = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [filterBiltyType, setFilterBiltyType] = useState('all');

  const getCityName = (cityId, cityCode) => {
    // Implementation for city name lookup
    return cityCode || cityId || 'N/A';
  };

  const getBranchName = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? `${branch.branch_name} (${branch.branch_code})` : 'N/A';
  };

  const filteredBilties = useMemo(() => {
    return bilties.filter(bilty => {
      const matchesSearch = 
        bilty.gr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bilty.consignor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bilty.consignee_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPayment = filterPaymentMode === 'all' || bilty.payment_mode === filterPaymentMode;
      const matchesBiltyType = filterBiltyType === 'all' || bilty.bilty_type === filterBiltyType;

      return matchesSearch && matchesPayment && matchesBiltyType;
    });
  }, [bilties, searchTerm, filterPaymentMode, filterBiltyType]);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    try {
      return format(new Date(value), 'dd MMM yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  const getPaymentModeColor = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'to pay':
      case 'topay':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'tbb':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getTransitStatus = (grNo) => {
    const transit = transitDetails.find(t => t.gr_no === grNo);
    if (!transit) return { label: 'Unknown', color: 'bg-slate-100 text-slate-700' };

    if (transit.is_delivered_at_destination) {
      return { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' };
    }
    if (transit.is_out_of_delivery_from_branch2) {
      return { label: 'Out for Delivery', color: 'bg-blue-100 text-blue-700' };
    }
    if (transit.is_delivered_at_branch2) {
      return { label: 'At Destination Branch', color: 'bg-indigo-100 text-indigo-700' };
    }
    if (transit.is_out_of_delivery_from_branch1) {
      return { label: 'In Transit', color: 'bg-amber-100 text-amber-700' };
    }
    return { label: 'Pending', color: 'bg-orange-100 text-orange-700' };
  };

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-slate-200 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-3 font-semibold text-slate-600">Loading bilties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white shadow-lg">
      <div className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Bilties in Challan</h3>
              <p className="text-xs text-slate-600">
                {filteredBilties.length} {filteredBilties.length === 1 ? 'bilty' : 'bilties'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search GR, Consignor, Consignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <select
            value={filterPaymentMode}
            onChange={(e) => setFilterPaymentMode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Payment Modes</option>
            <option value="paid">Paid</option>
            <option value="to pay">To Pay</option>
            <option value="tbb">TBB</option>
          </select>

          <select
            value={filterBiltyType}
            onChange={(e) => setFilterBiltyType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Types</option>
            <option value="regular">Regular</option>
            <option value="station">Manual</option>
          </select>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto p-3">
        {filteredBilties.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-16 w-16 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-500">No bilties found</p>
            <p className="text-sm text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBilties.map((bilty) => {
              const transitStatus = getTransitStatus(bilty.gr_no);
              const transit = transitDetails.find(t => t.gr_no === bilty.gr_no);

              return (
                <div
                  key={bilty.id}
                  className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition hover:border-indigo-300 hover:shadow"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white">
                        <FileText className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">GR-{bilty.gr_no}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(bilty.bilty_date)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${getPaymentModeColor(
                          bilty.payment_mode
                        )}`}
                      >
                        {bilty.payment_mode || 'N/A'}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          bilty.bilty_type === 'regular'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {bilty.bilty_type === 'regular' ? 'REG' : 'MNL'}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${transitStatus.color}`}>
                        {transitStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <div className="rounded border border-indigo-100 bg-indigo-50/50 px-2 py-1">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-indigo-600 mb-0.5">Consignor</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-bold text-slate-900 flex-1">{bilty.consignor_name || 'N/A'}</p>
                          {bilty.consignor_number && (
                            <a
                              href={`tel:${bilty.consignor_number}`}
                              className="flex items-center gap-0.5 text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 shrink-0"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              <span className="hidden sm:inline">{bilty.consignor_number}</span>
                              <span className="sm:hidden">Call</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="rounded border border-purple-100 bg-purple-50/50 px-2 py-1">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-purple-600 mb-0.5">Consignee</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-bold text-slate-900 flex-1">{bilty.consignee_name || 'N/A'}</p>
                          {bilty.consignee_number && (
                            <a
                              href={`tel:${bilty.consignee_number}`}
                              className="flex items-center gap-0.5 text-[9px] font-semibold text-purple-600 hover:text-purple-800 shrink-0"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              <span className="hidden sm:inline">{bilty.consignee_number}</span>
                              <span className="sm:hidden">Call</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
                      <span className="text-[11px] font-semibold text-slate-900">{bilty.wt || 0} KG</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] font-semibold text-slate-900">{bilty.no_of_pkg || 0} PKG</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] font-bold text-emerald-700">₹{bilty.total || 0}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] font-bold text-indigo-600">
                        {bilty.delivery_type === 'godown-delivery' ? 'GD' : bilty.delivery_type === 'door-delivery' ? 'DD' : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallanBiltyList;
