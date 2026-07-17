'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CONTACT_EMAIL } from '@/lib/plan'

export default function PlanVencidoPage() {
  const router = useRouter()

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--txt-1);font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .card{width:100%;max-width:440px;padding:48px 40px;background:var(--surf-2);border:1px solid var(--brd)}
        .wordmark{font-family:'Playfair Display',serif;font-size:18px;color:var(--txt-1);margin-bottom:32px;display:flex;align-items:center;gap:8px}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace}
        .badge{display:inline-block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber);border:1px solid var(--amber-border);background:var(--amber-dim);padding:4px 10px;margin-bottom:20px}
        .title{font-family:'Playfair Display',serif;font-size:24px;font-weight:400;margin-bottom:16px}
        .body{font-size:14px;color:var(--txt-3);line-height:1.7;margin-bottom:32px}
        .actions{display:flex;flex-direction:column;gap:10px}
        .btn{width:100%;padding:14px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;text-align:center;text-decoration:none;display:block}
        .btn:hover{opacity:0.9}
        .btn-secondary{width:100%;padding:14px;border:1px solid var(--brd-2);background:transparent;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer}
        .btn-secondary:hover{color:var(--txt-1)}
      `}</style>
      <div className="card">
        <div className="wordmark"><div className="mark">E</div>EOM OS Empresa</div>
        <div className="badge">Plan vencido</div>
        <div className="title">Tu período terminó</div>
        <p className="body">
          El período acordado terminó. Todos tus datos están guardados y disponibles apenas renueves tu plan.
        </p>
        <div className="actions">
          <a className="btn" href={`mailto:${CONTACT_EMAIL}`}>Renovar plan →</a>
          <button className="btn-secondary" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>
    </>
  )
}
