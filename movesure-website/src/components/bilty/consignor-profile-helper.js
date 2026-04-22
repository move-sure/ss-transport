'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * CONSIGNOR BILTY PROFILE HELPER
 * 
 * This component handles fetching and applying consignor-specific rates and charges
 * from the consignor_bilty_profile table.
 * 
 * Rate System Priority:
 * 1. Consignor Profile Rate (from consignor_bilty_profile table)
 * 2. Default City Rate (from rates table - only default rates, no consignor-specific)
 * 
 * Labour Rate Priority:
 * 1. Consignor Profile Labour Rate (from consignor_bilty_profile)
 * 2. Default: KANPUR = ₹10/pkg, Other cities = ₹20/pkg
 * 
 * Door Delivery (DD) Charges:
 * - Applied from consignor_bilty_profile.dd_print_charge_per_nag or dd_print_charge_per_kg
 * - Added to other_charge field
 * 
 * Minimum Freight Logic:
 * - If calculated freight < freight_minimum_amount, use freight_minimum_amount
 */

// Default labour rates by city
export const DEFAULT_LABOUR_RATES = {
  KANPUR: 10,
  DEFAULT: 20
};

// Default minimum weight when no consignor profile is set
export const DEFAULT_MINIMUM_WEIGHT = 50; // kg

/**
 * Hook to fetch consignor bilty profile
 * @param {string} consignorId - UUID of the consignor
 * @param {string} destinationCityId - UUID of the destination city
 * @returns {Object} - { profile, loading, error }
 */
export const useConsignorBiltyProfile = (consignorId, destinationCityId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Reset if no consignor or city
      if (!consignorId || !destinationCityId) {
        setProfile(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching consignor bilty profile:', { consignorId, destinationCityId });

        const { data, error: fetchError } = await supabase
          .from('consignor_bilty_profile')
          .select('*')
          .eq('consignor_id', consignorId)
          .eq('destination_station_id', destinationCityId)
          .eq('is_active', true)
          .lte('effective_from', new Date().toISOString().split('T')[0])
          .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString().split('T')[0]}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No profile found - not an error
            console.log('📋 No consignor profile found, will use defaults');
            setProfile(null);
          } else {
            throw fetchError;
          }
        } else if (data) {
          console.log('✅ Found consignor bilty profile:', data);
          setProfile(data);
        }
      } catch (err) {
        console.error('❌ Error fetching consignor profile:', err);
        setError(err.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [consignorId, destinationCityId]);

  return { profile, loading, error };
};

/**
 * Fetch consignor bilty profile by consignor name and city ID
 * @param {string} consignorName - Name of the consignor
 * @param {string} destinationCityId - UUID of the destination city
 * @returns {Object} - { profile, loading, error, consignorId }
 */
export const useConsignorBiltyProfileByName = (consignorName, destinationCityId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consignorId, setConsignorId] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Reset if no consignor name or city
      if (!consignorName || !destinationCityId) {
        setProfile(null);
        setConsignorId(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Looking up consignor by name:', consignorName);

        // First, find the consignor ID
        const { data: consignorData, error: consignorError } = await supabase
          .from('consignors')
          .select('id, company_name')
          .ilike('company_name', consignorName.trim())
          .single();

        if (consignorError) {
          if (consignorError.code === 'PGRST116') {
            console.log('📋 Consignor not found in database');
            setProfile(null);
            setConsignorId(null);
            setLoading(false);
            return;
          }
          throw consignorError;
        }

        if (!consignorData) {
          setProfile(null);
          setConsignorId(null);
          setLoading(false);
          return;
        }

        setConsignorId(consignorData.id);
        console.log('✅ Found consignor:', consignorData.company_name, 'ID:', consignorData.id);

        // Now fetch the profile
        const { data: profileData, error: profileError } = await supabase
          .from('consignor_bilty_profile')
          .select('*')
          .eq('consignor_id', consignorData.id)
          .eq('destination_station_id', destinationCityId)
          .eq('is_active', true)
          .lte('effective_from', new Date().toISOString().split('T')[0])
          .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString().split('T')[0]}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            console.log('📋 No consignor profile found for this city, will use defaults');
            setProfile(null);
          } else {
            throw profileError;
          }
        } else if (profileData) {
          console.log('✅ Found consignor bilty profile:', profileData);
          setProfile(profileData);
        }
      } catch (err) {
        console.error('❌ Error fetching consignor profile:', err);
        setError(err.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [consignorName, destinationCityId]);

  return { profile, loading, error, consignorId };
};

/**
 * Get effective weight with minimum weight logic
 * @param {number} actualWeight - Actual weight in kg
 * @param {number} minimumWeight - Minimum weight in kg (from profile or default)
 * @returns {Object} - { effectiveWeight, isMinimumApplied, actualWeight }
 */
export const getEffectiveWeight = (actualWeight, minimumWeight = DEFAULT_MINIMUM_WEIGHT) => {
  const weight = parseFloat(actualWeight) || 0;
  const minWeight = parseFloat(minimumWeight) || DEFAULT_MINIMUM_WEIGHT;
  
  const isMinimumApplied = weight < minWeight;
  const effectiveWeight = isMinimumApplied ? minWeight : weight;
  
  console.log('⚖️ Weight calculation:', {
    actualWeight: weight,
    minimumWeight: minWeight,
    effectiveWeight,
    isMinimumApplied
  });
  
  return {
    effectiveWeight,
    isMinimumApplied,
    actualWeight: weight,
    minimumWeight: minWeight
  };
};

/**
 * Calculate freight amount with minimum freight logic
 * @param {number} weight - Weight in kg
 * @param {number} packages - Number of packages
 * @param {number} rate - Rate per unit
 * @param {string} rateUnit - 'PER_KG' or 'PER_NAG'
 * @param {number} minimumFreight - Minimum freight amount
 * @returns {Object} - { freightAmount, effectiveRate, isMinimumApplied }
 */
export const calculateFreightWithMinimum = (weight, packages, rate, rateUnit = 'PER_KG', minimumFreight = 0) => {
  let calculatedFreight = 0;
  
  if (rateUnit === 'PER_KG') {
    calculatedFreight = (weight || 0) * (rate || 0);
  } else if (rateUnit === 'PER_NAG') {
    calculatedFreight = (packages || 0) * (rate || 0);
  }

  const isMinimumApplied = minimumFreight > 0 && calculatedFreight < minimumFreight;
  const freightAmount = isMinimumApplied ? minimumFreight : calculatedFreight;
  
  // Calculate effective rate for display
  let effectiveRate = rate;
  if (isMinimumApplied && weight > 0) {
    effectiveRate = minimumFreight / weight;
  }

  return {
    freightAmount: Math.round(freightAmount * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    isMinimumApplied,
    calculatedFreight: Math.round(calculatedFreight * 100) / 100
  };
};

/**
 * Calculate labour charge based on unit
 * @param {number} packages - Number of packages
 * @param {number} weight - Weight in kg
 * @param {number} labourRate - Labour rate
 * @param {string} labourUnit - 'PER_KG', 'PER_NAG', or 'PER_BILTY'
 * @returns {number} - Labour charge amount
 */
export const calculateLabourCharge = (packages, weight, labourRate, labourUnit = 'PER_NAG') => {
  let labourCharge = 0;
  
  switch (labourUnit) {
    case 'PER_KG':
      labourCharge = (weight || 0) * (labourRate || 0);
      break;
    case 'PER_NAG':
      labourCharge = (packages || 0) * (labourRate || 0);
      break;
    case 'PER_BILTY':
      labourCharge = labourRate || 0;
      break;
    default:
      labourCharge = (packages || 0) * (labourRate || 0);
  }
  
  return Math.round(labourCharge * 100) / 100;
};

/**
 * Calculate DD (Door Delivery) charge
 * dd_charge = dd_charge_per_kg * weight OR dd_charge_per_nag * packages (whichever is filled)
 * dd_print (→ other_charge) = dd_print_charge_per_kg * weight OR dd_print_charge_per_nag * packages (whichever is filled)
 * NOTE: Receiving Slip charge is added to other_charge separately
 * @param {number} packages - Number of packages
 * @param {number} weight - Weight in kg
 * @param {Object} profile - Consignor bilty profile
 * @returns {{ ddCharge: number, ddPrintCharge: number }}
 */
export const calculateDDCharge = (packages, weight, profile) => {
  if (!profile) return { ddCharge: 0, ddPrintCharge: 0 };
  
  const pkg = parseInt(packages) || 0;
  const wt = parseFloat(weight) || 0;
  
  // DD charge (goes to dd_charge field): use per_kg if filled, else per_nag — NO minimum
  const ddPerKg = parseFloat(profile.dd_charge_per_kg) || 0;
  const ddPerNag = parseFloat(profile.dd_charge_per_nag) || 0;
  const ddCharge = ddPerKg > 0 ? (ddPerKg * wt) : (ddPerNag * pkg);
  
  // DD print charge (goes to other_charge field): use per_kg if filled, else per_nag — no minimum here
  // Minimum ₹150 is enforced on the combined (ddPrint + RS) total in charges.js
  const ddPrintPerKg = parseFloat(profile.dd_print_charge_per_kg) || 0;
  const ddPrintPerNag = parseFloat(profile.dd_print_charge_per_nag) || 0;
  const ddPrintCharge = ddPrintPerKg > 0 ? (ddPrintPerKg * wt) : (ddPrintPerNag * pkg);
  
  console.log('🚚 DD calculation:', {
    dd_charge_per_nag: profile.dd_charge_per_nag, dd_charge_per_kg: profile.dd_charge_per_kg,
    dd_print_per_nag: profile.dd_print_charge_per_nag, dd_print_per_kg: profile.dd_print_charge_per_kg,
    packages: pkg, weight: wt, ddCharge, ddPrintCharge
  });
  
  return {
    ddCharge: Math.round(ddCharge * 100) / 100,
    ddPrintCharge: Math.round(ddPrintCharge * 100) / 100
  };
};

/**
 * Get default labour rate based on city
 * @param {string} cityName - Name of the city
 * @param {string} cityCode - City code
 * @returns {number} - Default labour rate
 */
export const getDefaultLabourRate = (cityName, cityCode) => {
  const cityUpper = (cityName || '').toUpperCase();
  const codeUpper = (cityCode || '').toUpperCase();
  
  // Check if it's Kanpur
  if (cityUpper.includes('KANPUR') || codeUpper.includes('KNP') || codeUpper.includes('KANPUR')) {
    console.log('🏙️ Kanpur detected - using ₹10 labour rate');
    return DEFAULT_LABOUR_RATES.KANPUR;
  }
  
  console.log('🏙️ Using default ₹20 labour rate for:', cityName || cityCode);
  return DEFAULT_LABOUR_RATES.DEFAULT;
};

/**
 * Apply consignor profile to form data
 * @param {Object} profile - Consignor bilty profile
 * @param {Object} formData - Current form data
 * @param {Object} cityInfo - City information { cityName, cityCode }
 * @param {boolean} isDoorDelivery - Is door delivery selected
 * @returns {Object} - Updated form fields
 */
export const applyConsignorProfile = (profile, formData, cityInfo, isDoorDelivery = false) => {
  const updates = {};
  
  if (profile) {
    console.log('🔧 Applying consignor profile:', profile);
    
    // Rate
    if (profile.rate && profile.rate > 0) {
      updates.rate = parseFloat(profile.rate);
      updates._rate_unit = profile.rate_unit || 'PER_KG';
      updates._minimum_freight = parseFloat(profile.freight_minimum_amount) || 0;
      console.log('💰 Rate from profile:', updates.rate, profile.rate_unit);
    }
    
    // Labour rate
    if (profile.labour_rate !== undefined && profile.labour_rate !== null) {
      updates.labour_rate = parseFloat(profile.labour_rate);
      updates._labour_unit = profile.labour_unit || 'PER_NAG';
      console.log('👷 Labour rate from profile:', updates.labour_rate, profile.labour_unit);
    }
    
    // Bill charge (bilty_charge)
    if (profile.bilty_charge !== undefined && profile.bilty_charge !== null) {
      updates.bill_charge = parseFloat(profile.bilty_charge);
      console.log('📄 Bill charge from profile:', updates.bill_charge);
    }
    
    // Toll charge
    if (profile.is_toll_tax_applicable && profile.toll_tax_amount) {
      updates.toll_charge = parseFloat(profile.toll_tax_amount);
      console.log('🛣️ Toll charge from profile:', updates.toll_charge);
    } else if (profile.is_toll_tax_applicable === false) {
      updates.toll_charge = 0;
    }
    
    // Transport info
    if (profile.transport_name) {
      updates.transport_name = profile.transport_name;
    }
    if (profile.transport_gst) {
      updates.transport_gst = profile.transport_gst;
    }
    
    // DD Charge (dd_charge field) + DD Print (other_charge field) - only if door delivery
    if (isDoorDelivery) {
      const { ddCharge, ddPrintCharge } = calculateDDCharge(
        formData.no_of_pkg || 0,
        formData.wt || 0,
        profile
      );
      const receivingSlipCharge = parseFloat(profile.receiving_slip_charge) || 0;
      // ddCharge → dd_charge field
      if (ddCharge > 0) {
        updates.dd_charge = ddCharge;
        updates._dd_charge_applied = ddCharge;
      }
      // ddPrintCharge + receivingSlipCharge → other_charge field
      const totalOtherCharge = ddPrintCharge + receivingSlipCharge;
      if (totalOtherCharge > 0) {
        updates.other_charge = totalOtherCharge;
        updates._dd_print_applied = ddPrintCharge;
        updates._rs_charge_applied = receivingSlipCharge;
      }
      console.log('🚚 DD Charge applied:', { ddCharge, ddPrintCharge, receivingSlipCharge });
    }
    
    // Check is_no_charge flag
    if (profile.is_no_charge) {
      updates.bill_charge = 0;
      updates.toll_charge = 0;
      updates.other_charge = 0;
      updates._is_no_charge = true;
      console.log('🆓 No charge profile - zeroing charges');
    }
    
  } else {
    // No profile - use defaults based on city
    const defaultLabour = getDefaultLabourRate(cityInfo?.cityName, cityInfo?.cityCode);
    updates.labour_rate = defaultLabour;
    updates._minimum_weight = DEFAULT_MINIMUM_WEIGHT;
    updates._use_default_minimum_weight = true;
    console.log('📋 No profile - using default labour rate:', defaultLabour, 'and minimum weight:', DEFAULT_MINIMUM_WEIGHT, 'kg');
  }
  
  return updates;
};

/**
 * Component to display consignor profile info
 */
export const ConsignorProfileInfo = ({ 
  consignorName, 
  destinationCityId,
  cityName,
  cityCode,
  currentRate,
  currentLabourRate,
  onApplyProfile 
}) => {
  const { profile, loading, error } = useConsignorBiltyProfileByName(
    consignorName, 
    destinationCityId
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 text-xs font-medium animate-pulse">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span>🔍 प्रोफाइल खोज रहे हैं...</span>
      </div>
    );
  }

  if (!consignorName || !destinationCityId) {
    return null;
  }

  if (error) {
    return (
      <div className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs font-medium">
        ❌ प्रोफाइल लोड करने में त्रुटि
      </div>
    );
  }

  if (!profile) {
    const defaultLabour = getDefaultLabourRate(cityName, cityCode);
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 text-xs font-medium">
        <span>📋 कोई प्रोफाइल नहीं • डिफॉल्ट रेट: ₹{defaultLabour}/pkg • Min Wt: {DEFAULT_MINIMUM_WEIGHT} kg</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-300 text-xs">
      <div className="flex items-center gap-2 font-semibold text-green-700">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>✅ कंसाइनर प्रोफाइल मिला</span>
      </div>
      <div className="flex flex-wrap gap-2 text-green-800">
        {profile.rate > 0 && (
          <span className="bg-green-100 px-2 py-0.5 rounded">
            रेट: ₹{profile.rate}/{profile.rate_unit === 'PER_KG' ? 'kg' : 'nag'}
          </span>
        )}
        {profile.labour_rate > 0 && (
          <span className="bg-green-100 px-2 py-0.5 rounded">
            लेबर: ₹{profile.labour_rate}/{profile.labour_unit === 'PER_KG' ? 'kg' : profile.labour_unit === 'PER_NAG' ? 'pkg' : 'bilty'}
          </span>
        )}
        {profile.freight_minimum_amount > 0 && (
          <span className="bg-amber-100 px-2 py-0.5 rounded text-amber-800">
            Min: ₹{profile.freight_minimum_amount}
          </span>
        )}
        {profile.bilty_charge > 0 && (
          <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-800">
            बिल्टी: ₹{profile.bilty_charge}
          </span>
        )}
      </div>
    </div>
  );
};

export default {
  useConsignorBiltyProfile,
  useConsignorBiltyProfileByName,
  getEffectiveWeight,
  calculateFreightWithMinimum,
  calculateLabourCharge,
  calculateDDCharge,
  getDefaultLabourRate,
  applyConsignorProfile,
  ConsignorProfileInfo,
  DEFAULT_LABOUR_RATES,
  DEFAULT_MINIMUM_WEIGHT
};
