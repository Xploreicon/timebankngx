import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAppStore } from '@/store/appStore'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { isOnboarded } = useAppStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Fetch user profile to check onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_onboarded')
          .eq('id', session.user.id)
          .single()
        
        if (profile?.is_onboarded) {
          navigate('/dashboard')
        } else {
          navigate('/onboarding')
        }
      } else if (event === 'SIGNED_OUT') {
        navigate('/auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}