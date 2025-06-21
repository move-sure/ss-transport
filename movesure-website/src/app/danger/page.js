'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import BillBookEditor from '../../components/danger/danger-helper';
import { AlertTriangle, Shield, Database } from 'lucide-react';

export default function DangerPage() {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  const handleAcceptWarning = () => {
    setHasAccepted(true);
    setShowWarning(false);
  };

  if (showWarning && !hasAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <AlertTriangle className="w-20 h-20 text-red-600 mx-auto mb-4 animate-pulse" />
            <h1 className="text-3xl font-bold text-red-900 mb-4">🚨 DANGER ZONE 🚨</h1>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6" />
                Critical System Data Warning
              </h2>
              <div className="text-left space-y-3 text-red-700">
                <p className="font-medium">⚠️ You are about to access bill book management settings!</p>
                <div className="bg-red-100 p-4 rounded-lg">
                  <p className="font-semibold mb-2">CRITICAL WARNING:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Current Number</strong> - Modifying this will affect ALL future bill generations</li>
                    <li>Incorrect values can create duplicate or invalid bill numbers</li>
                    <li>This can disrupt the entire billing system and cause audit issues</li>
                    <li>Changes are IRREVERSIBLE and can affect business operations</li>
                  </ul>
                </div>
                <p className="font-semibold text-red-800">
                  Only proceed if you are absolutely certain about the changes you need to make!
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel & Go Back
            </button>
            <button
              onClick={handleAcceptWarning}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              I Understand the Risks - Proceed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with warning banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-6 mb-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-12 h-12 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold mb-2">Bill Book Management - DANGER ZONE</h1>
              <p className="text-red-100">
                Critical system configuration area. Changes here affect the entire billing system.
              </p>
            </div>
          </div>
        </div>

        {/* Safety reminder banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="text-yellow-800 font-medium">
                Remember: The <strong>Current Number</strong> field determines the next bill number to be generated.
                Double-check all values before saving!
              </p>
            </div>
          </div>
        </div>

        {/* Bill Book Editor Component */}
        <BillBookEditor />
      </div>
    </div>
  );
}
