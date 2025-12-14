'use client';

import { useState, useCallback, useEffect } from 'react';

// Storage key for selected bilties
const STORAGE_KEY = 'ledger_selected_bilties';

export default function useBiltySelection() {
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [selectedBiltiesData, setSelectedBiltiesData] = useState([]);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setSelectedBiltiesData(data);
        setSelectedBilties(data.map(b => `${b.type}-${b.id}`));
      }
    } catch (err) {
      console.error('Error loading selected bilties:', err);
    }
  }, []);

  // Save to localStorage whenever selection changes
  const saveToStorage = useCallback((data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  }, []);

  const handleSelectBilty = useCallback((bilty) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    
    setSelectedBilties(prev => {
      const newKeys = prev.includes(biltyKey) 
        ? prev.filter(key => key !== biltyKey)
        : [...prev, biltyKey];
      return newKeys;
    });
    
    setSelectedBiltiesData(prev => {
      const exists = prev.some(b => b.type === bilty.type && b.id === bilty.id);
      const newData = exists 
        ? prev.filter(b => !(b.type === bilty.type && b.id === bilty.id))
        : [...prev, bilty];
      saveToStorage(newData);
      return newData;
    });
  }, [saveToStorage]);

  const handleSelectAll = useCallback((pageData, allSelected) => {
    if (allSelected) {
      const pageKeys = pageData.map(b => `${b.type}-${b.id}`);
      setSelectedBilties(prev => prev.filter(key => !pageKeys.includes(key)));
      setSelectedBiltiesData(prev => {
        const newData = prev.filter(b => 
          !pageData.some(p => p.type === b.type && p.id === b.id)
        );
        saveToStorage(newData);
        return newData;
      });
    } else {
      const newKeys = pageData.map(b => `${b.type}-${b.id}`);
      setSelectedBilties(prev => [...new Set([...prev, ...newKeys])]);
      setSelectedBiltiesData(prev => {
        const existingKeys = prev.map(b => `${b.type}-${b.id}`);
        const newBilties = pageData.filter(b => !existingKeys.includes(`${b.type}-${b.id}`));
        const newData = [...prev, ...newBilties];
        saveToStorage(newData);
        return newData;
      });
    }
  }, [saveToStorage]);

  const handleRemoveBilty = useCallback((bilty) => {
    const biltyKey = `${bilty.type}-${bilty.id}`;
    setSelectedBilties(prev => prev.filter(key => key !== biltyKey));
    setSelectedBiltiesData(prev => {
      const newData = prev.filter(b => !(b.type === bilty.type && b.id === bilty.id));
      saveToStorage(newData);
      return newData;
    });
  }, [saveToStorage]);

  const handleClearAllSelected = useCallback(() => {
    setSelectedBilties([]);
    setSelectedBiltiesData([]);
    setShowSelectedPanel(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleSelectedPanel = useCallback(() => {
    setShowSelectedPanel(prev => !prev);
  }, []);

  const closeSelectedPanel = useCallback(() => {
    setShowSelectedPanel(false);
  }, []);

  // Export handlers
  const handleDownloadCSV = useCallback(() => {
    if (selectedBiltiesData.length === 0) return;
    
    const headers = ['GR No', 'Type', 'Date', 'Consignor', 'Consignee', 'City', 'Packages', 'Weight', 'Payment', 'Amount', 'Pvt Marks', 'Challan'];
    
    const rows = selectedBiltiesData.map(b => [
      b.gr_no,
      b.type,
      b.bilty_date || b.created_at || '',
      b.consignor_name || b.consignor || '',
      b.consignee_name || b.consignee || '',
      b.to_city_name || b.station_city_name || b.station || '',
      b.no_of_pkg || b.packages || 0,
      b.wt || b.weight || 0,
      b.payment_mode || b.payment_status || '',
      b.total || b.grand_total || b.amount || 0,
      b.pvt_marks || '',
      b.challan_no || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bilty_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [selectedBiltiesData]);

  const handleCopyToClipboard = useCallback(async () => {
    if (selectedBiltiesData.length === 0) return;
    
    const text = selectedBiltiesData.map(b => 
      `${b.gr_no} | ${b.consignor_name || b.consignor} → ${b.consignee_name || b.consignee} | ${b.to_city_name || b.station_city_name || b.station} | ₹${b.total || b.grand_total || b.amount || 0}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectedBiltiesData]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return {
    selectedBilties,
    selectedBiltiesData,
    showSelectedPanel,
    handleSelectBilty,
    handleSelectAll,
    handleRemoveBilty,
    handleClearAllSelected,
    toggleSelectedPanel,
    closeSelectedPanel,
    handleDownloadCSV,
    handleCopyToClipboard,
    handlePrint
  };
}
