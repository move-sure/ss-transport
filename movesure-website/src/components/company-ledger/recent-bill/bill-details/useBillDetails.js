'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '@/app/utils/supabase';

export default function useBillDetails(billId) {
  const [bill, setBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [enrichedItems, setEnrichedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch bill details
  const fetchBillDetails = useCallback(async () => {
    if (!billId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch bill master
      const { data: billData, error: billError } = await supabase
        .from('monthly_bill_master')
        .select('*')
        .eq('id', billId)
        .single();

      if (billError) throw billError;

      // Fetch company details
      let company = null;
      if (billData.company_profile_id) {
        const { data: companyData } = await supabase
          .from('bill_company_profile')
          .select('id, company_name, gst_num, pan, mobile_number, email, company_address, city, state, pincode, stakeholder_type')
          .eq('id', billData.company_profile_id)
          .single();
        company = companyData;
      }

      // Fetch created by user
      let createdByUser = null;
      if (billData.created_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, username')
          .eq('id', billData.created_by)
          .single();
        createdByUser = userData;
      }

      // Fetch bill items
      const { data: itemsData, error: itemsError } = await supabase
        .from('monthly_bill_items')
        .select('*')
        .eq('monthly_bill_id', billId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      setBill({ ...billData, company, created_by_user: createdByUser });
      setBillItems(itemsData || []);

      // Enrich items with bilty/station data
      await enrichBillItems(itemsData || []);
    } catch (err) {
      console.error('Error fetching bill details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  // Enrich bill items with data from bilty and station_bilty_summary tables
  const enrichBillItems = async (items) => {
    if (!items || items.length === 0) {
      setEnrichedItems([]);
      return;
    }

    try {
      const enriched = [];

      for (const item of items) {
        let biltyData = null;
        const biltyType = (item.bilty_type || '').toLowerCase();

        if (biltyType === 'regular') {
          // Fetch from bilty table - includes no_of_pkg, wt, pvt_marks
          const { data } = await supabase
            .from('bilty')
            .select('*')
            .eq('gr_no', item.gr_no)
            .limit(1)
            .single();
          biltyData = data;
        } else if (biltyType === 'station') {
          // Fetch from station_bilty_summary table
          const { data } = await supabase
            .from('station_bilty_summary')
            .select('*')
            .eq('gr_no', item.gr_no)
            .limit(1)
            .single();
          
          if (data) {
            // Map station fields to common structure
            biltyData = {
              ...data,
              consignor_name: data.consignor,
              consignee_name: data.consignee,
              contain: data.contents,
              no_of_pkg: data.no_of_packets,
              wt: data.weight,
              payment_mode: data.payment_status,
              total: data.amount,
              bilty_date: data.created_at
            };
          }
        }

        enriched.push({
          ...item,
          biltyData,
          type: item.bilty_type
        });
      }

      setEnrichedItems(enriched);
    } catch (err) {
      console.error('Error enriching bill items:', err);
      // Still set items without enrichment
      setEnrichedItems(items.map(item => ({ ...item, biltyData: null, type: item.bilty_type })));
    }
  };

  // Update bill
  const updateBill = useCallback(async (updateData, userId = null) => {
    try {
      const finalData = {
        ...updateData,
        updated_at: new Date().toISOString()
      };
      if (userId) finalData.updated_by = userId;

      const { data, error: updateError } = await supabase
        .from('monthly_bill_master')
        .update(finalData)
        .eq('id', billId)
        .select()
        .single();

      if (updateError) throw updateError;

      setBill(prev => ({ ...prev, ...data }));
      return { success: true, data };
    } catch (err) {
      console.error('Error updating bill:', err);
      return { success: false, error: err.message };
    }
  }, [billId]);

  // Update bill status
  const updateBillStatus = useCallback(async (status, userId = null) => {
    return updateBill({ status }, userId);
  }, [updateBill]);

  // Remove item from bill
  const removeItem = useCallback(async (itemId) => {
    try {
      // Get item to recalculate totals
      const itemToRemove = billItems.find(i => i.id === itemId);
      if (!itemToRemove) throw new Error('Item not found');

      // Delete item
      const { error: deleteError } = await supabase
        .from('monthly_bill_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Recalculate totals
      const newItems = billItems.filter(i => i.id !== itemId);
      const newTotals = newItems.reduce((acc, item) => ({
        total_freight: acc.total_freight + parseFloat(item.freight_amount || 0),
        total_labour: acc.total_labour + parseFloat(item.labour_charge || 0),
        total_bill_charge: acc.total_bill_charge + parseFloat(item.bill_charge || 0),
        total_toll: acc.total_toll + parseFloat(item.toll_charge || 0),
        total_dd: acc.total_dd + parseFloat(item.dd_charge || 0),
        total_other: acc.total_other + parseFloat(item.other_charge || 0),
        total_amount: acc.total_amount + parseFloat(item.total_amount || 0)
      }), { total_freight: 0, total_labour: 0, total_bill_charge: 0, total_toll: 0, total_dd: 0, total_other: 0, total_amount: 0 });

      // Update bill with new totals
      await updateBill(newTotals);

      // Update local state
      setBillItems(newItems);
      setEnrichedItems(prev => prev.filter(i => i.id !== itemId));

      return { success: true };
    } catch (err) {
      console.error('Error removing item:', err);
      return { success: false, error: err.message };
    }
  }, [billItems, updateBill]);

  // Update a single bill item
  const updateItem = useCallback(async (itemData) => {
    try {
      const { id, ...updateFields } = itemData;
      if (!id) throw new Error('Item ID is required');

      // Update item in database
      const { data, error: updateError } = await supabase
        .from('monthly_bill_items')
        .update({
          rate: updateFields.rate,
          labour_rate: updateFields.labour_rate,
          freight_amount: updateFields.freight_amount,
          labour_charge: updateFields.labour_charge,
          bill_charge: updateFields.bill_charge,
          toll_charge: updateFields.toll_charge,
          dd_charge: updateFields.dd_charge,
          other_charge: updateFields.other_charge,
          total_amount: updateFields.total_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state - billItems
      setBillItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...data } : item
      ));

      // Update enrichedItems as well
      setEnrichedItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...data } : item
      ));

      // Recalculate bill totals
      const updatedItems = billItems.map(item => 
        item.id === id ? { ...item, ...data } : item
      );
      
      const newTotals = updatedItems.reduce((acc, item) => ({
        total_freight: acc.total_freight + parseFloat(item.id === id ? data.freight_amount : item.freight_amount || 0),
        total_labour: acc.total_labour + parseFloat(item.id === id ? data.labour_charge : item.labour_charge || 0),
        total_bill_charge: acc.total_bill_charge + parseFloat(item.id === id ? data.bill_charge : item.bill_charge || 0),
        total_toll: acc.total_toll + parseFloat(item.id === id ? data.toll_charge : item.toll_charge || 0),
        total_dd: acc.total_dd + parseFloat(item.id === id ? data.dd_charge : item.dd_charge || 0),
        total_other: acc.total_other + parseFloat(item.id === id ? data.other_charge : item.other_charge || 0),
        total_amount: acc.total_amount + parseFloat(item.id === id ? data.total_amount : item.total_amount || 0)
      }), { total_freight: 0, total_labour: 0, total_bill_charge: 0, total_toll: 0, total_dd: 0, total_other: 0, total_amount: 0 });

      // Update bill master with new totals
      await updateBill(newTotals);

      return { success: true, data };
    } catch (err) {
      console.error('Error updating item:', err);
      return { success: false, error: err.message };
    }
  }, [billItems, updateBill]);

  // Initial fetch
  useEffect(() => {
    fetchBillDetails();
  }, [fetchBillDetails]);

  return {
    bill,
    billItems,
    enrichedItems,
    loading,
    error,
    refetch: fetchBillDetails,
    updateBill,
    updateBillStatus,
    updateItem,
    removeItem
  };
}
