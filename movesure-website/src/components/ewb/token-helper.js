import supabase from './supabase';

/**
 * Fetch authentication tokens from the auth_tokens table
 * @param {string} gstin - Optional GSTIN to filter by
 * @returns {Promise<Object>} - Returns tokens data or error
 */
export const fetchAuthTokens = async (gstin = null) => {
  try {
    let query = supabase
      .from('auth_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (gstin) {
      query = query.eq('gstin', gstin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching auth tokens:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Exception in fetchAuthTokens:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Fetch EWB tokens from the ewb_tokens table
 * @param {string} gstin - Optional GSTIN to filter by
 * @returns {Promise<Object>} - Returns tokens data or error
 */
export const fetchEwbTokens = async (gstin = null) => {
  try {
    let query = supabase
      .from('ewb_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (gstin) {
      query = query.eq('gstin', gstin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching EWB tokens:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Exception in fetchEwbTokens:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Get active token by GSTIN from auth_tokens
 * @param {string} gstin - GSTIN to search for
 * @returns {Promise<Object>} - Returns single active token or null
 */
export const getActiveAuthToken = async (gstin) => {
  try {
    const { data, error } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('gstin', gstin)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching active auth token:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: data || null, error: null };
  } catch (error) {
    console.error('Exception in getActiveAuthToken:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Get active token by GSTIN from ewb_tokens
 * @param {string} gstin - GSTIN to search for
 * @returns {Promise<Object>} - Returns single active token or null
 */
export const getActiveEwbToken = async (gstin) => {
  try {
    const { data, error } = await supabase
      .from('ewb_tokens')
      .select('*')
      .eq('gstin', gstin)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching active EWB token:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: data || null, error: null };
  } catch (error) {
    console.error('Exception in getActiveEwbToken:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Insert new authentication token
 * @param {Object} tokenData - Token data to insert
 * @returns {Promise<Object>} - Returns success status and inserted data
 */
export const insertAuthToken = async (tokenData) => {
  try {
    const { data, error } = await supabase
      .from('auth_tokens')
      .insert([tokenData])
      .select();

    if (error) {
      console.error('Error inserting auth token:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Exception in insertAuthToken:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Insert new EWB token
 * @param {Object} tokenData - Token data to insert
 * @returns {Promise<Object>} - Returns success status and inserted data
 */
export const insertEwbToken = async (tokenData) => {
  try {
    const { data, error } = await supabase
      .from('ewb_tokens')
      .insert([tokenData])
      .select();

    if (error) {
      console.error('Error inserting EWB token:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Exception in insertEwbToken:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Update token usage count and last used timestamp
 * @param {string} tableName - 'auth_tokens' or 'ewb_tokens'
 * @param {number} tokenId - Token ID to update
 * @returns {Promise<Object>} - Returns success status
 */
export const updateTokenUsage = async (tableName, tokenId) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: supabase.raw('usage_count + 1')
      })
      .eq('id', tokenId)
      .select();

    if (error) {
      console.error(`Error updating ${tableName} usage:`, error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error(`Exception in updateTokenUsage for ${tableName}:`, error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Deactivate expired tokens
 * @param {string} tableName - 'auth_tokens' or 'ewb_tokens'
 * @returns {Promise<Object>} - Returns success status and count of deactivated tokens
 */
export const deactivateExpiredTokens = async (tableName) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)
      .select();

    if (error) {
      console.error(`Error deactivating expired ${tableName}:`, error);
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, error: null, count: data?.length || 0 };
  } catch (error) {
    console.error(`Exception in deactivateExpiredTokens for ${tableName}:`, error);
    return { success: false, error: error.message, count: 0 };
  }
};

/**
 * Get token statistics
 * @returns {Promise<Object>} - Returns token statistics
 */
export const getTokenStatistics = async () => {
  try {
    // Get auth tokens stats
    const { data: authStats, error: authError } = await supabase
      .from('auth_tokens')
      .select('is_active, expires_at, environment');

    if (authError) {
      console.error('Error fetching auth token stats:', authError);
    }

    // Get EWB tokens stats
    const { data: ewbStats, error: ewbError } = await supabase
      .from('ewb_tokens')
      .select('is_active, expires_at, environment');

    if (ewbError) {
      console.error('Error fetching EWB token stats:', ewbError);
    }

    const now = new Date().toISOString();
    
    const stats = {
      authTokens: {
        total: authStats?.length || 0,
        active: authStats?.filter(t => t.is_active)?.length || 0,
        expired: authStats?.filter(t => t.expires_at && t.expires_at < now)?.length || 0,
        sandbox: authStats?.filter(t => t.environment === 'sandbox')?.length || 0,
        production: authStats?.filter(t => t.environment === 'production')?.length || 0
      },
      ewbTokens: {
        total: ewbStats?.length || 0,
        active: ewbStats?.filter(t => t.is_active)?.length || 0,
        expired: ewbStats?.filter(t => t.expires_at && t.expires_at < now)?.length || 0,
        sandbox: ewbStats?.filter(t => t.environment === 'sandbox')?.length || 0,
        production: ewbStats?.filter(t => t.environment === 'production')?.length || 0
      }
    };

    return { success: true, data: stats, error: null };
  } catch (error) {
    console.error('Exception in getTokenStatistics:', error);
    return { success: false, error: error.message, data: null };
  }
};