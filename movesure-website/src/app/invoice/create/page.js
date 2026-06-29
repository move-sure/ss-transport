'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '../../../components/dashboard/navbar';
import { useAuth } from '../../utils/auth';
import {
  ChevronLeft, Plus, Trash2, Loader2, Save, FileText,
  Building2, Users, Truck, Package, CalendarDays, Info,
  Printer, Search, X as XIcon, AlertCircle, Pencil,
  RotateCcw, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';

const InvoicePrintModal = dynamic(() => import('../../../components/invoice/invoice-print-modal'), { ssr: false });

const API_BASE = 'https://api.movesure.io';

function api(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  }).then(async (r) => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.message || 'API error');
    return json.data;
  });
}

const INVOICE_TYPES = [
  { value: 'TAX_INVOICE', label: 'Tax Invoice' },
  { value: 'BILL_OF_SUPPLY', label: 'Bill of Supply' },
  { value: 'PROFORMA', label: 'Proforma Invoice' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'DEBIT_NOTE', label: 'Debit Note' },
  { value: 'DELIVERY_CHALLAN', label: 'Delivery Challan' },
];

const SUPPLY_TYPES = [
  { value: 'B2B', label: 'B2B – Business to Business' },
  { value: 'B2C', label: 'B2C – Business to Consumer' },
  { value: 'EXPORT', label: 'Export Invoice' },
  { value: 'SEZ', label: 'SEZ Supply' },
];

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['NOS', 'KG', 'MTR', 'LTR', 'BOX', 'SET', 'PCS', 'TON', 'BAG', 'BDL'];

const today = () => new Date().toISOString().split('T')[0];
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0]; };

const EMPTY_LINE = {
  item_name: '', inventory_item_id: '', description: '',
  hsn_sac_code: '', quantity: 1, unit: 'NOS', rate: '',
  weight: '', pvt_marks: '', discount_percent: 0, gst_rate: 18, cess_rate: 0,
};

function calcLine(line, taxType) {
  const qty = parseFloat(line.quantity) || 0;
  const rate = parseFloat(line.rate) || 0;
  const disc = parseFloat(line.discount_percent) || 0;
  const gst = parseFloat(line.gst_rate) || 0;
  const gross = qty * rate;
  const discAmt = (gross * disc) / 100;
  const taxable = gross - discAmt;
  const isInter = taxType === 'INTER';
  const cgst = isInter ? 0 : (taxable * gst) / 200;
  const sgst = isInter ? 0 : (taxable * gst) / 200;
  const igst = isInter ? (taxable * gst) / 100 : 0;
  return { gross, discAmt, taxable, cgst, sgst, igst, total: taxable + cgst + sgst + igst };
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors';
const sel = `${inp} cursor-pointer`;
const lbl = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';

// ── Inventory search dropdown ──────────────────────────────────────────────
function InventorySearch({ inventory, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return inventory.slice(0, 12);
    const q = query.toLowerCase();
    return inventory.filter(item =>
      item.item_name.toLowerCase().includes(q) ||
      (item.item_code?.toLowerCase() || '').includes(q) ||
      (item.hsn_sac_code?.toLowerCase() || '').includes(q)
    ).slice(0, 12);
  }, [query, inventory]);

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (item) => {
    setQuery(item.item_name);
    setOpen(false);
    onSelect(item);
  };

  const clearSelection = () => {
    setQuery('');
    onChange('');
    onSelect(null);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          className="w-full border border-gray-200 rounded-lg pl-7 pr-7 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder="Search or type item..."
        />
        {query && (
          <button type="button" onMouseDown={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 w-72 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">
              No catalog match — using manual entry above
            </div>
          ) : (
            filtered.map(item => (
              <button key={item.id} type="button"
                onMouseDown={() => handleSelect(item)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors">
                <div className="font-medium text-gray-900 text-sm">{item.item_name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 flex gap-2">
                  {item.item_code && <span className="font-mono">{item.item_code}</span>}
                  {item.hsn_sac_code && <span>HSN: {item.hsn_sac_code}</span>}
                  <span className="text-blue-500 font-medium">GST {item.gst_rate}%</span>
                  {item.default_rate && <span>₹{item.default_rate}/{item.unit_of_measurement}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, accent = 'blue' }) {
  const colors = { blue: 'border-blue-200 bg-blue-50/40', green: 'border-green-200 bg-green-50/40', purple: 'border-purple-200 bg-purple-50/40', orange: 'border-orange-200 bg-orange-50/40', gray: 'border-gray-200 bg-gray-50/40' };
  const iconColors = { blue: 'text-blue-600 bg-blue-100', green: 'text-green-600 bg-green-100', purple: 'text-purple-600 bg-purple-100', orange: 'text-orange-600 bg-orange-100', gray: 'text-gray-600 bg-gray-100' };
  return (
    <div className={`rounded-xl border ${colors[accent]} overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-inherit bg-white/60">
        <span className={`p-1.5 rounded-lg ${iconColors[accent]}`}><Icon className="h-4 w-4" /></span>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold, cls }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-gray-600 ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`font-semibold tabular-nums ${cls || 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CreateInvoicePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Print modal
  const [showPrint, setShowPrint] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState(null);

  // Edit mode
  const [editingId, setEditingId] = useState(null);
  const [editingInvoiceNo, setEditingInvoiceNo] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Recent invoices panel
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState('');
  const [showRecent, setShowRecent] = useState(true);

  const [tenantId, setTenantId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [seller, setSeller] = useState({
    seller_name: '', seller_gstin: '', seller_pan: '',
    seller_address: '', seller_state: '', seller_state_code: '',
  });

  const [receiverId, setReceiverId] = useState('');
  const [buyer, setBuyer] = useState({
    buyer_name: '', buyer_gstin: '', buyer_pan: '', buyer_aadhar_number: '',
    billing_address: '', shipping_address: '', buyer_state: '', buyer_state_code: '',
  });

  const [meta, setMeta] = useState({
    invoice_type: 'TAX_INVOICE', invoice_date: today(), due_date: addDays(today(), 30),
    supply_type: 'B2B', place_of_supply: '', pvt_marks: '', is_reverse_charge: false,
    e_way_bill: '', transport_name: 'SS TRANSPORT CORPORATION', gr_no: '', challan_no: '',
    po_number: '', po_date: '', notes: '', terms_and_conditions: 'Payment within 30 days.', status: 'DRAFT',
  });

  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  useEffect(() => {
    Promise.all([
      api('/api/invoice/tenants'), api('/api/invoice/series'),
      api('/api/invoice/receivers'), api('/api/invoice/inventory'),
    ]).then(([t, s, r, inv]) => {
      setTenants(t); setAllSeries(s); setReceivers(r); setInventory(inv);
      if (t.length > 0) {
        const latest = t[t.length - 1];
        setTenantId(latest.id); setSelectedTenant(latest); applyTenant(latest);
        const ts = s.filter(x => x.tenant_id === latest.id);
        const def = ts.find(x => x.is_default) || ts[ts.length - 1];
        if (def) setSeriesId(def.id);
      }
    }).catch(() => setError('Failed to load data. Check backend connection.')).finally(() => setDataLoading(false));
  }, []);

  const filteredSeries = useMemo(() => allSeries.filter(s => s.tenant_id === tenantId), [allSeries, tenantId]);

  const taxType = useMemo(() => {
    if (!seller.seller_state_code || !buyer.buyer_state_code) return 'INTRA';
    return seller.seller_state_code === buyer.buyer_state_code ? 'INTRA' : 'INTER';
  }, [seller.seller_state_code, buyer.buyer_state_code]);

  const applyTenant = (t) => {
    if (!t) return;
    const addr = [t.address_line1, t.address_line2, t.city, t.state, t.pincode].filter(Boolean).join(', ');
    setSeller({ seller_name: t.company_name || '', seller_gstin: t.gstin || '', seller_pan: t.pan || '', seller_address: addr, seller_state: t.state || '', seller_state_code: t.state_code || '' });
    if (t.default_payment_terms) setMeta(m => ({ ...m, due_date: addDays(m.invoice_date, t.default_payment_terms) }));
    if (t.terms_and_conditions) setMeta(m => ({ ...m, terms_and_conditions: t.terms_and_conditions }));
  };

  // Load recent 10 invoices
  const loadRecent = useCallback(() => {
    setRecentLoading(true);
    api('/api/invoice/list?page_size=500')
      .then(data => setRecentInvoices(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const filteredRecent = useMemo(() => {
    if (!recentSearch.trim()) return recentInvoices;
    const q = recentSearch.toLowerCase();
    return recentInvoices.filter(inv =>
      (inv.invoice_no || '').toLowerCase().includes(q) ||
      (inv.buyer_name || '').toLowerCase().includes(q) ||
      (inv.seller_name || '').toLowerCase().includes(q)
    );
  }, [recentInvoices, recentSearch]);

  // Pre-fill form from an existing invoice for editing
  const loadForEdit = async (inv) => {
    setEditLoading(true);
    setError('');
    try {
      const data = await api(`/api/invoice/${inv.id}`);
      setEditingId(data.id);
      setEditingInvoiceNo(data.invoice_no || '');

      // Tenant + series
      if (data.tenant_id) {
        setTenantId(data.tenant_id);
        const t = tenants.find(x => x.id === data.tenant_id);
        setSelectedTenant(t || null);
        const ts = allSeries.filter(s => s.tenant_id === data.tenant_id);
        const def = ts.find(x => x.is_default) || ts[ts.length - 1];
        setSeriesId(def?.id || '');
      }

      // Seller
      setSeller({
        seller_name:       data.seller_name       || '',
        seller_gstin:      data.seller_gstin       || '',
        seller_pan:        data.seller_pan         || '',
        seller_address:    data.seller_address     || '',
        seller_state:      data.seller_state       || '',
        seller_state_code: data.seller_state_code  || '',
      });

      // Buyer
      setReceiverId(data.receiver_id || '');
      setBuyer({
        buyer_name:          data.buyer_name          || '',
        buyer_gstin:         data.buyer_gstin          || '',
        buyer_pan:           data.buyer_pan            || '',
        buyer_aadhar_number: data.buyer_aadhar_number  || '',
        billing_address:     data.billing_address      || '',
        shipping_address:    data.shipping_address     || '',
        buyer_state:         data.buyer_state          || '',
        buyer_state_code:    data.buyer_state_code     || '',
      });

      // Meta
      setMeta({
        invoice_type:        data.invoice_type        || 'TAX_INVOICE',
        invoice_date:        data.invoice_date        || today(),
        due_date:            data.due_date            || addDays(today(), 30),
        supply_type:         data.supply_type         || 'B2B',
        place_of_supply:     data.place_of_supply     || '',
        pvt_marks:           data.pvt_marks           || '',
        is_reverse_charge:   data.is_reverse_charge   || false,
        e_way_bill:          data.e_way_bill          || '',
        transport_name:      data.transport_name      || 'SS TRANSPORT CORPORATION',
        gr_no:               data.gr_no               || '',
        challan_no:          data.challan_no          || '',
        po_number:           data.po_number           || '',
        po_date:             data.po_date             || '',
        notes:               data.notes               || '',
        terms_and_conditions:data.terms_and_conditions|| 'Payment within 30 days.',
        status:              data.status              || 'DRAFT',
      });

      // Line items
      setLines((data.line_items || []).map(l => ({
        item_name:          l.item_name          || '',
        inventory_item_id:  l.inventory_item_id  || '',
        description:        l.description        || '',
        hsn_sac_code:       l.hsn_sac_code       || '',
        quantity:           l.quantity           ?? 1,
        unit:               l.unit               || 'NOS',
        rate:               l.rate               ?? '',
        weight:             l.weight             || '',
        pvt_marks:          l.pvt_marks          || '',
        discount_percent:   l.discount_percent   ?? 0,
        gst_rate:           l.gst_rate           ?? 18,
        cess_rate:          l.cess_rate          ?? 0,
      })));

      setShowRecent(false); // collapse panel after loading
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError('Failed to load invoice: ' + e.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Reset back to blank create mode
  const resetToCreate = () => {
    setEditingId(null);
    setEditingInvoiceNo('');
    setLines([{ ...EMPTY_LINE }]);
    setBuyer({ buyer_name: '', buyer_gstin: '', buyer_pan: '', buyer_aadhar_number: '', billing_address: '', shipping_address: '', buyer_state: '', buyer_state_code: '' });
    setReceiverId('');
    setMeta({
      invoice_type: 'TAX_INVOICE', invoice_date: today(), due_date: addDays(today(), 30),
      supply_type: 'B2B', place_of_supply: '', pvt_marks: '', is_reverse_charge: false,
      e_way_bill: '', transport_name: 'SS TRANSPORT CORPORATION', gr_no: '', challan_no: '',
      po_number: '', po_date: '', notes: '', terms_and_conditions: 'Payment within 30 days.', status: 'DRAFT',
    });
    setError('');
  };

  const handleTenantChange = (id) => {
    setTenantId(id);
    const t = tenants.find(x => x.id === id);
    setSelectedTenant(t || null);
    if (t) applyTenant(t);
    const ts = allSeries.filter(s => s.tenant_id === id);
    const def = ts.find(x => x.is_default) || ts[ts.length - 1];
    setSeriesId(def?.id || '');
  };

  const handleReceiverChange = (id) => {
    setReceiverId(id);
    const r = receivers.find(x => x.id === id);
    if (!r) { setBuyer({ buyer_name: '', buyer_gstin: '', buyer_pan: '', buyer_aadhar_number: '', billing_address: '', shipping_address: '', buyer_state: '', buyer_state_code: '' }); return; }
    const billing = [r.billing_address_line1, r.billing_address_line2, r.billing_city, r.billing_state, r.billing_pincode].filter(Boolean).join(', ');
    const shipping = r.shipping_address_line1 ? [r.shipping_address_line1, r.shipping_address_line2, r.shipping_city, r.shipping_state, r.shipping_pincode].filter(Boolean).join(', ') : '';
    setBuyer({ buyer_name: r.company_name || '', buyer_gstin: r.gstin || '', buyer_pan: r.pan || '', buyer_aadhar_number: r.aadhar_number || '', billing_address: billing, shipping_address: shipping, buyer_state: r.billing_state || '', buyer_state_code: r.billing_state_code || '' });
  };

  // Line helpers
  const setLine = (i, key, val) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  const applyInventoryItem = (i, item) => {
    if (!item) return;
    setLines(ls => ls.map((l, idx) => idx === i ? {
      ...l, inventory_item_id: item.id, item_name: item.item_name,
      hsn_sac_code: item.hsn_sac_code || '', unit: item.unit_of_measurement || 'NOS',
      rate: item.default_rate ?? '', gst_rate: item.gst_rate ?? 18,
      cess_rate: item.cess_rate ?? 0, discount_percent: item.default_discount_pct ?? 0,
    } : l));
  };

  const addLine = () => setLines(ls => [...ls, { ...EMPTY_LINE }]);
  const removeLine = (i) => setLines(ls => ls.filter((_, idx) => idx !== i));

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, taxable = 0, cgst = 0, sgst = 0, igst = 0;
    lines.forEach(l => { const c = calcLine(l, taxType); subtotal += c.gross; discount += c.discAmt; taxable += c.taxable; cgst += c.cgst; sgst += c.sgst; igst += c.igst; });
    const total = taxable + cgst + sgst + igst;
    const roundOff = Math.round(total) - total;
    return { subtotal, discount, taxable, cgst, sgst, igst, total, roundOff, grandTotal: Math.round(total) };
  }, [lines, taxType]);

  const buildBody = (isEdit = false) => ({
    tenant_id: tenantId,
    ...(!isEdit && { invoice_series_id: seriesId || undefined }),
    ...seller,
    receiver_id: receiverId || undefined,
    ...buyer,
    ...meta,
    ...(isEdit ? { updated_by: user?.id } : { created_by: user?.id }),
    line_items: lines.map(l => ({
      item_name: l.item_name,
      inventory_item_id: l.inventory_item_id || undefined,
      description: l.description || undefined,
      hsn_sac_code: l.hsn_sac_code || undefined,
      quantity: parseFloat(l.quantity) || 1,
      unit: l.unit,
      rate: parseFloat(l.rate),
      weight: l.weight ? parseFloat(l.weight) : undefined,
      pvt_marks: meta.pvt_marks || l.pvt_marks || undefined,
      discount_percent: parseFloat(l.discount_percent) || 0,
      gst_rate: parseFloat(l.gst_rate) || 18,
      cess_rate: parseFloat(l.cess_rate) || 0,
    })),
  });

  const validate = () => {
    if (!tenantId) return 'Please select a tenant';
    if (!seller.seller_name) return 'Seller name is required';
    if (!buyer.buyer_name) return 'Buyer name is required';
    if (lines.some(l => !l.item_name.trim() || !l.rate)) return 'All line items need a name and rate';
    return null;
  };

  const buildPdfResult = (apiResult) => ({
    ...apiResult,
    ...seller,
    ...buyer,
    ...meta,
    pvt_marks: meta.pvt_marks || apiResult?.pvt_marks || '',
    bank_name:       selectedTenant?.bank_name        || '',
    bank_account_no: selectedTenant?.bank_account_no  || '',
    bank_ifsc:       selectedTenant?.bank_ifsc        || '',
    bank_branch:     selectedTenant?.bank_branch      || '',
    upi_id:          selectedTenant?.upi_id           || '',
  });

  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      if (editingId) {
        await api(`/api/invoice/${editingId}/edit`, { method: 'PUT', body: JSON.stringify(buildBody(true)) });
        loadRecent();
      } else {
        await api('/api/invoice/create', { method: 'POST', body: JSON.stringify(buildBody()) });
      }
      router.push('/invoice');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleSaveAndPrint = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      let result;
      if (editingId) {
        result = await api(`/api/invoice/${editingId}/edit`, { method: 'PUT', body: JSON.stringify(buildBody(true)) });
        loadRecent();
      } else {
        result = await api('/api/invoice/create', { method: 'POST', body: JSON.stringify(buildBody()) });
      }
      setInvoiceResult(buildPdfResult(result));
      setShowPrint(true);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading invoice data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Print modal */}
      <InvoicePrintModal isOpen={showPrint} onClose={() => { setShowPrint(false); router.push('/invoice'); }} invoiceData={invoiceResult} />

      <div>
        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.push('/invoice')}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                {editingId ? (
                  <>
                    <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-amber-500" />
                      Editing Invoice
                      <span className="font-mono text-amber-600 text-sm">{editingInvoiceNo}</span>
                    </h1>
                    <button onClick={resetToCreate} className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                      <RotateCcw className="h-3 w-3" /> New Invoice instead
                    </button>
                  </>
                ) : (
                  <>
                    <h1 className="text-base font-bold text-gray-900">Create Invoice</h1>
                    <p className="text-[11px] text-gray-500 hidden sm:block">Fill details and save or save & print</p>
                  </>
                )}
              </div>
            </div>

            {/* Tenant + Series */}
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="flex-1">
                <select value={tenantId} onChange={e => handleTenantChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select Tenant *</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <select value={seriesId} onChange={e => setSeriesId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Auto Series</option>
                  {filteredSeries.map(s => {
                    const preview = [s.prefix, s.financial_year, String(s.current_number || 1).padStart(s.digits || 4, '0')].filter(Boolean).join('/');
                    return <option key={s.id} value={s.id}>{s.series_name} — {preview}{s.is_default ? ' ★' : ''}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${taxType === 'INTER' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {taxType === 'INTER' ? 'IGST' : 'CGST+SGST'}
              </span>
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={handleSaveAndPrint} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {editingId ? 'Update & Print' : 'Save & Print'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError('')} className="ml-auto"><XIcon className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="w-full px-4 sm:px-6 py-5 space-y-5">

          {/* ── Recent Invoices Panel ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowRecent(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-gray-800">All Invoices</span>
                <span className="text-xs text-gray-400">— click any to edit</span>
                {editingId && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                    <Pencil className="h-3 w-3" /> Editing {editingInvoiceNo}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); loadRecent(); }}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400"
                  title="Refresh"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${recentLoading ? 'animate-spin' : ''}`} />
                </button>
                {showRecent ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </button>

            {showRecent && (
              <div className="border-t border-gray-100">
                {/* Search */}
                <div className="px-4 py-2 border-b border-gray-50">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Search invoice no. or buyer…"
                      value={recentSearch}
                      onChange={e => setRecentSearch(e.target.value)}
                    />
                    {recentSearch && (
                      <button onClick={() => setRecentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Invoice list */}
                {recentLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                  </div>
                ) : filteredRecent.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">No invoices found</div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {filteredRecent.map(inv => {
                      const isActive = editingId === inv.id;
                      return (
                        <button
                          key={inv.id}
                          onClick={() => loadForEdit(inv)}
                          disabled={editLoading}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blue-50 disabled:opacity-60 ${isActive ? 'bg-amber-50 border-l-2 border-amber-400' : ''}`}
                        >
                          {editLoading && editingId === inv.id ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                          ) : (
                            <Pencil className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-gray-300'}`} />
                          )}
                          <span className="font-mono text-xs text-blue-700 font-semibold w-36 flex-shrink-0">{inv.invoice_no || '—'}</span>
                          <span className="text-sm text-gray-800 font-medium flex-1 truncate">{inv.buyer_name || '—'}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                            {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB') : ''}
                          </span>
                          <span className="text-sm font-semibold text-gray-700 flex-shrink-0 tabular-nums">
                            ₹{Number(inv.total_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                            inv.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                            inv.status === 'SENT' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>{inv.status || 'DRAFT'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 1: Seller | Buyer | Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Section title="Seller Details" icon={Building2} accent="blue">
              <div className="space-y-3">
                <Field label="Company Name" required>
                  <input className={inp} value={seller.seller_name} onChange={e => setSeller(s => ({ ...s, seller_name: e.target.value }))} placeholder="Shree Ram Transport Co." />
                </Field>
                <Field label="GSTIN">
                  <input className={inp} value={seller.seller_gstin} onChange={e => setSeller(s => ({ ...s, seller_gstin: e.target.value }))} placeholder="09ABCDE1234F1Z5" />
                </Field>
                <Field label="PAN">
                  <input className={inp} value={seller.seller_pan} onChange={e => setSeller(s => ({ ...s, seller_pan: e.target.value }))} />
                </Field>
                <Field label="State Code">
                  <input className={inp} value={seller.seller_state_code} onChange={e => setSeller(s => ({ ...s, seller_state_code: e.target.value }))} placeholder="09" maxLength={2} />
                </Field>
                <Field label="Address">
                  <textarea className={inp} rows={2} value={seller.seller_address} onChange={e => setSeller(s => ({ ...s, seller_address: e.target.value }))} />
                </Field>
              </div>
            </Section>

            <Section title="Buyer Details" icon={Users} accent="green">
              <div className="space-y-3">
                <Field label="Select Receiver">
                  <select className={sel} value={receiverId} onChange={e => handleReceiverChange(e.target.value)}>
                    <option value="">— Manual entry —</option>
                    {receivers.map(r => <option key={r.id} value={r.id}>{r.company_name}</option>)}
                  </select>
                </Field>
                <Field label="Buyer Name" required>
                  <input className={inp} value={buyer.buyer_name} onChange={e => setBuyer(b => ({ ...b, buyer_name: e.target.value }))} placeholder="ABC Industries" />
                </Field>
                <Field label="GSTIN">
                  <input className={inp} value={buyer.buyer_gstin} onChange={e => setBuyer(b => ({ ...b, buyer_gstin: e.target.value }))} placeholder="09XYZAB1234C1Z5" />
                </Field>
                <Field label="Aadhaar No (for unregistered buyers)">
                  <input className={inp} value={buyer.buyer_aadhar_number} onChange={e => setBuyer(b => ({ ...b, buyer_aadhar_number: e.target.value }))} placeholder="XXXX XXXX XXXX" maxLength={14} />
                </Field>
                <Field label="State Code">
                  <input className={inp} value={buyer.buyer_state_code} onChange={e => setBuyer(b => ({ ...b, buyer_state_code: e.target.value }))} placeholder="09" maxLength={2} />
                </Field>
                <Field label="Billing Address">
                  <textarea className={inp} rows={2} value={buyer.billing_address} onChange={e => setBuyer(b => ({ ...b, billing_address: e.target.value }))} />
                </Field>
              </div>
            </Section>

            <Section title="Invoice Settings" icon={FileText} accent="purple">
              <div className="space-y-3">
                <Field label="Invoice Type">
                  <select className={sel} value={meta.invoice_type} onChange={e => setMeta(m => ({ ...m, invoice_type: e.target.value }))}>
                    {INVOICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Supply Type">
                  <select className={sel} value={meta.supply_type} onChange={e => setMeta(m => ({ ...m, supply_type: e.target.value }))}>
                    {SUPPLY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Place of Supply (City)">
                  <input className={inp} value={meta.place_of_supply} onChange={e => setMeta(m => ({ ...m, place_of_supply: e.target.value }))} placeholder="e.g. Lucknow, Kanpur" />
                </Field>
                <Field label="Pvt Marks / Lot No.">
                  <input className={inp} value={meta.pvt_marks} onChange={e => setMeta(m => ({ ...m, pvt_marks: e.target.value }))} placeholder="e.g. LOT-A, BATCH-01" />
                </Field>
                <Field label="Invoice Date">
                  <input className={inp} type="date" value={meta.invoice_date} onChange={e => setMeta(m => ({ ...m, invoice_date: e.target.value }))} />
                </Field>
                <Field label="Due Date">
                  <input className={inp} type="date" value={meta.due_date} onChange={e => setMeta(m => ({ ...m, due_date: e.target.value }))} />
                </Field>
                <Field label="Status">
                  <select className={sel} value={meta.status} onChange={e => setMeta(m => ({ ...m, status: e.target.value }))}>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={meta.is_reverse_charge} onChange={e => setMeta(m => ({ ...m, is_reverse_charge: e.target.checked }))} className="h-4 w-4 rounded text-blue-600" />
                  <span className="text-xs text-gray-700 font-medium">Reverse Charge Applicable</span>
                </label>
              </div>
            </Section>
          </div>

          {/* Transport */}
          <Section title="Transport & Reference" icon={Truck} accent="orange">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Field label="Transport Name">
                <input className={inp} value={meta.transport_name} onChange={e => setMeta(m => ({ ...m, transport_name: e.target.value }))} placeholder="Shree Ganesh Transport" />
              </Field>
              <Field label="GR Number">
                <input className={inp} value={meta.gr_no} onChange={e => setMeta(m => ({ ...m, gr_no: e.target.value }))} placeholder="A00123" />
              </Field>
              <Field label="Challan No">
                <input className={inp} value={meta.challan_no} onChange={e => setMeta(m => ({ ...m, challan_no: e.target.value }))} />
              </Field>
              <Field label="PO Number">
                <input className={inp} value={meta.po_number} onChange={e => setMeta(m => ({ ...m, po_number: e.target.value }))} placeholder="PO/2024/001" />
              </Field>
              <Field label="PO Date">
                <input className={inp} type="date" value={meta.po_date} onChange={e => setMeta(m => ({ ...m, po_date: e.target.value }))} />
              </Field>
              <Field label="E-Way Bill No">
                <input className={inp} value={meta.e_way_bill} onChange={e => setMeta(m => ({ ...m, e_way_bill: e.target.value }))} placeholder="1234567890123" />
              </Field>
            </div>
          </Section>

          {/* Line Items */}
          <Section title="Line Items" icon={Package} accent="gray">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                    <th className="text-left px-2 py-2 font-semibold w-6 rounded-tl-lg">#</th>
                    <th className="text-left px-2 py-2 font-semibold" style={{ minWidth: 180 }}>Search / Item Name</th>
                    <th className="text-left px-2 py-2 font-semibold w-24">HSN/SAC</th>
                    <th className="text-left px-2 py-2 font-semibold w-18">Qty</th>
                    <th className="text-left px-2 py-2 font-semibold w-20">Unit</th>
                    <th className="text-left px-2 py-2 font-semibold w-24">Rate (₹)</th>
                    <th className="text-left px-2 py-2 font-semibold w-16">Disc %</th>
                    <th className="text-left px-2 py-2 font-semibold w-20">GST %</th>
                    <th className="text-left px-2 py-2 font-semibold w-24">Weight</th>
                    <th className="text-right px-2 py-2 font-semibold w-28 rounded-tr-lg">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, i) => {
                    const c = calcLine(line, taxType);
                    return (
                      <tr key={i} className="bg-white hover:bg-blue-50/20 transition-colors">
                        <td className="px-2 py-2 text-gray-400 text-xs font-mono text-center">{i + 1}</td>
                        <td className="px-1 py-2" style={{ minWidth: 200 }}>
                          {/* Searchable inventory */}
                          <InventorySearch
                            inventory={inventory}
                            value={line.item_name}
                            onChange={(val) => setLine(i, 'item_name', val)}
                            onSelect={(item) => { if (item) applyInventoryItem(i, item); else setLine(i, 'inventory_item_id', ''); }}
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input className={inp} value={line.hsn_sac_code} onChange={e => setLine(i, 'hsn_sac_code', e.target.value)} placeholder="9965" />
                        </td>
                        <td className="px-1 py-2">
                          <input className={inp} type="number" min={0} step="0.001" value={line.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} />
                        </td>
                        <td className="px-1 py-2">
                          <select className={sel} value={line.unit} onChange={e => setLine(i, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-2">
                          <input className={inp} type="number" min={0} step="0.01" value={line.rate} onChange={e => setLine(i, 'rate', e.target.value)} placeholder="0.00" required />
                        </td>
                        <td className="px-1 py-2">
                          <input className={inp} type="number" min={0} max={100} step="0.01" value={line.discount_percent} onChange={e => setLine(i, 'discount_percent', e.target.value)} />
                        </td>
                        <td className="px-1 py-2">
                          <select className={sel} value={line.gst_rate} onChange={e => setLine(i, 'gst_rate', e.target.value)}>
                            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-2">
                          <input className={inp} type="number" min={0} step="0.001" value={line.weight} onChange={e => setLine(i, 'weight', e.target.value)} placeholder="kg" />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <div className="text-sm font-semibold text-gray-900">₹{c.total.toFixed(2)}</div>
                          <div className="text-[10px] text-gray-400">
                            {taxType === 'INTER'
                              ? `IGST ₹${c.igst.toFixed(2)}`
                              : `C+S ₹${(c.cgst + c.sgst).toFixed(2)}`}
                          </div>
                        </td>
                        <td className="px-1 py-2">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(i)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <button type="button" onClick={addLine}
                className="mt-3 flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                <Plus className="h-4 w-4" /> Add Line Item
              </button>
            </div>
          </Section>

          {/* Notes + Totals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Section title="Notes & Terms" icon={Info} accent="gray">
              <div className="space-y-3">
                <Field label="Notes">
                  <textarea className={inp} rows={3} value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} placeholder="Goods dispatched via road." />
                </Field>
                <Field label="Terms & Conditions">
                  <textarea className={inp} rows={3} value={meta.terms_and_conditions} onChange={e => setMeta(m => ({ ...m, terms_and_conditions: e.target.value }))} />
                </Field>
              </div>
            </Section>

            <Section title="Invoice Summary" icon={CalendarDays} accent="blue">
              <div className="space-y-2 text-sm">
                <Row label="Subtotal (Gross)" value={`₹${totals.subtotal.toFixed(2)}`} />
                {totals.discount > 0 && <Row label="Discount" value={`− ₹${totals.discount.toFixed(2)}`} cls="text-red-600" />}
                <Row label="Taxable Amount" value={`₹${totals.taxable.toFixed(2)}`} bold />
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1.5">
                  {taxType === 'INTER' ? (
                    <Row label="IGST" value={`₹${totals.igst.toFixed(2)}`} cls="text-orange-600" />
                  ) : (
                    <>
                      <Row label="CGST" value={`₹${totals.cgst.toFixed(2)}`} cls="text-blue-600" />
                      <Row label="SGST" value={`₹${totals.sgst.toFixed(2)}`} cls="text-blue-600" />
                    </>
                  )}
                </div>
                {totals.roundOff !== 0 && <Row label="Round Off" value={`₹${totals.roundOff.toFixed(2)}`} cls="text-gray-400" />}
                <div className="border-t-2 border-blue-200 pt-3 mt-2">
                  <div className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-4 py-3">
                    <span className="font-bold text-base">Total Amount</span>
                    <span className="font-bold text-xl">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* Bottom buttons */}
          <div className="flex justify-end gap-3 pb-6">
            <button type="button" onClick={() => router.push('/invoice')}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            {editingId && (
              <button type="button" onClick={resetToCreate}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <RotateCcw className="h-4 w-4" /> New Invoice
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Update Only' : 'Save Only'}
            </button>
            <button type="button" onClick={handleSaveAndPrint} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {saving ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update & Print' : 'Save & Print')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
