'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './auth';
import supabase from './supabase';
import { Shield, AlertTriangle, Home, ArrowLeft } from 'lucide-react';

// Route to module mapping - define which module is required for each route
const ROUTE_MODULE_MAP = {
  '/bilty': 'bilty',
  '/bill': 'bill',
  '/search': 'search',
  '/ewb': 'ewb',
  '/manual': 'manual',
  '/challan': 'challan',
  '/challan-setting': 'challan-setting',
  '/truck-management': 'truck-management',
  '/master': 'master',
  '/report': 'report',
  '/reports': 'report',
  '/settings': 'setting',
  '/setting': 'setting',
  '/bilty-setting': 'bilty-setting',
  '/station-list': 'station-list',
  '/danger': 'danger',
  '/godown': 'godown',
  '/tracking': 'tracking',
  '/transit-finance': 'transit-finance',
  '/crm': 'crm',
  '/complains': 'complains',
  '/available': 'available',
  '/fnance': 'fnance',
  '/analytics': 'analytics',
  '/company-ledger': 'company-ledger',
};

// Routes that don't require any module (public or auth-only routes)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/login/forgot-password',
  '/register',
  '/about',
  '/contact',
  '/station-list',
];

// Routes that require authentication but no specific module
const AUTH_ONLY_ROUTES = [
  '/profile',
  '/dashboard',
  '/help',
  '/company-profile',
];

// Admin-only routes (requires staff role)
const ADMIN_ONLY_ROUTES = [
  '/test',
  '/admin',
  '/user-modules',
  '/users',
];

export default function RouteProtection({ children }) {
  const { user, isAuthenticated, loading: authLoading, initialized } = useAuth();
  const [userModules, setUserModules] = useState([]);
  const [moduleLoading, setModuleLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [requiredModule, setRequiredModule] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch user modules when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserModules();
    } else {
      setUserModules([]);
      setModuleLoading(false);
    }
  }, [user?.id]);

  // Check route access when pathname or modules change
  useEffect(() => {
    if (initialized && !authLoading && !moduleLoading) {
      checkRouteAccess();
    }
  }, [pathname, userModules, isAuthenticated, initialized, authLoading, moduleLoading]);

  const fetchUserModules = async () => {
    try {
      setModuleLoading(true);
      
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user modules:', error);
        setUserModules([]);
        setModuleLoading(false);
        return;
      }

      const modules = data.map(item => item.module_name);
      console.log('📋 User Modules Loaded:', modules);
      console.log('📊 Total modules count:', modules.length);
      
      // If user has no modules assigned, log warning
      if (modules.length === 0) {
        console.warn('⚠️ User has no modules assigned. Contact admin to assign modules.');
      }
      
      setUserModules(modules);
    } catch (error) {
      console.error('Error fetching user modules:', error);
      setUserModules([]);
    } finally {
      setModuleLoading(false);
    }
  };

  const checkRouteAccess = () => {
    // Reset access denied state
    setAccessDenied(false);
    setRequiredModule(null);

    // Check if it's a public route
    if (PUBLIC_ROUTES.includes(pathname)) {
      console.log('✅ Public route access granted');
      return;
    }

    // Check if it's a print route (dynamic route /print/[gr_no])
    if (pathname.startsWith('/print/')) {
      console.log('✅ Print route access granted');
      return;
    }

    // Check if user is authenticated for protected routes
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Check if it's an admin-only route
    if (ADMIN_ONLY_ROUTES.includes(pathname)) {
      if (!user?.is_staff) {
        console.error('❌ Access denied - Admin access required');
        setRequiredModule('admin');
        setAccessDenied(true);
        return;
      }
      console.log('✅ Admin route access granted');
      return;
    }

    // Check if it's an auth-only route (no specific module required)
    if (AUTH_ONLY_ROUTES.includes(pathname)) {
      console.log('✅ Auth-only route access granted');
      return;
    }

    // Find the required module for this route
    const requiredModuleForRoute = getRequiredModule(pathname);
    
    console.log('🔐 Route Protection Check:', {
      pathname,
      requiredModuleForRoute,
      userModules,
      userModulesLength: userModules.length,
      hasAccess: requiredModuleForRoute ? userModules.includes(requiredModuleForRoute) : 'N/A',
      isStaff: user?.is_staff,
      moduleLoading
    });
    
    if (!requiredModuleForRoute) {
      // Route not defined in our system, allow access for now
      console.log('⚠️ Route not in protection map, allowing access');
      return;
    }

    // CRITICAL FIX: If user has no modules assigned, show access denied immediately
    if (userModules.length === 0) {
      console.error('❌ Access denied - User has no modules assigned');
      console.error('Required module:', requiredModuleForRoute);
      setRequiredModule(requiredModuleForRoute);
      setAccessDenied(true);
      return;
    }

    // Check if user has the required module
    if (!userModules.includes(requiredModuleForRoute)) {
      console.error('❌ Access denied - User does not have module:', requiredModuleForRoute);
      console.error('Available modules:', userModules);
      setRequiredModule(requiredModuleForRoute);
      setAccessDenied(true);
      return;
    }

    console.log('✅ Access granted - User has required module');
  };

  const getRequiredModule = (path) => {
    // Direct match
    if (ROUTE_MODULE_MAP[path]) {
      return ROUTE_MODULE_MAP[path];
    }

    // Check for partial matches (for dynamic routes)
    const matchingRoute = Object.keys(ROUTE_MODULE_MAP).find(route => {
      // Handle dynamic routes like /bilty/[id]
      const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(path);
    });

    return matchingRoute ? ROUTE_MODULE_MAP[matchingRoute] : null;
  };

  // Show loading while checking authentication and modules
  if (authLoading || moduleLoading || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated but modules haven't loaded yet (empty array), keep showing loading
  // unless we're on a public, auth-only, or admin-only route
  const isAdminRoute = ADMIN_ONLY_ROUTES.includes(pathname);
  const isPublicOrAuthRoute = PUBLIC_ROUTES.includes(pathname) || 
                              AUTH_ONLY_ROUTES.includes(pathname) || 
                              pathname.startsWith('/print/');
  
  if (
    isAuthenticated && 
    userModules.length === 0 && 
    !isPublicOrAuthRoute &&
    !isAdminRoute // Admin routes don't need modules, just staff check
  ) {
    console.log('⏳ Waiting for modules to load...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied page
  if (accessDenied) {
    return <AccessDeniedPage requiredModule={requiredModule} />;
  }

  // Render the protected content
  return children;
}

// Access Denied Component
function AccessDeniedPage({ requiredModule }) {
  const router = useRouter();
  const { user } = useAuth();

  const getModuleDisplayName = (module) => {
    const moduleNames = {
      'bilty': 'Bilty Management',
      'bill': 'Bill Management',
      'search': 'Search',
      'ewb': 'E-Way Bill',
      'manual': 'Manual Entry',
      'challan': 'Challan Management',
      'challan-setting': 'Challan Settings',
      'truck-management': 'Truck Management',
      'master': 'Master Data',
      'report': 'Reports & Analytics',
      'setting': 'Settings',
      'bilty-setting': 'Bilty Settings',
      'admin': 'Administrative Access',
      'station-list': 'Station List',
      'danger': 'Danger Zone',
      'godown': 'Godown Management',
      'tracking': 'Bilty Tracking',
      'transit-finance': 'Transit Finance',
      'crm': 'CRM',
      'complains': 'Complaints',
      'available': 'Available Items',
      'fnance': 'Finance Management',
      'analytics': 'Analytics Dashboard',
      'company-profile': 'Company Profile'
    };
    return moduleNames[module] || module.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <Shield className="h-8 w-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              You dont have permission to access this page
            </span>
          </div>
        </div>

        {requiredModule && (
          <div className="mb-6">
            <p className="text-gray-600 mb-2">This page requires access to:</p>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {getModuleDisplayName(requiredModule)}
            </span>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 font-medium mb-2">
            Your Account Status
          </p>
          <p className="text-xs text-blue-600">
            User: {user?.email || 'Unknown'}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            No modules have been assigned to your account yet.
          </p>
        </div>

        <p className="text-gray-600 mb-8">
          Please contact your administrator to request access to this module.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}