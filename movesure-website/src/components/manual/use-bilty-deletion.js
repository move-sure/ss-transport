import { useState } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * Custom hook for handling bilty deletion with archiving
 * Archives deleted bilty to station_bilty_deleted table before deletion
 */
export default function useBiltyDeletion() {
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete a bilty record and archive it
   * @param {string} biltyId - The ID of the bilty to delete
   * @param {string} userId - The ID of the user performing the deletion
   * @param {string} deleteReason - Optional reason for deletion
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deleteBiltyWithArchive = async (biltyId, userId, deleteReason = null) => {
    try {
      setDeleting(true);

      // Step 1: Fetch the original record from station_bilty_summary
      const { data: originalRecord, error: fetchError } = await supabase
        .from('station_bilty_summary')
        .select('*')
        .eq('id', biltyId)
        .single();

      if (fetchError) {
        console.error('Error fetching original record:', fetchError);
        throw new Error('Failed to fetch the record for deletion');
      }

      if (!originalRecord) {
        throw new Error('Record not found');
      }

      // Step 2: Prepare the archived record
      const archivedRecord = {
        original_id: originalRecord.id,
        station: originalRecord.station,
        gr_no: originalRecord.gr_no,
        consignor: originalRecord.consignor,
        consignee: originalRecord.consignee,
        contents: originalRecord.contents,
        no_of_packets: originalRecord.no_of_packets,
        weight: originalRecord.weight,
        payment_status: originalRecord.payment_status,
        amount: originalRecord.amount,
        pvt_marks: originalRecord.pvt_marks,
        created_at: originalRecord.created_at,
        updated_at: originalRecord.updated_at,
        delivery_type: originalRecord.delivery_type,
        staff_id: originalRecord.staff_id,
        branch_id: originalRecord.branch_id,
        e_way_bill: originalRecord.e_way_bill,
        deleted_by: userId,
        deleted_at: new Date().toISOString(),
        delete_reason: deleteReason
      };

      // Step 3: Insert into station_bilty_deleted table
      const { error: insertError } = await supabase
        .from('station_bilty_deleted')
        .insert([archivedRecord]);

      if (insertError) {
        console.error('Error archiving record:', insertError);
        throw new Error('Failed to archive the record');
      }

      // Step 4: Delete from station_bilty_summary
      const { error: deleteError } = await supabase
        .from('station_bilty_summary')
        .delete()
        .eq('id', biltyId);

      if (deleteError) {
        console.error('Error deleting record:', deleteError);
        throw new Error('Failed to delete the record');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteBiltyWithArchive:', error);
      return { success: false, error: error.message };
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Get deleted bilty records with user information
   * @param {number} limit - Number of records to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<{data: Array, count: number}>}
   */
  const getDeletedBilties = async (limit = 20, offset = 0) => {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('station_bilty_deleted')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get paginated data
      const { data: deletedData, error } = await supabase
        .from('station_bilty_deleted')
        .select('*')
        .order('deleted_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Manually fetch user info for each record
      const dataWithUsers = await Promise.all(
        (deletedData || []).map(async (record) => {
          if (record.deleted_by) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, name, username')
              .eq('id', record.deleted_by)
              .single();
            
            return {
              ...record,
              deleted_by_user: userData
            };
          }
          return record;
        })
      );

      return { data: dataWithUsers, count: count || 0 };
    } catch (error) {
      console.error('Error fetching deleted bilties:', error);
      return { data: [], count: 0 };
    }
  };

  /**
   * Search deleted bilties by GR number
   * @param {string} grNo - GR number to search
   * @returns {Promise<Array>}
   */
  const searchDeletedBilties = async (grNo) => {
    try {
      const { data: deletedData, error } = await supabase
        .from('station_bilty_deleted')
        .select('*')
        .ilike('gr_no', `%${grNo}%`)
        .order('deleted_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Manually fetch user info for each record
      const dataWithUsers = await Promise.all(
        (deletedData || []).map(async (record) => {
          if (record.deleted_by) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, name, username')
              .eq('id', record.deleted_by)
              .single();
            
            return {
              ...record,
              deleted_by_user: userData
            };
          }
          return record;
        })
      );

      return dataWithUsers;
    } catch (error) {
      console.error('Error searching deleted bilties:', error);
      return [];
    }
  };

  return {
    deleting,
    deleteBiltyWithArchive,
    getDeletedBilties,
    searchDeletedBilties
  };
}
