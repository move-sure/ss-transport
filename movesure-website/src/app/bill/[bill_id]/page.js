'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, DollarSign, Package, Weight, Printer } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';
import { useAuth } from '@/app/utils/auth';
import Navbar from '@/components/dashboard/navbar';
import BulkRateEditor from '@/components/bill/bulk-rate-editor';
import BiltyListView from '@/components/bill/bilty-list-view';
import { generateBillMasterPDF } from '@/components/bill/bill-master-pdf-generator';

export default function BillEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const billId = params.bill_id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBilties, setSavingBilties] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [billMaster, setBillMaster] = useState(null);
  const [billDetails, setBillDetails] = useState([]);

  useEffect(() => {
    if (!requireAuth()) return;
    if (billId) {
      loadBillData();
    }
  }, [billId, user]);

  const loadBillData = async () => {
    try {
      setLoading(true);

      const { data: masterData, error: masterError } = await supabase
        .from('bill_master')
        .select('*')
        .eq('bill_id', billId)
        .single();

      if (masterError) throw masterError;
      setBillMaster(masterData);

      const { data: detailsData, error: detailsError} = await supabase
        .from('bill_details')
        .select('*')
        .eq('bill_id', billId)
        .order('detail_id', { ascending: true });

      if (detailsError) throw detailsError;
      setBillDetails(detailsData || []);

    } catch (error) {
      console.error('Error loading bill:', error);
      alert('Failed to load bill data');
    } finally {
      setLoading(false);
    }
  };

  const handleMasterChange = (field, value) => {
    setBillMaster(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'bill_date' && value ? {
        bill_month: new Date(value).getMonth() + 1,
        bill_year: new Date(value).getFullYear()
      } : {})
    }));
  };

  const saveBillMaster = async (metadataUpdate = null) => {
    try {
      setSaving(true);
      
      const updateData = {
        bill_number: billMaster.bill_number,
        bill_date: billMaster.bill_date,
        bill_month: billMaster.bill_month,
        bill_year: billMaster.bill_year,
        party_name: billMaster.party_name,
        billing_type: billMaster.billing_type,
        status: billMaster.status
      };

      // Add metadata if provided
      if (metadataUpdate) {
        updateData.metadata = metadataUpdate;
      }

      const { error } = await supabase
        .from('bill_master')
        .update(updateData)
        .eq('bill_id', billId);

      if (error) throw error;
      
      // Update local state
      if (metadataUpdate) {
        setBillMaster(prev => ({ ...prev, metadata: metadataUpdate }));
      }
      
      alert('✅ Bill master saved successfully!');
    } catch (error) {
      console.error('Error saving bill master:', error);
      alert('Failed to save bill master: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveBillDetail = async (detail) => {
    try {
      const { error } = await supabase
        .from('bill_details')
        .update({
          grno: detail.grno,
          date: detail.date,
          consignor: detail.consignor,
          consignee: detail.consignee,
          city: detail.city,
          no_of_pckg: detail.no_of_pckg,
          wt: detail.wt,
          pvt_marks: detail.pvt_marks,
          delivery_type: detail.delivery_type,
          pay_mode: detail.pay_mode,
          rate_by_kg: detail.rate_by_kg,
          labour_rate: detail.labour_rate,
          freight_amount: detail.freight_amount,
          labour_charge: detail.labour_charge,
          dd_charge: detail.dd_charge,
          toll_charge: detail.toll_charge,
          pf_charge: detail.pf_charge,
          other_charge: detail.other_charge,
          bilty_total: detail.bilty_total
        })
        .eq('detail_id', detail.detail_id);

      if (error) throw error;
      alert('✅ Bilty saved successfully!');
    } catch (error) {
      console.error('Error saving detail:', error);
      alert('Failed to save bilty: ' + error.message);
    }
  };

  const saveAllBilties = async () => {
    try {
      setSavingBilties(true);
      
      for (const detail of billDetails) {
        const { error } = await supabase
          .from('bill_details')
          .update({
            freight_amount: detail.freight_amount,
            labour_charge: detail.labour_charge,
            dd_charge: detail.dd_charge,
            toll_charge: detail.toll_charge,
            pf_charge: detail.pf_charge,
            other_charge: detail.other_charge,
            bilty_total: detail.bilty_total,
            rate_by_kg: detail.rate_by_kg,
            labour_rate: detail.labour_rate
          })
          .eq('detail_id', detail.detail_id);

        if (error) throw error;
      }

      alert(`✅ All ${billDetails.length} bilties saved successfully!`);
      await loadBillData();
    } catch (error) {
      console.error('Error saving bilties:', error);
      alert('Failed to save bilties: ' + error.message);
    } finally {
      setSavingBilties(false);
    }
  };

  const applyBulkRates = async (updatedDetails, bulkEditMetadata) => {
    try {
      // Update UI state first
      setBillDetails(updatedDetails);
      
      // Save all bilties to database
      setSavingBilties(true);
      for (const detail of updatedDetails) {
        const { error } = await supabase
          .from('bill_details')
          .update({
            freight_amount: detail.freight_amount,
            labour_charge: detail.labour_charge,
            dd_charge: detail.dd_charge,
            toll_charge: detail.toll_charge,
            pf_charge: detail.pf_charge,
            other_charge: detail.other_charge,
            bilty_total: detail.bilty_total,
            rate_by_kg: detail.rate_by_kg,
            labour_rate: detail.labour_rate
          })
          .eq('detail_id', detail.detail_id);

        if (error) throw error;
      }
      setSavingBilties(false);
      
      // Save bulk edit settings to metadata
      if (bulkEditMetadata) {
        const metadata = billMaster.metadata || {};
        metadata.bulkRates = bulkEditMetadata;
        metadata.lastBulkEditDate = new Date().toISOString();
        
        await saveBillMaster(metadata);
      }

      alert(`✅ Bulk rates applied and saved to ${updatedDetails.length} bilties in database!`);
    } catch (error) {
      console.error('Error applying bulk rates:', error);
      alert('Failed to save bulk rates to database: ' + error.message);
      setSavingBilties(false);
    }
  };

  const deleteBiltyDetail = async (detailId) => {
    if (!confirm('Are you sure you want to delete this bilty?')) return;

    try {
      const { error } = await supabase
        .from('bill_details')
        .delete()
        .eq('detail_id', detailId);

      if (error) throw error;
      
      setBillDetails(prev => prev.filter(d => d.detail_id !== detailId));
      alert('✅ Bilty deleted successfully!');
    } catch (error) {
      console.error('Error deleting bilty:', error);
      alert('Failed to delete bilty: ' + error.message);
    }
  };

  const calculateTotals = () => {
    return billDetails.reduce((acc, detail) => {
      acc.total += parseFloat(detail.bilty_total || 0);
      acc.freight += parseFloat(detail.freight_amount || 0);
      acc.labour += parseFloat(detail.labour_charge || 0);
      acc.dd += parseFloat(detail.dd_charge || 0);
      acc.toll += parseFloat(detail.toll_charge || 0);
      acc.pf += parseFloat(detail.pf_charge || 0);
      acc.other += parseFloat(detail.other_charge || 0);
      acc.packages += parseInt(detail.no_of_pckg || 0);
      acc.weight += parseFloat(detail.wt || 0);
      
      if (detail.pay_mode?.toLowerCase() === 'paid') {
        acc.paid += parseFloat(detail.bilty_total || 0);
      } else if (detail.pay_mode?.toLowerCase() === 'to-pay') {
        acc.toPay += parseFloat(detail.bilty_total || 0);
      }
      
      return acc;
    }, { 
      total: 0, paid: 0, toPay: 0, freight: 0, labour: 0, 
      dd: 0, toll: 0, pf: 0, other: 0, packages: 0, weight: 0 
    });
  };

  const handlePrintBill = async () => {
    try {
      setGeneratingPDF(true);
      const pdfUrl = await generateBillMasterPDF(billMaster, billDetails);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!billMaster) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bill Not Found</h2>
            <button
              onClick={() => router.push('/bill')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Bills
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/bill')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Bill</h1>
              <p className="text-sm text-gray-600 mt-1">Bill ID: {billId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintBill}
              disabled={generatingPDF || billDetails.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-md"
            >
              <Printer className="h-5 w-5" />
              <span>{generatingPDF ? 'Generating...' : 'Print Bill'}</span>
            </button>
            <button
              onClick={saveBillMaster}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Bill Master'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Bill Master Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Number *</label>
              <input
                type="text"
                value={billMaster.bill_number || ''}
                onChange={(e) => handleMasterChange('bill_number', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Date *</label>
              <input
                type="date"
                value={billMaster.bill_date || ''}
                onChange={(e) => handleMasterChange('bill_date', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Party Name *</label>
              <input
                type="text"
                value={billMaster.party_name || ''}
                onChange={(e) => handleMasterChange('party_name', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Type *</label>
              <select
                value={billMaster.billing_type || 'consignor'}
                onChange={(e) => handleMasterChange('billing_type', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="consignor">Consignor</option>
                <option value="consignee">Consignee</option>
                <option value="transport">Transport</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={billMaster.status || 'Draft'}
                onChange={(e) => handleMasterChange('status', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="Draft">Draft</option>
                <option value="Finalized">Finalized</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Month</label>
              <input
                type="number"
                value={billMaster.bill_month || ''}
                readOnly
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Year</label>
              <input
                type="number"
                value={billMaster.bill_year || ''}
                readOnly
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Created Date</label>
              <input
                type="text"
                value={billMaster.created_date ? format(new Date(billMaster.created_date), 'dd MMM yyyy HH:mm') : 'N/A'}
                readOnly
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-md p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bill Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-600">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <p className="text-xs font-semibold text-gray-600">Total Amount</p>
              </div>
              <p className="text-xl font-bold text-gray-900">₹{totals.total.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-600">
              <p className="text-xs font-semibold text-gray-600 mb-1">Paid</p>
              <p className="text-xl font-bold text-green-600">₹{totals.paid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-600">
              <p className="text-xs font-semibold text-gray-600 mb-1">To Pay</p>
              <p className="text-xl font-bold text-orange-600">₹{totals.toPay.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-600">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-5 w-5 text-purple-600" />
                <p className="text-xs font-semibold text-gray-600">Packages</p>
              </div>
              <p className="text-xl font-bold text-purple-600">{totals.packages}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-indigo-600">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="h-5 w-5 text-indigo-600" />
                <p className="text-xs font-semibold text-gray-600">Weight</p>
              </div>
              <p className="text-xl font-bold text-indigo-600">{totals.weight.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-pink-600">
              <p className="text-xs font-semibold text-gray-600 mb-1">Bilties</p>
              <p className="text-xl font-bold text-pink-600">{billDetails.length}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Freight</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.freight.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Labour</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.labour.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">DD Charge</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.dd.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Toll</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.toll.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Other</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.other.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <BulkRateEditor
          billDetails={billDetails}
          onApplyRates={applyBulkRates}
          onRefresh={loadBillData}
          savedMetadata={billMaster?.metadata?.bulkRates || null}
        />

        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Bill Details (Bilties)</h2>
                <p className="text-sm text-gray-600">{billDetails.length} bilties in this bill</p>
              </div>
            </div>
            <button
              onClick={saveAllBilties}
              disabled={savingBilties}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md"
            >
              <Save className="h-5 w-5" />
              <span>{savingBilties ? 'Saving...' : 'Save All Bilties'}</span>
            </button>
          </div>

          {billDetails.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Bilties Added</h3>
              <p className="text-gray-600">Add bilties to this bill from the main bill page</p>
            </div>
          ) : (
            <BiltyListView
              billDetails={billDetails}
              onSave={saveBillDetail}
              onDelete={deleteBiltyDetail}
            />
          )}
        </div>
      </div>
    </div>
  );
}
