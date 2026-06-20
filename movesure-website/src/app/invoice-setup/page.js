'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/dashboard/navbar';
import { useAuth } from '../utils/auth';
import {
  Building2, Layers, Users, Package, Plus, Pencil, Trash2,
  ChevronLeft, Loader2, CheckCircle, XCircle, X, Save,
} from 'lucide-react';

const API_BASE = 'https://api.movesure.io';

const TABS = [
  { id: 'tenants',   label: 'Tenants',   icon: Building2, desc: 'Issuing company / firm' },
  { id: 'series',    label: 'Series',    icon: Layers,    desc: 'Invoice numbering series' },
  { id: 'receivers', label: 'Receivers', icon: Users,     desc: 'Buyers & customers' },
  { id: 'inventory', label: 'Inventory', icon: Package,   desc: 'Products & services' },
];

const GST_STATE_CODES = [
  ['01','Jammu & Kashmir'],['02','Himachal Pradesh'],['03','Punjab'],['04','Chandigarh'],
  ['05','Uttarakhand'],['06','Haryana'],['07','Delhi'],['08','Rajasthan'],['09','Uttar Pradesh'],
  ['10','Bihar'],['11','Sikkim'],['12','Arunachal Pradesh'],['13','Nagaland'],['14','Manipur'],
  ['15','Mizoram'],['16','Tripura'],['17','Meghalaya'],['18','Assam'],['19','West Bengal'],
  ['20','Jharkhand'],['21','Odisha'],['22','Chhattisgarh'],['23','Madhya Pradesh'],['24','Gujarat'],
  ['27','Maharashtra'],['29','Karnataka'],['30','Goa'],['32','Kerala'],['33','Tamil Nadu'],
  ['36','Telangana'],['37','Andhra Pradesh'],
];

const PAYMENT_MODES = ['CASH','CHEQUE','DD','NEFT','RTGS','IMPS','UPI','OTHER'];
const GST_RATES = [0,5,12,18,28];
const ITEM_TYPES = ['GOODS','SERVICE'];
const UNITS = ['NOS','KG','MTR','LTR','BOX','SET','PCS','TON','BAG','BDL'];

// ─── helpers ───────────────────────────────────────────────────────────────

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

function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const color = type === 'error' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700';
  const Icon = type === 'error' ? XCircle : CheckCircle;
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-md text-sm font-medium ${color}`}>
      <Icon className="h-4 w-4" />
      {msg}
      <button onClick={onClose} className="ml-2"><X className="h-3 w-3" /></button>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent';
const selectCls = `${inputCls}`;

// ─── Tenant Tab ─────────────────────────────────────────────────────────────

function TenantTab({ toast, userId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = {
    company_name:'', trade_name:'', gstin:'', pan:'', address_line1:'', address_line2:'',
    city:'', state:'', state_code:'', pincode:'', mobile:'', alternate_mobile:'', email:'',
    website:'', bank_name:'', bank_account_no:'', bank_ifsc:'', bank_branch:'', upi_id:'',
    invoice_prefix:'INV', default_payment_terms:30, default_tax_type:'INTRA',
    default_notes:'', terms_and_conditions:'',
  };
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/invoice/tenants')
      .then(setList)
      .catch(() => toast('Failed to load tenants', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (t) => {
    setEditing(t.id);
    setForm({ ...EMPTY, ...t });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) { toast('Company name is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { ...form, created_by: userId };
      if (editing) {
        await api(`/api/invoice/tenants/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Tenant updated');
      } else {
        await api('/api/invoice/tenants', { method: 'POST', body: JSON.stringify(body) });
        toast('Tenant created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this tenant?')) return;
    try {
      await api(`/api/invoice/tenants/${id}`, { method: 'DELETE' });
      toast('Tenant deactivated');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Companies that issue invoices (usually set up once)</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Tenant
        </button>
      </div>

      {loading ? <Spinner /> : list.length === 0 ? <Empty label="No tenants yet" /> : (
        <div className="space-y-2">
          {list.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.company_name}</p>
                <p className="text-xs text-gray-500">{t.gstin || 'No GSTIN'} · {t.city || ''} {t.state || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {!t.is_active && <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5">Inactive</span>}
                <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Tenant' : 'Add Tenant'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company Name" required>
                <input className={inputCls} value={form.company_name} onChange={set('company_name')} placeholder="Shree Ram Transport Co." />
              </Field>
              <Field label="Trade Name">
                <input className={inputCls} value={form.trade_name} onChange={set('trade_name')} />
              </Field>
              <Field label="GSTIN">
                <input className={inputCls} value={form.gstin} onChange={set('gstin')} placeholder="09ABCDE1234F1Z5" />
              </Field>
              <Field label="PAN Number">
                <input className={inputCls} value={form.pan} onChange={set('pan')} placeholder="ABCDE1234F" />
              </Field>
              <Field label="Address Line 1">
                <input className={inputCls} value={form.address_line1} onChange={set('address_line1')} />
              </Field>
              <Field label="Address Line 2">
                <input className={inputCls} value={form.address_line2} onChange={set('address_line2')} />
              </Field>
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={set('city')} />
              </Field>
              <Field label="State">
                <input className={inputCls} value={form.state} onChange={set('state')} />
              </Field>
              <Field label="GST State Code">
                <select className={selectCls} value={form.state_code} onChange={set('state_code')}>
                  <option value="">Select</option>
                  {GST_STATE_CODES.map(([code, name]) => (
                    <option key={code} value={code}>{code} – {name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pincode">
                <input className={inputCls} value={form.pincode} onChange={set('pincode')} />
              </Field>
              <Field label="Mobile">
                <input className={inputCls} value={form.mobile} onChange={set('mobile')} />
              </Field>
              <Field label="Alternate Mobile">
                <input className={inputCls} value={form.alternate_mobile} onChange={set('alternate_mobile')} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Website">
                <input className={inputCls} value={form.website} onChange={set('website')} />
              </Field>
              <Field label="Bank Name">
                <input className={inputCls} value={form.bank_name} onChange={set('bank_name')} />
              </Field>
              <Field label="Bank Account No">
                <input className={inputCls} value={form.bank_account_no} onChange={set('bank_account_no')} />
              </Field>
              <Field label="IFSC Code">
                <input className={inputCls} value={form.bank_ifsc} onChange={set('bank_ifsc')} />
              </Field>
              <Field label="Bank Branch">
                <input className={inputCls} value={form.bank_branch} onChange={set('bank_branch')} />
              </Field>
              <Field label="UPI ID">
                <input className={inputCls} value={form.upi_id} onChange={set('upi_id')} />
              </Field>
              <Field label="Invoice Prefix">
                <input className={inputCls} value={form.invoice_prefix} onChange={set('invoice_prefix')} placeholder="INV" />
              </Field>
              <Field label="Payment Terms (days)">
                <input className={inputCls} type="number" value={form.default_payment_terms} onChange={set('default_payment_terms')} />
              </Field>
              <Field label="Default Tax Type">
                <select className={selectCls} value={form.default_tax_type} onChange={set('default_tax_type')}>
                  <option value="INTRA">INTRA (Same state)</option>
                  <option value="INTER">INTER (Different state)</option>
                  <option value="EXEMPT">EXEMPT</option>
                </select>
              </Field>
            </div>
            <Field label="Default Notes">
              <textarea className={inputCls} rows={2} value={form.default_notes} onChange={set('default_notes')} />
            </Field>
            <Field label="Terms & Conditions">
              <textarea className={inputCls} rows={2} value={form.terms_and_conditions} onChange={set('terms_and_conditions')} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? 'Update' : 'Create'} Tenant
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Series Tab ──────────────────────────────────────────────────────────────

function SeriesTab({ toast, userId }) {
  const [tenants, setTenants] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = { tenant_id:'', series_name:'', prefix:'INV', suffix:'', financial_year:'', digits:4, current_number:1, is_default:false };
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([api('/api/invoice/tenants'), api('/api/invoice/series')]);
      setTenants(t);
      setList(s);
    } catch { toast('Failed to load series', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s) => { setEditing(s.id); setForm({ ...EMPTY, ...s }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tenant_id) { toast('Please select a tenant', 'error'); return; }
    if (!form.series_name.trim()) { toast('Series name is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { ...form, created_by: userId, digits: Number(form.digits), current_number: Number(form.current_number) };
      if (editing) {
        await api(`/api/invoice/series/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Series updated');
      } else {
        await api('/api/invoice/series', { method: 'POST', body: JSON.stringify(body) });
        toast('Series created');
      }
      setShowForm(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this series?')) return;
    try {
      await api(`/api/invoice/series/${id}`, { method: 'DELETE' });
      toast('Series deactivated');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const tenantName = (id) => tenants.find(t => t.id === id)?.company_name || id;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Controls invoice number generation (e.g. INV/2024-25/0001)</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Series
        </button>
      </div>

      {loading ? <Spinner /> : list.length === 0 ? <Empty label="No series yet" /> : (
        <div className="space-y-2">
          {list.map(s => {
            const preview = [s.prefix, s.financial_year, String(s.current_number || 1).padStart(s.digits || 4, '0')].filter(Boolean).join('/');
            return (
              <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.series_name}
                    {s.is_default && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">Default</span>}
                  </p>
                  <p className="text-xs text-gray-500">{tenantName(s.tenant_id)} · Preview: <span className="font-mono">{preview}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Series' : 'Add Series'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tenant" required>
                <select className={selectCls} value={form.tenant_id} onChange={set('tenant_id')}>
                  <option value="">Select tenant</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}
                </select>
              </Field>
              <Field label="Series Name" required>
                <input className={inputCls} value={form.series_name} onChange={set('series_name')} placeholder="Main Series" />
              </Field>
              <Field label="Prefix">
                <input className={inputCls} value={form.prefix} onChange={set('prefix')} placeholder="INV" />
              </Field>
              <Field label="Suffix">
                <input className={inputCls} value={form.suffix} onChange={set('suffix')} />
              </Field>
              <Field label="Financial Year">
                <input className={inputCls} value={form.financial_year} onChange={set('financial_year')} placeholder="2024-25" />
              </Field>
              <Field label="Number of Digits">
                <input className={inputCls} type="number" min={1} max={8} value={form.digits} onChange={set('digits')} />
              </Field>
              <Field label="Start From">
                <input className={inputCls} type="number" min={1} value={form.current_number} onChange={set('current_number')} />
              </Field>
              <Field label="">
                <label className="flex items-center gap-2 mt-5 cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={set('is_default')} className="h-4 w-4 rounded text-blue-600" />
                  <span className="text-sm text-gray-700">Set as default series</span>
                </label>
              </Field>
            </div>
            {form.prefix && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                Preview: <span className="font-mono font-semibold">
                  {[form.prefix, form.financial_year, String(form.current_number || 1).padStart(Number(form.digits) || 4, '0')].filter(Boolean).join('/')}
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? 'Update' : 'Create'} Series
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Receivers Tab ───────────────────────────────────────────────────────────

function ReceiversTab({ toast, userId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = {
    company_name:'', trade_name:'', contact_person:'', gstin:'', pan:'', aadhar_number:'',
    mobile:'', email:'',
    billing_address_line1:'', billing_address_line2:'', billing_city:'', billing_state:'', billing_state_code:'', billing_pincode:'',
    shipping_address_line1:'', shipping_address_line2:'', shipping_city:'', shipping_state:'', shipping_state_code:'', shipping_pincode:'',
    credit_limit:'', credit_days:30,
  };
  const [form, setForm] = useState(EMPTY);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/invoice/receivers')
      .then(setList)
      .catch(() => toast('Failed to load receivers', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setSameAsBilling(true); setShowForm(true); };
  const openEdit = (r) => {
    setEditing(r.id);
    setForm({ ...EMPTY, ...r });
    setSameAsBilling(!r.shipping_address_line1);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) { toast('Company name is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { ...form, created_by: userId };
      if (sameAsBilling) {
        body.shipping_address_line1 = null;
        body.shipping_address_line2 = null;
        body.shipping_city = null;
        body.shipping_state = null;
        body.shipping_state_code = null;
        body.shipping_pincode = null;
      }
      if (editing) {
        await api(`/api/invoice/receivers/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Receiver updated');
      } else {
        await api('/api/invoice/receivers', { method: 'POST', body: JSON.stringify(body) });
        toast('Receiver created');
      }
      setShowForm(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this receiver?')) return;
    try {
      await api(`/api/invoice/receivers/${id}`, { method: 'DELETE' });
      toast('Receiver deactivated');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Customers / companies that receive invoices from you</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Receiver
        </button>
      </div>

      {loading ? <Spinner /> : list.length === 0 ? <Empty label="No receivers yet" /> : (
        <div className="space-y-2">
          {list.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-800">{r.company_name}</p>
                <p className="text-xs text-gray-500">
                  {r.gstin || 'No GSTIN'} · {r.billing_city || ''} {r.billing_state || ''}
                  {r.contact_person ? ` · ${r.contact_person}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!r.is_active && <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5">Inactive</span>}
                <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Receiver' : 'Add Receiver'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SectionHeader>Basic Info</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company Name" required>
                <input className={inputCls} value={form.company_name} onChange={set('company_name')} placeholder="ABC Industries" />
              </Field>
              <Field label="Trade Name">
                <input className={inputCls} value={form.trade_name} onChange={set('trade_name')} />
              </Field>
              <Field label="Contact Person">
                <input className={inputCls} value={form.contact_person} onChange={set('contact_person')} />
              </Field>
              <Field label="Mobile">
                <input className={inputCls} value={form.mobile} onChange={set('mobile')} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="GSTIN">
                <input className={inputCls} value={form.gstin} onChange={set('gstin')} />
              </Field>
              <Field label="PAN">
                <input className={inputCls} value={form.pan} onChange={set('pan')} />
              </Field>
              <Field label="Aadhaar (unregistered)">
                <input className={inputCls} value={form.aadhar_number} onChange={set('aadhar_number')} />
              </Field>
            </div>

            <SectionHeader>Billing Address</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Address Line 1">
                <input className={inputCls} value={form.billing_address_line1} onChange={set('billing_address_line1')} />
              </Field>
              <Field label="Address Line 2">
                <input className={inputCls} value={form.billing_address_line2} onChange={set('billing_address_line2')} />
              </Field>
              <Field label="City">
                <input className={inputCls} value={form.billing_city} onChange={set('billing_city')} />
              </Field>
              <Field label="State">
                <input className={inputCls} value={form.billing_state} onChange={set('billing_state')} />
              </Field>
              <Field label="State Code">
                <select className={selectCls} value={form.billing_state_code} onChange={set('billing_state_code')}>
                  <option value="">Select</option>
                  {GST_STATE_CODES.map(([c, n]) => <option key={c} value={c}>{c} – {n}</option>)}
                </select>
              </Field>
              <Field label="Pincode">
                <input className={inputCls} value={form.billing_pincode} onChange={set('billing_pincode')} />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sameAsBilling} onChange={e => setSameAsBilling(e.target.checked)} className="h-4 w-4 rounded text-blue-600" />
              <span className="text-sm text-gray-700">Shipping address same as billing</span>
            </label>

            {!sameAsBilling && (
              <>
                <SectionHeader>Shipping Address</SectionHeader>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Address Line 1">
                    <input className={inputCls} value={form.shipping_address_line1} onChange={set('shipping_address_line1')} />
                  </Field>
                  <Field label="Address Line 2">
                    <input className={inputCls} value={form.shipping_address_line2} onChange={set('shipping_address_line2')} />
                  </Field>
                  <Field label="City">
                    <input className={inputCls} value={form.shipping_city} onChange={set('shipping_city')} />
                  </Field>
                  <Field label="State">
                    <input className={inputCls} value={form.shipping_state} onChange={set('shipping_state')} />
                  </Field>
                  <Field label="State Code">
                    <select className={selectCls} value={form.shipping_state_code} onChange={set('shipping_state_code')}>
                      <option value="">Select</option>
                      {GST_STATE_CODES.map(([c, n]) => <option key={c} value={c}>{c} – {n}</option>)}
                    </select>
                  </Field>
                  <Field label="Pincode">
                    <input className={inputCls} value={form.shipping_pincode} onChange={set('shipping_pincode')} />
                  </Field>
                </div>
              </>
            )}

            <SectionHeader>Credit Settings</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Credit Limit (₹)">
                <input className={inputCls} type="number" value={form.credit_limit} onChange={set('credit_limit')} />
              </Field>
              <Field label="Credit Days">
                <input className={inputCls} type="number" value={form.credit_days} onChange={set('credit_days')} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? 'Update' : 'Create'} Receiver
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Inventory Tab ───────────────────────────────────────────────────────────

function InventoryTab({ toast, userId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = {
    item_name:'', item_code:'', description:'', hsn_sac_code:'',
    item_type:'SERVICE', unit_of_measurement:'NOS', default_rate:'',
    default_discount_pct:0, gst_rate:18, cess_rate:0, is_tax_inclusive:false,
  };
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(() => {
    setLoading(true);
    api('/api/invoice/inventory')
      .then(setList)
      .catch(() => toast('Failed to load inventory', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (item) => { setEditing(item.id); setForm({ ...EMPTY, ...item }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) { toast('Item name is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { ...form, created_by: userId, gst_rate: Number(form.gst_rate), cess_rate: Number(form.cess_rate), default_rate: form.default_rate !== '' ? Number(form.default_rate) : undefined };
      if (editing) {
        await api(`/api/invoice/inventory/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Item updated');
      } else {
        await api('/api/invoice/inventory', { method: 'POST', body: JSON.stringify(body) });
        toast('Item created');
      }
      setShowForm(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this item?')) return;
    try {
      await api(`/api/invoice/inventory/${id}`, { method: 'DELETE' });
      toast('Item deactivated');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Products or services that appear as line items on invoices</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {loading ? <Spinner /> : list.length === 0 ? <Empty label="No inventory items yet" /> : (
        <div className="space-y-2">
          {list.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {item.item_name}
                  {item.item_code && <span className="ml-2 text-[10px] text-gray-400 font-mono">{item.item_code}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {item.item_type} · {item.unit_of_measurement} · HSN/SAC: {item.hsn_sac_code || '—'} · GST: {item.gst_rate}%
                  {item.default_rate ? ` · ₹${item.default_rate}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!item.is_active && <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5">Inactive</span>}
                <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Item' : 'Add Inventory Item'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Item / Service Name" required>
                <input className={inputCls} value={form.item_name} onChange={set('item_name')} placeholder="Freight Charges" />
              </Field>
              <Field label="Item Code">
                <input className={inputCls} value={form.item_code} onChange={set('item_code')} placeholder="FRT-001" />
              </Field>
              <Field label="Type">
                <select className={selectCls} value={form.item_type} onChange={set('item_type')}>
                  {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Unit">
                <select className={selectCls} value={form.unit_of_measurement} onChange={set('unit_of_measurement')}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="HSN / SAC Code">
                <input className={inputCls} value={form.hsn_sac_code} onChange={set('hsn_sac_code')} placeholder="9965" />
              </Field>
              <Field label="Default Rate (₹)">
                <input className={inputCls} type="number" step="0.01" value={form.default_rate} onChange={set('default_rate')} />
              </Field>
              <Field label="GST Rate %">
                <select className={selectCls} value={form.gst_rate} onChange={set('gst_rate')}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </Field>
              <Field label="Cess %">
                <input className={inputCls} type="number" step="0.01" value={form.cess_rate} onChange={set('cess_rate')} />
              </Field>
              <Field label="Default Discount %">
                <input className={inputCls} type="number" step="0.01" value={form.default_discount_pct} onChange={set('default_discount_pct')} />
              </Field>
              <Field label="">
                <label className="flex items-center gap-2 mt-5 cursor-pointer">
                  <input type="checkbox" checked={form.is_tax_inclusive} onChange={set('is_tax_inclusive')} className="h-4 w-4 rounded text-blue-600" />
                  <span className="text-sm text-gray-700">Rate includes GST</span>
                </label>
              </Field>
            </div>
            <Field label="Description">
              <textarea className={inputCls} rows={2} value={form.description} onChange={set('description')} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? 'Update' : 'Create'} Item
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared small components ────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mt-6 mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-4 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-1">{children}</p>;
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="text-center py-10 text-sm text-gray-400">{label}</div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function InvoiceSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tenants');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const toast = useCallback((msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  const TAB_COMPONENTS = {
    tenants:   <TenantTab   toast={toast} userId={user?.id} />,
    series:    <SeriesTab   toast={toast} userId={user?.id} />,
    receivers: <ReceiversTab toast={toast} userId={user?.id} />,
    inventory: <InventoryTab toast={toast} userId={user?.id} />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toast msg={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/invoice')}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoice Setup</h1>
            <p className="text-xs text-gray-500">Configure tenants, series, receivers, and inventory before creating invoices</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab description */}
        <div className="mb-4">
          {TABS.filter(t => t.id === activeTab).map(({ label, desc, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
              <Icon className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{label}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          {TAB_COMPONENTS[activeTab]}
        </div>
      </div>
    </div>
  );
}
