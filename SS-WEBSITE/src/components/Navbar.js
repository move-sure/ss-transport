'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Truck, Menu, X, Phone } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900" onClick={() => setOpen(false)}>
            <span className="bg-blue-900 text-white rounded-lg p-2">
              <Truck className="w-5 h-5" />
            </span>
            <span className="text-lg leading-tight">
              SS Transport<br className="hidden sm:block" />
              <span className="font-normal text-sm text-slate-500 sm:hidden"> Corporation</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 hover:text-blue-900 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+911234567890" className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Phone className="w-4 h-4" /> +91 123 456 7890
            </a>
            <Link
              href="/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get a Quote
            </Link>
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 text-slate-700"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-medium text-slate-700 hover:text-blue-900"
              >
                {link.label}
              </Link>
            ))}
            <a href="tel:+911234567890" className="py-2.5 text-sm font-semibold text-blue-900 flex items-center gap-2">
              <Phone className="w-4 h-4" /> +91 123 456 7890
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
