'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#ca8a04','#dc2626','#0d9488','#9333ea'];

export default function CityChart({ data }) {
  const cities = (data.city_breakdown.this_month || []).slice(0, 10);
  const { new_cities_this_month = [], dropped_cities = [] } = data.city_delta || {};

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="font-semibold text-gray-700">Top Cities — This Month</h3>
        <div className="flex gap-2 text-xs">
          {new_cities_this_month.length > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              +{new_cities_this_month.length} new
            </span>
          )}
          {dropped_cities.length > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
              -{dropped_cities.length} dropped
            </span>
          )}
        </div>
      </div>
      {cities.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No city data this month</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, cities.length * 32)}>
          <BarChart data={cities} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="city_name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(val, name) => [val, name]}
              labelFormatter={(label) => `City: ${label}`}
            />
            <Bar dataKey="count" name="Consignments" radius={[0, 4, 4, 0]}>
              {cities.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
