'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone } from 'lucide-react';
import { COMPANY_NAME, CUSTOMER_CARE, formatPhone, telHref } from '@/data/company';

const LINKS = [
  { href: '/#home', label: 'Home' },
  { href: '/#about', label: 'About Us' },
  { href: '/#branches', label: 'Branches' },
  { href: '/#stations', label: 'Stations' },
  { href: '/map', label: 'Map' },
  { href: '/#contact', label: 'Contact' },
];

function NavLink({ href, label, onClick, className = '' }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative text-sm font-semibold tracking-wide text-slate-700 hover:text-amber-700 transition-colors ${className}`}
    >
      {label}
      <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-amber-600 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <Image src="/logo.png" alt={COMPANY_NAME} width={1063} height={1063} className="h-14 w-14 object-contain" priority />
            <span className="text-xl font-extrabold tracking-wide uppercase text-slate-900 leading-tight">
              {COMPANY_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <a href={telHref(CUSTOMER_CARE.phone)} className="flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-900 transition-colors">
              <Phone className="w-4 h-4" /> {formatPhone(CUSTOMER_CARE.phone)}
            </a>
            <Link
              href="/#contact"
              className="bg-amber-500 hover:bg-amber-600 hover:scale-105 text-white text-sm font-bold tracking-wide px-5 py-2.5 rounded-lg transition-all shadow-sm"
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
              <NavLink key={link.href} {...link} onClick={() => setOpen(false)} className="py-2.5 text-base" />
            ))}
            <a href={telHref(CUSTOMER_CARE.phone)} className="py-2.5 text-sm font-bold text-amber-800 flex items-center gap-2">
              <Phone className="w-4 h-4" /> {formatPhone(CUSTOMER_CARE.phone)}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
