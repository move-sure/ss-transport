import { Truck, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { COMPANY_NAME, COMPANY_EMAIL, CUSTOMER_CARE, OWNER_CONTACTS, formatPhone, telHref } from '@/data/company';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3 uppercase">
            <span className="bg-orange-500 rounded-lg p-2">
              <Truck className="w-5 h-5" />
            </span>
            {COMPANY_NAME}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Reliable freight & logistics across India — on-time delivery,
            every route, every load.
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
            <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
            <li><a href="#branches" className="hover:text-white transition-colors">Branches</a></li>
            <li><a href="#stations" className="hover:text-white transition-colors">Stations</a></li>
            <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Services</h3>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li>Full Truckload (FTL)</li>
            <li>Part Load Delivery</li>
            <li>Warehousing</li>
            <li>Pan-India Network</li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Get in Touch</h3>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
              Aligarh, Uttar Pradesh, India
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-orange-500" />
              <a href={telHref(CUSTOMER_CARE.phone)} className="hover:text-white transition-colors">
                {CUSTOMER_CARE.label}: {formatPhone(CUSTOMER_CARE.phone)}
              </a>
            </li>
            {OWNER_CONTACTS.map((c) => (
              <li key={c.phone} className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0 text-orange-500" />
                <a href={telHref(c.phone)} className="hover:text-white transition-colors">
                  {c.label}: {formatPhone(c.phone)}
                </a>
              </li>
            ))}
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-orange-500" />
              <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-white transition-colors">{COMPANY_EMAIL}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-orange-500" />
              Mon – Sat, 9:00 AM – 8:00 PM
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-slate-500 text-center">
          © {year} {COMPANY_NAME} All rights reserved.
        </div>
      </div>
    </footer>
  );
}
