'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FileStack, CheckCircle, AlertTriangle, ArrowRight, Info, RefreshCw, Download, ExternalLink, Loader2, Clock } from 'lucide-react';
import ConsolidatedEwbForm from './consolidated-ewb-form';
import { formatEwbNumber } from '../../utils/ewbValidation';
import supabase from '../../app/utils/supabase';

export default function ConsolidationSection({ transitDetails, challanDetails }) {
  const [validationMap, setValidationMap] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingCewbs, setExistingCewbs] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);

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

  // Fetch existing consolidated EWBs for this challan
  const fetchExistingCewbs = useCallback(async () => {
    if (!challanDetails?.challan_no) {
      setLoadingExisting(false);
      return;
    }

    try {
      setLoadingExisting(true);
      const { data, error } = await supabase
        .from('consolidated_ewb_validations')
        .select('*')
        .eq('challan_no', challanDetails.challan_no)
        .order('validated_at', { ascending: false });

      if (error) throw error;
      setExistingCewbs(data || []);
    } catch (err) {
      console.error('Error fetching existing consolidated EWBs:', err);
    } finally {
      setLoadingExisting(false);
    }
  }, [challanDetails?.challan_no]);

  useEffect(() => {
    fetchExistingCewbs();
  }, [fetchExistingCewbs]);

  const allValidated = useMemo(() => {
    if (allEwbNumbers.length < 2) return false;
    return allEwbNumbers.every(ewb => {
      const entry = validationMap[ewb];
      return entry?.isValidated && entry?.success;
    });
  }, [allEwbNumbers, validationMap]);

  const validatedCount = useMemo(() => {
    return Object.values(validationMap).filter(v => v.isValidated && v.success).length;
  }, [validationMap]);

  if (!transitDetails || transitDetails.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <FileStack className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No transit details found for consolidation.</p>
      </div>
    );
  }

  if (allEwbNumbers.length < 2) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <FileStack className="w-12 h-12 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Insufficient E-Way Bills</h3>
        <p className="text-gray-600">
          At least 2 E-Way Bills are required for consolidation. 
          Currently found: {allEwbNumbers.length}
        </p>
      </div>
    );
  }

  if (showForm) {
    return (
      <ConsolidatedEwbForm
        ewbNumbers={allEwbNumbers}
        challanData={challanDetails}
        onBack={() => {
          setShowForm(false);
          fetchExistingCewbs(); // Refresh after returning from form
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileStack className="w-6 h-6 text-orange-600" />
              PART A - Consolidated E-Way Bill
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Generate a consolidated EWB by combining multiple E-Way Bills
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchValidationStatus(); fetchExistingCewbs(); }}
              disabled={loading || loadingExisting}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${(loading || loadingExisting) ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{allEwbNumbers.length}</p>
                <p className="text-xs text-orange-600/70">Total EWBs</p>
              </div>
              <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
                <p className="text-xs text-green-600/70">Validated</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Consolidated EWBs - Show prominently if any exist */}
      {loadingExisting ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading existing consolidated EWBs...</span>
          </div>
        </div>
      ) : existingCewbs.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-sm border border-green-200 overflow-hidden">
          <div className="p-4 border-b border-green-200 bg-green-100/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Existing Consolidated E-Way Bills</h3>
            </div>
            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium">
              {existingCewbs.length} Generated
            </span>
          </div>
          <div className="p-4 space-y-3">
            {existingCewbs.map((cewb) => (
              <div key={cewb.id} className="bg-white rounded-xl p-4 border border-green-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-gray-900 font-mono">{cewb.consolidated_ewb_number}</span>
                      {cewb.is_valid ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Valid</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Invalid</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">EWBs Included:</span>
                        <span className="ml-1 font-semibold text-gray-900">{cewb.total_ewb_count || cewb.included_ewb_numbers?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          {new Date(cewb.validated_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          {new Date(cewb.validated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-1 font-semibold text-gray-900">{cewb.validation_status || 'Success'}</span>
                      </div>
                    </div>
                    {cewb.included_ewb_numbers && cewb.included_ewb_numbers.length > 0 && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                          View included EWBs ({cewb.included_ewb_numbers.length})
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cewb.included_ewb_numbers.map((ewb, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono text-xs">{ewb}</span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {cewb.raw_result_metadata?.url && (
                      <>
                        <a
                          href={cewb.raw_result_metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </a>
                        <button
                          onClick={() => window.open(cewb.raw_result_metadata.url, '_blank')}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements Check */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Pre-Consolidation Checklist</h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Requirement 1: Minimum EWBs */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Minimum E-Way Bills Met</p>
              <p className="text-sm text-green-600 mt-0.5">
                {allEwbNumbers.length} E-Way Bills found (minimum 2 required)
              </p>
            </div>
          </div>

          {/* Requirement 2: All Validated */}
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            allValidated 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            {allValidated ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${allValidated ? 'text-green-800' : 'text-orange-800'}`}>
                {allValidated ? 'All E-Way Bills Validated' : 'Validation Required'}
              </p>
              <p className={`text-sm mt-0.5 ${allValidated ? 'text-green-600' : 'text-orange-600'}`}>
                {allValidated 
                  ? `All ${allEwbNumbers.length} E-Way Bills have been validated successfully`
                  : `${validatedCount} of ${allEwbNumbers.length} validated. Please validate all EWBs first.`
                }
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Important Information</p>
              <ul className="text-sm text-blue-600 mt-1 space-y-1 list-disc list-inside">
                <li>Consolidated EWB combines multiple EWBs into a single document</li>
                <li>All EWBs must be validated before consolidation</li>
                <li>Vehicle and transporter details will be applied to all EWBs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* EWB List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">E-Way Bills for Consolidation</h3>
          <span className="text-sm text-gray-500">{allEwbNumbers.length} items</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {allEwbNumbers.map((ewb, idx) => {
            const status = validationMap[ewb];
            return (
              <div key={ewb} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 w-6">{idx + 1}.</span>
                  <span className="font-mono text-sm text-gray-900">{formatEwbNumber(ewb)}</span>
                </div>
                {status?.isValidated && status.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowForm(true)}
          className="px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-all bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300"
        >
          <FileStack className="w-6 h-6" />
          {existingCewbs.length > 0 ? 'Create New Consolidated EWB' : 'Generate Consolidated EWB'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {!allValidated && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200 max-w-2xl mx-auto">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Note: Not all EWBs validated</p>
            <p className="text-sm text-yellow-600 mt-0.5">
              {validatedCount} of {allEwbNumbers.length} E-Way Bills validated. You can still proceed, but ensure all EWBs are valid for successful consolidation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
