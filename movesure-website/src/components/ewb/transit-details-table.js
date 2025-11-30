import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Database, FileStack, Edit3, XCircle, Filter } from 'lucide-react';
import EWBFilter from './ewb-filter';
import EWBDetailsModal from './ewb-details-modal';
import EwbValidationComponent from './ewb-validation-component';
import ConsolidatedEwbForm from './consolidated-ewb-form';
import TransporterUpdateModal from './transporter-update-modal';
import { getCachedValidation, formatEwbNumber } from '../../utils/ewbValidation';
import { getTransporterUpdatesByEwbNumbers } from '../../utils/ewbValidationStorage';

export default function TransitDetailsTable({ transitDetails, challanDetails }) {
  const [filterType, setFilterType] = useState('with_ewb');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGRData, setSelectedGRData] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showConsolidatedForm, setShowConsolidatedForm] = useState(false);
  const [showTransporterModal, setShowTransporterModal] = useState(false);
  const [selectedTransporterGR, setSelectedTransporterGR] = useState(null);
  const [validationMap, setValidationMap] = useState({});
  const [transporterUpdatesMap, setTransporterUpdatesMap] = useState({});
  const [hideKanpurDestination, setHideKanpurDestination] = useState(false);

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

  const getEwbValidationStatus = (ewbNumber) => {
    const cached = getCachedValidation(ewbNumber);
    if (cached) {
      if (cached.data?.results?.code === 204 || 
          (cached.data?.results?.message && typeof cached.data.results.message === 'string' && cached.data.results.message.includes('Could not retrieve data')) ||
          cached.data?.results?.nic_code === '325') {
        return { isValidated: true, isValid: false, source: 'cache', data: cached, error: 'Invalid EWB Number' };
      }
      return { isValidated: true, isValid: cached.verified === true, source: 'cache', data: cached };
    }
    return { isValidated: false, isValid: false, source: null, data: null };
  };

  useEffect(() => {
    if (!allEwbNumbers || allEwbNumbers.length === 0) {
      setValidationMap({});
      return;
    }
    setValidationMap(prev => {
      const next = {};
      allEwbNumbers.forEach(ewbNumber => {
        const status = getEwbValidationStatus(ewbNumber);
        if (status.isValidated) {
          next[ewbNumber] = { isValidated: true, success: status.isValid };
        } else if (prev[ewbNumber]) {
          next[ewbNumber] = prev[ewbNumber];
        }
      });
      return next;
    });
  }, [allEwbNumbers]);

  useEffect(() => {
    if (!allEwbNumbers || allEwbNumbers.length === 0) {
      setTransporterUpdatesMap({});
      return;
    }
    getTransporterUpdatesByEwbNumbers(allEwbNumbers).then(result => {
      if (result.success) {
        setTransporterUpdatesMap(result.data);
      }
    });
  }, [allEwbNumbers]);

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
  }, []);

  const allEwbsValidated = useMemo(() => {
    if (!allEwbNumbers || allEwbNumbers.length < 2) return false;
    return allEwbNumbers.every(ewb => {
      const entry = validationMap[String(ewb).trim()];
      return entry?.isValidated && entry?.success;
    });
  }, [allEwbNumbers, validationMap]);

  const isKanpurDestination = (transit) => {
    const cityName = transit.toCity?.city_name?.toLowerCase() || 
                    transit.station?.station?.toLowerCase() || 
                    transit.bilty?.to_location?.toLowerCase() || '';
    return cityName.includes('kanpur');
  };

  const filteredTransitDetails = useMemo(() => {
    if (!transitDetails) return [];
    let filtered = transitDetails;
    if (hideKanpurDestination) {
      filtered = filtered.filter(t => !isKanpurDestination(t));
    }
    if (filterType === 'with_ewb') {
      return filtered.filter(t => {
        const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
        const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
        return biltyEWBs.length > 0 || stationEWBs.length > 0;
      });
    } else if (filterType === 'without_ewb') {
      return filtered.filter(t => {
        const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
        const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
        return biltyEWBs.length === 0 && stationEWBs.length === 0;
      });
    }
    return filtered;
  }, [transitDetails, filterType, hideKanpurDestination]);

  const hasEWBCount = useMemo(() => 
    transitDetails?.reduce((total, t) => {
      const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
      const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
      return total + biltyEWBs.length + stationEWBs.length;
    }, 0) || 0
  , [transitDetails]);

  const noEWBCount = useMemo(() => 
    transitDetails?.filter(t => {
      const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
      const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
      return biltyEWBs.length === 0 && stationEWBs.length === 0;
    }).length || 0
  , [transitDetails]);

  const handleViewDetails = (transit) => {
    setSelectedGRData(transit);
    setModalOpen(true);
  };

  const handleUpdateTransporter = (transit) => {
    setSelectedTransporterGR(transit);
    setShowTransporterModal(true);
  };

  if (!transitDetails || transitDetails.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 text-center">No transit details found for this challan.</p>
      </div>
    );
  }

  const hasEWB = (transit) => {
    const biltyEWBs = transit.bilty?.e_way_bill ? transit.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
    const stationEWBs = transit.station?.e_way_bill ? transit.station.e_way_bill.split(',').filter(e => e.trim()) : [];
    return biltyEWBs.length > 0 || stationEWBs.length > 0;
  };

  const getEWBCount = (transit) => {
    const biltyEWBs = transit.bilty?.e_way_bill ? transit.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
    const stationEWBs = transit.station?.e_way_bill ? transit.station.e_way_bill.split(',').filter(e => e.trim()) : [];
    return biltyEWBs.length + stationEWBs.length;
  };

  const hasSuccessfulTransporterUpdate = (transit) => {
    if (!hasEWB(transit) || isKanpurDestination(transit)) return false;
    const biltyEWBs = transit.bilty?.e_way_bill ? transit.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
    const stationEWBs = transit.station?.e_way_bill ? transit.station.e_way_bill.split(',').filter(e => e.trim()) : [];
    const allEWBs = [...biltyEWBs, ...stationEWBs].map(e => e.trim());
    return allEWBs.some(ewb => {
      const transporterUpdate = transporterUpdatesMap[ewb];
      if (!transporterUpdate) return false;
      return transporterUpdate.is_success === true || 
             transporterUpdate.update_result?.success === true ||
             transporterUpdate.raw_result_metadata?.success === true;
    });
  };

  return (
    <>
      <EWBFilter 
        filterType={filterType}
        setFilterType={setFilterType}
        hasEWBCount={hasEWBCount}
        noEWBCount={noEWBCount}
      />

      <EWBDetailsModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        grData={selectedGRData}
      />

      {!showConsolidatedForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">
                Transit Details ({filteredTransitDetails.length})
              </h2>
              <button
                onClick={() => setHideKanpurDestination(!hideKanpurDestination)}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  hideKanpurDestination
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Kanpur destinations don't require transporter updates"
              >
                <Filter className="w-3 h-3" />
                {hideKanpurDestination ? 'Show Kanpur' : 'Hide Kanpur'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowValidation(!showValidation)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                  showValidation 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                {showValidation ? 'Hide Validation' : `Validate EWBs (${allEwbNumbers.length})`}
              </button>
              {allEwbsValidated && (
                <button
                  onClick={() => setShowConsolidatedForm(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2 shadow-md animate-pulse"
                >
                  <FileStack className="w-4 h-4" />
                  Consolidate All ({allEwbNumbers.length})
                </button>
              )}
            </div>
          </div>

          {showValidation && allEwbNumbers.length > 0 && (
            <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <EwbValidationComponent 
                ewbNumbers={allEwbNumbers}
                ewbToGrMapping={ewbToGrMapping}
                challanNo={challanDetails?.challan_no}
                showCacheControls={true}
                onConsolidateClick={() => setShowConsolidatedForm(true)}
                onValidationComplete={handleValidationResults}
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">GR Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">E-Way Bill</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Transporter Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Consignor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To (Destination)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransitDetails.map((transit) => {
                  const hasUpdate = hasSuccessfulTransporterUpdate(transit);
                  return (
                    <tr 
                      key={transit.id} 
                      className={`transition-colors ${
                        hasUpdate 
                          ? 'bg-gradient-to-r from-green-100 via-green-50 to-green-100 border-l-4 border-green-500 hover:from-green-200 hover:via-green-100 hover:to-green-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{transit.gr_no}</span>
                          {hasSuccessfulTransporterUpdate(transit) && (
                            <span className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                              <CheckCircle className="w-3 h-3" />
                              UPDATED
                            </span>
                          )}
                          {hasEWB(transit) && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500" title="Has E-Way Bill"></span>
                              <span className="text-xs text-green-600 font-semibold">({getEWBCount(transit)})</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasEWB(transit) ? (
                          <div className="space-y-1">
                            {transit.bilty?.e_way_bill && transit.bilty.e_way_bill.split(',').filter(e => e.trim()).map((ewb, idx) => {
                              const validationStatus = getEwbValidationStatus(ewb.trim());
                              return (
                                <div key={`bilty-${idx}`} className="flex items-center gap-2">
                                  <span className="text-xs bg-green-100 text-green-900 px-2 py-1 rounded font-mono font-medium">
                                    {formatEwbNumber(ewb.trim())}
                                  </span>
                                  <span className="text-xs text-gray-600">(Bilty-{idx + 1})</span>
                                  {validationStatus.isValidated && (
                                    <div className="flex items-center gap-1">
                                      {validationStatus.isValid ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                      )}
                                      {validationStatus.source === 'cache' && (
                                        <Database className="w-3 h-3 text-blue-500" title="From Cache" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {transit.station?.e_way_bill && transit.station.e_way_bill.split(',').filter(e => e.trim()).map((ewb, idx) => {
                              const validationStatus = getEwbValidationStatus(ewb.trim());
                              return (
                                <div key={`station-${idx}`} className="flex items-center gap-2">
                                  <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded font-mono font-medium">
                                    {formatEwbNumber(ewb.trim())}
                                  </span>
                                  <span className="text-xs text-gray-600">(Station-{idx + 1})</span>
                                  {validationStatus.isValidated && (
                                    <div className="flex items-center gap-1">
                                      {validationStatus.isValid ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                      )}
                                      {validationStatus.source === 'cache' && (
                                        <Database className="w-3 h-3 text-blue-500" title="From Cache" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-orange-600 font-medium">Not Generated</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasEWB(transit) ? (
                          isKanpurDestination(transit) ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">Not Required</span>
                              <span className="text-xs text-purple-600">(Kanpur)</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {transit.bilty?.e_way_bill && transit.bilty.e_way_bill.split(',').filter(e => e.trim()).map((ewb, idx) => {
                                const trimmedEwb = ewb.trim();
                                const transporterUpdate = transporterUpdatesMap[trimmedEwb];
                                if (!transporterUpdate) {
                                  return (
                                    <div key={`bilty-tr-${idx}`} className="flex items-center gap-1.5">
                                      <XCircle className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-500">Not Updated</span>
                                    </div>
                                  );
                                }
                                const isSuccess = transporterUpdate.is_success === true || 
                                                transporterUpdate.update_result?.success === true ||
                                                transporterUpdate.raw_result_metadata?.success === true;
                                return (
                                  <div key={`bilty-tr-${idx}`} className="flex items-center gap-1.5">
                                    {isSuccess ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                        <span className="text-xs text-green-700 font-medium">Updated</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-xs text-red-700 font-medium">Failed</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                              {transit.station?.e_way_bill && transit.station.e_way_bill.split(',').filter(e => e.trim()).map((ewb, idx) => {
                                const trimmedEwb = ewb.trim();
                                const transporterUpdate = transporterUpdatesMap[trimmedEwb];
                                if (!transporterUpdate) {
                                  return (
                                    <div key={`station-tr-${idx}`} className="flex items-center gap-1.5">
                                      <XCircle className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-500">Not Updated</span>
                                    </div>
                                  );
                                }
                                const isSuccess = transporterUpdate.is_success === true || 
                                                transporterUpdate.update_result?.success === true ||
                                                transporterUpdate.raw_result_metadata?.success === true;
                                return (
                                  <div key={`station-tr-${idx}`} className="flex items-center gap-1.5">
                                    {isSuccess ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                        <span className="text-xs text-green-700 font-medium">Updated</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-xs text-red-700 font-medium">Failed</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transit.bilty?.consignor_name || transit.station?.consignor || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>
                          {transit.toCity?.city_name ? (
                            <>
                              <span className="font-medium text-gray-900">{transit.toCity.city_name}</span>
                              {transit.toCity?.city_code && (
                                <span className="text-xs text-gray-500 ml-1">({transit.toCity.city_code})</span>
                              )}
                            </>
                          ) : transit.station?.station ? (
                            <span className="font-medium text-gray-900">{transit.station.station}</span>
                          ) : transit.bilty?.to_location ? (
                            <span className="text-gray-700">{transit.bilty.to_location}</span>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {transit.bilty?.invoice_value ? (
                          <span className="font-medium text-gray-900">
                            ₹{parseFloat(transit.bilty.invoice_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            onClick={() => handleViewDetails(transit)}
                          >
                            View Details
                          </button>
                          {hasEWB(transit) && (
                            <button
                              className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center gap-1"
                              onClick={() => handleUpdateTransporter(transit)}
                              title="Update Transporter ID"
                            >
                              <Edit3 className="w-3 h-3" />
                              Update Transporter
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TransporterUpdateModal
            isOpen={showTransporterModal}
            onClose={() => {
              setShowTransporterModal(false);
              if (allEwbNumbers && allEwbNumbers.length > 0) {
                getTransporterUpdatesByEwbNumbers(allEwbNumbers).then(result => {
                  if (result.success) {
                    setTransporterUpdatesMap(result.data);
                  }
                });
              }
            }}
            onUpdateSuccess={(ewbNumber, updateResult) => {
              if (ewbNumber && updateResult) {
                setTransporterUpdatesMap(prev => ({
                  ...prev,
                  [ewbNumber]: {
                    ...prev[ewbNumber],
                    is_success: true,
                    update_result: updateResult,
                    raw_result_metadata: updateResult
                  }
                }));
              }
            }}
            grData={selectedTransporterGR}
            ewbNumbers={selectedTransporterGR ? [
              ...(selectedTransporterGR.bilty?.e_way_bill ? selectedTransporterGR.bilty.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : []),
              ...(selectedTransporterGR.station?.e_way_bill ? selectedTransporterGR.station.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : [])
            ] : []}
          />
        </div>
      )}

      {showConsolidatedForm && (
        <ConsolidatedEwbForm
          ewbNumbers={allEwbNumbers}
          challanData={challanDetails}
          onBack={() => setShowConsolidatedForm(false)}
        />
      )}
    </>
  );
}
