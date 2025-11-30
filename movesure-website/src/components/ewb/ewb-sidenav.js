'use client';

import React from 'react';
import { Shield, FileStack, Truck, CheckCircle, AlertCircle, Circle } from 'lucide-react';

const navItems = [
  {
    id: 'validation',
    label: 'EWB Validation',
    icon: Shield,
    color: 'blue',
    step: 1
  },
  {
    id: 'consolidation',
    label: 'Part A - Consolidate',
    icon: FileStack,
    color: 'orange',
    step: 2
  },
  {
    id: 'transporter',
    label: 'Part B - Transporter',
    icon: Truck,
    color: 'green',
    step: 3
  }
];

export default function EwbSidenav({ activeSection, onSectionChange, stats = {} }) {
  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900">
          <h3 className="font-bold text-sm text-white">EWB Operations</h3>
        </div>
        
        {/* Navigation */}
        <nav className="p-2">
          {navItems.map((item, index) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left mb-1 ${
                  isActive 
                    ? item.color === 'blue' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : item.color === 'orange'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-green-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : item.color === 'blue'
                      ? 'bg-blue-100 text-blue-600'
                      : item.color === 'orange'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-green-100 text-green-600'
                }`}>
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-800'}`}>
                    {item.label}
                  </span>
                </div>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />
              </button>
            );
          })}
        </nav>

        {/* Stats */}
        {stats.totalEwbs !== undefined && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white rounded-lg border border-gray-100">
                <p className="text-lg font-bold text-gray-900">{stats.totalEwbs || 0}</p>
                <p className="text-[10px] text-gray-500 uppercase font-medium">Total</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-green-100">
                <p className="text-lg font-bold text-green-600">{stats.validated || 0}</p>
                <p className="text-[10px] text-green-600 uppercase font-medium">Valid</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-orange-100">
                <p className="text-lg font-bold text-orange-600">{stats.pending || 0}</p>
                <p className="text-[10px] text-orange-600 uppercase font-medium">Pending</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
