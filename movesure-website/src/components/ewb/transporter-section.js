'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Truck, CheckCircle, AlertTriangle, XCircle, Edit3, Filter, RefreshCw } from 'lucide-react';
import TransporterUpdateModal from './transporter-update-modal';
import { getCachedValidation, formatEwbNumber } from '../../utils/ewbValidation';
import { getTransporterUpdatesByEwbNumbers } from '../../utils/ewbValidationStorage';

export default function TransporterSection({ transitDetails, challanDetails }) {
  const [transporterUpdatesMap, setTransporterUpdatesMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedTransit, setSelectedTransit] = useState(null);
  const [hideKanpur, setHideKanpur] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get all EWB numbers
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

  // Filter transit with EWBs only
  const transitWithEwb = useMemo(() => {
    if (!transitDetails) return [];
    return transitDetails.filter(t => {
      const biltyEWBs = t.bilty?.e_way_bill ? t.bilty.e_way_bill.split(',').filter(e => e.trim()) : [];
      const stationEWBs = t.station?.e_way_bill ? t.station.e_way_bill.split(',').filter(e => e.trim()) : [];
      return biltyEWBs.length > 0 || stationEWBs.length > 0;
    });
  }, [transitDetails]);

  const isKanpurDestination = (transit) => {
    const cityName = transit.toCity?.city_name?.toLowerCase() || 
                    transit.station?.station?.toLowerCase() || 
                    transit.bilty?.to_location?.toLowerCase() || '';
    return cityName.includes('kanpur');
  };

  const filteredTransit = useMemo(() => {
    if (hideKanpur) {
      return transitWithEwb.filter(t => !isKanpurDestination(t));
    }
    return transitWithEwb;
  }, [transitWithEwb, hideKanpur]);

  const fetchUpdates = useCallback(async () => {
    if (allEwbNumbers.length === 0) return;
    setLoading(true);
    try {
      const result = await getTransporterUpdatesByEwbNumbers(allEwbNumbers);
      if (result.success) {
        setTransporterUpdatesMap(result.data);
      }
    } catch (error) {
      console.error('Error fetching transporter updates:', error);
    }
    setLoading(false);
  }, [allEwbNumbers]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const getTransitEwbs = (transit) => {
    const biltyEWBs = transit.bilty?.e_way_bill ? transit.bilty.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : [];
    const stationEWBs = transit.station?.e_way_bill ? transit.station.e_way_bill.split(',').filter(e => e.trim()).map(e => e.trim()) : [];
    return [...biltyEWBs, ...stationEWBs];
  };

  const hasSuccessfulUpdate = (transit) => {
    if (isKanpurDestination(transit)) return null; // Not required
    const ewbs = getTransitEwbs(transit);
    return ewbs.some(ewb => {
      const update = transporterUpdatesMap[ewb];
      return update?.is_success === true || 
             update?.update_result?.success === true ||
             update?.raw_result_metadata?.success === true;
    });
  };

  const handleUpdateClick = (transit) => {
    setSelectedTransit(transit);
    setShowModal(true);
  };

  const handleUpdateSuccess = (ewbNumber, updateResult) => {
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
  };

  const updatedCount = useMemo(() => {
    return filteredTransit.filter(t => hasSuccessfulUpdate(t) === true).length;
  }, [filteredTransit, transporterUpdatesMap]);

  const pendingCount = useMemo(() => {
    return filteredTransit.filter(t => hasSuccessfulUpdate(t) === false).length;
  }, [filteredTransit, transporterUpdatesMap]);

  const notRequiredCount = useMemo(() => {
    return transitWithEwb.filter(t => isKanpurDestination(t)).length;
  }, [transitWithEwb]);

  if (!transitDetails || transitDetails.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No transit details found.</p>
      </div>
    );
  }

  if (transitWithEwb.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Truck className="w-12 h-12 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No E-Way Bills Found</h3>
        <p className="text-gray-600">This challan doesn&apos;t have any E-Way Bills to update transporter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-green-600" />
              PART B - Update Transporter
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Update transporter ID on E-Way Bills for this challan
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUpdates}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{updatedCount}</p>
                <p className="text-xs text-green-600/70">Updated</p>
              </div>
              <div className="text-center px-4 py-2 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                <p className="text-xs text-orange-600/70">Pending</p>
              </div>
              {notRequiredCount > 0 && (
                <div className="text-center px-4 py-2 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{notRequiredCount}</p>
                  <p className="text-xs text-purple-600/70">Not Required</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredTransit.length} of {transitWithEwb.length} entries with E-Way Bills
          </span>
          <button
            onClick={() => setHideKanpur(!hideKanpur)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              hideKanpur
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            {hideKanpur ? 'Show Kanpur' : 'Hide Kanpur'}
          </button>
        </div>
      </div>

      {/* Transit List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GR No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">E-Way Bills</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransit.map((transit) => {
                const ewbs = getTransitEwbs(transit);
                const updateStatus = hasSuccessfulUpdate(transit);
                const isKanpur = isKanpurDestination(transit);
                
                return (
                  <tr 
                    key={transit.id}
                    className={`transition-colors ${
                      updateStatus === true
                        ? 'bg-gradient-to-r from-green-50 to-green-100/50 border-l-4 border-green-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{transit.gr_no}</span>
                        {updateStatus === true && (
                          <span className="flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />
                            UPDATED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ewbs.map((ewb, idx) => (
                          <span 
                            key={idx}
                            className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {formatEwbNumber(ewb)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isKanpur ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>
                        {transit.toCity?.city_name || transit.station?.station || transit.bilty?.to_location || 'N/A'}
                        {isKanpur && <span className="text-xs text-purple-500 ml-1">(No update needed)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isKanpur ? (
                        <span className="flex items-center gap-1.5 text-purple-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Not Required
                        </span>
                      ) : updateStatus === true ? (
                        <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Updated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isKanpur && (
                        <button
                          onClick={() => handleUpdateClick(transit)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            updateStatus === true
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          <Edit3 className="w-4 h-4" />
                          {updateStatus === true ? 'Update Again' : 'Update Transporter'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <TransporterUpdateModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          fetchUpdates();
        }}
        onUpdateSuccess={handleUpdateSuccess}
        grData={selectedTransit}
        ewbNumbers={selectedTransit ? getTransitEwbs(selectedTransit) : []}
      />
    </div>
  );
}
