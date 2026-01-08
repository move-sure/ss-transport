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
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');

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
      
      // Check if metadataUpdate is an event object (has target property)
      // If so, ignore it and use null instead
      const actualMetadata = metadataUpdate?.target ? null : metadataUpdate;
      
      const updateData = {
        bill_number: billMaster.bill_number,
        bill_date: billMaster.bill_date,
        bill_month: billMaster.bill_month,
        bill_year: billMaster.bill_year,
        party_name: billMaster.party_name,
        billing_type: billMaster.billing_type,
        status: billMaster.status,
        metadata: actualMetadata || billMaster.metadata || null
      };

      const { error } = await supabase
        .from('bill_master')
        .update(updateData)
        .eq('bill_id', billId);

      if (error) throw error;
      
      // Update local state
      if (actualMetadata) {
        setBillMaster(prev => ({ ...prev, metadata: actualMetadata }));
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
          bill_charge: detail.bill_charge,
          toll_charge: detail.toll_charge,
          dd_charge: detail.dd_charge,
          pf_charge: detail.pf_charge,
          other_charge: detail.other_charge,
          bilty_total: detail.bilty_total
        })
        .eq('detail_id', detail.detail_id);

      if (error) throw error;
      
      // Update local state immediately
      setBillDetails(prev => prev.map(d => 
        d.detail_id === detail.detail_id ? detail : d
      ));
      
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
            bill_charge: detail.bill_charge,
            toll_charge: detail.toll_charge,
            dd_charge: detail.dd_charge,
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
            bill_charge: detail.bill_charge,
            toll_charge: detail.toll_charge,
            dd_charge: detail.dd_charge,
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
    // If totalAmountOverride is set, use it for the total
    const overrideTotal = billMaster?.metadata?.totalAmountOverride;
    
    const calculatedTotals = billDetails.reduce((acc, detail) => {
      acc.total += parseFloat(detail.bilty_total || 0);
      acc.freight += parseFloat(detail.freight_amount || 0);
      acc.labour += parseFloat(detail.labour_charge || 0);
      acc.bill += parseFloat(detail.bill_charge || 0);
      acc.toll += parseFloat(detail.toll_charge || 0);
      acc.dd += parseFloat(detail.dd_charge || 0);
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
      total: 0, paid: 0, toPay: 0, freight: 0, labour: 0, bill: 0,
      toll: 0, dd: 0, pf: 0, other: 0, packages: 0, weight: 0 
    });

    // Add custom other charges
    if (billMaster?.metadata?.otherCharges && Array.isArray(billMaster.metadata.otherCharges)) {
      billMaster.metadata.otherCharges.forEach(charge => {
        calculatedTotals.otherCharges = (calculatedTotals.otherCharges || 0) + parseFloat(charge.amount || 0);
        calculatedTotals.total += parseFloat(charge.amount || 0);
      });
    }

    // Apply override if set
    if (overrideTotal !== null && overrideTotal !== undefined) {
      calculatedTotals.total = overrideTotal;
    }

    return calculatedTotals;
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

  const addOtherCharge = () => {
    if (!newChargeName.trim() || !newChargeAmount.trim()) {
      alert('Please enter charge name and amount');
      return;
    }

    const metadata = {
      ...billMaster.metadata,
      otherCharges: [
        ...(billMaster.metadata?.otherCharges || []),
        {
          id: Date.now(),
          name: newChargeName,
          amount: parseFloat(newChargeAmount)
        }
      ]
    };

    setBillMaster(prev => ({ ...prev, metadata }));
    setNewChargeName('');
    setNewChargeAmount('');
  };

  const removeOtherCharge = (chargeId) => {
    const metadata = {
      ...billMaster.metadata,
      otherCharges: (billMaster.metadata?.otherCharges || []).filter(c => c.id !== chargeId)
    };
    setBillMaster(prev => ({ ...prev, metadata }));
  };

  const updateOtherCharge = (chargeId, field, value) => {
    const metadata = {
      ...billMaster.metadata,
      otherCharges: (billMaster.metadata?.otherCharges || []).map(c =>
        c.id === chargeId
          ? { ...c, [field]: field === 'name' ? value : parseFloat(value) }
          : c
      )
    };
    setBillMaster(prev => ({ ...prev, metadata }));
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
      
      <div className="w-full px-3 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/bill')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Bill</h1>
              <p className="text-xs text-gray-600 mt-1">Bill ID: {billId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintBill}
              disabled={generatingPDF || billDetails.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-md"
            >
              <Printer className="h-4 w-4" />
              <span>{generatingPDF ? 'Generating...' : 'Print Bill'}</span>
            </button>
            <button
              onClick={saveBillMaster}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Bill Master'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Bill Master Information</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bill Number *</label>
              <input
                type="text"
                value={billMaster.bill_number || ''}
                onChange={(e) => handleMasterChange('bill_number', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bill Date *</label>
              <input
                type="date"
                value={billMaster.bill_date || ''}
                onChange={(e) => handleMasterChange('bill_date', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-900"
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={billMaster.metadata?.dateRange?.fromDate || ''}
                onChange={(e) => {
                  const metadata = {
                    ...billMaster.metadata,
                    dateRange: {
                      ...billMaster.metadata?.dateRange,
                      fromDate: e.target.value
                    }
                  };
                  setBillMaster(prev => ({ ...prev, metadata }));
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-900 font-semibold"
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={billMaster.metadata?.dateRange?.toDate || ''}
                onChange={(e) => {
                  const metadata = {
                    ...billMaster.metadata,
                    dateRange: {
                      ...billMaster.metadata?.dateRange,
                      toDate: e.target.value
                    }
                  };
                  setBillMaster(prev => ({ ...prev, metadata }));
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-900 font-semibold"
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Party Name *</label>
              <input
                type="text"
                value={billMaster.party_name || ''}
                onChange={(e) => handleMasterChange('party_name', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Type *</label>
              <select
                value={billMaster.billing_type || 'consignor'}
                onChange={(e) => handleMasterChange('billing_type', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              >
                <option value="consignor">Consignor</option>
                <option value="consignee">Consignee</option>
                <option value="transport">Transport</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={billMaster.status || 'Draft'}
                onChange={(e) => handleMasterChange('status', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              >
                <option value="Draft">Draft</option>
                <option value="Finalized">Finalized</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Month</label>
              <input
                type="number"
                value={billMaster.bill_month || ''}
                readOnly
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={billMaster.bill_year || ''}
                readOnly
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Created</label>
              <input
                type="text"
                value={billMaster.created_date ? format(new Date(billMaster.created_date), 'dd MMM yy') : 'N/A'}
                readOnly
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Previous Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={billMaster.metadata?.previousBalance || ''}
                onChange={(e) => {
                  const metadata = {
                    ...billMaster.metadata,
                    previousBalance: e.target.value ? parseFloat(e.target.value) : 0
                  };
                  setBillMaster(prev => ({ ...prev, metadata }));
                }}
                placeholder="Enter last month/year balance"
                className="w-full px-2 py-1.5 text-sm border border-orange-300 rounded focus:border-orange-500 focus:ring-1 focus:ring-orange-200 bg-orange-50"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Total Amount Override (₹)
                <span className="text-xs font-normal text-gray-500 ml-1">(Optional - leave empty to use calculated total)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={billMaster.metadata?.totalAmountOverride || ''}
                onChange={(e) => {
                  const metadata = {
                    ...billMaster.metadata,
                    totalAmountOverride: e.target.value ? parseFloat(e.target.value) : null
                  };
                  setBillMaster(prev => ({ ...prev, metadata }));
                }}
                placeholder="Enter custom total or leave blank for automatic"
                className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-blue-50"
              />
            </div>
          </div>
        </div>

        {/* Other Charges Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
            <div className="p-1.5 bg-red-600 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Additional Charges</h2>
          </div>

          {/* Add New Charge */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Charge</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Charge Name</label>
                <input
                  type="text"
                  value={newChargeName}
                  onChange={(e) => setNewChargeName(e.target.value)}
                  placeholder="e.g., Handling, Documentation, Insurance"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addOtherCharge}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                >
                  Add Charge
                </button>
              </div>
            </div>
          </div>

          {/* List of Other Charges */}
          {billMaster?.metadata?.otherCharges && billMaster.metadata.otherCharges.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Charges</h3>
              <div className="space-y-2">
                {billMaster.metadata.otherCharges.map((charge) => (
                  <div key={charge.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={charge.name}
                          onChange={(e) => updateOtherCharge(charge.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={charge.amount}
                          onChange={(e) => updateOtherCharge(charge.id, 'amount', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeOtherCharge(charge.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs font-semibold text-gray-700">
                  Total Other Charges: <span className="text-blue-600">₹{billMaster.metadata.otherCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString('en-IN')}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No additional charges added yet</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg shadow-sm p-3 mb-4 border border-blue-200">
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-13 gap-2">
            <div className={`bg-white rounded p-2 shadow-sm border-l-2 ${billMaster.metadata?.totalAmountOverride ? 'border-cyan-600' : 'border-blue-600'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className={`h-3 w-3 ${billMaster.metadata?.totalAmountOverride ? 'text-cyan-600' : 'text-blue-600'}`} />
                <p className="text-xs font-semibold text-gray-600">
                  {billMaster.metadata?.totalAmountOverride ? 'Total (Custom)' : 'Current'}
                </p>
              </div>
              <p className={`text-base font-bold ${billMaster.metadata?.totalAmountOverride ? 'text-cyan-700' : 'text-gray-900'}`}>
                ₹{totals.total.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-orange-500">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Prev Bal</p>
              <p className="text-base font-bold text-orange-600">₹{(billMaster.metadata?.previousBalance || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-red-600">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Grand Total</p>
              <p className="text-base font-bold text-red-600">₹{(totals.total + (billMaster.metadata?.previousBalance || 0)).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-green-600">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Paid</p>
              <p className="text-base font-bold text-green-600">₹{totals.paid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-orange-600">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">To Pay</p>
              <p className="text-base font-bold text-orange-600">₹{totals.toPay.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-purple-600">
              <div className="flex items-center gap-1 mb-0.5">
                <Package className="h-3 w-3 text-purple-600" />
                <p className="text-xs font-semibold text-gray-600">Pkgs</p>
              </div>
              <p className="text-base font-bold text-purple-600">{totals.packages}</p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-indigo-600">
              <div className="flex items-center gap-1 mb-0.5">
                <Weight className="h-3 w-3 text-indigo-600" />
                <p className="text-xs font-semibold text-gray-600">Wt</p>
              </div>
              <p className="text-base font-bold text-indigo-600">{totals.weight.toFixed(0)}</p>
            </div>
            <div className="bg-white rounded p-2 shadow-sm border-l-2 border-pink-600">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Bilties</p>
              <p className="text-base font-bold text-pink-600">{billDetails.length}</p>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <p className="text-xs text-gray-600 font-medium">Freight</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.freight.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <p className="text-xs text-gray-600 font-medium">Labour</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.labour.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <p className="text-xs text-gray-600 font-medium">DD</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.dd.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <p className="text-xs text-gray-600 font-medium">Toll</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.toll.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded p-2 text-center">
              <p className="text-xs text-gray-600 font-medium">Other</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.other.toLocaleString('en-IN')}</p>
            </div>
            {totals.otherCharges && totals.otherCharges > 0 && (
              <div className="bg-white rounded p-2 shadow-sm border-l-2 border-red-600">
                <p className="text-xs font-semibold text-gray-600 mb-0.5">Add. Charges</p>
                <p className="text-base font-bold text-red-600">₹{totals.otherCharges.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        </div>

        <BulkRateEditor
          billDetails={billDetails}
          onApplyRates={applyBulkRates}
          onRefresh={loadBillData}
          savedMetadata={billMaster?.metadata?.bulkRates || null}
        />

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bill Details (Bilties)</h2>
                <p className="text-xs text-gray-600">{billDetails.length} bilties</p>
              </div>
            </div>
            <button
              onClick={saveAllBilties}
              disabled={savingBilties}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md"
            >
              <Save className="h-4 w-4" />
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
