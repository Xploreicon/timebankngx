import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'
import { useState } from 'react'

export default function Services(){
  const services = useAppStore(s=>s.services.filter(x=>x.userId===s.currentUser?.id))
  const addService = useAppStore(s=>s.addService)
  const toggle = useAppStore(s=>s.toggleServiceAvailability)
  const currentUser = useAppStore(s=>s.currentUser)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const submit = () => {
    if(!currentUser || !title) return
    addService({ userId: currentUser.id, title, description, category: currentUser.category, hourlyRate: 1, availability: true, skillLevel: 'Intermediate' })
    setTitle(''); setDescription('')
  }

  return (
    <AppShell>
      <main className="grid lg:grid-cols-2 gap-6">
        <section className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Add Service</h3>
          <div className="space-y-3">
            <input className="w-full px-3 py-2 rounded-md border" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="w-full px-3 py-2 rounded-md border" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
            <button onClick={submit} className="px-4 py-2 rounded-md bg-accent text-accent-foreground">Save</button>
          </div>
        </section>
        <section className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">My Services</h3>
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="p-3 rounded-md border flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
                <button onClick={()=>toggle(s.id)} className={`px-3 py-1 rounded ${s.availability ? 'bg-secondary' : 'bg-muted'}`}>{s.availability? 'Available':'Paused'}</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  )
}
