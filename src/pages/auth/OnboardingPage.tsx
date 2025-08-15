import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const steps = [
  'Basic Information',
  'Location & Category', 
  'Complete Setup'
]

const categories = ['Legal', 'Tech', 'Creative', 'Fashion', 'Food', 'Professional']
const locations = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu']

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    category: '',
    location: ''
  })

  const { profile, updateProfile, completeOnboarding } = useAppStore()
  const navigate = useNavigate()

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Complete onboarding
      const { error: updateError } = await updateProfile(formData)
      
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
        return formData.display_name.trim() !== '' && formData.phone.trim() !== ''
      case 1:
        return formData.category !== '' && formData.location !== ''
      case 2:
        return true
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 xxx xxx xxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Primary Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your main expertise area" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
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
            <div className="text-center space-y-4">
              <div className="p-6 rounded-lg bg-secondary/50">
                <h4 className="font-semibold mb-2">Profile Summary</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>Name:</strong> {formData.display_name}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>Category:</strong> {formData.category}</p>
                  <p><strong>Location:</strong> {formData.location}</p>
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