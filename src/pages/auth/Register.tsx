import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import type { Category } from '@/types'

const categories: Category[] = ['Legal','Tech','Creative','Fashion','Food','Professional']

export default function Register(){
  const register = useAppStore(s=>s.register)
  const navigate = useNavigate()
  const [form, setForm] = useState({ businessName:'', phone:'', email:'', category: 'Tech' as Category, location: 'Lagos' })

  const submit = () => {
    if(!form.businessName) return
    register(form)
    navigate('/onboarding')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-lg p-6 rounded-xl border space-y-4">
        <h1 className="font-brand text-2xl">Create your business account</h1>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="px-3 py-2 rounded-md border" placeholder="Business Name" value={form.businessName} onChange={e=>setForm({...form, businessName:e.target.value})}/>
          <input className="px-3 py-2 rounded-md border" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
          <input className="px-3 py-2 rounded-md border md:col-span-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <select className="px-3 py-2 rounded-md border" value={form.category} onChange={e=>setForm({...form, category: e.target.value as Category})}>
            {categories.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2 rounded-md border" value={form.location} onChange={e=>setForm({...form, location: e.target.value})}>
            {['Lagos','Abuja','Port Harcourt','Kano'].map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={submit} className="w-full px-4 py-2 rounded-md bg-accent text-accent-foreground">Create Account</button>
      </div>
    </main>
  )
}
