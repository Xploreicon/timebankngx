import { useState, type Dispatch, type SetStateAction } from 'react'
import { useAppStore } from '@/store/appStore'
import AppShell from '@/components/layout/AppShell'

export default function Onboarding(){
  const complete = useAppStore(s=>s.completeOnboarding)
  const [step, setStep] = useState(1)
  const [services, setServices] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])

  const add = (setter: Dispatch<SetStateAction<string[]>>, value: string) => {
    if(!value) return
    setter(prev => (prev.includes(value)? prev : [...prev, value]).slice(0,5))
  }

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${(step/3)*100}%` }} />
          </div>
          <p className="text-sm mt-2">Step {step} of 3</p>
        </div>

        {step===1 && (
          <section className="space-y-4 border rounded-lg p-4">
            <h2 className="font-brand text-xl">Choose your category & location</h2>
            <div className="grid grid-cols-2 gap-3">
              <select className="px-3 py-2 rounded-md border">
                {['Legal','Tech','Creative','Fashion','Food','Professional'].map(c=> <option key={c}>{c}</option>)}
              </select>
              <select className="px-3 py-2 rounded-md border">
                {['Lagos','Abuja','Port Harcourt','Kano'].map(c=> <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={()=>setStep(2)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Next</button>
            </div>
          </section>
        )}

        {step===2 && (
          <section className="space-y-4 border rounded-lg p-4">
            <h2 className="font-brand text-xl">Add 3–5 services you offer</h2>
            <ServiceAdder onAdd={(v)=>add(setServices, v)} items={services} />
            <div className="flex justify-between">
              <button onClick={()=>setStep(1)} className="px-4 py-2 rounded-md border">Back</button>
              <button onClick={()=>setStep(3)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Next</button>
            </div>
          </section>
        )}

        {step===3 && (
          <section className="space-y-4 border rounded-lg p-4">
            <h2 className="font-brand text-xl">Select services you need</h2>
            <ServiceAdder onAdd={(v)=>add(setNeeds, v)} items={needs} />
            <div className="flex justify-between">
              <button onClick={()=>setStep(2)} className="px-4 py-2 rounded-md border">Back</button>
              <button onClick={()=>{complete()}} className="px-4 py-2 rounded-md bg-accent text-accent-foreground">Finish</button>
            </div>
          </section>
        )}
      </main>
    </AppShell>
  )
}

function ServiceAdder({ onAdd, items }:{ onAdd:(v:string)=>void, items:string[] }){
  const [value, setValue] = useState('')
  return (
    <div>
      <div className="flex gap-2">
        <input value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g., Logo Design" className="flex-1 px-3 py-2 rounded-md border" />
        <button onClick={()=>{onAdd(value); setValue('')}} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground">Add</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i,idx)=> <span key={idx} className="px-2 py-1 rounded-full bg-muted text-xs">{i}</span>)}
      </div>
    </div>
  )
}
