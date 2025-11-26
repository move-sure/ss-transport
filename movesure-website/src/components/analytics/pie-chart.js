'use client';

import { useMemo } from 'react';

export default function PieChart({ data, labelKey, valueKey, title }) {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#6366F1', // indigo
    '#14B8A6', // teal
  ];

  const { chartData, total } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], total: 0 };

    const sum = data.reduce((acc, item) => acc + (parseFloat(item[valueKey]) || 0), 0);
    
    let currentAngle = -90;
    const processedData = data.map((item, index) => {
      const value = parseFloat(item[valueKey]) || 0;
      const percentage = sum > 0 ? (value / sum) * 100 : 0;
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      currentAngle += angle;
      const endAngle = currentAngle;

      return {
        label: item[labelKey],
        value,
        percentage,
        color: colors[index % colors.length],
        startAngle,
        endAngle,
      };
    });

    return { chartData: processedData, total: sum };
  }, [data, labelKey, valueKey]);

  const formatValue = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const getCoordinatesForAngle = (angle, radius = 40) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: 50 + radius * Math.cos(radian),
      y: 50 + radius * Math.sin(radian),
    };
  };

  const createArcPath = (startAngle, endAngle) => {
    const start = getCoordinatesForAngle(startAngle);
    const end = getCoordinatesForAngle(endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-12 text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Pie Chart */}
        <div className="relative w-64 h-64 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {chartData.map((item, index) => (
              <path
                key={index}
                d={createArcPath(item.startAngle, item.endAngle)}
                fill={item.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
            {/* Center circle */}
            <circle cx="50" cy="50" r="25" fill="white" />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-xl font-bold text-gray-900">{formatValue(total)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 max-h-64 overflow-y-auto w-full">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-700 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-900">
                  {formatValue(item.value)}
                </span>
                <span className="text-xs text-gray-500 w-12 text-right">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
