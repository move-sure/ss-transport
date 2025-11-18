// EWB Validation API utility functions with localStorage caching

const EWB_API_BASE_URL = 'https://movesure-backend.onrender.com/api/ewaybill';
const GSTIN = '09COVPS5556J1ZT';
const CACHE_PREFIX = 'ewb_validation_';
const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

/**
 * Remove hyphens from EWB number for API call
 * @param {string} ewbNumber - EWB number with or without hyphens
 * @returns {string} Clean EWB number without hyphens
 */
export const cleanEwbNumber = (ewbNumber) => {
  return ewbNumber.replace(/-/g, '');
};

/**
 * Format EWB number with hyphens for display
 * @param {string} ewbNumber - Clean EWB number
 * @returns {string} Formatted EWB number with hyphens
 */
export const formatEwbNumber = (ewbNumber) => {
  const clean = cleanEwbNumber(ewbNumber);
  if (clean.length === 12) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
  }
  return clean; // Return as-is if not 12 digits
};

/**
 * Generate cache key for EWB number
 * @param {string} ewbNumber - Clean EWB number
 * @returns {string} Cache key
 */
const getCacheKey = (ewbNumber) => {
  return `${CACHE_PREFIX}${cleanEwbNumber(ewbNumber)}`;
};

/**
 * Check if cached data is still valid
 * @param {Object} cachedData - Cached validation data
 * @returns {boolean} True if cache is valid
 */
const isCacheValid = (cachedData) => {
  if (!cachedData || !cachedData.timestamp) return false;
  
  const now = new Date().getTime();
  const cacheTime = new Date(cachedData.timestamp).getTime();
  const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);
  
  return hoursDiff < CACHE_EXPIRY_HOURS;
};

/**
 * Get cached validation data
 * @param {string} ewbNumber - EWB number to check
 * @returns {Object|null} Cached data or null if not found/expired/invalid
 */
export const getCachedValidation = (ewbNumber) => {
  try {
    const cacheKey = getCacheKey(ewbNumber);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    // Validate JSON before parsing
    if (!cached.trim().startsWith('{') && !cached.trim().startsWith('[')) {
      console.warn('Invalid JSON in cache for:', ewbNumber);
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    let cachedData;
    try {
      cachedData = JSON.parse(cached);
    } catch (parseError) {
      console.error('Failed to parse cached EWB data:', parseError);
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Check if cache is still valid (time-wise)
    if (!isCacheValid(cachedData)) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Check if cached data contains error indicators
    if (cachedData.data?.results?.code === 204 || 
        (cachedData.data?.results?.message && typeof cachedData.data.results.message === 'string' && cachedData.data.results.message.includes('Could not retrieve data')) ||
        cachedData.data?.results?.nic_code === '325' ||
        cachedData.data?.results?.status === 'No Content') {
      // Don't return error cases from cache, let them be re-validated
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cachedData;
  } catch (error) {
    console.error('Error reading EWB cache:', error);
    // Clean up the corrupted cache entry
    try {
      const cacheKey = getCacheKey(ewbNumber);
      localStorage.removeItem(cacheKey);
    } catch (cleanupError) {
      console.error('Error cleaning up cache:', cleanupError);
    }
    return null;
  }
};

/**
 * Cache validation data
 * @param {string} ewbNumber - EWB number
 * @param {Object} validationData - API response data
 */
export const cacheValidation = (ewbNumber, validationData) => {
  try {
    const cacheKey = getCacheKey(ewbNumber);
    const cacheData = {
      ...validationData,
      timestamp: new Date().toISOString(),
      ewbNumber: cleanEwbNumber(ewbNumber)
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching EWB validation:', error);
  }
};

/**
 * Validate single EWB number via API
 * @param {string} ewbNumber - EWB number to validate
 * @returns {Promise<Object>} Validation result
 */
export const validateEwbNumber = async (ewbNumber) => {
  try {
    const cleanNumber = cleanEwbNumber(ewbNumber);
    
    // Check cache first
    const cached = getCachedValidation(cleanNumber);
    if (cached) {
      return {
        success: true,
        data: cached,
        source: 'cache'
      };
    }
    
    // Make API call
    const apiUrl = `${EWB_API_BASE_URL}?eway_bill_number=${cleanNumber}&gstin=${GSTIN}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for specific error cases in the response
    if (data.data?.results?.code === 204 || 
        (data.data?.results?.message && typeof data.data.results.message === 'string' && data.data.results.message.includes('Could not retrieve data')) ||
        data.data?.results?.nic_code === '325') {
      return {
        success: false,
        error: 'Wrong E-Way Bill number - Could not retrieve data',
        source: 'api',
        data: data
      };
    }
    
    // Check for other error indicators
    if (data.data?.results?.status === 'No Content' || 
        data.data?.results?.code >= 400) {
      return {
        success: false,
        error: data.data?.results?.message || 'Invalid E-Way Bill number',
        source: 'api',
        data: data
      };
    }
    
    // Add verification status for successful validation
    const validationData = {
      ...data,
      verified: true,
      verificationDate: new Date().toISOString()
    };
    
    // Cache the result only if it's a successful validation
    cacheValidation(cleanNumber, validationData);
    
    return {
      success: true,
      data: validationData,
      source: 'api'
    };
    
  } catch (error) {
    console.error('EWB validation error:', error);
    return {
      success: false,
      error: error.message,
      source: 'api'
    };
  }
};

/**
 * Validate multiple EWB numbers
 * @param {string[]} ewbNumbers - Array of EWB numbers to validate
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object[]>} Array of validation results
 */
export const validateMultipleEwbNumbers = async (ewbNumbers, onProgress = null) => {
  const results = [];
  
  for (let i = 0; i < ewbNumbers.length; i++) {
    const ewbNumber = ewbNumbers[i];
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: ewbNumbers.length,
        ewbNumber: ewbNumber
      });
    }
    
    const result = await validateEwbNumber(ewbNumber);
    results.push({
      ewbNumber: ewbNumber,
      cleanNumber: cleanEwbNumber(ewbNumber),
      ...result
    });
    
    // Small delay to avoid overwhelming the API
    if (i < ewbNumbers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};

/**
 * Clear all EWB validation cache
 */
export const clearEwbCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('EWB validation cache cleared');
  } catch (error) {
    console.error('Error clearing EWB cache:', error);
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  try {
    const keys = Object.keys(localStorage);
    const ewbKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    let validCount = 0;
    let expiredCount = 0;
    
    ewbKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) {
          expiredCount++;
          return;
        }
        
        const cachedData = JSON.parse(cached);
        if (isCacheValid(cachedData)) {
          validCount++;
        } else {
          expiredCount++;
          // Clean up expired cache
          localStorage.removeItem(key);
        }
      } catch (error) {
        expiredCount++;
        // Clean up corrupted cache
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error('Error removing corrupted cache:', e);
        }
      }
    });
    
    return {
      total: ewbKeys.length,
      valid: validCount,
      expired: expiredCount
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { total: 0, valid: 0, expired: 0 };
  }
};