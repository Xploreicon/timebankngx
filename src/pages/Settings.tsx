import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'

export default function Settings(){
  const logout = useAppStore(s=>s.logout)
  return (
    <AppShell>
      <main className="max-w-xl mx-auto space-y-6">
        <h2 className="font-brand text-2xl">Settings</h2>
        <div className="p-4 rounded-lg border">
          <button onClick={logout} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Log out</button>
        </div>
      </main>
    </AppShell>
  )
}
