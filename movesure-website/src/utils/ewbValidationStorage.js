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

/**
 * Save or update transporter update result to database
 * Uses upsert logic to ensure only one row per EWB number
 */
export async function saveTransporterUpdate({
  challanNo,
  grNo,
  ewbNumber,
  transporterId,
  transporterName,
  userGstin,
  updateResult,
  userId
}) {
  try {
    console.log('💾 Saving transporter update:', { 
      userId, 
      challanNo, 
      grNo,
      ewbNumber,
      transporterId,
      success: updateResult?.success 
    });

    if (!userId) {
      console.error('❌ No userId provided for transporter update save');
      return { success: false, error: 'User ID is required' };
    }

    if (!ewbNumber) {
      console.error('❌ No ewbNumber provided for transporter update save');
      return { success: false, error: 'EWB number is required' };
    }

    const transporterData = {
      updated_by: userId,
      challan_no: challanNo || null,
      gr_no: grNo || null,
      ewb_number: ewbNumber,
      transporter_id: transporterId,
      transporter_name: transporterName,
      user_gstin: userGstin || null,
      is_success: updateResult?.success || false,
      update_status: updateResult?.success ? 'SUCCESS' : 'FAILED',
      error_message: updateResult?.error || updateResult?.message || null,
      pdf_url: updateResult?.pdfUrl || null,
      update_date: updateResult?.updateDate || null,
      raw_result_metadata: {
        success: updateResult?.success,
        ewbNumber: updateResult?.ewbNumber,
        transporterId: updateResult?.transporterId,
        transporterName: updateResult?.transporterName,
        updateDate: updateResult?.updateDate,
        pdfUrl: updateResult?.pdfUrl,
        rawResponse: updateResult?.rawResponse,
        error: updateResult?.error,
        fullData: updateResult
      },
      updated_at: new Date().toISOString()
    };

    console.log('💾 Upserting transporter update data:', transporterData);

    // Check if record exists for this EWB
    const { data: existing } = await supabase
      .from('transporter_updates')
      .select('id')
      .eq('ewb_number', ewbNumber)
      .single();

    let data, error;

    if (existing) {
      // Update existing record
      console.log('🔄 Updating existing transporter update record:', existing.id);
      const updateResult = await supabase
        .from('transporter_updates')
        .update(transporterData)
        .eq('id', existing.id)
        .select();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Insert new record
      console.log('➕ Creating new transporter update record');
      const insertResult = await supabase
        .from('transporter_updates')
        .insert([transporterData])
        .select();
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('❌ Supabase error saving transporter update:', error);
      throw error;
    }

    console.log('✅ Transporter update saved successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to save transporter update:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get transporter update history for a challan
 */
export async function getTransporterUpdateHistory(challanNo) {
  try {
    const { data, error } = await supabase
      .from('transporter_updates')
      .select('*')
      .eq('challan_no', challanNo)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch transporter update history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get latest transporter update for a specific EWB number
 */
export async function getLatestTransporterUpdate(ewbNumber) {
  try {
    const { data, error } = await supabase
      .from('transporter_updates')
      .select('*')
      .eq('ewb_number', ewbNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch latest transporter update:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get transporter updates for multiple EWB numbers
 */
export async function getTransporterUpdatesByEwbNumbers(ewbNumbers) {
  try {
    if (!ewbNumbers || ewbNumbers.length === 0) {
      return { success: true, data: {} };
    }

    console.log('🔍 Fetching transporter updates for', ewbNumbers.length, 'EWBs');

    const { data, error } = await supabase
      .from('transporter_updates')
      .select('*')
      .in('ewb_number', ewbNumbers);

    if (error) {
      console.error('❌ Error fetching transporter updates:', error);
      throw error;
    }

    // Get unique user IDs from the updates
    const userIds = [...new Set(data.map(u => u.updated_by).filter(Boolean))];
    
    // Fetch user details
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, username')
        .in('id', userIds);

      if (!usersError && usersData) {
        usersMap = Object.fromEntries(usersData.map(u => [u.id, u]));
      }
    }

    // Convert to map keyed by ewb_number with user details
    const updatesMap = {};
    data.forEach(update => {
      updatesMap[update.ewb_number] = {
        ...update,
        users: usersMap[update.updated_by] || null
      };
    });

    console.log('✅ Fetched transporter updates for', Object.keys(updatesMap).length, 'EWBs');
    return { success: true, data: updatesMap };
  } catch (error) {
    console.error('❌ Failed to fetch transporter updates:', error);
    return { success: false, error: error.message, data: {} };
  }
}

/**
 * Check which EWB numbers have successful consolidated EWB validations
 * Returns a map of EWB number -> consolidated EWB validation record
 */
export async function getConsolidatedEwbByIncludedNumbers(ewbNumbers) {
  try {
    if (!ewbNumbers || ewbNumbers.length === 0) {
      return { success: true, data: {} };
    }

    console.log('🔍 Checking consolidated EWB validations for', ewbNumbers.length, 'EWBs');

    // Fetch all successful consolidated EWB validations that might contain these EWB numbers
    const { data, error } = await supabase
      .from('consolidated_ewb_validations')
      .select('*')
      .eq('is_valid', true)
      .order('validated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching consolidated EWB validations:', error);
      throw error;
    }

    // Build a map of EWB number -> consolidated validation
    const consolidatedMap = {};
    ewbNumbers.forEach(ewbNumber => {
      // Find a consolidated EWB that includes this EWB number
      const matchingConsolidated = data.find(consolidated => {
        const includedEwbs = consolidated.included_ewb_numbers || [];
        return includedEwbs.some(included => {
          // Normalize both numbers for comparison (remove spaces, handle formatting)
          const normalizedIncluded = included?.toString().replace(/\s/g, '').trim();
          const normalizedEwb = ewbNumber?.toString().replace(/\s/g, '').trim();
          return normalizedIncluded === normalizedEwb;
        });
      });
      
      if (matchingConsolidated) {
        consolidatedMap[ewbNumber] = matchingConsolidated;
      }
    });

    console.log('✅ Found consolidated EWBs for', Object.keys(consolidatedMap).length, 'EWBs');
    return { success: true, data: consolidatedMap };
  } catch (error) {
    console.error('❌ Failed to fetch consolidated EWB validations:', error);
    return { success: false, error: error.message, data: {} };
  }
}
