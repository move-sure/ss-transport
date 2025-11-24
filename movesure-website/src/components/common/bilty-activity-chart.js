'use client';

import dynamic from 'next/dynamic';

// Dynamically import Recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });

export default function BiltyActivityChart({ data, loading, selectedPeriod, onPeriodChange }) {
  const chartData = data || [];
  
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.total), 1) : 1;
  const totalBilties = chartData.reduce((sum, d) => sum + d.total, 0);
  const avgPerDay = chartData.length > 0 ? (totalBilties / chartData.length).toFixed(1) : 0;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <p className="text-sm text-green-600">Regular: {payload[0]?.value || 0}</p>
          <p className="text-sm text-blue-600">Station: {payload[1]?.value || 0}</p>
          <p className="text-sm text-gray-900 font-bold mt-2 pt-2 border-t">
            Total: {payload[2]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2">📈</span>
              Daily Activity Chart
            </h3>
            <p className="text-gray-600 text-sm mt-1">Your bilty creation performance</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPeriodChange('1week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === '1week'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              1 Week
            </button>
            <button
              onClick={() => onPeriodChange('2weeks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === '2weeks'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              2 Weeks
            </button>
            <button
              onClick={() => onPeriodChange('3weeks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === '3weeks'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              3 Weeks
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-white border-b border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total Created</p>
          <p className="text-3xl font-bold text-gray-900">{totalBilties}</p>
        </div>
        <div className="text-center border-l border-r border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Daily Average</p>
          <p className="text-3xl font-bold text-gray-900">{avgPerDay}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Peak Day</p>
          <p className="text-3xl font-bold text-gray-900">{maxValue}</p>
        </div>
      </div>

      {/* Line Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="dayMonth" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="bilty" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Regular Bilty"
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="stationBilty" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Station Bilty"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#1f2937" 
              strokeWidth={3}
              name="Total"
              dot={{ fill: '#1f2937', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
