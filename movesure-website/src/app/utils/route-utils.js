// route-utils.js - Utility functions for route protection

import supabase from '../utils/supabase';

// Route to module mapping - centralized configuration
export const ROUTE_MODULE_MAP = {
  // Main module routes
  '/bilty': 'bilty',
  '/e-way-bill': 'e-way-bill',
  '/loading': 'loading',
  '/challan': 'challan',
  '/master': 'master',
  '/report': 'report',
  '/settings': 'setting',
  '/setting': 'setting',
  '/admin': 'staff',
  '/staff': 'staff',
  '/user-modules': 'staff',
  '/users': 'staff',
  '/fnance': 'fnance',
  '/transit-finance': 'transit-finance',
  
  // Nested routes - Bilty
  '/bilty/create': 'bilty',
  '/bilty/edit': 'bilty',
  '/bilty/view': 'bilty',
  '/bilty/list': 'bilty',
  '/bilty/print': 'bilty',
  
  // Nested routes - E-Way Bill
  '/e-way-bill/generate': 'e-way-bill',
  '/e-way-bill/track': 'e-way-bill',
  '/e-way-bill/cancel': 'e-way-bill',
  '/e-way-bill/update': 'e-way-bill',
  '/e-way-bill/history': 'e-way-bill',
  
  // Nested routes - Loading
  '/loading/schedule': 'loading',
  '/loading/manage': 'loading',
  '/loading/assign': 'loading',
  '/loading/track': 'loading',
  
  // Nested routes - Challan
  '/challan/create': 'challan',
  '/challan/list': 'challan',
  '/challan/edit': 'challan',
  '/challan/print': 'challan',
  
  // Nested routes - Master
  '/master/customers': 'master',
  '/master/vehicles': 'master',
  '/master/drivers': 'master',
  '/master/routes': 'master',
  '/master/branches': 'master',
  '/master/rates': 'master',
  
  // Nested routes - Reports
  '/report/bilty': 'report',
  '/report/financial': 'report',
  '/report/analytics': 'report',
  '/report/customer': 'report',
  '/report/vehicle': 'report',
  '/report/driver': 'report',
  
  // Nested routes - Settings
  '/settings/profile': 'setting',
  '/settings/company': 'setting',
  '/settings/system': 'setting',
  '/settings/backup': 'setting',
  '/settings/security': 'setting',
  
  // Nested routes - Admin/Staff
  '/admin/users': 'staff',
  '/admin/system': 'staff',
  '/admin/modules': 'staff',
  '/admin/backup': 'staff',
  '/admin/logs': 'staff',
  '/staff/permissions': 'staff',
  '/staff/audit': 'staff',
};

// Routes that don't require any module (public or basic auth routes)
export const PUBLIC_ROUTES = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/profile',
  '/help',
  '/about',
  '/contact',
  '/forgot-password',
  '/reset-password'
];

// Routes that require authentication but no specific module
export const AUTH_ONLY_ROUTES = [
  '/profile',
  '/dashboard',
  '/help',
  '/notifications',
  '/account'
];

/**
 * Get the required module for a given route
 * @param {string} pathname - The current pathname
 * @returns {string|null} - Required module or null
 */
export const getRequiredModule = (pathname) => {
  // Direct match
  if (ROUTE_MODULE_MAP[pathname]) {
    return ROUTE_MODULE_MAP[pathname];
  }

  // Check for dynamic routes (e.g., /bilty/123, /report/view/456)
  const matchingRoute = Object.keys(ROUTE_MODULE_MAP).find(route => {
    // Convert route pattern to regex
    // Handle patterns like /bilty/[id] or /report/view/[reportId]
    const routePattern = route
      .replace(/\[.*?\]/g, '[^/]+') // Replace [id] with [^/]+
      .replace(/\*/g, '.*'); // Handle wildcard if any
    
    const regex = new RegExp(`^${routePattern}(/.*)?$`);
    return regex.test(pathname);
  });

  return matchingRoute ? ROUTE_MODULE_MAP[matchingRoute] : null;
};

/**
 * Check if a route is public (doesn't require authentication)
 * @param {string} pathname - The current pathname
 * @returns {boolean} - True if route is public
 */
export const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.includes(pathname);
};

/**
 * Check if a route requires only authentication (no specific module)
 * @param {string} pathname - The current pathname
 * @returns {boolean} - True if route requires only auth
 */
export const isAuthOnlyRoute = (pathname) => {
  return AUTH_ONLY_ROUTES.includes(pathname);
};

/**
 * Check if user has access to a specific route
 * @param {string} pathname - The route to check
 * @param {Array} userModules - User's assigned modules
 * @param {boolean} isAuthenticated - User authentication status
 * @param {boolean} isStaff - User staff status
 * @returns {Object} - Access check result
 */
export const checkRouteAccess = (pathname, userModules = [], isAuthenticated = false, isStaff = false) => {
  // Check public routes
  if (isPublicRoute(pathname)) {
    return { 
      hasAccess: true, 
      reason: 'public_route',
      requiredModule: null 
    };
  }

  // Check authentication requirement
  if (!isAuthenticated) {
    return { 
      hasAccess: false, 
      reason: 'authentication_required',
      requiredModule: null,
      redirectTo: '/login'
    };
  }

  // Check auth-only routes
  if (isAuthOnlyRoute(pathname)) {
    return { 
      hasAccess: true, 
      reason: 'authenticated_user',
      requiredModule: null 
    };
  }

  // Get required module
  const requiredModule = getRequiredModule(pathname);
  
  if (!requiredModule) {
    // Route not in our system - you can choose to allow or deny
    return { 
      hasAccess: true, 
      reason: 'unprotected_route',
      requiredModule: null 
    };
  }

  // Check module access
  if (!userModules.includes(requiredModule)) {
    return { 
      hasAccess: false, 
      reason: 'module_access_required',
      requiredModule,
      redirectTo: '/dashboard'
    };
  }

  return { 
    hasAccess: true, 
    reason: 'module_access_granted',
    requiredModule 
  };
};

/**
 * Fetch user modules from database
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of module names
 */
export const fetchUserModules = async (userId) => {
  try {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('user_modules')
      .select('module_name')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user modules:', error);
      return [];
    }

    return data.map(item => item.module_name);
  } catch (error) {
    console.error('Error fetching user modules:', error);
    return [];
  }
};

/**
 * Get module display name
 * @param {string} module - Module internal name
 * @returns {string} - Display name
 */
export const getModuleDisplayName = (module) => {
  const moduleNames = {
    'bilty': 'Bilty Management',
    'e-way-bill': 'E-Way Bill',
    'loading': 'Loading Operations',
    'challan': 'Challan Management',
    'master': 'Master Data',
    'report': 'Reports & Analytics',
    'setting': 'Settings',
    'staff': 'Administrative Access',
    'transit-finance': 'Transit Finance'
  };
  return moduleNames[module] || module;
};

/**
 * Generate navigation items based on user modules
 * @param {Array} userModules - User's assigned modules
 * @param {boolean} isStaff - User staff status
 * @returns {Array} - Navigation items
 */
export const generateNavigation = (userModules = [], isStaff = false) => {
  const navigation = [];
  
  // Define navigation order
  const navOrder = ['bilty', 'e-way-bill', 'loading', 'challan', 'master', 'report', 'setting'];
  
  navOrder.forEach(module => {
    if (userModules.includes(module)) {
      navigation.push({
        name: getModuleDisplayName(module),
        href: `/${module}`,
        module: module
      });
    }
  });
  
  // Add staff navigation if user is staff
  if (isStaff && userModules.includes('staff')) {
    navigation.push({
      name: 'Admin',
      href: '/admin',
      module: 'staff'
    });
  }
  
  return navigation;
};

/**
 * Create a HOC for route protection
 * @param {Component} WrappedComponent - Component to protect
 * @param {string} requiredModule - Required module for access
 * @returns {Component} - Protected component
 */
export const withRouteProtection = (WrappedComponent, requiredModule) => {
  return function ProtectedComponent(props) {
    const { user, isAuthenticated } = useAuth();
    const [userModules, setUserModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (user?.id) {
        fetchUserModules(user.id).then(modules => {
          setUserModules(modules);
          setLoading(false);

          const accessCheck = checkRouteAccess(
            window.location.pathname,
            modules,
            isAuthenticated,
            user.is_staff
          );

          if (!accessCheck.hasAccess) {
            router.push(accessCheck.redirectTo || '/dashboard');
          }
        });
      }
    }, [user, isAuthenticated]);

    if (loading) {
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...props} />;
  };
};