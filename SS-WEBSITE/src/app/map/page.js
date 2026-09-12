'use client';

import dynamic from 'next/dynamic';
import { MapPin, Loader2 } from 'lucide-react';
import CitiesList from '@/components/CitiesList';

// Leaflet needs the browser (window/document) — never render it on the server.
const BranchMap = dynamic(() => import('@/components/BranchMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <Loader2 className="w-6 h-6 text-amber-700 animate-spin" />
    </div>
  ),
});

export default function MapPage() {
  return (
    <div>
      <section className="bg-amber-900 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-amber-300 font-semibold text-sm tracking-wide uppercase mb-3">Find Us</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Our Branches on the Map</h1>
          <p className="text-amber-50 text-lg max-w-2xl">
            Our three Aligarh branches (large pins) plus every city we serve
            that could be mapped (small gold dots) — tap any pin for details.
            Search the full city list below the map.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm h-[420px] sm:h-[520px] mb-16">
            <BranchMap />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-50 text-amber-700 rounded-xl w-12 h-12 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Cities We Serve</h2>
              <p className="text-sm text-slate-500">Search our full network of cities and transport partners.</p>
            </div>
          </div>
          <div className="mt-6">
            <CitiesList />
          </div>
        </div>
      </section>
    </div>
  );
}
