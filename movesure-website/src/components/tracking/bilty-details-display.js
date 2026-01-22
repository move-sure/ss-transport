'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Package, User, Users, Truck, FileText, IndianRupee, Info, UserCircle } from 'lucide-react';
import MobileNumberEditor from './mobile-number-editor';

const BiltyDetailsDisplay = ({ bilty, transitDetails, createdByUser, onBiltyUpdate, onComplaintCreated, challanDetails, truck, driver, owner }) => {
  const router = useRouter();

  const handleComplaintClick = () => {
    if (onComplaintCreated && bilty?.gr_no) {
      // If callback exists, stay in tracking page and pass GR number
      onComplaintCreated(bilty.gr_no);
    } else if (bilty?.gr_no) {
      // Otherwise navigate to complaints page
      router.push(`/complains/create?gr_no=${bilty.gr_no}`);
    }
  };

  if (!bilty) {
    return (
      <div className="bg-white/95 p-6 rounded-lg border border-slate-200 shadow-sm text-center">
        <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Search and select a bilty to view details</p>
      </div>
    );
  }

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
      <Icon className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-gray-500 uppercase">{label}</div>
        <div className="text-sm font-semibold text-gray-900 break-words">{value || 'N/A'}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white/95 rounded-lg border border-slate-200 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-3 rounded-t-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold mb-0.5">GR No: {bilty.gr_no}</h2>
            <p className="text-indigo-100 text-[10px]">Date: {new Date(bilty.bilty_date).toLocaleDateString('en-IN')}</p>
            {bilty.destination && (
              <div className="flex items-center gap-1 mt-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded w-fit">
                <span className="text-[10px]">📍 Destination:</span>
                <span className="text-xs font-bold">{bilty.destination}</span>
              </div>
            )}
            {createdByUser && (
              <div className="flex items-center gap-1.5 mt-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded w-fit">
                <UserCircle className="w-3 h-3" />
                <span className="text-[9px]">Created by: <strong>{createdByUser.name || createdByUser.username}</strong></span>
                {createdByUser.post && <span className="text-[9px] opacity-80">({createdByUser.post})</span>}
              </div>
            )}
          </div>
          {transitDetails && (
            <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded">
              <div className="text-[9px] text-indigo-100 uppercase">Challan No</div>
              <div className="text-sm font-bold">{transitDetails.challan_no}</div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Compact Challan Details */}
        {challanDetails && (
          <div className="p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded border border-teal-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-teal-600" />
                <span className="font-semibold text-gray-600">Truck:</span>
                <span className="font-bold text-gray-900">{truck?.truck_number || 'N/A'}</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-teal-600" />
                <span className="font-semibold text-gray-600">Owner:</span>
                <span className="font-bold text-gray-900">{owner?.name || 'N/A'}</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-teal-600" />
                <span className="font-semibold text-gray-600">Challan:</span>
                <span className="font-bold text-gray-900">{challanDetails.challan_no}</span>
              </div>
              {transitDetails?.dispatch_date && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-600">Dispatched:</span>
                    <span className="font-bold text-teal-700">{new Date(transitDetails.dispatch_date).toLocaleDateString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Party Information */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Party Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <InfoRow label="Consignor Name" value={bilty.consignor_name} icon={User} />
            <InfoRow label="Consignor GST" value={bilty.consignor_gst} icon={FileText} />
            <InfoRow label="Consignee Name" value={bilty.consignee_name} icon={User} />
            <InfoRow label="Consignee GST" value={bilty.consignee_gst} icon={FileText} />
          </div>
          
          {/* Mobile Numbers with Edit Option */}
          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
            <MobileNumberEditor bilty={bilty} onUpdate={onBiltyUpdate} />
          </div>
        </div>

        {/* Transport Information */}
        {(bilty.transport_name || bilty.transport_gst || bilty.transport_number) && (
          <div className="p-2 bg-purple-50 rounded border border-purple-200">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Truck className="w-3 h-3 text-purple-600 flex-shrink-0" />
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-600">Transport:</span>
                <span className="text-xs font-bold text-gray-900">{bilty.transport_name || 'N/A'}</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-600">GST:</span>
                <span className="text-xs font-bold text-gray-900">{bilty.transport_gst || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Shipment Details */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            Shipment Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <InfoRow label="Packages" value={bilty.no_of_pkg} icon={Package} />
            <InfoRow label="Weight (Kg)" value={bilty.wt} icon={Info} />
            {bilty.pvt_marks && <InfoRow label="Private Marks" value={bilty.pvt_marks} icon={Info} />}
            {bilty.contain && <InfoRow label="Contains" value={bilty.contain} icon={Package} />}
            <InfoRow label="Rate" value={`₹${bilty.rate}`} icon={IndianRupee} />
            <InfoRow label="Payment" value={bilty.payment_mode?.toUpperCase()} icon={FileText} />
            <InfoRow label="Invoice No" value={bilty.invoice_no} icon={FileText} />
            <InfoRow label="Invoice Value" value={bilty.invoice_value ? `₹${bilty.invoice_value.toLocaleString()}` : 'N/A'} icon={IndianRupee} />
            <InfoRow label="E-Way Bill" value={bilty.e_way_bill} icon={FileText} />
          </div>
        </div>

        {/* Charges Breakdown */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
            Charges
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <InfoRow label="Freight" value={`₹${bilty.freight_amount?.toLocaleString()}`} icon={IndianRupee} />
            <InfoRow label="Labour" value={`₹${bilty.labour_charge?.toLocaleString()}`} icon={IndianRupee} />
            <InfoRow label="Bill" value={`₹${bilty.bill_charge?.toLocaleString()}`} icon={IndianRupee} />
            <InfoRow label="Toll" value={`₹${bilty.toll_charge?.toLocaleString()}`} icon={IndianRupee} />
            <InfoRow label="DD" value={`₹${bilty.dd_charge?.toLocaleString()}`} icon={IndianRupee} />
            <InfoRow label="Other" value={`₹${bilty.other_charge?.toLocaleString()}`} icon={IndianRupee} />
            <InfoRow label="PF" value={`₹${bilty.pf_charge?.toLocaleString()}`} icon={IndianRupee} />
            <div className="flex items-start gap-1.5 p-2 bg-indigo-50 rounded border-2 border-indigo-200">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-semibold text-indigo-600 uppercase">TOTAL</div>
                <div className="text-base font-bold text-indigo-700">₹{bilty.total?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {bilty.remark && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Additional Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InfoRow label="Remarks" value={bilty.remark} icon={Info} />
            </div>
          </div>
        )}

        {/* Status Badge and Actions */}
        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-gray-200">
          <div className={`px-2 py-1 rounded font-bold text-[10px] ${
            bilty.saving_option === 'DRAFT'
              ? 'bg-yellow-100 text-amber-800 border border-yellow-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            Status: {bilty.saving_option}
          </div>
          <button
            onClick={handleComplaintClick}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-700"
          >
            🚨 Register Complaint
          </button>
        </div>
        <div className="text-[9px] text-gray-500 mt-1">
          Created: {new Date(bilty.created_at).toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
};

export default BiltyDetailsDisplay;
