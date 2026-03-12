import supabase from '../app/utils/supabase';

/**
 * Extract valid_upto timestamp from raw validation result data
 * Handles nested response: data.data.results.message or data.results.message etc.
 */
function extractValidUpto(validationResult) {
  try {
    const raw = validationResult?.data;
    if (!raw) return null;
    // Walk nested structure to find eway_bill_valid_date
    let ewbData = null;
    if (raw?.data?.results?.message) ewbData = raw.data.results.message;
    else if (raw?.results?.message) ewbData = raw.results.message;
    else if (raw?.message && typeof raw.message === 'object') ewbData = raw.message;
    else ewbData = raw;

    const validDateStr = ewbData?.eway_bill_valid_date;
    if (!validDateStr) return null;

    // Parse "DD/MM/YYYY HH:MM:SS AM/PM"
    const parts = validDateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i);
    if (!parts) return null;
    let [, dd, mm, yyyy, hh, min, ss, ampm] = parts;
    hh = parseInt(hh);
    if (ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12;
    if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), hh, parseInt(min), parseInt(ss));
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

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

    const validUpto = extractValidUpto(validationResult);
    const now = new Date().toISOString();

    const baseData = {
      validated_by: userId,
      challan_no: challanNo,
      gr_no: grNo || null,
      ewb_number: ewbNumber,
      is_valid: validationResult?.success || false,
      validation_status: validationResult?.success ? 'SUCCESS' : 'FAILED',
      error_message: validationResult?.error || null,
      raw_result_metadata: validationResult || {},
      validated_at: now,
      valid_upto: validUpto,
      updated_by: userId
    };

    console.log('💾 Upserting validation data:', { ...baseData, valid_upto: validUpto });

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
      // Update existing record (do not overwrite created_by)
      console.log('🔄 Updating existing validation record:', existing.id);
      const updateResult = await supabase
        .from('ewb_validations')
        .update(baseData)
        .eq('id', existing.id)
        .select();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Insert new record
      console.log('➕ Creating new validation record');
      const insertResult = await supabase
        .from('ewb_validations')
        .insert([{ ...baseData, created_by: userId }])
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

    const now = new Date().toISOString();
    const validationDataArray = validations.map(({ grNo, ewbNumber, validationResult }) => ({
      validated_by: userId,
      challan_no: challanNo,
      gr_no: grNo || null,
      ewb_number: ewbNumber,
      is_valid: validationResult?.success || false,
      validation_status: validationResult?.success ? 'SUCCESS' : 'FAILED',
      error_message: validationResult?.error || null,
      raw_result_metadata: validationResult || {},
      validated_at: now,
      valid_upto: extractValidUpto(validationResult),
      updated_by: userId
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
        // Update existing (do not overwrite created_by)
        result = await supabase
          .from('ewb_validations')
          .update(validationData)
          .eq('id', existing.id)
          .select();
      } else {
        // Insert new — set created_by
        result = await supabase
          .from('ewb_validations')
          .insert([{ ...validationData, created_by: userId }])
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

    // Always store EWB number in hyphenated format XXXX-XXXX-XXXX
    const cleanEwb = ewbNumber.replace(/[-\s]/g, '');
    const hyphenatedEwbNumber = cleanEwb.length === 12
      ? `${cleanEwb.slice(0,4)}-${cleanEwb.slice(4,8)}-${cleanEwb.slice(8,12)}`
      : cleanEwb;

    const transporterData = {
      updated_by: userId,
      challan_no: challanNo || null,
      gr_no: grNo || null,
      ewb_number: hyphenatedEwbNumber,
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

    // Check if record exists for this EWB (check hyphenated + clean + original for backward compat)
    const { data: existing } = await supabase
      .from('transporter_updates')
      .select('id')
      .in('ewb_number', [...new Set([hyphenatedEwbNumber, cleanEwb, ewbNumber])].filter(Boolean))
      .limit(1)
      .maybeSingle();

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

    // Expand each EWB into all possible stored formats (clean 12-digit + hyphenated + original)
    const allFormats = [];
    ewbNumbers.forEach(ewb => {
      const clean = ewb.replace(/[-\s]/g, '');
      allFormats.push(clean);
      if (clean.length === 12) {
        allFormats.push(`${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8,12)}`);
      }
      if (ewb !== clean) allFormats.push(ewb);
    });
    const uniqueFormats = [...new Set(allFormats)];

    const { data, error } = await supabase
      .from('transporter_updates')
      .select('*')
      .in('ewb_number', uniqueFormats);

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

    // Build map keyed by NORMALIZED (clean) ewb_number so callers can always look up by clean key
    // Also keep the original-format key so callers using raw formats still find it
    const updatesMap = {};
    data.forEach(update => {
      const cleanKey = update.ewb_number.replace(/[-\s]/g, '');
      const enriched = { ...update, users: usersMap[update.updated_by] || null };
      // Store under clean key — this is the canonical lookup
      updatesMap[cleanKey] = enriched;
      // Also store under the original stored format in case callers query by that
      if (update.ewb_number !== cleanKey) {
        updatesMap[update.ewb_number] = enriched;
      }
    });

    console.log('✅ Fetched transporter updates for', Object.keys(updatesMap).length, 'keys');
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
