import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { Stars } from '@/components/common/Stars'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { useState, useEffect } from 'react'
import { 
  Camera, Shield, Phone, Mail, MapPin, Calendar, Clock, 
  TrendingUp, Star, Edit, Share, Download, Copy, Settings,
  CheckCircle, AlertCircle, Users, Award, BarChart,
  Globe, MessageSquare, Eye, ExternalLink
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Profile() {
  const { profile, updateProfile, services, trades, fetchServices, fetchTrades } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    category: profile?.category || '',
    bio: '',
    working_hours: '9 AM - 5 PM',
    languages: 'English'
  })

  useEffect(() => {
    fetchServices()
    fetchTrades()
  }, [fetchServices, fetchTrades])

  if (!profile) return null

  const handleSave = async () => {
    const { error } = await updateProfile(formData)
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error
      })
      return
    }

    toast({
      title: 'Profile Updated',
      description: 'Your profile has been updated successfully.'
    })
    setIsEditing(false)
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  const completedTrades = trades.filter(trade => trade.status === 'completed').length
  const successRate = trades.length > 0 ? Math.round((completedTrades / trades.length) * 100) : 0

  const shareProfile = () => {
    navigator.share?.({
      title: `${profile.display_name}'s Profile`,
      url: window.location.href
    }) || navigator.clipboard.writeText(window.location.href)
    toast({ title: 'Profile link copied!' })
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        
        {/* Profile Header */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/5" />
          <CardContent className="relative p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-accent to-primary text-white">
                    {profile.display_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="sm" 
                  className="absolute -bottom-2 -right-2 rounded-full"
                  onClick={() => setIsEditing(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  {isEditing ? (
                    <Input 
                      value={formData.display_name}
                      onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                      className="text-3xl font-bold border-none p-0 h-auto"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold font-brand">{profile.display_name || 'Unnamed User'}</h1>
                  )}
                  <p className="text-muted-foreground">{profile.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Member since {memberSince}
                    </span>
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Stars score={profile.trust_score} />
                    <span className="font-semibold">{profile.trust_score / 20}/5</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {profile.verification_email && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {profile.verification_phone && <Phone className="h-4 w-4 text-green-500" />}
                    {profile.verification_cac && <Shield className="h-4 w-4 text-green-500" />}
                    <span className="text-sm text-muted-foreground">Verified</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button onClick={handleSave}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={shareProfile}>
                  <Share className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-accent">10</div>
              <p className="text-sm text-muted-foreground">Hours Balance</p>
              <TrendingUp className="h-4 w-4 text-green-500 mx-auto mt-1" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold">{completedTrades}</div>
              <p className="text-sm text-muted-foreground">Completed Trades</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold">2h</div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </CardContent>
          </Card>
        </div>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label>Bio</Label>
                  <Textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell others about yourself and your expertise..."
                    rows={4}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Input 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="e.g., Design, Development, Marketing"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <Label>Languages</Label>
                    <Input 
                      value={formData.languages}
                      onChange={(e) => setFormData({...formData, languages: e.target.value})}
                      placeholder="Languages you speak"
                    />
                  </div>
                  <div>
                    <Label>Working Hours</Label>
                    <Input 
                      value={formData.working_hours}
                      onChange={(e) => setFormData({...formData, working_hours: e.target.value})}
                      placeholder="e.g., 9 AM - 5 PM"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {formData.bio || "This user hasn't added a bio yet."}
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.category || 'Category not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.location || 'Location not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.languages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.working_hours}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Services Offered</CardTitle>
              <Button size="sm">Add Service</Button>
            </div>
          </CardHeader>
          <CardContent>
            {services.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Card key={service.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{service.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Stars score={85} />
                            <span className="text-sm">12 completed</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-semibold">${service.hourly_rate}/hr</span>
                            <Switch checked={service.availability} />
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No services offered yet. Add your first service to get started!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trades.slice(0, 5).map((trade) => (
                <div key={trade.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <div className="flex-1">
                    <p className="font-medium">Trade completed</p>
                    <p className="text-sm text-muted-foreground">
                      {trade.hours_offered} hours • {new Date(trade.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{trade.status}</Badge>
                </div>
              ))}
              {trades.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  )
}