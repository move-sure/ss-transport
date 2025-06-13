'use client';

/**
 * Input Navigation Utility for Bilty Form
 * Handles Enter key navigation between form inputs
 */

export class InputNavigationManager {
  constructor() {
    this.inputMap = new Map();
    this.currentFocusIndex = 0;
    this.isActive = true;
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
      skipCondition: options.skipCondition
    });
  }

  // Unregister an input
  unregisterInput(tabIndex) {
    this.inputMap.delete(tabIndex);
  }

  // Find next focusable input
  getNextFocusableInput(currentTabIndex) {
    const sortedInputs = Array.from(this.inputMap.keys()).sort((a, b) => a - b);
    const currentIndex = sortedInputs.indexOf(currentTabIndex);
    
    // Find next input starting from current + 1
    for (let i = currentIndex + 1; i < sortedInputs.length; i++) {
      const tabIndex = sortedInputs[i];
      const inputData = this.inputMap.get(tabIndex);
      
      if (this.canFocusInput(inputData)) {
        return { tabIndex, inputData };
      }
    }
    
    // If no next input found, wrap to beginning
    for (let i = 0; i <= currentIndex; i++) {
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
    // Define section boundaries based on tabIndex ranges
    const sections = {
      'city-transport': { start: 1, end: 4, name: 'City & Transport' },
      'consignor-consignee': { start: 5, end: 10, name: 'Consignor & Consignee' },
      'invoice': { start: 11, end: 17, name: 'Invoice Details' },
      'package': { start: 18, end: 24, name: 'Package Details' },
      'charges': { start: 25, end: 35, name: 'Charges Section' }
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
    
    // Scroll if moving to a different section or to the first input of any section
    return !currentSection || !nextSection || 
           currentSection.key !== nextSection.key ||
           nextTabIndex === nextSection.start;
  }
  // Smooth scroll to section containing the input
  scrollToSection(element) {
    try {
      // Find the closest section container - looking for the main section containers
      let sectionContainer = element.closest('.bg-white.p-6, .bg-white.rounded-xl, .bg-gradient-to-r.from-purple-50, .bg-gradient-to-r.from-indigo-50, [class*="rounded-xl"][class*="border"], [class*="rounded-2xl"]');
      
      if (!sectionContainer) {
        // Try to find parent section with common patterns
        sectionContainer = element.closest('[class*="bg-white"][class*="rounded"], [class*="bg-gradient"][class*="rounded"]');
      }
      
      if (!sectionContainer) {
        // Fallback: scroll to the element itself with some offset
        const rect = element.getBoundingClientRect();
        const offset = 120; // Account for header
        
        window.scrollTo({
          top: window.scrollY + rect.top - offset,
          behavior: 'smooth'
        });
        return;
      }

      // Calculate scroll position with offset for header
      const rect = sectionContainer.getBoundingClientRect();
      const headerOffset = 140; // Adjust based on your header height
      const targetY = window.scrollY + rect.top - headerOffset;
      
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth'
      });
      
    } catch (error) {
      console.warn('Scroll error:', error);
    }
  }
  // Navigate to next input
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
      // Check if we should scroll to new section
      const shouldScroll = this.shouldScrollToSection(currentTabIndex, tabIndex);
      
      // Execute before focus callback
      if (inputData.beforeFocus) {
        inputData.beforeFocus();
      }
      
      // Scroll to section if needed
      if (shouldScroll) {
        this.scrollToSection(inputData.element);
      }
      
      // Small delay to ensure scroll starts before focus (for better UX)
      setTimeout(() => {
        try {
          // Focus the element
          inputData.element.focus();
          
          // For input elements, also select the text for easy editing
          if (inputData.element.select && inputData.element.type !== 'number') {
            inputData.element.select();
          }
          
          // Execute after focus callback
          if (inputData.afterFocus) {
            inputData.afterFocus();
          }
        } catch (focusError) {
          console.warn('Focus error:', focusError);
        }
      }, shouldScroll ? 150 : 0); // Delay only if scrolling
      
      this.currentFocusIndex = tabIndex;
      return true;
    } catch (error) {
      console.warn('Navigation error:', error);
      return false;
    }
  }

  // Handle Enter key press
  handleEnterKey(event, currentTabIndex) {
    // Don't handle if Ctrl, Alt, or Shift is pressed (allow form submission shortcuts)
    if (event.ctrlKey || event.altKey || event.shiftKey) return false;
    
    // Don't handle in textarea unless Ctrl+Enter
    if (event.target.tagName === 'TEXTAREA' && !event.ctrlKey) return false;
    
    // Don't handle if dropdown is open (let component handle it)
    const target = event.target;
    if (target.getAttribute('aria-expanded') === 'true') return false;
    
    // Navigate to next input
    const navigated = this.navigateToNext(currentTabIndex);
    
    if (navigated) {
      event.preventDefault();
      return true;
    }
    
    return false;
  }

  // Enable/disable navigation
  setActive(active) {
    this.isActive = active;
  }

  // Clear all registered inputs
  clear() {
    this.inputMap.clear();
    this.currentFocusIndex = 0;
  }

  // Get debug info
  getDebugInfo() {
    const inputs = Array.from(this.inputMap.entries()).map(([tabIndex, data]) => ({
      tabIndex,
      element: data.element?.tagName || 'Unknown',
      id: data.element?.id || 'No ID',
      canFocus: this.canFocusInput(data)
    }));
    
    return {
      totalInputs: this.inputMap.size,
      currentFocus: this.currentFocusIndex,
      isActive: this.isActive,
      inputs: inputs.sort((a, b) => a.tabIndex - b.tabIndex)
    };
  }
}

// Create a global instance
export const navigationManager = new InputNavigationManager();

// Hook for using navigation in React components
export function useInputNavigation() {
  return {
    register: navigationManager.registerInput.bind(navigationManager),
    unregister: navigationManager.unregisterInput.bind(navigationManager),
    handleEnter: navigationManager.handleEnterKey.bind(navigationManager),
    setActive: navigationManager.setActive.bind(navigationManager),
    getDebugInfo: navigationManager.getDebugInfo.bind(navigationManager)
  };
}

// Enhanced input wrapper component
export function NavigableInput({ 
  tabIndex, 
  children, 
  beforeFocus, 
  afterFocus, 
  skipCondition,
  ...props 
}) {
  const { register, unregister, handleEnter } = useInputNavigation();
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEnter(e, tabIndex);
    }
    
    // Call original onKeyDown if provided
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };
  
  const handleRef = (element) => {
    if (element) {
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
  
  // Clone children with enhanced props
  return React.cloneElement(children, {
    ...props,
    ref: handleRef,
    onKeyDown: handleKeyDown,
    tabIndex
  });
}
