import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAppStore, type Profile } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { NIGERIAN_CATEGORIES } from '@/config/categories'

const steps = [
  'Basic Information',
  'Location & Category',
  'Email Verification',
  'Complete Setup'
]

const categories = NIGERIAN_CATEGORIES.map(category => ({
  label: category.name,
  id: category.id,
  icon: category.icon
}))

const locations = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    category: '',
    location: '',
    needs: [] as string[]
  })
  const [stepInitialized, setStepInitialized] = useState(false)

  const { profile, updateProfile, completeOnboarding, setProfile, user } = useAppStore()
  const navigate = useNavigate()
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)

  const isEmailVerified = useMemo(() => {
    if (!profile) return false
    return profile.email_verified ?? false
  }, [profile])

  useEffect(() => {
    if (!profile) return
    setFormData(prev => ({
      display_name: prev.display_name || profile.display_name || '',
      phone: profile.phone || prev.phone || '',
      category: prev.category || profile.category || '',
      location: prev.location || profile.location || '',
      needs: prev.needs.length ? prev.needs : (profile.needs || [])
    }))
  }, [profile])

  useEffect(() => {
    if (!profile || stepInitialized) return

    let nextStep = 0

    if ((profile.display_name && profile.display_name.trim() !== '') && (profile.needs?.length ?? 0) > 0) {
      nextStep = 1
    }

    if (profile.category && profile.location) {
      nextStep = 2
    }

    if (profile.email_verified ?? false) {
      nextStep = 3
    }

    setCurrentStep(nextStep)
    setStepInitialized(true)
  }, [profile, stepInitialized])

  const toggleNeed = (value: string) => {
    setFormData(prev => {
      const exists = prev.needs.includes(value)
      return {
        ...prev,
        needs: exists ? prev.needs.filter(item => item !== value) : [...prev.needs, value]
      }
    })
  }

  const getCategoryLabel = (id: string) => categories.find(item => item.id === id)?.label || id
  const selectedCategoryLabel = getCategoryLabel(formData.category)
  const selectedNeedsLabel = formData.needs.length
    ? formData.needs.map(getCategoryLabel).join(', ')
    : 'Not provided'

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Complete onboarding
      const updates: Partial<Profile> = {
        display_name: formData.display_name.trim(),
      }

      if (formData.category) {
        updates.category = formData.category
      }

      if (formData.location) {
        updates.location = formData.location
      }

      if (formData.phone) {
        updates.phone = formData.phone
      }

      if (formData.needs && formData.needs.length > 0) {
        updates.needs = formData.needs
      } else {
        updates.needs = []
      }

      let { error: updateError } = await updateProfile(updates)

      if (updateError && updateError.includes('column "needs"')) {
        // Retry without needs column for older databases
        const { needs: _ignored, ...fallbackUpdates } = updates
        updateError = (await updateProfile(fallbackUpdates)).error
      }
      
      if (updateError) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: updateError
        })
        return
      }

      const { error: completeError } = await completeOnboarding()
      
      if (completeError) {
        toast({
          variant: 'destructive',
          title: 'Onboarding Failed',
          description: completeError
        })
        return
      }

      toast({
        title: 'Welcome to TimeBank!',
        description: 'Your profile has been set up successfully.'
      })
      
      navigate('/dashboard')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.display_name.trim() !== '' && formData.needs.length > 0
      case 1:
        return formData.category !== '' && formData.location !== ''
      case 2:
        return true
      case 3:
        return (
          formData.display_name.trim() !== '' &&
          formData.category !== '' &&
          formData.location !== ''
        )
      default:
        return false
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/80 to-secondary/20 px-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-brand">
              Setup Your Profile
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{steps[currentStep]}</h3>
          </div>

          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  placeholder="How should others see your name?"
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 xxx xxx xxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>What do you need help with?</Label>
                <p className="text-xs text-muted-foreground">
                  Select at least one area where you&apos;d like support from the community.
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(option => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={formData.needs.includes(option.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleNeed(option.id)}
                    >
                      <span className="mr-1">{option.icon}</span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Primary Category</Label>
    <Select
      value={formData.category || ''}
      onValueChange={(value) => setFormData({...formData, category: value})}
    >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your main expertise area" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="mr-2">{category.icon}</span>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={formData.location || ''} onValueChange={(value) => setFormData({...formData, location: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h4 className="font-medium">Verify Your Email Address</h4>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to <strong>{profile?.email ?? 'your email address'}</strong>. Please click the link to verify your account before continuing.
                </p>
              </div>

              {isEmailVerified ? (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 text-center">
                  Your email is verified. You can proceed to the final step.
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isResendingEmail || !profile?.email}
                    onClick={async () => {
                      if (!profile?.email) {
                        toast({
                          variant: 'destructive',
                          title: 'Email unavailable',
                          description: 'Please contact support to update your email address.'
                        })
                        return
                      }

                      try {
                        setIsResendingEmail(true)
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
                        console.error('Resend verification email failed:', error)
                        toast({
                          variant: 'destructive',
                          title: 'Unable to send email',
                          description: error instanceof Error ? error.message : 'Please try again later.'
                        })
                      } finally {
                        setIsResendingEmail(false)
                      }
                    }}
                  >
                    {isResendingEmail ? 'Sending…' : 'Resend Verification Email'}
                  </Button>

                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={isRefreshingStatus || !user}
                    onClick={async () => {
                      if (!user) return

                      try {
                        setIsRefreshingStatus(true)
                        const { data, error } = await supabase
                          .from('profiles')
                          .select('*')
                          .eq('id', user.id)
                          .single()

                        if (error) throw error

                        setProfile(data as Profile)

                        toast({
                          title: data?.email_verified ? 'Email verified!' : 'Still waiting…',
                          description: data?.email_verified
                            ? 'Thanks for confirming. You can proceed.'
                            : 'We haven’t detected a verification yet. After clicking the email link, press this button again.'
                        })
                      } catch (error) {
                        console.error('Refresh verification status failed:', error)
                        toast({
                          variant: 'destructive',
                          title: 'Unable to refresh status',
                          description: error instanceof Error ? error.message : 'Please try again later.'
                        })
                      } finally {
                        setIsRefreshingStatus(false)
                      }
                    }}
                  >
                    {isRefreshingStatus ? 'Checking…' : "I've verified my email"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Didn’t get the message? Ensure your email is correct, check spam, then resend or refresh the status above.
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-4">
              <div className="p-6 rounded-lg bg-secondary/50">
                <h4 className="font-semibold mb-2">Profile Summary</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>Name:</strong> {formData.display_name}</p>
                  <p><strong>Email:</strong> {profile?.email ?? 'Not provided'}</p>
                  <p><strong>Phone:</strong> {profile?.phone || formData.phone || 'Not provided'}</p>
                  <p><strong>Category:</strong> {selectedCategoryLabel || 'Not set'}</p>
                  <p><strong>Location:</strong> {formData.location}</p>
                  <p><strong>Needs:</strong> {selectedNeedsLabel}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You're all set! Click finish to complete your profile setup.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
