'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PLAN_BASE: Record<string, {foco:string, acciones:string[]}> = {
  'Finanzas': {
    foco: 'Visibilidad financiera real',
    acciones: [
      'Implementar cierre mensual antes del día 10',
      'Construir proyección de caja a 30 días',
      'Definir 3 KPIs financieros con seguimiento semanal',
    ]
  },
  'Operaciones': {
    foco: 'Estandarizar y delegar la operación',
    acciones: [
      'Documentar los 3 procesos más críticos del negocio',
      'Instalar reunión semanal de equipo con acuerdos escritos',
      'Definir KPIs por área con responsable y meta',
    ]
  },
  'Personas': {
    foco: 'Construir equipo autónomo',
    acciones: [
      'Definir roles y resultados esperados por persona',
      'Delegar al menos una decisión recurrente al equipo',
      'Crear mecanismo de propuestas de mejora del equipo',
    ]
  },
  'Liderazgo': {
    foco: 'Liberar tiempo estratégico',
    acciones: [
      'Bloquear 4 horas semanales para estrategia sin interrupciones',
      'Definir las 3 prioridades del trimestre con el equipo',
      'Crear tablero de decisiones delegadas vs. centralizadas',
    ]
  },
}

type EstadoAccion = 'pendiente' | 'en_proceso' | 'completada'

type Accion = {
  id: string
  texto: string
  responsable: string
  area: string
  fecha: string
  completada: boolean
  estado?: EstadoAccion
  dim: string
}

type Foco = {
  id: string
  dim: string
  foco: string
  acciones: Accion[]
}

function getEstadoReal(a: Accion): EstadoAccion {
  if (a.estado) return a.estado
  return a.completada ? 'completada' : 'pendiente'
}

export default function PlanPage() {
  const router = useRouter()
  const [focos, setFocos] = useState<Foco[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)
  const [diasRestantes, setDiasRestantes] = useState(90)
  const [editando, setEditando] = useState<string|null>(null)
  const [areas, setAreas] = useState<string[]>([])
  const [vista, setVista] = useState<'lista' | 'tablero'>('lista')

  useEffect(() => {
    async function load() {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const {data:emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)
      setAreas(emp.areas || [])

      const dias = emp.ciclo_inicio ? Math.max(0, 90 - Math.floor((Date.now() - new Date(emp.ciclo_inicio).getTime()) / (1000*60*60*24))) : 90
      setDiasRestantes(dias)

      // Cargar plan guardado o generar desde diagnóstico
      const {data:planGuardado} = await supabase.from('plan_empresa').select('*').eq('user_id', user.id).eq('ciclo', 1)

      if (planGuardado && planGuardado.length > 0) {
        setFocos(planGuardado as Foco[])
      } else {
        // Generar desde diagnóstico
        const {data:diag} = await supabase.from('diagnosticos_empresa').select('*').eq('user_id', user.id).order('created_at', {ascending:false}).limit(1).single()
        if (diag) {
          const scores = diag.scores as Record<string,number>
          const dims = Object.keys(scores).sort((a,b) => (scores[a]||0) - (scores[b]||0)).slice(0,3)
          const nuevos: Foco[] = dims.map(dim => ({
            id: crypto.randomUUID(),
            dim,
            foco: PLAN_BASE[dim]?.foco || `Mejorar ${dim}`,
            acciones: (PLAN_BASE[dim]?.acciones || []).map(a => ({
              id: crypto.randomUUID(),
              texto: a,
              responsable: '',
              area: '',
              fecha: '',
              completada: false,
              dim,
            }))
          }))
          setFocos(nuevos)
          // Guardar en Supabase
          await supabase.from('plan_empresa').insert(nuevos.map(f => ({...f, user_id: user.id, ciclo: 1})))
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function toggleAccion(focoId: string, accionId: string) {
    setSaving(true)
    const nuevos = focos.map(f => f.id === focoId ? {
      ...f,
      acciones: f.acciones.map(a => a.id === accionId ? {...a, completada: !a.completada, estado: (!a.completada ? 'completada' : 'pendiente') as EstadoAccion} : a)
    } : f)
    setFocos(nuevos)
    const foco = nuevos.find(f => f.id === focoId)
    if (foco) await supabase.from('plan_empresa').update({acciones: foco.acciones}).eq('id', focoId)
    setSaving(false)
  }

  async function cambiarEstado(focoId: string, accionId: string, nuevoEstado: EstadoAccion) {
    setSaving(true)
    const nuevos = focos.map(f => f.id === focoId ? {
      ...f,
      acciones: f.acciones.map(a => a.id === accionId ? {...a, estado: nuevoEstado, completada: nuevoEstado === 'completada'} : a)
    } : f)
    setFocos(nuevos)
    const foco = nuevos.find(f => f.id === focoId)
    if (foco) await supabase.from('plan_empresa').update({acciones: foco.acciones}).eq('id', focoId)
    setSaving(false)
  }

  async function updateAccion(focoId: string, accionId: string, field: string, value: string) {
    const nuevos = focos.map(f => f.id === focoId ? {
      ...f,
      acciones: f.acciones.map(a => a.id === accionId ? {...a, [field]: value} : a)
    } : f)
    setFocos(nuevos)
  }

  async function saveAccion(focoId: string) {
    setSaving(true)
    const foco = focos.find(f => f.id === focoId)
    if (foco) await supabase.from('plan_empresa').update({acciones: foco.acciones}).eq('id', focoId)
    setSaving(false)
    setEditando(null)
  }

  async function agregarAccion(focoId: string) {
    const nuevaAccion: Accion = {
      id: crypto.randomUUID(),
      texto: '',
      responsable: '',
      area: '',
      fecha: '',
      completada: false,
      dim: focos.find(f=>f.id===focoId)?.dim || '',
    }
    const nuevos = focos.map(f => f.id === focoId ? {...f, acciones: [...f.acciones, nuevaAccion]} : f)
    setFocos(nuevos)
    setEditando(nuevaAccion.id)
  }

  const totalAcciones = focos.reduce((a,f)=>a+f.acciones.length,0)
  const completadas = focos.reduce((a,f)=>a+f.acciones.filter(a=>a.completada).length,0)
  const pct = totalAcciones > 0 ? Math.round((completadas/totalAcciones)*100) : 0

  const DIM_COLORS: Record<string,string> = {
    Finanzas: '#D97706', Operaciones: '#2563EB', Personas: '#7C3AED', Liderazgo: '#16A34A'
  }

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando plan...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#07090E;--bg2:#0C0F18;--bg3:#111520;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);--text:#E8EDF8;--text2:#5A6888;--text3:#8A9AB8;--amber:#D97706;--amber-light:#FCD34D;--amber-dim:rgba(217,119,6,0.12);--green:#16A34A;--green-light:#4ADE80;--red:#EF4444}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .sidebar{background:var(--bg2);border-right:1px solid var(--border);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--text);padding:0 20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--text3);cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s}
        .nav-item:hover{color:var(--text);background:var(--bg3)}
        .nav-item.active{color:var(--amber);background:rgba(217,119,6,0.08)}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border)}
        .btn-logout{background:none;border:none;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .main{padding:40px;overflow-y:auto}
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--text3)}
        .ciclo-badge{display:flex;align-items:center;gap:16px;background:var(--bg2);border:1px solid var(--amber-dim);border-left:2px solid var(--amber);padding:14px 20px;flex-shrink:0}
        .ciclo-num{font-family:'Playfair Display',serif;font-size:32px;color:var(--amber);line-height:1}
        .ciclo-label{font-size:12px;color:var(--text2)}
        .summary-bar{background:var(--bg2);border:1px solid var(--border);padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
        .summary-pct{font-family:'Playfair Display',serif;font-size:36px;color:var(--amber);font-weight:400;line-height:1}
        .summary-label{font-size:13px;color:var(--text3);margin-top:2px}
        .progress-bar{flex:1;min-width:200px}
        .progress-track{height:4px;background:var(--border);border-radius:0}
        .progress-fill{height:100%;background:var(--amber);transition:width 0.5s ease}
        .progress-label{font-size:12px;color:var(--text2);margin-top:6px}
        .saving-badge{font-family:'DM Mono',monospace;font-size:10px;color:var(--text2);letter-spacing:0.06em}
        .foco-card{background:var(--bg2);border:1px solid var(--border);margin-bottom:16px;overflow:hidden}
        .foco-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:16px}
        .foco-dim-badge{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;padding:4px 10px;border:1px solid}
        .foco-title{font-size:16px;font-weight:500;color:var(--text)}
        .foco-progress{margin-left:auto;font-family:'DM Mono',monospace;font-size:12px;color:var(--text2)}
        .acciones-list{padding:8px 0}
        .accion-row{display:flex;align-items:flex-start;gap:12px;padding:14px 24px;border-bottom:1px solid var(--border);transition:background 0.15s}
        .accion-row:last-child{border-bottom:none}
        .accion-row:hover{background:var(--bg3)}
        .accion-check{width:18px;height:18px;border:1.5px solid var(--border2);border-radius:0;background:transparent;cursor:pointer;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .accion-check.done{background:var(--green);border-color:var(--green)}
        .accion-check.done::after{content:'✓';color:#fff;font-size:10px;font-weight:700}
        .accion-content{flex:1;min-width:0}
        .accion-texto{font-size:14px;color:var(--text);line-height:1.5;margin-bottom:6px}
        .accion-texto.done{color:var(--text2);text-decoration:line-through}
        .accion-meta{display:flex;gap:16px;flex-wrap:wrap}
        .accion-meta-item{font-size:12px;color:var(--text2);display:flex;align-items:center;gap:4px}
        .accion-edit-btn{background:none;border:none;color:var(--text2);font-size:12px;cursor:pointer;padding:2px 6px;font-family:'DM Sans',sans-serif}
        .accion-edit-btn:hover{color:var(--amber)}
        .accion-edit-form{background:var(--bg3);border:1px solid var(--amber-dim);padding:16px;margin:0 24px 12px}
        .edit-field{width:100%;padding:8px 12px;border:1px solid var(--border2);background:var(--bg2);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;margin-bottom:8px;border-radius:0}
        .edit-field:focus{border-color:var(--amber)}
        .edit-field::placeholder{color:var(--text2)}
        .edit-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .edit-actions{display:flex;gap:8px;margin-top:4px}
        .btn-save{padding:7px 16px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;border-radius:0}
        .btn-cancel{padding:7px 16px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;border-radius:0}
        .btn-agregar{width:100%;padding:12px;border:1px dashed var(--border2);background:transparent;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;border-radius:0;margin-top:4px}
        .btn-agregar:hover{border-color:var(--amber-border,rgba(217,119,6,0.25));color:var(--amber)}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.edit-row{grid-template-columns:1fr}}
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo" onClick={()=>router.push('/dashboard')}><div className="mark">E</div>EOM OS</div>
          <div className="nav-section">Ciclo actual</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard')}>Dashboard</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/diagnostico')}>Diagnóstico</div>
          <div className="nav-item active">Plan 90 días</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/kpis')}>KPIs</div>
          <div className="nav-section">Gestión</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/configuracion')}>Configuración</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/reuniones')}>Reuniones</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/mejora')}>Mejora Continua</div>
          <div className="sidebar-bottom">
            <button className="btn-logout" onClick={async()=>{await supabase.auth.signOut();router.push('/auth')}}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="main">
          <div className="page-header">
            <div>
              <div className="page-title">Plan 90 días</div>
              <div className="page-sub">{empresa?.nombre} · Ciclo 1 · {focos.length} focos prioritarios</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <div style={{display:'flex',border:'1px solid var(--border2)'}}>
                <button
                  onClick={()=>setVista('lista')}
                  style={{padding:'8px 16px',border:'none',background:vista==='lista'?'var(--amber-dim,rgba(217,119,6,0.12))':'transparent',color:vista==='lista'?'var(--amber)':'var(--text3)',fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:'pointer',borderRight:'1px solid var(--border2)'}}
                >Lista</button>
                <button
                  onClick={()=>setVista('tablero')}
                  style={{padding:'8px 16px',border:'none',background:vista==='tablero'?'var(--amber-dim,rgba(217,119,6,0.12))':'transparent',color:vista==='tablero'?'var(--amber)':'var(--text3)',fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:'pointer'}}
                >Tablero</button>
              </div>
              <div className="ciclo-badge">
                <div>
                  <div className="ciclo-num">{diasRestantes}</div>
                  <div className="ciclo-label">días restantes</div>
                </div>
              </div>
            </div>
          </div>

          <div className="summary-bar">
            <div>
              <div className="summary-pct">{pct}%</div>
              <div className="summary-label">completado</div>
            </div>
            <div className="progress-bar">
              <div className="progress-track">
                <div className="progress-fill" style={{width:`${pct}%`}} />
              </div>
              <div className="progress-label">{completadas} de {totalAcciones} acciones completadas</div>
            </div>
            {saving && <div className="saving-badge">Guardando...</div>}
          </div>

          {vista === 'tablero' ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              {(['pendiente','en_proceso','completada'] as EstadoAccion[]).map(estadoCol => {
                const labels: Record<EstadoAccion,string> = {pendiente:'Por hacer', en_proceso:'En proceso', completada:'Completado'}
                const colColors: Record<EstadoAccion,string> = {pendiente:'#5A6888', en_proceso:'#D97706', completada:'#16A34A'}
                const todasLasAcciones = focos.flatMap(f => f.acciones.map(a => ({...a, focoId: f.id, focoNombre: f.foco, focoDim: f.dim})))
                const accionesCol = todasLasAcciones.filter(a => getEstadoReal(a) === estadoCol)
                return (
                  <div key={estadoCol} style={{background:'var(--bg2)',border:'1px solid var(--border)'}}>
                    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',borderTop:`2px solid ${colColors[estadoCol]}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{labels[estadoCol]}</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:'var(--text2)'}}>{accionesCol.length}</span>
                    </div>
                    <div style={{padding:'12px',display:'flex',flexDirection:'column',gap:8,minHeight:120}}>
                      {accionesCol.length === 0 && (
                        <div style={{fontSize:12,color:'var(--text2)',textAlign:'center',padding:'20px 0'}}>Sin acciones aquí</div>
                      )}
                      {accionesCol.map(a => {
                        const dimColor = DIM_COLORS[a.focoDim] || '#D97706'
                        return (
                          <div key={a.id} style={{background:'var(--bg3)',border:'1px solid var(--border)',padding:'12px 14px'}}>
                            <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:dimColor,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{a.focoDim}{a.area ? ` · ${a.area}` : ''}</div>
                            <div style={{fontSize:13,color:'var(--text)',lineHeight:1.5,marginBottom:8}}>{a.texto || 'Sin descripción'}</div>
                            {(a.responsable || a.fecha) && (
                              <div style={{display:'flex',gap:10,fontSize:11,color:'var(--text2)',marginBottom:10}}>
                                {a.responsable && <span>👤 {a.responsable}</span>}
                                {a.fecha && <span>📅 {a.fecha}</span>}
                              </div>
                            )}
                            <div style={{display:'flex',gap:6}}>
                              {(['pendiente','en_proceso','completada'] as EstadoAccion[]).filter(e => e !== estadoCol).map(destino => (
                                <button
                                  key={destino}
                                  onClick={() => cambiarEstado(a.focoId, a.id, destino)}
                                  style={{flex:1,padding:'5px 8px',fontSize:10,border:`1px solid ${colColors[destino]}33`,background:'transparent',color:colColors[destino],cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}
                                >
                                  → {labels[destino]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
          <>
          {focos.map(foco => {
            const color = DIM_COLORS[foco.dim] || '#D97706'
            const focoDone = foco.acciones.filter(a=>a.completada).length
            return (
              <div key={foco.id} className="foco-card">
                <div className="foco-header">
                  <div className="foco-dim-badge" style={{color, borderColor: color+'44', background: color+'11'}}>{foco.dim}</div>
                  <div className="foco-title">{foco.foco}</div>
                  <div className="foco-progress">{focoDone}/{foco.acciones.length}</div>
                </div>
                <div className="acciones-list">
                  {foco.acciones.map(accion => (
                    <div key={accion.id}>
                      <div className="accion-row">
                        <div
                          className={`accion-check ${accion.completada?'done':''}`}
                          onClick={() => toggleAccion(foco.id, accion.id)}
                        />
                        <div className="accion-content">
                          <div className={`accion-texto ${accion.completada?'done':''}`}>{accion.texto || 'Sin descripción'}</div>
                          <div className="accion-meta">
                            {accion.area && <span className="accion-meta-item" style={{color:'#D97706'}}>{accion.area}</span>}
                            {accion.responsable && <span className="accion-meta-item">👤 {accion.responsable}</span>}
                            {accion.fecha && <span className="accion-meta-item">📅 {accion.fecha}</span>}
                            <button className="accion-edit-btn" onClick={()=>setEditando(editando===accion.id?null:accion.id)}>
                              {editando===accion.id ? 'Cancelar' : 'Editar'}
                            </button>
                          </div>
                        </div>
                      </div>
                      {editando === accion.id && (
                        <div className="accion-edit-form">
                          <input
                            className="edit-field"
                            placeholder="Descripción de la acción"
                            value={accion.texto}
                            onChange={e=>updateAccion(foco.id, accion.id, 'texto', e.target.value)}
                          />
                          <div className="edit-row">
                            <select
                              className="edit-field"
                              value={accion.area}
                              onChange={e=>updateAccion(foco.id, accion.id, 'area', e.target.value)}
                            >
                              <option value="">Sin área asignada</option>
                              {areas.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <input
                              className="edit-field"
                              placeholder="Responsable"
                              value={accion.responsable}
                              onChange={e=>updateAccion(foco.id, accion.id, 'responsable', e.target.value)}
                            />
                          </div>
                          <div className="edit-row">
                            <input
                              className="edit-field"
                              type="date"
                              value={accion.fecha}
                              onChange={e=>updateAccion(foco.id, accion.id, 'fecha', e.target.value)}
                            />
                          </div>
                          <div className="edit-actions">
                            <button className="btn-save" onClick={()=>saveAccion(foco.id)}>Guardar</button>
                            <button className="btn-cancel" onClick={()=>setEditando(null)}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{padding:'8px 24px 16px'}}>
                    <button className="btn-agregar" onClick={()=>agregarAccion(foco.id)}>+ Agregar acción</button>
                  </div>
                </div>
              </div>
            )
          })}
          </>
          )}
        </main>
      </div>
    </>
  )
}
