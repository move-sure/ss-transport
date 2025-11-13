import supabase from '../app/utils/supabase';

/**
 * Save bilties to bill_details table
 * @param {number} billId - Bill master ID
 * @param {Array} bilties - Array of bilty objects
 * @returns {Promise<Object>} - Returns { success, error }
 */
export const saveBiltiesToBillDetails = async (billId, bilties) => {
  try {
    if (!billId || !bilties || bilties.length === 0) {
      throw new Error('Bill ID and bilties are required');
    }

    // Transform bilties to bill_details format
    const billDetails = bilties.map(bilty => ({
      bill_id: billId,
      grno: bilty.gr_no || '',
      date: bilty.bilty_date || bilty.created_at || new Date().toISOString().slice(0, 10),
      consignor: bilty.consignor_name || bilty.consignor || '',
      consignee: bilty.consignee_name || bilty.consignee || '',
      city: bilty.to_city_name || bilty.station_city_name || bilty.station || '',
      no_of_pckg: bilty.no_of_pkg || bilty.no_of_packets || 0,
      wt: bilty.wt || bilty.weight || 0,
      pvt_marks: bilty.pvt_marks || '',
      delivery_type: bilty.delivery_type || 'godown',
      pay_mode: bilty.payment_mode || bilty.payment_status || 'to-pay',
      rate_by_kg: bilty.rate || 0,
      labour_rate: bilty.labour_rate || 0,
      freight_amount: bilty.freight || 0,
      labour_charge: bilty.labour_charge || 0,
      dd_charge: bilty.dd_charge || 0,
      toll_charge: bilty.toll_charge || 0,
      pf_charge: bilty.pf_charge || 0,
      other_charge: bilty.other_charge || 0,
      bilty_total: bilty.total || bilty.amount || 0
    }));

    // Delete existing details first (to handle updates)
    await supabase
      .from('bill_details')
      .delete()
      .eq('bill_id', billId);

    // Insert new details
    const { data, error } = await supabase
      .from('bill_details')
      .insert(billDetails)
      .select();

    if (error) throw error;

    console.log('✅ Saved', data.length, 'bilties to bill_details');

    return {
      success: true,
      data: data,
      message: `✅ Successfully saved ${data.length} bilties`
    };

  } catch (error) {
    console.error('❌ Error saving bilties to bill_details:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get bill details for a bill master
 * @param {number} billId - Bill master ID
 * @returns {Promise<Array>} - Returns array of bill details
 */
export const getBillDetails = async (billId) => {
  try {
    const { data, error } = await supabase
      .from('bill_details')
      .select('*')
      .eq('bill_id', billId)
      .order('detail_id', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching bill details:', error);
    return [];
  }
};

/**
 * Delete specific bilty from bill_details
 * @param {number} detailId - Detail ID to delete
 * @returns {Promise<Object>} - Returns { success, error }
 */
export const deleteBiltyFromBillDetails = async (detailId) => {
  try {
    const { error } = await supabase
      .from('bill_details')
      .delete()
      .eq('detail_id', detailId);

    if (error) throw error;

    return {
      success: true,
      message: 'Bilty removed successfully'
    };
  } catch (error) {
    console.error('Error deleting bilty:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update bill master status
 * @param {number} billId - Bill master ID
 * @param {string} status - New status (Draft, Finalized, Cancelled)
 * @returns {Promise<Object>} - Returns { success, error }
 */
export const updateBillMasterStatus = async (billId, status) => {
  try {
    const { data, error } = await supabase
      .from('bill_master')
      .update({ status })
      .eq('bill_id', billId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error updating bill status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Link bill master to monthly_bill (after PDF generation)
 * @param {number} billId - Bill master ID
 * @param {number} monthlyBillId - Monthly bill ID (from monthly_bill table)
 * @returns {Promise<Object>} - Returns { success, error }
 */
export const linkBillMasterToMonthlyBill = async (billId, monthlyBillId) => {
  try {
    // You can add a column 'monthly_bill_id' to bill_master table to store this link
    const { data, error } = await supabase
      .from('bill_master')
      .update({ 
        status: 'Finalized',
        monthly_bill_id: monthlyBillId 
      })
      .eq('bill_id', billId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error linking bill master to monthly bill:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
