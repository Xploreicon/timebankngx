import AppShell from '@/components/layout/AppShell'
import { useAppStore } from '@/store/appStore'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const categories = ['Legal','Tech','Creative','Fashion','Food','Professional']

export default function Discover(){
  const services = useAppStore(s => s.services)
  const users = useAppStore(s => s.users)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('')

  const filtered = useMemo(() => services.filter(s =>
    (!cat || s.category===cat) && (s.title.toLowerCase().includes(q.toLowerCase()) || s.description.toLowerCase().includes(q.toLowerCase()))
  ), [services, q, cat])

  const loopFound = filtered.length > 4

  return (
    <AppShell>
      <main className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="hidden lg:block border rounded-lg p-4 h-fit sticky top-20">
          <h3 className="font-semibold mb-3">Filters</h3>
          <div className="space-y-3">
            <Select onValueChange={setCat}>
              <SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </aside>
        <section>
          <div className="flex gap-3 mb-4">
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search services" />
            <div className="lg:hidden w-40">
              <Select onValueChange={setCat}>
                <SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loopFound && (
            <div className="mb-4 p-4 rounded-lg border bg-secondary text-secondary-foreground">
              Loop match detected: multiple services complement each other. Start a trade!
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => {
              const provider = users.find(u=>u.id===s.userId)
              return (
                <article key={s.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="aspect-video w-full rounded-md bg-gradient-to-br from-accent/30 to-primary/5 mb-3" />
                  <h4 className="font-semibold">{s.title}</h4>
                  <p className="text-sm text-muted-foreground">{provider?.businessName}</p>
                  <p className="text-xs mt-2">Exchange: 1 hr for 1 hr</p>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </AppShell>
  )
}
