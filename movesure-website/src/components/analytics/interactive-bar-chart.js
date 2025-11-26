'use client';

import { useState } from 'react';

export default function InteractiveBarChart({ data, xKey, yKey, title, color = 'blue', onBarClick }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const colorClasses = {
    blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-700' },
    green: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-700' },
    purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-700' },
    indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-indigo-700' },
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-12 text-gray-500">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => parseFloat(item[yKey]) || 0));

  const formatValue = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const handleBarClick = (item, index) => {
    setSelectedIndex(index);
    if (onBarClick) {
      onBarClick(item);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const value = parseFloat(item[yKey]) || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isHovered = hoveredIndex === index;
          const isSelected = selectedIndex === index;

          return (
            <div 
              key={index} 
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleBarClick(item, index)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium truncate max-w-[200px] transition-colors ${
                  isHovered || isSelected ? colorClasses[color].text : 'text-gray-700'
                }`}>
                  {item[xKey]}
                </span>
                <span className={`text-sm font-semibold transition-all ${
                  isHovered || isSelected ? 'text-lg ' + colorClasses[color].text : 'text-gray-900'
                }`}>
                  {formatValue(value)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden relative">
                <div
                  className={`${colorClasses[color].bg} ${colorClasses[color].hover} h-4 rounded-full transition-all duration-500 ease-out ${
                    isSelected ? 'ring-2 ring-offset-2 ring-' + color + '-400' : ''
                  }`}
                  style={{ 
                    width: `${percentage}%`,
                    transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)'
                  }}
                >
                  {isHovered && percentage > 20 && (
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-white font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
