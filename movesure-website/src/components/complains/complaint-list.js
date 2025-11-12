'use client';

import React, { useState, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import ComplaintCard from './complaint-card';
import ComplaintViewModal from './complaint-view-modal';

const ComplaintList = ({ complaints, onViewComplaint, onEditComplaint, onMarkDelivered }) => {
  const [viewingComplaint, setViewingComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filteredComplaints = useMemo(() => {
    return complaints.filter(complaint => {
      const matchesSearch = 
        complaint.complaint_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.gr_no?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || complaint.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, searchTerm, filterStatus, filterPriority]);

  const handleViewComplaint = (complaint) => {
    setViewingComplaint(complaint);
    if (onViewComplaint) {
      onViewComplaint(complaint);
    }
  };

  return (
    <>
      <ComplaintViewModal 
        complaint={viewingComplaint} 
        onClose={() => setViewingComplaint(null)} 
      />
    <div className="rounded-xl border-2 border-slate-200 bg-white shadow-lg">
      <div className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-orange-50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Complaints</h3>
              <p className="text-xs text-slate-600">
                {filteredComplaints.length} {filteredComplaints.length === 1 ? 'complaint' : 'complaints'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Complaint/GR No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">All Status</option>
            <option value="REGISTERED">Registered</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="LOCATED">Located</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">All Priority</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto p-3">
        {filteredComplaints.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-500">No complaints found</p>
            <p className="text-sm text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredComplaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onEdit={onEditComplaint}
                onMarkDelivered={onMarkDelivered}
                onView={handleViewComplaint}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ComplaintList;
