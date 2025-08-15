import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Settings(){
  const { signOut } = useAppStore()
  
  return (
    <AppShell>
      <main className="max-w-xl mx-auto space-y-6">
        <h2 className="font-brand text-2xl">Settings</h2>
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={signOut} variant="destructive">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}
