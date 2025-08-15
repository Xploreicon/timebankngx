import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'
import { Stars } from '@/components/common/Stars'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { Camera, Shield, Phone, Mail, MapPin } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Profile() {
  const { profile, updateProfile } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    category: profile?.category || ''
  })

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

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-brand">Profile</CardTitle>
              <Button 
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                  {profile.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                {isEditing && (
                  <button className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-white rounded-full">
                    <Camera className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{profile.display_name || 'Unnamed User'}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                {isEditing ? (
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="p-2 border rounded-lg flex-1">
                      {profile.display_name || 'Not specified'}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="p-2 border rounded-lg flex-1">
                      {profile.phone || 'Not specified'}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                {isEditing ? (
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="p-2 border rounded-lg flex-1">
                      {profile.location || 'Not specified'}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                {isEditing ? (
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                ) : (
                  <div className="p-2 border rounded-lg">
                    {profile.category || 'Not specified'}
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            )}

            {/* Trust Score & Verification */}
            <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Trust Score
                </h4>
                <div className="flex items-center justify-between">
                  <Stars score={profile.trust_score} />
                  <span className="text-lg font-semibold">{profile.trust_score}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Verification Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email</span>
                    <Badge variant={profile.verification_email ? "default" : "secondary"}>
                      {profile.verification_email ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Phone</span>
                    <Badge variant={profile.verification_phone ? "default" : "secondary"}>
                      {profile.verification_phone ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Business (CAC)</span>
                    <Badge variant={profile.verification_cac ? "default" : "secondary"}>
                      {profile.verification_cac ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}