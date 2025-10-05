'use client';

import React from 'react';
import { FileText, BarChart3, Download, TrendingUp } from 'lucide-react';

export default function ReportsHeader({ user }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-2xl p-8 mb-8 border border-blue-300">
      <div className="flex flex-col lg:flex-row items-center justify-between">
        {/* Left Section */}
        <div className="text-center lg:text-left mb-6 lg:mb-0">
          <div className="inline-flex items-center justify-center lg:justify-start w-16 h-16 bg-white bg-opacity-20 rounded-2xl mb-4 backdrop-blur-sm">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Reports Dashboard</h1>
          <p className="text-blue-100 text-lg font-medium mb-1">
            Generate and Download Comprehensive Reports
          </p>
          <p className="text-blue-200 text-sm">
            Export your data in professional PDF format
          </p>
          
          {/* User Info */}
          {user && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <p className="text-blue-100 text-sm">
                Logged in as <span className="font-semibold text-white">{user.username}</span>
              </p>
            </div>
          )}
        </div>

        {/* Right Section - Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-20 hover:bg-opacity-20 transition-all">
            <FileText className="h-6 w-6 text-white mx-auto mb-2" />
            <p className="text-white text-xs font-bold">Multiple</p>
            <p className="text-blue-200 text-xs mt-1">Reports</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-20 hover:bg-opacity-20 transition-all">
            <Download className="h-6 w-6 text-white mx-auto mb-2" />
            <p className="text-white text-xs font-bold">Instant</p>
            <p className="text-blue-200 text-xs mt-1">Download</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 text-center border border-white border-opacity-20 hover:bg-opacity-20 transition-all">
            <TrendingUp className="h-6 w-6 text-white mx-auto mb-2" />
            <p className="text-white text-xs font-bold">Real-time</p>
            <p className="text-blue-200 text-xs mt-1">Data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
