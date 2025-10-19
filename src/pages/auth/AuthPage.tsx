import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { NIGERIAN_CATEGORIES } from '@/config/categories'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [signInForm, setSignInForm] = useState({ email: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    category: '',
    location: '',
    needs: [] as string[]
  })

  const categories = NIGERIAN_CATEGORIES.map(category => ({
    id: category.id,
    label: category.name,
    icon: category.icon
  }))

  const locations = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
    'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
  ]

  const toggleNeed = (value: string) => {
    setSignUpForm(prev => {
      const exists = prev.needs.includes(value)
      return {
        ...prev,
        needs: exists ? prev.needs.filter(item => item !== value) : [...prev.needs, value]
      }
    })
  }
  
  const { signIn, signUp } = useAppStore()
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await signIn(signInForm.email, signInForm.password)
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: error
        })
        return
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.'
      })
      
      navigate('/dashboard')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'Passwords do not match'
      })
      return
    }

    if (!signUpForm.displayName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing name',
        description: 'Please provide your display name.'
      })
      return
    }

    if (!signUpForm.category) {
      toast({
        variant: 'destructive',
        title: 'Select a category',
        description: 'Let others know what service you offer.'
      })
      return
    }

    if (signUpForm.needs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'What do you need?',
        description: 'Select at least one area where you need help so we can match you.'
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signUp({
        email: signUpForm.email,
        password: signUpForm.password,
        displayName: signUpForm.displayName,
        category: signUpForm.category,
        location: signUpForm.location,
        needs: signUpForm.needs,
        phone: signUpForm.phone
      })
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: error
        })
        return
      }

      toast({
        title: 'Account Created!',
        description: 'Please check your email to verify your account.'
      })

      setSignUpForm({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        phone: '',
        category: '',
        location: '',
        needs: []
      })
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/80 to-secondary/20 px-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-brand text-center">
            Welcome to TimeBank
          </CardTitle>
          <CardDescription className="text-center">
            Trade your skills, grow your network
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-9"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm({...signInForm, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm({...signInForm, password: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      className="pl-9"
                      value={signUpForm.displayName}
                      onChange={(e) => setSignUpForm({...signUpForm, displayName: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-9"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm({...signUpForm, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm({...signUpForm, password: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm({...signUpForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number (optional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+234 xxx xxx xxxx"
                    value={signUpForm.phone}
                    onChange={(e) => setSignUpForm({...signUpForm, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>What do you need help with?</Label>
                  <p className="text-xs text-muted-foreground">
                    Select at least one area where you&apos;d like support from the community.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        type="button"
                        variant={signUpForm.needs.includes(category.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleNeed(category.id)}
                      >
                        <span className="mr-1">{category.icon}</span>
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Primary Category</Label>
                  <Select
                    value={signUpForm.category || ''}
                    onValueChange={(value) => setSignUpForm({...signUpForm, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select the service you offer" />
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
                  <Label>Location</Label>
                  <Select
                    value={signUpForm.location || ''}
                    onValueChange={(value) => setSignUpForm({...signUpForm, location: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
