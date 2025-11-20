import supabase from '../app/utils/supabase';

/**
 * Get validation results for multiple EWB numbers
 */
export async function getEwbValidationsByNumbers(ewbNumbers) {
  try {
    if (!ewbNumbers || ewbNumbers.length === 0) {
      return { success: true, data: [] };
    }

    console.log('🔍 Fetching validation history for', ewbNumbers.length, 'EWBs');

    const { data, error } = await supabase
      .from('ewb_validations')
      .select('*')
      .in('ewb_number', ewbNumbers)
      .order('validated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching EWB validations:', error);
      throw error;
    }

    // Group by ewb_number and get latest for each
    const latestValidations = {};
    data.forEach(validation => {
      if (!latestValidations[validation.ewb_number]) {
        latestValidations[validation.ewb_number] = validation;
      }
    });

    console.log('✅ Fetched validation history for', Object.keys(latestValidations).length, 'EWBs');
    return { success: true, data: latestValidations };
  } catch (error) {
    console.error('❌ Failed to fetch EWB validations:', error);
    return { success: false, error: error.message, data: {} };
  }
}

/**
 * Save individual EWB validation result to database
 */
export async function saveEwbValidation({
  challanNo,
  grNo,
  ewbNumber,
  validationResult,
  userId
}) {
  try {
    console.log('💾 Saving EWB validation:', { 
      userId, 
      challanNo, 
      grNo, 
      ewbNumber, 
      success: validationResult?.success 
    });

    if (!userId) {
      console.error('❌ No userId provided for saving EWB validation');
      return { success: false, error: 'User ID is required' };
    }

    if (!challanNo) {
      console.error('❌ No challanNo provided for saving EWB validation');
      return { success: false, error: 'Challan number is required' };
    }

    const validationData = {
      validated_by: userId,
      challan_no: challanNo,
      gr_no: grNo || null,
      ewb_number: ewbNumber,
      is_valid: validationResult?.success || false,
      validation_status: validationResult?.success ? 'SUCCESS' : 'FAILED',
      error_message: validationResult?.error || null,
      raw_result_metadata: validationResult || {},
      validated_at: new Date().toISOString()
    };

    console.log('💾 Upserting validation data:', validationData);

    // First, try to find existing validation
    const { data: existing } = await supabase
      .from('ewb_validations')
      .select('id')
      .eq('ewb_number', ewbNumber)
      .eq('challan_no', challanNo)
      .order('validated_at', { ascending: false })
      .limit(1)
      .single();

    let data, error;

    if (existing) {
      // Update existing record
      console.log('🔄 Updating existing validation record:', existing.id);
      const updateResult = await supabase
        .from('ewb_validations')
        .update(validationData)
        .eq('id', existing.id)
        .select();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Insert new record
      console.log('➕ Creating new validation record');
      const insertResult = await supabase
        .from('ewb_validations')
        .insert([validationData])
        .select();
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('❌ Supabase error saving EWB validation:', error);
      throw error;
    }

    console.log('✅ EWB validation saved successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to save EWB validation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save multiple EWB validations in bulk
 */
export async function saveEwbValidationsBulk({
  challanNo,
  validations, // Array of { grNo, ewbNumber, validationResult }
  userId
}) {
  try {
    console.log('💾 Saving bulk EWB validations:', { 
      userId, 
      challanNo, 
      count: validations.length 
    });

    if (!userId) {
      console.error('❌ No userId provided for bulk save');
      return { success: false, error: 'User ID is required' };
    }

    if (!challanNo) {
      console.error('❌ No challanNo provided for bulk save');
      return { success: false, error: 'Challan number is required' };
    }

    if (!validations || validations.length === 0) {
      console.warn('⚠️ No validations to save');
      return { success: true, data: [], count: 0 };
    }

    const validationDataArray = validations.map(({ grNo, ewbNumber, validationResult }) => ({
      validated_by: userId,
      challan_no: challanNo,
      gr_no: grNo || null,
      ewb_number: ewbNumber,
      is_valid: validationResult?.success || false,
      validation_status: validationResult?.success ? 'SUCCESS' : 'FAILED',
      error_message: validationResult?.error || null,
      raw_result_metadata: validationResult || {},
      validated_at: new Date().toISOString()
    }));

    console.log('💾 Processing bulk validation data:', validationDataArray.length, 'records');

    // Process each validation individually to handle upsert
    const savedRecords = [];
    for (const validationData of validationDataArray) {
      const { data: existing } = await supabase
        .from('ewb_validations')
        .select('id')
        .eq('ewb_number', validationData.ewb_number)
        .eq('challan_no', validationData.challan_no)
        .order('validated_at', { ascending: false })
        .limit(1)
        .single();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from('ewb_validations')
          .update(validationData)
          .eq('id', existing.id)
          .select();
      } else {
        // Insert new
        result = await supabase
          .from('ewb_validations')
          .insert([validationData])
          .select();
      }

      if (!result.error && result.data) {
        savedRecords.push(result.data[0]);
      }
    }

    console.log('✅ Bulk EWB validations saved successfully:', savedRecords.length, 'records');
    return { success: true, data: savedRecords, count: savedRecords.length };
  } catch (error) {
    console.error('❌ Failed to save bulk EWB validations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save consolidated EWB validation result to database
 */
export async function saveConsolidatedEwbValidation({
  challanNo,
  consolidatedEwbNumber,
  includedEwbNumbers,
  validationResult,
  userId
}) {
  try {
    console.log('💾 Saving consolidated EWB validation:', { 
      userId, 
      challanNo, 
      consolidatedEwbNumber,
      ewbCount: includedEwbNumbers?.length,
      success: validationResult?.success 
    });

    if (!userId) {
      console.error('❌ No userId provided for consolidated EWB save');
      return { success: false, error: 'User ID is required' };
    }

    if (!challanNo) {
      console.error('❌ No challanNo provided for consolidated EWB save');
      return { success: false, error: 'Challan number is required' };
    }

    const consolidatedData = {
      validated_by: userId,
      challan_no: challanNo,
      consolidated_ewb_number: consolidatedEwbNumber || null,
      total_ewb_count: includedEwbNumbers?.length || 0,
      is_valid: validationResult?.success || false,
      validation_status: validationResult?.success ? 'SUCCESS' : 'FAILED',
      error_message: validationResult?.error || validationResult?.message || null,
      included_ewb_numbers: includedEwbNumbers || [],
      raw_result_metadata: {
        success: validationResult?.success,
        cEwbNo: validationResult?.cEwbNo,
        cEwbDate: validationResult?.cEwbDate,
        url: validationResult?.url,
        rawResponse: validationResult?.rawResponse,
        data: validationResult?.data,
        error: validationResult?.error,
        fullData: validationResult
      },
      validated_at: new Date().toISOString()
    };

    console.log('💾 Inserting consolidated validation data:', consolidatedData);

    const { data, error } = await supabase
      .from('consolidated_ewb_validations')
      .insert([consolidatedData])
      .select();

    if (error) {
      console.error('❌ Supabase error saving consolidated EWB:', error);
      throw error;
    }

    console.log('✅ Consolidated EWB validation saved successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to save consolidated EWB validation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get validation history for a challan
 */
export async function getEwbValidationHistory(challanNo) {
  try {
    const { data, error } = await supabase
      .from('ewb_validations')
      .select('*')
      .eq('challan_no', challanNo)
      .order('validated_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch EWB validation history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get consolidated validation history for a challan
 */
export async function getConsolidatedEwbValidationHistory(challanNo) {
  try {
    const { data, error } = await supabase
      .from('consolidated_ewb_validations')
      .select('*')
      .eq('challan_no', challanNo)
      .order('validated_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch consolidated EWB validation history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get latest validation for a specific EWB number
 */
export async function getLatestEwbValidation(ewbNumber) {
  try {
    const { data, error } = await supabase
      .from('ewb_validations')
      .select('*')
      .eq('ewb_number', ewbNumber)
      .order('validated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch latest EWB validation:', error);
    return { success: false, error: error.message };
  }
}
