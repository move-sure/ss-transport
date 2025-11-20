import React from 'react';
import { CheckCircle, MapPin, FileText, Truck, Calendar, User, DollarSign, Hash, Database, ChevronDown } from 'lucide-react';

const EwbSuccessDetails = ({ data, source, autoCollapse = false }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (!data) return null;

  // Extract the actual E-Way Bill data from nested structure
  // The structure is: data.data.results.message (from localStorage)
  let ewbData = null;
  
  if (data.data?.results?.message) {
    ewbData = data.data.results.message;
  } else if (data.results?.message) {
    ewbData = data.results.message;
  } else if (data.message) {
    ewbData = data.message;
  } else {
    ewbData = data;
  }
  
  if (!ewbData || typeof ewbData !== 'object') return null;

  const InfoRow = ({ icon: Icon, label, value, className = "" }) => {
    if (!value || value === '' || value === null || value === undefined) return null;
    
    return (
      <div className={`flex items-start gap-2 ${className}`}>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</p>
          <p className="text-sm text-slate-900 font-medium break-words">{value}</p>
        </div>
      </div>
    );
  };

  const StatusBadge = ({ status }) => {
    const isActive = status?.toUpperCase() === 'ACTIVE';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
        isActive 
          ? 'bg-green-100 text-green-700 border border-green-200' 
          : 'bg-amber-100 text-amber-700 border border-amber-200'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-amber-500'}`}></span>
        {status}
      </span>
    );
  };

  // Get the status from the correct field
  const ewbStatus = ewbData.eway_bill_status || ewbData.status;

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-green-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">E-Way Bill Details</span>
          <ChevronDown className={`w-4 h-4 text-green-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {ewbStatus && <StatusBadge status={ewbStatus} />}
      </div>

      {/* Main Details Grid - Single Row Layout */}
      {isExpanded && (
      <div className="space-y-3">
        {/* Single Row Party Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
          {/* Consignor */}
          {ewbData.legal_name_of_consignor && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Consignor</p>
                <p className="text-xs text-slate-900 font-bold mb-0.5">{ewbData.legal_name_of_consignor}</p>
                {ewbData.address1_of_consignor && (
                  <p className="text-[10px] text-slate-600 mb-1">{ewbData.address1_of_consignor}</p>
                )}
                {ewbData.gstin_of_consignor && (
                  <p className="font-mono text-[10px] text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded inline-block">
                    GSTIN: {ewbData.gstin_of_consignor}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Consignee */}
          {ewbData.legal_name_of_consignee && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Consignee</p>
                <p className="text-xs text-slate-900 font-bold mb-0.5">{ewbData.legal_name_of_consignee}</p>
                {ewbData.address1_of_consignee && (
                  <p className="text-[10px] text-slate-600 mb-1">{ewbData.address1_of_consignee}</p>
                )}
                {ewbData.gstin_of_consignee && (
                  <p className="font-mono text-[10px] text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded inline-block">
                    GSTIN: {ewbData.gstin_of_consignee}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invoice & Date Details - Single Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Invoice Value */}
          {ewbData.total_invoice_value && (
            <div className="flex items-start gap-1.5">
              <DollarSign className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Invoice Value</p>
                <p className="text-sm text-green-700 font-bold">₹{Number(ewbData.total_invoice_value).toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}

          {/* Document Date */}
          {ewbData.document_date && (
            <div className="flex items-start gap-1.5">
              <Calendar className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Doc Date</p>
                <p className="text-xs text-slate-900 font-semibold">{ewbData.document_date}</p>
              </div>
            </div>
          )}

          {/* E-Way Bill Date */}
          {ewbData.eway_bill_date && (
            <div className="flex items-start gap-1.5 md:col-span-2">
              <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase text-slate-500 font-semibold">EWB Date</p>
                <p className="text-xs text-slate-900 font-semibold">{ewbData.eway_bill_date}</p>
              </div>
            </div>
          )}
        </div>

        {/* Other Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2 text-[10px]">

        {/* Route Information */}
        {(ewbData.place_of_consignor || ewbData.place_of_consignee) && (
          <div className="col-span-2 lg:col-span-3">
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded p-1.5">
              <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                {ewbData.place_of_consignor && (
                  <span className="text-blue-900 font-semibold">{ewbData.place_of_consignor}</span>
                )}
                {ewbData.place_of_consignor && ewbData.place_of_consignee && (
                  <span className="text-blue-400">→</span>
                )}
                {ewbData.place_of_consignee && (
                  <span className="text-blue-900 font-semibold">{ewbData.place_of_consignee}</span>
                )}
                {ewbData.transportation_distance && (
                  <span className="text-blue-600 text-[9px]">({ewbData.transportation_distance} km)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Number */}
        {ewbData.document_number && (
          <div className="flex items-start gap-1.5">
            <FileText className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Doc No.</p>
              <p className="text-[10px] text-slate-900 font-medium truncate">{ewbData.document_number}</p>
            </div>
          </div>
        )}

        {/* Document Type */}
        {ewbData.document_type && (
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Doc Type</p>
              <p className="text-[10px] text-slate-900 font-medium truncate">{ewbData.document_type}</p>
            </div>
          </div>
        )}

        {/* Transaction Type */}
        {ewbData.transaction_type && (
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Transaction</p>
              <p className="text-[10px] text-slate-900 font-medium truncate">{ewbData.transaction_type}</p>
            </div>
          </div>
        )}

        {/* Supply Type */}
        {ewbData.supply_type && (
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Supply</p>
              <p className="text-[10px] text-slate-900 font-medium truncate">{ewbData.supply_type}</p>
            </div>
          </div>
        )}

        {/* Sub Supply Type */}
        {ewbData.sub_supply_type && (
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Sub Supply</p>
              <p className="text-[10px] text-slate-900 font-medium truncate">{ewbData.sub_supply_type}</p>
            </div>
          </div>
        )}

        {/* Transporter ID */}
        {ewbData.transporter_id && (
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Transporter ID</p>
              <p className="font-mono text-[10px] text-slate-900 font-medium truncate">{ewbData.transporter_id}</p>
            </div>
          </div>
        )}

        {/* Transporter Name */}
        {ewbData.transporter_name && (
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase text-slate-400 font-medium">Transporter</p>
              <p className="text-[10px] text-slate-900 font-medium truncate">{ewbData.transporter_name}</p>
            </div>
          </div>
        )}

        {/* Tax Details */}
        {(ewbData.cgst_amount || ewbData.sgst_amount || ewbData.igst_amount) && (
          <div className="col-span-full">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold mb-2">Tax Breakdown</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {ewbData.taxable_amount && (
                  <div>
                    <span className="text-amber-600 font-medium">Taxable:</span>
                    <span className="ml-1 text-amber-900 font-semibold">₹{Number(ewbData.taxable_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {ewbData.cgst_amount > 0 && (
                  <div>
                    <span className="text-amber-600 font-medium">CGST:</span>
                    <span className="ml-1 text-amber-900 font-semibold">₹{Number(ewbData.cgst_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {ewbData.sgst_amount > 0 && (
                  <div>
                    <span className="text-amber-600 font-medium">SGST:</span>
                    <span className="ml-1 text-amber-900 font-semibold">₹{Number(ewbData.sgst_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {ewbData.igst_amount > 0 && (
                  <div>
                    <span className="text-amber-600 font-medium">IGST:</span>
                    <span className="ml-1 text-amber-900 font-semibold">₹{Number(ewbData.igst_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      )}
      
      {/* Cache Info */}
      {source === 'cache' && data.verificationDate && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-3">
          <Database className="w-3.5 h-3.5" />
          <span>
            Cached data • Validated: {new Date(data.verificationDate).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default EwbSuccessDetails;
