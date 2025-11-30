'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import EwbValidationComponent from './ewb-validation-component';
import { formatEwbNumber } from '../../utils/ewbValidation';
import supabase from '../../app/utils/supabase';

export default function ValidationSection({ transitDetails, challanDetails, onValidationComplete }) {
  const [validationMap, setValidationMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Get all EWB numbers from transit details
  const allEwbNumbers = useMemo(() => {
    if (!transitDetails) return [];
    
    const ewbNumbers = [];
    transitDetails.forEach(transit => {
      if (transit.bilty?.e_way_bill) {
        const biltyEWBs = transit.bilty.e_way_bill.split(',').filter(e => e.trim());
        ewbNumbers.push(...biltyEWBs.map(e => e.trim()));
      }
      if (transit.station?.e_way_bill) {
        const stationEWBs = transit.station.e_way_bill.split(',').filter(e => e.trim());
        ewbNumbers.push(...stationEWBs.map(e => e.trim()));
      }
    });
    return [...new Set(ewbNumbers)];
  }, [transitDetails]);

  // Map EWB numbers to GR numbers for display
  const ewbToGrMapping = useMemo(() => {
    if (!transitDetails) return {};
    
    const mapping = {};
    transitDetails.forEach(transit => {
      if (transit.bilty?.e_way_bill) {
        const biltyEWBs = transit.bilty.e_way_bill.split(',').filter(e => e.trim());
        biltyEWBs.forEach(ewb => {
          const trimmedEwb = ewb.trim();
          if (!mapping[trimmedEwb]) {
            mapping[trimmedEwb] = [];
          }
          mapping[trimmedEwb].push({ gr_no: transit.gr_no, source: 'bilty' });
        });
      }
      if (transit.station?.e_way_bill) {
        const stationEWBs = transit.station.e_way_bill.split(',').filter(e => e.trim());
        stationEWBs.forEach(ewb => {
          const trimmedEwb = ewb.trim();
          if (!mapping[trimmedEwb]) {
            mapping[trimmedEwb] = [];
          }
          mapping[trimmedEwb].push({ gr_no: transit.gr_no, source: 'station' });
        });
      }
    });
    return mapping;
  }, [transitDetails]);

  // Fetch validation status from database
  const fetchValidationStatus = useCallback(async () => {
    if (!allEwbNumbers || allEwbNumbers.length === 0) {
      setValidationMap({});
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ewb_validations')
        .select('ewb_number, is_valid, validation_status')
        .in('ewb_number', allEwbNumbers)
        .order('validated_at', { ascending: false });

      if (error) {
        console.error('Error fetching validation status:', error);
        setValidationMap({});
        return;
      }

      // Create map with latest validation for each EWB
      const map = {};
      allEwbNumbers.forEach(ewb => {
        map[ewb] = { isValidated: false, success: false };
      });

      // Process results - first result for each EWB is the latest due to ordering
      const processedEwbs = new Set();
      data?.forEach(record => {
        if (!processedEwbs.has(record.ewb_number)) {
          map[record.ewb_number] = {
            isValidated: true,
            success: record.is_valid === true
          };
          processedEwbs.add(record.ewb_number);
        }
      });

      setValidationMap(map);
    } catch (err) {
      console.error('Error fetching validation status:', err);
    }
    setLoading(false);
  }, [allEwbNumbers]);

  useEffect(() => {
    fetchValidationStatus();
  }, [fetchValidationStatus]);

  const handleValidationResults = useCallback((results = []) => {
    if (!Array.isArray(results) || results.length === 0) return;
    setValidationMap(prev => {
      const next = { ...prev };
      results.forEach(({ ewbNumber, success }) => {
        if (!ewbNumber) return;
        next[String(ewbNumber).trim()] = { isValidated: true, success: success === true };
      });
      return next;
    });
    if (onValidationComplete) {
      onValidationComplete(results);
    }
  }, [onValidationComplete]);

  const validatedCount = useMemo(() => {
    return Object.values(validationMap).filter(v => v.isValidated && v.success).length;
  }, [validationMap]);

  const pendingCount = useMemo(() => {
    return allEwbNumbers.length - Object.values(validationMap).filter(v => v.isValidated).length;
  }, [allEwbNumbers, validationMap]);

  if (!transitDetails || transitDetails.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No transit details found for validation.</p>
      </div>
    );
  }

  if (allEwbNumbers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Shield className="w-12 h-12 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No E-Way Bills Found</h3>
        <p className="text-gray-600">This challan doesn&apos;t have any E-Way Bills to validate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              EWB Validation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Validate E-Way Bills with NIC portal to ensure authenticity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchValidationStatus}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh validation status"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{allEwbNumbers.length}</p>
                <p className="text-xs text-blue-600/70">Total EWBs</p>
              </div>
              <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
                <p className="text-xs text-green-600/70">Validated</p>
              </div>
              <div className="text-center px-4 py-2 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                <p className="text-xs text-orange-600/70">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Component */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <EwbValidationComponent 
            ewbNumbers={allEwbNumbers}
            ewbToGrMapping={ewbToGrMapping}
            challanNo={challanDetails?.challan_no}
            showCacheControls={true}
            onValidationComplete={handleValidationResults}
          />
        </div>
      </div>

      {/* EWB List with Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">E-Way Bill Status</h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {allEwbNumbers.map((ewb, idx) => {
            const status = validationMap[ewb];
            const grInfo = ewbToGrMapping[ewb] || [];
            
            return (
              <div key={ewb} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-8">{idx + 1}.</span>
                  <div>
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {formatEwbNumber(ewb)}
                    </span>
                    {grInfo.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {grInfo.map(g => `${g.gr_no} (${g.source})`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status?.isValidated ? (
                    status.success ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4" />
                        Valid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium bg-red-50 px-3 py-1 rounded-full">
                        <AlertTriangle className="w-4 h-4" />
                        Invalid
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1.5 text-gray-500 text-sm bg-gray-100 px-3 py-1 rounded-full">
                      <Database className="w-4 h-4" />
                      Not Checked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
