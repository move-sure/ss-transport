'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { ChevronDown, User, Settings, LogOut, FileText, Truck, Database, Wrench, Receipt, Search, AlertTriangle } from 'lucide-react';

// Module configuration
const MODULE_CONFIG = {
  'bilty': {
    name: 'Bilty',
    path: '/bilty',
    icon: 'FileText',
    isBilty: true,
    shortcut: 'Alt+B'
  },
  'e-way-bill': {
    name: 'E-Way Bill',
    path: '/ewb',
    icon: 'Receipt',
    shortcut: ''
  },  'challan': {
    name: 'Challan',
    path: '/challan',
    icon: 'FileText',
    shortcut: 'Alt+C'
  },
  'manual': {
    name: 'Manual',
    path: '/manual',
    icon: 'FileText',
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
  },
  'bill': {
    name: 'Bill Search',
    path: '/bill',
    icon: 'Search',
  },  'master': {
    name: 'Master',
    path: '/staff',
    icon: 'Database',
  },
  'setting': {
    name: 'Settings',
    path: '/bilty-setting',
    icon: 'Settings',
  },  'staff': {
    name: 'Admin',
    path: '/test',
    icon: 'Wrench',
  },
  'danger': {
    name: 'Danger Zone',
    path: '/danger',
    icon: 'AlertTriangle',
  },
  'godown': {
    name: 'Godown',
    path: '/godown',
    icon: 'Database',
    shortcut: ''
  }
};

// Route to module mapping
const ROUTE_MODULE_MAP = {
  '/bilty': 'bilty',
  '/bill': 'bill',
  '/search': 'search',
  '/ewb': 'e-way-bill',
  '/e-way-bill': 'e-way-bill',
  '/challan': 'challan',
  '/manual': 'manual',
  '/challan-setting': 'challan-setting',
  '/truck-management': 'truck-management',
  '/staff': 'master',
  '/bilty-setting': 'setting',  '/test': 'staff',
  '/user-modules': 'staff',
  '/danger': 'danger',
  '/godown': 'godown',
};

// Public routes that don't require module access
const PUBLIC_ROUTES = ['/', '/dashboard', '/profile', '/help'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userModules, setUserModules] = useState([]);
  const [navigationItems, setNavigationItems] = useState([]);
  const [navigating, setNavigating] = useState(null);

  // Fetch user modules on component mount
  useEffect(() => {
    if (user?.id) {
      fetchUserModules();
    }
  }, [user?.id]);
  // Update navigation items when modules change
  useEffect(() => {
    const items = getNavigationItems(userModules);
    setNavigationItems(items);
  }, [userModules]);

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
          case 'e':
            event.preventDefault();
            if (userModules.includes('e-way-bill')) {
              handleNavClick({ path: '/ewb', module: 'e-way-bill' });
            }
            break;
          case 'g':
            event.preventDefault();
            if (userModules.includes('godown')) {
              handleNavClick({ path: '/godown', module: 'godown' });
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
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user modules:', error);
        return;
      }

      const modules = data.map(item => item.module_name);
      setUserModules(modules);
    } catch (error) {
      console.error('Error fetching user modules:', error);
    }
  };  const getNavigationItems = (userModules) => {
    if (!Array.isArray(userModules) || userModules.length === 0) {
      return [];
    }    const navigationItems = [];
    const moduleOrder = ['bilty', 'e-way-bill', 'challan', 'manual', 'challan-setting', 'truck-management', 'search', 'bill', 'master', 'setting', 'staff', 'danger', 'godown'];

    moduleOrder.forEach(moduleName => {
      if (userModules.includes(moduleName) && MODULE_CONFIG[moduleName]) {
        const config = MODULE_CONFIG[moduleName];
        navigationItems.push({
          name: config.name,
          path: config.path,
          module: moduleName,
          isBilty: config.isBilty || false,
          shortcut: config.shortcut || null,
        });
      }
    });

    return navigationItems;
  };  const getModuleIcon = (moduleName) => {
    const iconMap = {
      'bilty': <FileText className="h-4 w-4" />,
      'e-way-bill': <Receipt className="h-4 w-4" />,
      'challan': <FileText className="h-4 w-4" />,
      'manual': <FileText className="h-4 w-4" />,
      'challan-setting': <Settings className="h-4 w-4" />,
      'truck-management': <Truck className="h-4 w-4" />,      'search': <Search className="h-4 w-4" />,
      'master': <Database className="h-4 w-4" />,
      'setting': <Settings className="h-4 w-4" />,
      'staff': <Wrench className="h-4 w-4" />,
      'danger': <AlertTriangle className="h-4 w-4" />,
      'godown': <Database className="h-4 w-4" />
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

    // Check if user has access to the target module
    const requiredModule = ROUTE_MODULE_MAP[targetPath];
    if (!requiredModule) {
      return true; // Unknown path, allow (or you can deny)
    }

    return userModules.includes(requiredModule);
  };

  const handleNavClick = async (item) => {
    try {
      setNavigating(item.path);
      
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
    <nav className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-xl border-b border-blue-700">
      <div className="w-full mx-auto px-2">
        <div className="flex justify-between h-14">
          {/* Left side - Logo/Brand and Navigation */}
          <div className="flex items-center space-x-4">            {/* Logo/Brand */}
            <div className="flex-shrink-0 flex items-center">
              <div className="bg-white rounded-lg p-1.5 mr-2">
                <Database className="h-4 w-4 text-blue-900" />
              </div>
              <h1 className="text-sm font-bold text-white">
                movesure.io
              </h1>
            </div>              {/* Navigation Links */}
            <div className="flex space-x-1">
              {navigationItems.map((item) => {
                const isActive = isActiveRoute(item.path);
                const isLoading = navigating === item.path;
                  if (item.isBilty) {
                  // Special styling for Bilty button
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item)}
                      disabled={isLoading}
                      title={item.shortcut ? `${item.name} (${item.shortcut})` : item.name}                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive 
                          ? 'bg-blue-100 text-blue-900 shadow-lg scale-105' 
                          : 'bg-white text-blue-900 hover:bg-blue-50'
                      }`}
                    >
                      {isLoading ? (
                        <div className="animate-spin h-3 w-3 border-2 border-blue-900 border-t-transparent rounded-full"></div>
                      ) : (
                        getModuleIcon(item.module)
                      )}
                      <span>{item.name}</span>
                      {item.shortcut && (
                        <span className="text-xs opacity-70 ml-1">({item.shortcut})</span>
                      )}
                    </button>
                  );
                }
                  return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item)}
                    disabled={isLoading}
                    title={item.shortcut ? `${item.name} (${item.shortcut})` : item.name}                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${
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

                {/* User Info */}
                <div className="flex flex-col items-start">
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
                  className={`h-3 w-3 text-blue-200 transition-transform duration-200 ${
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
                    
                    {checkModuleAccess(userModules, 'setting') && (
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        onClick={() => handleDropdownNavigation('/settings')}
                        disabled={navigating === '/settings'}
                      >
                        <Settings className="h-4 w-4 mr-3 text-blue-600" />
                        Settings
                        {navigating === '/settings' && (
                          <div className="ml-auto animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        )}
                      </button>
                    )}

                    {checkModuleAccess(userModules, 'staff') && (
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        onClick={() => handleDropdownNavigation('/admin')}
                        disabled={navigating === '/admin'}
                      >
                        <Wrench className="h-4 w-4 mr-3 text-blue-600" />
                        Admin Panel
                        {navigating === '/admin' && (
                          <div className="ml-auto animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        )}
                      </button>
                    )}
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
      </div>
    </nav>
  );
}