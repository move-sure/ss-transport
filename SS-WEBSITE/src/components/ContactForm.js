'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700';

export default function ContactForm() {
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

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Thanks, {form.name.split(' ')[0]}!</h3>
        <p className="text-sm text-slate-600">We&apos;ve received your message and will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
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
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        Send Message <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
