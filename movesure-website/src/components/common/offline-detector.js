'use client';

import { useState, useEffect } from 'react';

export default function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Function to update online status
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        setShowPopup(true);
      } else {
        // Hide popup when back online, but with a small delay to show "reconnected" message
        if (showPopup) {
          setTimeout(() => {
            setShowPopup(false);
          }, 2000);
        }
      }
    };

    // Set initial status
    updateOnlineStatus();

    // Add event listeners for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [showPopup]);

  // Don't render anything if user is online and popup is not shown
  if (isOnline && !showPopup) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        {/* Popup container */}
        <div className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-md w-full transform transition-all">
          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            {!isOnline ? (
              // Offline icon
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L5.636 18.364m0-12.728L18.364 18.364M12 6v6m0 4h.01" />
                </svg>
              </div>
            ) : (
              // Back online icon
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="text-center">
            <h3 className={`text-lg font-semibold mb-2 ${!isOnline ? 'text-red-600' : 'text-green-600'}`}>
              {!isOnline ? 'No Internet Connection' : 'Connection Restored'}
            </h3>
            <p className="text-gray-600 mb-4">
              {!isOnline 
                ? 'You are currently offline. Please check your internet connection and try again.'
                : 'Your internet connection has been restored. You can continue using the application.'
              }
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${!isOnline ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className={`w-3 h-3 rounded-full ${!isOnline ? 'bg-red-500' : 'bg-green-500'} ${!isOnline ? 'animate-pulse' : ''}`}></div>
              <span className={`text-sm font-medium ${!isOnline ? 'text-red-600' : 'text-green-600'}`}>
                {!isOnline ? 'Offline' : 'Online'}
              </span>
            </div>
          </div>

          {/* Close button - only show when back online */}
          {isOnline && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => setShowPopup(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
