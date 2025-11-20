import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Database, FileStack, Edit3 } from 'lucide-react';
import EWBFilter from './ewb-filter';
import EWBDetailsModal from './ewb-details-modal';
import EwbValidationComponent from './ewb-validation-component';
import ConsolidatedEwbForm from './consolidated-ewb-form';
import TransporterUpdateModal from './transporter-update-modal';
import { getCachedValidation, formatEwbNumber } from '../../utils/ewbValidation';

export default function TransitDetailsTable({ transitDetails, challanDetails }) {
  const [selectedGRs, setSelectedGRs] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGRData, setSelectedGRData] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showConsolidatedForm, setShowConsolidatedForm] = useState(false);
  const [showTransporterModal, setShowTransporterModal] = useState(false);
  const [selectedTransporterGR, setSelectedTransporterGR] = useState(null);
  const [validationMap, setValidationMap] = useState({});

  // Get all EWB numbers from transit details
  const allEwbNumbers = useMemo(() => {
    if (!transitDetails) return [];
    
    const ewbNumbers = [];
    transitDetails.forEach(transit => {
      // Add bilty EWB numbers
      if (transit.bilty?.e_way_bill) {
        const biltyEWBs = transit.bilty.e_way_bill.split(',').filter(e => e.trim());
        ewbNumbers.push(...biltyEWBs.map(e => e.trim()));
      }
      
      // Add station EWB numbers
      if (transit.station?.e_way_bill) {
        const stationEWBs = transit.station.e_way_bill.split(',').filter(e => e.trim());
        ewbNumbers.push(...stationEWBs.map(e => e.trim()));
      }
    });
    
    // Remove duplicates
    return [...new Set(ewbNumbers)];
  }, [transitDetails]);

  // Map EWB numbers to GR numbers for display
  const ewbToGrMapping = useMemo(() => {
    if (!transitDetails) return {};
    
    const mapping = {};
    transitDetails.forEach(transit => {
      // Map bilty EWB numbers
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
      
      // Map station EWB numbers
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

  // Get EWB numbers from selected GRs only
  const selectedEwbNumbers = useMemo(() => {
    if (!transitDetails || selectedGRs.length === 0) return [];
    
    const ewbNumbers = [];
    transitDetails
      .filter(transit => selectedGRs.includes(transit.gr_no))
      .forEach(transit => {
        // Add bilty EWB numbers
        if (transit.bilty?.e_way_bill) {
          const biltyEWBs = transit.bilty.e_way_bill.split(',').filter(e => e.trim());
          ewbNumbers.push(...biltyEWBs.map(e => e.trim()));
        }
        
        // Add station EWB numbers
        if (transit.station?.e_way_bill) {
          const stationEWBs = transit.station.e_way_bill.split(',').filter(e => e.trim());
          ewbNumbers.push(...stationEWBs.map(e => e.trim()));
        }
      });
    
    // Remove duplicates
    return [...new Set(ewbNumbers)];
  }, [transitDetails, selectedGRs]);

  // Check validation status for an EWB number
  const getEwbValidationStatus = (ewbNumber) => {
    const cached = getCachedValidation(ewbNumber);
    if (cached) {
      // Check if the cached data indicates an invalid EWB
      if (cached.data?.results?.code === 204 || 
          (cached.data?.results?.message && typeof cached.data.results.message === 'string' && cached.data.results.message.includes('Could not retrieve data')) ||
          cached.data?.results?.nic_code === '325') {
        return {
          isValidated: true,
          isValid: false,
          source: 'cache',
          data: cached,
          error: 'Invalid EWB Number'
        };
      }
      return {
        isValidated: true,
        isValid: cached.verified === true,
        source: 'cache',
        data: cached
      };
    }
    return {
      isValidated: false,
      isValid: false,
      source: null,
      data: null
    };
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
          next[ewbNumber] = {
            isValidated: true,
            success: status.isValid
          };
        } else if (prev[ewbNumber]) {
          next[ewbNumber] = prev[ewbNumber];
        }
      });

      return next;
    });
  }, [allEwbNumbers]);

  const handleValidationResults = useCallback((results = []) => {
    if (!Array.isArray(results) || results.length === 0) return;

    setValidationMap(prev => {
      const next = { ...prev };
      results.forEach(({ ewbNumber, success }) => {
        if (!ewbNumber) return;
        next[String(ewbNumber).trim()] = {
          isValidated: true,
          success: success === true
        };
      });
      return next;
    });
  }, []);

  const canConsolidateSelected = useMemo(() => {
    if (!selectedEwbNumbers || selectedEwbNumbers.length < 2) return false;
    return selectedEwbNumbers.every(ewb => {
      const entry = validationMap[String(ewb).trim()];
      return entry?.isValidated && entry?.success;
    });
  }, [selectedEwbNumbers, validationMap]);

  // Filter transit details based on E-Way Bill availability
  const filteredTransitDetails = useMemo(() => {
    if (!transitDetails) return [];
    
    if (filterType === 'with_ewb') {
      return transitDetails.filter(t => {
        const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
        const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
        return biltyEWBs.length > 0 || stationEWBs.length > 0;
      });
    } else if (filterType === 'without_ewb') {
      return transitDetails.filter(t => {
        const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
        const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
        return biltyEWBs.length === 0 && stationEWBs.length === 0;
      });
    }
    return transitDetails;
  }, [transitDetails, filterType]);

  // Count statistics - total number of E-Way Bills (not GR numbers)
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

  const toggleSelection = (grNo) => {
    setSelectedGRs(prev => 
      prev.includes(grNo) 
        ? prev.filter(g => g !== grNo)
        : [...prev, grNo]
    );
  };

  const toggleAll = () => {
    if (selectedGRs.length === filteredTransitDetails.length && filteredTransitDetails.length > 0) {
      setSelectedGRs([]);
    } else {
      setSelectedGRs(filteredTransitDetails.map(t => t.gr_no));
    }
  };

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

  const getSelectedEWBCount = () => {
    return transitDetails
      ?.filter(t => selectedGRs.includes(t.gr_no))
      .reduce((total, t) => {
        const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
        const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
        return total + biltyEWBs.length + stationEWBs.length;
      }, 0) || 0;
  };

  const getStatusBadge = (transit) => {
    if (transit.is_delivered_at_destination) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Delivered</span>;
    }
    if (transit.out_for_door_delivery) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Out for Delivery</span>;
    }
    if (transit.is_delivered_at_branch2) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">At Destination Branch</span>;
    }
    if (transit.is_out_of_delivery_from_branch1) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">In Transit</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Pending</span>;
  };

  return (
    <>
      {/* Filter Component */}
      <EWBFilter 
        filterType={filterType}
        setFilterType={setFilterType}
        hasEWBCount={hasEWBCount}
        noEWBCount={noEWBCount}
      />

      {/* Modal */}
      <EWBDetailsModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        grData={selectedGRData}
      />

      {!showConsolidatedForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Transit Details ({filteredTransitDetails.length} GR Numbers)
          </h2>
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
            <button
              onClick={toggleAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {selectedGRs.length === filteredTransitDetails.length && filteredTransitDetails.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            {selectedGRs.length > 0 && (
              <>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Generate EWB ({getSelectedEWBCount()})
                </button>
                {canConsolidateSelected && (
                  <button
                    onClick={() => setShowConsolidatedForm(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <FileStack className="w-4 h-4" />
                    Consolidate EWBs ({selectedEwbNumbers.length})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* EWB Validation Component */}
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
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedGRs.length === filteredTransitDetails.length && filteredTransitDetails.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">GR Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">E-Way Bill</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Consignor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To (Destination)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransitDetails.map((transit) => (
                <tr 
                  key={transit.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedGRs.includes(transit.gr_no) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedGRs.includes(transit.gr_no)}
                      onChange={() => toggleSelection(transit.gr_no)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{transit.gr_no}</span>
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
              ))}
            </tbody>
          </table>
        </div>

        {selectedGRs.length > 0 && (
          <div className="p-4 bg-blue-50 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{selectedGRs.length}</span> GR numbers selected for EWB generation
                {selectedEwbNumbers.length > 0 && (
                  <span className="ml-2">
                    • <span className="font-semibold">{selectedEwbNumbers.length}</span> unique EWB numbers available for consolidation
                  </span>
                )}
              </p>
              {canConsolidateSelected ? (
                <button
                  onClick={() => setShowConsolidatedForm(true)}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors flex items-center gap-1"
                >
                  <FileStack className="w-3 h-3" />
                  Quick Consolidate
                </button>
              ) : (
                selectedEwbNumbers.length > 1 && (
                  <span className="text-xs font-medium text-blue-700">Validate these EWB numbers to enable consolidation.</span>
                )
              )}
            </div>
          </div>
        )}

        {/* Consolidated EWB Form */}
        {showConsolidatedForm && (
          <ConsolidatedEwbForm
            ewbNumbers={selectedGRs.length > 0 ? selectedEwbNumbers : allEwbNumbers}
            challanData={challanDetails}
            onBack={() => setShowConsolidatedForm(false)}
          />
        )}

        {/* Transporter Update Modal */}
        <TransporterUpdateModal
          isOpen={showTransporterModal}
          onClose={() => setShowTransporterModal(false)}
          grData={selectedTransporterGR}
          ewbNumbers={selectedTransporterGR ? [
            ...(selectedTransporterGR.bilty?.e_way_bill ? selectedTransporterGR.bilty.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : []),
            ...(selectedTransporterGR.station?.e_way_bill ? selectedTransporterGR.station.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : [])
          ] : []}
        />
        </div>
      )}

      {/* Consolidated EWB Form */}
      {showConsolidatedForm && (
        <ConsolidatedEwbForm
          ewbNumbers={selectedGRs.length > 0 ? selectedEwbNumbers : allEwbNumbers}
          challanData={challanDetails}
          onBack={() => setShowConsolidatedForm(false)}
        />
      )}
    </>
  );
}
