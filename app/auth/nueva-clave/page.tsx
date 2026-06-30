'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NuevaClave() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sesionValida, setSesionValida] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesionValida(!!data.session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('No pudimos actualizar tu contraseña. Intenta de nuevo o pide un nuevo link.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
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
        .title{font-family:'Playfair Display',serif;font-size:24px;font-weight:400;margin-bottom:8px}
        .sub{font-size:13px;color:#8A9AB8;margin-bottom:24px;line-height:1.5}
        .field{width:100%;padding:12px 16px;border:1px solid rgba(255,255,255,0.12);background:#111520;color:#E8EDF8;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;margin-bottom:12px}
        .field:focus{border-color:#D97706}
        .field::placeholder{color:#5A6888}
        .btn{width:100%;padding:14px;border:none;background:#D97706;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;margin-top:4px}
        .btn:hover{background:#B45309}
        .btn:disabled{opacity:0.5;cursor:not-allowed}
        .error{font-size:13px;color:#EF4444;margin-bottom:12px}
        .success{font-size:14px;color:#4ADE80;text-align:center;padding:20px 0}
      `}</style>
      <div className="card">
        <div className="wordmark"><div className="mark">E</div>EOM OS Empresa</div>

        {sesionValida === null && (
          <p className="sub">Verificando link...</p>
        )}

        {sesionValida === false && (
          <>
            <div className="title">Link inválido o vencido</div>
            <p className="sub">Este link de recuperación ya no es válido. Pide uno nuevo desde la pantalla de ingreso.</p>
            <button className="btn" onClick={() => router.push('/auth')}>Volver a ingresar →</button>
          </>
        )}

        {sesionValida === true && !success && (
          <>
            <div className="title">Crear nueva contraseña</div>
            <p className="sub">Ingresa tu nueva contraseña para tu cuenta de EOM OS Empresa.</p>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <input className="field" type="password" placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
              <input className="field" type="password" placeholder="Confirmar contraseña" value={confirmar} onChange={e => setConfirmar(e.target.value)} required />
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar nueva contraseña →'}</button>
            </form>
          </>
        )}

        {success && (
          <div className="success">✓ Contraseña actualizada. Redirigiendo a tu dashboard...</div>
        )}
      </div>
    </>
  )
}
