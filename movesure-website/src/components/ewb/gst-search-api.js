/**
 * Search GSTIN details using the Next.js API route
 * @param {string} gstin - GSTIN to search for
 * @returns {Promise<Object>} - Returns search result or error
 */
export const searchGSTIN = async (gstin) => {
  try {
    // Validate GSTIN format (15 characters)
    if (!gstin || gstin.length !== 15) {
      return {
        success: false,
        error: 'Please enter a valid 15-digit GSTIN',
        data: null
      };
    }

    // Make API call to our Next.js API route
    const response = await fetch('/api/gst/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gstin: gstin.toUpperCase() })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        data: result.data,
        error: null,
        transaction_id: result.transaction_id
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to search GSTIN',
        data: null
      };
    }

  } catch (error) {
    console.error('Error searching GSTIN:', error);
    return {
      success: false,
      error: error.message || 'Network error. Please check your connection and try again.',
      data: null
    };
  }
};

/**
 * Format GSTIN data for display
 * @param {Object} gstData - GST data from API
 * @returns {Object} - Formatted data
 */
export const formatGSTData = (gstData) => {
  if (!gstData) return null;

  return {
    gstin: gstData.gstin,
    legalName: gstData.lgnm,
    tradeName: gstData.tradeNam,
    businessType: gstData.ctb,
    status: gstData.sts,
    registrationDate: gstData.rgdt,
    lastUpdated: gstData.lstupdt,
    einvoiceStatus: gstData.einvoiceStatus,
    stateJurisdiction: gstData.stj,
    centerJurisdiction: gstData.ctj,
    principalAddress: gstData.pradr,
    additionalAddresses: gstData.adadr,
    natureOfBusiness: gstData.nba
  };
};

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {Object} - Validation result
 */
export const validateGSTIN = (gstin) => {
  if (!gstin) {
    return { valid: false, message: 'GSTIN is required' };
  }

  if (gstin.length !== 15) {
    return { valid: false, message: 'GSTIN must be 15 characters long' };
  }

  // Basic GSTIN format validation
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin.toUpperCase())) {
    return { valid: false, message: 'Invalid GSTIN format' };
  }

  return { valid: true, message: 'Valid GSTIN format' };
};
