'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, Download, Loader2, AlertCircle, ImagePlus, X, Search, MapPin, Star, FileText, ExternalLink, RotateCcw
} from 'lucide-react';
import Navbar from '../../../components/dashboard/navbar';
import supabase from '../../utils/supabase';

const API = 'https://api.movesure.io/api/catalog/station-list';
const LS_LOGO = 'stationList.logo';
const LS_COMPANY = 'stationList.company';
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// localStorage can be blocked / full - never let that break the page
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch { return false; } };

// Station catalog print: company name + pasted logo + states / major cities -> branded station-list PDF
export default function StationCatalogPage() {
  const router = useRouter();
  const [options, setOptions] = useState(null);
  const [optError, setOptError] = useState(null);

  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoNote, setLogoNote] = useState('');
  const [watermark, setWatermark] = useState(true);

  const [states, setStates] = useState([]);           // selected state names
  const [stateQuery, setStateQuery] = useState('');
  const [majorCities, setMajorCities] = useState([]); // [] = hide the band
  const [cityQuery, setCityQuery] = useState('');
  const [stateCities, setStateCities] = useState([]); // cities of the selected states (for suggestions)

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fileName, setFileName] = useState('station_list.pdf');
  const fileRef = useRef(null);

  // options + remembered company / logo
  useEffect(() => {
    setCompany(lsGet(LS_COMPANY) || '');
    setLogo(lsGet(LS_LOGO));
    fetch(`${API}/options`)
      .then((r) => r.json())
      .then((j) => {
        if (j.status !== 'success') throw new Error(j.message || 'Failed to load states');
        setOptions(j.data);
        setStates(j.data.default_states || []);
        setMajorCities(j.data.default_major_cities || []);
      })
      .catch((e) => setOptError(e.message));
  }, []);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  // cities of the selected states, for the major-city picker
  useEffect(() => {
    if (!states.length) { setStateCities([]); return; }
    supabase.from('cities').select('city_name, state_name').in('state_name', states).order('city_name')
      .then(({ data }) => setStateCities(data || []));
  }, [states]);

  const readLogo = useCallback((file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    if (file.size > MAX_LOGO_BYTES) { setLogoNote('Logo is over 5 MB — please use a smaller image.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      const saved = lsSet(LS_LOGO, reader.result);
      setLogoNote(saved ? 'Logo saved in this browser' : 'Logo too large to remember — it will be used for this PDF only');
    };
    reader.readAsDataURL(file);
  }, []);

  // Ctrl+V anywhere on the page
  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); readLogo(item.getAsFile()); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [readLogo]);

  const removeLogo = () => { setLogo(null); lsSet(LS_LOGO, null); setLogoNote(''); };

  const allStates = options?.states || [];
  const countByState = useMemo(() => Object.fromEntries(allStates.map((s) => [s.state_name, s.city_count])), [allStates]);
  const stationTotal = states.reduce((t, s) => t + (countByState[s] || 0), 0);
  const visibleStates = allStates.filter((s) => !stateQuery.trim() || s.state_name.toLowerCase().includes(stateQuery.trim().toLowerCase()));

  const toggleState = (name) => setStates((cur) => (cur.includes(name) ? cur.filter((s) => s !== name) : [...cur, name]));
  const addCity = (name) => {
    const n = name.trim().toUpperCase();
    if (!n || majorCities.includes(n)) return;
    setMajorCities((c) => [...c, n]);
    setCityQuery('');
  };
  const citySuggestions = cityQuery.trim()
    ? stateCities.filter((c) => c.city_name.toUpperCase().includes(cityQuery.trim().toUpperCase()) && !majorCities.includes(c.city_name.toUpperCase())).slice(0, 12)
    : [];

  const defaultTitle = company.trim() ? `STATION LIST FOR ${company.trim().toUpperCase()}` : 'STATION LIST';

  const generate = async () => {
    if (!company.trim()) { setError('Enter the company name'); return; }
    if (!states.length) { setError('Pick at least one state'); return; }
    setGenerating(true);
    setError(null);
    lsSet(LS_COMPANY, company.trim());
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company.trim(),
          ...(logo ? { logo } : {}),
          states,
          major_cities: majorCities,
          title: (title.trim() || defaultTitle),
          show_watermark: watermark
        })
      });
      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        try { msg = (await res.json()).message || msg; } catch { /* not JSON */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      setFileName(`station_list_${company.trim().replace(/[^a-z0-9]+/gi, '_')}.pdf`);
    } catch (e) {
      setError(e.message || 'Could not create the PDF');
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const print = () => {
    const frame = document.getElementById('station-pdf-frame');
    try { frame?.contentWindow?.focus(); frame?.contentWindow?.print(); } catch { window.open(pdfUrl, '_blank'); }
  };

  const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5';
  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="w-full px-4 sm:px-6 py-6">
        <button onClick={() => router.push('/analytics')} className="flex items-center gap-1.5 text-sm text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Analytics
        </button>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Station Catalog Print</h1>
              <p className="text-sm text-gray-600">Branded station-list PDF for a customer — paste their logo, pick states and highlight major cities.</p>
            </div>
          </div>
          <button onClick={generate} disabled={generating || !options}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Create PDF
          </button>
        </div>

        {(error || optError) && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error || optError}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Customer */}
          <div className={`${card} space-y-4`}>
            <h2 className="font-semibold text-gray-900">1. Customer</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name *</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className={input} placeholder="e.g. Kodia Locks" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder={defaultTitle} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); readLogo(e.dataTransfer.files?.[0]); }}
                className="relative flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-emerald-400 cursor-pointer overflow-hidden"
              >
                {logo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="Customer logo" className="max-h-36 max-w-full object-contain" />
                    <button onClick={(e) => { e.stopPropagation(); removeLogo(); }} title="Remove logo"
                      className="absolute top-2 right-2 p-1 rounded-full bg-white shadow hover:bg-red-50"><X className="w-4 h-4 text-red-600" /></button>
                  </>
                ) : (
                  <div className="text-center text-gray-500 text-sm">
                    <ImagePlus className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                    Press <kbd className="px-1 bg-white border rounded">Ctrl</kbd>+<kbd className="px-1 bg-white border rounded">V</kbd> to paste,<br />or click / drop an image
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => { readLogo(e.target.files?.[0]); e.target.value = ''; }} />
              <p className="text-xs text-gray-500 mt-1">{logoNote || 'PNG, JPG or WEBP up to 5 MB. Remembered in this browser for next time.'}</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" className="accent-emerald-600" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
              Faint logo watermark on every page
            </label>
          </div>

          {/* States */}
          <div className={`${card} flex flex-col`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">2. States <span className="text-sm font-normal text-gray-500">· {states.length} states · {stationTotal} stations</span></h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setStates(options?.default_states || [])} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Defaults</button>
              <button onClick={() => setStates(allStates.map((s) => s.state_name))} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200">All</button>
              <button onClick={() => setStates([])} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200">None</button>
              <div className="relative ml-auto">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={stateQuery} onChange={(e) => setStateQuery(e.target.value)} placeholder="Find state"
                  className="pl-8 pr-2 py-1 border border-gray-300 rounded-lg text-xs text-black w-36" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[460px] grid grid-cols-1 sm:grid-cols-2 gap-1.5 content-start">
              {!options && !optError && <div className="text-sm text-gray-500 py-6 text-center col-span-2"><Loader2 className="w-5 h-5 inline animate-spin" /> Loading states…</div>}
              {visibleStates.map((s) => {
                const on = states.includes(s.state_name);
                return (
                  <label key={s.state_name}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${on ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <span className="flex items-center gap-2">
                      <input type="checkbox" className="accent-emerald-600" checked={on} onChange={() => toggleState(s.state_name)} />
                      <span className={on ? 'font-semibold text-gray-900' : 'text-gray-800'}>{s.state_name}</span>
                    </span>
                    <span className="text-xs text-gray-500">{s.city_count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Major cities */}
          <div className={`${card} flex flex-col`}>
            <h2 className="font-semibold text-gray-900 mb-1">3. Major cities</h2>
            <p className="text-xs text-gray-500 mb-3">Shown as a highlighted band at the top. Leave empty to hide the band.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setMajorCities(options?.default_major_cities || [])} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Defaults</button>
              <button onClick={() => setMajorCities([])} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200">Clear (hide band)</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[2rem]">
              {majorCities.length === 0 && <span className="text-xs text-gray-400 italic">No major cities — band hidden</span>}
              {majorCities.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> {c}
                  <button onClick={() => setMajorCities((m) => m.filter((x) => x !== c))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(citySuggestions[0]?.city_name || cityQuery); } }}
                placeholder="Add a city from the selected states…" className={`${input} pl-9`} />
              {citySuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {citySuggestions.map((c) => (
                    <button key={`${c.state_name}-${c.city_name}`} onClick={() => addCity(c.city_name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 flex justify-between">
                      <span className="font-medium text-gray-900">{c.city_name}</span>
                      <span className="text-xs text-gray-500">{c.state_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Press Enter to add. Cities outside the selected states (e.g. NEPAL) can be typed too.</p>
          </div>
        </div>

        {/* PDF preview */}
        {pdfUrl && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPdfUrl(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5" /> {fileName}</h3>
                <div className="flex gap-2">
                  <button onClick={print} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50"><Printer className="w-4 h-4" /> Print</button>
                  <button onClick={() => window.open(pdfUrl, '_blank')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50"><ExternalLink className="w-4 h-4" /> Open</button>
                  <button onClick={download} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-black"><Download className="w-4 h-4" /> Download</button>
                  <button onClick={() => setPdfUrl(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <iframe id="station-pdf-frame" src={pdfUrl} title="Station list PDF" className="flex-1 w-full rounded-b-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
