import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Shield, Loader2, RefreshCw, Database, FileStack } from 'lucide-react';
import { 
  validateEwbNumber, 
  validateMultipleEwbNumbers, 
  getCachedValidation,
  formatEwbNumber,
  clearEwbCache,
  getCacheStats
} from '../../utils/ewbValidation';

const EwbValidationComponent = ({ 
  ewbNumbers = [], 
  ewbToGrMapping = {},
  onValidationComplete = null,
  showCacheControls = false,
  onConsolidateClick = null,
  className = ""
}) => {
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);

  // Update cache stats
  const updateCacheStats = useCallback(() => {
    setCacheStats(getCacheStats());
  }, []);

  // Validate single EWB
  const validateSingle = useCallback(async (ewbNumber) => {
    setIsValidating(true);
    
    try {
      const result = await validateEwbNumber(ewbNumber);
      
      setValidationResults(prev => ({
        ...prev,
        [ewbNumber]: result
      }));
      
      if (onValidationComplete) {
        onValidationComplete([{ ewbNumber, ...result }]);
      }
      
      updateCacheStats();
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [onValidationComplete, updateCacheStats]);

  // Validate all EWBs
  const validateAll = useCallback(async () => {
    if (ewbNumbers.length === 0) return;
    
    setIsValidating(true);
    setValidationProgress({ current: 0, total: ewbNumbers.length });
    
    try {
      // Process each EWB one by one for live updates
      const results = [];
      
      for (let i = 0; i < ewbNumbers.length; i++) {
        const ewbNumber = ewbNumbers[i];
        
        setValidationProgress({
          current: i + 1,
          total: ewbNumbers.length,
          ewbNumber: ewbNumber
        });
        
        const result = await validateEwbNumber(ewbNumber);
        results.push({ ewbNumber, ...result });
        
        // Update results immediately for live feedback
        setValidationResults(prev => ({
          ...prev,
          [ewbNumber]: result
        }));
        
        // Small delay to show the animation
        if (i < ewbNumbers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (onValidationComplete) {
        onValidationComplete(results);
      }
      
      updateCacheStats();
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
      setValidationProgress(null);
    }
  }, [ewbNumbers, onValidationComplete, updateCacheStats]);

  // Clear cache
  const handleClearCache = useCallback(() => {
    clearEwbCache();
    setValidationResults({});
    updateCacheStats();
  }, [updateCacheStats]);

  // Check for cached data
  const checkCachedData = useCallback(() => {
    const cachedResults = {};
    
    ewbNumbers.forEach(ewbNumber => {
      const cached = getCachedValidation(ewbNumber);
      if (cached) {
        cachedResults[ewbNumber] = {
          success: true,
          data: cached,
          source: 'cache'
        };
      }
    });
    
    setValidationResults(cachedResults);
    updateCacheStats();
  }, [ewbNumbers, updateCacheStats]);

  // Initialize cache stats and check for cached data on mount
  React.useEffect(() => {
    updateCacheStats();
    checkCachedData();
  }, [updateCacheStats, checkCachedData]);

  // Check if all EWBs are validated successfully
  const allValidated = useMemo(() => {
    if (ewbNumbers.length === 0) return false;
    return ewbNumbers.every(ewb => {
      const result = validationResults[ewb];
      return result && result.success === true;
    });
  }, [ewbNumbers, validationResults]);

  const getValidationIcon = (result) => {
    if (!result) return null;
    
    if (result.success) {
      return (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-700 font-medium">
            {result.source === 'cache' ? 'Cached' : 'Verified'}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-xs text-red-600 font-medium">
            {(result.error && typeof result.error === 'string' && result.error.includes('Wrong E-Way Bill number')) ? 'Invalid EWB' : 'Failed'}
          </span>
        </div>
      );
    }
  };

  const getValidationBadge = (ewbNumber) => {
    const result = validationResults[ewbNumber];
    
    if (!result) {
      return (
        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
          Not Validated
        </span>
      );
    }
    
    if (result.success) {
      return (
        <span className={`px-2 py-1 text-xs rounded ${
          result.source === 'cache' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {result.source === 'cache' ? 'Cached ✓' : 'Verified ✓'}
        </span>
      );
    } else {
      const isInvalidEWB = (result.error && typeof result.error === 'string' && result.error.includes('Wrong E-Way Bill number')) || 
                          (result.error && typeof result.error === 'string' && result.error.includes('Could not retrieve data'));
      return (
        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
          {isInvalidEWB ? 'Invalid EWB ✗' : 'Failed ✗'}
        </span>
      );
    }
  };

  if (ewbNumbers.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-600 text-sm">No EWB numbers to validate</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Control Panel */}
      <div className="flex items-center justify-between p-5 bg-white/80 backdrop-blur rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">EWB Validation & Consolidation</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {ewbNumbers.length} E-Way Bill{ewbNumbers.length !== 1 ? 's' : ''} found
              {allValidated && <span className="ml-2 text-green-600 font-medium">• All Validated ✓</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {cacheStats && showCacheControls && (
            <div className="flex items-center gap-2 text-xs text-slate-600 mr-2 px-3 py-2 bg-slate-100 rounded-lg">
              <Database className="w-4 h-4" />
              <span>Cache: {cacheStats.valid}/{cacheStats.total}</span>
            </div>
          )}
          
          {allValidated && ewbNumbers.length > 1 && onConsolidateClick && (
            <button
              onClick={onConsolidateClick}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2 shadow-sm"
            >
              <FileStack className="w-4 h-4" />
              Consolidate All ({ewbNumbers.length})
            </button>
          )}
          
          <button
            onClick={validateAll}
            disabled={isValidating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 shadow-sm"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {isValidating ? 'Validating...' : 'Validate All'}
          </button>
          
          {showCacheControls && (
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Clear Cache
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {validationProgress && (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                Validating EWB {validationProgress.current} of {validationProgress.total}
              </span>
            </div>
            <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              {Math.round((validationProgress.current / validationProgress.total) * 100)}%
            </span>
          </div>
          
          {validationProgress.ewbNumber && (
            <div className="mb-3 p-3 bg-white rounded-lg">
              <span className="text-sm text-blue-700 font-medium">Currently validating: </span>
              <span className="font-mono text-sm font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-lg ml-2">
                {formatEwbNumber(validationProgress.ewbNumber)}
              </span>
            </div>
          )}
          
          <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${(validationProgress.current / validationProgress.total) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* EWB List */}
      <div className="space-y-3">
        {ewbNumbers.map((ewbNumber, index) => {
          const result = validationResults[ewbNumber];
          const isCurrentlyValidating = isValidating && validationProgress?.ewbNumber === ewbNumber;
          const grMappings = ewbToGrMapping[ewbNumber] || [];
          
          return (
            <div 
              key={index}
              className={`p-5 border rounded-xl transition-all duration-300 shadow-sm ${
                result?.success 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                  : result?.success === false 
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                    : isCurrentlyValidating
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-base font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      {formatEwbNumber(ewbNumber)}
                    </span>
                    {isCurrentlyValidating && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-xs text-blue-800 font-semibold">Validating...</span>
                      </div>
                    )}
                    {!isCurrentlyValidating && getValidationIcon(result)}
                  </div>
                  
                  {/* Show GR Numbers */}
                  {grMappings.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-slate-600">GR No:</span>
                      {grMappings.map((mapping, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm"
                        >
                          {mapping.gr_no}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            mapping.source === 'bilty' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {mapping.source === 'bilty' ? 'regular' : 'manual'}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {getValidationBadge(ewbNumber)}
                  
                  <button
                    onClick={() => validateSingle(ewbNumber)}
                    disabled={isValidating}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isCurrentlyValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Validate'}
                  </button>
                </div>
              </div>
              
              {/* Show detailed validation data */}
              {result?.success && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      EWB Details
                    </span>
                  </div>
                  
                  {/* Debug: Show raw data structure */}
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mb-3">
                      <summary className="text-xs text-gray-500 cursor-pointer">Debug: Raw API Response</summary>
                      <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {result.data?.legal_name_of_consignor && (
                      <div className="col-span-1 md:col-span-2">
                        <span className="font-medium text-gray-700">Consignor:</span>
                        <span className="ml-2 text-gray-900 font-medium">{result.data.legal_name_of_consignor}</span>
                      </div>
                    )}
                    {result.data?.total_invoice_value && (
                      <div>
                        <span className="font-medium text-gray-700">Invoice Value:</span>
                        <span className="ml-2 text-gray-900 font-semibold">₹{Number(result.data.total_invoice_value).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {result.data?.userGstin && (
                      <div>
                        <span className="font-medium text-gray-700">GSTIN:</span>
                        <span className="ml-2 text-gray-900 font-mono bg-gray-100 px-1 rounded">{result.data.userGstin}</span>
                      </div>
                    )}
                    {result.data?.doc_date && (
                      <div>
                        <span className="font-medium text-gray-700">Doc Date:</span>
                        <span className="ml-2 text-gray-900">{result.data.doc_date}</span>
                      </div>
                    )}
                    {result.data?.from_place && (
                      <div>
                        <span className="font-medium text-gray-700">From:</span>
                        <span className="ml-2 text-gray-900">{result.data.from_place}</span>
                      </div>
                    )}
                    {result.data?.to_place && (
                      <div>
                        <span className="font-medium text-gray-700">To:</span>
                        <span className="ml-2 text-gray-900">{result.data.to_place}</span>
                      </div>
                    )}
                    {result.data?.vehicle_no && (
                      <div>
                        <span className="font-medium text-gray-700">Vehicle:</span>
                        <span className="ml-2 text-gray-900 font-mono bg-gray-100 px-1 rounded">{result.data.vehicle_no}</span>
                      </div>
                    )}
                    {result.data?.status && (
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          result.data.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.data.status}
                        </span>
                      </div>
                    )}
                    
                    {/* Show any additional fields that might be in the response */}
                    {result.data && Object.keys(result.data).length > 0 && (
                      <div className="col-span-1 md:col-span-2 mt-2">
                        <div className="text-xs text-gray-600 space-y-1">
                          {Object.entries(result.data).map(([key, value]) => {
                            // Skip fields we've already displayed
                            if (['legal_name_of_consignor', 'total_invoice_value', 'userGstin', 'doc_date', 'from_place', 'to_place', 'vehicle_no', 'status', 'verified', 'verificationDate', 'timestamp', 'ewbNumber'].includes(key)) {
                              return null;
                            }
                            
                            if (value && value !== '' && value !== null && value !== undefined) {
                              return (
                                <div key={key} className="flex">
                                  <span className="font-medium text-gray-600 min-w-[100px]">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                  </span>
                                  <span className="ml-2 text-gray-800">{String(value)}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {result.source === 'cache' && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 border-t pt-2">
                      <Database className="w-3 h-3" />
                      <span>Data from cache • Validated: {result.data?.verificationDate ? new Date(result.data.verificationDate).toLocaleString() : 'Unknown'}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Show error details */}
              {result?.success === false && result?.error && (
                <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800 font-medium">
                      {(result.error && typeof result.error === 'string' && result.error.includes('Wrong E-Way Bill number')) ? 'Invalid E-Way Bill Number' : 'Validation Failed'}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">{result.error}</p>
                  
                  {/* Show debug info for invalid EWB */}
                  {result.data?.data?.results && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                      <div className="space-y-1">
                        {result.data.data.results.code && (
                          <div>
                            <span className="font-medium">Error Code:</span>
                            <span className="ml-2">{result.data.data.results.code}</span>
                          </div>
                        )}
                        {result.data.data.results.nic_code && (
                          <div>
                            <span className="font-medium">NIC Code:</span>
                            <span className="ml-2">{result.data.data.results.nic_code}</span>
                          </div>
                        )}
                        {result.data.data.results.status && (
                          <div>
                            <span className="font-medium">Status:</span>
                            <span className="ml-2">{result.data.data.results.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation Results Summary */}
      {Object.keys(validationResults).length > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Validation Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {Object.values(validationResults).filter(r => r.success).length}
              </div>
              <div className="text-gray-600">Validated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {Object.values(validationResults).filter(r => !r.success).length}
              </div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {Object.values(validationResults).filter(r => r.source === 'cache').length}
              </div>
              <div className="text-gray-600">From Cache</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EwbValidationComponent;