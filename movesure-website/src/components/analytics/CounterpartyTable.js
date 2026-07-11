'use client';

export default function CounterpartyTable({ data }) {
  const tm = data.counterparty_breakdown?.this_month || [];
  const newSet = new Set((data.counterparty_delta?.new_this_month || []).map(c => c.name));
  const dropped = data.counterparty_delta?.dropped || [];
  const recurring = data.counterparty_delta?.recurring || [];
  const label = data.party_type === 'consignor' ? 'Consignees' : 'Consignors';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="font-semibold text-gray-700">Top {label} — This Month</h3>
        <div className="flex gap-2 text-xs">
          {newSet.size > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              {newSet.size} new
            </span>
          )}
          {dropped.length > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
              {dropped.length} lost
            </span>
          )}
        </div>
      </div>

      {tm.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No counterparty data this month</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 font-semibold">#</th>
                <th className="text-left py-2 font-semibold">Company</th>
                <th className="text-right py-2 font-semibold">Count</th>
                <th className="text-right py-2 font-semibold">Weight</th>
                <th className="text-right py-2 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {tm.slice(0, 10).map((cp, i) => {
                const isNew = newSet.has(cp.name);
                const rec = recurring.find(r => r.name === cp.name);
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{cp.name}</span>
                        {isNew && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">NEW</span>
                        )}
                        {rec && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${rec.change >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {rec.change >= 0 ? '+' : ''}{rec.change} vs last mo
                          </span>
                        )}
                      </div>
                      {cp.gstin && <div className="text-xs text-gray-400 mt-0.5">{cp.gstin}</div>}
                    </td>
                    <td className="text-right py-2 font-semibold text-gray-700">{cp.count}</td>
                    <td className="text-right py-2 text-gray-600">{(cp.weight || 0).toLocaleString()} kg</td>
                    <td className="text-right py-2 font-semibold text-gray-700">
                      ₹{(cp.value || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dropped.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-red-500 font-semibold">
            Lost this month: {dropped.map(c => c.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
