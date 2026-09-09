import Link from 'next/link';
import {
  Truck, Warehouse, MapPinned, ShieldCheck, Clock, ArrowRight, PackageCheck,
  Target, Eye, HeartHandshake, Users, MapPin, Phone, Mail,
} from 'lucide-react';
import { BRANCHES, COMPANY_EMAIL, CUSTOMER_CARE, OWNER_CONTACTS, formatPhone, telHref } from '@/data/company';
import ContactForm from '@/components/ContactForm';
import StationsSearch from '@/components/StationsSearch';

const SERVICES = [
  { icon: Truck, title: 'Full Truckload (FTL)', description: 'Dedicated trucks for large shipments, moving door-to-door with no stops in between.' },
  { icon: PackageCheck, title: 'Part Load Delivery', description: 'Cost-effective shared-load transport for smaller consignments across our network.' },
  { icon: Warehouse, title: 'Warehousing', description: 'Secure storage and cross-docking facilities to keep your goods moving efficiently.' },
  { icon: MapPinned, title: 'Pan-India Network', description: 'Reliable coverage across major routes and cities, with hubs built for fast transit.' },
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

const VALUES = [
  { icon: Target, title: 'Our Mission', description: 'To move every shipment safely and on time, so our customers never have to worry about their freight.' },
  { icon: Eye, title: 'Our Vision', description: 'To be the most trusted logistics partner for businesses across India, one delivery at a time.' },
  { icon: HeartHandshake, title: 'Our Values', description: 'Reliability, transparency, and respect — for our customers, our drivers, and our partners.' },
];

function ContactRow({ icon: Icon, label, href, value }) {
  return (
    <div className="flex gap-4">
      <div className="bg-blue-50 text-blue-900 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-slate-500 mt-0.5 block hover:text-blue-900">{value}</a>
        ) : (
          <p className="text-sm text-slate-500 mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Home / Hero */}
      <section id="home" className="bg-blue-900 text-white scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-orange-400 font-semibold text-sm tracking-wide uppercase mb-3">Freight & Logistics</p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Moving Your Business, <span className="text-orange-400">On Every Route</span>
            </h1>
            <p className="text-blue-100 text-lg mb-8 max-w-lg">
              SS Transport Co. delivers reliable full truckload, part load,
              and warehousing services across India — built for businesses that
              can&apos;t afford delays.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors">
                Get a Quote <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#about" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors">
                Learn More
              </a>
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
            <a href="#contact" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Contact Us <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-slate-50 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">About Us</p>
            <h2 className="text-3xl font-bold text-slate-900">Built on Trust, Driven by Delivery</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Story</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                SS Transport Co. started as a single-truck operation with one
                goal: never let a customer down on delivery. That promise
                hasn&apos;t changed, even as we&apos;ve grown into a fleet of
                hundreds serving cities across India.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Today, we handle everything from full truckload freight to
                part-load consignments and warehousing — built on the same
                discipline that got our first truck to its first delivery, on
                time.
              </p>
            </div>
            <div className="flex items-center justify-center bg-white rounded-2xl p-10 border border-slate-100">
              <Users className="w-32 h-32 text-blue-900" strokeWidth={1} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="bg-orange-50 text-orange-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">{v.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section id="branches" className="bg-white scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">Our Branches</p>
            <h2 className="text-3xl font-bold text-slate-900">Find Us in Aligarh</h2>
            <p className="text-slate-500 mt-3">Three branches, one team — visit whichever is closest to you.</p>
          </div>

          <div className="space-y-10">
            {BRANCHES.map((branch) => (
              <div key={branch.id} className="grid md:grid-cols-2 gap-6 items-stretch">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 flex flex-col justify-center">
                  <div className="bg-orange-50 text-orange-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{branch.name}</h3>
                  <p className="text-slate-600 leading-relaxed mb-3">{branch.address}</p>
                  <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <Clock className="w-4 h-4" /> {branch.hours}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-100 min-h-[260px]">
                  <iframe
                    src={branch.mapEmbedSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '260px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title={`${branch.name} location map`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stations */}
      <section id="stations" className="bg-slate-50 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">Stations</p>
            <h2 className="text-3xl font-bold text-slate-900">Find a City, Transport & Number</h2>
            <p className="text-slate-500 mt-3">Search any city or transport we work with, and get their contact number directly.</p>
          </div>
          <StationsSearch />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">Contact Us</p>
            <h2 className="text-3xl font-bold text-slate-900">Let&apos;s Get Your Freight Moving</h2>
            <p className="text-slate-500 mt-3">Reach out with your route and load details — our team responds the same business day.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-12">
            <div className="md:col-span-2 space-y-6">
              <ContactRow icon={Phone} label={CUSTOMER_CARE.label} href={telHref(CUSTOMER_CARE.phone)} value={formatPhone(CUSTOMER_CARE.phone)} />
              {OWNER_CONTACTS.map((c) => (
                <ContactRow key={c.phone} icon={Phone} label={c.label} href={telHref(c.phone)} value={formatPhone(c.phone)} />
              ))}
              <ContactRow icon={Mail} label="Email" href={`mailto:${COMPANY_EMAIL}`} value={COMPANY_EMAIL} />
              <ContactRow icon={Clock} label="Business Hours" value="Mon – Sat, 9:00 AM – 8:00 PM" />
              <div className="flex gap-4">
                <div className="bg-blue-50 text-blue-900 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Visit a Branch</p>
                  <Link href="#branches" className="text-sm text-blue-900 mt-0.5 inline-block hover:underline">
                    See all 3 locations in Aligarh ↑
                  </Link>
                </div>
              </div>
            </div>

            <div className="md:col-span-3">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
