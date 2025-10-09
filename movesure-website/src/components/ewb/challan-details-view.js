import React from 'react';

export default function ChallanDetailsView({ challanDetails }) {
  if (!challanDetails) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Challan Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border-l-4 border-blue-500 pl-4">
          <p className="text-sm text-gray-600">Challan Number</p>
          <p className="font-semibold text-gray-800">{challanDetails.challan_no}</p>
        </div>

        <div className="border-l-4 border-green-500 pl-4">
          <p className="text-sm text-gray-600">Branch</p>
          <p className="font-semibold text-gray-800">
            {challanDetails.branch?.branch_name || challanDetails.branch?.name || challanDetails.branch?.code || 'N/A'}
            {challanDetails.branch?.code && challanDetails.branch?.branch_name ? ` (${challanDetails.branch.code})` : ''}
          </p>
        </div>

        <div className="border-l-4 border-purple-500 pl-4">
          <p className="text-sm text-gray-600">Date</p>
          <p className="font-semibold text-gray-800">
            {new Date(challanDetails.date).toLocaleDateString()}
          </p>
        </div>

        <div className="border-l-4 border-yellow-500 pl-4">
          <p className="text-sm text-gray-600">Truck Number</p>
          <p className="font-semibold text-gray-800">
            {challanDetails.truck?.truck_number || 'N/A'}
          </p>
        </div>

        <div className="border-l-4 border-red-500 pl-4">
          <p className="text-sm text-gray-600">Driver</p>
          <p className="font-semibold text-gray-800">
            {challanDetails.driver?.driver_name || challanDetails.driver?.name || 'N/A'}
            {challanDetails.driver?.phone && (
              <span className="text-sm text-gray-600 block">{challanDetails.driver.phone}</span>
            )}
          </p>
        </div>

        <div className="border-l-4 border-indigo-500 pl-4">
          <p className="text-sm text-gray-600">Owner</p>
          <p className="font-semibold text-gray-800">
            {challanDetails.owner?.owner_name || challanDetails.owner?.name || 'N/A'}
            {challanDetails.owner?.phone && (
              <span className="text-sm text-gray-600 block">{challanDetails.owner.phone}</span>
            )}
          </p>
        </div>

        <div className="border-l-4 border-pink-500 pl-4">
          <p className="text-sm text-gray-600">Total Bilty Count</p>
          <p className="font-semibold text-gray-800">{challanDetails.total_bilty_count || 0}</p>
        </div>

        <div className="border-l-4 border-teal-500 pl-4">
          <p className="text-sm text-gray-600">Status</p>
          <p className="font-semibold text-gray-800">
            {challanDetails.is_dispatched ? (
              <span className="text-green-600">✓ Dispatched</span>
            ) : (
              <span className="text-yellow-600">⏳ Pending</span>
            )}
          </p>
        </div>

        {challanDetails.is_dispatched && challanDetails.dispatch_date && (
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="text-sm text-gray-600">Dispatch Date</p>
            <p className="font-semibold text-gray-800">
              {new Date(challanDetails.dispatch_date).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {challanDetails.remarks && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">Remarks</p>
          <p className="text-gray-800 mt-1">{challanDetails.remarks}</p>
        </div>
      )}
    </div>
  );
}
