'use client';

import { createContext, useContext, useEffect } from 'react';

/**
 * Simple Navigation System
 * Makes Enter key work like Tab key without complex tab index management
 */

const SimpleNavigationContext = createContext();

export const SimpleNavigationProvider = ({ children }) => {
  useEffect(() => {
    const handleEnterKeyNavigation = (e) => {
      // Only handle Enter key
      if (e.key !== 'Enter') return;
      
      // Don't interfere with textareas or if target has data-enter-submit attribute
      if (e.target.tagName === 'TEXTAREA' || e.target.dataset.enterSubmit === 'true') return;
      
      // Don't interfere with dropdowns or autocomplete
      if (e.target.getAttribute('role') === 'combobox') return;
      if (e.target.closest('[role="listbox"]')) return;
      if (e.target.closest('.dropdown-menu')) return;
      
      // Don't interfere with buttons (they should submit/click)
      if (e.target.tagName === 'BUTTON') return;
      
      // Don't interfere with select elements
      if (e.target.tagName === 'SELECT') return;
      
      // Only handle input and other focusable elements
      const focusableElements = [
        'INPUT',
        'SELECT', 
        'TEXTAREA',
        '[contenteditable="true"]',
        '[tabindex]:not([tabindex="-1"])'
      ];
      
      if (!focusableElements.some(selector => 
        e.target.matches(selector) || e.target.tagName === selector
      )) return;
      
      // Prevent default Enter behavior
      e.preventDefault();
      
      // Find all focusable elements in the document
      const allFocusable = document.querySelectorAll(`
        input:not([disabled]):not([readonly]):not([type="hidden"]),
        select:not([disabled]),
        textarea:not([disabled]):not([readonly]),
        button:not([disabled]),
        [tabindex]:not([tabindex="-1"]):not([disabled])
      `);
      
      // Filter out hidden elements
      const visibleFocusable = Array.from(allFocusable).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetParent !== null;
      });
      
      // Find current element index
      const currentIndex = visibleFocusable.indexOf(e.target);
      if (currentIndex === -1) return;
      
      // Find next focusable element
      let nextIndex = currentIndex + 1;
      
      // Wrap around to beginning if we're at the end
      if (nextIndex >= visibleFocusable.length) {
        nextIndex = 0;
      }
      
      // Focus the next element
      const nextElement = visibleFocusable[nextIndex];
      if (nextElement) {
        // Small delay to ensure any state changes have completed
        setTimeout(() => {
          nextElement.focus();
          
          // If it's an input, select all text for easy replacement
          if (nextElement.tagName === 'INPUT' && 
              ['text', 'number', 'email', 'tel', 'url'].includes(nextElement.type)) {
            nextElement.select();
          }
        }, 10);
      }
    };
    
    // Add event listener to document
    document.addEventListener('keydown', handleEnterKeyNavigation);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEnterKeyNavigation);
    };
  }, []);
  
  return (
    <SimpleNavigationContext.Provider value={{}}>
      {children}
    </SimpleNavigationContext.Provider>
  );
};

export const useSimpleNavigation = () => {
  const context = useContext(SimpleNavigationContext);
  if (!context) {
    throw new Error('useSimpleNavigation must be used within SimpleNavigationProvider');
  }
  return context;
};
