'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../app/utils/supabase';
import { useAuth } from '../../../app/utils/auth';
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  PenTool,
  Trash2,
  Edit3,
  X,
  Check,
  Save,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { generatePohonchPDF } from './pohonch-pdf-generator';

export default function RecentPohonch({ onRefreshNeeded }) {
  const { user } = useAuth();
  const [recentPohonch, setRecentPohonch] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTransportName, setEditTransportName] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editPohonchNumber, setEditPohonchNumber] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // id of row being actioned
  const [expandedRow, setExpandedRow] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [printPreviewUrl, setPrintPreviewUrl] = useState(null);
  const [printPreviewPohonch, setPrintPreviewPohonch] = useState(null);

  const fetchRecent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pohonch')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setRecentPohonch(data || []);
    } catch (err) {
      console.error('Error fetching recent pohonch:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle signed status
  const handleToggleSign = async (pohonch) => {
    if (!user?.id) return;
    try {
      setActionLoading(pohonch.id);
      const newSigned = !pohonch.is_signed;
      const { error } = await supabase
        .from('pohonch')
        .update({
          is_signed: newSigned,
          signed_at: newSigned ? new Date().toISOString() : null,
          signed_by: newSigned ? user.id : null,
          updated_by: user.id,
        })
        .eq('id', pohonch.id);
      if (error) throw error;
      setRecentPohonch(prev =>
        prev.map(p =>
          p.id === pohonch.id
            ? { ...p, is_signed: newSigned, signed_at: newSigned ? new Date().toISOString() : null, signed_by: newSigned ? user.id : null }
            : p
        )
      );
    } catch (err) {
      alert('Failed to update sign status: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete pohonch (permanent)
  const handleDelete = async (pohonch) => {
    if (!confirm(`Permanently delete pohonch ${pohonch.pohonch_number}? This cannot be undone.`)) return;
    try {
      setActionLoading(pohonch.id);
      const { error } = await supabase
        .from('pohonch')
        .delete()
        .eq('id', pohonch.id);
      if (error) throw error;
      setRecentPohonch(prev => prev.filter(p => p.id !== pohonch.id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Start editing
  const handleStartEdit = (pohonch) => {
    setEditingId(pohonch.id);
    setEditTransportName(pohonch.transport_name);
    setEditGstin(pohonch.transport_gstin || '');
    setEditPohonchNumber(pohonch.pohonch_number || '');
  };

  // Save edit
  const handleSaveEdit = async (pohonchId) => {
    try {
      setActionLoading(pohonchId);
      const currentPohonch = recentPohonch.find(p => p.id === pohonchId);

      // If pohonch number changed, check for duplicates
      if (editPohonchNumber && editPohonchNumber.trim() !== currentPohonch?.pohonch_number) {
        const { data: dupCheck } = await supabase
          .from('pohonch')
          .select('id')
          .eq('pohonch_number', editPohonchNumber.trim())
          .eq('is_active', true)
          .neq('id', pohonchId)
          .limit(1);
        if (dupCheck && dupCheck.length > 0) {
          alert(`Pohonch number "${editPohonchNumber.trim()}" already exists! Please use a different number.`);
          setActionLoading(null);
          return;
        }
      }

      const { error } = await supabase
        .from('pohonch')
        .update({
          transport_name: editTransportName,
          transport_gstin: editGstin || null,
          pohonch_number: editPohonchNumber.trim() || currentPohonch?.pohonch_number,
          updated_by: user?.id,
        })
        .eq('id', pohonchId);
      if (error) throw error;
      setRecentPohonch(prev =>
        prev.map(p =>
          p.id === pohonchId
            ? { ...p, transport_name: editTransportName, transport_gstin: editGstin || null, pohonch_number: editPohonchNumber.trim() || p.pohonch_number }
            : p
        )
      );
      setEditingId(null);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Print a single pohonch (open in modal)
  const handlePrintPohonch = async (pohonch) => {
    try {
      setPrintingId(pohonch.id);
      const bilties = Array.isArray(pohonch.bilty_metadata) ? pohonch.bilty_metadata : [];
      if (bilties.length === 0) { alert('No bilty data in this pohonch'); return; }
      const transport = { transport_name: pohonch.transport_name, gst_number: pohonch.transport_gstin };
      const url = generatePohonchPDF(bilties, transport, true);
      if (url) {
        setPrintPreviewUrl(url);
        setPrintPreviewPohonch(pohonch);
      }
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setPrintingId(null);
    }
  };

  const closePrintPreview = () => {
    if (printPreviewUrl) URL.revokeObjectURL(printPreviewUrl);
    setPrintPreviewUrl(null);
    setPrintPreviewPohonch(null);
  };

  const handleDownloadPDF = () => {
    if (!printPreviewPohonch) return;
    const bilties = Array.isArray(printPreviewPohonch.bilty_metadata) ? printPreviewPohonch.bilty_metadata : [];
    const transport = { transport_name: printPreviewPohonch.transport_name, gst_number: printPreviewPohonch.transport_gstin };
    generatePohonchPDF(bilties, transport, false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <button
        onClick={() => {
          setShowRecent(!showRecent);
          if (!showRecent && recentPohonch.length === 0) fetchRecent();
        }}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 transition-all"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-gray-800">Recent Pohonch</h2>
          {recentPohonch.length > 0 && (
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {recentPohonch.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchRecent();
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {showRecent ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {showRecent && (
        <div className="border-t border-gray-100">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Loading recent pohonch...</p>
            </div>
          ) : recentPohonch.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No pohonch records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Pohonch No.</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Transport</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">GSTIN</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Challans</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Bilties</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">Amt</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">Kaat</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">PF</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Signed</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Created</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Print</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPohonch.map((p, idx) => {
                    const challans = Array.isArray(p.challan_metadata) ? p.challan_metadata : [];
                    const isEditing = editingId === p.id;
                    const isActionLoading = actionLoading === p.id;
                    const isExpanded = expandedRow === p.id;
                    const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];

                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          className={`border-b border-gray-100 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } ${isExpanded ? 'bg-teal-50/50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2.5 text-gray-500 text-xs">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPohonchNumber}
                                onChange={(e) => setEditPohonchNumber(e.target.value.toUpperCase())}
                                className="w-full px-2 py-1 border border-teal-300 rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                style={{ minWidth: '90px' }}
                              />
                            ) : (
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                                className="font-mono font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                              >
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                {p.pohonch_number}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTransportName}
                                onChange={(e) => setEditTransportName(e.target.value)}
                                className="w-full px-2 py-1 border border-teal-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            ) : (
                              <span className="font-semibold text-gray-800 truncate max-w-[180px] block" title={p.transport_name}>
                                {p.transport_name}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGstin}
                                onChange={(e) => setEditGstin(e.target.value)}
                                className="w-full px-2 py-1 border border-teal-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            ) : (
                              <span className="text-gray-600 text-xs font-mono">{p.transport_gstin || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 text-xs">
                            {challans.length > 3
                              ? `${challans.slice(0, 3).join(', ')} +${challans.length - 3}`
                              : challans.join(', ') || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium text-gray-900">{p.total_bilties}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-gray-900">₹{Math.round(p.total_amount || 0)}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-emerald-700">₹{Math.round(p.total_kaat || 0)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-teal-700">₹{Math.round(p.total_pf || 0)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => handleToggleSign(p)}
                              disabled={isActionLoading}
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                                p.is_signed
                                  ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                  : 'text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-600'
                              }`}
                              title={p.is_signed ? `Signed${p.signed_at ? ' at ' + format(new Date(p.signed_at), 'dd/MM/yy HH:mm') : ''}` : 'Click to mark as signed'}
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <PenTool className="w-3 h-3" />
                              )}
                              {p.is_signed ? 'Signed' : 'Not Signed'}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">
                            {p.created_at ? format(new Date(p.created_at), 'dd/MM/yy HH:mm') : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => handlePrintPohonch(p)}
                              disabled={printingId === p.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors shadow-sm border border-teal-200"
                              title="Print Pohonch PDF"
                            >
                              {printingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                              Print
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(p.id)}
                                    disabled={isActionLoading}
                                    className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                    title="Save"
                                  >
                                    {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(p)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(p)}
                                    disabled={isActionLoading}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                    title="Delete"
                                  >
                                    {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Expanded row — show bilty details */}
                        {isExpanded && bilties.length > 0 && (
                          <tr>
                            <td colSpan={13} className="px-6 py-3 bg-teal-50/70 border-b border-teal-100">
                              <div className="text-xs font-bold text-gray-600 mb-2">
                                Bilties in {p.pohonch_number} ({bilties.length} GRs) — Challans: {challans.join(', ')}
                              </div>
                              <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">#</th>
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">GR No.</th>
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">P/B No.</th>
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">Challan</th>
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">Consignor</th>
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">Consignee</th>
                                      <th className="px-2 py-1.5 text-left font-bold text-gray-500">Dest</th>
                                      <th className="px-2 py-1.5 text-center font-bold text-gray-500">Pkg</th>
                                      <th className="px-2 py-1.5 text-right font-bold text-gray-500">Wt</th>
                                      <th className="px-2 py-1.5 text-right font-bold text-gray-500">Amt</th>
                                      <th className="px-2 py-1.5 text-right font-bold text-gray-500">Kaat</th>
                                      <th className="px-2 py-1.5 text-right font-bold text-gray-500">DD</th>
                                      <th className="px-2 py-1.5 text-right font-bold text-gray-500">PF</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bilties.map((b, bIdx) => (
                                      <tr key={b.gr_no || bIdx} className={bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                        <td className="px-2 py-1 text-gray-400">{bIdx + 1}</td>
                                        <td className="px-2 py-1 font-mono font-semibold text-gray-800">{b.gr_no || '-'}</td>
                                        <td className="px-2 py-1 text-gray-600 font-mono">{b.pohonch_bilty || '-'}</td>
                                        <td className="px-2 py-1 text-gray-600">{b.challan_no || '-'}</td>
                                        <td className="px-2 py-1 text-gray-700 truncate max-w-[100px]">{b.consignor || '-'}</td>
                                        <td className="px-2 py-1 text-gray-700 truncate max-w-[100px]">{b.consignee || '-'}</td>
                                        <td className="px-2 py-1 text-gray-600">{b.destination || '-'}</td>
                                        <td className="px-2 py-1 text-center">{Math.round(b.packages || 0)}</td>
                                        <td className="px-2 py-1 text-right">{(b.weight || 0).toFixed(1)}</td>
                                        <td className="px-2 py-1 text-right font-medium">{b.is_paid ? 'PAID' : `₹${Math.round(b.amount || 0)}`}</td>
                                        <td className="px-2 py-1 text-right text-emerald-700">₹{Math.round(b.kaat || 0)}</td>
                                        <td className="px-2 py-1 text-right text-red-600">{b.dd > 0 ? `-₹${Math.round(b.dd)}` : '-'}</td>
                                        <td className="px-2 py-1 text-right font-bold text-teal-700">₹{Math.round(b.pf || 0)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Print Preview Modal */}
      {printPreviewUrl && printPreviewPohonch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Pohonch Print Preview</h3>
                <p className="text-sm text-gray-500">
                  {printPreviewPohonch.pohonch_number} &middot; {printPreviewPohonch.transport_name} &middot; {printPreviewPohonch.total_bilties} bilties
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Download PDF
                </button>
                <button
                  onClick={closePrintPreview}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 bg-gray-100">
              <iframe
                src={printPreviewUrl}
                className="w-full h-full rounded-lg border border-gray-200"
                title="Pohonch Print Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
