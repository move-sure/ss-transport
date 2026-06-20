'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '../../../components/dashboard/navbar';
import {
  ChevronLeft, Printer, Loader2, FileText, Building2, Users,
  Truck, Package, CreditCard, CheckCircle, Clock, XCircle,
  AlertCircle, IndianRupee, CalendarDays, Hash,
} from 'lucide-react';

const InvoicePrintModal = dynamic(
  () => import('../../../components/invoice/invoice-print-modal'),
  { ssr: false }
);

const API_BASE = 'https://api.movesure.io';

async function fetchInvoice(id) {
  const r = await fetch(`${API_BASE}/api/invoice/${id}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed to fetch invoice');
  return j.data;
}

async function fetchTenant(tenantId) {
  if (!tenantId) return null;
  try {
    const r = await fetch(`${API_BASE}/api/invoice/tenants/${tenantId}`);
    const j = await r.json();
    return j.data || null;
  } catch { return null; }
}

const STATUS_META = {
  DRAFT:        { cls: 'bg-gray-100 text-gray-700 border-gray-200',   icon: Clock,        label: 'Draft' },
  SENT:         { cls: 'bg-blue-100 text-blue-700 border-blue-200',   icon: CheckCircle,  label: 'Sent' },
  ACKNOWLEDGED: { cls: 'bg-green-100 text-green-700 border-green-200',icon: CheckCircle,  label: 'Acknowledged' },
  CANCELLED:    { cls: 'bg-red-100 text-red-700 border-red-200',      icon: XCircle,      label: 'Cancelled' },
};

const PAY_META = {
  UNPAID:  { cls: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Unpaid' },
  PARTIAL: { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Partial' },
  PAID:    { cls: 'bg-green-100 text-green-700 border-green-200',    label: 'Paid' },
  OVERDUE: { cls: 'bg-red-100 text-red-700 border-red-200',          label: 'Overdue' },
};

const TYPE_LABEL = {
  TAX_INVOICE: 'Tax Invoice', BILL_OF_SUPPLY: 'Bill of Supply',
  PROFORMA: 'Proforma Invoice', CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note', DELIVERY_CHALLAN: 'Delivery Challan',
};

function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d || '—'; } }
function fm(n) { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-900 font-medium mt-0.5">{value}</span>
    </div>
  );
}

function Card({ title, icon: Icon, accent = 'blue', children }) {
  const colors = {
    blue:   'border-blue-200 bg-blue-50/30',
    green:  'border-green-200 bg-green-50/30',
    purple: 'border-purple-200 bg-purple-50/30',
    orange: 'border-orange-200 bg-orange-50/30',
    gray:   'border-gray-200 bg-gray-50/30',
  };
  const iconBg = {
    blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600', orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className={`rounded-xl border ${colors[accent]} overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-inherit bg-white/60">
        <span className={`p-1.5 rounded-lg ${iconBg[accent]}`}><Icon className="h-4 w-4" /></span>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const inv = await fetchInvoice(id);
      setInvoice(inv);
      if (inv?.tenant_id) {
        const t = await fetchTenant(inv.tenant_id);
        setTenant(t);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Build data object for PDF
  const pdfData = invoice ? {
    ...invoice,
    // Use top-level pvt_marks from invoice_master (always correct per API spec).
    // Fall back to first line item only as a defensive measure.
    pvt_marks:       invoice.pvt_marks || invoice.line_items?.[0]?.pvt_marks || '',
    bank_name:       tenant?.bank_name        || '',
    bank_account_no: tenant?.bank_account_no  || '',
    bank_ifsc:       tenant?.bank_ifsc        || '',
    bank_branch:     tenant?.bank_branch      || '',
    upi_id:          tenant?.upi_id           || '',
  } : null;

  const sb  = STATUS_META[invoice?.status]         || STATUS_META.DRAFT;
  const pb  = PAY_META[invoice?.payment_status]    || PAY_META.UNPAID;
  const SIcon = sb.icon;
  const hasIGST = Number(invoice?.total_igst || 0) > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading invoice…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center max-w-sm">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-800 font-semibold mb-1">Invoice not found</p>
            <p className="text-gray-500 text-sm mb-4">{error || 'No data returned from server'}</p>
            <button onClick={() => router.push('/invoice')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
              Back to Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Print modal */}
      <InvoicePrintModal
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        invoiceData={pdfData}
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/invoice')}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="font-mono text-blue-700">{invoice.invoice_no}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">
                  {TYPE_LABEL[invoice.invoice_type] || invoice.invoice_type}
                </span>
              </h1>
              <p className="text-xs text-gray-500">{invoice.buyer_name} · {fmtDate(invoice.invoice_date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badges */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sb.cls}`}>
              <SIcon className="h-3.5 w-3.5" /> {sb.label}
            </span>
            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${pb.cls}`}>
              {pb.label}
            </span>
            <button onClick={() => setShowPrint(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <Printer className="h-4 w-4" /> Print Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* Row 1: Seller | Buyer | Invoice meta */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <Card title="Seller Details" icon={Building2} accent="blue">
            <div className="space-y-3">
              <InfoRow label="Company"    value={invoice.seller_name} />
              <InfoRow label="GSTIN"      value={invoice.seller_gstin} />
              <InfoRow label="PAN"        value={invoice.seller_pan} />
              <InfoRow label="State Code" value={invoice.seller_state_code} />
              <InfoRow label="Address"    value={invoice.seller_address} />
            </div>
          </Card>

          <Card title="Buyer Details" icon={Users} accent="green">
            <div className="space-y-3">
              <InfoRow label="Company"        value={invoice.buyer_name} />
              <InfoRow label="GSTIN"          value={invoice.buyer_gstin} />
              <InfoRow label="PAN"            value={invoice.buyer_pan} />
              <InfoRow label="State Code"     value={invoice.buyer_state_code} />
              <InfoRow label="Billing Address" value={invoice.billing_address} />
              {invoice.shipping_address && <InfoRow label="Shipping Address" value={invoice.shipping_address} />}
            </div>
          </Card>

          <Card title="Invoice Details" icon={FileText} accent="purple">
            <div className="space-y-3">
              <InfoRow label="Invoice No."    value={invoice.invoice_no} />
              <InfoRow label="Invoice Type"   value={TYPE_LABEL[invoice.invoice_type] || invoice.invoice_type} />
              <InfoRow label="Invoice Date"   value={fmtDate(invoice.invoice_date)} />
              <InfoRow label="Due Date"       value={fmtDate(invoice.due_date)} />
              <InfoRow label="Supply Type"    value={invoice.supply_type} />
              <InfoRow label="Place of Supply" value={invoice.place_of_supply} />
              <InfoRow label="Reverse Charge" value={invoice.is_reverse_charge ? 'Yes' : 'No'} />
              <InfoRow label="Status"         value={sb.label} />
            </div>
          </Card>
        </div>

        {/* Row 2: Transport */}
        {(invoice.transport_name || invoice.gr_no || invoice.e_way_bill || invoice.po_number) && (
          <Card title="Transport & Reference" icon={Truck} accent="orange">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoRow label="Transport"  value={invoice.transport_name} />
              <InfoRow label="GR Number"  value={invoice.gr_no} />
              <InfoRow label="E-Way Bill" value={invoice.e_way_bill} />
              <InfoRow label="PO Number"  value={invoice.po_number} />
              <InfoRow label="PO Date"    value={fmtDate(invoice.po_date)} />
              <InfoRow label="Challan No" value={invoice.challan_no} />
            </div>
          </Card>
        )}

        {/* Row 3: Line items table */}
        <Card title="Line Items" icon={Package} accent="gray">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold rounded-tl-lg w-8">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold">Item / Service</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">HSN/SAC</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Qty</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Unit</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold">Rate (₹)</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold">Taxable (₹)</th>
                  {hasIGST ? (
                    <th className="text-center px-3 py-2.5 text-xs font-semibold">IGST %</th>
                  ) : (
                    <>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold">CGST %</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold">SGST %</th>
                    </>
                  )}
                  {hasIGST ? (
                    <th className="text-right px-3 py-2.5 text-xs font-semibold">IGST (₹)</th>
                  ) : (
                    <>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold">CGST (₹)</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold">SGST (₹)</th>
                    </>
                  )}
                  <th className="text-right px-3 py-2.5 text-xs font-semibold rounded-tr-lg">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(invoice.line_items || []).map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-400 text-xs text-center font-mono">{item.line_number || i + 1}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600 font-mono text-xs">{item.hsn_sac_code || '—'}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{Number(item.quantity || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center text-gray-600 text-xs">{item.unit || 'NOS'}</td>
                    <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fm(item.rate)}</td>
                    <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fm(item.taxable_amount)}</td>
                    {hasIGST ? (
                      <td className="px-3 py-3 text-center text-orange-600 font-medium text-xs">{item.igst_rate}%</td>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-center text-blue-600 font-medium text-xs">{item.cgst_rate}%</td>
                        <td className="px-3 py-3 text-center text-blue-600 font-medium text-xs">{item.sgst_rate}%</td>
                      </>
                    )}
                    {hasIGST ? (
                      <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fm(item.igst_amount)}</td>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fm(item.cgst_amount)}</td>
                        <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fm(item.sgst_amount)}</td>
                      </>
                    )}
                    <td className="px-3 py-3 text-right font-semibold text-gray-900 tabular-nums">{fm(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Row 4: Totals + Payment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Totals */}
          <Card title="Invoice Summary" icon={IndianRupee} accent="blue">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount</span>
                <span className="font-semibold text-gray-900 tabular-nums">₹{fm(invoice.taxable_amount)}</span>
              </div>
              {hasIGST ? (
                <div className="flex justify-between text-gray-600">
                  <span>IGST</span>
                  <span className="font-semibold text-orange-600 tabular-nums">₹{fm(invoice.total_igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST</span>
                    <span className="font-semibold text-blue-600 tabular-nums">₹{fm(invoice.total_cgst)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST</span>
                    <span className="font-semibold text-blue-600 tabular-nums">₹{fm(invoice.total_sgst)}</span>
                  </div>
                </>
              )}
              {Number(invoice.total_cess || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Cess</span>
                  <span className="font-semibold tabular-nums">₹{fm(invoice.total_cess)}</span>
                </div>
              )}
              {Number(invoice.round_off || 0) !== 0 && (
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Round Off</span>
                  <span className="tabular-nums">₹{fm(invoice.round_off)}</span>
                </div>
              )}
              <div className="border-t-2 border-blue-200 pt-3 mt-2">
                <div className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-4 py-3">
                  <span className="font-bold text-base">Grand Total</span>
                  <span className="font-bold text-xl tabular-nums">₹{fm(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment */}
          <Card title="Payment Status" icon={CreditCard} accent="green">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${pb.cls}`}>
                  {pb.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Invoice Total</span>
                  <span className="font-semibold tabular-nums">₹{fm(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Paid Amount</span>
                  <span className="font-semibold text-green-600 tabular-nums">₹{fm(invoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-2">
                  <span className="font-semibold">Balance Due</span>
                  <span className={`font-bold tabular-nums ${Number(invoice.balance_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{fm(invoice.balance_amount)}
                  </span>
                </div>
              </div>

              {Number(invoice.total_amount) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Payment progress</span>
                    <span>{Math.min(100, Math.round((Number(invoice.paid_amount) / Number(invoice.total_amount)) * 100))}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (Number(invoice.paid_amount) / Number(invoice.total_amount)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {invoice.due_date && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Due: <span className="font-medium text-gray-700">{fmtDate(invoice.due_date)}</span></span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Notes */}
        {(invoice.notes || invoice.terms_and_conditions) && (
          <Card title="Notes & Terms" icon={FileText} accent="gray">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms_and_conditions && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Terms & Conditions</p>
                  <p className="text-sm text-gray-700">{invoice.terms_and_conditions}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Bottom print button */}
        <div className="flex justify-end pb-6">
          <button onClick={() => setShowPrint(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
            <Printer className="h-4 w-4" /> Print / Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
