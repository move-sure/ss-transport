import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './utils/auth'
import RouteProtection from './utils/routeprotection'
import OfflineDetector from '../components/common/offline-detector'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'movesure.io - LEADING AI BILLING SOFTWARE',
  description: 'Comprehensive transport and logistics management system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RouteProtection>
            <AppLayout>
              {children}
            </AppLayout>
          </RouteProtection>
        </AuthProvider>
        {/* Global offline detector popup */}
        <OfflineDetector />
      </body>
    </html>
  )
}

// Separate component for the app layout to handle conditional navbar rendering
function AppLayout({ children }) {
  return (
    <LayoutContent>
      {children}
    </LayoutContent>
  );
}

// Layout content component with conditional navbar
function LayoutContent({ children }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Routes where navbar should not be shown
  const noNavbarRoutes = ['/login', '/register', '/404', '/403', '/station-list'];
  const showNavbar = !noNavbarRoutes.includes(pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={showNavbar ? 'pt-0' : ''}>
        {children}
      </main>
    </div>
  );
}