'use client';

import { Calendar, MapPin, Package, IndianRupee, Truck, Weight, User, Users, TrendingUp } from 'lucide-react';

const ConsignorRateStats = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="space-y-2">
      {/* Single Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <div className="bg-white p-2 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-600 font-medium">Total</div>
          <div className="text-base font-bold text-indigo-600">{stats.count}</div>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-600 font-medium">Common Rate</div>
          <div className="text-base font-bold text-green-600">₹{stats.mostCommonRate}</div>
        </div>
        
        {/* Above 50 KG */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-2 rounded-lg border border-green-200">
          <div className="text-xs font-bold text-green-800">Above 50 KG</div>
          <div className="text-sm font-bold text-green-700">₹{stats.above50kg.commonRate}</div>
          <div className="text-xs text-green-600">({stats.above50kg.count})</div>
        </div>

        {/* Below 50 KG */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-200">
          <div className="text-xs font-bold text-blue-800">Below 50 KG</div>
          <div className="text-sm font-bold text-blue-700">₹{stats.below50kg.commonRate}</div>
          <div className="text-xs text-blue-600">({stats.below50kg.count})</div>
        </div>

        {/* Payment Distribution */}
        <div className="bg-white p-2 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-600 font-medium mb-1">Paid</div>
          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-blue-600">{stats.paymentModes.paidGodown}</span>
            <span className="text-slate-500 text-[10px]">Godown</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-purple-600">{stats.paymentModes.paidDD}</span>
            <span className="text-slate-500 text-[10px]">DD</span>
          </div>
        </div>

        <div className="bg-white p-2 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-600 font-medium mb-1">To-Pay</div>
          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-orange-600">{stats.paymentModes.topayGodown}</span>
            <span className="text-slate-500 text-[10px]">Godown</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-red-600">{stats.paymentModes.topayDD}</span>
            <span className="text-slate-500 text-[10px]">DD</span>
          </div>
        </div>
      </div>

      {/* City-wise Stats - Horizontal Scrollable */}
      {stats.cityStats && stats.cityStats.length > 0 && (
        <div className="bg-white p-2 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3 text-indigo-600" />
            <div className="text-xs font-bold text-slate-800">Top Cities by Volume</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {stats.cityStats.slice(0, 10).map((city, index) => (
              <div key={index} className="flex-shrink-0 bg-slate-50 rounded p-1.5 border border-slate-200 min-w-[120px]">
                <div className="text-xs font-semibold text-slate-800 truncate">{city.cityName}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600">{city.count} bilty</div>
                  <div className="text-xs font-bold text-indigo-600">₹{city.commonRate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsignorRateStats;