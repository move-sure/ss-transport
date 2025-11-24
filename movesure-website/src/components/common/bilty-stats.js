'use client';

export default function BiltyStats({ data, loading }) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white overflow-hidden shadow-sm rounded-lg animate-pulse border border-gray-200">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <div className="h-3 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalCombined = data.totalBilties + data.totalStationBilties;
  const monthlyCombined = data.monthlyBilties + data.monthlyStationBilties;
  const weeklyCombined = data.weeklyBilties + data.weeklyStationBilties;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total Bilties */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📄</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">Total Bilties</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">{totalCombined.toLocaleString()}</dd>
                <dd className="text-xs text-gray-500 mt-1">
                  Regular: {data.totalBilties} | Station: {data.totalStationBilties}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* This Month */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">This Month</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">{monthlyCombined.toLocaleString()}</dd>
                <dd className="text-xs text-gray-500 mt-1">
                  Regular: {data.monthlyBilties} | Station: {data.monthlyStationBilties}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* This Week */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">This Week</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">{weeklyCombined.toLocaleString()}</dd>
                <dd className="text-xs text-gray-500 mt-1">
                  Regular: {data.weeklyBilties} | Station: {data.weeklyStationBilties}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Average Per Day (This Month) */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <dl>
                <dt className="text-xs font-medium text-gray-600 truncate">Daily Average</dt>
                <dd className="text-xl font-bold text-gray-900 mt-1">
                  {(monthlyCombined / new Date().getDate()).toFixed(1)}
                </dd>
                <dd className="text-xs text-gray-500 mt-1">Per day this month</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
