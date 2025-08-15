import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

const categories = ['Legal','Tech','Creative','Fashion','Food','Professional']

export default function Services(){
  const { services, fetchServices, addService, user, isLoading } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const myServices = useMemo(() => 
    services.filter(s => s.user_id === user?.id), 
    [services, user?.id]
  )

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

  return (
    <AppShell>
      <main className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Service</CardTitle>
            <CardDescription>Offer your skills to the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input 
                placeholder="Service Title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
              />
            </div>
            <div>
              <Textarea 
                placeholder="Service Description" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
              />
            </div>
            <div>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submit} className="w-full" disabled={isLoading}>
              Add Service
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Services</CardTitle>
            <CardDescription>Manage your offerings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myServices.map(s => (
                <div key={s.id} className="p-3 rounded-md border flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                    <Badge variant="secondary" className="mt-1">{s.category}</Badge>
                  </div>
                  <Badge variant={s.availability ? 'default' : 'secondary'}>
                    {s.availability ? 'Available' : 'Paused'}
                  </Badge>
                </div>
              ))}
              {myServices.length === 0 && (
                <div className="text-center p-6 text-muted-foreground">
                  No services yet. Add your first service above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}