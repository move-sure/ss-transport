'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { ChevronDown, User, Settings, LogOut, FileText, Truck, Database, Wrench, Receipt, Search, AlertTriangle, BookOpen, Shield, Users, Package, Menu, X, MapPin, DollarSign, BarChart3, Building2 } from 'lucide-react';

// Module configuration - MUST match routeprotection.js ROUTE_MODULE_MAP
const MODULE_CONFIG = {
  'bilty': {
    name: 'Bilty',
    path: '/bilty',
    icon: 'FileText',
    isBilty: true,
    shortcut: 'Alt+B'
  },
  'ewb': {  // Changed from 'e-way-bill' to 'ewb' to match route protection
    name: 'E-Way Bill',
    path: '/ewb',
    icon: 'Receipt',
    shortcut: 'Alt+E'
  },
  'challan': {
    name: 'Challan',
    path: '/challan',
    icon: 'Package',
    shortcut: 'Alt+C'
  },
  'manual': {
    name: 'Manual',
    path: '/manual',
    icon: 'BookOpen',
    shortcut: 'Alt+M'
  },
  'challan-setting': {
    name: 'Challan Settings',
    path: '/challan-setting',
    icon: 'Settings',
  },
  'truck-management': {
    name: 'Truck Add',
    path: '/truck-management',
    icon: 'Truck',
  },
  'search': {
    name: 'Search',
    path: '/search',
    icon: 'Search',
    shortcut: 'Alt+S'
  },
  'bill': {
    name: 'Bill Search',
    path: '/bill',
    icon: 'Receipt',
  },
  'master': {
    name: 'Master',
    path: '/staff',
    icon: 'Database',
  },
  'setting': {
    name: 'Settings',
    path: '/bilty-setting',
    icon: 'Settings',
  },
  'staff': {
    name: 'Admin',
    path: '/test',
    icon: 'Shield',
    shortcut: 'Alt+A'
  },
  'danger': {
    name: 'Danger Zone',
    path: '/danger',
    icon: 'AlertTriangle',
    shortcut: 'Alt+Z'
  },
  'godown': {
    name: 'Godown',
    path: '/godown',
    icon: 'Database',
    shortcut: ''
  },
  'danger': {
    name: 'Danger Zone',
    path: '/danger',
    icon: 'AlertTriangle',
    shortcut: 'Alt+Z'
  },
  'godown': {
    name: 'Godown',
    path: '/godown',
    icon: 'Database',
    shortcut: ''
  },
  'tracking': {
    name: 'Tracking',
    path: '/tracking',
    icon: 'MapPin',
    shortcut: 'Alt+T'
  },
  'transit-finance': {
    name: 'Transit Finance',
    path: '/transit-finance',
    icon: 'DollarSign',
    shortcut: 'Alt+F'
  },
  'crm': {
    name: 'CRM',
    path: '/crm',
    icon: 'Users',
  },
  'complains': {
    name: 'Complaints',
    path: '/complains',
    icon: 'AlertTriangle',
  },
  'available': {
    name: 'Available',
    path: '/available',
    icon: 'Package',
  },
  'fnance': {
    name: 'Finance',
    path: '/fnance',
    icon: 'DollarSign',
    shortcut: 'Alt+F'
  },
  'analytics': {
    name: 'Analytics',
    path: '/analytics',
    icon: 'BarChart3',
    shortcut: 'Alt+Y'
  },
  'company-profile': {
    name: 'Company Profile',
    path: '/company-profile',
    icon: 'Building2',
  },
  'company-ledger': {
    name: 'Company Ledger',
    path: '/company-ledger',
    icon: 'BookOpen',
    shortcut: 'Alt+L'
  }
};

// Route to module mapping - MUST match routeprotection.js
const ROUTE_MODULE_MAP = {
  '/bilty': 'bilty',
  '/bill': 'bill',
  '/search': 'search',
  '/ewb': 'ewb',  // Changed from 'e-way-bill' to 'ewb'
  '/challan': 'challan',
  '/manual': 'manual',
  '/challan-setting': 'challan-setting',
  '/truck-management': 'truck-management',
  '/staff': 'master',
  '/bilty-setting': 'setting',
  '/test': 'staff',
  '/user-modules': 'staff',
  '/danger': 'danger',
  '/godown': 'godown',
  '/tracking': 'tracking',
  '/crm': 'crm',
  '/complains': 'complains',
  '/available': 'available',
  '/fnance': 'fnance',
  '/transit-finance': 'transit-finance',
  '/analytics': 'analytics',
  '/company-ledger': 'company-ledger',
};

// Public routes that don't require module access
const PUBLIC_ROUTES = ['/', '/dashboard', '/profile', '/help', '/company-profile'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userModules, setUserModules] = useState([]);
  const [navigationItems, setNavigationItems] = useState([]);
  const [navigating, setNavigating] = useState(null);
  const [modulesLoading, setModulesLoading] = useState(true);

  // Fetch user modules on component mount
  useEffect(() => {
    if (user?.id) {
      fetchUserModules();
    } else {
      setUserModules([]);
      setNavigationItems([]);
      setModulesLoading(false);
    }
  }, [user?.id]);

  // Update navigation items when modules change
  useEffect(() => {
    if (!modulesLoading) {
      const items = getNavigationItems(userModules);
      setNavigationItems(items);
      console.log('🔍 Navbar - User Modules:', userModules);
      console.log('🔍 Navbar - Navigation Items:', items);
    }
  }, [userModules, modulesLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'b':
            event.preventDefault();
            if (userModules.includes('bilty')) {
              handleNavClick({ path: '/bilty', module: 'bilty' });
            }
            break;
          case 'c':
            event.preventDefault();
            if (userModules.includes('challan')) {
              handleNavClick({ path: '/challan', module: 'challan' });
            }
            break;
          case 's':
            event.preventDefault();
            if (userModules.includes('search')) {
              handleNavClick({ path: '/search', module: 'search' });
            }
            break;
          case 't':
            event.preventDefault();
            if (userModules.includes('tracking')) {
              handleNavClick({ path: '/tracking', module: 'tracking' });
            }
            break;
          case 'm':
            event.preventDefault();
            if (userModules.includes('manual')) {
              handleNavClick({ path: '/manual', module: 'manual' });
            }
            break;
          case 'e':
            event.preventDefault();
            if (userModules.includes('ewb')) {  // Changed from 'e-way-bill' to 'ewb'
              handleNavClick({ path: '/ewb', module: 'ewb' });
            }
            break;
          case 'a':
            event.preventDefault();
            if (userModules.includes('staff')) {
              handleNavClick({ path: '/test', module: 'staff' });
            }
            break;
          case 'z':
            event.preventDefault();
            if (userModules.includes('danger')) {
              handleNavClick({ path: '/danger', module: 'danger' });
            }
            break;
          case 'g':
            event.preventDefault();
            if (userModules.includes('godown')) {
              handleNavClick({ path: '/godown', module: 'godown' });
            }
            break;
          case 'f':
            event.preventDefault();
            if (userModules.includes('fnance')) {
              handleNavClick({ path: '/fnance', module: 'fnance' });
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userModules]);

  const fetchUserModules = async () => {
    try {
      setModulesLoading(true);
      
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_name')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Navbar - Error fetching user modules:', error);
        setUserModules([]);
        setNavigationItems([]);
        return;
      }

      const modules = data?.map(item => item.module_name) || [];
      console.log('✅ Navbar - Fetched modules for user:', user.id);
      console.log('📋 Navbar - Modules:', modules);
      
      setUserModules(modules);
      
      if (modules.length === 0) {
        console.warn('⚠️ Navbar - User has no modules assigned');
        setNavigationItems([]);
      }
    } catch (error) {
      console.error('❌ Navbar - Exception fetching user modules:', error);
      setUserModules([]);
      setNavigationItems([]);
    } finally {
      setModulesLoading(false);
    }
  };  const getNavigationItems = (userModules) => {
    // CRITICAL: Return empty array if no modules
    if (!Array.isArray(userModules) || userModules.length === 0) {
      console.log('🚫 Navbar - No modules available, returning empty navigation');
      return [];
    }

    const navigationItems = [];
    
    // Icon-only modules (left side) - MUST match module names in database
    const iconOnlyOrder = ['bilty', 'ewb', 'challan', 'manual', 'search', 'tracking', 'transit-finance', 'fnance', 'analytics', 'staff', 'danger'];
    // Text modules (right side)
    const textModulesOrder = ['challan-setting', 'truck-management', 'bill', 'master', 'setting', 'godown', 'crm', 'complains', 'available', 'company-profile', 'company-ledger'];

    // Add icon-only modules first
    iconOnlyOrder.forEach(moduleName => {
      if (userModules.includes(moduleName) && MODULE_CONFIG[moduleName]) {
        const config = MODULE_CONFIG[moduleName];
        console.log(`✅ Navbar - Adding icon module: ${moduleName}`);
        navigationItems.push({
          name: config.name,
          path: config.path,
          module: moduleName,
          isBilty: config.isBilty || false,
          shortcut: config.shortcut || null,
          isIconOnly: true,
        });
      }
    });

    // Add text modules after
    textModulesOrder.forEach(moduleName => {
      if (userModules.includes(moduleName) && MODULE_CONFIG[moduleName]) {
        const config = MODULE_CONFIG[moduleName];
        console.log(`✅ Navbar - Adding text module: ${moduleName}`);
        navigationItems.push({
          name: config.name,
          path: config.path,
          module: moduleName,
          isBilty: config.isBilty || false,
          shortcut: config.shortcut || null,
          isIconOnly: false,
        });
      }
    });

    console.log(`📊 Navbar - Total navigation items: ${navigationItems.length}`);
    return navigationItems;
  };  const getModuleIcon = (moduleName) => {
    const iconMap = {
      'bilty': <FileText className="h-4 w-4" />,
      'ewb': <Receipt className="h-4 w-4" />,  // Changed from 'e-way-bill' to 'ewb'
      'challan': <Package className="h-4 w-4" />,
      'manual': <BookOpen className="h-4 w-4" />,
      'challan-setting': <Settings className="h-4 w-4" />,
      'truck-management': <Truck className="h-4 w-4" />,
      'search': <Search className="h-4 w-4" />,
      'bill': <Receipt className="h-4 w-4" />,
      'tracking': <MapPin className="h-4 w-4" />,
      'master': <Database className="h-4 w-4" />,
      'setting': <Settings className="h-4 w-4" />,
      'staff': <Shield className="h-4 w-4" />,
      'danger': <AlertTriangle className="h-4 w-4" />,
      'godown': <Database className="h-4 w-4" />,
      'crm': <Users className="h-4 w-4" />,
      'complains': <AlertTriangle className="h-4 w-4" />,
      'available': <Package className="h-4 w-4" />,
      'fnance': <DollarSign className="h-4 w-4" />,
      'transit-finance': <DollarSign className="h-4 w-4" />,
      'analytics': <BarChart3 className="h-4 w-4" />,
      'company-profile': <Building2 className="h-4 w-4" />,
      'company-ledger': <BookOpen className="h-4 w-4" />
    };

    return iconMap[moduleName] || <FileText className="h-4 w-4" />;
  };

  const checkModuleAccess = (userModules, moduleName) => {
    return Array.isArray(userModules) && userModules.includes(moduleName);
  };

  const validateNavigation = (userModules, targetPath) => {
    // Allow dashboard access for everyone
    if (PUBLIC_ROUTES.includes(targetPath)) {
      return true;
    }

    // CRITICAL: If user has no modules, deny access to protected routes
    if (!Array.isArray(userModules) || userModules.length === 0) {
      console.error('❌ Navbar - Access denied: No modules assigned');
      return false;
    }

    // Check if user has access to the target module
    const requiredModule = ROUTE_MODULE_MAP[targetPath];
    if (!requiredModule) {
      console.warn('⚠️ Navbar - Unknown route:', targetPath);
      return true; // Unknown path, allow (or you can deny)
    }

    const hasAccess = userModules.includes(requiredModule);
    console.log(`🔐 Navbar - Validate navigation to ${targetPath}: ${hasAccess ? 'ALLOWED' : 'DENIED'}`);
    console.log(`   Required module: ${requiredModule}`);
    console.log(`   User modules:`, userModules);
    
    return hasAccess;
  };

  const handleNavClick = async (item) => {
    try {
      setNavigating(item.path);
      setIsMobileMenuOpen(false); // Close mobile menu on navigation
      
      // Validate navigation access
      const isValid = validateNavigation(userModules, item.path);
      
      if (!isValid) {
        console.error('Access denied to route:', item.path);
        setNavigating(null);
        return;
      }

      // Additional check for staff routes
      if (item.module === 'staff' && !user?.is_staff) {
        console.error('Staff access required for:', item.path);
        setNavigating(null);
        return;
      }

      // Navigate to the route
      await router.push(item.path);
      
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setNavigating(null);
    }
  };

  const handleDropdownNavigation = async (path) => {
    try {
      setIsDropdownOpen(false);
      setIsMobileMenuOpen(false); // Close mobile menu
      setNavigating(path);
      
      // Validate access for dropdown navigation
      const isValid = validateNavigation(userModules, path);
      
      if (!isValid) {
        console.error('Access denied to route:', path);
        setNavigating(null);
        return;
      }

      await router.push(path);
    } catch (error) {
      console.error('Dropdown navigation error:', error);
    } finally {
      setNavigating(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Check if current path matches navigation item
  const isActiveRoute = (itemPath) => {
    if (pathname === itemPath) return true;
    
    // Check for nested routes (e.g., /bilty/create should highlight /bilty)
    if (pathname.startsWith(itemPath + '/')) return true;
    
    return false;
  };

  return (
    <nav className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 shadow-2xl border-b border-blue-700">
      <div className="w-full mx-auto px-2">
        <div className="flex justify-between h-14">
          {/* Left side - Logo/Brand and Navigation */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white hover:text-blue-200 p-2 rounded-md hover:bg-blue-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Logo/Brand */}
            <div className="flex-shrink-0 flex items-center">
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-sm font-bold text-white hover:text-blue-200 transition-colors"
              >
                movesure
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex space-x-1">
              {modulesLoading ? (
                <div className="flex items-center space-x-2 px-4">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-200 border-t-transparent rounded-full"></div>
                  <span className="text-xs text-blue-200">Loading modules...</span>
                </div>
              ) : navigationItems.length === 0 ? (
                <div className="flex items-center px-4">
                  <span className="text-xs text-blue-200">No modules assigned</span>
                </div>
              ) : null}
              
              {!modulesLoading && navigationItems.map((item) => {
                const isActive = isActiveRoute(item.path);
                const isLoading = navigating === item.path;
                
                if (item.isBilty) {
                  // Special styling for Bilty button
                  return (
                    <div key={item.name} className="relative group">
                      <button
                        onClick={() => handleNavClick(item)}
                        disabled={isLoading}
                        title={item.shortcut ? `${item.name} (${item.shortcut})` : item.name}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive 
                            ? 'bg-blue-100 text-blue-900 shadow-lg scale-105' 
                            : 'bg-white text-blue-900 hover:bg-blue-50'
                        }`}
                      >
                        {isLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-blue-900 border-t-transparent rounded-full"></div>
                        ) : (
                          getModuleIcon(item.module)
                        )}
                        <span className="font-medium relative inline-block min-w-max">
                          <span className="transition-opacity duration-300 ease-in-out group-hover:opacity-0">{item.name}</span>
                          {item.shortcut && (
                            <span className="absolute inset-0 transition-opacity duration-300 ease-in-out opacity-0 group-hover:opacity-100">{item.shortcut}</span>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                }
                
                if (item.isIconOnly) {
                  return (
                    <div key={item.name} className="relative group">
                      <button
                        onClick={() => handleNavClick(item)}
                        disabled={isLoading}
                        title={item.shortcut ? `${item.name} (${item.shortcut})` : item.name}
                        className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive
                            ? 'text-white bg-blue-700 shadow-md'
                            : 'text-blue-100 hover:text-white hover:bg-blue-700'
                        }`}
                      >
                        {isLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          getModuleIcon(item.module)
                        )}
                        <span className="font-medium relative inline-block min-w-max">
                          <span className="transition-opacity duration-300 ease-in-out group-hover:opacity-0">{item.name}</span>
                          {item.shortcut && (
                            <span className="absolute inset-0 transition-opacity duration-300 ease-in-out opacity-0 group-hover:opacity-100">{item.shortcut}</span>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                }
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item)}
                    disabled={isLoading}
                    title={item.shortcut ? `${item.name} (${item.shortcut})` : item.name}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? 'text-white bg-blue-700 shadow-md'
                        : 'text-blue-100 hover:text-white hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? (
                      <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      getModuleIcon(item.module)
                    )}
                    <span>{item.name}</span>
                    {item.shortcut && (
                      <span className="text-xs opacity-70 ml-1">({item.shortcut})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>          {/* Right side - User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center space-x-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-blue-900 p-1.5 hover:bg-blue-700 transition-all duration-200"
              >
                {/* User Avatar */}
                <div className="h-7 w-7 rounded-full overflow-hidden bg-white border-2 border-blue-300 flex items-center justify-center">
                  {user?.image_url ? (
                    <img
                      src={user.image_url}
                      alt="Profile"
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-blue-900" />
                  )}
                </div>

                {/* User Info - Hidden on mobile */}
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-semibold text-white">
                    {user?.name || user?.username}
                  </span>
                  {user?.post && (
                    <span className="text-xs text-blue-200">
                      {user.post}
                    </span>
                  )}
                </div>

                <ChevronDown
                  className={`hidden md:block h-3 w-3 text-blue-200 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-white border border-gray-200 focus:outline-none z-50 overflow-hidden">
                  {/* User Info Section */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-white border-2 border-blue-300 flex items-center justify-center">
                        {user?.image_url ? (
                          <img
                            src={user.image_url}
                            alt="Profile"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-blue-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {user?.name || user?.username}
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          @{user?.username}
                        </p>
                        {user?.post && (
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {user.post}
                          </p>
                        )}
                        {user?.is_staff && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            <Wrench className="h-3 w-3 mr-1" />
                            Staff
                          </span>
                        )}
                      </div>
                    </div>
                  </div>                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                      onClick={() => handleDropdownNavigation('/profile')}
                      disabled={navigating === '/profile'}
                    >
                      <User className="h-4 w-4 mr-3 text-blue-600" />
                      My Profile
                      {navigating === '/profile' && (
                        <div className="ml-auto animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      )}
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-200 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-red-500" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-blue-700 py-3 px-2 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-200 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <span className="text-sm text-blue-200">Loading your modules...</span>
                </div>
              </div>
            ) : navigationItems.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <span className="text-sm text-blue-200">No modules assigned to your account</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {navigationItems.map((item) => {
                const isActive = isActiveRoute(item.path);
                const isLoading = navigating === item.path;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item)}
                    disabled={isLoading}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? item.isBilty
                          ? 'bg-white text-blue-900 shadow-lg'
                          : 'bg-blue-700 text-white shadow-md'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    {isLoading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                    ) : (
                      <span className="flex-shrink-0">
                        {getModuleIcon(item.module)}
                      </span>
                    )}
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.shortcut && (
                      <span className="text-xs opacity-70 bg-blue-800 px-2 py-1 rounded">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            )}
            
            {/* Mobile User Info Section */}
            <div className="mt-4 pt-4 border-t border-blue-700">
              <div className="flex items-center space-x-3 px-4 py-2 mb-2">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-white border-2 border-blue-300 flex items-center justify-center">
                  {user?.image_url ? (
                    <img
                      src={user.image_url}
                      alt="Profile"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-blue-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {user?.name || user?.username}
                  </p>
                  <p className="text-xs text-blue-200 truncate">
                    @{user?.username}
                  </p>
                  {user?.post && (
                    <p className="text-xs text-blue-300 truncate mt-1">
                      {user.post}
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleDropdownNavigation('/profile')}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-700 hover:text-white transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-red-600 hover:text-white transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}