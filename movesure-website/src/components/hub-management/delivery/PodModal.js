'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, FileText, CheckCircle2, Printer } from 'lucide-react';
import supabase from '../../../app/utils/supabase';
import { generatePodPdf } from '../PodPdfGenerator';

/**
 * POD (Proof of Delivery) form + print — same flow as the hub challan page:
 * loads/creates the `pod_details` row for the GR (pod_no KNP00001…), then
 * prints with the shared generatePodPdf (2 copies on one A4).
 *
 * `row` is a delivery-list row ({ gr_no, challan_no, destination_city_name, … });
 * the full bilty fields the POD needs are fetched here from bilty /
 * station_bilty_summary so the list API doesn't have to carry them.
 */
const EMPTY = { delivered_at: '', payment_mode: '', mobile_number_1: '', mobile_number_2: '', total_amount: '', amount_given: '', reminder: '', consignor_name: '', consignor_gst: '', rs_chrg: 50, labour_chrg: 0 };
const PAY_MODES = ['PAID', 'TO-PAY', 'PAID/DD', 'TO-PAY/DD'];
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

// Build the bilty object in the exact shape PodPdfGenerator expects
async function loadPodBilty(row) {
  const { data: r } = await supabase.from('bilty').select(`
    gr_no, bilty_date, consignor_name, consignee_name, payment_mode, no_of_pkg, total, wt,
    freight_amount, contain, e_way_bill, pvt_marks, consignor_number, consignee_number,
    consignor_gst, delivery_type, remark
  `).eq('gr_no', row.gr_no).eq('is_active', true).maybeSingle();
  if (r) {
    return {
      gr_no: r.gr_no, consignor: r.consignor_name || '-', consignee: r.consignee_name || '-',
      destination: row.destination_city_name || '-', packets: r.no_of_pkg || 0, weight: r.wt || 0,
      amount: r.total || 0, payment: r.payment_mode || '-', delivery_type: r.delivery_type || '-',
      contain: r.contain || '-', e_way_bill: r.e_way_bill || '', pvt_marks: r.pvt_marks || '',
      bilty_date: r.bilty_date, consignor_number: r.consignor_number || '', consignee_number: r.consignee_number || '',
      consignor_gst: r.consignor_gst || '', freight_amount: r.freight_amount || 0, remark: r.remark || row.remarks || '',
    };
  }
  const { data: s } = await supabase.from('station_bilty_summary').select(`
    gr_no, consignor, consignee, contents, no_of_packets, weight, payment_status, amount,
    pvt_marks, e_way_bill, delivery_type, created_at
  `).eq('gr_no', row.gr_no).maybeSingle();
  if (s) {
    return {
      gr_no: s.gr_no, consignor: s.consignor || '-', consignee: s.consignee || '-',
      destination: row.destination_city_name || '-', packets: s.no_of_packets || 0, weight: s.weight || 0,
      amount: s.amount || 0, payment: s.payment_status || '-', delivery_type: s.delivery_type || '-',
      contain: s.contents || '-', e_way_bill: s.e_way_bill || '', pvt_marks: s.pvt_marks || '',
      bilty_date: s.created_at, consignor_number: '', consignee_number: '', consignor_gst: '',
      freight_amount: s.amount || 0, remark: row.remarks || '',
    };
  }
  // Fall back to what the list row already has
  return {
    gr_no: row.gr_no, consignor: row.consignor_name || '-', consignee: row.consignee_name || '-',
    destination: row.destination_city_name || '-', packets: row.no_of_pkg || 0, weight: row.wt || 0,
    amount: row.total || 0, payment: row.payment_mode || '-', delivery_type: '-',
    contain: row.contain || '-', e_way_bill: row.e_way_bill || '', pvt_marks: row.pvt_marks || '',
    bilty_date: row.bilty_date, consignor_number: '', consignee_number: '', consignor_gst: '',
    freight_amount: row.total || 0, remark: row.remarks || '',
  };
}

const inputCls = 'w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500';
// Defined outside the modal so inputs don't remount (and lose focus) on every keystroke
function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}{hint && <span className="text-slate-300 font-normal"> {hint}</span>}</span>
      {children}
    </label>
  );
}

export default function PodModal({ row, onClose, onSaved }) {
  const [bilty, setBilty] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [podNo, setPodNo] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [b, { data: pod }] = await Promise.all([
          loadPodBilty(row),
          supabase.from('pod_details').select('*').eq('gr_no', row.gr_no).maybeSingle(),
        ]);
        if (cancelled) return;
        setBilty(b);
        if (pod) {
          setForm({
            delivered_at: toLocalInput(pod.delivered_at),
            payment_mode: pod.payment_mode || '',
            mobile_number_1: pod.mobile_number_1 || '', mobile_number_2: pod.mobile_number_2 || '',
            total_amount: pod.total_amount ?? '', amount_given: pod.amount_given ?? '',
            reminder: pod.reminder || '', consignor_name: pod.consignor_name || '', consignor_gst: pod.consignor_gst || '',
            rs_chrg: pod.rs_chrg ?? 50, labour_chrg: pod.labour_chrg ?? 0,
          });
          setPodNo(pod.pod_no || '');
          setSaved(true);
        } else {
          const { data: latest } = await supabase.from('pod_details').select('pod_no').order('created_at', { ascending: false }).limit(1).maybeSingle();
          const n = latest?.pod_no ? (parseInt(latest.pod_no.replace('KNP', ''), 10) || 0) : 0;
          if (cancelled) return;
          setPodNo('KNP' + String(n + 1).padStart(5, '0'));
          let pay = b.payment && b.payment !== '-' ? b.payment.toUpperCase() : '';
          const isDD = (b.delivery_type || '').toLowerCase().includes('door') || (b.delivery_type || '').toLowerCase() === 'dd';
          if (isDD && pay === 'PAID') pay = 'PAID/DD';
          if (isDD && pay === 'TO-PAY') pay = 'TO-PAY/DD';
          const amt = parseFloat(b.amount) || 0;
          const isPaid = pay === 'PAID' || pay === 'PAID/DD';
          setForm({
            ...EMPTY,
            delivered_at: nowLocal(),
            payment_mode: pay,
            mobile_number_1: b.consignor_number || '', mobile_number_2: b.consignee_number || '',
            total_amount: amt || '',
            amount_given: isPaid ? 50 : (amt ? amt + 50 : ''),
            consignor_name: b.consignor && b.consignor !== '-' ? b.consignor : '',
            consignor_gst: b.consignor_gst || '',
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load POD');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const canSave = form.delivered_at && form.total_amount;

  const saveAndPrint = async () => {
    if (!bilty || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        gr_no: row.gr_no,
        challan_no: row.challan_no || null,
        payment_mode: PAY_MODES.includes(form.payment_mode) ? form.payment_mode : null,
        delivered_at: form.delivered_at ? new Date(form.delivered_at).toISOString() : null,
        mobile_number_1: form.mobile_number_1 || null,
        mobile_number_2: form.mobile_number_2 || null,
        total_amount: parseFloat(form.total_amount) || 0,
        amount_given: parseFloat(form.amount_given) || 0,
        reminder: form.reminder || null,
        consignor_name: form.consignor_name || null,
        consignor_gst: form.consignor_gst || null,
        rs_chrg: parseFloat(form.rs_chrg) || 0,
        labour_chrg: parseFloat(form.labour_chrg) || 0,
      };
      let finalNo = podNo;
      const { data: existing } = await supabase.from('pod_details').select('id, pod_no').eq('gr_no', row.gr_no).maybeSingle();
      if (existing) {
        const { error: e } = await supabase.from('pod_details').update(payload).eq('id', existing.id);
        if (e) throw e;
        finalNo = existing.pod_no || podNo;
      } else {
        const { data: ins, error: e } = await supabase.from('pod_details')
          .insert({ ...payload, pod_no: podNo }).select('pod_no').single();
        if (e) throw e;
        finalNo = ins?.pod_no || podNo;
      }
      setPodNo(finalNo);
      setSaved(true);
      onSaved?.(row.gr_no);
      const url = await generatePodPdf(bilty, null, { challan_no: row.challan_no }, finalNo,
        { rs_chrg: parseFloat(form.rs_chrg) || 0, labour_chrg: parseFloat(form.labour_chrg) || 0 });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (e) {
      setError('Failed to save POD: ' + (e?.message || e));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">
                POD — {row.gr_no} {podNo && <span className="ml-1 text-xs font-mono text-teal-700">#{podNo}</span>}
              </h3>
              <p className="text-xs text-slate-500">
                {row.destination_city_name || '—'} · {row.consignee_name || '—'} · Challan {row.challan_no || '—'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 mx-auto text-teal-600 animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Payment Mode *">
                  <select value={form.payment_mode} onChange={set('payment_mode')} className={inputCls}>
                    <option value="">Select</option>
                    {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Delivered At *"><input type="datetime-local" value={form.delivered_at} onChange={set('delivered_at')} className={inputCls} /></Field>
                <Field label="Mobile No. 1 *"><input type="tel" value={form.mobile_number_1} onChange={set('mobile_number_1')} placeholder="9876543210" className={inputCls} /></Field>
                <Field label="Mobile No. 2"><input type="tel" value={form.mobile_number_2} onChange={set('mobile_number_2')} placeholder="Optional" className={inputCls} /></Field>
                <Field label="Total Amount *"><input type="number" value={form.total_amount} onChange={set('total_amount')} placeholder="0" className={inputCls} /></Field>
                <Field label="Amount Given"><input type="number" value={form.amount_given} onChange={set('amount_given')} placeholder="0" className={inputCls} /></Field>
                <Field label="Reminder"><input type="text" value={form.reminder} onChange={set('reminder')} placeholder="Any note..." className={inputCls} /></Field>
                <Field label="Consignor Name" hint="(optional)"><input type="text" value={form.consignor_name} onChange={set('consignor_name')} className={inputCls} /></Field>
                <Field label="Consignor GST" hint="(optional)"><input type="text" value={form.consignor_gst} onChange={set('consignor_gst')} className={inputCls} /></Field>
                <Field label="RS Chrg (₹)"><input type="number" value={form.rs_chrg} onChange={set('rs_chrg')} className={inputCls} /></Field>
                <Field label="Labour Chrg (₹)"><input type="number" value={form.labour_chrg} onChange={set('labour_chrg')} className={inputCls} /></Field>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={saveAndPrint} disabled={!canSave || saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-sm disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saved ? 'Update & Print' : 'Save & Print'}
                </button>
                {!canSave && <span className="text-xs text-amber-600">Fill delivered at & total amount to print</span>}
                {pdfUrl && (
                  <>
                    <a href={pdfUrl} download={`POD_${row.gr_no}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                      <FileText className="w-4 h-4" /> Download
                    </a>
                    <button onClick={() => { const w = window.open(pdfUrl, '_blank'); if (!w) alert('Please allow popups'); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                      <Printer className="w-4 h-4" /> Open to print
                    </button>
                  </>
                )}
              </div>

              {pdfUrl && (
                <div className="rounded-xl overflow-hidden ring-1 ring-slate-200" style={{ height: '50vh' }}>
                  <iframe src={pdfUrl} className="w-full h-full border-0" title="POD Preview" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
