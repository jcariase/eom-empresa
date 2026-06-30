'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Problema = {
  id: string
  area: string
  fecha: string
  que_paso: string
  que_se_hizo: string
  que_hacer_para_evitar: string
  responsable: string
  fecha_compromiso: string
  resuelto: boolean
  acuerdo_id?: string
  reunion_id?: string
  created_at?: string
}

function normalizar(texto: string) {
  return texto.toLowerCase().trim().replace(/[^\w\sáéíóúñ]/g, '')
}

function sonSimilares(a: string, b: string) {
  const palabrasA = new Set(normalizar(a).split(/\s+/).filter(w => w.length > 3))
  const palabrasB = new Set(normalizar(b).split(/\s+/).filter(w => w.length > 3))
  if (palabrasA.size === 0 || palabrasB.size === 0) return false
  let coincidencias = 0
  palabrasA.forEach(w => { if (palabrasB.has(w)) coincidencias++ })
  const minSize = Math.min(palabrasA.size, palabrasB.size)
  return coincidencias / minSize >= 0.4
}

export default function MejoraContinuaPage() {
  const router = useRouter()
  const [empresa, setEmpresa] = useState<any>(null)
  const [areas, setAreas] = useState<string[]>([])
  const [problemas, setProblemas] = useState<Problema[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)
  const [filtroArea, setFiltroArea] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const [fArea, setFArea] = useState('')
  const [fFecha, setFFecha] = useState(new Date().toISOString().split('T')[0])
  const [fQuePaso, setFQuePaso] = useState('')
  const [fQueSeHizo, setFQueSeHizo] = useState('')
  const [fQueHacer, setFQueHacer] = useState('')
  const [fResponsable, setFResponsable] = useState('')
  const [fFechaCompromiso, setFFechaCompromiso] = useState('')
  const [alertaRecurrencia, setAlertaRecurrencia] = useState<Problema | null>(null)

  useEffect(() => {
    async function load() {
      const {data: {user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data: emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)
      const areasEmp = emp.areas || []
      setAreas(areasEmp)
      setFArea(areasEmp[0] || '')
      const {data: probsData} = await supabase.from('problemas_empresa').select('*').eq('user_id', user.id).order('fecha', {ascending: false})
      setProblemas((probsData || []) as Problema[])
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (fQuePaso.trim().length < 8) { setAlertaRecurrencia(null); return }
    const similar = problemas.find(p => p.area === fArea && sonSimilares(p.que_paso, fQuePaso))
    setAlertaRecurrencia(similar || null)
  }, [fQuePaso, fArea, problemas])

  async function guardarProblema() {
    if (!fArea || !fQuePaso) return
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)

    const acuerdoId = crypto.randomUUID()
    let reunionId: string | undefined

    // Si hay acción preventiva, vincularla como acuerdo en una reunión de seguimiento
    if (fQueHacer.trim()) {
      const tituloSeguimiento = `Seguimiento de problemas — ${fArea}`
      const {data: reunionExistente} = await supabase
        .from('reuniones_empresa')
        .select('*')
        .eq('user_id', user.id)
        .eq('area', fArea)
        .eq('titulo', tituloSeguimiento)
        .order('created_at', {ascending: false})
        .limit(1)
        .single()

      const nuevoAcuerdo = {
        id: acuerdoId,
        que: fQueHacer,
        quien: fResponsable,
        cuando: fFechaCompromiso,
        completado: false,
        comentario: `Originado por: "${fQuePaso}"`,
      }

      if (reunionExistente) {
        reunionId = reunionExistente.id
        const acuerdosActualizados = [...(reunionExistente.acuerdos || []), nuevoAcuerdo]
        await supabase.from('reuniones_empresa').update({acuerdos: acuerdosActualizados}).eq('id', reunionExistente.id)
      } else {
        reunionId = crypto.randomUUID()
        await supabase.from('reuniones_empresa').insert({
          id: reunionId,
          user_id: user.id,
          titulo: tituloSeguimiento,
          area: fArea,
          fecha: fFecha,
          acuerdos: [nuevoAcuerdo],
        })
      }
    }

    const nuevo: Problema = {
      id: crypto.randomUUID(),
      area: fArea,
      fecha: fFecha,
      que_paso: fQuePaso,
      que_se_hizo: fQueSeHizo,
      que_hacer_para_evitar: fQueHacer,
      responsable: fResponsable,
      fecha_compromiso: fFechaCompromiso,
      resuelto: false,
      acuerdo_id: fQueHacer.trim() ? acuerdoId : undefined,
      reunion_id: reunionId,
    }
    const {error} = await supabase.from('problemas_empresa').insert({...nuevo, user_id: user.id})
    if (error) { console.error(error); setSaving(false); return }
    setProblemas(prev => [nuevo, ...prev])
    setFQuePaso(''); setFQueSeHizo(''); setFQueHacer(''); setFResponsable(''); setFFechaCompromiso('')
    setFFecha(new Date().toISOString().split('T')[0])
    setAlertaRecurrencia(null)
    setShowNuevo(false)
    setSaving(false)
  }

  async function toggleResuelto(id: string) {
    const problema = problemas.find(p => p.id === id)
    if (!problema) return
    const nuevoEstado = !problema.resuelto
    const nuevos = problemas.map(p => p.id === id ? {...p, resuelto: nuevoEstado} : p)
    setProblemas(nuevos)
    await supabase.from('problemas_empresa').update({resuelto: nuevoEstado}).eq('id', id)

    // Sincronizar con el acuerdo vinculado en Reuniones
    if (problema.acuerdo_id && problema.reunion_id) {
      const {data: reunion} = await supabase.from('reuniones_empresa').select('*').eq('id', problema.reunion_id).single()
      if (reunion) {
        const acuerdosActualizados = (reunion.acuerdos || []).map((a: any) =>
          a.id === problema.acuerdo_id ? {...a, completado: nuevoEstado} : a
        )
        await supabase.from('reuniones_empresa').update({acuerdos: acuerdosActualizados}).eq('id', problema.reunion_id)
      }
    }
  }

  async function eliminarProblema(id: string) {
    await supabase.from('problemas_empresa').delete().eq('id', id)
    setProblemas(prev => prev.filter(p => p.id !== id))
  }

  // Detectar recurrencia general: agrupar problemas similares entre sí
  function contarRecurrencias(problema: Problema): number {
    return problemas.filter(p => p.id !== problema.id && p.area === problema.area && sonSimilares(p.que_paso, problema.que_paso)).length
  }

  const problemasFiltrados = problemas.filter(p => {
    if (filtroArea !== 'Todas' && p.area !== filtroArea) return false
    if (filtroEstado === 'Resueltos' && !p.resuelto) return false
    if (filtroEstado === 'Pendientes' && p.resuelto) return false
    return true
  })

  const totalProblemas = problemas.length
  const resueltos = problemas.filter(p => p.resuelto).length
  const conAccionPreventiva = problemas.filter(p => p.que_hacer_para_evitar.trim() !== '').length
  const recurrentes = problemas.filter(p => contarRecurrencias(p) > 0)
  const problemasUnicosRecurrentes = new Set(recurrentes.map(p => p.id)).size

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {day:'numeric',month:'short',year:'numeric'})

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando registro de problemas...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#07090E;--bg2:#0C0F18;--bg3:#111520;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);--text:#E8EDF8;--text2:#5A6888;--text3:#8A9AB8;--amber:#D97706;--amber-light:#FCD34D;--amber-dim:rgba(217,119,6,0.12);--amber-border:rgba(217,119,6,0.25);--green:#16A34A;--green-light:#4ADE80;--red:#EF4444;--red-dim:rgba(239,68,68,0.1)}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .sidebar{background:var(--bg2);border-right:1px solid var(--border);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--text);padding:0 20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--text3);cursor:pointer;transition:all 0.15s}
        .nav-item:hover{color:var(--text);background:var(--bg3)}
        .nav-item.active{color:var(--amber);background:rgba(217,119,6,0.08)}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border)}
        .btn-logout{background:none;border:none;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .main{padding:40px;overflow-y:auto}
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--text3)}
        .btn-amber{padding:10px 20px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-radius:0}
        .btn-amber:hover{background:#B45309}
        .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:24px}
        .metric{padding:20px;background:var(--bg2)}
        .metric-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text2);margin-bottom:8px}
        .metric-val{font-family:'Playfair Display',serif;font-size:32px;color:var(--text);font-weight:400}
        .metric-sub{font-size:12px;color:var(--text2);margin-top:4px}
        .filtros{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .filtro-select{padding:8px 14px;border:1px solid var(--border2);background:var(--bg2);color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;cursor:pointer}
        .problema-card{background:var(--bg2);border:1px solid var(--border);margin-bottom:12px;padding:20px 22px;position:relative}
        .problema-card.recurrente{border-left:2px solid var(--red)}
        .problema-card.resuelto{opacity:0.6}
        .problema-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
        .problema-meta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
        .problema-area-badge{font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--amber);background:var(--amber-dim);border:1px solid var(--amber-border);padding:4px 10px}
        .recurrente-badge{font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--red);background:var(--red-dim);border:1px solid rgba(239,68,68,0.3);padding:4px 10px}
        .problema-fecha{font-size:12px;color:var(--text2)}
        .problema-que{font-size:15px;font-weight:500;color:var(--text);margin-bottom:14px;line-height:1.5}
        .problema-3q{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .q-block{background:var(--bg3);padding:12px 14px;border-left:2px solid var(--border2)}
        .q-block.evitar{border-left-color:var(--green)}
        .q-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:var(--text2);margin-bottom:6px}
        .q-text{font-size:13px;color:var(--text3);line-height:1.5}
        .q-text.empty{color:var(--text2);font-style:italic}
        .problema-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border)}
        .problema-asignacion{display:flex;gap:14px;font-size:12px;color:var(--text2)}
        .btn-resuelto{padding:6px 14px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer}
        .btn-resuelto.activo{background:rgba(22,163,74,0.15);border-color:var(--green);color:var(--green-light)}
        .btn-eliminar{background:none;border:none;color:var(--text2);font-size:14px;cursor:pointer;padding:4px 8px}
        .btn-eliminar:hover{color:var(--red)}
        .empty-state{padding:60px 24px;text-align:center;border:1px solid var(--border);background:var(--bg2)}
        .empty-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--text);margin-bottom:8px;font-weight:400}
        .empty-sub{font-size:13px;color:var(--text3);margin-bottom:24px;line-height:1.6}
        .panel{position:fixed;top:0;right:0;bottom:0;width:480px;background:var(--bg2);border-left:1px solid var(--border);padding:32px;overflow-y:auto;z-index:100;animation:slideIn 0.2s ease}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .panel-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--text);margin-bottom:20px;font-weight:400}
        .panel-close{position:absolute;top:20px;right:20px;background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer}
        .field-group{margin-bottom:16px}
        .field-label{font-size:12px;color:var(--text3);margin-bottom:5px;display:block;font-weight:500}
        .field-help{font-size:11px;color:var(--text2);margin-bottom:6px;line-height:1.4}
        .field{width:100%;padding:9px 12px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--text2)}
        textarea.field{min-height:64px;resize:vertical}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        select.field{cursor:pointer}
        .alerta-recurrencia{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);padding:14px 16px;margin-bottom:16px;font-size:12px;color:var(--text3);line-height:1.6}
        .alerta-recurrencia-titulo{color:var(--red);font-weight:500;margin-bottom:6px;display:flex;align-items:center;gap:6px}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.panel{width:100%}.metrics{grid-template-columns:1fr}.problema-3q{grid-template-columns:1fr}.field-row{grid-template-columns:1fr}}
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo" onClick={() => router.push('/dashboard')}><div className="mark">E</div>EOM OS</div>
          <div className="nav-section">Ciclo actual</div>
          <div className="nav-item" onClick={() => router.push('/dashboard')}>Dashboard</div>
          <div className="nav-item" onClick={() => router.push('/dashboard/diagnostico')}>Diagnóstico</div>
          <div className="nav-item" onClick={() => router.push('/dashboard/plan')}>Plan 90 días</div>
          <div className="nav-item" onClick={() => router.push('/dashboard/kpis')}>KPIs</div>
          <div className="nav-section">Gestión</div>
          <div className="nav-item" onClick={() => router.push('/dashboard/configuracion')}>Configuración</div>
          <div className="nav-item" onClick={() => router.push('/dashboard/reuniones')}>Reuniones</div>
          <div className="nav-item active">Mejora Continua</div>
          <div className="sidebar-bottom">
            <button className="btn-logout" onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="main">
          <div className="page-header">
            <div>
              <div className="page-title">Mejora Continua</div>
              <div className="page-sub">{empresa?.nombre} · Los mismos problemas no deben repetirse</div>
            </div>
            <button className="btn-amber" onClick={() => setShowNuevo(true)}>+ Registrar problema</button>
          </div>

          {totalProblemas > 0 && (
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Problemas resueltos</div>
                <div className="metric-val" style={{color: 'var(--green-light)'}}>{resueltos}/{totalProblemas}</div>
                <div className="metric-sub">{Math.round((resueltos/totalProblemas)*100)}% cerrados</div>
              </div>
              <div className="metric">
                <div className="metric-label">Con acción preventiva</div>
                <div className="metric-val" style={{color: 'var(--amber)'}}>{conAccionPreventiva}/{totalProblemas}</div>
                <div className="metric-sub">definieron cómo evitar que vuelva a pasar</div>
              </div>
              <div className="metric">
                <div className="metric-label">Problemas recurrentes</div>
                <div className="metric-val" style={{color: problemasUnicosRecurrentes > 0 ? '#EF4444' : 'var(--green-light)'}}>{problemasUnicosRecurrentes}</div>
                <div className="metric-sub">se repitieron en la misma área</div>
              </div>
            </div>
          )}

          {totalProblemas > 0 && (
            <div className="filtros">
              <select className="filtro-select" value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
                <option value="Todas">Todas las áreas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className="filtro-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="Todos">Todos los estados</option>
                <option value="Pendientes">Pendientes</option>
                <option value="Resueltos">Resueltos</option>
              </select>
            </div>
          )}

          {problemas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">Sin problemas registrados</div>
              <p className="empty-sub">
                Cuando algo sale mal, regístralo aquí con las 3 preguntas clave.<br />
                EOM detecta automáticamente si el mismo problema se repite.
              </p>
              <button className="btn-amber" onClick={() => setShowNuevo(true)}>+ Registrar primer problema</button>
            </div>
          ) : (
            problemasFiltrados.map(p => {
              const numRecurrencias = contarRecurrencias(p)
              const esRecurrente = numRecurrencias > 0
              return (
                <div key={p.id} className={`problema-card ${esRecurrente ? 'recurrente' : ''} ${p.resuelto ? 'resuelto' : ''}`}>
                  <div className="problema-header">
                    <div style={{flex: 1, minWidth: 0}}>
                      <div className="problema-meta-row">
                        <span className="problema-area-badge">{p.area}</span>
                        {esRecurrente && (
                          <span className="recurrente-badge">⚠ Se repitió {numRecurrencias + 1} {numRecurrencias === 0 ? 'vez' : 'veces'}</span>
                        )}
                        <span className="problema-fecha">{fmtDate(p.fecha)}</span>
                      </div>
                      <div className="problema-que">{p.que_paso}</div>
                    </div>
                    <button className="btn-eliminar" onClick={() => eliminarProblema(p.id)}>✕</button>
                  </div>

                  <div className="problema-3q">
                    <div className="q-block">
                      <div className="q-label">¿Qué se hizo para solucionarlo?</div>
                      <div className={`q-text ${!p.que_se_hizo ? 'empty' : ''}`}>{p.que_se_hizo || 'Sin registrar'}</div>
                    </div>
                    <div className="q-block evitar">
                      <div className="q-label">¿Qué hacer para que no vuelva a pasar?</div>
                      <div className={`q-text ${!p.que_hacer_para_evitar ? 'empty' : ''}`}>{p.que_hacer_para_evitar || 'Sin definir — esto es lo más importante'}</div>
                      {p.acuerdo_id && (
                        <div style={{fontSize:11, color:'var(--amber)', marginTop:8, display:'flex', alignItems:'center', gap:4, cursor:'pointer'}} onClick={() => router.push('/dashboard/reuniones')}>
                          🔗 En seguimiento en Reuniones — {p.area}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="problema-footer">
                    <div className="problema-asignacion">
                      {p.responsable && <span>👤 {p.responsable}</span>}
                      {p.fecha_compromiso && <span>📅 compromiso: {fmtDate(p.fecha_compromiso)}</span>}
                    </div>
                    <button className={`btn-resuelto ${p.resuelto ? 'activo' : ''}`} onClick={() => toggleResuelto(p.id)}>
                      {p.resuelto ? '✓ Resuelto' : 'Marcar como resuelto'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </main>
      </div>

      {/* Panel nuevo problema */}
      {showNuevo && (
        <>
          <div className="overlay" onClick={() => setShowNuevo(false)} />
          <div className="panel">
            <button className="panel-close" onClick={() => setShowNuevo(false)}>×</button>
            <div className="panel-title">Registrar problema</div>

            <div className="field-row" style={{marginBottom: 16}}>
              <div className="field-group" style={{marginBottom: 0}}>
                <label className="field-label">Área *</label>
                <select className="field" value={fArea} onChange={e => setFArea(e.target.value)}>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="field-group" style={{marginBottom: 0}}>
                <label className="field-label">Fecha *</label>
                <input className="field" type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">1. ¿Qué pasó? *</label>
              <div className="field-help">Describe el hecho concreto, sin opiniones. Ej: "el cliente recibió el equipo con 3 días de atraso".</div>
              <textarea className="field" placeholder="Describe lo que ocurrió" value={fQuePaso} onChange={e => setFQuePaso(e.target.value)} />
            </div>

            {alertaRecurrencia && (
              <div className="alerta-recurrencia">
                <div className="alerta-recurrencia-titulo">⚠ Esto ya pasó antes</div>
                Registraste un problema similar en {alertaRecurrencia.area} el {fmtDate(alertaRecurrencia.fecha)}: "{alertaRecurrencia.que_paso}".
                {alertaRecurrencia.que_hacer_para_evitar
                  ? ` La acción preventiva definida fue: "${alertaRecurrencia.que_hacer_para_evitar}". Si volvió a pasar, esa acción no funcionó — hay que profundizar más en la causa raíz.`
                  : ' En ese momento no se definió una acción para evitar que se repitiera. Esta vez es importante hacerlo.'}
              </div>
            )}

            <div className="field-group">
              <label className="field-label">2. ¿Qué se hizo para solucionar el problema?</label>
              <div className="field-help">La acción inmediata, el parche del momento.</div>
              <textarea className="field" placeholder="Ej: se reenvió el equipo con despacho express" value={fQueSeHizo} onChange={e => setFQueSeHizo(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">3. ¿Qué hay que hacer para que no vuelva a pasar? *</label>
              <div className="field-help">La pregunta más importante. No es la solución del momento — es el cambio de fondo que evita la repetición.</div>
              <textarea className="field" placeholder="Ej: agregar punto de control de stock antes de confirmar fecha de entrega" value={fQueHacer} onChange={e => setFQueHacer(e.target.value)} />
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Responsable de la acción</label>
                <input className="field" placeholder="¿Quién lo va a implementar?" value={fResponsable} onChange={e => setFResponsable(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Fecha de compromiso</label>
                <input className="field" type="date" value={fFechaCompromiso} onChange={e => setFFechaCompromiso(e.target.value)} />
              </div>
            </div>

            <button className="btn-amber" style={{width:'100%', padding:'14px'}} onClick={guardarProblema} disabled={!fArea || !fQuePaso || saving}>
              {saving ? 'Guardando...' : 'Guardar registro →'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
