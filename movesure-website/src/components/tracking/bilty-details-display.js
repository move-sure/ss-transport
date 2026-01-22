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
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-4 rounded-t-lg border-b-4 border-amber-500">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black mb-1 text-white tracking-tight">GR No: {bilty.gr_no}</h2>
            <p className="text-slate-300 text-sm font-semibold">Date: {new Date(bilty.bilty_date).toLocaleDateString('en-IN')}</p>
            {createdByUser && (
              <div className="flex items-center gap-1.5 mt-2 bg-white/10 px-2 py-1 rounded w-fit">
                <UserCircle className="w-3.5 h-3.5" />
                <span className="text-xs text-slate-200">Created by: <strong className="text-white">{createdByUser.name || createdByUser.username}</strong></span>
                {createdByUser.post && <span className="text-xs text-slate-300">({createdByUser.post})</span>}
              </div>
            )}
          </div>
          
          {/* Right Side - Destination & Dispatch Date */}
          <div className="flex flex-col items-end gap-3">
            {bilty.destination && (
              <div className="text-right">
                <div className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-1">Destination</div>
                <div className="text-3xl font-black text-white leading-tight tracking-tight">
                  📍 {bilty.destination}
                </div>
              </div>
            )}
            {challanDetails?.dispatch_date && (
              <div className="text-right">
                <div className="text-xs text-emerald-400 uppercase font-bold tracking-wider mb-1">Dispatched</div>
                <div className="text-xl font-bold text-white leading-tight">
                  {new Date(challanDetails.dispatch_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-sm font-semibold text-emerald-300 mt-0.5">
                  {new Date(challanDetails.dispatch_date).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
            {transitDetails && (
              <div className="bg-white/10 px-3 py-1.5 rounded">
                <div className="text-[10px] text-slate-300 uppercase font-semibold">Challan No</div>
                <div className="text-base font-bold text-white">{transitDetails.challan_no}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Transit Bilty Image */}
        {bilty.bilty_image && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Transit Bilty Document
              </h3>
              <a
                href={bilty.bilty_image}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                📄 View Document
              </a>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <img
                src={bilty.bilty_image}
                alt="Transit Bilty"
                className="w-full h-auto max-h-96 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-center py-4 text-gray-500 text-sm">
                📄 Document preview not available. Click &quot;View Document&quot; to open.
              </div>
            </div>
          </div>
        )}

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
              {challanDetails.dispatch_date && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-600">Dispatched:</span>
                    <span className="font-bold text-teal-700">
                      {new Date(challanDetails.dispatch_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      {' at '}
                      {new Date(challanDetails.dispatch_date).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </>
              )}
              {!challanDetails.is_dispatched && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 font-bold rounded-full border border-orange-300">
                      Pending Dispatch
                    </span>
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
