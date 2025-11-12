'use client';

import React, { useState, useEffect } from 'react';
import ComplaintList from '@/components/complains/complaint-list';
import ComplaintForm from '@/components/complains/complaint-form';
import ComplaintEdit from '@/components/complains/complaint-edit';
import supabase from '@/app/utils/supabase';
import { Plus, List } from 'lucide-react';

const ComplaintsSection = ({ complaints, onViewComplaint, onComplaintCreated, user, selectedComplaint, onClearSelection }) => {
  const [view, setView] = useState('list'); // 'list', 'create', or 'edit'
  const [selectedGrNo, setSelectedGrNo] = useState(null);
  const [editingComplaint, setEditingComplaint] = useState(null);

  // Auto-switch to create view when selectedComplaint has isNew flag
  React.useEffect(() => {
    if (selectedComplaint?.isNew && selectedComplaint?.gr_no) {
      setSelectedGrNo(selectedComplaint.gr_no);
      setView('create');
      if (onClearSelection) {
        onClearSelection();
      }
    }
  }, [selectedComplaint, onClearSelection]);

  const handleCreateNew = () => {
    setSelectedGrNo(null);
    setView('create');
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleComplaintCreated = () => {
    setSelectedGrNo(null);
    setView('list');
    onComplaintCreated();
  };

  const handleEditComplaint = (complaint) => {
    setEditingComplaint(complaint);
    setView('edit');
  };

  const handleComplaintUpdated = () => {
    setEditingComplaint(null);
    setView('list');
    onComplaintCreated(); // Refresh the list
  };

  const handleMarkDelivered = async (complaint) => {
    if (!confirm(`Mark complaint ${complaint.complaint_no} as delivered?`)) return;
    
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          is_delivered_at_destination: true,
          actual_delivery_date: new Date().toISOString(),
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaint.id);

      if (error) throw error;

      alert('Complaint marked as delivered!');
      onComplaintCreated(); // Refresh the list
    } catch (error) {
      console.error('Error marking delivered:', error);
      alert('Failed to mark as delivered. Please try again.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              view === 'list'
                ? 'bg-orange-600 text-white shadow-md'
                : 'border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List className="h-4 w-4" />
            View All
          </button>
          <button
            onClick={handleCreateNew}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              view === 'create'
                ? 'bg-orange-600 text-white shadow-md'
                : 'border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Plus className="h-4 w-4" />
            Register New
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <ComplaintList 
          complaints={complaints} 
          onViewComplaint={onViewComplaint}
          onEditComplaint={handleEditComplaint}
          onMarkDelivered={handleMarkDelivered}
        />
      ) : view === 'create' ? (
        <ComplaintForm 
          grNo={selectedGrNo} 
          user={user}
          onSuccess={handleComplaintCreated}
        />
      ) : (
        <ComplaintEdit
          complaint={editingComplaint}
          user={user}
          onSuccess={handleComplaintUpdated}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  );
};

export default ComplaintsSection;
