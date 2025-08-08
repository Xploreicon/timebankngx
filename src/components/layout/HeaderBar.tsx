import { Bell, LayoutDashboard, Search, Handshake, Briefcase, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

export const HeaderBar = () => {
  const { notifications } = useAppStore()
  const count = notifications.length

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-2 font-brand text-lg">
          <span className="inline-block h-3 w-3 rounded-full bg-accent" />
          TimeBank.ng
        </NavLink>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/discover">Discover</NavLink>
          <NavLink to="/trades">Trades</NavLink>
          <NavLink to="/services">Services</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <NavLink to="/profile" aria-label="Profile">
            <User className="h-5 w-5" />
          </NavLink>
          <NavLink to="/discover" aria-label="Search">
            <Search className="h-5 w-5" />
          </NavLink>
          <NavLink to="/trades" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                {count}
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </header>
  )
}

export const MobileNav = () => {
  const items = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/discover', label: 'Discover', icon: Search },
    { to: '/trades', label: 'Trades', icon: Handshake },
    { to: '/services', label: 'Services', icon: Briefcase },
    { to: '/profile', label: 'Profile', icon: User },
  ]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-background md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className={({isActive}) => `flex flex-col items-center justify-center py-2 text-xs ${isActive ? 'text-accent' : 'text-muted-foreground'}`}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
