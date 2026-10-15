'use client';

import { useState, useEffect, useRef } from 'react';
import { Tags, PackageMinus, Wallet, Users, ChevronDown } from 'lucide-react';
import { biltyGroupsApi } from './station-bilty-api';
import SmallBiltiesSection from './small-bilties-section';

// Cached across form opens; refreshed each time the picker mounts
let groupsCache = null;

// Searchable group picker. Options come from the active groups in Settings -> Groups.
// Value is the group id; `fallbackLabel` (group_ref) shows a deactivated group that is still selected.
const GroupSelect = ({ value, fallbackLabel, onChange, inputRef }) => {
  const [groups, setGroups] = useState(groupsCache || []);
  const [loading, setLoading] = useState(!groupsCache);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    biltyGroupsApi.list()
      .then(data => {
        groupsCache = data;
        if (!cancelled) { setGroups(data); setLoadError(''); }
      })
      .catch(err => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selected = groups.find(g => g.id === value);
  const selectedLabel = selected?.name || (value ? fallbackLabel : '') || '';
  const isInactiveSelection = value && !selected && fallbackLabel;

  const q = query.trim().toUpperCase();
  const filtered = groups.filter(g => !q || g.name.includes(q) || g.description?.toUpperCase().includes(q));
  // index 0 = "No group"
  const options = [{ id: null, name: 'No group' }, ...filtered];

  const pick = (opt) => {
    onChange(opt.id, opt.id ? opt.name : '');
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setHighlight(0); return; }
      setHighlight(h => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      // Never submit the bilty form from here
      e.preventDefault();
      if (open && options[highlight]) pick(options[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Tab') {
      // Typed a search and tabbed away -> take the highlighted match
      if (open && q && options[highlight]) pick(options[highlight]);
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(e.target.value.trim() ? 1 : 0); }}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onKeyDown={onKeyDown}
        placeholder={open ? (selectedLabel || 'Search group...') : 'No group (optional)'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black bg-white uppercase font-semibold"
        data-tab-target="group_ref"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-gray-500">Loading groups...</div>}
          {loadError && <div className="px-3 py-2 text-xs text-red-600">Could not load groups: {loadError}</div>}
          {options.map((opt, idx) => (
            <button
              key={opt.id || 'none'}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
              onMouseEnter={() => setHighlight(idx)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between border-b border-gray-100 ${
                idx === highlight ? 'bg-indigo-100' : ''
              } ${opt.id === (value || null) ? 'font-bold' : ''}`}
            >
              <span className={opt.id ? 'text-gray-800 font-semibold' : 'text-gray-500 italic'}>{opt.name}</span>
            </button>
          ))}
          {!loading && !loadError && filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">
              {groups.length === 0 ? 'No groups yet - create them in Bilty Settings → Groups' : `No group matches "${query}"`}
            </div>
          )}
        </div>
      )}
      {isInactiveSelection && !open && (
        <p className="text-xs text-amber-600 mt-1">This group is deactivated - it stays on this bilty.</p>
      )}
    </div>
  );
};

/**
 * Rarely used manual bilty options - group, short pkgs, advance and small bilties -
 * in one collapsed "More options" panel. Group / short / advance live in formData and are
 * saved through PATCH /meta after the bilty is saved; small bilties are handled by SmallBiltiesSection.
 */
const BiltyExtrasSection = ({ formData, setFormData, groupInputRef, open, onToggle, editingId, currentUserId }) => {
  const [smallCount, setSmallCount] = useState(0);
  const packets = parseInt(formData.no_of_packets) || 0;
  const shortCount = parseInt(formData.short_packages_count) || 0;
  const shortInvalid = shortCount < 0 || shortCount > packets;

  const amount = parseFloat(formData.amount) || 0;
  const advance = parseFloat(formData.advance_amount) || 0;
  const remaining = amount - advance;
  const advanceInvalid = formData.is_advance_bilty && (advance < 0 || advance > amount);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const blockEnter = (e) => { if (e.key === 'Enter') e.preventDefault(); };

  // Chips on the collapsed header so set values are never hidden
  const chips = [
    formData.group_id && { label: formData.group_ref || 'Group', cls: 'bg-indigo-100 text-indigo-700' },
    shortCount > 0 && { label: `${shortCount} short`, cls: 'bg-red-100 text-red-700' },
    formData.is_advance_bilty && { label: `Advance ₹${advance.toLocaleString('en-IN')}`, cls: 'bg-amber-100 text-amber-800' },
    smallCount > 0 && { label: `${smallCount} small bilt${smallCount === 1 ? 'y' : 'ies'}`, cls: 'bg-teal-100 text-teal-700' }
  ].filter(Boolean);

  return (
    <div className={`border rounded-lg ${open ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        data-tab-target="more_options"
      >
        <span className="flex items-center gap-2 flex-wrap">
          <Tags className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-800">More options</span>
          <span className="text-xs text-gray-500">Group · Short Pkgs · Advance · Small Bilties</span>
          {chips.map(chip => (
            <span key={chip.label} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
          ))}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Kept mounted while collapsed so small bilties still load and the header count stays right */}
      <div className={open ? 'px-4 pb-4 space-y-4' : 'hidden'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Group */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Users className="w-4 h-4 text-indigo-500" /> Group
          </label>
          <GroupSelect
            value={formData.group_id}
            fallbackLabel={formData.group_ref}
            onChange={(id, name) => setFormData(prev => ({ ...prev, group_id: id, group_ref: name }))}
            inputRef={groupInputRef}
          />
          <p className="text-xs text-gray-500 mt-1">Parties with different names can share one group.</p>
        </div>

        {/* Short packages */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <PackageMinus className="w-4 h-4 text-indigo-500" /> Short Pkgs
          </label>
          <input
            type="number"
            min="0"
            max={packets}
            value={formData.short_packages_count ?? 0}
            onChange={(e) => set('short_packages_count', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            onKeyDown={blockEnter}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-black bg-white ${
              shortInvalid ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            data-tab-target="short_packages_count"
          />
          <p className={`text-xs mt-1 ${shortInvalid ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {shortInvalid ? `Must be between 0 and ${packets} (bags)` : `Missing packages out of ${packets} bags`}
          </p>
        </div>

        {/* Advance */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Wallet className="w-4 h-4 text-indigo-500" /> Advance
          </label>
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!formData.is_advance_bilty}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                is_advance_bilty: e.target.checked,
                advance_amount: e.target.checked ? prev.advance_amount : ''
              }))}
              onKeyDown={blockEnter}
              className="w-4 h-4 accent-indigo-600"
              data-tab-target="is_advance_bilty"
            />
            <span className="text-sm font-medium text-gray-800">Advance bilty</span>
          </label>
        </div>
      </div>

      {formData.is_advance_bilty && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-indigo-200 rounded-lg p-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Advance Received (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.advance_amount ?? ''}
              onChange={(e) => set('advance_amount', e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={blockEnter}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-black bg-white ${
                advanceInvalid ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              placeholder="0"
              data-tab-target="advance_amount"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Freight</div>
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">
              ₹{amount.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Remaining</div>
            <div className={`px-3 py-2 rounded-lg border text-sm font-bold ${
              remaining < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              ₹{remaining.toLocaleString('en-IN')}
            </div>
          </div>
          {advanceInvalid && (
            <p className="md:col-span-3 text-xs text-red-600 font-medium">Advance can&apos;t be more than the freight amount.</p>
          )}
        </div>
      )}

      <SmallBiltiesSection
        biltyId={editingId}
        pendingItems={formData.small_bilties}
        onPendingChange={(items) => setFormData(prev => ({ ...prev, small_bilties: items }))}
        mainPackets={formData.no_of_packets}
        currentUserId={currentUserId}
        onCountChange={setSmallCount}
      />
      </div>
    </div>
  );
};

export default BiltyExtrasSection;
