import Link from 'next/link';
import { Truck, MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
            <span className="bg-orange-500 rounded-lg p-2">
              <Truck className="w-5 h-5" />
            </span>
            SS Transport Corporation
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Reliable freight & logistics across India — on-time delivery,
            every route, every load.
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
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
              Kanpur, Uttar Pradesh, India
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-orange-500" />
              +91 123 456 7890
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-orange-500" />
              info@sstransportcorp.com
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-orange-500" />
              Mon – Sat, 9:00 AM – 7:00 PM
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-slate-500 text-center">
          © {year} SS Transport Corporation. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
