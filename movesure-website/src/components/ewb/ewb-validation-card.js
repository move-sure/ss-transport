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
      const sourceLabel = result.source === 'cache' ? 'Cached' : 
                         result.source === 'database' ? 'Saved' : 'Verified';
      const sourceColor = result.source === 'database' ? 'text-purple-700' :
                         result.source === 'cache' ? 'text-blue-700' : 'text-green-700';
      
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className={`text-xs font-semibold ${sourceColor}`}>
            {sourceLabel}
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
    <div className={`p-3 border rounded-lg transition-all duration-300 shadow-sm ${getCardStyles()}`}>
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: EWB Number, Status, and GR Numbers in one line */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* EWB Number - Large and Prominent */}
          <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg px-3 py-1.5">
            <span className="text-[10px] uppercase text-blue-600 font-bold">EWB:</span>
            <span className="font-mono text-base font-bold text-blue-900">
              {formatEwbNumber(ewbNumber)}
            </span>
          </div>
          
          {getStatusIcon()}
          
          {/* GR Numbers - Large and Prominent */}
          {grMappings.length > 0 && (
            <div className="flex items-center gap-2 bg-green-50 border-2 border-green-300 rounded-lg px-3 py-1.5">
              <span className="text-[10px] uppercase text-green-700 font-bold">GR:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {grMappings.map((mapping, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-green-300 rounded font-mono text-sm font-bold text-slate-900 shadow-sm"
                  >
                    {mapping.gr_no}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      mapping.source === 'bilty' 
                        ? 'bg-green-200 text-green-800' 
                        : 'bg-blue-200 text-blue-800'
                    }`}>
                      {mapping.source === 'bilty' ? 'R' : 'M'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onValidate}
            disabled={isValidating}
            className="px-2.5 py-1 text-[10px] font-medium bg-slate-700 hover:bg-slate-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Validate EWB"
          >
            {isValidating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              'Validate'
            )}
          </button>
          
          {result?.success && (
            <button
              onClick={onPrint}
              className="px-2.5 py-1 text-[10px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
              title="Print E-Way Bill"
            >
              <Printer className="w-3 h-3" />
              Print
            </button>
          )}
        </div>
      </div>
      
      {/* Compact Validation Details */}
      {result?.success && (
        <div className="mt-2 p-2 bg-white/80 backdrop-blur rounded border border-green-200 text-[10px]">
          <EwbSuccessDetails data={result.data} source={result.source} />
        </div>
      )}
      
      {result?.success === false && (
        <div className="mt-2 p-2 bg-white/80 backdrop-blur rounded border border-red-200 text-[10px]">
          <EwbErrorDetails error={result.error} data={result.data} />
        </div>
      )}
    </div>
  );
};

export default EwbValidationCard;
