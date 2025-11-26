'use client';

import { useMemo } from 'react';

export default function LineChart({ data, xKey, yKey, title, color = 'blue' }) {
  const colorClasses = {
    blue: { line: 'stroke-blue-500', fill: 'fill-blue-100', dot: 'fill-blue-500' },
    green: { line: 'stroke-green-500', fill: 'fill-green-100', dot: 'fill-green-500' },
    purple: { line: 'stroke-purple-500', fill: 'fill-purple-100', dot: 'fill-purple-500' },
  };

  const { maxValue, minValue, points, chartData } = useMemo(() => {
    if (!data || data.length === 0) return { maxValue: 0, minValue: 0, points: '', chartData: [] };

    const values = data.map(item => parseFloat(item[yKey]) || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const width = 100;
    const height = 60;
    const padding = 5;

    const chartPoints = data.map((item, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const value = parseFloat(item[yKey]) || 0;
      const y = height - ((value - min) / range) * (height - padding * 2) - padding;
      return { x, y, value, label: item[xKey] };
    });

    const pointsStr = chartPoints.map(p => `${p.x},${p.y}`).join(' ');
    const areaPoints = `0,${height} ${pointsStr} ${width},${height}`;

    return {
      maxValue: max,
      minValue: min,
      points: pointsStr,
      areaPoints,
      chartData: chartPoints
    };
  }, [data, yKey, xKey]);

  const formatValue = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toFixed(0)}`;
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
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold text-gray-900">{formatValue(maxValue)}</span>
        <span className="text-sm text-gray-500">peak</span>
      </div>

      <svg viewBox="0 0 100 60" className="w-full h-40" preserveAspectRatio="none">
        {/* Area fill */}
        <polygon
          points={`0,60 ${points} 100,60`}
          className={colorClasses[color].fill}
          opacity="0.3"
        />
        
        {/* Line */}
        <polyline
          points={points}
          className={colorClasses[color].line}
          fill="none"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {chartData.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="0.8"
            className={colorClasses[color].dot}
          />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-4 text-xs text-gray-500">
        {data.slice(0, 6).map((item, index) => (
          <span key={index} className="truncate">
            {item[xKey]}
          </span>
        ))}
      </div>
    </div>
  );
}
