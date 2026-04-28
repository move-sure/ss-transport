'use client';
import { useState, useEffect } from 'react';
import { X, Zap, Check, Hash, AlertCircle, Loader2 } from 'lucide-react';
import supabase from '../../../app/utils/supabase';

export default function CreatePohonchModal({
  show, onClose,
  selectedTransport,
  selectedGrNos, sbBilties,
  token, user,
  createPrefix, setCreatePrefix,
  creating, createResult,
  onCreatePohonch,
}) {
  const [previewNo, setPreviewNo] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!show || !createPrefix.trim()) { setPreviewNo(''); return; }
    let cancelled = false;
    const run = async () => {
      setPreviewLoading(true);
      try {
        const { data } = await supabase
          .from('pohonch')
          .select('pohonch_number')
          .ilike('pohonch_number', `${createPrefix.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(50);
        if (cancelled) return;
        const nums = (data || [])
          .map(p => { const m = p.pohonch_number.match(/^([A-Za-z]+)(\d+)$/); return m && m[1].toUpperCase() === createPrefix.trim().toUpperCase() ? parseInt(m[2], 10) : 0; })
          .filter(n => n > 0);
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        if (!cancelled) setPreviewNo(`${createPrefix.trim().toUpperCase()}${String(next).padStart(4, '0')}`);
      } catch (e) {
        if (!cancelled) setPreviewNo('');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [show, createPrefix]);

  if (!show) return null;

  const challanNos = [...new Set(
    [...selectedGrNos].map(gr => sbBilties.find(k => k.gr_no === gr)?.challan_no).filter(Boolean)
  )];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Create Pohonch</h3>
              <p className="text-xs text-gray-500">via API · {selectedGrNos.size} GRs selected</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Transport Info */}
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">Transport</div>
            <div className="font-bold text-gray-800">{selectedTransport?.transport_name}</div>
            {selectedTransport?.gst_number && <div className="text-xs text-gray-500 mt-0.5">GST: {selectedTransport.gst_number}</div>}
          </div>

          {/* Selected GRs */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Selected GRs ({selectedGrNos.size})</div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 max-h-36 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {[...selectedGrNos].map(gr => (
                  <span key={gr} className="inline-flex items-center bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full font-mono">
                    {gr}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Challans */}
          {challanNos.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Challans</div>
              <div className="flex flex-wrap gap-1.5">
                {challanNos.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <Hash className="w-2.5 h-2.5" />{c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional Prefix */}
          {!createResult && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Pohonch Prefix <span className="text-gray-400 font-normal normal-case">(optional — leave blank for auto)</span>
              </label>
              <input
                type="text"
                value={createPrefix}
                onChange={(e) => setCreatePrefix(e.target.value.toUpperCase())}
                placeholder="e.g. NIE, DP, ABC"
                maxLength={6}
                className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50/30 font-mono text-sm tracking-widest"
              />
              <p className="text-[10px] text-gray-400 mt-1">If blank, prefix will be auto-generated from transport name + GST.</p>

              {/* Next Pohonch Number Preview */}
              {createPrefix.trim() && (
                <div className="mt-3 flex items-center gap-3 bg-indigo-600 rounded-xl px-4 py-3">
                  <div className="flex-1">
                    <p className="text-xs text-indigo-200 font-medium mb-0.5">Next Pohonch Number</p>
                    {previewLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="text-indigo-200 text-sm">Calculating...</span>
                      </div>
                    ) : previewNo ? (
                      <p className="text-2xl font-extrabold text-white font-mono tracking-widest">{previewNo}</p>
                    ) : (
                      <p className="text-indigo-300 text-sm">—</p>
                    )}
                  </div>
                  <Hash className="w-8 h-8 text-indigo-300 opacity-50" />
                </div>
              )}
            </div>
          )}

          {/* Success Result */}
          {createResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                <Check className="w-6 h-6" /> Pohonch Created!
              </div>
              <div className="bg-white rounded-lg border border-green-200 px-4 py-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Pohonch Number</div>
                <div className="text-2xl font-extrabold text-indigo-700 font-mono tracking-widest">{createResult.pohonch_number}</div>
              </div>
              {createResult.warnings?.unmatched_gr_nos?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-yellow-700 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Unmatched GRs (not found in DB)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {createResult.warnings.unmatched_gr_nos.map(gr => (
                      <span key={gr} className="bg-yellow-100 text-yellow-800 text-xs font-mono px-1.5 py-0.5 rounded">{gr}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          {!createResult ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={onCreatePohonch}
                disabled={creating || selectedGrNos.size === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create Pohonch'}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
              <Check className="w-4 h-4" /> Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
