import React from 'react';
import { CheckCircle, AlertTriangle, Loader2, Printer } from 'lucide-react';
import { formatEwbNumber } from '../../utils/ewbValidation';
import EwbSuccessDetails from './ewb-success-details';
import EwbErrorDetails from './ewb-error-details';

const EwbValidationCard = ({ 
  ewbNumber, 
  result, 
  isValidating, 
  grMappings = [],
  onValidate,
  onPrint 
}) => {
  const getStatusIcon = () => {
    if (isValidating) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs text-blue-800 font-semibold">Validating...</span>
        </div>
      );
    }
    
    if (!result) {
      return (
        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
          Not Validated
        </span>
      );
    }
    
    if (result.success) {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className={`text-xs font-semibold ${
            result.source === 'cache' ? 'text-blue-700' : 'text-green-700'
          }`}>
            {result.source === 'cache' ? 'Cached' : 'Verified'}
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span className="text-xs font-semibold text-red-600">Failed</span>
      </div>
    );
  };

  const getCardStyles = () => {
    if (result?.success) {
      return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-md';
    }
    if (result?.success === false) {
      return 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-md';
    }
    if (isValidating) {
      return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200';
    }
    return 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md';
  };

  return (
    <div className={`p-4 border rounded-xl transition-all duration-300 shadow-sm ${getCardStyles()}`}>
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          {/* EWB Number and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
              {formatEwbNumber(ewbNumber)}
            </span>
            {getStatusIcon()}
          </div>
          
          {/* GR Numbers */}
          {grMappings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">GR No:</span>
              {grMappings.map((mapping, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 shadow-sm"
                >
                  {mapping.gr_no}
                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                    mapping.source === 'bilty' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {mapping.source === 'bilty' ? 'reg' : 'man'}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={onValidate}
            disabled={isValidating}
            className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Validate EWB"
          >
            {isValidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              'Validate'
            )}
          </button>
          
          {result?.success && (
            <button
              onClick={onPrint}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1"
              title="Print E-Way Bill"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          )}
        </div>
      </div>
      
      {/* Validation Details */}
      {result?.success && (
        <div className="mt-3 p-3 bg-white/80 backdrop-blur rounded-lg border border-green-200 shadow-sm">
          <EwbSuccessDetails data={result.data} source={result.source} />
        </div>
      )}
      
      {result?.success === false && (
        <div className="mt-3 p-3 bg-white/80 backdrop-blur rounded-lg border border-red-200 shadow-sm">
          <EwbErrorDetails error={result.error} data={result.data} />
        </div>
      )}
    </div>
  );
};

export default EwbValidationCard;
