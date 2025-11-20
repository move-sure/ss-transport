import React, { useState, useCallback, useMemo } from 'react';
import { Shield, Loader2, Database, FileStack } from 'lucide-react';
import { 
  validateEwbNumber, 
  validateMultipleEwbNumbers, 
  getCachedValidation,
  formatEwbNumber,
  getCacheStats
} from '../../utils/ewbValidation';
import { 
  saveEwbValidation, 
  saveEwbValidationsBulk 
} from '../../utils/ewbValidationStorage';
import { useAuth } from '../../app/utils/auth';
import EWBPDFGenerator from './ewb-pdf-generator';
import EwbValidationCard from './ewb-validation-card';

const EwbValidationComponent = ({ 
  ewbNumbers = [], 
  ewbToGrMapping = {},
  challanNo = null,
  onValidationComplete = null,
  showCacheControls = false,
  onConsolidateClick = null,
  className = ""
}) => {
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [selectedEwbForPrint, setSelectedEwbForPrint] = useState(null);
  
  // Get current user from auth context
  const { user: currentUser } = useAuth();

  // Update cache stats
  const updateCacheStats = useCallback(() => {
    setCacheStats(getCacheStats());
  }, []);

  // Fetch validation history from database
  const fetchValidationHistory = useCallback(async () => {
    if (ewbNumbers.length === 0) return;

    try {
      console.log('🔄 Fetching validation history from database...');
      const { getEwbValidationsByNumbers } = await import('../../utils/ewbValidationStorage');
      const { success, data } = await getEwbValidationsByNumbers(ewbNumbers);

      if (success && data) {
        const results = {};
        Object.keys(data).forEach(ewbNumber => {
          const validation = data[ewbNumber];
          results[ewbNumber] = {
            success: validation.is_valid,
            data: validation.raw_result_metadata?.data || validation.raw_result_metadata,
            error: validation.error_message,
            source: 'database'
          };
        });

        setValidationResults(prev => ({ ...prev, ...results }));
        console.log('✅ Loaded', Object.keys(results).length, 'validations from database');
      }
    } catch (error) {
      console.error('❌ Error fetching validation history:', error);
    }
  }, [ewbNumbers]);

  // Validate single EWB
  const validateSingle = useCallback(async (ewbNumber) => {
    setIsValidating(true);
    
    try {
      const result = await validateEwbNumber(ewbNumber);
      
      setValidationResults(prev => ({
        ...prev,
        [ewbNumber]: result
      }));

      // Save to database (in background, don't wait)
      if (currentUser?.id && challanNo) {
        const grMappings = ewbToGrMapping[ewbNumber] || [];
        const grNo = grMappings.length > 0 ? grMappings[0].gr_no : null;
        
        saveEwbValidation({
          challanNo,
          grNo,
          ewbNumber,
          validationResult: result,
          userId: currentUser.id
        }).then(saveResult => {
          if (saveResult.success) {
            console.log('✅ EWB validation saved to database:', ewbNumber);
          } else {
            console.error('❌ Failed to save EWB validation:', saveResult.error);
          }
        }).catch(err => console.error('❌ Save error:', err));
      }
      
      if (onValidationComplete) {
        onValidationComplete([{ ewbNumber, ...result }]);
      }
      
      updateCacheStats();
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [onValidationComplete, updateCacheStats, currentUser, challanNo, ewbToGrMapping]);

  // Validate all EWBs
  const validateAll = useCallback(async () => {
    if (ewbNumbers.length === 0) return;
    
    setIsValidating(true);
    setValidationProgress({ current: 0, total: ewbNumbers.length });
    
    try {
      // Process each EWB one by one for live updates
      const results = [];
      const validationsToSave = [];
      
      for (let i = 0; i < ewbNumbers.length; i++) {
        const ewbNumber = ewbNumbers[i];
        
        setValidationProgress({
          current: i + 1,
          total: ewbNumbers.length,
          ewbNumber: ewbNumber
        });
        
        const result = await validateEwbNumber(ewbNumber);
        results.push({ ewbNumber, ...result });
        
        // Prepare validation data for bulk save
        if (currentUser?.id && challanNo) {
          const grMappings = ewbToGrMapping[ewbNumber] || [];
          const grNo = grMappings.length > 0 ? grMappings[0].gr_no : null;
          
          validationsToSave.push({
            grNo,
            ewbNumber,
            validationResult: result
          });
        }
        
        // Update results immediately for live feedback
        setValidationResults(prev => ({
          ...prev,
          [ewbNumber]: result
        }));
      }

      // Save all validations to database in bulk (in background, don't wait)
      if (currentUser?.id && challanNo && validationsToSave.length > 0) {
        saveEwbValidationsBulk({
          challanNo,
          validations: validationsToSave,
          userId: currentUser.id
        }).catch(err => console.error('Background save failed:', err));
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
  }, [ewbNumbers, onValidationComplete, updateCacheStats, currentUser, challanNo, ewbToGrMapping]);

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

  // Initialize: fetch from database first, then check cache
  React.useEffect(() => {
    updateCacheStats();
    fetchValidationHistory(); // Fetch from database first
    checkCachedData(); // Then check cache for any additional data
  }, [updateCacheStats, fetchValidationHistory, checkCachedData]);

  // Check if all EWBs are validated successfully
  const allValidated = useMemo(() => {
    if (ewbNumbers.length === 0) return false;
    return ewbNumbers.every(ewb => {
      const result = validationResults[ewb];
      return result && result.success === true;
    });
  }, [ewbNumbers, validationResults]);

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
          
          {ewbNumbers.length > 1 && onConsolidateClick && (
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
            <EwbValidationCard
              key={index}
              ewbNumber={ewbNumber}
              result={result}
              isValidating={isCurrentlyValidating}
              grMappings={grMappings}
              onValidate={() => validateSingle(ewbNumber)}
              onPrint={() => setSelectedEwbForPrint(result)}
            />
          );
        })}
      </div>



      {/* EWB PDF Generator Modal */}
      {selectedEwbForPrint && (
        <EWBPDFGenerator
          ewbData={selectedEwbForPrint}
          onClose={() => setSelectedEwbForPrint(null)}
        />
      )}
    </div>
  );
};

export default EwbValidationComponent;