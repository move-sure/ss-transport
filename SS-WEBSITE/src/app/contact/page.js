'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';

const CONTACT_INFO = [
  { icon: MapPin, label: 'Address', value: 'Kanpur, Uttar Pradesh, India' },
  { icon: Phone, label: 'Phone', value: '+91 123 456 7890' },
  { icon: Mail, label: 'Email', value: 'info@sstransportcorp.com' },
  { icon: Clock, label: 'Business Hours', value: 'Mon – Sat, 9:00 AM – 7:00 PM' },
];

const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div>
      <section className="bg-blue-900 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-orange-400 font-semibold text-sm tracking-wide uppercase mb-3">Contact Us</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Let&apos;s Get Your Freight Moving</h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            Reach out with your route and load details — our team responds the
            same business day.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid md:grid-cols-5 gap-12">
          <div className="md:col-span-2 space-y-6">
            {CONTACT_INFO.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex gap-4">
                  <div className="bg-blue-50 text-blue-900 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.label}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="md:col-span-3">
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Thanks, {form.name.split(' ')[0]}!</h3>
                <p className="text-sm text-slate-600">
                  We&apos;ve received your message and will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 sm:p-8 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                    <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="Your phone number" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} placeholder="you@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    rows={5}
                    className={inputCls}
                    placeholder="Tell us about your shipment — route, load size, timeline…"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Send Message <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
