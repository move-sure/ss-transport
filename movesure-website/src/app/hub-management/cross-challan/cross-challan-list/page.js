'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import supabase from '../../../utils/supabase';
import { useAuth } from '../../../utils/auth';
import CrossChallanPrintModal, { useCrossChallanPrint } from '../../../../components/transit-finance/pohonch-print/CrossChallanPrintModal';
import TransportWiseAnalysis from '../../../../components/transit-finance/TransportWiseAnalysis';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight, FileText, PenTool,
  Trash2, Edit3, X, Check, Search, ArrowLeft, Package, Hash,
  Truck, Filter, ChevronLeft, User, Printer, Square, CheckSquare,
  Settings, Calendar, AlignLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

/* ─── helpers ────────────────────────────────────────────────────────────── */
// jsPDF default fonts don't support ₹ — use Rs. to avoid garbled output
const Rs = (n) => `Rs.${Math.round(n).toLocaleString('en-IN')}`;

/* ─── PDF generator — returns blob URL (B&W, portrait) ───────────────────── */
async function buildCrossingBillBlobURL(selectedRows, settings) {
  const { jsPDF }  = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw     = doc.internal.pageSize.getWidth();   // 210
  const ph     = doc.internal.pageSize.getHeight();  // 297
  const margin = 12;

  /* ── header (black & white) ── */
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pw, 26, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text((settings.title || 'CROSSING BILL').toUpperCase(), pw / 2, 9, { align: 'center' });

  // Transport name prominently below title
  if (settings.transportName) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.transportName, pw / 2, 16, { align: 'center' });
  }

  // Date range
  if (settings.fromDate || settings.toDate) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const period = [settings.fromDate && `From: ${settings.fromDate}`, settings.toDate && `To: ${settings.toDate}`].filter(Boolean).join('   |   ');
    doc.text(period, pw / 2, 22, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);

  /* ── summary line below header ── */
  const summaryY = 30;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Total Pohonch: ${selectedRows.length}   |   Total Bilties: ${selectedRows.reduce((s, p) => s + (p.total_bilties || 0), 0)}   |   Printed: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    margin, summaryY,
  );

  /* ── table ── */
  let totPF = 0, totKaat = 0, totAmt = 0, totBilties = 0;

  const rows = selectedRows.map((p, i) => {
    const challans = Array.isArray(p.challan_metadata) ? p.challan_metadata.join(', ') : '-';
    // P/B No — use bilty_metadata[0].pohonch_bilty if available, else pohonch_number
    const firstBilty = Array.isArray(p.bilty_metadata) && p.bilty_metadata.length > 0 ? p.bilty_metadata[0] : null;
    const pbNo = firstBilty?.pohonch_bilty || firstBilty?.pohonch_no || p.pohonch_number || '-';
    const pf   = p.total_pf    || 0;
    const kaat = p.total_kaat  || 0;
    const amt  = p.total_amount || 0;
    totPF      += pf;
    totKaat    += kaat;
    totAmt     += amt;
    totBilties += p.total_bilties || 0;
    return [
      i + 1,
      p.pohonch_number || '-',
      pbNo,
      challans,
      p.total_bilties || 0,
      Rs(pf),
      Rs(kaat),
      Rs(amt),
    ];
  });

  autoTable(doc, {
    startY: summaryY + 5,
    head: [['#', 'Pohonch No.', 'P/B No.', 'Challans', 'Bilties', 'TO-PAY (PF)', 'PAID (Kaat)', 'Total Amt']],
    body: rows,
    foot: [[
      { content: `TOTAL  (${selectedRows.length} pohonch)`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: String(totBilties), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: Rs(totPF),   styles: { fontStyle: 'bold', halign: 'right' } },
      { content: Rs(totKaat), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: Rs(totAmt),  styles: { fontStyle: 'bold', halign: 'right' } },
    ]],
    showFoot: 'lastPage',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [0, 0, 0],
      lineColor: [160, 160, 160],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    footStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 34 },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  /* ── sign area ── */
  const signY = Math.min((doc.lastAutoTable?.finalY || 200) + 16, ph - 48);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Authorised Signatures', margin, signY);

  const signBoxW = (pw - margin * 2 - 12) / 3;
  ['Prepared By', 'Checked By', 'Authorised By'].forEach((label, i) => {
    const x = margin + i * (signBoxW + 6);
    const y = signY + 5;
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.rect(x, y, signBoxW, 30);
    // signature line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(x + 5, y + 20, x + signBoxW - 5, y + 20);
    // label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(label, x + signBoxW / 2, y + 26, { align: 'center' });
  });

  /* ── page footer ── */
  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} / ${np}`, pw - margin, ph - 5, { align: 'right' });
  }

  return doc.output('bloburl');
}

/* ─── PDF Preview Modal ──────────────────────────────────────────────────── */
function PDFPreviewModal({ pdfUrl, onClose, onDownload, fileName }) {
  if (!pdfUrl) return null;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80">
      {/* toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-white" />
          <span className="text-white font-bold text-sm">Crossing Bill — Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            download={fileName || 'crossing-bill.pdf'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all"
          >
            <Printer className="h-4 w-4" /> Download PDF
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* iframe */}
      <iframe
        src={pdfUrl}
        title="Crossing Bill Preview"
        className="flex-1 w-full border-0"
      />
    </div>
  );
}

/* ─── Print Settings Modal ───────────────────────────────────────────────── */
function PrintSettingsModal({ show, onClose, selectedRows }) {
  const defaultTransport = useMemo(() => {
    const names = [...new Set((selectedRows || []).map(p => p.transport_name).filter(Boolean))];
    return names.length === 1 ? names[0] : names.slice(0, 2).join(', ') + (names.length > 2 ? '…' : '');
  }, [selectedRows]);

  const [title, setTitle]                 = useState('CROSSING BILL');
  const [transportName, setTransportName] = useState('');
  const [fromDate, setFromDate]           = useState('');
  const [toDate, setToDate]               = useState('');
  const [generating, setGenerating]       = useState(false);
  const [pdfUrl, setPdfUrl]               = useState(null);
  const [pdfFileName, setPdfFileName]     = useState('');

  useEffect(() => {
    if (show) { setTransportName(defaultTransport); setPdfUrl(null); }
  }, [show, defaultTransport]);

  // Revoke blob URL when modal closes
  useEffect(() => {
    if (!show && pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
  }, [show]);

  if (!show) return null;

  const handlePreview = async () => {
    setGenerating(true);
    try {
      const url = await buildCrossingBillBlobURL(selectedRows, {
        title,
        transportName,
        fromDate: fromDate ? format(new Date(fromDate), 'dd MMM yyyy') : '',
        toDate:   toDate   ? format(new Date(toDate),   'dd MMM yyyy') : '',
      });
      const fname = `crossing-bill-${format(new Date(), 'dd-MM-yyyy-HHmm')}.pdf`;
      setPdfUrl(url);
      setPdfFileName(fname);
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClosePdfPreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  return (
    <>
      {/* Settings panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-900">
            <div className="flex items-center gap-2.5">
              <Settings className="h-5 w-5 text-white" />
              <h2 className="text-base font-bold text-white">Print Settings</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="p-3 bg-gray-100 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium">
              {selectedRows.length} crossing challan{selectedRows.length > 1 ? 's' : ''} selected
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                <AlignLeft className="h-3.5 w-3.5 inline mr-1" />Document Title
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="CROSSING BILL"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-black" />
            </div>

            {/* Transport Name */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                <Truck className="h-3.5 w-3.5 inline mr-1" />Transport Name <span className="text-gray-400 normal-case font-normal">(shown on top of document)</span>
              </label>
              <input type="text" value={transportName} onChange={e => setTransportName(e.target.value)}
                placeholder="Auto-filled from selection"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-black" />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />From Date
                </label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />To Date
                </label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-black" />
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1 border border-gray-200">
              <p className="font-semibold text-gray-800">Document layout:</p>
              <p>• Title: <span className="font-medium">{title || 'CROSSING BILL'}</span></p>
              {transportName && <p>• Transport on top: {transportName}</p>}
              {(fromDate || toDate) && <p>• Period: {fromDate ? format(new Date(fromDate), 'dd MMM yyyy') : '—'} to {toDate ? format(new Date(toDate), 'dd MMM yyyy') : '—'}</p>}
              <p>• Columns: #, Pohonch No., P/B No., Challans, Bilties, TO-PAY (PF), PAID (Kaat), Total Amt</p>
              <p>• 3 signature boxes at bottom · Portrait A4 · Black & white</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handlePreview} disabled={generating}
              className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {generating ? 'Generating...' : 'Preview PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen preview */}
      {pdfUrl && (
        <PDFPreviewModal
          pdfUrl={pdfUrl}
          fileName={pdfFileName}
          onClose={handleClosePdfPreview}
        />
      )}
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function PohonchListPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [allPohonch, setAllPohonch]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [totalCount, setTotalCount]   = useState(0);
  const [usersMap, setUsersMap]       = useState({});
  const [challanDatesMap, setChallanDatesMap] = useState({});

  const [searchGR, setSearchGR]               = useState('');
  const [searchTransport, setSearchTransport] = useState('');
  const [searchChallan, setSearchChallan]     = useState('');
  const [activeSearch, setActiveSearch]       = useState({ gr: '', transport: '', challan: '' });

  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [page, setPage]                 = useState(0);

  const [editingId, setEditingId]               = useState(null);
  const [editTransportName, setEditTransportName] = useState('');
  const [editGstin, setEditGstin]               = useState('');
  const [editPohonchNumber, setEditPohonchNumber] = useState('');
  const [actionLoading, setActionLoading]       = useState(null);
  const [expandedRow, setExpandedRow]           = useState(null);

  // Selection for print
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const crossChallanPrint = useCrossChallanPrint({
    onDataRefreshed: (pohonchNumber, updatedPohonch) => {
      setAllPohonch(prev => prev.map(p => p.pohonch_number === pohonchNumber ? { ...p, ...updatedPohonch } : p));
    },
  });

  const fetchChallanDates = async (challanNos) => {
    const unique = [...new Set((challanNos || []).filter(Boolean))];
    if (!unique.length) return;
    const { data } = await supabase.from('challan_details').select('challan_no, dispatch_date, date').in('challan_no', unique);
    if (data) { const m = {}; data.forEach(c => { m[c.challan_no] = c; }); setChallanDatesMap(prev => ({ ...prev, ...m })); }
  };

  const fetchUsersMap = async (userIds) => {
    const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
    if (!uniqueIds.length) return;
    const { data } = await supabase.from('users').select('id, name, username, post').in('id', uniqueIds);
    if (data) { const m = {}; data.forEach(u => { m[u.id] = u; }); setUsersMap(m); }
  };

  const fetchPohonch = useCallback(async () => {
    try {
      setLoading(true); setExpandedRow(null); setEditingId(null);

      let query = supabase.from('pohonch').select('*', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false });
      if (activeSearch.transport.trim()) query = query.ilike('transport_name', `%${activeSearch.transport.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];
      if (activeSearch.gr.trim()) {
        const s = activeSearch.gr.trim().toLowerCase();
        results = results.filter(p => (Array.isArray(p.bilty_metadata) ? p.bilty_metadata : []).some(b => (b.gr_no || '').toString().toLowerCase().includes(s)));
      }
      if (activeSearch.challan.trim()) {
        const s = activeSearch.challan.trim().toLowerCase();
        results = results.filter(p => (Array.isArray(p.challan_metadata) ? p.challan_metadata : []).some(c => (c || '').toString().toLowerCase().includes(s)));
      }

      setAllPohonch(results);
      setTotalCount(results.length);
      setPage(0);
      setSelectedIds(new Set());

      const userIds = results.flatMap(p => [p.created_by, p.updated_by, p.signed_by]).filter(Boolean);
      fetchUsersMap(userIds);
      const allChallans = results.flatMap(p => Array.isArray(p.challan_metadata) ? p.challan_metadata : []);
      fetchChallanDates(allChallans);
    } catch (err) {
      console.error('Error fetching pohonch:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSearch]);

  useEffect(() => { if (mounted) fetchPohonch(); }, [mounted, fetchPohonch]);

  const handleSearch = () => { setActiveSearch({ gr: searchGR, transport: searchTransport, challan: searchChallan }); };
  const handleClearSearch = () => { setSearchGR(''); setSearchTransport(''); setSearchChallan(''); setActiveSearch({ gr: '', transport: '', challan: '' }); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };
  const hasActiveFilters = activeSearch.gr || activeSearch.transport || activeSearch.challan;

  const ITEMS_OPTIONS = [30, 50, 100, 200, 'all'];

  const paginatedData = useMemo(() => {
    if (itemsPerPage === 'all') return allPohonch;
    const start = page * itemsPerPage;
    return allPohonch.slice(start, start + itemsPerPage);
  }, [allPohonch, page, itemsPerPage]);

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalCount / (itemsPerPage || 30));

  const totals = useMemo(() => {
    let amt = 0, kaat = 0, pf = 0, dd = 0, bilties = 0, pkg = 0, wt = 0;
    allPohonch.forEach(p => { amt += p.total_amount || 0; kaat += p.total_kaat || 0; pf += p.total_pf || 0; dd += p.total_dd || 0; bilties += p.total_bilties || 0; pkg += p.total_packages || 0; wt += p.total_weight || 0; });
    return { amt, kaat, pf, dd, bilties, pkg, wt };
  }, [allPohonch]);

  const getUserName = (id) => { if (!id) return '-'; const u = usersMap[id]; return u ? (u.name || u.username || 'Unknown') : 'Loading...'; };

  // Selection
  const visibleIds      = paginatedData.map(p => p.id);
  const allPageSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someSelected    = selectedIds.size > 0;

  const toggleRow = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allPageSelected) visibleIds.forEach(id => n.delete(id));
      else visibleIds.forEach(id => n.add(id));
      return n;
    });
  };
  const selectAll   = () => setSelectedIds(new Set(allPohonch.map(p => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const selectedRows = useMemo(() => allPohonch.filter(p => selectedIds.has(p.id)), [allPohonch, selectedIds]);

  // Row actions
  const handleToggleSign = async (pohonch) => {
    if (!user?.id) return;
    try {
      setActionLoading(pohonch.id);
      const newSigned = !pohonch.is_signed;
      const { error } = await supabase.from('pohonch').update({ is_signed: newSigned, signed_at: newSigned ? new Date().toISOString() : null, signed_by: newSigned ? user.id : null, updated_by: user.id }).eq('id', pohonch.id);
      if (error) throw error;
      setAllPohonch(prev => prev.map(p => p.id === pohonch.id ? { ...p, is_signed: newSigned, signed_at: newSigned ? new Date().toISOString() : null, signed_by: newSigned ? user.id : null, updated_by: user.id } : p));
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (pohonch) => {
    if (!confirm(`Permanently delete pohonch ${pohonch.pohonch_number}?`)) return;
    try {
      setActionLoading(pohonch.id);
      const { error } = await supabase.from('pohonch').delete().eq('id', pohonch.id);
      if (error) throw error;
      setAllPohonch(prev => prev.filter(p => p.id !== pohonch.id));
      setTotalCount(prev => prev - 1);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setActionLoading(null); }
  };

  const handleStartEdit = (p) => { setEditingId(p.id); setEditTransportName(p.transport_name); setEditGstin(p.transport_gstin || ''); setEditPohonchNumber(p.pohonch_number || ''); };

  const handleSaveEdit = async (pohonchId) => {
    try {
      setActionLoading(pohonchId);
      const cur = allPohonch.find(p => p.id === pohonchId);
      if (editPohonchNumber && editPohonchNumber !== cur?.pohonch_number) {
        const { data: dup } = await supabase.from('pohonch').select('id').eq('pohonch_number', editPohonchNumber.trim()).eq('is_active', true).neq('id', pohonchId).limit(1);
        if (dup?.length) { alert(`Pohonch "${editPohonchNumber}" already exists!`); setActionLoading(null); return; }
      }
      const { error } = await supabase.from('pohonch').update({ transport_name: editTransportName, transport_gstin: editGstin || null, pohonch_number: editPohonchNumber.trim() || cur?.pohonch_number, updated_by: user?.id }).eq('id', pohonchId);
      if (error) throw error;
      setAllPohonch(prev => prev.map(p => p.id === pohonchId ? { ...p, transport_name: editTransportName, transport_gstin: editGstin || null, pohonch_number: editPohonchNumber.trim() || p.pohonch_number, updated_by: user?.id } : p));
      setEditingId(null);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setActionLoading(null); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-3 sm:p-4">
      <div className="w-full mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/hub-management/cross-challan" className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900">Pohonch List</h1>
            <p className="text-sm text-gray-600 mt-0.5">All pohonch records · Search by GR, Transport or Challan</p>
          </div>
          {someSelected && (
            <button
              onClick={() => setShowPrintSettings(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Selected ({selectedIds.size})
            </button>
          )}
          <button onClick={fetchPohonch} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 shadow-sm transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-gray-800">Search Pohonch</h2>
            {hasActiveFilters && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Filter className="w-3 h-3" /> Filtered</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'GR Number', icon: Hash, value: searchGR, set: setSearchGR, placeholder: 'Search by GR no...' },
              { label: 'Transport Name', icon: Truck, value: searchTransport, set: setSearchTransport, placeholder: 'Search by transport...' },
              { label: 'Challan Number', icon: FileText, value: searchChallan, set: setSearchChallan, placeholder: 'Search by challan no...' },
            ].map(({ label, icon: Icon, value, set, placeholder }) => (
              <div key={label}>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={value} onChange={e => set(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSearch} className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
              <Search className="w-4 h-4" /> Search
            </button>
            {hasActiveFilters && (
              <button onClick={handleClearSearch} className="px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2">
                <X className="w-4 h-4" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && allPohonch.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Pohonch',       value: totalCount,                                     color: 'teal' },
              { label: 'Total Bilties', value: totals.bilties,                                 color: 'blue' },
              { label: 'Packages',      value: totals.pkg,                                     color: 'purple' },
              { label: 'Weight',        value: `${totals.wt.toFixed(1)} kg`,                   color: 'indigo' },
              { label: 'Amount',        value: `₹${Math.round(totals.amt).toLocaleString()}`,  color: 'gray' },
              { label: 'Kaat',          value: `₹${Math.round(totals.kaat).toLocaleString()}`, color: 'emerald' },
              { label: 'PF',            value: `₹${Math.round(totals.pf).toLocaleString()}`,   color: 'cyan' },
            ].map(c => <SummaryCard key={c.label} {...c} />)}
          </div>
        )}

        {/* Transport-wise Analysis */}
        {!loading && <TransportWiseAnalysis allPohonch={allPohonch} challanDatesMap={challanDatesMap} />}

        {/* Selection toolbar */}
        {someSelected && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
            <CheckSquare className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-bold text-teal-800">{selectedIds.size} selected</span>
            <button onClick={selectAll}   className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline">Select All ({allPohonch.length})</button>
            <button onClick={deselectAll} className="text-xs font-semibold text-red-600 hover:text-red-800 underline">Deselect All</button>
            <div className="ml-auto">
              <button onClick={() => setShowPrintSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-teal-700 hover:to-emerald-700 transition-all shadow-sm">
                <Printer className="w-4 h-4" /> Print {selectedIds.size} Crossing Challan{selectedIds.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" /><p className="text-gray-600 font-medium">Loading pohonch records...</p></div>
          ) : allPohonch.length === 0 ? (
            <div className="p-12 text-center"><Package className="w-16 h-16 text-gray-300 mx-auto mb-3" /><p className="text-gray-600 font-medium">No pohonch records found</p>{hasActiveFilters && <p className="text-gray-500 text-sm mt-1">Try adjusting your search filters</p>}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                      {/* Select all checkbox */}
                      <th className="px-2 py-3 w-8">
                        <button onClick={togglePage} className="text-teal-600 hover:text-teal-800">
                          {allPageSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                      </th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">#</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">Pohonch No.</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">Transport</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">GSTIN</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">Challans</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-600 uppercase">Bilties</th>
                      <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-600 uppercase">Amt</th>
                      <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-600 uppercase">Kaat</th>
                      <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-600 uppercase">PF</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-600 uppercase">Signed</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">Created By</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">Updated By</th>
                      <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-600 uppercase">Created</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-600 uppercase">Print</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((p, idx) => {
                      const challans   = Array.isArray(p.challan_metadata) ? p.challan_metadata : [];
                      const isEditing  = editingId === p.id;
                      const isActing   = actionLoading === p.id;
                      const isExpanded = expandedRow === p.id;
                      const bilties    = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
                      const isSelected = selectedIds.has(p.id);
                      const globalIdx  = itemsPerPage === 'all' ? idx : page * itemsPerPage + idx;

                      return (
                        <React.Fragment key={p.id}>
                          <tr className={`border-b border-gray-100 transition-colors ${isSelected ? 'bg-teal-50/70' : globalIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${isExpanded ? '!bg-teal-50/80' : 'hover:bg-gray-50'}`}>
                            {/* Checkbox */}
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => toggleRow(p.id)} className="text-teal-600 hover:text-teal-800">
                                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-black text-xs">{globalIdx + 1}</td>
                            <td className="px-2 py-2">
                              {isEditing ? (
                                <input type="text" value={editPohonchNumber} onChange={e => setEditPohonchNumber(e.target.value.toUpperCase())} className="w-full px-2 py-1 border border-teal-300 rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 text-black" style={{ minWidth: '90px' }} />
                              ) : (
                                <button onClick={() => setExpandedRow(isExpanded ? null : p.id)} className="font-mono font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 text-xs">
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {p.pohonch_number}
                                </button>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {isEditing ? (
                                <input type="text" value={editTransportName} onChange={e => setEditTransportName(e.target.value)} className="w-full px-2 py-1 border border-teal-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-black" />
                              ) : (
                                <span className="font-semibold text-black truncate max-w-[180px] block text-xs" title={p.transport_name}>{p.transport_name}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {isEditing ? (
                                <input type="text" value={editGstin} onChange={e => setEditGstin(e.target.value)} className="w-full px-2 py-1 border border-teal-300 rounded text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 text-black" />
                              ) : (
                                <span className="text-black text-[10px] font-mono">{p.transport_gstin || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-black text-[10px]">
                              {challans.length > 3 ? `${challans.slice(0, 3).join(', ')} +${challans.length - 3}` : challans.join(', ') || '-'}
                            </td>
                            <td className="px-2 py-2 text-center font-medium text-black">{p.total_bilties}</td>
                            <td className="px-2 py-2 text-right font-medium text-black">₹{Math.round(p.total_amount || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-medium text-emerald-700">₹{Math.round(p.total_kaat || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-bold text-teal-700">₹{Math.round(p.total_pf || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => handleToggleSign(p)} disabled={isActing}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-sm ${p.is_signed ? 'text-white bg-green-600 hover:bg-green-700' : 'text-white bg-red-500 hover:bg-red-600'}`}
                                title={p.is_signed ? `Signed by ${getUserName(p.signed_by)}` : 'Click to mark as signed'}>
                                {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />}
                                {p.is_signed ? 'Signed' : 'Unsigned'}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-[10px]"><div className="flex items-center gap-1 text-black"><User className="w-3 h-3 text-blue-500 flex-shrink-0" /><span className="truncate max-w-[80px]">{getUserName(p.created_by)}</span></div></td>
                            <td className="px-2 py-2 text-[10px]">{p.updated_by ? <div className="flex items-center gap-1 text-black"><User className="w-3 h-3 text-amber-500 flex-shrink-0" /><span className="truncate max-w-[80px]">{getUserName(p.updated_by)}</span></div> : <span className="text-black">-</span>}</td>
                            <td className="px-2 py-2 text-black text-[10px]">{p.created_at ? format(new Date(p.created_at), 'dd/MM/yy HH:mm') : '-'}</td>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => crossChallanPrint.handlePrint(p.pohonch_number)} disabled={crossChallanPrint.printingPohonch === p.pohonch_number}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors shadow-sm border border-teal-200">
                                {crossChallanPrint.printingPohonch === p.pohonch_number ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />} Print
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button onClick={() => handleSaveEdit(p.id)} disabled={isActing} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Save">{isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                                    <button onClick={() => setEditingId(null)} className="p-1 text-black hover:bg-gray-100 rounded" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleStartEdit(p)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDelete(p)} disabled={isActing} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Delete">{isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded bilty rows */}
                          {isExpanded && bilties.length > 0 && (
                            <tr>
                              <td colSpan={17} className="px-4 py-3 bg-teal-50/70 border-b border-teal-100">
                                <div className="text-xs font-bold text-black mb-2">
                                  Bilties in {p.pohonch_number} ({bilties.length} GRs) — Challans: {challans.join(', ')}
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-100">
                                        {['#','GR No.','EWB','P/B No.','Challan','Consignor','Consignee','Dest','Pkg','Wt','Amt','Kaat','Rate','DD','PF'].map(h => (
                                          <th key={h} className="px-2 py-1.5 text-left font-bold text-gray-600">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bilties.map((b, bIdx) => {
                                        const gs = activeSearch.gr.trim().toLowerCase();
                                        const hl = gs && (b.gr_no || '').toString().toLowerCase().includes(gs);
                                        return (
                                          <tr key={b.gr_no || bIdx} className={`${bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${hl ? '!bg-yellow-100' : ''}`}>
                                            <td className="px-2 py-1 text-black">{bIdx + 1}</td>
                                            <td className={`px-2 py-1 font-mono font-semibold ${hl ? 'text-amber-800' : 'text-black'}`}>{b.gr_no || '-'}{b.e_way_bill && <span className="text-green-600 font-bold ml-0.5 text-[9px]">(E)</span>}</td>
                                            <td className="px-2 py-1 text-[9px] font-mono text-black max-w-[70px] truncate">{b.e_way_bill || '-'}</td>
                                            <td className="px-2 py-1 text-black font-mono">{b.pohonch_bilty || '-'}</td>
                                            <td className="px-2 py-1 text-black">{b.challan_no || '-'}</td>
                                            <td className="px-2 py-1 text-black truncate max-w-[120px]">{b.consignor || '-'}</td>
                                            <td className="px-2 py-1 text-black truncate max-w-[120px]">{b.consignee || '-'}</td>
                                            <td className="px-2 py-1 text-black">{b.destination || '-'}</td>
                                            <td className="px-2 py-1 text-center text-black">{Math.round(b.packages || 0)}</td>
                                            <td className="px-2 py-1 text-right text-black">{(b.weight || 0).toFixed(1)}</td>
                                            <td className="px-2 py-1 text-right font-medium text-black">{b.is_paid ? 'PAID' : `₹${Math.round(b.amount || 0)}`}</td>
                                            <td className="px-2 py-1 text-right text-emerald-700">₹{Math.round(b.kaat || 0)}</td>
                                            <td className="px-2 py-1 text-right text-black text-[10px]">{b.kaat_rate ? `₹${b.kaat_rate}` : '-'}</td>
                                            <td className="px-2 py-1 text-right text-red-600">{b.dd > 0 ? `-₹${Math.round(b.dd)}` : '-'}</td>
                                            <td className="px-2 py-1 text-right font-bold text-teal-700">₹{Math.round(b.pf || 0)}</td>
                                          </tr>
                                        );
                                      })}
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
                  <tfoot>
                    <tr className="bg-gradient-to-r from-gray-100 to-slate-100 border-t-2 border-gray-300 font-bold text-xs">
                      <td colSpan={6} className="px-2 py-3 text-right text-black uppercase text-[10px]">Total ({totalCount} pohonch)</td>
                      <td className="px-2 py-3 text-center text-black">{totals.bilties}</td>
                      <td className="px-2 py-3 text-right text-black">₹{Math.round(totals.amt).toLocaleString()}</td>
                      <td className="px-2 py-3 text-right text-emerald-700">₹{Math.round(totals.kaat).toLocaleString()}</td>
                      <td className="px-2 py-3 text-right text-teal-700">₹{Math.round(totals.pf).toLocaleString()}</td>
                      <td colSpan={7} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50/50 gap-3">
                {/* Left: count + per-page */}
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-black">
                    {itemsPerPage === 'all'
                      ? `Showing all ${totalCount} records`
                      : `${page * itemsPerPage + 1}–${Math.min((page + 1) * itemsPerPage, totalCount)} of ${totalCount}`}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-black font-medium">Show:</span>
                    {ITEMS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setItemsPerPage(opt); setPage(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          itemsPerPage === opt
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-white border border-gray-300 text-black hover:bg-gray-100'
                        }`}
                      >
                        {opt === 'all' ? 'All' : opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: page nav (hidden when showing all) */}
                {itemsPerPage !== 'all' && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span className="text-sm font-bold text-black px-2">Page {page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Shared print modal */}
      <CrossChallanPrintModal
        previewUrl={crossChallanPrint.previewUrl}
        previewName={crossChallanPrint.previewName}
        onDownload={crossChallanPrint.handleDownload}
        onClose={crossChallanPrint.handleClose}
      />

      {/* Print settings modal */}
      <PrintSettingsModal
        show={showPrintSettings}
        onClose={() => setShowPrintSettings(false)}
        selectedRows={selectedRows}
        onPrint={() => {}}
      />
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const map = {
    teal: 'from-teal-500 to-teal-600', blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600', indigo: 'from-indigo-500 to-indigo-600',
    gray: 'from-gray-600 to-gray-700', emerald: 'from-emerald-500 to-emerald-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
      <p className="text-xs font-bold text-gray-500 uppercase mb-1">{label}</p>
      <p className={`text-lg font-extrabold bg-gradient-to-r ${map[color] || map.teal} bg-clip-text text-transparent`}>{value}</p>
    </div>
  );
}
