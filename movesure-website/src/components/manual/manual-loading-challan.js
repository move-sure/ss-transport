'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Truck, Printer, Download, ChevronDown, Search, Package, FileText, RefreshCw, AlertCircle, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';

const ManualLoadingChallan = ({ userBranch, branches = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [challans, setChallans] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [transitBilties, setTransitBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [permanentDetails, setPermanentDetails] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [showChallanDropdown, setShowChallanDropdown] = useState(false);
  const [challanSearch, setChallanSearch] = useState('');
  const dropdownRef = useRef(null);

  // Load challans and cities when modal opens
  useEffect(() => {
    if (isOpen && userBranch?.id) {
      loadChallansAndCities();
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [isOpen, userBranch?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowChallanDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChallansAndCities = async () => {
    try {
      setLoading(true);
      setError(null);

      const [challansRes, citiesRes, permRes] = await Promise.all([
        supabase
          .from('challan_details')
          .select(`
            id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
            total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
            created_by, created_at, updated_at,
            truck:trucks(id, truck_number, truck_type),
            owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
            driver:staff!challan_details_driver_id_fkey(id, name, mobile_number, license_number)
          `)
          .eq('branch_id', userBranch.id)
          .eq('is_active', true)
          .order('is_dispatched', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        supabase
          .from('permanent_details')
          .select('*')
          .eq('branch_id', userBranch.id)
          .single()
      ]);

      if (challansRes.error) throw new Error('Error loading challans: ' + challansRes.error.message);
      
      setChallans(challansRes.data || []);
      setCities(citiesRes.data || []);
      setPermanentDetails(permRes.data || null);

      // Auto-select most recent non-dispatched challan
      const activeChallans = (challansRes.data || []).filter(c => !c.is_dispatched);
      if (activeChallans.length > 0) {
        handleChallanSelect(activeChallans[0], citiesRes.data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChallanSelect = async (challan, citiesData = null) => {
    setSelectedChallan(challan);
    setShowChallanDropdown(false);
    setChallanSearch('');
    await loadTransitBilties(challan.challan_no, citiesData || cities);
  };

  const loadTransitBilties = async (challanNo, citiesData) => {
    try {
      setTransitBilties([]);
      setPdfUrl(null);
      setLoadingPdf(true);

      // Get transit details
      const { data: transitData, error } = await supabase
        .from('transit_details')
        .select(`
          id, challan_no, gr_no, bilty_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, is_delivered_at_branch2,
          is_delivered_at_destination, created_at
        `)
        .eq('challan_no', challanNo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!transitData || transitData.length === 0) {
        setTransitBilties([]);
        setLoadingPdf(false);
        return;
      }

      const grNumbers = transitData.map(t => t.gr_no).filter(Boolean);

      // Fetch bilties from both tables
      const [regularRes, stationRes] = await Promise.all([
        grNumbers.length > 0
          ? supabase
              .from('bilty')
              .select(`
                id, gr_no, bilty_date, consignor_name, consignee_name,
                payment_mode, no_of_pkg, total, to_city_id, wt, rate,
                freight_amount, contain, e_way_bill, pvt_marks,
                consignor_gst, consignor_number, consignee_gst, consignee_number,
                transport_name, delivery_type, invoice_no, invoice_value,
                labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark
              `)
              .in('gr_no', grNumbers)
          : Promise.resolve({ data: [] }),
        grNumbers.length > 0
          ? supabase
              .from('station_bilty_summary')
              .select(`
                id, station, gr_no, consignor, consignee, contents,
                no_of_packets, weight, payment_status, amount, pvt_marks,
                e_way_bill, delivery_type, created_at
              `)
              .in('gr_no', grNumbers)
          : Promise.resolve({ data: [] })
      ]);

      const processed = [];
      const regularGRs = new Set();

      // Process regular bilties
      (regularRes.data || []).forEach(bilty => {
        regularGRs.add(bilty.gr_no);
        const transitRecord = transitData.find(t => t.gr_no === bilty.gr_no);
        const city = citiesData.find(c => c.id === bilty.to_city_id);
        processed.push({
          ...bilty,
          transit_id: transitRecord?.id,
          challan_no: transitRecord?.challan_no,
          to_city_name: city?.city_name || 'Unknown',
          to_city_code: city?.city_code || 'N/A',
          bilty_type: 'regular'
        });
      });

      // Process station bilties (skip duplicates)
      (stationRes.data || []).forEach(sb => {
        if (regularGRs.has(sb.gr_no)) return;
        const transitRecord = transitData.find(t => t.gr_no === sb.gr_no);
        const city = citiesData.find(c => c.city_code === sb.station);
        processed.push({
          ...sb,
          transit_id: transitRecord?.id,
          challan_no: transitRecord?.challan_no,
          bilty_date: sb.created_at,
          consignor_name: sb.consignor,
          consignee_name: sb.consignee,
          payment_mode: sb.payment_status,
          no_of_pkg: sb.no_of_packets,
          total: sb.amount,
          wt: sb.weight,
          contain: sb.contents,
          to_city_name: city?.city_name || sb.station,
          to_city_code: sb.station || 'N/A',
          bilty_type: 'station'
        });
      });

      // Sort by city alphabetically, then GR number
      processed.sort((a, b) => {
        const cityA = (a.to_city_name || '').toUpperCase();
        const cityB = (b.to_city_name || '').toUpperCase();
        if (cityA !== cityB) return cityA.localeCompare(cityB);
        return (a.gr_no || '').localeCompare(b.gr_no || '', undefined, { numeric: true });
      });

      setTransitBilties(processed);

      // Auto-generate PDF
      if (processed.length > 0) {
        await generatePDF(processed, challans.find(c => c.challan_no === challanNo) || selectedChallan);
      }
    } catch (err) {
      console.error('Error loading transit bilties:', err);
      setError('Error loading transit bilties: ' + err.message);
    } finally {
      setLoadingPdf(false);
    }
  };

  // ===== PDF GENERATION (same logic as ChallanPDFPreview) =====
  const generatePDF = async (biltiesData, challan) => {
    try {
      setLoadingPdf(true);
      const doc = generateLoadingChallanDoc(biltiesData, challan);
      const blob = doc.output('blob');
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Failed to generate PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const generateLoadingChallanDoc = (biltiesData, challan) => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 2;
    const columnGap = 0;
    const tableWidth = (pageWidth - (margin * 2) - columnGap) / 2;
    const itemsPerColumn = 20;
    const itemsPerPage = itemsPerColumn * 2;
    const rowHeight = 10;

    let currentPage = 1;

    const sortedData = [...biltiesData];
    const totalPackages = sortedData.reduce((sum, b) => sum + (b.no_of_pkg || 0), 0);
    const totalWeight = sortedData.reduce((sum, b) => sum + (parseFloat(b.wt) || 0), 0);

    for (let pageStart = 0; pageStart < sortedData.length; pageStart += itemsPerPage) {
      if (pageStart > 0) {
        doc.addPage();
        currentPage++;
      }

      const pageData = sortedData.slice(pageStart, pageStart + itemsPerPage);
      let startY;

      if (currentPage === 1) {
        // Title
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('LOADING CHALLAN', pageWidth / 2, 10, { align: 'center' });

        // Company
        if (permanentDetails) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(permanentDetails.transport_name || 'S. S. TRANSPORT CORPORATION', pageWidth / 2, 15, { align: 'center' });
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          if (permanentDetails.transport_address) {
            doc.text(permanentDetails.transport_address, pageWidth / 2, 19, { align: 'center' });
          }
        }

        // Right info
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`CHALLAN NO: ${challan?.challan_no || 'N/A'}`, pageWidth - margin, 10, { align: 'right' });
        doc.text(`DATE: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 14, { align: 'right' });
        doc.setFontSize(7);
        doc.text(`TOTAL PACKAGES: ${totalPackages}`, pageWidth - margin, 18, { align: 'right' });
        doc.text(`TOTAL WEIGHT: ${Math.round(totalWeight)} KG`, pageWidth - margin, 22, { align: 'right' });

        // Left info
        doc.setFontSize(7);
        doc.text(`TRUCK NO: ${challan?.truck?.truck_number || 'N/A'}`, margin, 10);
        doc.text(`DRIVER: ${challan?.driver?.name || 'N/A'}`, margin, 14);
        doc.text(`OWNER: ${challan?.owner?.name || 'N/A'}`, margin, 18);

        doc.setLineWidth(0.3);
        doc.line(margin, 25, pageWidth - margin, 25);
        startY = 30;
      } else {
        doc.setFontSize(8);
        doc.text(`Page ${currentPage}`, pageWidth - margin, 15, { align: 'right' });
        doc.text('LOADING CHALLAN (Continued)', pageWidth / 2, 15, { align: 'center' });
        startY = 25;
      }

      // Page number footer
      doc.setFontSize(8);
      doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

      const leftColumnData = pageData.slice(0, itemsPerColumn);
      const rightColumnData = pageData.slice(itemsPerColumn);

      // Draw both columns
      drawColumn(doc, margin, startY, leftColumnData, pageStart, tableWidth, rowHeight, itemsPerColumn);
      drawColumn(doc, margin + tableWidth + columnGap, startY, rightColumnData, pageStart + itemsPerColumn, tableWidth, rowHeight, itemsPerColumn);
    }

    // Summary at bottom of last page
    const lastY = pageHeight - 40;
    const totalEway = sortedData.reduce((t, b) => {
      if (b.e_way_bill && b.e_way_bill.toString().trim()) {
        return t + b.e_way_bill.split(',').filter(x => x.trim()).length;
      }
      return t;
    }, 0);
    const totalW = sortedData.reduce((t, b) => {
      if (b.bilty_type === 'station' && (!b.consignor_name || !b.consignee_name)) return t + 1;
      return t;
    }, 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', margin, lastY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Packages: ${totalPackages}`, margin, lastY + 6);
    doc.text(`Total Weight: ${Math.round(totalWeight)} KG`, margin, lastY + 12);
    doc.text(`Total E-way Bills: ${totalEway}`, margin, lastY + 18);
    doc.text(`Total W (Missing Info): ${totalW}`, margin, lastY + 24);
    doc.text('Authorized Signatory: ____________________', pageWidth - margin - 80, lastY + 6);

    return doc;
  };

  const drawColumn = (doc, startX, startY, data, serialOffset, tableWidth, rowHeight, maxRows) => {
    // Header
    doc.setFillColor(245, 245, 245);
    doc.rect(startX, startY - 6, tableWidth, 10, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('S.No', startX + 2, startY);
    doc.text('G.R.No', startX + 12, startY);
    doc.text('Pkg', startX + 28, startY);
    doc.text('Station', startX + 38, startY);
    doc.text('Pvt. Mark', startX + 62, startY);
    doc.text('Remark', startX + 90, startY);

    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.rect(startX, startY - 6, tableWidth, 10);
    // Vertical header lines
    [10, 26, 36, 60, 88].forEach(x => {
      doc.line(startX + x, startY - 6, startX + x, startY + 4);
    });

    let currentY = startY + 10;

    // Data rows
    data.forEach((bilty, index) => {
      const srNo = serialOffset + index + 1;
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(startX, currentY - 6, tableWidth, rowHeight, 'F');
      }
      doc.setTextColor(0, 0, 0);

      // S.No
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(srNo.toString(), startX + 2, currentY);

      // GR No
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(bilty.gr_no || '', startX + 12, currentY);

      // Pkg
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text((bilty.no_of_pkg || 0).toString(), startX + 28, currentY);

      // Station
      const stationCode = bilty.to_city_code || '';
      doc.setFontSize(stationCode.length > 6 ? 8 : 10);
      doc.setFont('helvetica', 'bold');
      doc.text(stationCode, startX + 38, currentY);

      // Pvt Mark
      let pvtMarkText = bilty.pvt_marks && bilty.pvt_marks.toString().trim()
        ? `${bilty.pvt_marks}/${bilty.no_of_pkg || 0}`
        : `/${bilty.no_of_pkg || 0}`;
      doc.setFontSize(pvtMarkText.length > 8 ? 8 : 10);
      doc.setFont('helvetica', 'bold');
      doc.text(pvtMarkText, startX + 62, currentY);

      // Remark (E-way / W)
      const hasEway = bilty.e_way_bill && bilty.e_way_bill.toString().trim();
      const missingInfo = bilty.bilty_type === 'station' && (!bilty.consignor_name || !bilty.consignee_name);
      if (hasEway && missingInfo) {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text('E,W', startX + 88, currentY);
      } else if (hasEway) {
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('E', startX + 90, currentY);
      } else if (missingInfo) {
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('W', startX + 90, currentY);
      }

      // Row borders
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(startX, currentY - 6, tableWidth, rowHeight);
      [10, 26, 36, 60, 88].forEach(x => {
        doc.line(startX + x, currentY - 6, startX + x, currentY + 4);
      });

      currentY += rowHeight;
    });

    // Empty rows
    const remaining = maxRows - data.length;
    for (let i = 0; i < remaining; i++) {
      if (i % 2 === (data.length % 2)) {
        doc.setFillColor(250, 250, 250);
        doc.rect(startX, currentY - 6, tableWidth, rowHeight, 'F');
      }
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(startX, currentY - 6, tableWidth, rowHeight);
      [10, 26, 36, 60, 88].forEach(x => {
        doc.line(startX + x, currentY - 6, startX + x, currentY + 4);
      });
      currentY += rowHeight;
    }
  };

  // Download
  const handleDownload = () => {
    if (!transitBilties.length || !selectedChallan) return;
    const doc = generateLoadingChallanDoc(transitBilties, selectedChallan);
    doc.save(`Loading_Challan_${selectedChallan.challan_no}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };

  // Print
  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedChallan(null);
    setTransitBilties([]);
    setChallanSearch('');
    setError(null);
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
  };

  // Filter challans by search
  const filteredChallans = challans.filter(c =>
    c.challan_no.toLowerCase().includes(challanSearch.toLowerCase()) ||
    (c.truck?.truck_number || '').toLowerCase().includes(challanSearch.toLowerCase()) ||
    (c.driver?.name || '').toLowerCase().includes(challanSearch.toLowerCase())
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        title="Print Loading Challan"
      >
        <Truck className="w-5 h-5" />
        <span className="hidden sm:inline">Loading Challan</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-full max-h-full flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Loading Challan</h2>
                  <p className="text-purple-200 text-xs">Select a challan to generate loading challan PDF</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Challan Selector */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowChallanDropdown(!showChallanDropdown)}
                    className="bg-white/15 border border-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-white/25 transition-all min-w-[200px] justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {selectedChallan
                          ? `${selectedChallan.challan_no} ${selectedChallan.is_dispatched ? '✓' : ''}`
                          : 'Select Challan'}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showChallanDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showChallanDropdown && (
                    <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden">
                      <div className="p-2 border-b bg-gray-50">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={challanSearch}
                            onChange={(e) => setChallanSearch(e.target.value)}
                            placeholder="Search challan, truck, driver..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 focus:border-purple-400 focus:ring-0 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                            Loading challans...
                          </div>
                        ) : filteredChallans.length > 0 ? (
                          filteredChallans.map(challan => (
                            <button
                              key={challan.id}
                              onClick={() => handleChallanSelect(challan)}
                              className={`w-full text-left px-3 py-3 hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-0 ${
                                selectedChallan?.id === challan.id ? 'bg-purple-100 border-l-4 border-l-purple-500' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    {challan.challan_no}
                                    {selectedChallan?.id === challan.id && <Check className="w-4 h-4 text-purple-600" />}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    🚛 {challan.truck?.truck_number || 'No Truck'} • 👤 {challan.driver?.name || 'No Driver'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    📅 {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : 'N/A'} • {challan.total_bilty_count || 0} bilties
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                                  challan.is_dispatched
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                  {challan.is_dispatched ? 'DISPATCHED' : 'ACTIVE'}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No challans found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {pdfUrl && (
                  <>
                    <button
                      onClick={handlePrint}
                      className="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-white/25 transition-all"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={handleDownload}
                      className="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-white/25 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </>
                )}

                {/* Refresh */}
                <button
                  onClick={loadChallansAndCities}
                  className="bg-white/15 border border-white/30 text-white p-2 rounded-xl hover:bg-white/25 transition-all"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* Close */}
                <button
                  onClick={handleClose}
                  className="bg-white/15 border border-white/30 text-white p-2 rounded-xl hover:bg-red-500/80 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selected Challan Info Bar */}
            {selectedChallan && (
              <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-purple-700">Challan:</span>
                  <span className="font-semibold text-gray-800">{selectedChallan.challan_no}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-purple-700">Truck:</span>
                  <span className="text-gray-800">{selectedChallan.truck?.truck_number || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-purple-700">Driver:</span>
                  <span className="text-gray-800">{selectedChallan.driver?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-purple-700">Owner:</span>
                  <span className="text-gray-800">{selectedChallan.owner?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-purple-700">{transitBilties.length} bilties loaded</span>
                </div>
                {transitBilties.length > 0 && (
                  <>
                    <div className="text-gray-600">
                      📦 {transitBilties.reduce((s, b) => s + (b.no_of_pkg || 0), 0)} pkgs
                    </div>
                    <div className="text-gray-600">
                      ⚖️ {Math.round(transitBilties.reduce((s, b) => s + (parseFloat(b.wt) || 0), 0))} KG
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PDF Preview Area */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Loading challans...</p>
                  </div>
                </div>
              ) : loadingPdf ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Generating PDF...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-600 font-medium mb-2">Error</p>
                    <p className="text-gray-600 text-sm">{error}</p>
                    <button
                      onClick={loadChallansAndCities}
                      className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : !selectedChallan ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">Select a Challan</p>
                    <p className="text-gray-400 text-sm mt-1">Choose a challan from the dropdown to preview its loading challan</p>
                  </div>
                </div>
              ) : transitBilties.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">No Bilties in Challan</p>
                    <p className="text-gray-400 text-sm mt-1">This challan has no transit bilties yet</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="Loading Challan PDF Preview"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManualLoadingChallan;
