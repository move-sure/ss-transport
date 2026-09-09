'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone } from 'lucide-react';
import { COMPANY_NAME, CUSTOMER_CARE, formatPhone, telHref } from '@/data/company';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About Us' },
  { href: '#branches', label: 'Branches' },
  { href: '#stations', label: 'Stations' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900" onClick={() => setOpen(false)}>
            <Image src="/logo.png" alt={COMPANY_NAME} width={1063} height={1063} className="h-11 w-11 object-contain" priority />
            <span className="text-lg leading-tight uppercase">{COMPANY_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href={telHref(CUSTOMER_CARE.phone)} className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Phone className="w-4 h-4" /> {formatPhone(CUSTOMER_CARE.phone)}
            </a>
            <a
              href="#contact"
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get a Quote
            </a>
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
                className="py-2.5 text-sm font-medium text-slate-700 hover:text-amber-700"
              >
                {link.label}
              </Link>
            ))}
            <a href={telHref(CUSTOMER_CARE.phone)} className="py-2.5 text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Phone className="w-4 h-4" /> {formatPhone(CUSTOMER_CARE.phone)}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
