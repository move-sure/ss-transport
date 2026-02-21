// Service functions for Kaat Bill operations
import supabase from '../../app/utils/supabase';

/**
 * Load hub rates for a specific city
 */
export const loadHubRatesForCity = async (selectedCityId) => {
  try {
    // Check cache first
    const cacheKey = `city_hub_rates_${selectedCityId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use cache if less than 10 minutes old
      if (Date.now() - timestamp < 10 * 60 * 1000) {
        console.log('📦 Using cached city hub rates');
        return { rates: data, error: null };
      }
    }

    // Get rates with necessary fields including per-bilty charges
    const { data: rates, error: fetchError } = await supabase
      .from('transport_hub_rates')
      .select('id, transport_id, transport_name, destination_city_id, rate_per_kg, rate_per_pkg, min_charge, pricing_mode, is_active, bilty_chrg, ewb_chrg, labour_chrg, other_chrg')
      .eq('destination_city_id', selectedCityId)
      .eq('is_active', true)
      .order('transport_name')
      .limit(100);

    if (fetchError) throw fetchError;

    // Get unique transport IDs
    const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];

    // Fetch transport details only if needed
    let transportsRes = { data: [] };
    if (transportIds.length > 0) {
      transportsRes = await supabase
        .from('transports')
        .select('id, transport_name, city_id')
        .in('id', transportIds)
        .limit(100);
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

    // Cache the results
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: enrichedRates,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to cache city hub rates:', e);
    }

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
    const upsertData = filteredTransits.map(transit => {
      const bilty = transit.bilty;
      const station = transit.station;
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseInt(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const rateKg = parseFloat(selectedRate.rate_per_kg || 0);
      const ratePkg = parseFloat(selectedRate.rate_per_pkg || 0);
      const rateType = selectedRate.pricing_mode || 'per_kg';

      // Apply 50kg minimum weight rule
      const effectiveWeight = Math.max(weight, 50);

      // Calculate kaat amount
      let kaatAmount = 0;
      if (rateType === 'per_kg') {
        kaatAmount = effectiveWeight * rateKg;
      } else if (rateType === 'per_pkg') {
        kaatAmount = packages * ratePkg;
      } else if (rateType === 'hybrid') {
        kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
      }

      // Add per-bilty charges to total kaat
      const biltyChrg = parseFloat(selectedRate.bilty_chrg || 0);
      const ewbChrg = parseFloat(selectedRate.ewb_chrg || 0);
      const labourChrg = parseFloat(selectedRate.labour_chrg || 0);
      const otherChrg = parseFloat(selectedRate.other_chrg || 0);
      kaatAmount += biltyChrg + ewbChrg + labourChrg + otherChrg;

      // Calculate actual_kaat_rate (effective rate considering 50kg minimum)
      let actualKaatRate = rateKg;
      if (rateType === 'per_kg' && weight > 0 && weight < 50) {
        actualKaatRate = (effectiveWeight * rateKg) / weight;
      }

      // PF = total kaat amount (the deduction amount)
      const pf = kaatAmount;

      return {
        gr_no: transit.gr_no,
        challan_no: selectedChallan.challan_no,
        destination_city_id: selectedCityId,
        transport_hub_rate_id: selectedRate.id,
        rate_type: rateType,
        rate_per_kg: selectedRate.rate_per_kg || 0,
        rate_per_pkg: selectedRate.rate_per_pkg || 0,
        kaat: parseFloat(kaatAmount.toFixed(4)),
        pf: parseFloat(pf.toFixed(4)),
        actual_kaat_rate: parseFloat(actualKaatRate.toFixed(4)),
        bilty_chrg: parseFloat(selectedRate.bilty_chrg || 0),
        ewb_chrg: parseFloat(selectedRate.ewb_chrg || 0),
        labour_chrg: parseFloat(selectedRate.labour_chrg || 0),
        other_chrg: parseFloat(selectedRate.other_chrg || 0),
        created_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };
    });

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
 * NOTE: Minimum weight for per_kg calculation is 50kg
 */
export const calculateTotalKaatAmount = async (biltiesWithKaat) => {
  try {
    const grNumbers = biltiesWithKaat.map(t => t.gr_no);
    
    // Fetch kaat data including per-bilty charges
    const { data: kaatData, error: kaatError } = await supabase
      .from('bilty_wise_kaat')
      .select('gr_no, rate_per_kg, rate_per_pkg, rate_type, transport_hub_rate_id, bilty_chrg, ewb_chrg, labour_chrg, other_chrg')
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
      const transit = biltiesWithKaat.find(t => t.gr_no === kaat.gr_no);
      const bilty = transit?.bilty;
      const station = transit?.station;
      
      if (bilty || station) {
        const actualWeight = parseFloat(bilty?.wt || station?.weight || 0);
        const packages = parseInt(bilty?.no_of_pkg || station?.no_of_packets || 0);
        const rateKg = parseFloat(kaat.rate_per_kg || 0);
        const ratePkg = parseFloat(kaat.rate_per_pkg || 0);
        const minCharge = parseFloat(hubRatesData[kaat.transport_hub_rate_id] || 0);
        const rateType = kaat.rate_type || 'per_kg';
        
        // Apply 50kg minimum for per_kg calculations
        const effectiveWeight = Math.max(actualWeight, 50);
        
        let calculatedAmount = 0;
        if (rateType === 'per_kg') {
          calculatedAmount = effectiveWeight * rateKg;
        } else if (rateType === 'per_pkg') {
          calculatedAmount = packages * ratePkg;
        } else if (rateType === 'hybrid') {
          calculatedAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
        }
        
        calculatedAmount = Math.max(calculatedAmount, minCharge);

        // Add per-bilty charges to total kaat
        const biltyChrg = parseFloat(kaat.bilty_chrg || 0);
        const ewbChrg = parseFloat(kaat.ewb_chrg || 0);
        const labourChrg = parseFloat(kaat.labour_chrg || 0);
        const otherChrg = parseFloat(kaat.other_chrg || 0);
        calculatedAmount += biltyChrg + ewbChrg + labourChrg + otherChrg;
        
        // Calculate actual_kaat_rate (effective rate considering 50kg minimum)
        let actualKaatRate = rateKg;
        if (rateType === 'per_kg' && actualWeight > 0 && actualWeight < 50) {
          actualKaatRate = (effectiveWeight * rateKg) / actualWeight;
        }

        // Calculate PF
        const paymentMode = bilty?.payment_mode || station?.payment_status;
        const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
        const totalAmount = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
        const pf = totalAmount - calculatedAmount;
        
        totalKaatAmount += calculatedAmount;
        
        kaatDetails.push({
          gr_no: kaat.gr_no,
          weight: actualWeight,
          effectiveWeight,
          packages,
          rateKg,
          ratePkg,
          minCharge,
          rateType,
          kaatAmount: calculatedAmount,
          pf: pf,
          actual_kaat_rate: actualKaatRate
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
 * Always returns transport details from the FIRST bilty in the list
 * Fetches from multiple sources: bilty table, kaat rates, or transports table
 */
export const getTransportDetailsFromBilties = async (biltiesWithKaat) => {
  // Get first bilty or station data
  const firstItem = biltiesWithKaat[0];
  const firstBilty = firstItem?.bilty;
  const firstGrNo = firstItem?.gr_no;
  
  let transportName = firstBilty?.transport_name || null;
  let transportGst = firstBilty?.transport_gst || null;

  console.log('🔍 Step 1 - Checking bilty table:', { transportName, transportGst });

  // If not found in bilty, try to get from bilty_wise_kaat -> transport_hub_rates -> transports
  if (!transportName || transportName === 'N/A' || !transportGst) {
    console.log('🔍 Step 2 - Fetching from bilty_wise_kaat and transport_hub_rates...');
    
    try {
      // Get kaat data for first GR number
      const { data: kaatData, error: kaatError } = await supabase
        .from('bilty_wise_kaat')
        .select('transport_hub_rate_id')
        .eq('gr_no', firstGrNo)
        .single();

      if (!kaatError && kaatData?.transport_hub_rate_id) {
        // Get transport details from hub rates
        const { data: hubRateData, error: hubError } = await supabase
          .from('transport_hub_rates')
          .select('transport_id, transport_name')
          .eq('id', kaatData.transport_hub_rate_id)
          .single();

        if (!hubError && hubRateData) {
          transportName = hubRateData.transport_name;
          console.log('✅ Found transport from hub rates:', transportName);

          // If we have transport_id, get full details from transports table
          if (hubRateData.transport_id) {
            const { data: transportData, error: transportError } = await supabase
              .from('transports')
              .select('transport_name, gst_number')
              .eq('id', hubRateData.transport_id)
              .single();

            if (!transportError && transportData) {
              transportName = transportData.transport_name;
              transportGst = transportData.gst_number;
              console.log('✅ Found complete transport from transports table:', { transportName, transportGst });
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Error fetching transport from kaat/hub rates:', err);
    }
  }

  // If still not found, try looking up by GST in transports table
  if (transportGst && (!transportName || transportName === 'N/A')) {
    console.log('🔍 Step 3 - Looking up transport by GST...');
    
    try {
      const { data: transportData, error: transportError } = await supabase
        .from('transports')
        .select('transport_name, gst_number, mob_number')
        .ilike('gst_number', transportGst)
        .single();

      if (!transportError && transportData) {
        transportName = transportData.transport_name;
        console.log('✅ Found transport by GST lookup:', transportName);
      }
    } catch (err) {
      console.warn('⚠️ Error looking up transport by GST:', err);
    }
  }

  const finalName = transportName || 'Unknown Transport';
  const finalGst = transportGst || null;

  console.log('🚚 Final transport details:', { transportName: finalName, transportGst: finalGst });

  return { transportName: finalName, transportGst: finalGst };
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

/**
 * Auto apply kaat rates to all bilties based on their destination city
 * This function finds the matching kaat rate for each bilty and applies it automatically
 */
export const autoApplyKaatToAllBilties = async (transitDetails, selectedChallan, cities) => {
  try {
    console.log('🚀 Starting auto-apply kaat for', transitDetails.length, 'bilties...');
    
    // Get all unique destination city IDs from bilties
    const cityIdsFromBilties = new Set();
    const cityCodesFromStations = new Set();
    
    transitDetails.forEach(transit => {
      if (transit.bilty?.to_city_id) {
        cityIdsFromBilties.add(transit.bilty.to_city_id);
      }
      if (transit.station?.station) {
        cityCodesFromStations.add(transit.station.station);
      }
    });
    
    // Convert station codes to city IDs
    cityCodesFromStations.forEach(code => {
      const city = cities?.find(c => c.city_code === code);
      if (city?.id) {
        cityIdsFromBilties.add(city.id);
      }
    });
    
    const allCityIds = Array.from(cityIdsFromBilties);
    console.log('📍 Found', allCityIds.length, 'unique destination cities');
    
    if (allCityIds.length === 0) {
      return { success: false, applied: 0, skipped: 0, error: new Error('No destination cities found in bilties') };
    }
    
    // Fetch all kaat rates for these cities
    const { data: allRates, error: ratesError } = await supabase
      .from('transport_hub_rates')
      .select('id, transport_id, transport_name, destination_city_id, rate_per_kg, rate_per_pkg, min_charge, pricing_mode, is_active, bilty_chrg, ewb_chrg, labour_chrg, other_chrg')
      .in('destination_city_id', allCityIds)
      .eq('is_active', true);
    
    if (ratesError) throw ratesError;
    
    console.log('📊 Fetched', allRates?.length || 0, 'kaat rates for cities');
    
    if (!allRates || allRates.length === 0) {
      return { success: false, applied: 0, skipped: 0, error: new Error('No kaat rates found for the destination cities. Please add kaat rates first.') };
    }
    
    // Group rates by destination city
    const ratesByCity = {};
    allRates.forEach(rate => {
      if (!ratesByCity[rate.destination_city_id]) {
        ratesByCity[rate.destination_city_id] = [];
      }
      ratesByCity[rate.destination_city_id].push(rate);
    });
    
    // Get user session
    let userId = null;
    if (typeof window !== 'undefined') {
      const userSession = localStorage.getItem('userSession');
      if (userSession) {
        const session = JSON.parse(userSession);
        userId = session.user?.id || null;
      }
    }
    
    // Prepare upsert data for each bilty
    const upsertData = [];
    let skipped = 0;
    
    transitDetails.forEach(transit => {
      let destinationCityId = null;
      
      // Get destination city from bilty or station
      if (transit.bilty?.to_city_id) {
        destinationCityId = transit.bilty.to_city_id;
      } else if (transit.station?.station) {
        const city = cities?.find(c => c.city_code === transit.station.station);
        destinationCityId = city?.id;
      }
      
      if (!destinationCityId) {
        skipped++;
        return;
      }
      
      // Find rates for this city
      const cityRates = ratesByCity[destinationCityId];
      if (!cityRates || cityRates.length === 0) {
        skipped++;
        return;
      }
      
      // Try to find matching rate by transport name if available
      let selectedRate = null;
      const biltyTransportName = transit.bilty?.transport_name?.toLowerCase().trim();
      
      if (biltyTransportName) {
        // Try to match transport name
        selectedRate = cityRates.find(rate => {
          const rateTxnName = (rate.transport_name || '').toLowerCase().trim();
          return rateTxnName.includes(biltyTransportName) || biltyTransportName.includes(rateTxnName);
        });
      }
      
      // If no match by transport name, use the first available rate for this city
      if (!selectedRate) {
        selectedRate = cityRates[0];
      }

      // Calculate kaat, pf, actual_kaat_rate with 50kg minimum weight rule
      const bilty = transit.bilty;
      const station = transit.station;
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseInt(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const rateKg = parseFloat(selectedRate.rate_per_kg || 0);
      const ratePkg = parseFloat(selectedRate.rate_per_pkg || 0);
      const rateType = selectedRate.pricing_mode || 'per_kg';

      // Apply 50kg minimum weight rule
      const effectiveWeight = Math.max(weight, 50);

      let kaatAmount = 0;
      if (rateType === 'per_kg') {
        kaatAmount = effectiveWeight * rateKg;
      } else if (rateType === 'per_pkg') {
        kaatAmount = packages * ratePkg;
      } else if (rateType === 'hybrid') {
        kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
      }

      // Add per-bilty charges to total kaat
      const biltyChrg = parseFloat(selectedRate.bilty_chrg || 0);
      const ewbChrg = parseFloat(selectedRate.ewb_chrg || 0);
      const labourChrg = parseFloat(selectedRate.labour_chrg || 0);
      const otherChrg = parseFloat(selectedRate.other_chrg || 0);
      kaatAmount += biltyChrg + ewbChrg + labourChrg + otherChrg;

      // Calculate actual_kaat_rate
      let actualKaatRate = rateKg;
      if (rateType === 'per_kg' && weight > 0 && weight < 50) {
        actualKaatRate = (effectiveWeight * rateKg) / weight;
      }

      // PF = total kaat amount (the deduction amount)
      const pf = kaatAmount;
      
      upsertData.push({
        gr_no: transit.gr_no,
        challan_no: selectedChallan.challan_no,
        destination_city_id: destinationCityId,
        transport_hub_rate_id: selectedRate.id,
        rate_type: rateType,
        rate_per_kg: selectedRate.rate_per_kg || 0,
        rate_per_pkg: selectedRate.rate_per_pkg || 0,
        kaat: parseFloat(kaatAmount.toFixed(4)),
        pf: parseFloat(pf.toFixed(4)),
        actual_kaat_rate: parseFloat(actualKaatRate.toFixed(4)),
        bilty_chrg: parseFloat(selectedRate.bilty_chrg || 0),
        ewb_chrg: parseFloat(selectedRate.ewb_chrg || 0),
        labour_chrg: parseFloat(selectedRate.labour_chrg || 0),
        other_chrg: parseFloat(selectedRate.other_chrg || 0),
        created_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });
    });
    
    console.log('📝 Prepared', upsertData.length, 'bilties for kaat, skipped', skipped);
    
    if (upsertData.length === 0) {
      return { success: false, applied: 0, skipped, error: new Error('No bilties could be matched with kaat rates') };
    }
    
    // Bulk upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < upsertData.length; i += batchSize) {
      const batch = upsertData.slice(i, i + batchSize);
      const { error } = await supabase
        .from('bilty_wise_kaat')
        .upsert(batch, { 
          onConflict: 'gr_no',
          ignoreDuplicates: false 
        });
      
      if (error) throw error;
    }
    
    // Trigger custom event to refresh kaat data
    window.dispatchEvent(new CustomEvent('kaatDataUpdated'));
    
    console.log('✅ Auto-apply kaat completed:', upsertData.length, 'applied,', skipped, 'skipped');
    
    return { success: true, applied: upsertData.length, skipped, error: null };
  } catch (err) {
    console.error('❌ Error auto-applying kaat:', err);
    return { success: false, applied: 0, skipped: 0, error: err };
  }
};

