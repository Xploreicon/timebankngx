import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/integrations/supabase/client'

export const useAuth = () => {
  const { 
    session,
    user, 
    profile,
    isAuthenticated, 
    isOnboarded,
    setAuth,
    setProfile
  } = useAppStore()

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuth(session, session?.user ?? null)
        
        // Fetch profile when user signs in
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            setProfile(profileData)
          }, 0)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth(session, session.user)
        
        // Fetch profile for existing session
        setTimeout(async () => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          setProfile(profileData)
        }, 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [setAuth, setProfile])

  return {
    session,
    user,
    profile,
    isAuthenticated,
    isOnboarded
  }
}