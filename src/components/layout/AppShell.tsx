import { HeaderBar, MobileNav } from './HeaderBar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar />
      <div className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-10">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
