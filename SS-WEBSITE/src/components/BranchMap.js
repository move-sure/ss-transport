'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BRANCHES, formatPhone, telHref } from '@/data/company';
import cityCoords from '@/data/cityCoords.json';

// Leaflet's default marker icons reference image paths that break under
// bundlers — point them at the CDN copies instead of fighting the bundler.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Small gold dot for cities — visually distinct from the full branch pins.
const cityIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:12px;height:12px;border-radius:9999px;background:#d97706;border:2px solid white;box-shadow:0 0 0 1px #92400e;"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

// Center point roughly between all three Aligarh branches.
const CENTER = [27.905, 78.096];

const API_URL = 'https://api.movesure.io';

// Coordinates were geocoded once (scripts/geocode-cities.mjs) and bundled as a
// static file so the map never has to hit a geocoding API at runtime — no
// per-visitor rate limits, no cap on how many cities can be plotted.
export default function BranchMap() {
  const [cityPins, setCityPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/directory/lookup?limit=1000`);
        const json = await res.json();
        const cities = json.data?.cities || [];
        const pins = cities
          .map((city) => {
            const coords = cityCoords[`${city.city_name}|${city.state_name}`];
            return coords ? { id: city.id, name: city.city_name, state: city.state_name, ...coords } : null;
          })
          .filter(Boolean);
        setCityPins(pins);
      } catch (_) {
        // fall back to whatever is in the static file, keyed without live city ids
        const pins = Object.entries(cityCoords)
          .filter(([, coords]) => coords)
          .map(([key, coords]) => {
            const [name, state] = key.split('|');
            return { id: key, name, state, ...coords };
          });
        setCityPins(pins);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute top-3 right-3 z-1000 bg-white/95 text-xs font-medium text-slate-600 px-3 py-1.5 rounded-full shadow border border-slate-200">
          Loading cities…
        </div>
      )}
      <MapContainer center={CENTER} zoom={12} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {BRANCHES.map((branch) => (
          <Marker key={branch.id} position={[branch.lat, branch.lng]} icon={markerIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-slate-900 mb-1">{branch.name}</p>
                <p className="text-slate-600 mb-1">{branch.address}</p>
                <p className="text-amber-700 font-semibold mb-1">{branch.hours}</p>
                {branch.phones?.map((phone) => (
                  <a key={phone} href={telHref(phone)} className="block text-amber-800 font-medium hover:underline">
                    {formatPhone(phone)}
                  </a>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
        {cityPins.map((city) => (
          <Marker key={city.id} position={[city.lat, city.lng]} icon={cityIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-slate-900">{city.name}</p>
                <p className="text-slate-500">{city.state}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
