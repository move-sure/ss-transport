// Service functions for Kaat Bill operations
import supabase from '../../app/utils/supabase';

/**
 * Load hub rates for a specific city
 */
export const loadHubRatesForCity = async (selectedCityId) => {
  try {
    // Get all rates for selected city
    const { data: rates, error: fetchError } = await supabase
      .from('transport_hub_rates')
      .select('*')
      .eq('destination_city_id', selectedCityId)
      .eq('is_active', true)
      .order('transport_name');

    if (fetchError) throw fetchError;

    // Get unique transport IDs
    const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];

    // Fetch transport details
    let transportsRes = { data: [] };
    if (transportIds.length > 0) {
      transportsRes = await supabase
        .from('transports')
        .select('id, transport_name, city_id')
        .in('id', transportIds);
    }

    // Get unique city IDs from transports
    const cityIds = [...new Set((transportsRes.data || []).map(t => t.city_id).filter(Boolean))];

    // Fetch city details
    let citiesRes = { data: [] };
    if (cityIds.length > 0) {
      citiesRes = await supabase
        .from('cities')
        .select('id, city_name')
        .in('id', cityIds);
    }

    // Create city map
    const cityMap = {};
    (citiesRes.data || []).forEach(c => {
      cityMap[c.id] = c.city_name;
    });

    // Create transport map with city names
    const transportMap = {};
    (transportsRes.data || []).forEach(t => {
      transportMap[t.id] = {
        ...t,
        city_name: t.city_id ? cityMap[t.city_id] : null
      };
    });

    // Enrich rates with transport details
    const enrichedRates = rates.map(rate => ({
      ...rate,
      transport: rate.transport_id ? transportMap[rate.transport_id] : null
    }));

    return { rates: enrichedRates, error: null };
  } catch (err) {
    console.error('Error loading hub rates:', err);
    return { rates: [], error: err };
  }
};

/**
 * Apply hub rate to multiple bilties
 */
export const applyHubRateToMultipleBilties = async (filteredTransits, selectedChallan, selectedCityId, selectedRateId, hubRates) => {
  try {
    const selectedRate = hubRates.find(r => r.id === selectedRateId);
    if (!selectedRate) {
      throw new Error('Selected rate not found');
    }

    // Get user session
    let userId = null;
    if (typeof window !== 'undefined') {
      const userSession = localStorage.getItem('userSession');
      if (userSession) {
        const session = JSON.parse(userSession);
        userId = session.user?.id || null;
      }
    }

    // Prepare bulk upsert data
    const upsertData = filteredTransits.map(transit => ({
      gr_no: transit.gr_no,
      challan_no: selectedChallan.challan_no,
      destination_city_id: selectedCityId,
      transport_hub_rate_id: selectedRate.id,
      rate_type: selectedRate.pricing_mode,
      rate_per_kg: selectedRate.rate_per_kg || 0,
      rate_per_pkg: selectedRate.rate_per_pkg || 0,
      created_by: userId,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }));

    // Bulk upsert
    const { error } = await supabase
      .from('bilty_wise_kaat')
      .upsert(upsertData, { 
        onConflict: 'gr_no',
        ignoreDuplicates: false 
      });

    if (error) throw error;

    // Trigger a custom event to refresh kaat cells without page reload
    window.dispatchEvent(new CustomEvent('kaatDataUpdated'));

    return { success: true, count: filteredTransits.length, error: null };
  } catch (err) {
    console.error('Error applying hub rates:', err);
    return { success: false, count: 0, error: err };
  }
};

/**
 * Calculate total kaat amount for selected bilties
 */
export const calculateTotalKaatAmount = async (biltiesWithKaat) => {
  try {
    const grNumbers = biltiesWithKaat.map(t => t.gr_no);
    
    // Fetch kaat data
    const { data: kaatData, error: kaatError } = await supabase
      .from('bilty_wise_kaat')
      .select('gr_no, rate_per_kg, rate_per_pkg, transport_hub_rate_id')
      .in('gr_no', grNumbers);

    if (kaatError) throw kaatError;

    // Get unique transport_hub_rate_ids
    const hubRateIds = [...new Set(kaatData?.map(k => k.transport_hub_rate_id).filter(Boolean))];
    
    // Fetch hub rates separately
    let hubRatesData = {};
    if (hubRateIds.length > 0) {
      const { data: rates, error: ratesError } = await supabase
        .from('transport_hub_rates')
        .select('id, min_charge')
        .in('id', hubRateIds);
      
      if (!ratesError && rates) {
        rates.forEach(rate => {
          hubRatesData[rate.id] = rate.min_charge;
        });
      }
    }

    let totalKaatAmount = 0;
    const kaatDetails = [];

    kaatData?.forEach(kaat => {
      const bilty = biltiesWithKaat.find(t => t.gr_no === kaat.gr_no)?.bilty;
      if (bilty) {
        const weight = parseFloat(bilty.wt || 0);
        const packages = parseInt(bilty.no_of_pkg || 0);
        const rateKg = parseFloat(kaat.rate_per_kg || 0);
        const ratePkg = parseFloat(kaat.rate_per_pkg || 0);
        const minCharge = parseFloat(hubRatesData[kaat.transport_hub_rate_id] || 0);
        const calculatedAmount = Math.max((weight * rateKg) + (packages * ratePkg), minCharge);
        
        totalKaatAmount += calculatedAmount;
        
        kaatDetails.push({
          gr_no: kaat.gr_no,
          weight,
          packages,
          rateKg,
          ratePkg,
          minCharge,
          kaatAmount: calculatedAmount
        });
      }
    });

    return { totalKaatAmount, kaatDetails, error: null };
  } catch (err) {
    console.error('Error calculating kaat amount:', err);
    return { totalKaatAmount: 0, kaatDetails: [], error: err };
  }
};

/**
 * Get transport details from filtered bilties
 */
export const getTransportDetailsFromBilties = (biltiesWithKaat) => {
  const transportSet = new Set();
  const gstSet = new Set();
  
  biltiesWithKaat.forEach(t => {
    if (t.bilty?.transport_name) transportSet.add(t.bilty.transport_name);
    if (t.bilty?.transport_gst) gstSet.add(t.bilty.transport_gst);
  });

  const transportName = transportSet.size === 1 
    ? Array.from(transportSet)[0] 
    : 'Multiple Transports';
  const transportGst = gstSet.size === 1 
    ? Array.from(gstSet)[0] 
    : null;

  return { transportName, transportGst };
};

/**
 * Save kaat bill to database
 */
export const saveKaatBillToDatabase = async (kaatBillData) => {
  try {
    const { data, error } = await supabase
      .from('kaat_bill_master')
      .insert(kaatBillData)
      .select();

    if (error) throw error;

    return { success: true, data, error: null };
  } catch (err) {
    console.error('Error saving kaat bill:', err);
    return { success: false, data: null, error: err };
  }
};

/**
 * Get current user from localStorage or auth
 */
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return { id: null, username: 'Unknown' };
  
  try {
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
      const session = JSON.parse(userSession);
      return {
        id: session.user?.id || null,
        username: session.user?.username || session.user?.email || 'Unknown'
      };
    }
  } catch (err) {
    console.error('Error getting current user:', err);
  }
  
  return { id: null, username: 'Unknown' };
};
