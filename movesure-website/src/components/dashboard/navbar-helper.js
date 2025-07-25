import { FileText, Truck, Database, Settings, Wrench, Receipt, Search } from 'lucide-react';

// Module configuration with their display names and paths
export const MODULE_CONFIG = {
  'bilty': {
    name: 'Bilty',
    path: '/bilty',
    icon: 'FileText',
    isBilty: true, // Special flag for the big button
    description: 'Create and manage bilty documents',
    shortcut: 'Alt+B'
  },
  'e-way-bill': {
    name: 'E-Way Bill',
    path: '/ewb',
    icon: 'Receipt',
    description: 'Generate and track e-way bills',
    shortcut: 'Alt+E'
  },  'challan': {
    name: 'Challan',
    path: '/challan',
    icon: 'FileText',
    description: 'Create and manage challans',
    shortcut: 'Alt+C'
  },
  'challan-setting': {
    name: 'Challan Settings',
    path: '/challan-setting',
    icon: 'Settings',
    description: 'Configure challan settings'
  },
  'truck-management': {
    name: 'Truck Add',
    path: '/truck-management',
    icon: 'Truck',
    description: 'Add and manage trucks'
  },
  'search': {
    name: 'Search',
    path: '/search',
    icon: 'Search',
    description: 'Search bilty and documents'
  },
  'bill': {
    name: 'Bill Search',
    path: '/bill',
    icon: 'FileSearch',
    description: 'Advanced bill search and management'
  },  'master': {
    name: 'Master',
    path: '/staff',
    icon: 'Database',
    description: 'Master data management'
  },
  'setting': {
    name: 'Settings',
    path: '/bilty-setting',
    icon: 'Settings',
    description: 'Application settings'
  },
  'staff': {
    name: 'Admin',
    path: '/admin',
    icon: 'Wrench',
    description: 'Administrative functions'
  },
  'godown': {
    name: 'Godown',
    path: '/godown',
    icon: 'Database',
    description: 'Manage godown operations'
  }
};

/**
 * Get navigation items based on user modules
 * @param {Array} userModules - Array of module names the user has access to
 * @returns {Array} - Array of navigation items to display
 */
export const getNavigationItems = (userModules) => {
  if (!Array.isArray(userModules) || userModules.length === 0) {
    return [];
  }

  const navigationItems = [];  // Define the order in which modules should appear in the navbar
  const moduleOrder = ['bilty', 'e-way-bill', 'challan', 'challan-setting', 'truck-management', 'search', 'bill', 'master', 'setting', 'staff', 'godown'];

  moduleOrder.forEach(moduleName => {
    if (userModules.includes(moduleName) && MODULE_CONFIG[moduleName]) {
      const config = MODULE_CONFIG[moduleName];        navigationItems.push({
          name: config.name,
          path: config.path,
          module: moduleName,
          isBilty: config.isBilty || false,
          description: config.description,
          shortcut: config.shortcut || null
        });
    }
  });

  return navigationItems;
};

/**
 * Get icon component for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {JSX.Element} - Icon component
 */
export const getModuleIcon = (moduleName) => {
  const iconMap = {
    'bilty': <FileText className="h-4 w-4" />,
    'e-way-bill': <Receipt className="h-4 w-4" />,
    'challan': <FileText className="h-4 w-4" />,
    'challan-setting': <Settings className="h-4 w-4" />,
    'truck-management': <Truck className="h-4 w-4" />,
    'search': <Search className="h-4 w-4" />,
    'bill': <Search className="h-4 w-4" />,
    'master': <Database className="h-4 w-4" />,
    'setting': <Settings className="h-4 w-4" />,
    'staff': <Wrench className="h-4 w-4" />,
    'godown': <Database className="h-4 w-4" />
  };

  return iconMap[moduleName] || <FileText className="h-4 w-4" />;
};

/**
 * Check if user has access to a specific module
 * @param {Array} userModules - Array of user's modules
 * @param {string} moduleName - Module name to check
 * @returns {boolean} - True if user has access
 */
export const checkModuleAccess = (userModules, moduleName) => {
  return Array.isArray(userModules) && userModules.includes(moduleName);
};

/**
 * Get module configuration
 * @param {string} moduleName - Name of the module
 * @returns {Object|null} - Module configuration object or null if not found
 */
export const getModuleConfig = (moduleName) => {
  return MODULE_CONFIG[moduleName] || null;
};

/**
 * Filter navigation items based on user role and modules
 * @param {Array} userModules - User's accessible modules
 * @param {boolean} isStaff - Whether user is staff
 * @returns {Array} - Filtered navigation items
 */
export const getFilteredNavigation = (userModules, isStaff = false) => {
  let items = getNavigationItems(userModules);

  // If user is not staff, remove admin-only items
  if (!isStaff) {
    items = items.filter(item => item.module !== 'staff');
  }

  return items;
};

/**
 * Get breadcrumb navigation based on current path
 * @param {string} currentPath - Current page path
 * @param {Array} userModules - User's accessible modules
 * @returns {Array} - Breadcrumb items
 */
export const getBreadcrumbs = (currentPath, userModules) => {
  const breadcrumbs = [{ name: 'Dashboard', path: '/' }];

  const moduleEntry = Object.entries(MODULE_CONFIG).find(
    ([_, config]) => config.path === currentPath
  );

  if (moduleEntry && userModules.includes(moduleEntry[0])) {
    breadcrumbs.push({
      name: moduleEntry[1].name,
      path: currentPath
    });
  }

  return breadcrumbs;
};

/**
 * Validate module access for navigation
 * @param {Array} userModules - User's modules
 * @param {string} targetPath - Path user wants to navigate to
 * @returns {boolean} - Whether navigation is allowed
 */
export const validateNavigation = (userModules, targetPath) => {
  // Allow dashboard access for everyone
  if (targetPath === '/' || targetPath === '/dashboard') {
    return true;
  }

  // Check if user has access to the target module
  const moduleEntry = Object.entries(MODULE_CONFIG).find(
    ([_, config]) => config.path === targetPath
  );

  if (!moduleEntry) {
    return false; // Unknown path
  }

  return userModules.includes(moduleEntry[0]);
};

/**
 * Get navigation statistics for admin
 * @param {Array} allUsers - All users data (for admin use)
 * @returns {Object} - Navigation usage statistics
 */
export const getNavigationStats = (allUsers) => {
  const stats = {
    totalUsers: allUsers.length,
    moduleUsage: {},
    activeUsers: 0
  };

  Object.keys(MODULE_CONFIG).forEach(module => {
    stats.moduleUsage[module] = 0;
  });

  allUsers.forEach(user => {
    if (user.is_active) {
      stats.activeUsers++;
    }
    
    // This would need to be populated with actual user_modules data
    // stats.moduleUsage calculations would go here
  });

  return stats;
};