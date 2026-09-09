import Link from 'next/link';
import Image from 'next/image';
import {
  Truck, Warehouse, MapPinned, ShieldCheck, Clock, ArrowRight, PackageCheck,
  Target, Eye, HeartHandshake, Users, MapPin, Phone, Mail, Leaf, Zap, Wind, Recycle,
} from 'lucide-react';
import { BRANCHES, COMPANY_EMAIL, CUSTOMER_CARE, OWNER_CONTACTS, formatPhone, telHref } from '@/data/company';
import ContactForm from '@/components/ContactForm';
import StationsSearch from '@/components/StationsSearch';

const SERVICES = [
  { icon: Truck, image: '/full-truck-load.png', title: 'Full Truckload (FTL)', description: 'Dedicated trucks for large shipments, moving door-to-door with no stops in between.' },
  { icon: PackageCheck, image: '/part-truck-load.png', title: 'Part Load Delivery', description: 'Cost-effective shared-load transport for smaller consignments across our network.' },
  { icon: Warehouse, image: '/warehouse.png', title: 'Warehousing', description: 'Secure storage and cross-docking facilities to keep your goods moving efficiently.' },
  { icon: MapPinned, image: '/pan-india.png', title: 'Pan-India Network', description: 'Reliable coverage across major routes and cities, with hubs built for fast transit.' },
];

const STATS = [
  { value: '35+', label: 'Years Of Excellence' },
  { value: '1 Lakh+', label: 'Consignments Done' },
  { value: '10k+', label: 'Trips' },
  { value: '550+', label: 'Cities Covered' },
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

const GREEN_POINTS = [
  { icon: Zap, text: 'Zero tailpipe emissions on every electric delivery' },
  { icon: Wind, text: 'Lower noise, cleaner air in the cities we serve' },
  { icon: Recycle, text: 'Reduced fuel dependency and a smaller carbon footprint' },
];

function ContactRow({ icon: Icon, label, href, value }) {
  return (
    <div className="flex gap-4">
      <div className="bg-amber-50 text-amber-800 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-slate-500 mt-0.5 block hover:text-amber-700">{value}</a>
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
      <section id="home" className="relative bg-amber-900 text-white scroll-mt-16 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="opacity-0 animate-[fade-in-up_0.8s_ease-out_1.7s_both] text-amber-300 font-semibold text-sm tracking-wide uppercase mb-3">
              All India Service · Freight & Logistics
            </p>
            <h1 className="opacity-0 animate-[fade-in-up_0.8s_ease-out_1.85s_both] text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Moving Your Business, <span className="text-amber-300">On Every Route</span>
            </h1>
            <p className="opacity-0 animate-[fade-in-up_0.8s_ease-out_2s_both] text-amber-50 text-lg mb-8 max-w-lg">
              SS Transport Co. delivers reliable full truckload, part load,
              and warehousing services across India — built for businesses that
              can&apos;t afford delays.
            </p>
            <div className="opacity-0 animate-[fade-in-up_0.8s_ease-out_2.15s_both] flex flex-wrap gap-4">
              <a href="#contact" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 hover:scale-105 text-white font-semibold px-6 py-3.5 rounded-lg transition-all">
                Get a Quote <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#about" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 hover:scale-105 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-lg transition-all">
                Learn More
              </a>
            </div>
          </div>
          <div className="hidden md:flex justify-center opacity-0 animate-[fade-in_1s_ease-out_1.9s_both]">
            <div className="animate-[float_4s_ease-in-out_infinite] bg-white/10 border border-white/20 rounded-2xl p-8 w-full max-w-sm">
              <Truck className="w-full h-40 text-amber-300" strokeWidth={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-amber-800">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">What We Do</p>
            <h2 className="text-3xl font-bold text-slate-900">Services Built for Your Freight</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="relative w-full h-36 bg-slate-100">
                    <Image src={s.image} alt={s.title} fill className="object-cover" />
                  </div>
                  <div className="p-6">
                    <div className="bg-amber-50 text-amber-800 rounded-xl w-12 h-12 flex items-center justify-center mb-4 -mt-12 relative border-4 border-white shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{s.description}</p>
                  </div>
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
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">Why Choose Us</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">A Partner You Can Rely On</h2>
            <div className="space-y-6">
              {WHY_US.map((w) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="flex gap-4">
                    <div className="bg-amber-50 text-amber-700 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
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
          <div className="bg-amber-900 rounded-2xl p-10 text-white">
            <h3 className="text-2xl font-bold mb-3">Need a shipment moved?</h3>
            <p className="text-amber-50 mb-6">
              Tell us your route and load — our team will get back to you with a
              quote the same day.
            </p>
            <a href="#contact" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Contact Us <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section id="sustainability" className="bg-white scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-100 shadow-sm order-2 md:order-1">
            <Image src="/electric.jpeg" alt="SS Transport Co. electric delivery truck" fill className="object-cover" />
          </div>
          <div className="order-1 md:order-2">
            <div className="bg-amber-50 text-amber-800 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
              <Leaf className="w-6 h-6" />
            </div>
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">Green Energy & Sustainability</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Driving Toward a Cleaner Tomorrow</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              We believe in green energy and sustainability — that&apos;s why
              SS Transport Co. has introduced electric motor fleets into our
              operations. It&apos;s a step toward reducing our environmental
              impact while still delivering the same reliability our
              customers count on.
            </p>
            <div className="space-y-3">
              {GREEN_POINTS.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.text} className="flex items-center gap-3">
                    <div className="bg-amber-50 text-amber-700 rounded-lg w-8 h-8 shrink-0 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-slate-600">{g.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-slate-50 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">About Us</p>
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
              <Users className="w-32 h-32 text-amber-800" strokeWidth={1} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="bg-amber-50 text-amber-700 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
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
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">Our Branches</p>
            <h2 className="text-3xl font-bold text-slate-900">Find Us in Aligarh</h2>
            <p className="text-slate-500 mt-3">Three branches, one team — visit whichever is closest to you.</p>
          </div>

          <div className="space-y-10">
            {BRANCHES.map((branch) => (
              <div key={branch.id} className="grid md:grid-cols-2 gap-6 items-stretch">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 flex flex-col justify-center">
                  <div className="bg-amber-50 text-amber-700 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{branch.name}</h3>
                  <p className="text-slate-600 leading-relaxed mb-3">{branch.address}</p>
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
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
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">Stations</p>
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
            <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase mb-2">Contact Us</p>
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
                <div className="bg-amber-50 text-amber-800 rounded-lg w-11 h-11 shrink-0 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Visit a Branch</p>
                  <Link href="#branches" className="text-sm text-amber-800 mt-0.5 inline-block hover:underline">
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
