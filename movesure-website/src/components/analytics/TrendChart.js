'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';

export default function TrendChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="font-semibold text-gray-700 mb-4">12-Month Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data.monthly_trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="count" orientation="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="weight" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="count"
            name="Consignments"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            name="Weight (kg)"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
