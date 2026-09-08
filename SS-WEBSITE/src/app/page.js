import Link from 'next/link';
import { Truck, Warehouse, MapPinned, ShieldCheck, Clock, ArrowRight, PackageCheck } from 'lucide-react';

const SERVICES = [
  {
    icon: Truck,
    title: 'Full Truckload (FTL)',
    description: 'Dedicated trucks for large shipments, moving door-to-door with no stops in between.',
  },
  {
    icon: PackageCheck,
    title: 'Part Load Delivery',
    description: 'Cost-effective shared-load transport for smaller consignments across our network.',
  },
  {
    icon: Warehouse,
    title: 'Warehousing',
    description: 'Secure storage and cross-docking facilities to keep your goods moving efficiently.',
  },
  {
    icon: MapPinned,
    title: 'Pan-India Network',
    description: 'Reliable coverage across major routes and cities, with hubs built for fast transit.',
  },
];

const STATS = [
  { value: '25+', label: 'Years in Business' },
  { value: '500+', label: 'Trucks on the Road' },
  { value: '50,000+', label: 'Deliveries Completed' },
  { value: '100+', label: 'Cities Covered' },
];

const WHY_US = [
  { icon: ShieldCheck, title: 'Safe & Insured', description: 'Every shipment is handled with care and covered end to end.' },
  { icon: Clock, title: 'On-Time, Always', description: 'Real-time tracking and disciplined scheduling keep every load on time.' },
  { icon: Truck, title: 'Modern Fleet', description: 'A well-maintained fleet built for long-haul and last-mile delivery alike.' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-blue-900 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-orange-400 font-semibold text-sm tracking-wide uppercase mb-3">Freight & Logistics</p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Moving Your Business, <span className="text-orange-400">On Every Route</span>
            </h1>
            <p className="text-blue-100 text-lg mb-8 max-w-lg">
              SS Transport Corporation delivers reliable full truckload, part load,
              and warehousing services across India — built for businesses that
              can&apos;t afford delays.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors"
              >
                Get a Quote <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-8 w-full max-w-sm">
              <Truck className="w-full h-40 text-orange-400" strokeWidth={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-blue-900">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">What We Do</p>
            <h2 className="text-3xl font-bold text-slate-900">Services Built for Your Freight</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-blue-50 text-blue-900 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">Why Choose Us</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">A Partner You Can Rely On</h2>
            <div className="space-y-6">
              {WHY_US.map((w) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="flex gap-4">
                    <div className="bg-orange-50 text-orange-600 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{w.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{w.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-blue-900 rounded-2xl p-10 text-white">
            <h3 className="text-2xl font-bold mb-3">Need a shipment moved?</h3>
            <p className="text-blue-100 mb-6">
              Tell us your route and load — our team will get back to you with a
              quote the same day.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Contact Us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
