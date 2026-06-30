'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../../components/Sidebar'

type Acuerdo = {
  id: string
  que: string
  quien: string
  cuando: string
  completado: boolean
  comentario: string
}

type Reunion = {
  id: string
  titulo: string
  area: string
  fecha: string
  acuerdos: Acuerdo[]
  created_at?: string
}

export default function ReunionesPage() {
  const router = useRouter()
  const [empresa, setEmpresa] = useState<any>(null)
  const [areas, setAreas] = useState<string[]>([])
  const [reuniones, setReuniones] = useState<Reunion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [comentarioEditando, setComentarioEditando] = useState<string | null>(null)

  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevaArea, setNuevaArea] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0])
  const [nuevosAcuerdos, setNuevosAcuerdos] = useState<Acuerdo[]>([
    {id: crypto.randomUUID(), que: '', quien: '', cuando: '', completado: false, comentario: ''}
  ])

  useEffect(() => {
    async function load() {
      const {data: {user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data: emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)
      const areasEmp = emp.areas || []
      setAreas(areasEmp)
      setNuevaArea(areasEmp[0] || '')
      const {data: reunionesData} = await supabase.from('reuniones_empresa').select('*').eq('user_id', user.id).order('fecha', {ascending: false})
      setReuniones((reunionesData || []) as Reunion[])
      setLoading(false)
    }
    load()
  }, [router])

  function agregarFilaAcuerdo() {
    setNuevosAcuerdos(prev => [...prev, {id: crypto.randomUUID(), que: '', quien: '', cuando: '', completado: false, comentario: ''}])
  }

  function quitarFilaAcuerdo(id: string) {
    setNuevosAcuerdos(prev => prev.filter(a => a.id !== id))
  }

  function updateNuevoAcuerdo(id: string, field: string, value: string) {
    setNuevosAcuerdos(prev => prev.map(a => a.id === id ? {...a, [field]: value} : a))
  }

  async function guardarReunion() {
    if (!nuevoTitulo || !nuevaArea) return
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const acuerdosValidos = nuevosAcuerdos.filter(a => a.que.trim() !== '')
    const nueva: Reunion = {
      id: crypto.randomUUID(),
      titulo: nuevoTitulo,
      area: nuevaArea,
      fecha: nuevaFecha,
      acuerdos: acuerdosValidos,
    }
    const {error} = await supabase.from('reuniones_empresa').insert({...nueva, user_id: user.id})
    if (error) { console.error(error); setSaving(false); return }
    setReuniones(prev => [nueva, ...prev])
    setNuevoTitulo(''); setNuevaFecha(new Date().toISOString().split('T')[0])
    setNuevosAcuerdos([{id: crypto.randomUUID(), que: '', quien: '', cuando: '', completado: false, comentario: ''}])
    setShowNueva(false)
    setSaving(false)
  }

  async function toggleAcuerdo(reunionId: string, acuerdoId: string) {
    const nuevas = reuniones.map(r => r.id === reunionId ? {
      ...r,
      acuerdos: r.acuerdos.map(a => a.id === acuerdoId ? {...a, completado: !a.completado} : a)
    } : r)
    setReuniones(nuevas)
    const reunion = nuevas.find(r => r.id === reunionId)
    if (!reunion) return
    await supabase.from('reuniones_empresa').update({acuerdos: reunion.acuerdos}).eq('id', reunionId)

    const acuerdoActualizado = reunion.acuerdos.find(a => a.id === acuerdoId)
    if (acuerdoActualizado) {
      // Sincronizar con el problema vinculado en Mejora Continua, si existe
      await supabase.from('problemas_empresa').update({resuelto: acuerdoActualizado.completado}).eq('acuerdo_id', acuerdoId)
    }
  }

  async function guardarComentario(reunionId: string, acuerdoId: string, comentario: string) {
    const nuevas = reuniones.map(r => r.id === reunionId ? {
      ...r,
      acuerdos: r.acuerdos.map(a => a.id === acuerdoId ? {...a, comentario} : a)
    } : r)
    setReuniones(nuevas)
    const reunion = nuevas.find(r => r.id === reunionId)
    if (reunion) await supabase.from('reuniones_empresa').update({acuerdos: reunion.acuerdos}).eq('id', reunionId)
    setComentarioEditando(null)
  }

  async function eliminarReunion(id: string) {
    await supabase.from('reuniones_empresa').delete().eq('id', id)
    setReuniones(prev => prev.filter(r => r.id !== id))
  }

  // Métricas para el KPI de Reuniones con acuerdos cerrados
  const totalReuniones = reuniones.length
  const reunionesConActa = reuniones.filter(r => r.acuerdos.length > 0).length
  const pctConActa = totalReuniones > 0 ? Math.round((reunionesConActa / totalReuniones) * 100) : 0

  const totalAcuerdos = reuniones.reduce((acc, r) => acc + r.acuerdos.length, 0)
  const acuerdosCompletados = reuniones.reduce((acc, r) => acc + r.acuerdos.filter(a => a.completado).length, 0)
  const pctCumplimiento = totalAcuerdos > 0 ? Math.round((acuerdosCompletados / totalAcuerdos) * 100) : 0

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {day:'numeric',month:'short',year:'numeric'})

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando reuniones...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--txt-1);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .sidebar{background:var(--surf-2);border-right:1px solid var(--brd);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--txt-1);padding:0 20px 24px;border-bottom:1px solid var(--brd);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--txt-3);cursor:pointer;transition:all 0.15s}
        .nav-item:hover{color:var(--txt-1);background:var(--surf-3)}
        .nav-item.active{color:var(--amber);background:rgba(217,119,6,0.08)}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--brd)}
        .btn-logout{background:none;border:none;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .main{padding:40px;overflow-y:auto}
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--txt-3)}
        .btn-amber{padding:10px 20px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-radius:0}
        .btn-amber:hover{background:#B45309}
        .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--brd);border:1px solid var(--brd);margin-bottom:28px}
        .metric{padding:20px;background:var(--surf-2)}
        .metric-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:8px}
        .metric-val{font-family:'Playfair Display',serif;font-size:32px;color:var(--txt-1);font-weight:400}
        .metric-sub{font-size:12px;color:var(--txt-2);margin-top:4px}
        .reunion-card{background:var(--surf-2);border:1px solid var(--brd);margin-bottom:12px;overflow:hidden}
        .reunion-header{padding:18px 22px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:16px}
        .reunion-header:hover{background:var(--surf-3)}
        .reunion-info{display:flex;align-items:center;gap:14px;min-width:0}
        .reunion-area-badge{font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--amber);background:var(--amber-dim);border:1px solid var(--amber-border);padding:4px 10px;flex-shrink:0}
        .reunion-titulo{font-size:14px;font-weight:500;color:var(--txt-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .reunion-fecha{font-size:12px;color:var(--txt-2);flex-shrink:0}
        .reunion-acuerdos-count{font-size:12px;color:var(--txt-2);flex-shrink:0}
        .reunion-body{padding:0 22px 18px;border-top:1px solid var(--brd)}
        .acuerdo-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--brd)}
        .acuerdo-row:last-child{border-bottom:none}
        .acuerdo-check{width:16px;height:16px;border:1.5px solid var(--brd-2);background:transparent;cursor:pointer;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center}
        .acuerdo-check.done{background:var(--green);border-color:var(--green)}
        .acuerdo-check.done::after{content:'✓';color:#fff;font-size:9px;font-weight:700}
        .acuerdo-content{flex:1;min-width:0}
        .acuerdo-que{font-size:13px;color:var(--txt-1);margin-bottom:4px}
        .acuerdo-que.done{color:var(--txt-2);text-decoration:line-through}
        .acuerdo-meta{display:flex;gap:14px}
        .acuerdo-meta-item{font-size:11px;color:var(--txt-2)}
        .btn-eliminar-reunion{background:none;border:none;color:var(--txt-2);font-size:13px;cursor:pointer;padding:4px 8px;flex-shrink:0}
        .btn-eliminar-reunion:hover{color:var(--red)}
        .empty-state{padding:60px 24px;text-align:center;border:1px solid var(--brd);background:var(--surf-2)}
        .empty-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--txt-1);margin-bottom:8px;font-weight:400}
        .empty-sub{font-size:13px;color:var(--txt-3);margin-bottom:24px;line-height:1.6}
        .panel{position:fixed;top:0;right:0;bottom:0;width:480px;background:var(--surf-2);border-left:1px solid var(--brd);padding:32px;overflow-y:auto;z-index:100;animation:slideIn 0.2s ease}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .panel-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--txt-1);margin-bottom:20px;font-weight:400}
        .panel-close{position:absolute;top:20px;right:20px;background:none;border:none;color:var(--txt-2);font-size:20px;cursor:pointer}
        .field-group{margin-bottom:14px}
        .field-label{font-size:12px;color:var(--txt-3);margin-bottom:5px;display:block}
        .field{width:100%;padding:9px 12px;border:1px solid var(--brd-2);background:var(--surf-3);color:var(--txt-1);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--txt-2)}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        select.field{cursor:pointer}
        .acuerdo-form-row{background:var(--surf-3);border:1px solid var(--brd);padding:14px;margin-bottom:8px;position:relative}
        .acuerdo-form-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--txt-2);margin-bottom:10px}
        .btn-quitar-acuerdo{position:absolute;top:10px;right:10px;background:none;border:none;color:var(--txt-2);font-size:16px;cursor:pointer}
        .btn-quitar-acuerdo:hover{color:var(--red)}
        .btn-agregar-acuerdo{width:100%;padding:10px;border:1px dashed var(--brd-2);background:transparent;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;margin-bottom:16px}
        .btn-agregar-acuerdo:hover{border-color:var(--amber-border);color:var(--amber)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}.panel{width:100%}.metrics{grid-template-columns:1fr}.field-row{grid-template-columns:1fr}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={empresa?.nombre} />

        <main className="main">
          <div className="page-header">
            <div>
              <div className="page-title">Reuniones</div>
              <div className="page-sub">{empresa?.nombre} · Acuerdos con dueño y fecha de cierre</div>
            </div>
            <button className="btn-amber" onClick={() => setShowNueva(true)}>+ Nueva reunión</button>
          </div>

          {totalReuniones > 0 && (
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Reuniones con acta</div>
                <div className="metric-val" style={{color: pctConActa === 100 ? 'var(--green-light)' : 'var(--amber)'}}>{pctConActa}%</div>
                <div className="metric-sub">{reunionesConActa} de {totalReuniones} reuniones registradas</div>
              </div>
              <div className="metric">
                <div className="metric-label">Cumplimiento de compromisos</div>
                <div className="metric-val" style={{color: pctCumplimiento >= 90 ? 'var(--green-light)' : pctCumplimiento >= 70 ? 'var(--amber)' : '#EF4444'}}>{pctCumplimiento}%</div>
                <div className="metric-sub">{acuerdosCompletados} de {totalAcuerdos} acuerdos cerrados</div>
              </div>
            </div>
          )}

          {reuniones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">Sin reuniones registradas</div>
              <p className="empty-sub">Registra tu primera reunión con los acuerdos que se generaron.<br />Una reunión sin acta es solo una conversación.</p>
              <button className="btn-amber" onClick={() => setShowNueva(true)}>+ Registrar primera reunión</button>
            </div>
          ) : (
            reuniones.map(r => (
              <div key={r.id} className="reunion-card">
                <div className="reunion-header" onClick={() => setExpandida(expandida === r.id ? null : r.id)}>
                  <div className="reunion-info">
                    <span className="reunion-area-badge">{r.area}</span>
                    <span className="reunion-titulo">{r.titulo}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
                    <span className="reunion-fecha">{fmtDate(r.fecha)}</span>
                    <span className="reunion-acuerdos-count">{r.acuerdos.filter(a=>a.completado).length}/{r.acuerdos.length} cerrados</span>
                    <button className="btn-eliminar-reunion" onClick={(e) => { e.stopPropagation(); eliminarReunion(r.id) }}>✕</button>
                  </div>
                </div>
                {expandida === r.id && (
                  <div className="reunion-body">
                    {r.acuerdos.length === 0 ? (
                      <p style={{fontSize:'13px',color:'var(--txt-2)',padding:'12px 0'}}>Esta reunión no tiene acuerdos registrados.</p>
                    ) : (
                      r.acuerdos.map(a => (
                        <div key={a.id} className="acuerdo-row">
                          <div className={`acuerdo-check ${a.completado?'done':''}`} onClick={() => toggleAcuerdo(r.id, a.id)} />
                          <div className="acuerdo-content">
                            <div className={`acuerdo-que ${a.completado?'done':''}`}>{a.que}</div>
                            <div className="acuerdo-meta">
                              {a.quien && <span className="acuerdo-meta-item">👤 {a.quien}</span>}
                              {a.cuando && <span className="acuerdo-meta-item">📅 compromiso: {fmtDate(a.cuando)}</span>}
                              <span
                                className="acuerdo-meta-item"
                                style={{cursor:'pointer', color:'var(--amber)', textDecoration:'underline'}}
                                onClick={() => setComentarioEditando(comentarioEditando === a.id ? null : a.id)}
                              >
                                {a.comentario ? 'Editar comentario' : '+ Agregar comentario'}
                              </span>
                            </div>
                            {a.comentario && comentarioEditando !== a.id && (
                              <div style={{fontSize:'12px',color:'var(--txt-3)',marginTop:6,padding:'8px 10px',background:'var(--surf-3)',borderLeft:'2px solid var(--amber)'}}>
                                {a.comentario}
                              </div>
                            )}
                            {comentarioEditando === a.id && (
                              <div style={{marginTop:8,display:'flex',gap:8}}>
                                <input
                                  className="field"
                                  placeholder="Ej: se atrasó por falta de stock, nueva fecha estimada..."
                                  defaultValue={a.comentario}
                                  autoFocus
                                  style={{flex:1}}
                                  onKeyDown={e => e.key === 'Enter' && guardarComentario(r.id, a.id, (e.target as HTMLInputElement).value)}
                                  id={`comentario-${a.id}`}
                                />
                                <button
                                  className="btn-amber"
                                  style={{padding:'9px 16px',fontSize:12}}
                                  onClick={() => {
                                    const input = document.getElementById(`comentario-${a.id}`) as HTMLInputElement
                                    guardarComentario(r.id, a.id, input.value)
                                  }}
                                >
                                  Guardar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </main>
      </div>

      {/* Panel nueva reunión */}
      {showNueva && (
        <>
          <div className="overlay" onClick={() => setShowNueva(false)} />
          <div className="panel">
            <button className="panel-close" onClick={() => setShowNueva(false)}>×</button>
            <div className="panel-title">Nueva reunión</div>

            <div className="field-group">
              <label className="field-label">Título de la reunión *</label>
              <input className="field" placeholder="Ej: Reunión semanal de Operaciones" value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} />
            </div>

            <div className="field-row" style={{marginBottom: 14}}>
              <div className="field-group" style={{marginBottom: 0}}>
                <label className="field-label">Área *</label>
                <select className="field" value={nuevaArea} onChange={e => setNuevaArea(e.target.value)}>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="field-group" style={{marginBottom: 0}}>
                <label className="field-label">Fecha *</label>
                <input className="field" type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} />
              </div>
            </div>

            <div style={{height:1, background:'var(--brd)', margin:'20px 0'}} />

            <label className="field-label" style={{marginBottom: 12, display:'block'}}>Acuerdos — qué, quién, cuándo</label>

            {nuevosAcuerdos.map((a, i) => (
              <div key={a.id} className="acuerdo-form-row">
                {nuevosAcuerdos.length > 1 && (
                  <button className="btn-quitar-acuerdo" onClick={() => quitarFilaAcuerdo(a.id)}>×</button>
                )}
                <div className="acuerdo-form-label">Acuerdo {i + 1}</div>
                <div className="field-group">
                  <input className="field" placeholder="¿Qué se acordó?" value={a.que} onChange={e => updateNuevoAcuerdo(a.id, 'que', e.target.value)} />
                </div>
                <div className="field-row">
                  <input className="field" placeholder="Responsable" value={a.quien} onChange={e => updateNuevoAcuerdo(a.id, 'quien', e.target.value)} />
                  <div>
                    <div style={{fontSize:10,color:'var(--txt-2)',marginBottom:4}}>Fecha de compromiso</div>
                    <input className="field" type="date" value={a.cuando} onChange={e => updateNuevoAcuerdo(a.id, 'cuando', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <button className="btn-agregar-acuerdo" onClick={agregarFilaAcuerdo}>+ Agregar otro acuerdo</button>

            <button className="btn-amber" style={{width:'100%', padding:'14px'}} onClick={guardarReunion} disabled={!nuevoTitulo || saving}>
              {saving ? 'Guardando...' : 'Guardar reunión →'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
