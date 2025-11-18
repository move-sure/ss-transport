import React from 'react';
import { AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';

const EwbErrorDetails = ({ error, data }) => {
  if (!error) return null;

  // Check if it's an invalid EWB number error
  const isInvalidEwb = typeof error === 'string' && 
    (error.includes('Wrong E-Way Bill number') || error.includes('Could not retrieve data'));

  // Extract error details from nested data structure
  const errorDetails = data?.data?.results || {};
  const hasErrorDetails = Object.keys(errorDetails).length > 0;

  return (
    <div className="space-y-3">
      {/* Error Header */}
      <div className="flex items-start gap-2 pb-2 border-b border-red-200">
        {isInvalidEwb ? (
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-700">
            {isInvalidEwb ? 'Invalid E-Way Bill Number' : 'Validation Failed'}
          </h4>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      </div>

      {/* Error Details */}
      {hasErrorDetails && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Error Details</span>
          </div>
          
          <div className="space-y-1.5 text-xs">
            {errorDetails.code && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium min-w-[80px]">Error Code:</span>
                <span className="text-red-800 font-mono bg-red-100 px-2 py-0.5 rounded border border-red-200">
                  {errorDetails.code}
                </span>
              </div>
            )}
            
            {errorDetails.nic_code && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium min-w-[80px]">NIC Code:</span>
                <span className="text-red-800 font-mono bg-red-100 px-2 py-0.5 rounded border border-red-200">
                  {errorDetails.nic_code}
                </span>
              </div>
            )}
            
            {errorDetails.status && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium min-w-[80px]">Status:</span>
                <span className="text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                  {errorDetails.status}
                </span>
              </div>
            )}

            {errorDetails.message && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium min-w-[80px]">Message:</span>
                <span className="text-red-800">{errorDetails.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="text-xs font-semibold text-amber-700 mb-1">Suggested Actions:</h5>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              {isInvalidEwb ? (
                <>
                  <li>Verify the E-Way Bill number is entered correctly</li>
                  <li>Check if the EWB has been generated on the GST portal</li>
                  <li>Ensure the EWB is not expired or cancelled</li>
                </>
              ) : (
                <>
                  <li>Check your internet connection and try again</li>
                  <li>Verify the E-Way Bill number format</li>
                  <li>Contact support if the issue persists</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EwbErrorDetails;
