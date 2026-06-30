'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = ['jc0904@gmail.com', 'jarias@fen.uchile.cl']

type EmpresaConDiag = {
  id: string
  user_id: string
  nombre: string
  rubro: string
  num_personas: number
  areas: string[]
  onboarding_completo: boolean
  ciclo_inicio: string
  created_at: string
  ultimoDiagnostico?: {
    score_total: number
    estado: string
    created_at: string
  }
  userEmail?: string
}

function getEstadoColor(score: number) {
  if (score <= 35) return '#EF4444'
  if (score <= 55) return '#D97706'
  if (score <= 75) return '#2563EB'
  return '#16A34A'
}

export default function AdminPage() {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaConDiag[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [orden, setOrden] = useState<'recientes' | 'score'>('recientes')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
        setAutorizado(false)
        return
      }
      setAutorizado(true)
      await cargarDatos()
    }
    check()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const { data: empresasData } = await supabase
      .from('empresas_empresa')
      .select('*')
      .order('created_at', { ascending: false })

    if (!empresasData) { setLoading(false); return }

    const { data: diagnosticosData } = await supabase
      .from('diagnosticos_empresa')
      .select('*')
      .order('created_at', { ascending: false })

    const enriquecidas: EmpresaConDiag[] = empresasData.map((emp: any) => {
      const diag = diagnosticosData?.find((d: any) => d.user_id === emp.user_id)
      return {
        ...emp,
        ultimoDiagnostico: diag ? {
          score_total: diag.score_total,
          estado: diag.estado,
          created_at: diag.created_at,
        } : undefined,
      }
    })

    setEmpresas(enriquecidas)
    setLoading(false)
  }

  const totalEmpresas = empresas.length
  const conDiagnostico = empresas.filter(e => e.ultimoDiagnostico).length
  const onboardingCompleto = empresas.filter(e => e.onboarding_completo).length

  const empresasFiltradas = empresas
    .filter(e => e.nombre?.toLowerCase().includes(filtro.toLowerCase()) || e.rubro?.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => {
      if (orden === 'score') {
        return (b.ultimoDiagnostico?.score_total || -1) - (a.ultimoDiagnostico?.score_total || -1)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (autorizado === null) return <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6888', fontFamily: 'DM Sans,sans-serif', fontSize: 13 }}>Verificando acceso...</div>

  if (autorizado === false) return (
    <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'DM Sans,sans-serif' }}>
      <div style={{ color: '#E8EDF8', fontSize: 18 }}>Acceso restringido</div>
      <div style={{ color: '#5A6888', fontSize: 13 }}>Esta página es solo para administradores.</div>
      <button onClick={() => router.push('/dashboard')} style={{ marginTop: 12, padding: '10px 24px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#8A9AB8', cursor: 'pointer' }}>Volver al dashboard</button>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#07090E;color:#E8EDF8;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .shell{max-width:1100px;margin:0 auto;padding:40px 24px}
        .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px}
        .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:#E8EDF8;margin-bottom:4px}
        .sub{font-size:14px;color:#8A9AB8}
        .btn-back{padding:8px 16px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:#8A9AB8;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer}
        .btn-back:hover{color:#E8EDF8;border-color:rgba(255,255,255,0.25)}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.06);margin-bottom:28px}
        .stat{padding:20px;background:#0C0F18}
        .stat-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#5A6888;margin-bottom:8px}
        .stat-val{font-family:'Playfair Display',serif;font-size:32px;color:#E8EDF8;font-weight:400}
        .controls{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .search{flex:1;min-width:200px;padding:9px 14px;border:1px solid rgba(255,255,255,0.12);background:#0C0F18;color:#E8EDF8;font-family:'DM Sans',sans-serif;font-size:13px;outline:none}
        .search::placeholder{color:#5A6888}
        .search:focus{border-color:#D97706}
        .sort-select{padding:9px 14px;border:1px solid rgba(255,255,255,0.12);background:#0C0F18;color:#8A9AB8;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer}
        .table-wrap{border:1px solid rgba(255,255,255,0.06)}
        .row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1.4fr;gap:16px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);align-items:center;transition:background 0.15s}
        .row:last-child{border-bottom:none}
        .row:hover{background:#0C0F18}
        .row.header-row{background:#111520;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#5A6888}
        .row.header-row:hover{background:#111520}
        .empresa-nombre{font-size:14px;font-weight:500;color:#E8EDF8}
        .empresa-rubro{font-size:12px;color:#5A6888;margin-top:2px}
        .badge{display:inline-block;padding:3px 10px;font-size:11px;font-family:'DM Mono',monospace;border:1px solid}
        .score-cell{font-family:'Playfair Display',serif;font-size:20px;font-weight:400}
        .meta-text{font-size:12px;color:#8A9AB8}
        .empty-state{padding:60px 24px;text-align:center;border:1px solid rgba(255,255,255,0.06);background:#0C0F18}
        @media(max-width:768px){.row{grid-template-columns:1fr;gap:6px}.row.header-row{display:none}}
      `}</style>

      <div className="shell">
        <div className="header">
          <div>
            <div className="title">Panel de prospectos</div>
            <div className="sub">Empresas que han usado EOM OS Empresa</div>
          </div>
          <button className="btn-back" onClick={() => router.push('/dashboard')}>← Volver al dashboard</button>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-label">Empresas registradas</div>
            <div className="stat-val">{totalEmpresas}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Con diagnóstico</div>
            <div className="stat-val" style={{ color: '#D97706' }}>{conDiagnostico}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Onboarding completo</div>
            <div className="stat-val" style={{ color: '#16A34A' }}>{onboardingCompleto}</div>
          </div>
        </div>

        <div className="controls">
          <input className="search" placeholder="Buscar por nombre o rubro..." value={filtro} onChange={e => setFiltro(e.target.value)} />
          <select className="sort-select" value={orden} onChange={e => setOrden(e.target.value as any)}>
            <option value="recientes">Más recientes primero</option>
            <option value="score">Mayor score primero</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state" style={{ color: '#5A6888' }}>Cargando...</div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="empty-state">
            <div style={{ color: '#E8EDF8', fontSize: 16, marginBottom: 8 }}>Sin resultados</div>
            <div style={{ color: '#5A6888', fontSize: 13 }}>Aún no hay empresas registradas, o ninguna coincide con tu búsqueda.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <div className="row header-row">
              <div>Empresa</div>
              <div>Personas / Áreas</div>
              <div>Score</div>
              <div>Estado</div>
              <div>Última actividad</div>
            </div>
            {empresasFiltradas.map(e => (
              <div key={e.id} className="row">
                <div>
                  <div className="empresa-nombre">{e.nombre || 'Sin nombre'}</div>
                  <div className="empresa-rubro">{e.rubro || 'Sin rubro'}</div>
                </div>
                <div className="meta-text">
                  {e.num_personas || '—'} personas<br />
                  {e.areas?.length || 0} áreas
                </div>
                <div>
                  {e.ultimoDiagnostico ? (
                    <span className="score-cell" style={{ color: getEstadoColor(e.ultimoDiagnostico.score_total) }}>
                      {e.ultimoDiagnostico.score_total}
                    </span>
                  ) : (
                    <span style={{ color: '#5A6888', fontSize: 12 }}>Sin diagnóstico</span>
                  )}
                </div>
                <div>
                  {e.ultimoDiagnostico ? (
                    <span className="badge" style={{ color: getEstadoColor(e.ultimoDiagnostico.score_total), borderColor: getEstadoColor(e.ultimoDiagnostico.score_total) + '44' }}>
                      {e.ultimoDiagnostico.estado}
                    </span>
                  ) : (
                    <span className="badge" style={{ color: '#5A6888', borderColor: 'rgba(255,255,255,0.12)' }}>
                      {e.onboarding_completo ? 'Onboarding ok' : 'Incompleto'}
                    </span>
                  )}
                </div>
                <div className="meta-text">
                  {e.ultimoDiagnostico ? fmtDate(e.ultimoDiagnostico.created_at) : fmtDate(e.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
