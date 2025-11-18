import React from 'react';
import { CheckCircle, MapPin, FileText, Truck, Calendar, User, DollarSign, Hash, Database, ChevronDown } from 'lucide-react';

const EwbSuccessDetails = ({ data, source }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  
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

      {/* Main Details Grid */}
      {isExpanded && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {/* Consignor */}
        {ewbData.legal_name_of_consignor && (
          <div className="col-span-full">
            <InfoRow 
              icon={User} 
              label="Consignor" 
              value={ewbData.legal_name_of_consignor}
            />
            {ewbData.address1_of_consignor && (
              <p className="text-xs text-slate-600 mt-1 ml-5">{ewbData.address1_of_consignor}</p>
            )}
          </div>
        )}

        {/* Consignee */}
        {ewbData.legal_name_of_consignee && (
          <div className="col-span-full">
            <InfoRow 
              icon={User} 
              label="Consignee" 
              value={ewbData.legal_name_of_consignee}
            />
            {ewbData.address1_of_consignee && (
              <p className="text-xs text-slate-600 mt-1 ml-5">{ewbData.address1_of_consignee}</p>
            )}
          </div>
        )}

        {/* Consignor GSTIN */}
        {ewbData.gstin_of_consignor && (
          <InfoRow 
            icon={Hash} 
            label="Consignor GSTIN" 
            value={
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {ewbData.gstin_of_consignor}
              </span>
            }
          />
        )}

        {/* Consignee GSTIN */}
        {ewbData.gstin_of_consignee && (
          <InfoRow 
            icon={Hash} 
            label="Consignee GSTIN" 
            value={
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {ewbData.gstin_of_consignee}
              </span>
            }
          />
        )}

        {/* Invoice Value */}
        {ewbData.total_invoice_value && (
          <InfoRow 
            icon={DollarSign} 
            label="Invoice Value" 
            value={`₹${Number(ewbData.total_invoice_value).toLocaleString('en-IN')}`}
          />
        )}

        {/* Document Date */}
        {ewbData.document_date && (
          <InfoRow 
            icon={Calendar} 
            label="Document Date" 
            value={ewbData.document_date}
          />
        )}

        {/* E-Way Bill Date */}
        {ewbData.eway_bill_date && (
          <InfoRow 
            icon={Calendar} 
            label="E-Way Bill Date" 
            value={ewbData.eway_bill_date}
          />
        )}

        {/* E-Way Bill Number */}
        {ewbData.eway_bill_number && (
          <InfoRow 
            icon={FileText} 
            label="E-Way Bill Number" 
            value={
              <span className="font-mono text-xs font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200 text-blue-900">
                {ewbData.eway_bill_number}
              </span>
            }
          />
        )}

        {/* Route Information */}
        {(ewbData.place_of_consignor || ewbData.place_of_consignee) && (
          <div className="col-span-full">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
              <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {ewbData.place_of_consignor && (
                  <span className="text-blue-900 font-medium">{ewbData.place_of_consignor}</span>
                )}
                {ewbData.place_of_consignor && ewbData.place_of_consignee && (
                  <span className="text-blue-400">→</span>
                )}
                {ewbData.place_of_consignee && (
                  <span className="text-blue-900 font-medium">{ewbData.place_of_consignee}</span>
                )}
                {ewbData.transportation_distance && (
                  <span className="text-blue-700 text-xs">({ewbData.transportation_distance} km)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Number */}
        {ewbData.document_number && (
          <InfoRow 
            icon={FileText} 
            label="Document No." 
            value={ewbData.document_number}
          />
        )}

        {/* Document Type */}
        {ewbData.document_type && (
          <InfoRow 
            label="Document Type" 
            value={ewbData.document_type}
          />
        )}

        {/* Transaction Type */}
        {ewbData.transaction_type && (
          <InfoRow 
            label="Transaction Type" 
            value={ewbData.transaction_type}
          />
        )}

        {/* Supply Type */}
        {ewbData.supply_type && (
          <InfoRow 
            label="Supply Type" 
            value={ewbData.supply_type}
          />
        )}

        {/* Sub Supply Type */}
        {ewbData.sub_supply_type && (
          <InfoRow 
            label="Sub Supply Type" 
            value={ewbData.sub_supply_type}
          />
        )}

        {/* Transporter ID */}
        {ewbData.transporter_id && (
          <InfoRow 
            label="Transporter ID" 
            value={
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {ewbData.transporter_id}
              </span>
            }
          />
        )}

        {/* Transporter Name */}
        {ewbData.transporter_name && (
          <InfoRow 
            label="Transporter Name" 
            value={ewbData.transporter_name}
          />
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
