// Helper functions for finance bilty table calculations and utilities

/**
 * Get city name by ID
 */
export const getCityNameById = (cityId, cities) => {
  const city = cities?.find(c => c.id === cityId);
  return city?.city_name || 'Unknown';
};

/**
 * Get city name by code (for station bilties)
 */
export const getCityNameByCode = (code, cities) => {
  const city = cities?.find(c => c.city_code === code);
  return city?.city_name || code || 'Unknown';
};

/**
 * Get city ID by code
 */
export const getCityIdByCode = (code, cities) => {
  const city = cities?.find(c => c.city_code === code);
  return city?.id || null;
};

/**
 * Calculate financial summary from filtered transits
 */
export const calculateFinancialSummary = (filteredTransits) => {
  let totalAmount = 0;
  let totalFreight = 0;
  let totalPackages = 0;
  let totalWeight = 0;
  let paidCount = 0;
  let toBillCount = 0;
  let toPaidCount = 0;
  let totalLabour = 0;
  let totalOtherCharges = 0;

  filteredTransits.forEach(transit => {
    const bilty = transit.bilty;
    const station = transit.station;

    if (bilty) {
      totalAmount += parseFloat(bilty.total || 0);
      totalFreight += parseFloat(bilty.freight_amount || 0);
      totalPackages += parseInt(bilty.no_of_pkg || 0);
      totalWeight += parseFloat(bilty.wt || 0);
      totalLabour += parseFloat(bilty.labour_charge || 0);
      totalOtherCharges += parseFloat(bilty.other_charge || 0) + 
                          parseFloat(bilty.toll_charge || 0) + 
                          parseFloat(bilty.dd_charge || 0) + 
                          parseFloat(bilty.bill_charge || 0);
      
      if (bilty.payment_mode?.toLowerCase() === 'paid') paidCount++;
      else if (bilty.payment_mode?.toLowerCase() === 'to-pay') toBillCount++;
      else if (bilty.payment_mode?.toLowerCase() === 'foc') toPaidCount++;
    }

    if (station) {
      totalAmount += parseFloat(station.amount || 0);
      totalPackages += parseInt(station.no_of_packets || 0);
      totalWeight += parseFloat(station.weight || 0);
      
      if (station.payment_status?.toLowerCase() === 'paid') paidCount++;
      else if (station.payment_status?.toLowerCase() === 'to-pay') toBillCount++;
      else if (station.payment_status?.toLowerCase() === 'foc') toPaidCount++;
    }
  });

  return {
    totalAmount,
    totalFreight,
    totalPackages,
    totalWeight,
    paidCount,
    toBillCount,
    toPaidCount,
    totalLabour,
    totalOtherCharges
  };
};

/**
 * Get unique cities from transit list
 */
export const getUniqueCities = (challanTransits, cities) => {
  const citySet = new Set();
  challanTransits.forEach(t => {
    if (t.bilty?.to_city_id) {
      citySet.add(t.bilty.to_city_id);
    }
  });
  return Array.from(citySet).map(cityId => {
    const city = cities?.find(c => c.id === cityId);
    return { id: cityId, name: city?.city_name || 'Unknown' };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Apply payment mode filter
 */
export const applyPaymentModeFilter = (transits, filterPaymentMode) => {
  if (filterPaymentMode === 'all') return transits;
  
  return transits.filter(t => {
    const mode = (t.bilty?.payment_mode || t.station?.payment_status)?.toLowerCase();
    return mode === filterPaymentMode;
  });
};

/**
 * Apply transport filter
 */
export const applyTransportFilter = (transits, selectedTransports, availableTransports, cities) => {
  if (selectedTransports.length === 0) {
    return transits;
  }

  return transits.filter(t => {
    const bilty = t.bilty;
    const station = t.station;

    // For regular bilties — match transport_name/transport_gst directly
    if (bilty?.transport_name) {
      const biltyGst = bilty.transport_gst?.trim() || null;
      const biltyName = bilty.transport_name.toLowerCase().trim();

      return selectedTransports.some(sel => {
        // Match by GST if both have it
        if (sel.gst && biltyGst) {
          return sel.gst === biltyGst;
        }
        // Match by name (case-insensitive)
        return sel.name.toLowerCase().trim() === biltyName;
      });
    }

    // For station bilties — match via destination city transports from DB
    if (station?.station) {
      const city = cities?.find(c => c.city_code === station.station);
      const destinationCityId = city?.id;
      if (!destinationCityId) return false;

      // Get transports available for this city (station-sourced from DB)
      const cityTransports = (availableTransports || []).filter(at => at.city_id === destinationCityId);

      return cityTransports.some(cityTransport => {
        return selectedTransports.some(sel => {
          if (sel.gst && cityTransport.gst_number) {
            return cityTransport.gst_number.trim() === sel.gst;
          }
          if (!sel.gst && !cityTransport.gst_number) {
            return cityTransport.transport_name.toLowerCase().trim() === sel.name.toLowerCase().trim();
          }
          return false;
        });
      });
    }

    return false;
  });
};

/**
 * Apply city filter
 */
export const applyCityFilter = (transits, selectedCityId) => {
  if (!selectedCityId) return transits;
  
  return transits.filter(t => {
    if (t.bilty) {
      return t.bilty.to_city_id === selectedCityId;
    }
    return false;
  });
};

/**
 * Calculate other charges for a bilty
 */
export const calculateOtherCharges = (bilty) => {
  if (!bilty) return 0;
  
  return parseFloat(bilty.other_charge || 0) + 
         parseFloat(bilty.toll_charge || 0) + 
         parseFloat(bilty.dd_charge || 0) + 
         parseFloat(bilty.bill_charge || 0);
};

/**
 * Get payment mode badge class
 */
export const getPaymentModeBadgeClass = (paymentMode) => {
  const mode = paymentMode?.toLowerCase();
  
  if (mode === 'paid') {
    return 'bg-green-100 text-green-800';
  } else if (mode === 'to-pay') {
    return 'bg-orange-100 text-orange-800';
  } else if (mode === 'foc') {
    return 'bg-blue-100 text-blue-800';
  } else {
    return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toLocaleString();
};

/**
 * Format weight for display
 */
export const formatWeight = (weight) => {
  return parseFloat(weight || 0).toFixed(2);
};
