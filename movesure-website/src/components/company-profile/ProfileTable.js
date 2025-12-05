'use client';

import {
  Edit2, Trash2, Copy, Building2, MapPin, Truck, FileText
} from 'lucide-react';

const ProfileTable = ({
  profiles,
  getConsignorName,
  getCityName,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Consignor</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Destination</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Transport</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Min Wt</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Min Fr</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Labour</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">DD Charges</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Other</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-3 py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No profiles found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new profile</p>
                </td>
              </tr>
            ) : (
              profiles.map((profile, index) => (
                <ProfileTableRow
                  key={profile.id}
                  profile={profile}
                  index={index}
                  getConsignorName={getConsignorName}
                  getCityName={getCityName}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{profiles.length}</span> profiles
        </p>
      </div>
    </div>
  );
};

// Separate row component for better organization
const ProfileTableRow = ({
  profile,
  index,
  getConsignorName,
  getCityName,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium text-gray-900 text-xs">{getConsignorName(profile.consignor_id)}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          <div>
            <p className="text-gray-900 text-xs">{getCityName(profile.destination_station_id)}</p>
            <p className="text-[10px] text-gray-500">{profile.city_code}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        {profile.transport_name ? (
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-green-500" />
            <div>
              <p className="text-gray-900 text-xs">{profile.transport_name}</p>
              {profile.transport_gst && (
                <p className="text-[10px] text-gray-500">{profile.transport_gst}</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="inline-flex flex-col items-center">
          <span className="font-semibold text-green-600 text-xs">₹{parseFloat(profile.rate || 0).toFixed(2)}</span>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
            {profile.rate_unit === 'PER_KG' ? '/kg' : '/nag'}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        {profile.rate_unit === 'PER_KG' && profile.minimum_weight_kg > 0 ? (
          <span className="text-gray-700 text-xs">{profile.minimum_weight_kg} kg</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {profile.freight_minimum_amount > 0 ? (
          <span className="text-orange-600 font-medium text-xs">₹{parseFloat(profile.freight_minimum_amount).toFixed(0)}</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {profile.labour_rate > 0 ? (
          <div className="inline-flex flex-col items-center">
            <span className="text-gray-700 text-xs">₹{parseFloat(profile.labour_rate).toFixed(2)}</span>
            <span className="text-[10px] text-gray-500">
              {profile.labour_unit === 'PER_KG' ? '/kg' : profile.labour_unit === 'PER_NAG' ? '/nag' : '/bilty'}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="text-[10px] space-y-0.5">
          {profile.dd_charge_per_kg > 0 && (
            <p className="text-gray-600">
              ₹{profile.dd_charge_per_kg}/kg
              {profile.dd_print_charge_per_kg != null && (
                <span className="text-blue-500 ml-1">(P: ₹{profile.dd_print_charge_per_kg})</span>
              )}
            </p>
          )}
          {profile.dd_charge_per_nag > 0 && (
            <p className="text-gray-600">
              ₹{profile.dd_charge_per_nag}/nag
              {profile.dd_print_charge_per_nag != null && (
                <span className="text-blue-500 ml-1">(P: ₹{profile.dd_print_charge_per_nag})</span>
              )}
            </p>
          )}
          {!profile.dd_charge_per_kg && !profile.dd_charge_per_nag && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="text-[10px] space-y-0.5">
          {profile.receiving_slip_charge > 0 && (
            <p className="text-gray-600">RS: ₹{profile.receiving_slip_charge}</p>
          )}
          {profile.bilty_charge > 0 && (
            <p className="text-gray-600">Bilty: ₹{profile.bilty_charge}</p>
          )}
          {!profile.receiving_slip_charge && !profile.bilty_charge && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        {profile.is_no_charge ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
            No Charge
          </span>
        ) : profile.is_active ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
            Inactive
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-0.5">
          <button
            onClick={() => onEdit(profile)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(profile)}
            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(profile.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default ProfileTable;
