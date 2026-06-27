'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login'|'register'>(params.get('mode')==='register'?'register':'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'register') {
      const {error} = await supabase.auth.signUp({email, password})
      if (error) setError(error.message)
      else { setSuccess('Cuenta creada. Revisa tu email para confirmar.'); setTimeout(()=>router.push('/onboarding'),2000) }
    } else {
      const {error} = await supabase.auth.signInWithPassword({email, password})
      if (error) setError('Email o contraseña incorrectos')
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#07090E;color:#E8EDF8;font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .card{width:100%;max-width:400px;padding:48px 40px;background:#0C0F18;border:1px solid rgba(255,255,255,0.06)}
        .wordmark{font-family:'Playfair Display',serif;font-size:18px;color:#E8EDF8;margin-bottom:32px;display:flex;align-items:center;gap:8px}
        .mark{width:24px;height:24px;border-radius:5px;background:#D97706;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace}
        .title{font-family:'Playfair Display',serif;font-size:24px;font-weight:400;margin-bottom:24px}
        .field{width:100%;padding:12px 16px;border:1px solid rgba(255,255,255,0.12);background:#111520;color:#E8EDF8;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;margin-bottom:12px;border-radius:0}
        .field:focus{border-color:#D97706}
        .field::placeholder{color:#5A6888}
        .btn{width:100%;padding:14px;border:none;background:#D97706;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;margin-top:4px;border-radius:0}
        .btn:hover{background:#B45309}
        .btn:disabled{opacity:0.5;cursor:not-allowed}
        .error{font-size:13px;color:#EF4444;margin-bottom:12px}
        .success{font-size:13px;color:#4ADE80;margin-bottom:12px}
        .switch{font-size:13px;color:#5A6888;margin-top:20px;text-align:center}
        .switch a{color:#D97706;cursor:pointer;text-decoration:none}
        .switch a:hover{color:#FCD34D}
      `}</style>
      <div className="card">
        <div className="wordmark"><div className="mark">E</div>EOM OS Empresa</div>
        <div className="title">{mode==='register'?'Crear cuenta':'Ingresar'}</div>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <input className="field" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button className="btn" type="submit" disabled={loading}>{loading?'...':(mode==='register'?'Crear cuenta →':'Ingresar →')}</button>
        </form>
        <div className="switch">
          {mode==='register'?<>¿Ya tienes cuenta? <a onClick={()=>setMode('login')}>Ingresar</a></>:<>¿No tienes cuenta? <a onClick={()=>setMode('register')}>Registrarse</a></>}
        </div>
      </div>
    </>
  )
}
