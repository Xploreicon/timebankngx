import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [identifier, setIdentifier] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState('')
  const login = useAppStore(s=>s.login)
  const verify = useAppStore(s=>s.verifyOtp)
  const navigate = useNavigate()

  const send = () => {
    if(!identifier) return
    const res = login(identifier)
    if(res.otpSent) setOtpSent(true)
  }

  const confirm = () => {
    if(verify(code)) navigate('/onboarding')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md p-6 rounded-xl border">
        <h1 className="font-brand text-2xl">Welcome back</h1>
        {!otpSent ? (
          <div className="mt-6 space-y-3">
            <input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Phone or Email" className="w-full px-3 py-2 rounded-md border"/>
            <button onClick={send} className="w-full px-4 py-2 rounded-md bg-accent text-accent-foreground">Send OTP</button>
            <p className="text-xs text-muted-foreground">Demo code: 123456</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter OTP" className="w-full px-3 py-2 rounded-md border"/>
            <button onClick={confirm} className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground">Verify & Continue</button>
          </div>
        )}
      </div>
    </main>
  )
}
