'use client';

export default function CityDeltaCards({ data }) {
  const { new_cities_this_month = [], dropped_cities = [], declined_cities = [] } = data.city_delta || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-green-700 mb-3">
          New Cities This Month ({new_cities_this_month.length})
        </h4>
        {new_cities_this_month.length === 0 ? (
          <p className="text-xs text-gray-400">No new cities</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {new_cities_this_month.map(c => (
              <span key={c} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-red-600 mb-3">
          Cities No Longer Served ({dropped_cities.length})
        </h4>
        {dropped_cities.length === 0 ? (
          <p className="text-xs text-gray-400">No dropped cities</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {dropped_cities.map(c => (
              <span key={c} className="inline-block bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-yellow-700 mb-3">
          Declining Cities ({declined_cities.length})
        </h4>
        {declined_cities.length === 0 ? (
          <p className="text-xs text-gray-400">No declining cities</p>
        ) : (
          <div className="space-y-1">
            {declined_cities.slice(0, 6).map(c => (
              <div key={c.city_name} className="flex justify-between text-xs">
                <span className="font-medium text-gray-700">{c.city_name}</span>
                <span className="text-red-500 font-semibold">
                  {c.last_month_count} → {c.this_month_count}
                  <span className="ml-1">({c.change})</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
