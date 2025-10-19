// Mobile navigation optimized for Nigerian users
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useNigerianMobilePatterns } from '@/hooks/useMobile'
import {
  Home,
  Search,
  Briefcase,
  MessageCircle,
  User,
  Menu,
  X,
  Zap,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConnectionBadge } from '@/components/common/OfflineIndicator'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  badge?: number
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { path: '/discover', label: 'Discover', icon: <Search className="h-5 w-5" /> },
  { path: '/trades', label: 'Trades', icon: <Briefcase className="h-5 w-5" />, badge: 2 },
  { path: '/services', label: 'Services', icon: <MessageCircle className="h-5 w-5" /> },
  { path: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
]

export const MobileNavigation = () => {
  const location = useLocation()
  const { isMobile, dataSaverMode } = useNigerianMobilePatterns()

  if (!isMobile) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 gap-1 px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center py-2 px-1 rounded-lg
                transition-colors duration-200 min-h-[60px]
                ${isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                }
                ${dataSaverMode ? 'transition-none' : ''}
              `}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs"
                    variant="destructive"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1 text-center font-medium">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Mobile header with Nigerian optimizations
export const MobileHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isMobile, dataSaverMode } = useNigerianMobilePatterns()

  if (!isMobile) return null

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg">TimeBank</span>
          </div>

          {/* Connection status and notifications */}
          <div className="flex items-center gap-2">
            <ConnectionBadge />

            {/* Notification bell */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                3
              </Badge>
            </Button>

            {/* Menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="ml-2"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Slide-out menu */}
      {isMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-45"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu panel */}
          <div
            className={`
              fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50
              transform transition-transform duration-300 ease-in-out
              ${dataSaverMode ? 'transition-none' : ''}
            `}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <Link
                to="/settings"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
              <Link
                to="/analytics"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Analytics
              </Link>
              <Link
                to="/wallet"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Credit Wallet
              </Link>
              <div className="border-t pt-2 mt-4">
                <Link
                  to="/help"
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Help & Support
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Quick action button for Nigerian mobile users
export const MobileQuickActions = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { isMobile, dataSaverMode } = useNigerianMobilePatterns()

  if (!isMobile) return null

  return (
    <>
      {/* Main quick action button */}
      <Button
        className={`
          fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg
          bg-primary hover:bg-primary/90 z-30
          ${dataSaverMode ? 'transition-none' : 'transition-all duration-300'}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
      </Button>

      {/* Quick action menu */}
      {isOpen && (
        <div className="fixed bottom-32 right-4 z-30">
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
              onClick={() => setIsOpen(false)}
            >
              <Briefcase className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsOpen(false)}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => setIsOpen(false)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

// Nigerian data usage indicator
export const DataUsageIndicator = () => {
  const { shouldOptimizeData, isPeakDataTime, effectiveType } = useNigerianMobilePatterns()

  if (!shouldOptimizeData) return null

  return (
    <div className="fixed top-16 left-2 right-2 z-30">
      <div className="bg-orange-100 border border-orange-200 rounded-lg p-2 text-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <span className="text-orange-800">
            {isPeakDataTime
              ? '🇳🇬 Peak data time - optimizing for you'
              : `Slow connection (${effectiveType}) - data saver active`
            }
          </span>
        </div>
      </div>
    </div>
  )
}