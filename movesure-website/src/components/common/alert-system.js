'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';

// Global alert state management
let alertQueue = [];
let setAlertsCallback = null;

export const showAlert = (message, type = 'info', duration = 5000) => {
  const alert = {
    id: Date.now() + Math.random(),
    message,
    type,
    duration,
    timestamp: Date.now()
  };
  
  alertQueue.push(alert);
  
  if (setAlertsCallback) {
    setAlertsCallback([...alertQueue]);
  }
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeAlert(alert.id);
    }, duration);
  }
  
  return alert.id;
};

const removeAlert = (id) => {
  alertQueue = alertQueue.filter(alert => alert.id !== id);
  if (setAlertsCallback) {
    setAlertsCallback([...alertQueue]);
  }
};

// Custom alert function to replace browser alert
export const customAlert = (message, type = 'error') => {
  return showAlert(message, type, type === 'error' ? 8000 : 5000);
};

// Alert validation function - returns first error or null
export const validateFormFields = (formData, user) => {
  // Debug logging to see what we're validating
  console.log('🔍 Validation Debug - Full FormData:', formData);
  
  // Enhanced field validation with proper null/undefined/empty handling
  const isValidString = (value) => {
    return value !== null && 
           value !== undefined && 
           value !== '' && 
           typeof value === 'string' && 
           value.trim().length > 0;
  };
  
  const isValidNonEmptyValue = (value) => {
    return value !== null && 
           value !== undefined && 
           value !== '' && 
           String(value).trim().length > 0;
  };
  
  console.log('🔍 Field Validation Results:', {
    gr_no: {
      value: formData.gr_no,
      type: typeof formData.gr_no,
      isValid: isValidNonEmptyValue(formData.gr_no)
    },
    consignor_name: {
      value: formData.consignor_name,
      type: typeof formData.consignor_name,
      isValid: isValidString(formData.consignor_name)
    },
    consignee_name: {
      value: formData.consignee_name,
      type: typeof formData.consignee_name,
      isValid: isValidString(formData.consignee_name)
    },
    to_city_id: {
      value: formData.to_city_id,
      type: typeof formData.to_city_id,
      isValid: !!formData.to_city_id
    }
  });

  const validations = [
    { 
      condition: !isValidNonEmptyValue(formData.gr_no), 
      message: 'GR Number is required',
      field: 'gr_no'
    },
    { 
      condition: !isValidString(formData.consignor_name), 
      message: 'Consignor name is required',
      field: 'consignor_name'
    },
    { 
      condition: !isValidString(formData.consignee_name), 
      message: 'Consignee name is required',
      field: 'consignee_name'
    },
    { 
      condition: !formData.to_city_id, 
      message: 'Destination city is required',
      field: 'to_city_id'
    },
    { 
      condition: !user?.branch_id, 
      message: 'Branch information is missing. Please login again.',
      field: 'user.branch_id'
    }
  ];
  
  for (const validation of validations) {
    if (validation.condition) {
      console.log('❌ Validation failed for field:', validation.field);
      console.log('❌ Field value:', formData[validation.field.replace('user.', '')]);
      console.log('❌ Error message:', validation.message);
      return validation.message;
    }
  }
  
  console.log('✅ All validations passed');
  return null;
};

const AlertSystem = () => {
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    setAlertsCallback = setAlerts;
    setAlerts([...alertQueue]);
    
    return () => {
      setAlertsCallback = null;
    };
  }, []);
  
  const getAlertIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };
  
  const getAlertStyles = (type) => {
    const baseStyles = "border-l-4 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-300 transform";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50/95 border-green-500 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50/95 border-red-500 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50/95 border-yellow-500 text-yellow-800`;
      default:
        return `${baseStyles} bg-blue-50/95 border-blue-500 text-blue-800`;
    }
  };
  
  if (alerts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md w-full">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`${getAlertStyles(alert.type)} animate-in slide-in-from-right-full`}
        >
          <div className="flex items-start p-4">
            <div className="flex-shrink-0 mr-3">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5 break-words">
                {alert.message}
              </p>
            </div>
            <button
              onClick={() => removeAlert(alert.id)}
              className="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress bar for timed alerts */}
          {alert.duration > 0 && (
            <div className="h-1 bg-black/10 overflow-hidden">
              <div 
                className="h-full bg-current opacity-30 animate-pulse"
                style={{
                  animation: `shrink ${alert.duration}ms linear forwards`
                }}
              />
            </div>
          )}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        @keyframes slide-in-from-right-full {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-in {
          animation-duration: 0.3s;
          animation-timing-function: ease-out;
        }
        
        .slide-in-from-right-full {
          animation-name: slide-in-from-right-full;
        }
      `}</style>
    </div>
  );
};

export default AlertSystem;
