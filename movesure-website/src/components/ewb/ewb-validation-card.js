import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Printer, Code, X, Copy, Check, Calendar, Clock } from 'lucide-react';
import { formatEwbNumber } from '../../utils/ewbValidation';
import EwbSuccessDetails from './ewb-success-details';
import EwbErrorDetails from './ewb-error-details';

// Helper to extract EWB data from nested response structure
const extractEwbData = (data) => {
  if (!data) return null;
  if (data.data?.results?.message) return data.data.results.message;
  if (data.results?.message) return data.results.message;
  if (data.message && typeof data.message === 'object') return data.message;
  return data;
};

// Helper to check if validity date is expired or close to expiry
const getValidityStatus = (validDateStr) => {
  if (!validDateStr) return null;
  try {
    // Parse DD/MM/YYYY HH:MM:SS AM/PM
    const parts = validDateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i);
    if (!parts) return null;
    let [, dd, mm, yyyy, hh, min, ss, ampm] = parts;
    hh = parseInt(hh);
    if (ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12;
    if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
    const validDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), hh, parseInt(min), parseInt(ss));
    const now = new Date();
    const diffMs = validDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffMs < 0) return { status: 'expired', label: 'Expired', color: 'red' };
    if (diffHours <= 8) return { status: 'expiring', label: `Expires in ${Math.ceil(diffHours)}h`, color: 'amber' };
    if (diffHours <= 24) return { status: 'today', label: `${Math.ceil(diffHours)}h left`, color: 'orange' };
    return { status: 'valid', label: `${Math.ceil(diffHours / 24)}d left`, color: 'green' };
  } catch { return null; }
};

const EwbValidationCard = ({ 
  ewbNumber, 
  result, 
  isValidating, 
  grMappings = [],
  onValidate,
  onPrint 
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract validity info from result data
  const ewbInfo = useMemo(() => {
    if (!result?.data) return null;
    const ewbData = extractEwbData(result.data);
    if (!ewbData || typeof ewbData !== 'object') return null;
    return {
      validDate: ewbData.eway_bill_valid_date || null,
      ewbDate: ewbData.eway_bill_date || null,
      status: ewbData.eway_bill_status || null,
      distance: ewbData.transportation_distance || null,
      extendedTimes: ewbData.extended_times ?? null,
      validDays: ewbData.number_of_valid_days || null,
    };
  }, [result?.data]);

  const validityStatus = useMemo(() => getValidityStatus(ewbInfo?.validDate), [ewbInfo?.validDate]);

  const rawJson = useMemo(() => {
    if (!result?.data) return null;
    try {
      return JSON.stringify(result.data, null, 2);
    } catch { return 'Unable to serialize data'; }
  }, [result?.data]);

  const handleCopyRaw = async () => {
    if (!rawJson) return;
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
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
          {/* Raw JSON button */}
          {result?.data && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors flex items-center gap-1 ${
                showRaw
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-300'
              }`}
              title="View Raw API Response"
            >
              <Code className="w-3 h-3" />
              Raw
            </button>
          )}

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

      {/* Validity Date Banner - shown when we have validity info */}
      {result?.success && ewbInfo?.validDate && (
        <div className={`mt-2 flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg border ${
          validityStatus?.color === 'red'
            ? 'bg-red-50 border-red-200'
            : validityStatus?.color === 'amber'
            ? 'bg-amber-50 border-amber-200'
            : validityStatus?.color === 'orange'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <Calendar className={`w-3.5 h-3.5 ${
              validityStatus?.color === 'red' ? 'text-red-500' :
              validityStatus?.color === 'amber' ? 'text-amber-500' :
              validityStatus?.color === 'orange' ? 'text-orange-500' :
              'text-emerald-500'
            }`} />
            <span className="text-[10px] uppercase font-bold text-slate-500">Valid Upto:</span>
            <span className={`text-xs font-bold ${
              validityStatus?.color === 'red' ? 'text-red-700' :
              validityStatus?.color === 'amber' ? 'text-amber-700' :
              validityStatus?.color === 'orange' ? 'text-orange-700' :
              'text-emerald-700'
            }`}>
              {ewbInfo.validDate}
            </span>
          </div>
          {validityStatus && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              validityStatus.color === 'red'
                ? 'bg-red-100 text-red-700 border border-red-200'
                : validityStatus.color === 'amber'
                ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                : validityStatus.color === 'orange'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}>
              <Clock className="w-3 h-3" />
              {validityStatus.label}
            </span>
          )}
          {ewbInfo.extendedTimes != null && ewbInfo.extendedTimes > 0 && (
            <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold border border-purple-200">
              Extended {ewbInfo.extendedTimes}x
            </span>
          )}
          {ewbInfo.distance && (
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold border border-blue-200">
              {ewbInfo.distance} km
            </span>
          )}
          {ewbInfo.validDays && (
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium border border-slate-200">
              {ewbInfo.validDays} day{ewbInfo.validDays !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      
      {/* Compact Validation Details */}
      {result?.success && (
        <div className="mt-2 p-2 bg-white/80 backdrop-blur rounded border border-green-200 text-[10px]">
          <EwbSuccessDetails 
            data={result.data} 
            source={result.source}
            autoCollapse={result.source === 'api'}
          />
        </div>
      )}
      
      {result?.success === false && (
        <div className="mt-2 p-2 bg-white/80 backdrop-blur rounded border border-red-200 text-[10px]">
          <EwbErrorDetails error={result.error} data={result.data} />
        </div>
      )}

      {/* Raw JSON Viewer */}
      {showRaw && rawJson && (
        <div className="mt-2 rounded-lg border border-violet-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-violet-50 border-b border-violet-200">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-xs font-bold text-violet-800">Raw API Response</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded font-mono border border-violet-200">
                JSON
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyRaw}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-white hover:bg-violet-100 text-violet-700 rounded border border-violet-200 transition-colors"
                title="Copy JSON"
              >
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setShowRaw(false)}
                className="p-1 text-violet-500 hover:text-violet-700 hover:bg-violet-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-auto bg-slate-900 p-3">
            <pre className="text-[11px] leading-relaxed text-slate-100 font-mono whitespace-pre-wrap break-words">
              {rawJson}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default EwbValidationCard;
