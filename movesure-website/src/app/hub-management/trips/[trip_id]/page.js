'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../utils/auth';
import Navbar from '../../../../components/dashboard/navbar';
import { AlertCircle, RefreshCw, ArrowLeft, Loader2, FileText } from 'lucide-react';

import { useTripData }       from '../../../../components/hub-management/trip/useTripData';
import TripPageHeader        from '../../../../components/hub-management/trip/TripPageHeader';
import TripInfoBar           from '../../../../components/hub-management/trip/TripInfoBar';
import TripTransportBar      from '../../../../components/hub-management/trip/TripTransportBar';
import TripBiltyTable        from '../../../../components/hub-management/trip/TripBiltyTable';

import KaatModal             from '../../../../components/hub-management/KaatModal';
import ImagePreviewModal     from '../../../../components/hub-management/ImagePreviewModal';
import AddTransportModal     from '../../../../components/hub-management/AddTransportModal';
import AddHubRateModal       from '../../../../components/hub-management/AddHubRateModal';
import CrossChallanPrintModal, { useCrossChallanPrint } from '../../../../components/transit-finance/pohonch-print/CrossChallanPrintModal';
import { generatePohonchPDF } from '../../../../components/transit-finance/pohonch-print/pohonch-pdf-generator';
import BulkCrossChallanModal from '../../../../components/hub-management/BulkCrossChallanModal';
import CrossChallanManagement from '../../../../components/hub-management/CrossChallanManagement';

export default function TripDetailPage() {
  const { trip_id } = useParams();
  const router      = useRouter();
  const { user, token } = useAuth();

  const d = useTripData(trip_id, user, token);
  const crossChallanPrint = useCrossChallanPrint();

  /* ── Loading ── */
  if (d.loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-gray-500 text-sm">Loading trip bilties...</p>
        </div>
      </div>
    </div>
  );

  /* ── Error ── */
  if (d.error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-4">{d.error}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push('/hub-management')} className="px-4 py-2 bg-white border rounded-xl text-xs">
              <ArrowLeft className="h-3 w-3 inline mr-1" />Back
            </button>
            <button onClick={d.fetchAll} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs">
              <RefreshCw className="h-3 w-3 inline mr-1" />Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      <TripPageHeader
        trip={d.trip}
        enrichedBilties={d.enrichedBilties}
        loading={d.loading}
        onRefresh={d.fetchAll}
        onBulkCrossModal={() => d.setShowBulkCrossModal(true)}
        router={router}
      />

      <div className="max-w-[1800px] mx-auto px-3 sm:px-5 py-4 space-y-4">

        <TripInfoBar
          trip={d.trip}
          stats={d.stats}
          kanpurCount={d.kanpurCount}
          router={router}
        />

        <TripTransportBar
          stats={d.stats}
          enrichedBiltiesCount={d.enrichedBilties.length}
          applyingHubRates={d.applyingHubRates}
          autoAssigning={d.autoAssigning}
          onBulkApplyHubRates={d.bulkApplyHubRates}
          onAutoAssign={d.autoAssignTransports}
        />

        <CrossChallanManagement
          challanNo={d.trip?.trip_no}
          enrichedBilties={d.enrichedBilties}
          transports={d.transports}
          token={token}
          user={user}
          onRefreshCrossMap={() => {
            const grNos = d.enrichedBilties.map(b => b.gr_no).filter(Boolean);
            if (grNos.length) d.refreshCrossMap(grNos);
          }}
        />

        <TripBiltyTable
          displayed={d.displayed}
          enrichedBilties={d.enrichedBilties}
          footerTotals={d.footerTotals}
          kaatData={d.kaatData}
          selectedGrs={d.selectedGrs}
          toggleSelectAll={d.toggleSelectAll}
          toggleSelect={d.toggleSelect}
          bulkLoading={d.bulkLoading}
          kanpurFilter={d.kanpurFilter}
          setKanpurFilter={d.setKanpurFilter}
          loadingKanpur={d.loadingKanpur}
          kanpurCount={d.kanpurCount}
          kanpurGrNos={d.kanpurGrNos}
          grSearch={d.grSearch}
          setGrSearch={d.setGrSearch}
          citySearch={d.citySearch}
          setCitySearch={d.setCitySearch}
          transportSearch={d.transportSearch}
          setTransportSearch={d.setTransportSearch}
          uniqueCities={d.uniqueCities}
          uniqueTransports={d.uniqueTransports}
          transportsByCity={d.transportsByCity}
          savingTransport={d.savingTransport}
          updatingTransit={d.updatingTransit}
          crossChallanMap={d.crossChallanMap}
          crossChallanPrint={crossChallanPrint}
          userName={d.userName}
          podGrNos={d.podGrNos}
          onTransportChange={d.handleTransportChange}
          onOpenKaat={d.openKaatModal}
          onOpenAddTransport={d.openAddTransportModal}
          setPreviewImage={d.setPreviewImage}
          onDeliveredAtBranch2={d.handleDeliveredAtBranch2}
          onOutFromBranch2={d.handleOutFromBranch2}
          onDeliveredAtDestination={d.handleDeliveredAtDestination}
          onBulkAction={d.bulkAction}
          onPrintCrossChallan={d.handlePrintCrossChallan}
          ccGenerating={d.ccGenerating}
          onShowBulkPohonch={() => d.setShowBulkPohonch(true)}
        />
      </div>

      {/* ── MODALS ── */}

      {d.editingKaat && (
        <KaatModal
          isOpen={!!d.editingKaat}
          grNo={d.editingKaat}
          kaatForm={d.kaatForm}
          setKaatForm={d.setKaatForm}
          onSave={d.saveKaatForm}
          onClose={() => d.setEditingKaat(null)}
          saving={d.savingKaat}
          cityTransports={(() => {
            const bi = d.enrichedBilties.find(b => b.gr_no === d.editingKaat);
            return bi?.to_city_id ? (d.transportsByCity[bi.to_city_id] || []) : [];
          })()}
          onOpenAddTransport={d.openAddTransportModal}
          onOpenAddHubRate={d.openAddHubRateModal}
          hubRatesByTransport={d.hubRatesByTransport}
          enrichedBilty={d.enrichedBilties.find(b => b.gr_no === d.editingKaat)}
        />
      )}

      {d.previewImage && (
        <ImagePreviewModal image={d.previewImage} onClose={() => d.setPreviewImage(null)} />
      )}

      {d.showAddTransport && (
        <AddTransportModal
          isOpen={d.showAddTransport}
          form={d.addTransportForm}
          setForm={d.setAddTransportForm}
          onSave={d.saveNewTransport}
          onClose={() => d.setShowAddTransport(false)}
          saving={d.savingNewTransport}
          cities={d.cities}
        />
      )}

      {d.showAddHubRate && (
        <AddHubRateModal
          isOpen={d.showAddHubRate}
          form={d.addHubRateForm}
          setForm={d.setAddHubRateForm}
          onSave={d.saveNewHubRate}
          onClose={() => d.setShowAddHubRate(false)}
          saving={d.savingNewHubRate}
          transports={d.transports}
          cities={d.cities}
        />
      )}

      {d.showBulkPohonch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => d.setShowBulkPohonch(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Assign Pohonch Number</h3>
            <p className="text-xs text-gray-500 mb-3">Assign to <strong>{d.selectedGrs.size}</strong> selected GR{d.selectedGrs.size > 1 ? 's' : ''}</p>
            <input
              type="text"
              placeholder="Enter pohonch number..."
              value={d.bulkPohonchNo}
              onChange={e => d.setBulkPohonchNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => d.setShowBulkPohonch(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={d.bulkAssignPohonch} disabled={d.savingBulkPohonch || !d.bulkPohonchNo.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {d.savingBulkPohonch ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {d.ccPdfUrl && (
        <CrossChallanPrintModal
          pdfUrl={d.ccPdfUrl}
          transport={d.ccPdfTransport}
          bilties={d.ccPdfBilties}
          savedPohonch={d.ccSavedPohonch}
          saving={d.ccSaving}
          onClose={d.closeCcPreview}
          onDownload={() => {
            if (d.ccPdfTransport && d.ccPdfBilties.length)
              generatePohonchPDF(d.ccPdfBilties, d.ccPdfTransport, false, d.ccSavedPohonch || '');
          }}
        />
      )}

      {d.showBulkCrossModal && (
        <BulkCrossChallanModal
          isOpen={d.showBulkCrossModal}
          onClose={() => d.setShowBulkCrossModal(false)}
          enrichedBilties={d.enrichedBilties}
          kaatData={d.kaatData}
          transportsByCity={d.transportsByCity}
          transports={d.transports}
          challan={{ challan_no: d.trip?.trip_no }}
          user={user}
          buildCcPdfBilties={d.buildCcPdfBilties}
          fetchCrossChallanData={() => {
            const grNos = d.enrichedBilties.map(b => b.gr_no).filter(Boolean);
            if (grNos.length) d.refreshCrossMap(grNos);
          }}
        />
      )}
    </div>
  );
}
