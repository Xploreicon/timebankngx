import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'
import { Stars } from '@/components/common/Stars'

export default function Profile(){
  const user = useAppStore(s=>s.currentUser)
  if(!user) return null
  return (
    <AppShell>
      <main className="max-w-2xl mx-auto space-y-4">
        <div className="p-6 rounded-xl border">
          <h2 className="font-brand text-2xl">{user.businessName}</h2>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{user.email}</span>
            <span>•</span>
            <span>{user.phone}</span>
            <span>•</span>
            <span>{user.location}</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>⏰ {user.timeCredits} hrs</div>
            <Stars score={user.trustScore} />
            <div className={`text-xs px-2 py-1 rounded ${user.verificationStatus? 'bg-secondary' : 'bg-muted'}`}>{user.verificationStatus? 'Verified':'Unverified'}</div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
