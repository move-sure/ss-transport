'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { 
  useBillDetails, 
  CompactBillHeader, 
  BillItemsTable,
  EditItemModal 
} from '@/components/company-ledger/recent-bill/bill-details';

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const billId = params.billId;

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);

  const { 
    bill, 
    enrichedItems, 
    loading, 
    error, 
    refetch,
    updateBillStatus,
    updateItem,
    removeItem 
  } = useBillDetails(billId);

  const handleStatusChange = async (newStatus) => {
    const result = await updateBillStatus(newStatus, user?.id);
    if (!result.success) {
      alert('Failed to update status: ' + result.error);
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this item from the bill?')) {
      return;
    }
    
    const result = await removeItem(itemId);
    if (!result.success) {
      alert('Failed to remove item: ' + result.error);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
  };

  const handleSaveItem = async (itemData) => {
    setSavingItem(true);
    try {
      const result = await updateItem(itemData);
      if (result.success) {
        setEditingItem(null);
      } else {
        alert('Failed to save item: ' + result.error);
      }
    } finally {
      setSavingItem(false);
    }
  };

  const handleCloseEditModal = () => {
    if (!savingItem) {
      setEditingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">
            Error: {error}
          </div>
          <button
            onClick={() => router.push('/company-ledger/recent-bill')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bills
          </button>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-4 w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Bill not found</p>
          <button
            onClick={() => router.push('/company-ledger/recent-bill')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bills
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 w-full h-screen flex flex-col overflow-hidden">
      {/* Compact Bill Header - smaller */}
      <div className="flex-shrink-0 mb-2">
        <CompactBillHeader 
          bill={bill} 
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Bill Items Table - takes most of the space */}
      <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col overflow-hidden" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Bill Items ({enrichedItems.length})</h3>
            <p className="text-[10px] text-gray-400">Drag columns to reorder • Click to sort • Right-click for options</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/company-ledger/recent-bill')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <BillItemsTable 
            items={enrichedItems}
            onRemoveItem={handleRemoveItem}
            onEditItem={handleEditItem}
            loading={loading}
          />
        </div>
      </div>

      {/* Edit Item Modal */}
      <EditItemModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={handleCloseEditModal}
        onSave={handleSaveItem}
        saving={savingItem}
      />
    </div>
  );
}
