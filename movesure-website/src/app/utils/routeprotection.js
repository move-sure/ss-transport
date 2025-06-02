'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './auth';
import supabase from './supabase';
import { Shield, AlertTriangle, Home, ArrowLeft } from 'lucide-react';

// Route to module mapping - define which module is required for each route
const ROUTE_MODULE_MAP = {
  '/bilty': 'bilty',
  '/e-way-bill': 'e-way-bill',
  '/loading': 'loading',
  '/challan': 'challan',
  '/master': 'master',
  '/report': 'report',
  '/settings': 'setting',
  '/setting': 'setting', // Handle both variants
  '/admin': 'staff',
  '/staff': 'staff',
  '/user-modules': 'staff', // Staff only page
  '/users': 'staff', // Staff only page
};

// Routes that don't require any module (public or auth-only routes)
const PUBLIC_ROUTES = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/profile',
  '/help',
  '/about',
  '/contact'
];

// Routes that require authentication but no specific module
const AUTH_ONLY_ROUTES = [
  '/profile',
  '/dashboard',
  '/help'
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
        return;
      }

      const modules = data.map(item => item.module_name);
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
      return; // Allow access
    }

    // Check if user is authenticated for protected routes
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if it's an auth-only route (no specific module required)
    if (AUTH_ONLY_ROUTES.includes(pathname)) {
      return; // Allow access for authenticated users
    }

    // Find the required module for this route
    const requiredModuleForRoute = getRequiredModule(pathname);
    
    if (!requiredModuleForRoute) {
      // Route not defined in our system, allow access (or you can deny)
      return;
    }

    // Check if user has the required module
    if (!userModules.includes(requiredModuleForRoute)) {
      setRequiredModule(requiredModuleForRoute);
      setAccessDenied(true);
      return;
    }

    // Additional check for staff-only routes
    if (requiredModuleForRoute === 'staff' && !user?.is_staff) {
      setRequiredModule(requiredModuleForRoute);
      setAccessDenied(true);
      return;
    }
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

  const getModuleDisplayName = (module) => {
    const moduleNames = {
      'bilty': 'Bilty Management',
      'e-way-bill': 'E-Way Bill',
      'loading': 'Loading Operations',
      'challan': 'Challan Management',
      'master': 'Master Data',
      'report': 'Reports & Analytics',
      'setting': 'Settings',
      'staff': 'Administrative Access'
    };
    return moduleNames[module] || module;
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