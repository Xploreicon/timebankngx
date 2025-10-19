import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { NIGERIAN_CATEGORIES, getPopularCategories } from '@/config/categories'
import { timeCreditsService } from '@/services/timeCredits'
import { TrendingUp, Coins, Clock } from 'lucide-react'

const categories = NIGERIAN_CATEGORIES

export default function Services(){
  const { services, fetchServices, addService, user, isLoading } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [potentialEarnings, setPotentialEarnings] = useState<any>(null)
  const [editingService, setEditingService] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  useEffect(() => {
    if (category) {
      const earnings = timeCreditsService.calculateServicePotentialEarnings(category)
      setPotentialEarnings(earnings)
    } else {
      setPotentialEarnings(null)
    }
  }, [category])

  const myServices = useMemo(() =>
    services.filter(s => s.user_id === user?.id),
    [services, user?.id]
  )

  const popularCategories = getPopularCategories()

  const submit = async () => {
    if (!title || !category) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in title and category'
      })
      return
    }

    const { error } = await addService({ title, description, category })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error
      })
    } else {
      toast({
        title: 'Success',
        description: 'Service added successfully!'
      })
      setTitle('')
      setDescription('')
      setCategory('')
    }
  }

  const handleEditService = (service: any) => {
    setEditingService(service)
    setShowEditDialog(true)
  }

  const handleToggleAvailability = async (service: any) => {
    try {
      // TODO: Implement actual API call when backend is ready
      toast({
        title: service.availability ? 'Service Paused' : 'Service Activated',
        description: `"${service.title}" is now ${service.availability ? 'paused' : 'available'}`
      })
      // For now, just show the toast - real implementation would update the backend
      fetchServices()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update service availability'
      })
    }
  }

  const handleViewStats = (service: any) => {
    toast({
      title: 'Service Statistics',
      description: `Stats for "${service.title}" - Feature coming soon!`
    })
  }

  return (
    <Layout>
      <main className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Service</CardTitle>
            <CardDescription>Share your skills with the Nigerian business community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Service Title (e.g., 'Business Registration & CAC Documentation')"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Describe your service and what makes you qualified..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Popular in Nigeria</div>
                    {popularCategories.map(c => (
                      <SelectItem key={c.id} value={c.id} className="py-2">
                        <div className="flex items-center gap-2">
                          <span>{c.icon}</span>
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">All Categories</div>
                      {categories.filter(c => !c.popular).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </div>
                  </div>
                </SelectContent>
              </Select>
            </div>

            {potentialEarnings && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Earning Potential</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-green-600">Weekly Credits</div>
                    <div className="font-bold text-green-800">{potentialEarnings.weeklyCredits}</div>
                  </div>
                  <div>
                    <div className="text-green-600">Monthly Credits</div>
                    <div className="font-bold text-green-800">{potentialEarnings.monthlyCredits}</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 mt-2">
                  Rate: {potentialEarnings.categoryRate} credits/hour
                  (≈₦{(potentialEarnings.categoryRate * 1000).toLocaleString()}/hour equivalent)
                </div>
              </div>
            )}

            <Button onClick={submit} className="w-full" disabled={isLoading}>
              {isLoading ? 'Adding Service...' : 'Add Service'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Services</CardTitle>
            <CardDescription>Manage your offerings ({myServices.length} services)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myServices.map(s => {
                const category = categories.find(c => c.id === s.category || c.name === s.category)
                const earnings = timeCreditsService.calculateServicePotentialEarnings(s.category || 'professional')

                return (
                  <div key={s.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{category?.icon || '💼'}</div>
                        <div>
                          <h4 className="font-medium">{s.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {s.description || 'Professional service'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={s.availability ? 'default' : 'secondary'}>
                        {s.availability ? 'Available' : 'Paused'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Category</div>
                        <div className="font-medium">{category?.name || s.category}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rate</div>
                        <div className="font-medium">{earnings.categoryRate} credits/hr</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Equivalent</div>
                        <div className="font-medium">₦{(earnings.categoryRate * 1000).toLocaleString()}/hr</div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditService(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleAvailability(s)}
                      >
                        {s.availability ? 'Pause' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => handleViewStats(s)}
                      >
                        Stats
                      </Button>
                    </div>
                  </div>
                )
              })}

              {myServices.length === 0 && (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                  <div className="text-4xl mb-4">🚀</div>
                  <h4 className="font-medium mb-2">No services yet</h4>
                  <p className="text-sm">Add your first service to start trading time instead of money!</p>
                </div>
              )}

              {myServices.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Your Business Impact</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    You're helping build Nigeria's time-banking economy!
                    Your services can save other businesses thousands of naira in cash expenses.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit Service Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update your service details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Service title"
                defaultValue={editingService?.title}
              />
            </div>
            <div>
              <Textarea
                placeholder="Service description"
                defaultValue={editingService?.description}
                rows={3}
              />
            </div>
            <div>
              <Select defaultValue={editingService?.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO: Implement actual update logic when backend is ready
              toast({
                title: 'Service Updated',
                description: 'Feature coming soon - full edit functionality will be available after backend integration'
              })
              setShowEditDialog(false)
            }}>
              Update Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}