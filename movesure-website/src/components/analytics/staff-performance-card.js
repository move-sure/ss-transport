'use client';

import { User, TrendingUp, FileText, Package } from 'lucide-react';

export default function StaffPerformanceCard({ staff, rank }) {
  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-blue-400 to-blue-600';
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-2 border-gray-100 hover:border-blue-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRankColor(rank)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
            {getRankBadge(rank)}
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900">{staff.staffName}</h4>
            <p className="text-sm text-gray-600">{staff.staffPost}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(staff.totalRevenue)}</p>
          <p className="text-xs text-gray-500">Total Revenue</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Regular Bilty */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Regular Bilty</span>
          </div>
          <p className="text-lg font-bold text-blue-900">{formatCurrency(staff.regularRevenue)}</p>
          <p className="text-xs text-blue-600 mt-1">{staff.regularCount} bilties • {staff.regularPackages} pkgs</p>
        </div>

        {/* Manual Bilty */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">Manual Bilty</span>
          </div>
          <p className="text-lg font-bold text-purple-900">{formatCurrency(staff.manualRevenue)}</p>
          <p className="text-xs text-purple-600 mt-1">{staff.manualCount} bilties • {staff.manualPackages} pkgs</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Bilties</p>
          <p className="text-lg font-bold text-gray-900">{staff.totalCount}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Packages</p>
          <p className="text-lg font-bold text-gray-900">{staff.totalPackages}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Avg/Bilty</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(staff.totalRevenue / staff.totalCount)}</p>
        </div>
      </div>
    </div>
  );
}
