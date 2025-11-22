/**
 * Transport Search Helper
 * Provides advanced search and filtering utilities for transport management
 */

/**
 * Performs fuzzy search on transporters
 * @param {Array} transporters - List of transporter objects
 * @param {string} searchTerm - Search query
 * @returns {Array} Filtered transporters
 */
export const searchTransporters = (transporters, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) {
    return transporters;
  }

  const searchLower = searchTerm.toLowerCase().trim();
  const searchWords = searchLower.split(/\s+/);

  return transporters.filter(transporter => {
    const searchableText = [
      transporter.transport_name || '',
      transporter.city_name || '',
      transporter.cities?.city_name || '',
      transporter.cities?.city_code || '',
      transporter.address || '',
      transporter.gst_number || '',
      transporter.mob_number || '',
      transporter.branch_owner_name || '',
      transporter.website || ''
    ].join(' ').toLowerCase();

    // Match all search words
    return searchWords.every(word => searchableText.includes(word));
  });
};

/**
 * Filter transporters by city
 * @param {Array} transporters - List of transporter objects
 * @param {string} cityId - City ID to filter by
 * @returns {Array} Filtered transporters
 */
export const filterByCity = (transporters, cityId) => {
  if (!cityId) {
    return transporters;
  }

  return transporters.filter(transporter => transporter.city_id === cityId);
};

/**
 * Get unique cities from transporters list
 * @param {Array} transporters - List of transporter objects
 * @returns {Array} Unique cities with counts
 */
export const getCitiesWithCounts = (transporters) => {
  const cityCounts = {};
  
  transporters.forEach(transporter => {
    const cityId = transporter.city_id;
    const cityName = transporter.cities?.city_name || transporter.city_name;
    const cityCode = transporter.cities?.city_code || '';
    
    if (cityId) {
      if (!cityCounts[cityId]) {
        cityCounts[cityId] = {
          id: cityId,
          name: cityName,
          code: cityCode,
          count: 0
        };
      }
      cityCounts[cityId].count++;
    }
  });

  return Object.values(cityCounts).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
};

/**
 * Generate search suggestions based on input
 * @param {Array} transporters - List of transporter objects
 * @param {string} input - Current input value
 * @returns {Array} Search suggestions
 */
export const generateSearchSuggestions = (transporters, input) => {
  if (!input || input.length < 2) {
    return [];
  }

  const inputLower = input.toLowerCase();
  const suggestions = new Set();

  transporters.forEach(transporter => {
    // Transport name suggestions
    if (transporter.transport_name?.toLowerCase().includes(inputLower)) {
      suggestions.add(transporter.transport_name);
    }

    // City name suggestions
    const cityName = transporter.cities?.city_name || transporter.city_name;
    if (cityName?.toLowerCase().includes(inputLower)) {
      suggestions.add(cityName);
    }

    // City code suggestions
    const cityCode = transporter.cities?.city_code || '';
    if (cityCode?.toLowerCase().includes(inputLower)) {
      suggestions.add(`${cityName} (${cityCode})`);
    }

    // Owner name suggestions
    if (transporter.branch_owner_name?.toLowerCase().includes(inputLower)) {
      suggestions.add(transporter.branch_owner_name);
    }

    // GST number suggestions
    if (transporter.gst_number?.toLowerCase().includes(inputLower)) {
      suggestions.add(transporter.gst_number);
    }
  });

  return Array.from(suggestions).slice(0, 10);
};

/**
 * Sort transporters by different criteria
 * @param {Array} transporters - List of transporter objects
 * @param {string} sortBy - Sort criterion
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Array} Sorted transporters
 */
export const sortTransporters = (transporters, sortBy = 'name', sortOrder = 'asc') => {
  const sorted = [...transporters].sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case 'name':
        compareA = a.transport_name?.toLowerCase() || '';
        compareB = b.transport_name?.toLowerCase() || '';
        break;
      case 'city':
        compareA = (a.cities?.city_name || a.city_name || '').toLowerCase();
        compareB = (b.cities?.city_name || b.city_name || '').toLowerCase();
        break;
      case 'owner':
        compareA = a.branch_owner_name?.toLowerCase() || '';
        compareB = b.branch_owner_name?.toLowerCase() || '';
        break;
      default:
        compareA = a.transport_name?.toLowerCase() || '';
        compareB = b.transport_name?.toLowerCase() || '';
    }

    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

/**
 * Validate GST number format
 * @param {string} gstNumber - GST number to validate
 * @returns {boolean} Is valid GST number
 */
export const isValidGST = (gstNumber) => {
  if (!gstNumber) return true; // Optional field
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstNumber);
};

/**
 * Validate mobile number format
 * @param {string} mobileNumber - Mobile number to validate
 * @returns {boolean} Is valid mobile number
 */
export const isValidMobile = (mobileNumber) => {
  if (!mobileNumber) return true; // Optional field
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobileNumber.replace(/\s+/g, ''));
};

/**
 * Format mobile number for display
 * @param {string} mobileNumber - Mobile number to format
 * @returns {string} Formatted mobile number
 */
export const formatMobile = (mobileNumber) => {
  if (!mobileNumber) return '';
  const cleaned = mobileNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return mobileNumber;
};

/**
 * Export transporters to CSV format
 * @param {Array} transporters - List of transporter objects
 * @returns {string} CSV content
 */
export const exportToCSV = (transporters) => {
  const headers = [
    'Transport Name',
    'City Name',
    'City Code',
    'Address',
    'GST Number',
    'Mobile Number',
    'Branch Owner',
    'Website'
  ];

  const rows = transporters.map(t => [
    t.transport_name || '',
    t.cities?.city_name || t.city_name || '',
    t.cities?.city_code || '',
    t.address || '',
    t.gst_number || '',
    t.mob_number || '',
    t.branch_owner_name || '',
    t.website || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};
