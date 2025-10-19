import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/appStore'
import {
  Home,
  Search,
  ArrowLeftRight,
  Briefcase,
  User,
  LogOut,
  Clock,
  Menu,
  MessageCircle,
  MailWarning
} from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/discover', label: 'Discover', icon: Search },
  { path: '/trades', label: 'My Trades', icon: ArrowLeftRight },
  { path: '/proposals', label: 'Proposals', icon: MessageCircle },
  { path: '/wallet', label: 'Wallet', icon: Clock },
  { path: '/services', label: 'Services', icon: Briefcase },
  { path: '/profile', label: 'Profile', icon: User }
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const showEmailReminder = !!profile && !(profile.email_verified ?? false)

  const handleResendVerification = async () => {
    if (!profile?.email || resendingEmail) return

    try {
      setResendingEmail(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: profile.email
      })

      if (error) throw error

      toast({
        title: 'Verification email sent',
        description: 'Check your inbox and spam folder for the confirmation link.'
      })
    } catch (error) {
      console.error('Failed to resend verification email:', error)
      toast({
        variant: 'destructive',
        title: 'Unable to send email',
        description: error instanceof Error ? error.message : 'Please try again later.'
      })
    } finally {
      setResendingEmail(false)
    }
  }

  const isActive = (path: string) => location.pathname === path

  const NavigationContent = () => (
    <nav className="space-y-2">
      {navigationItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-brand text-xl">
            <Clock className="h-6 w-6 text-primary" />
            <span>TimeBank</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            {/* Time Credits */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {profile?.available_credits || 0} credits
              </span>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
                    <AvatarFallback>
                      {profile?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{profile?.display_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <Clock className="h-6 w-6 text-primary" />
                    <span className="font-brand text-xl">TimeBank</span>
                  </div>
                  
                  <NavigationContent />
                  
                  <div className="mt-auto pt-6">
                    <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg mb-4">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {profile?.available_credits || 0} credits
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut}
                      className="w-full"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-4">
        {showEmailReminder && (
          <Alert className="border-amber-300 bg-amber-50">
            <div className="flex items-start gap-3">
              <MailWarning className="mt-1 h-5 w-5 text-amber-600" />
              <div className="space-y-2">
                <AlertTitle className="text-amber-700">Email verification pending</AlertTitle>
                <AlertDescription className="space-y-2">
                  <span>
                    We still need you to confirm <strong>{profile?.email}</strong>. Some features may remain limited until you verify.
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                    >
                      {resendingEmail ? 'Sending…' : 'Resend verification email'}
                    </Button>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <nav className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
