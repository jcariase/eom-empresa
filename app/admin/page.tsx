'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPlanStatus } from '@/lib/plan'

const ADMIN_EMAILS = ['jc0904@gmail.com', 'jarias@fen.uchile.cl']

type Empresa = {
  id: string
  user_id: string
  nombre: string
  rubro: string
  num_personas: number
  areas: string[]
  onboarding_completo: boolean
  ciclo_inicio: string
  created_at: string
  plan_activo: boolean
  plan_vence: string
  plan_nombre: string
  ultimoDiagnostico?: { score_total: number; estado: string; created_at: string }
}

type EmpresaPyme = {
  id: string
  user_id: string
  nombre: string
  plan: string
  trial_activo: boolean
  trial_ends_at: string | null
  activo: boolean
  created_at: string
}

function getEstadoColor(score: number) {
  if (score <= 35) return '#EF4444'
  if (score <= 55) return '#D97706'
  if (score <= 75) return '#2563EB'
  return '#16A34A'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminPage() {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [vista, setVista] = useState<'empresa' | 'pyme'>('empresa')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [pymes, setPymes] = useState<EmpresaPyme[]>([])
  const [filtroPyme, setFiltroPyme] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editPlan, setEditPlan] = useState<{ activo: boolean; nombre: string; vence: string }>({ activo: false, nombre: 'Consultoría', vence: '' })

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email || !ADMIN_EMAILS.includes(user.email)) { setAutorizado(false); return }
      setAutorizado(true)
      await cargarDatos()
    }
    check()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const { data: emp } = await supabase.from('empresas_empresa').select('*').order('created_at', { ascending: false })
    const { data: diags } = await supabase.from('diagnosticos_empresa').select('*').order('created_at', { ascending: false })
    const enriquecidas = (emp || []).map((e: any) => ({
      ...e,
      ultimoDiagnostico: diags?.find((d: any) => d.user_id === e.user_id)
        ? { score_total: diags.find((d: any) => d.user_id === e.user_id).score_total, estado: diags.find((d: any) => d.user_id === e.user_id).estado, created_at: diags.find((d: any) => d.user_id === e.user_id).created_at }
        : undefined
    }))
    setEmpresas(enriquecidas)

    const { data: pymeData } = await supabase.from('empresas_pyme').select('*').order('created_at', { ascending: false })
    setPymes((pymeData || []) as EmpresaPyme[])

    setLoading(false)
  }

  function abrirEdicionPlan(e: Empresa) {
    setEditando(e.user_id)
    setEditPlan({ activo: e.plan_activo, nombre: e.plan_nombre || 'Consultoría', vence: e.plan_vence || '' })
  }

  async function guardarPlan(userId: string) {
    setSaving(true)
    await supabase.from('empresas_empresa').update({
      plan_activo: editPlan.activo,
      plan_nombre: editPlan.nombre,
      plan_vence: editPlan.vence || null,
    }).eq('user_id', userId)
    await cargarDatos()
    setEditando(null)
    setSaving(false)
  }

  function estadoPlan(e: Empresa): { label: string; color: string } {
    const { estado, diasRestantes } = getPlanStatus(e)
    if (estado === 'pagado') return { label: `${e.plan_nombre || 'Plan'}${e.plan_vence ? ' · hasta ' + fmtDate(e.plan_vence) : ''}`, color: '#16A34A' }
    if (estado === 'piloto') return { label: `Piloto · ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`, color: '#D97706' }
    if (estado === 'vencido') return { label: 'Vencido', color: '#EF4444' }
    return { label: 'Pendiente', color: '#5A6888' }
  }

  const filtradas = empresas.filter(e =>
    (e.nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (e.rubro || '').toLowerCase().includes(filtro.toLowerCase())
  )

  const stats = {
    total: empresas.length,
    conDiag: empresas.filter(e => e.ultimoDiagnostico).length,
    activos: empresas.filter(e => e.plan_activo).length,
  }

  const pymesFiltradas = pymes.filter(p => (p.nombre || '').toLowerCase().includes(filtroPyme.toLowerCase()))

  function estadoPyme(p: EmpresaPyme): { label: string; color: string } {
    if (p.activo) return { label: 'Pagando', color: '#16A34A' }
    if (p.trial_activo && p.trial_ends_at) {
      const vencido = new Date(p.trial_ends_at).getTime() < Date.now()
      return vencido ? { label: 'Trial vencido', color: '#EF4444' } : { label: 'En trial', color: '#D97706' }
    }
    return { label: 'Dado de baja', color: '#5A6888' }
  }

  const statsPyme = {
    total: pymes.length,
    enTrial: pymes.filter(p => p.trial_activo && !p.activo && new Date(p.trial_ends_at || 0).getTime() >= Date.now()).length,
    pagando: pymes.filter(p => p.activo).length,
    bajaOVencido: pymes.filter(p => !p.activo && (!p.trial_activo || new Date(p.trial_ends_at || 0).getTime() < Date.now())).length,
  }

  if (autorizado === null) return <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6888', fontFamily: 'DM Sans,sans-serif', fontSize: 13 }}>Verificando...</div>
  if (!autorizado) return (
    <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'DM Sans,sans-serif' }}>
      <div style={{ color: '#E8EDF8', fontSize: 18 }}>Acceso restringido</div>
      <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 24px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#8A9AB8', cursor: 'pointer' }}>Volver</button>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#07090E;color:#E8EDF8;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .shell{max-width:1200px;margin:0 auto;padding:40px 24px}
        .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
        .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:#E8EDF8;margin-bottom:4px}
        .sub{font-size:14px;color:#8A9AB8}
        .btn-back{padding:8px 16px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:#8A9AB8;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer}
        .btn-back:hover{color:#E8EDF8}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.06);margin-bottom:24px}
        .stat{padding:20px;background:#0C0F18}
        .stat-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#5A6888;margin-bottom:8px}
        .stat-val{font-family:'Playfair Display',serif;font-size:32px;color:#E8EDF8;font-weight:400}
        .search{width:100%;padding:10px 14px;border:1px solid rgba(255,255,255,0.12);background:#0C0F18;color:#E8EDF8;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;margin-bottom:16px}
        .search::placeholder{color:#5A6888}
        .search:focus{border-color:#D97706}
        .table{border:1px solid rgba(255,255,255,0.06);overflow:hidden}
        .thead{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr 1.2fr;gap:12px;padding:12px 20px;background:#111520;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#5A6888}
        .trow{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr 1.2fr;gap:12px;padding:16px 20px;border-top:1px solid rgba(255,255,255,0.06);align-items:start;transition:background 0.15s}
        .trow:hover{background:#0C0F18}
        .empresa-nombre{font-size:14px;font-weight:500;color:#E8EDF8}
        .empresa-sub{font-size:12px;color:#5A6888;margin-top:2px}
        .score{font-family:'Playfair Display',serif;font-size:22px;font-weight:400}
        .badge{display:inline-block;padding:3px 10px;font-size:11px;font-family:'DM Mono',monospace;border:1px solid;border-radius:0}
        .plan-card{background:#1A2035;border:1px solid rgba(255,255,255,0.08);padding:12px;margin-top:4px}
        .plan-label{font-family:'DM Mono',monospace;font-size:10px;color:#5A6888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#8A9AB8;margin-bottom:10px}
        .toggle-row input{accent-color:#D97706;width:16px;height:16px;cursor:pointer}
        .field-small{width:100%;padding:7px 10px;border:1px solid rgba(255,255,255,0.12);background:#0C0F18;color:#E8EDF8;font-family:'DM Sans',sans-serif;font-size:12px;outline:none;margin-bottom:8px}
        .field-small:focus{border-color:#D97706}
        .btn-activar{padding:7px 14px;border:none;background:#D97706;color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;width:100%;margin-bottom:6px}
        .btn-activar:hover{background:#B45309}
        .btn-desactivar{padding:7px 14px;border:1px solid rgba(239,68,68,0.3);background:transparent;color:#EF4444;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;width:100%}
        .btn-desactivar:hover{background:rgba(239,68,68,0.1)}
        .btn-editar{padding:5px 10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:#8A9AB8;font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer}
        .btn-editar:hover{color:#E8EDF8;border-color:rgba(255,255,255,0.25)}
        .empty{padding:48px;text-align:center;color:#5A6888;font-size:14px}
        @media(max-width:900px){.thead{display:none}.trow{grid-template-columns:1fr;gap:8px;padding:16px}}
      `}</style>

      <div className="shell">
        <div className="header">
          <div>
            <div className="title">Panel de negocio</div>
            <div className="sub">EOM Empresa + EOM Pyme · gestión de usuarios</div>
          </div>
          <button className="btn-back" onClick={() => router.push('/dashboard')}>← Dashboard</button>
        </div>

        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 24, width: 'fit-content' }}>
          <button
            onClick={() => setVista('empresa')}
            style={{ padding: '9px 20px', border: 'none', background: vista === 'empresa' ? 'rgba(217,119,6,0.12)' : 'transparent', color: vista === 'empresa' ? '#D97706' : '#8A9AB8', fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.12)' }}
          >EOM Empresa</button>
          <button
            onClick={() => setVista('pyme')}
            style={{ padding: '9px 20px', border: 'none', background: vista === 'pyme' ? 'rgba(217,119,6,0.12)' : 'transparent', color: vista === 'pyme' ? '#D97706' : '#8A9AB8', fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: 'pointer' }}
          >EOM Pyme</button>
        </div>

        {vista === 'empresa' ? (
        <>
        <div className="stats">
          <div className="stat"><div className="stat-label">Registradas</div><div className="stat-val">{stats.total}</div></div>
          <div className="stat"><div className="stat-label">Con diagnóstico</div><div className="stat-val" style={{ color: '#D97706' }}>{stats.conDiag}</div></div>
          <div className="stat"><div className="stat-label">Planes activos</div><div className="stat-val" style={{ color: '#16A34A' }}>{stats.activos}</div></div>
        </div>

        <input className="search" placeholder="Buscar por nombre o rubro..." value={filtro} onChange={e => setFiltro(e.target.value)} />

        {loading ? <div className="empty">Cargando...</div> : filtradas.length === 0 ? <div className="empty">Sin empresas registradas aún.</div> : (
          <div className="table">
            <div className="thead">
              <div>Empresa</div>
              <div>Personas</div>
              <div>Score</div>
              <div>Estado</div>
              <div>Fecha ingreso</div>
              <div>Plan</div>
            </div>
            {filtradas.map(e => (
              <div key={e.id} className="trow">
                <div>
                  <div className="empresa-nombre">{e.nombre || 'Sin nombre'}</div>
                  <div className="empresa-sub">{e.rubro || 'Sin rubro'} · {e.areas?.length || 0} áreas</div>
                </div>
                <div style={{ fontSize: 14, color: '#8A9AB8' }}>{e.num_personas || '—'}</div>
                <div>
                  {e.ultimoDiagnostico
                    ? <span className="score" style={{ color: getEstadoColor(e.ultimoDiagnostico.score_total) }}>{e.ultimoDiagnostico.score_total}</span>
                    : <span style={{ fontSize: 12, color: '#5A6888' }}>Sin diagnóstico</span>}
                </div>
                <div>
                  {e.ultimoDiagnostico
                    ? <span className="badge" style={{ color: getEstadoColor(e.ultimoDiagnostico.score_total), borderColor: getEstadoColor(e.ultimoDiagnostico.score_total) + '44' }}>{e.ultimoDiagnostico.estado}</span>
                    : <span className="badge" style={{ color: '#5A6888', borderColor: 'rgba(255,255,255,0.1)' }}>{e.onboarding_completo ? 'Onboarding ok' : 'Incompleto'}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#8A9AB8' }}>{fmtDate(e.created_at)}</div>
                <div>
                  {(() => {
                    const est = estadoPlan(e)
                    return <span className="badge" style={{ color: est.color, borderColor: est.color + '44', marginBottom: 6, display: 'block' }}>{est.label}</span>
                  })()}

                  {editando === e.user_id ? (
                    <div className="plan-card">
                      <div className="plan-label">Editar plan</div>
                      <label className="toggle-row">
                        <span>Plan activo (pagado)</span>
                        <input type="checkbox" checked={editPlan.activo} onChange={ev => setEditPlan(p => ({ ...p, activo: ev.target.checked }))} />
                      </label>
                      <input className="field-small" placeholder="Nombre plan" value={editPlan.nombre} onChange={ev => setEditPlan(p => ({ ...p, nombre: ev.target.value }))} />
                      <input className="field-small" type="date" value={editPlan.vence} onChange={ev => setEditPlan(p => ({ ...p, vence: ev.target.value }))} />
                      <button className="btn-activar" onClick={() => guardarPlan(e.user_id)} disabled={saving}>{saving ? 'Guardando...' : 'Guardar →'}</button>
                      <button className="btn-desactivar" onClick={() => setEditando(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="btn-editar" onClick={() => abrirEdicionPlan(e)}>Editar plan</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        ) : (
        <>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="stat"><div className="stat-label">Registradas</div><div className="stat-val">{statsPyme.total}</div></div>
          <div className="stat"><div className="stat-label">En trial</div><div className="stat-val" style={{ color: '#D97706' }}>{statsPyme.enTrial}</div></div>
          <div className="stat"><div className="stat-label">Pagando</div><div className="stat-val" style={{ color: '#16A34A' }}>{statsPyme.pagando}</div></div>
          <div className="stat"><div className="stat-label">Baja / vencido</div><div className="stat-val" style={{ color: '#EF4444' }}>{statsPyme.bajaOVencido}</div></div>
        </div>

        <input className="search" placeholder="Buscar por nombre..." value={filtroPyme} onChange={e => setFiltroPyme(e.target.value)} />

        {loading ? <div className="empty">Cargando...</div> : pymesFiltradas.length === 0 ? <div className="empty">Sin empresas registradas aún.</div> : (
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
              <div>Empresa</div>
              <div>Plan</div>
              <div>Estado</div>
              <div>Fecha ingreso</div>
            </div>
            {pymesFiltradas.map(p => {
              const est = estadoPyme(p)
              return (
                <div key={p.id} className="trow" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                  <div className="empresa-nombre">{p.nombre || 'Sin nombre'}</div>
                  <div style={{ fontSize: 13, color: '#8A9AB8' }}>{p.plan || '—'}</div>
                  <div>
                    <span className="badge" style={{ color: est.color, borderColor: est.color + '44' }}>{est.label}</span>
                    {p.trial_activo && p.trial_ends_at && !p.activo && (
                      <div style={{ fontSize: 11, color: '#5A6888', marginTop: 4 }}>vence {fmtDate(p.trial_ends_at)}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9AB8' }}>{fmtDate(p.created_at)}</div>
                </div>
              )
            })}
          </div>
        )}
        </>
        )}
      </div>
    </>
  )
}
