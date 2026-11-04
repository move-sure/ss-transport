'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import { format } from 'date-fns';
import { FileText, Edit2, Truck, Calendar, User, TruckIcon, PackageCheck, Package, Warehouse, Undo2, CalendarClock, Loader2 } from 'lucide-react';
import ChallanDatesModal from './ChallanDatesModal';

const API_URL = 'https://api.movesure.io';

const ChallanDetailsTab = ({ 
  challans, 
  challanBooks, 
  onLoadChallans, 
  onCreateNew, 
  onEdit, 
  userBranch 
}) => {
  const { user, token } = useAuth();
  const [filters, setFilters] = useState({
    date: '',  // Empty by default to show all
    status: 'all',
    challanBook: ''
  });
  
  // Load challans when filters change, but only apply non-empty filters
  useEffect(() => {
    const activeFilters = {};
    if (filters.date) activeFilters.date = filters.date;
    if (filters.status !== 'all') activeFilters.status = filters.status;
    if (filters.challanBook) activeFilters.challanBook = filters.challanBook;
    
    onLoadChallans(activeFilters);
  }, [filters]);

  const [busy, setBusy] = useState({}); // challan id -> action
  const [datesFor, setDatesFor] = useState(null);

  // dispatch | undispatch | hub-received | undo-hub-received
  const ACTIONS = {
    'dispatch': { label: 'Dispatch', confirm: null },
    'undispatch': { label: 'Undo dispatch', confirm: 'Undo dispatch of challan {no}? It goes back to pending.' },
    'hub-received': { label: 'Mark received at hub', confirm: 'Mark challan {no} as received at hub (now)?' },
    'undo-hub-received': { label: 'Undo received', confirm: 'Undo "Received at hub" for challan {no}? It goes back to dispatched (dispatch date is kept).' },
  };

  const runAction = async (challan, action) => {
    const a = ACTIONS[action];
    if (a.confirm && !window.confirm(a.confirm.replace('{no}', challan.challan_no))) return;
    setBusy((b) => ({ ...b, [challan.id]: action }));
    try {
      const res = await fetch(`${API_URL}/api/challan/${challan.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: user.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (result.status !== 'success') {
        // 409 on undo received = bilties already in a transport ledger; show the server message as it is
        alert(result.message || (res.status === 404 ? `${a.label} is not available on the server yet` : `${a.label} failed`));
        return;
      }
      onLoadChallans(filters);
    } catch (error) {
      console.error(`${action} failed:`, error);
      alert(`${a.label} failed`);
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[challan.id]; return n; });
    }
  };

  const getStatusBadge = (challan) => {
    if (challan.is_received_at_hub) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
          <Warehouse className="w-3.5 h-3.5" />
          Received at hub
        </span>
      );
    }
    if (challan.is_dispatched) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
          <PackageCheck className="w-3.5 h-3.5" />
          Dispatched
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
        <Package className="w-3.5 h-3.5" />
        Pending
      </span>
    );
  };

  const resetFilters = () => {
    setFilters({ 
      date: '', // Clear date to show all
      status: 'all', 
      challanBook: '' 
    });
  };

  return (
    <>
      {/* Enhanced Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Filter Challans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Filter by Date (Optional)
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="All dates"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="dispatched">Dispatched</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Challan Book
            </label>
            <select
              value={filters.challanBook}
              onChange={(e) => setFilters(prev => ({ ...prev, challanBook: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Books</option>
              {challanBooks.map(book => (
                <option key={book.id} value={book.id}>
                  {book.from_branch?.branch_name} → {book.to_branch?.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 font-semibold"
            >
              <Truck className="w-4 h-4" />
              Create Challan
            </button>
            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Challans List */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">All Challans</h2>
              <p className="text-blue-100 text-sm mt-1">{challans.length} total entries found</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{challans.length}</div>
              <div className="text-blue-100 text-sm">Records</div>
            </div>
          </div>
        </div>
        
        {challans.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-blue-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Truck className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">No Challans Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filters.date || filters.status !== 'all' || filters.challanBook 
                ? 'Try adjusting your filters to see more results, or create your first challan.'
                : 'Get started by creating your first challan to track your shipments.'
              }
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={onCreateNew}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg font-semibold"
              >
                Create Challan
              </button>
              {(filters.date || filters.status !== 'all' || filters.challanBook) && (
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Challan Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Truck & Personnel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Bilty Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {challans.map((challan) => (
                  <tr 
                    key={challan.id} 
                    className={`transition-all duration-200 ${
                      challan.is_dispatched 
                        ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500' 
                        : 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-black">
                        Challan: {challan.challan_no}
                      </div>
                      <div className="text-xs text-gray-600">
                        Date: {format(new Date(challan.date), 'dd/MM/yyyy')}
                      </div>
                      {challan.remarks && (
                        <div className="text-xs text-gray-500 mt-1">
                          Remarks: {challan.remarks}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {challan.truck && (
                          <div className="text-xs text-black">
                            <Truck className="w-3 h-3 inline mr-1" />
                            {challan.truck.truck_number} ({challan.truck.truck_type})
                          </div>
                        )}
                        {challan.driver && (
                          <div className="text-xs text-black">
                            <User className="w-3 h-3 inline mr-1" />
                            Driver: {challan.driver.name}
                          </div>
                        )}
                        {challan.owner && (
                          <div className="text-xs text-gray-600">
                            Owner: {challan.owner.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-lg font-bold text-blue-600">
                        {challan.total_bilty_count}
                      </div>
                      <div className="text-xs text-gray-500">bilties</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(challan)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const fmt = (d, withTime = true) => (d ? format(new Date(d), withTime ? 'dd/MM/yyyy hh:mm a' : 'dd/MM/yyyy') : null);
                        const line = (label, value, cls) => (
                          <div className="flex gap-1.5 text-xs whitespace-nowrap">
                            <span className="w-[68px] text-gray-500">{label}</span>
                            <span className={value ? `font-semibold ${cls}` : 'text-gray-400'}>{value || '—'}</span>
                          </div>
                        );
                        return (
                          <div className="space-y-0.5">
                            {line('Challan', fmt(challan.date, false), 'text-black')}
                            {line('Dispatched', challan.is_dispatched ? fmt(challan.dispatch_date) : null, 'text-green-700')}
                            {line('Received', challan.is_received_at_hub ? fmt(challan.received_at_hub_timing) : null, 'text-blue-700')}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-black">
                        {format(new Date(challan.created_at), 'dd/MM/yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        By: {challan.creator?.name || challan.creator?.username}
                      </div>
                    </td>                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(challan)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                          title="Edit Challan"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        {(() => {
                          const b = busy[challan.id];
                          const btn = (action, cls, Icon, label) => (
                            <button key={action} onClick={() => runAction(challan, action)} disabled={!!b} title={label}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ring-1 disabled:opacity-40 ${cls}`}>
                              {b === action ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                              {label}
                            </button>
                          );
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {!challan.is_dispatched && btn('dispatch', 'text-green-700 ring-green-200 bg-green-50 hover:bg-green-100', TruckIcon, 'Dispatch')}
                              {challan.is_dispatched && !challan.is_received_at_hub && btn('hub-received', 'text-blue-700 ring-blue-200 bg-blue-50 hover:bg-blue-100', Warehouse, 'Received')}
                              {challan.is_dispatched && !challan.is_received_at_hub && btn('undispatch', 'text-amber-700 ring-amber-200 bg-amber-50 hover:bg-amber-100', Undo2, 'Undo dispatch')}
                              {challan.is_received_at_hub && btn('undo-hub-received', 'text-red-700 ring-red-200 bg-red-50 hover:bg-red-100', Undo2, 'Undo received')}
                              {challan.is_dispatched && (
                                <button onClick={() => setDatesFor(challan)} disabled={!!b} title="Change dispatch / received date"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ring-1 text-gray-700 ring-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40">
                                  <CalendarClock className="w-3.5 h-3.5" /> Dates
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Challans</p>
              <p className="text-2xl font-bold text-black">{challans.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {challans.filter(c => !c.is_dispatched).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispatched</p>
              <p className="text-2xl font-bold text-green-600">
                {challans.filter(c => c.is_dispatched).length}
              </p>
            </div>
            <Truck className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bilties</p>
              <p className="text-2xl font-bold text-blue-600">
                {challans.reduce((sum, c) => sum + c.total_bilty_count, 0)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
    </div>
      {datesFor && (
        <ChallanDatesModal
          challan={datesFor}
          user={user}
          token={token}
          onClose={() => setDatesFor(null)}
          onSaved={() => { setDatesFor(null); onLoadChallans(filters); }}
        />
      )}
    </>
  );
};

export default ChallanDetailsTab;