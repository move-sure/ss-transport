'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '@/app/utils/supabase';

export default function useRecentBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch recent bills with company info
  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from('monthly_bill_master')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (billsError) throw billsError;

      if (!billsData || billsData.length === 0) {
        setBills([]);
        return;
      }

      // Get unique company IDs and user IDs
      const companyIds = [...new Set(billsData.map(b => b.company_profile_id).filter(Boolean))];
      const userIds = [...new Set(billsData.map(b => b.created_by).filter(Boolean))];

      // Fetch companies
      let companiesMap = {};
      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase
          .from('bill_company_profile')
          .select('id, company_name, gst_num, city, stakeholder_type')
          .in('id', companyIds);
        
        if (companiesData) {
          companiesMap = companiesData.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
          }, {});
        }
      }

      // Fetch users
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, username')
          .in('id', userIds);
        
        if (usersData) {
          usersMap = usersData.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {});
        }
      }

      // Combine data
      const enrichedBills = billsData.map(bill => ({
        ...bill,
        company: companiesMap[bill.company_profile_id] || null,
        created_by_user: usersMap[bill.created_by] || null
      }));

      setBills(enrichedBills);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.message);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get bill items for a specific bill
  const getBillItems = useCallback(async (billId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('monthly_bill_items')
        .select('*')
        .eq('monthly_bill_id', billId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error fetching bill items:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Update bill status
  const updateBillStatus = useCallback(async (billId, status, userId = null) => {
    try {
      const updateData = { 
        status,
        updated_at: new Date().toISOString()
      };
      if (userId) updateData.updated_by = userId;

      const { data, error: updateError } = await supabase
        .from('monthly_bill_master')
        .update(updateData)
        .eq('id', billId)
        .select()
        .single();

      if (updateError) throw updateError;
      
      // Update local state
      setBills(prev => prev.map(b => b.id === billId ? { ...b, ...data } : b));
      return { success: true, data };
    } catch (err) {
      console.error('Error updating bill status:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Delete bill and its items
  const deleteBill = useCallback(async (billId) => {
    try {
      // First delete all items
      const { error: itemsError } = await supabase
        .from('monthly_bill_items')
        .delete()
        .eq('monthly_bill_id', billId);

      if (itemsError) throw itemsError;

      // Then delete the master bill
      const { error: billError } = await supabase
        .from('monthly_bill_master')
        .delete()
        .eq('id', billId);

      if (billError) throw billError;

      // Update local state
      setBills(prev => prev.filter(b => b.id !== billId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting bill:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return {
    bills,
    loading,
    error,
    refreshBills: fetchBills,
    getBillItems,
    updateBillStatus,
    deleteBill
  };
}
