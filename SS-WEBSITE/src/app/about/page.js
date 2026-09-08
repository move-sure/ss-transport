import { Target, Eye, HeartHandshake, Users } from 'lucide-react';

export const metadata = {
  title: 'About Us | SS Transport Corporation',
  description: 'Learn about SS Transport Corporation — our story, mission, and the team behind reliable freight delivery across India.',
};

const VALUES = [
  { icon: Target, title: 'Our Mission', description: 'To move every shipment safely and on time, so our customers never have to worry about their freight.' },
  { icon: Eye, title: 'Our Vision', description: 'To be the most trusted logistics partner for businesses across India, one delivery at a time.' },
  { icon: HeartHandshake, title: 'Our Values', description: 'Reliability, transparency, and respect — for our customers, our drivers, and our partners.' },
];

const TIMELINE = [
  { year: '1999', text: 'SS Transport Corporation founded with a single truck and a simple promise: deliver on time.' },
  { year: '2008', text: 'Expanded operations across North India, opening new hubs to serve growing demand.' },
  { year: '2015', text: 'Crossed 100+ cities served, with a fleet built for both long-haul and part-load delivery.' },
  { year: 'Today', text: '500+ trucks, a pan-India network, and thousands of businesses who trust us with their freight.' },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-blue-900 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-orange-400 font-semibold text-sm tracking-wide uppercase mb-3">About Us</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Built on Trust, Driven by Delivery</h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            For over two decades, SS Transport Corporation has kept businesses
            moving — one honest delivery at a time.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Story</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              SS Transport Corporation started as a single-truck operation with
              one goal: never let a customer down on delivery. That promise
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
          <div className="flex items-center justify-center bg-slate-50 rounded-2xl p-10 border border-slate-100">
            <Users className="w-32 h-32 text-blue-900" strokeWidth={1} />
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="bg-orange-50 text-orange-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-orange-600 font-semibold text-sm tracking-wide uppercase mb-2">Our Journey</p>
            <h2 className="text-3xl font-bold text-slate-900">Milestones Along the Way</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-8">
            {TIMELINE.map((t) => (
              <div key={t.year} className="flex gap-5">
                <div className="w-20 shrink-0 text-right font-bold text-blue-900">{t.year}</div>
                <div className="border-l-2 border-orange-400 pl-5 pb-2">
                  <p className="text-slate-600">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
