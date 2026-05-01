'use client';
import { Truck, Hash, Search, Check, X, ChevronDown, Loader2, Plus, FileText } from 'lucide-react';

export default function SearchPanel({
  searchMode, setSearchMode,
  // transport
  transportSearch, handleTransportSearchChange, selectedTransport, handleSelectTransport,
  showSuggestions, setShowSuggestions, transportSuggestions,
  // city
  citySearch, handleCitySearchChange, selectedCity, handleSelectCity,
  showCitySuggestions, setShowCitySuggestions, citySuggestions, setSelectedCity, setCitySearch,
  // challans
  challanSearchText, setChallanSearchText, fetchChallanSuggestions,
  showChallanSuggestions, setShowChallanSuggestions, challanSuggestions,
  selectedChallans, addChallan, removeChallan, setSelectedChallans,
  // range
  fromChallan, setFromChallan, toChallan, setToChallan,
  // actions
  handleSearchBilties, handleClearSbSearch, sbLoading,
  // gr search
  grSearchInput, setGrSearchInput, grNosToSearch, addGrToSearch, removeGrFromSearch, handleSearchByGrNos,
  // pohonch search
  pohonchSearch, setPohonchSearch, handleSearchByPohonch,
  pohonchTransports, onSelectPohonchTransport,
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      {/* Mode Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setSearchMode('transport')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            searchMode === 'transport' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Truck className="w-4 h-4" /> By Transport
        </button>
        <button
          onClick={() => setSearchMode('gr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            searchMode === 'gr' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Hash className="w-4 h-4" /> By GR No.
        </button>
        <button
          onClick={() => setSearchMode('pohonch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            searchMode === 'pohonch' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" /> By Pohonch / Bilty No.
        </button>
      </div>

      {/* ── Transport Search Panel ── */}
      {searchMode === 'transport' && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {/* Transport */}
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Transport Name / GST</label>
            <input
              type="text"
              value={transportSearch}
              onChange={(e) => handleTransportSearchChange(e.target.value)}
              onFocus={() => transportSuggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && selectedTransport && handleSearchBilties()}
              placeholder="Type transport name or GST..."
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                selectedTransport ? 'border-teal-400 bg-teal-50' : 'border-teal-200 bg-teal-50/30'
              }`}
            />
            {selectedTransport && (
              <div className="mt-1 text-xs text-teal-700 font-medium">
                <Check className="w-3 h-3 inline mr-1" />
                {selectedTransport.transport_name} {selectedTransport.gst_number ? `| GST: ${selectedTransport.gst_number}` : ''}
              </div>
            )}
            {showSuggestions && transportSuggestions.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {transportSuggestions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTransport(t)}
                    className={`w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${
                      selectedTransport?.id === t.id ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="font-semibold text-sm text-gray-800">{t.transport_name}</div>
                    <div className="text-xs text-gray-500">
                      {t.gst_number && <span className="mr-2">GST: {t.gst_number}</span>}
                      {t.mob_number && <span>Mob: {t.mob_number}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination City */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Destination City</label>
            <input
              type="text"
              value={citySearch}
              onChange={(e) => handleCitySearchChange(e.target.value)}
              onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()}
              placeholder="Type city name..."
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                selectedCity ? 'border-teal-400 bg-teal-50' : 'border-teal-200 bg-teal-50/30'
              }`}
            />
            {selectedCity && (
              <div className="mt-1 text-xs text-teal-700 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />{selectedCity.city_name}
                <button onClick={() => { setSelectedCity(null); setCitySearch(''); }} className="ml-1 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              </div>
            )}
            {showCitySuggestions && citySuggestions.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {citySuggestions.map((c) => (
                  <button key={c.id} onClick={() => handleSelectCity(c)} className={`w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${selectedCity?.id === c.id ? 'bg-teal-50' : ''}`}>
                    <div className="font-semibold text-sm text-gray-800">{c.city_name}</div>
                    {c.city_code && <div className="text-xs text-gray-500">Code: {c.city_code}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multi Challan */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Select Challans (optional)</label>
            <input
              type="text"
              value={challanSearchText}
              onChange={(e) => { setChallanSearchText(e.target.value); fetchChallanSuggestions(e.target.value); }}
              onFocus={() => { if (challanSuggestions.length > 0) setShowChallanSuggestions(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (challanSuggestions.length > 0) addChallan(challanSuggestions[0]);
                  else handleSearchBilties();
                }
                if (e.key === 'Backspace' && challanSearchText === '' && selectedChallans.length > 0) {
                  removeChallan(selectedChallans[selectedChallans.length - 1]);
                }
              }}
              placeholder={selectedChallans.length > 0 ? 'Add more...' : 'Type challan no...'}
              className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm"
            />
            {showChallanSuggestions && challanSuggestions.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {challanSuggestions.map((c) => (
                  <button key={c} onClick={() => addChallan(c)} className="w-full text-left px-3 py-1.5 hover:bg-teal-50 text-sm font-mono text-gray-900 font-semibold border-b border-gray-50 last:border-0 flex items-center gap-2">
                    <Hash className="w-3 h-3 text-teal-500" /> {c}
                  </button>
                ))}
              </div>
            )}
            {selectedChallans.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {selectedChallans.map(c => (
                  <span key={c} className="inline-flex items-center gap-0.5 bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {c}
                    <button onClick={() => removeChallan(c)} className="ml-0.5 hover:text-red-600 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {selectedChallans.length > 1 && (
                  <button onClick={() => setSelectedChallans([])} className="text-xs text-red-500 hover:text-red-700 font-medium px-1">Clear all</button>
                )}
              </div>
            )}
          </div>

          {/* Challan Range */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Challan Range</label>
            <div className="flex gap-1">
              <input type="text" value={fromChallan} onChange={(e) => setFromChallan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()} placeholder="From" className="w-1/2 px-2 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm" />
              <input type="text" value={toChallan} onChange={(e) => setToChallan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()} placeholder="To" className="w-1/2 px-2 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm" />
            </div>
            {(fromChallan || toChallan) && (
              <div className="mt-1 text-xs text-teal-700 font-medium">Range: {fromChallan || '...'} → {toChallan || '...'}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSearchBilties}
              disabled={(!selectedTransport && selectedChallans.length === 0 && !fromChallan && !toChallan) || sbLoading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {sbLoading ? 'Searching...' : 'Search'}
            </button>
            {(transportSearch || selectedChallans.length > 0 || selectedCity || fromChallan || toChallan) && (
              <button onClick={handleClearSbSearch} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors" title="Clear">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── GR No. Search Panel ── */}
      {searchMode === 'gr' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Enter GR Numbers <span className="text-gray-400 font-normal normal-case">(Enter or comma to add each)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={grSearchInput}
                onChange={(e) => setGrSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (grSearchInput.trim()) addGrToSearch(grSearchInput); }
                  if (e.key === 'Backspace' && grSearchInput === '' && grNosToSearch.length > 0) removeGrFromSearch(grNosToSearch[grNosToSearch.length - 1]);
                }}
                onBlur={() => { if (grSearchInput.trim()) addGrToSearch(grSearchInput); }}
                placeholder="e.g. GR001, GR002 or paste space-separated..."
                className="flex-1 px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50/30 font-mono text-sm"
              />
              <button onClick={handleSearchByGrNos} disabled={grNosToSearch.length === 0 || sbLoading} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {sbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {sbLoading ? 'Searching...' : 'Search'}
              </button>
              {grNosToSearch.length > 0 && (
                <button onClick={handleClearSbSearch} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors" title="Clear all"><X className="w-4 h-4" /></button>
              )}
            </div>
            {grNosToSearch.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {grNosToSearch.map(gr => (
                  <span key={gr} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-semibold font-mono px-2 py-0.5 rounded-full">
                    {gr}
                    <button onClick={() => removeGrFromSearch(gr)} className="ml-0.5 hover:text-red-600 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <span className="text-xs text-gray-400 self-center">{grNosToSearch.length} GR{grNosToSearch.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">Transport is auto-detected from results. You can clear it to override manually.</p>
        </div>
      )}

      {/* ── Pohonch / Bilty No. Search Panel ── */}
      {searchMode === 'pohonch' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Pohonch / Bilty Number <span className="text-gray-400 font-normal normal-case">(e.g. NIE0001 or partial match)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pohonchSearch}
                onChange={(e) => setPohonchSearch(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && pohonchSearch.trim() && handleSearchByPohonch()}
                placeholder="Type pohonch number or bilty no..."
                className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 font-mono text-sm tracking-widest"
              />
              <button onClick={handleSearchByPohonch} disabled={!pohonchSearch.trim() || sbLoading} className="px-5 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {sbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {sbLoading ? 'Searching...' : 'Search'}
              </button>
              {pohonchSearch && (
                <button onClick={handleClearSbSearch} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors" title="Clear"><X className="w-4 h-4" /></button>
              )}
            </div>
          </div>

          {/* Transport picker shown when results have multiple transports */}
          {pohonchTransports?.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                  {pohonchTransports.length === 1 ? 'Transport Detected' : `${pohonchTransports.length} Transports Found — Select one to create Pohonch for:`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pohonchTransports.map((t) => {
                  const isSelected = selectedTransport?.id === t.id ||
                    (selectedTransport?.gst_number && selectedTransport.gst_number === t.gst_number);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectPohonchTransport(t)}
                      className={`flex flex-col items-start px-3 py-2 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-100 shadow-md'
                          : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-600" />}
                        <span className="text-sm font-bold text-gray-800">{t.transport_name}</span>
                      </div>
                      {t.gst_number && <span className="text-xs text-gray-500 font-mono mt-0.5">GST: {t.gst_number}</span>}
                      {t.mob_number && <span className="text-xs text-gray-400">{t.mob_number}</span>}
                    </button>
                  );
                })}
              </div>
              {selectedTransport && (
                <p className="text-xs text-purple-600 font-medium mt-2">
                  <Check className="w-3 h-3 inline mr-1" />
                  Creating pohonch for: <strong>{selectedTransport.transport_name}</strong>
                  {selectedTransport.gst_number ? ` (GST: ${selectedTransport.gst_number})` : ''}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">Shows all bilties linked to a pohonch number or bilty number. Use partial match (e.g. "NIE" to see all NIE pohonch).</p>
        </div>
      )}
    </div>
  );
}
