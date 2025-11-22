import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Shield, Edit3 } from 'lucide-react';
import { formatEwbNumber } from '../../utils/ewbValidation';
import { getTransporterUpdatesByEwbNumbers, getEwbValidationsByNumbers } from '../../utils/ewbValidationStorage';

export default function EWBDetailsModal({ isOpen, onClose, grData }) {
  const [transporterUpdates, setTransporterUpdates] = useState({});
  const [validationStatuses, setValidationStatuses] = useState({});

  // Get all EWB numbers from grData
  const allEwbNumbers = React.useMemo(() => {
    if (!grData) return [];
    const ewbs = [];
    if (grData.bilty?.e_way_bill) {
      ewbs.push(...grData.bilty.e_way_bill.split(',').map(e => e.trim()).filter(e => e));
    }
    if (grData.station?.e_way_bill) {
      ewbs.push(...grData.station.e_way_bill.split(',').map(e => e.trim()).filter(e => e));
    }
    return [...new Set(ewbs)];
  }, [grData]);

  // Fetch transporter updates and validation statuses
  useEffect(() => {
    if (!isOpen || allEwbNumbers.length === 0) return;

    // Fetch transporter updates
    getTransporterUpdatesByEwbNumbers(allEwbNumbers).then(result => {
      if (result.success) {
        setTransporterUpdates(result.data);
      }
    });

    // Fetch validation statuses from database
    getEwbValidationsByNumbers(allEwbNumbers).then(result => {
      const statuses = {};
      
      if (result.success && result.data) {
        // Use database validations
        Object.entries(result.data).forEach(([ewb, validation]) => {
          statuses[ewb] = {
            isValid: validation.is_valid === true,
            data: validation,
            source: 'database'
          };
        });
      }
      
      setValidationStatuses(statuses);
    });
  }, [isOpen, allEwbNumbers]);
  if (!isOpen || !grData) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            GR Number: {grData.gr_no}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* E-Way Bill Status Section */}
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg p-6 border-2 border-blue-300 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-800">E-Way Bill Status</h3>
            </div>
            
            <div className="space-y-4">
              {/* Bilty E-Way Bills */}
              {grData.bilty?.e_way_bill && grData.bilty.e_way_bill.split(',').filter(e => e.trim()).map((ewb, idx) => {
                const trimmedEwb = ewb.trim();
                const validation = validationStatuses[trimmedEwb];
                const transporterUpdate = transporterUpdates[trimmedEwb];
                
                return (
                  <div key={`bilty-${idx}`} className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-600">Bilty EWB #{idx + 1}</span>
                        <span className="text-base font-mono font-bold text-green-700">
                          {formatEwbNumber(trimmedEwb)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Validation Status */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-800 uppercase">Validation</span>
                        </div>
                        {validation ? (
                          <div className="flex items-center gap-2">
                            {validation.isValid ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-bold text-green-700">Validated</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-bold text-red-700">Invalid</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Not Validated</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Transporter Status */}
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Edit3 className="w-4 h-4 text-orange-600" />
                          <span className="text-xs font-semibold text-orange-800 uppercase">Transporter</span>
                        </div>
                        {transporterUpdate ? (
                          transporterUpdate.update_result?.success ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-bold text-green-700">Updated</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-bold text-red-700">Failed</span>
                              </div>
                              {transporterUpdate.update_result?.error && (
                                <p className="text-xs text-red-600 mt-1">
                                  {transporterUpdate.update_result.error}
                                </p>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Not Updated</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Transporter Details if updated */}
                    {transporterUpdate?.transporter_id && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Transporter ID:</span>
                            <p className="font-mono font-semibold text-gray-900">{transporterUpdate.transporter_id}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Transporter Name:</span>
                            <p className="font-semibold text-gray-900">{transporterUpdate.transporter_name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Station E-Way Bills */}
              {grData.station?.e_way_bill && grData.station.e_way_bill.split(',').filter(e => e.trim()).map((ewb, idx) => {
                const trimmedEwb = ewb.trim();
                const validation = validationStatuses[trimmedEwb];
                const transporterUpdate = transporterUpdates[trimmedEwb];
                
                return (
                  <div key={`station-${idx}`} className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-600">Station EWB #{idx + 1}</span>
                        <span className="text-base font-mono font-bold text-blue-700">
                          {formatEwbNumber(trimmedEwb)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Validation Status */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-800 uppercase">Validation</span>
                        </div>
                        {validation ? (
                          <div className="flex items-center gap-2">
                            {validation.isValid ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-bold text-green-700">Validated</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-bold text-red-700">Invalid</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Not Validated</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Transporter Status */}
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Edit3 className="w-4 h-4 text-orange-600" />
                          <span className="text-xs font-semibold text-orange-800 uppercase">Transporter</span>
                        </div>
                        {transporterUpdate ? (
                          transporterUpdate.update_result?.success ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-bold text-green-700">Updated</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-bold text-red-700">Failed</span>
                              </div>
                              {transporterUpdate.update_result?.error && (
                                <p className="text-xs text-red-600 mt-1">
                                  {transporterUpdate.update_result.error}
                                </p>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Not Updated</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Transporter Details if updated */}
                    {transporterUpdate?.transporter_id && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Transporter ID:</span>
                            <p className="font-mono font-semibold text-gray-900">{transporterUpdate.transporter_id}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Transporter Name:</span>
                            <p className="font-semibold text-gray-900">{transporterUpdate.transporter_name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* No EWB */}
              {!grData.bilty?.e_way_bill && !grData.station?.e_way_bill && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">No E-Way Bills Available</p>
                </div>
              )}
            </div>
          </div>

          {/* Bilty Details */}
          {grData.bilty && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bilty Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Bilty Date</p>
                  <p className="font-semibold text-gray-900">
                    {grData.bilty.bilty_date ? new Date(grData.bilty.bilty_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignor_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor GST</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignor_gst || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor Phone</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignor_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignee_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee GST</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignee_gst || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee Phone</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.consignee_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transport Name</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.transport_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transport GST</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.transport_gst || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice No</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.invoice_no || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Value</p>
                  <p className="font-semibold text-gray-900">
                    ₹{grData.bilty.invoice_value?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p className="font-semibold text-gray-900">
                    {grData.bilty.invoice_date ? new Date(grData.bilty.invoice_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">No. of Packages</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.no_of_pkg || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="font-semibold text-gray-900">{grData.bilty.wt || 0} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Mode</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.bilty.payment_mode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Type</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.bilty.delivery_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-green-600 text-lg">
                    ₹{grData.bilty.total?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              {grData.bilty.contain && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Contents</p>
                  <p className="text-gray-900">{grData.bilty.contain}</p>
                </div>
              )}
              {grData.bilty.pvt_marks && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Private Marks</p>
                  <p className="text-gray-900">{grData.bilty.pvt_marks}</p>
                </div>
              )}
              {grData.bilty.remark && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Remarks</p>
                  <p className="text-gray-900">{grData.bilty.remark}</p>
                </div>
              )}
            </div>
          )}

          {/* Station Summary Details */}
          {grData.station && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Station Bilty Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Station</p>
                  <p className="font-semibold text-gray-900">{grData.station.station || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor</p>
                  <p className="font-semibold text-gray-900">{grData.station.consignor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee</p>
                  <p className="font-semibold text-gray-900">{grData.station.consignee || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">No. of Packets</p>
                  <p className="font-semibold text-gray-900">{grData.station.no_of_packets || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="font-semibold text-gray-900">{grData.station.weight || 0} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.station.payment_status || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold text-green-600">
                    ₹{grData.station.amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Type</p>
                  <p className="font-semibold text-gray-900 uppercase">{grData.station.delivery_type || 'N/A'}</p>
                </div>
              </div>
              {grData.station.contents && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Contents</p>
                  <p className="text-gray-900">{grData.station.contents}</p>
                </div>
              )}
              {grData.station.pvt_marks && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Private Marks</p>
                  <p className="text-gray-900">{grData.station.pvt_marks}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
