'use client';

import React from 'react';

/**
 * Enhanced Input Navigation Utility for Bilty Form
 * Handles both Tab and Enter key navigation between form inputs
 * Supports section-wise navigation with smooth scrolling
 */

export class InputNavigationManager {
  constructor() {
    this.inputMap = new Map();
    this.currentFocusIndex = 0;
    this.isActive = true;
    this.isEnterNavigation = false; // Track if navigation was triggered by Enter key
  }

  // Register an input with its navigation order
  registerInput(tabIndex, element, options = {}) {
    if (!element || !tabIndex) return;
    
    console.log(`Navigation: Registering input tabIndex ${tabIndex}`);
    
    this.inputMap.set(tabIndex, {
      element,
      canReceiveFocus: options.canReceiveFocus !== false,
      beforeFocus: options.beforeFocus,
      afterFocus: options.afterFocus,
      skipCondition: options.skipCondition,
      section: this.getSectionInfo(tabIndex)?.key || 'unknown'
    });

    // Set up enhanced event listeners for this element
    this.setupElementListeners(element, tabIndex);
  }

  // Set up event listeners for an element
  setupElementListeners(element, tabIndex) {
    if (!element) return;

    // Enhanced keydown handler
    const handleKeyDown = (e) => {
      if (!this.isActive) return;      // Handle Enter key navigation
      if (e.key === 'Enter') {
        console.log('🔄 Enter key pressed on tabIndex:', tabIndex);
        
        // Enhanced Enter key logic
        const shouldAllowNormal = this.shouldAllowNormalEnter(e.target, e);
        
        if (shouldAllowNormal) {
          console.log('✅ Allowing normal Enter behavior for dropdown/button');
          return; // Let the normal Enter behavior happen (dropdown selection, button click, etc.)
        }
        
        // If no dropdown is active or no option is selected, proceed with navigation
        console.log('🔄 Proceeding with Enter navigation from tabIndex:', tabIndex);
        
        e.preventDefault();
        e.stopPropagation();
        this.isEnterNavigation = true;
        
        const navigated = this.navigateToNext(tabIndex);
        if (navigated) {
          console.log(`✅ Enter navigation: ${tabIndex} → next field`);
        } else {
          console.log(`❌ Enter navigation failed from ${tabIndex}`);
        }
        
        setTimeout(() => {
          this.isEnterNavigation = false;
        }, 100);
      }
      
      // Handle Tab key navigation with enhanced behavior
      else if (e.key === 'Tab') {
        if (!e.shiftKey) {
          // Forward tab navigation
          const nextInput = this.getNextFocusableInput(tabIndex);
          if (nextInput) {
            const shouldScroll = this.shouldScrollToSection(tabIndex, nextInput.tabIndex);
            if (shouldScroll) {
              // Add small delay to allow default tab behavior, then scroll
              setTimeout(() => {
                this.scrollToSection(nextInput.inputData.element);
              }, 50);
            }
          }
        } else {
          // Backward tab navigation (Shift+Tab)
          const prevInput = this.getPreviousFocusableInput(tabIndex);
          if (prevInput) {
            const shouldScroll = this.shouldScrollToSection(tabIndex, prevInput.tabIndex);
            if (shouldScroll) {
              setTimeout(() => {
                this.scrollToSection(prevInput.inputData.element);
              }, 50);
            }
          }
        }
      }
    };

    // Focus handler
    const handleFocus = (e) => {
      if (!this.isActive) return;
      
      this.currentFocusIndex = tabIndex;
      console.log(`🎯 Focus on tabIndex: ${tabIndex}`);
      
      // Execute beforeFocus callback
      const inputData = this.inputMap.get(tabIndex);
      if (inputData && inputData.beforeFocus) {
        inputData.beforeFocus();
      }
    };

    // Add event listeners
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('focus', handleFocus);
    
    // Store cleanup function
    element._navigationCleanup = () => {
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('focus', handleFocus);
    };
  }  // Check if Enter key should behave normally
  shouldAllowNormalEnter(target, event) {
    // Allow normal behavior in textareas (unless Ctrl+Enter)
    if (target.tagName === 'TEXTAREA' && !event.ctrlKey) {
      return true;
    }
    
    // Allow normal behavior for buttons (including Save & Print)
    if (target.tagName === 'BUTTON' || target.type === 'button' || target.type === 'submit') {
      return true;
    }
    
    // Enhanced dropdown detection for Enter key behavior
    const parentContainer = target.closest('.relative, .dropdown-container, .autocomplete-container');
    if (parentContainer) {
      // Look for visible dropdown lists
      const dropdownLists = parentContainer.querySelectorAll('.absolute, .dropdown-open, .autocomplete-open, [role="listbox"]');
      
      for (let dropdown of dropdownLists) {
        const dropdownStyle = window.getComputedStyle(dropdown);
        if (dropdownStyle.display !== 'none' && dropdownStyle.visibility !== 'hidden') {
          
          // Check if there are selectable options in the dropdown
          const selectableOptions = dropdown.querySelectorAll('button, [role="option"], .hover\\:bg-');
          if (selectableOptions.length > 0) {
            
            // Check if any option is highlighted/selected
            const highlightedOptions = dropdown.querySelectorAll('.bg-blue-100, .bg-purple-100, [class*="selected"], [aria-selected="true"]');
            
            if (highlightedOptions.length > 0) {
              console.log('🔽 Dropdown has highlighted option, allowing Enter to select');
              return true;
            }
            
            // If no option is highlighted but dropdown is open, check if we should auto-select first option
            const firstOption = selectableOptions[0];
            if (firstOption && selectableOptions.length > 0) {
              console.log('🔽 Dropdown open with options, allowing Enter to select first option');
              return true;
            }
          }
        }
      }
    }
    
    // Special handling for combobox inputs (city, consignor, consignee, content)
    if (target.getAttribute('role') === 'combobox' || 
        target.getAttribute('aria-expanded') === 'true' ||
        target.classList.contains('dropdown-input')) {
      
      // Check if there are visible dropdown options
      const nearbyDropdowns = document.querySelectorAll('.dropdown-open, .autocomplete-open, .absolute.z-30, .absolute.z-20');
      
      for (let dropdown of nearbyDropdowns) {
        const rect = dropdown.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        
        // Check if dropdown is near the target input (within reasonable distance)
        const isNearTarget = Math.abs(rect.top - targetRect.bottom) < 100 && 
                           rect.left < targetRect.right && 
                           rect.right > targetRect.left;
        
        if (isNearTarget) {
          const dropdownStyle = window.getComputedStyle(dropdown);
          if (dropdownStyle.display !== 'none' && dropdownStyle.visibility !== 'hidden') {
            
            // Check for selectable options
            const options = dropdown.querySelectorAll('button, [role="option"]');
            if (options.length > 0) {
              console.log('🔽 Dropdown near input with options, allowing Enter to select');
              return true;
            }
          }
        }
      }
    }
    
    // Default: Allow navigation
    return false;
  }

  // Unregister an input
  unregisterInput(tabIndex) {
    const inputData = this.inputMap.get(tabIndex);
    if (inputData && inputData.element && inputData.element._navigationCleanup) {
      inputData.element._navigationCleanup();
    }
    this.inputMap.delete(tabIndex);
  }  // Find next focusable input with enhanced logic for missing sections
  getNextFocusableInput(currentTabIndex) {
    const sortedInputs = Array.from(this.inputMap.keys()).sort((a, b) => a - b);
    const currentIndex = sortedInputs.indexOf(currentTabIndex);
    
    console.log(`Navigation: Looking for next input after ${currentTabIndex}`);
    console.log(`Navigation: Available inputs: [${sortedInputs.join(', ')}]`);
    
    // Enhanced section-aware navigation
    // Special handling for Invoice → Charges transition (17 → 18)
    if (currentTabIndex === 17) {
      console.log(`Navigation: Special handling for Invoice Date (17) → Charges section`);
      
      // Try to find charges section inputs (18-30)
      const chargesInputs = sortedInputs.filter(idx => idx >= 18 && idx <= 30);
      console.log(`Navigation: Found charges inputs: [${chargesInputs.join(', ')}]`);
      
      if (chargesInputs.length > 0) {
        const firstChargesInput = chargesInputs[0];
        const inputData = this.inputMap.get(firstChargesInput);
        if (this.canFocusInput(inputData)) {
          console.log(`Navigation: Moving to first charges input: ${firstChargesInput}`);
          return { tabIndex: firstChargesInput, inputData };
        }
      }
      
      // If charges section not available, wait and retry
      console.log(`Navigation: Charges section not ready, waiting...`);
      setTimeout(() => {
        console.log(`Navigation: Retrying charges section navigation after delay`);
        const retryInputs = Array.from(this.inputMap.keys()).sort((a, b) => a - b);
        const retryChargesInputs = retryInputs.filter(idx => idx >= 18 && idx <= 30);
        
        if (retryChargesInputs.length > 0) {
          const firstChargesInput = retryChargesInputs[0];
          const inputData = this.inputMap.get(firstChargesInput);
          if (this.canFocusInput(inputData)) {
            console.log(`Navigation: Delayed navigation to charges: ${firstChargesInput}`);
            this.focusInput(firstChargesInput);
          }
        }
      }, 200);
    }
    
    // Find next input starting from current + 1
    for (let i = currentIndex + 1; i < sortedInputs.length; i++) {
      const tabIndex = sortedInputs[i];
      const inputData = this.inputMap.get(tabIndex);
      
      if (this.canFocusInput(inputData)) {
        console.log(`Navigation: Moving from ${currentTabIndex} to ${tabIndex}`);
        return { tabIndex, inputData };
      }
    }
    
    // If no next input found, wrap to beginning (only for Enter navigation)
    if (this.isEnterNavigation) {
      console.log(`Navigation: Wrapping to beginning for Enter navigation`);
      for (let i = 0; i <= currentIndex; i++) {
        const tabIndex = sortedInputs[i];
        const inputData = this.inputMap.get(tabIndex);
        
        if (this.canFocusInput(inputData)) {
          console.log(`Navigation: Wrapped to ${tabIndex}`);
          return { tabIndex, inputData };
        }
      }
    }
    
    console.log(`Navigation: No next input found after ${currentTabIndex}`);
    return null;
  }

  // Find previous focusable input (for Shift+Tab)
  getPreviousFocusableInput(currentTabIndex) {
    const sortedInputs = Array.from(this.inputMap.keys()).sort((a, b) => a - b);
    const currentIndex = sortedInputs.indexOf(currentTabIndex);
    
    // Find previous input starting from current - 1
    for (let i = currentIndex - 1; i >= 0; i--) {
      const tabIndex = sortedInputs[i];
      const inputData = this.inputMap.get(tabIndex);
      
      if (this.canFocusInput(inputData)) {
        return { tabIndex, inputData };
      }
    }
    
    // If no previous input found, wrap to end
    for (let i = sortedInputs.length - 1; i > currentIndex; i--) {
      const tabIndex = sortedInputs[i];
      const inputData = this.inputMap.get(tabIndex);
      
      if (this.canFocusInput(inputData)) {
        return { tabIndex, inputData };
      }
    }
    
    return null;
  }

  // Check if input can receive focus
  canFocusInput(inputData) {
    if (!inputData || !inputData.element) return false;
    
    const element = inputData.element;
    
    // Check if element exists in DOM and is visible
    if (!document.contains(element)) return false;
    if (element.disabled || element.readOnly) return false;
    
    // Check display and visibility styles
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    
    // Check if parent containers are hidden
    let parent = element.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }
    
    // Check custom skip condition
    if (inputData.skipCondition && inputData.skipCondition()) return false;
    
    return inputData.canReceiveFocus;
  }  // Get section information for an input
  getSectionInfo(tabIndex) {
    // Enhanced section boundaries based on tabIndex ranges - Updated for perfect sequence
    const sections = {
      'city-transport': { start: 1, end: 4, name: 'City & Transport' },
      'consignor-consignee': { start: 5, end: 10, name: 'Consignor & Consignee' },
      'invoice': { start: 11, end: 17, name: 'Invoice Details' },
      'package': { start: 18, end: 24, name: 'Package Details' },
      'charges': { start: 25, end: 30, name: 'Charges Section' }
    };

    for (const [sectionKey, section] of Object.entries(sections)) {
      if (tabIndex >= section.start && tabIndex <= section.end) {
        return { key: sectionKey, ...section };
      }
    }
    return null;
  }

  // Check if navigation crosses section boundaries
  shouldScrollToSection(currentTabIndex, nextTabIndex) {
    const currentSection = this.getSectionInfo(currentTabIndex);
    const nextSection = this.getSectionInfo(nextTabIndex);
    
    // Always scroll if moving to a different section
    if (!currentSection || !nextSection || currentSection.key !== nextSection.key) {
      return true;
    }
    
    // Also scroll if jumping more than 3 tab indexes (significant distance)
    if (Math.abs(nextTabIndex - currentTabIndex) > 3) {
      return true;
    }
    
    return false;
  }

  // Enhanced smooth scroll to section containing the input
  scrollToSection(element) {
    if (!element) return;
    
    try {
      // Find the closest section container with multiple fallback strategies
      let sectionContainer = 
        element.closest('.bg-white.p-6, .bg-white.rounded-xl, .bg-gradient-to-r.from-purple-50, .bg-gradient-to-r.from-indigo-50') ||
        element.closest('[class*="bg-white"][class*="rounded"]') ||
        element.closest('[class*="bg-gradient"][class*="rounded"]') ||
        element.closest('.grid > div') ||
        element.closest('form > div') ||
        element.parentElement;
      
      if (sectionContainer) {
        // Calculate optimal scroll position
        const rect = sectionContainer.getBoundingClientRect();
        const headerOffset = 140; // Account for header and some padding
        const viewportHeight = window.innerHeight;
        
        // Center the section in viewport if possible
        const optimalOffset = Math.min(headerOffset, (viewportHeight - rect.height) / 2);
        const targetY = window.scrollY + rect.top - optimalOffset;
        
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth'
        });
      } else {
        // Fallback: scroll to element itself
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
      
    } catch (error) {
      console.warn('Scroll error:', error);
      // Final fallback
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        console.warn('Final fallback scroll failed:', e);
      }
    }
  }

  // Focus an input by tabIndex (Helper method for delayed navigation)
  focusInput(tabIndex) {
    const inputData = this.inputMap.get(tabIndex);
    if (inputData && inputData.element) {
      // Execute beforeFocus callback
      if (inputData.beforeFocus) {
        inputData.beforeFocus();
      }
      
      inputData.element.focus();
      this.currentFocusIndex = tabIndex;
      
      // Execute afterFocus callback
      if (inputData.afterFocus) {
        inputData.afterFocus();
      }
      
      // Scroll to section if needed
      this.scrollToSection(inputData.element);
      
      console.log(`Navigation: Successfully focused tabIndex ${tabIndex}`);
      return true;
    }
    console.log(`Navigation: Failed to focus tabIndex ${tabIndex} - element not found`);
    return false;
  }

  // Navigate to next input (Enhanced)
  navigateToNext(currentTabIndex) {
    if (!this.isActive) return false;
    
    const nextInput = this.getNextFocusableInput(currentTabIndex);
    if (!nextInput) {
      console.warn(`Navigation: No next input found after tabIndex ${currentTabIndex}`);
      console.log('Available inputs:', Array.from(this.inputMap.keys()).sort((a, b) => a - b));
      return false;
    }
    
    const { tabIndex, inputData } = nextInput;
    console.log(`Navigation: Moving from ${currentTabIndex} to ${tabIndex}`);
    
    try {
      // Execute before focus callback
      if (inputData.beforeFocus) {
        inputData.beforeFocus();
      }
      
      // Check if we should scroll to new section
      const shouldScroll = this.shouldScrollToSection(currentTabIndex, tabIndex);
      
      // Scroll to section if needed
      if (shouldScroll) {
        this.scrollToSection(inputData.element);
      }
      
      // Focus with appropriate delay
      const focusDelay = shouldScroll ? 200 : 50;
      setTimeout(() => {
        try {
          // Ensure element is still focusable
          if (!this.canFocusInput(inputData)) {
            console.warn(`Element at tabIndex ${tabIndex} became unfocusable`);
            return;
          }
          
          // Focus the element
          inputData.element.focus();
          
          // Select text for input elements (excluding number inputs for better UX)
          if (inputData.element.select && 
              inputData.element.type !== 'number' && 
              inputData.element.type !== 'date' &&
              inputData.element.tagName !== 'SELECT') {
            inputData.element.select();
          }
          
          // Execute after focus callback
          if (inputData.afterFocus) {
            inputData.afterFocus();
          }
          
          // Update current focus index
          this.currentFocusIndex = tabIndex;
          
        } catch (focusError) {
          console.warn('Focus error:', focusError);
        }
      }, focusDelay);
      
      return true;
    } catch (error) {
      console.warn('Navigation error:', error);
      return false;
    }
  }

  // Enhanced Enter key handler (Legacy support)
  handleEnterKey(event, currentTabIndex) {
    // Don't handle if modifier keys are pressed (allow form submission shortcuts)
    if (event.ctrlKey || event.altKey || event.shiftKey) return false;
    
    // Check if normal Enter behavior should be allowed
    if (this.shouldAllowNormalEnter(event.target, event)) {
      return false;
    }
    
    // Navigate to next input
    this.isEnterNavigation = true;
    const navigated = this.navigateToNext(currentTabIndex);
    
    if (navigated) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setTimeout(() => {
      this.isEnterNavigation = false;
    }, 100);
    
    return navigated;
  }
  // Enhanced utility methods
  setActive(active) {
    this.isActive = active;
    console.log(`Navigation manager ${active ? 'activated' : 'deactivated'}`);
  }

  // Clear all registered inputs with cleanup
  clear() {
    // Clean up all event listeners
    this.inputMap.forEach((inputData) => {
      if (inputData.element && inputData.element._navigationCleanup) {
        inputData.element._navigationCleanup();
      }
    });
    
    this.inputMap.clear();
    this.currentFocusIndex = 0;
    console.log('Navigation manager cleared');
  }

  // Enhanced debug info
  getDebugInfo() {
    const inputs = Array.from(this.inputMap.entries()).map(([tabIndex, data]) => ({
      tabIndex,
      element: data.element?.tagName || 'Unknown',
      id: data.element?.id || 'No ID',
      className: data.element?.className || '',
      canFocus: this.canFocusInput(data),
      section: data.section,
      isVisible: data.element ? this.isElementVisible(data.element) : false
    }));
    
    return {
      totalInputs: this.inputMap.size,
      currentFocus: this.currentFocusIndex,
      isActive: this.isActive,
      isEnterNavigation: this.isEnterNavigation,
      inputs: inputs.sort((a, b) => a.tabIndex - b.tabIndex),
      sections: this.getSectionSummary()
    };
  }

  // Get section summary for debugging
  getSectionSummary() {
    const sections = {};
    this.inputMap.forEach((inputData, tabIndex) => {
      const sectionInfo = this.getSectionInfo(tabIndex);
      if (sectionInfo) {
        if (!sections[sectionInfo.key]) {
          sections[sectionInfo.key] = {
            name: sectionInfo.name,
            range: `${sectionInfo.start}-${sectionInfo.end}`,
            inputs: []
          };
        }
        sections[sectionInfo.key].inputs.push(tabIndex);
      }
    });
    return sections;
  }

  // Check if element is visible (helper for debugging)
  isElementVisible(element) {
    if (!element || !document.contains(element)) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  // Focus on specific tab index (utility method)
  focusOnTabIndex(tabIndex) {
    const inputData = this.inputMap.get(tabIndex);
    if (inputData && this.canFocusInput(inputData)) {
      inputData.element.focus();
      this.currentFocusIndex = tabIndex;
      return true;
    }
    return false;
  }

  // Get current focused element info
  getCurrentFocusInfo() {
    const inputData = this.inputMap.get(this.currentFocusIndex);
    if (inputData) {
      return {
        tabIndex: this.currentFocusIndex,
        element: inputData.element,
        section: inputData.section,
        canFocus: this.canFocusInput(inputData)
      };
    }
    return null;
  }
}

// Create a global instance
export const navigationManager = new InputNavigationManager();

// Enhanced hook for using navigation in React components
export function useInputNavigation() {
  return {
    register: navigationManager.registerInput.bind(navigationManager),
    unregister: navigationManager.unregisterInput.bind(navigationManager),
    handleEnter: navigationManager.handleEnterKey.bind(navigationManager),
    setActive: navigationManager.setActive.bind(navigationManager),
    getDebugInfo: navigationManager.getDebugInfo.bind(navigationManager),
    navigateToNext: navigationManager.navigateToNext.bind(navigationManager),
    focusOnTabIndex: navigationManager.focusOnTabIndex.bind(navigationManager),
    getCurrentFocusInfo: navigationManager.getCurrentFocusInfo.bind(navigationManager),
    clear: navigationManager.clear.bind(navigationManager)
  };
}

// Enhanced NavigableInput wrapper component with automatic Tab and Enter support
export function NavigableInput({ 
  tabIndex, 
  children, 
  beforeFocus, 
  afterFocus, 
  skipCondition,
  disabled = false,
  ...props 
}) {
  const { register, unregister } = useInputNavigation();
  
  const handleRef = (element) => {
    if (element && !disabled) {
      register(tabIndex, element, { beforeFocus, afterFocus, skipCondition });
    } else {
      unregister(tabIndex);
    }
    
    // Call original ref if provided
    if (props.ref) {
      if (typeof props.ref === 'function') {
        props.ref(element);
      } else {
        props.ref.current = element;
      }
    }
  };
  
  // Enhanced props for the child element
  const enhancedProps = {
    ...props,
    ref: handleRef,
    tabIndex: disabled ? -1 : tabIndex,
    // Note: Event listeners are now handled automatically by the navigation manager
  };
  
  // Remove ref from props to avoid conflicts
  const { ref, ...cleanProps } = enhancedProps;
  
  // Clone children with enhanced props
  return React.cloneElement(children, {
    ...cleanProps,
    ref: handleRef
  });
}

// Utility function to create navigation-aware components
export function createNavigableComponent(Component, defaultTabIndex = 1) {
  return React.forwardRef(({ tabIndex = defaultTabIndex, ...props }, ref) => {
    return (
      <NavigableInput tabIndex={tabIndex} ref={ref} {...props}>
        <Component {...props} />
      </NavigableInput>
    );
  });
}

// Debug component for development
export function NavigationDebugger({ show = false }) {
  const { getDebugInfo } = useInputNavigation();
  const [debugInfo, setDebugInfo] = React.useState(null);
  
  React.useEffect(() => {
    if (show) {
      const interval = setInterval(() => {
        setDebugInfo(getDebugInfo());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [show, getDebugInfo]);
  
  if (!show || !debugInfo) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Navigation Debug</h3>
      <div>Active: {debugInfo.isActive ? '✅' : '❌'}</div>
      <div>Current Focus: {debugInfo.currentFocus}</div>
      <div>Total Inputs: {debugInfo.totalInputs}</div>
      <div>Enter Navigation: {debugInfo.isEnterNavigation ? '🎯' : '➡️'}</div>
      
      <div className="mt-2">
        <strong>Sections:</strong>
        {Object.entries(debugInfo.sections).map(([key, section]) => (
          <div key={key} className="ml-2">
            {section.name} ({section.range}): {section.inputs.join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
}
