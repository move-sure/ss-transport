// Utility functions for managing selected bilties in localStorage

const STORAGE_KEY = 'selected_bilties';

/**
 * Get all selected bilties from localStorage
 */
export const getSelectedBilties = () => {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

/**
 * Save selected bilties to localStorage
 */
export const saveSelectedBilties = (bilties) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bilties));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * Add a bilty to selected bilties
 */
export const addSelectedBilty = (bilty) => {
  const bilties = getSelectedBilties();
  const biltyId = `${bilty.type}-${bilty.id}`;
  
  // Check if already exists
  const exists = bilties.some(b => `${b.type}-${b.id}` === biltyId);
  
  if (!exists) {
    const updatedBilties = [...bilties, bilty];
    saveSelectedBilties(updatedBilties);
    return updatedBilties;
  }
  
  return bilties;
};

/**
 * Remove a bilty from selected bilties
 */
export const removeSelectedBilty = (bilty) => {
  const bilties = getSelectedBilties();
  const biltyId = `${bilty.type}-${bilty.id}`;
  
  const updatedBilties = bilties.filter(b => `${b.type}-${b.id}` !== biltyId);
  saveSelectedBilties(updatedBilties);
  return updatedBilties;
};

/**
 * Toggle a bilty's selection status
 */
export const toggleSelectedBilty = (bilty) => {
  const bilties = getSelectedBilties();
  const biltyId = `${bilty.type}-${bilty.id}`;
  
  const exists = bilties.some(b => `${b.type}-${b.id}` === biltyId);
  
  if (exists) {
    return removeSelectedBilty(bilty);
  } else {
    return addSelectedBilty(bilty);
  }
};

/**
 * Clear all selected bilties
 */
export const clearSelectedBilties = () => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

/**
 * Check if a bilty is selected
 */
export const isBiltySelected = (bilty) => {
  const bilties = getSelectedBilties();
  const biltyId = `${bilty.type}-${bilty.id}`;
  return bilties.some(b => `${b.type}-${b.id}` === biltyId);
};

/**
 * Get selected bilty IDs as an array
 */
export const getSelectedBiltyIds = () => {
  const bilties = getSelectedBilties();
  return bilties.map(b => `${b.type}-${b.id}`);
};

/**
 * Add multiple bilties at once
 */
export const addMultipleBilties = (biltiesToAdd) => {
  const existingBilties = getSelectedBilties();
  const existingIds = existingBilties.map(b => `${b.type}-${b.id}`);
  
  // Filter out bilties that already exist
  const newBilties = biltiesToAdd.filter(
    bilty => !existingIds.includes(`${bilty.type}-${bilty.id}`)
  );
  
  if (newBilties.length > 0) {
    const updatedBilties = [...existingBilties, ...newBilties];
    saveSelectedBilties(updatedBilties);
    return updatedBilties;
  }
  
  return existingBilties;
};

/**
 * Remove multiple bilties at once
 */
export const removeMultipleBilties = (biltiesToRemove) => {
  const existingBilties = getSelectedBilties();
  const idsToRemove = biltiesToRemove.map(b => `${b.type}-${b.id}`);
  
  const updatedBilties = existingBilties.filter(
    bilty => !idsToRemove.includes(`${bilty.type}-${bilty.id}`)
  );
  
  saveSelectedBilties(updatedBilties);
  return updatedBilties;
};
