'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type KPI = {
  id: string
  nombre: string
  dim: string
  unidad: 'porcentaje' | 'pesos' | 'dias' | 'numero'
  meta: number
  actual: number
  descripcion: string
  estandar: boolean
}

const UNIDAD_LABELS: Record<string, string> = {
  porcentaje: '%', pesos: '$', dias: 'días', numero: '#'
}

const DIM_COLORS: Record<string, string> = {
  Finanzas: '#D97706', Operaciones: '#2563EB', Personas: '#7C3AED', Liderazgo: '#16A34A'
}

const KPIS_ESTANDAR: Omit<KPI, 'id' | 'actual'>[] = [
  { nombre: 'Ingresos del mes', dim: 'Finanzas', unidad: 'pesos', meta: 0, descripcion: 'Total de ingresos facturados en el mes', estandar: true },
  { nombre: 'Margen bruto', dim: 'Finanzas', unidad: 'porcentaje', meta: 40, descripcion: '(Ingresos - Costo directo) / Ingresos × 100', estandar: true },
  { nombre: 'Días de cobranza (DSO)', dim: 'Finanzas', unidad: 'dias', meta: 30, descripcion: 'Promedio de días para cobrar una factura', estandar: true },
  { nombre: 'Gastos fijos vs presupuesto', dim: 'Finanzas', unidad: 'porcentaje', meta: 100, descripcion: 'Gastos fijos reales vs presupuestados', estandar: true },
  { nombre: 'Entregas a tiempo', dim: 'Operaciones', unidad: 'porcentaje', meta: 95, descripcion: '% de entregas o servicios entregados en la fecha prometida', estandar: true },
  { nombre: 'Tiempo respuesta a clientes', dim: 'Operaciones', unidad: 'horas', meta: 4, descripcion: 'Promedio de horas para responder una solicitud de cliente', estandar: true },
  { nombre: 'Órdenes sin error', dim: 'Operaciones', unidad: 'porcentaje', meta: 98, descripcion: '% de órdenes o servicios entregados sin reclamo', estandar: true },
  { nombre: 'Capacidad utilizada', dim: 'Operaciones', unidad: 'porcentaje', meta: 80, descripcion: '% de capacidad operacional en uso vs disponible', estandar: true },
  { nombre: 'Cumplimiento de compromisos', dim: 'Personas', unidad: 'porcentaje', meta: 90, descripcion: '% de compromisos del equipo cerrados en plazo', estandar: true },
  { nombre: 'Ausentismo', dim: 'Personas', unidad: 'porcentaje', meta: 3, descripcion: '% de días perdidos por ausentismo sobre total de días hábiles', estandar: true },
  { nombre: 'Rotación anual', dim: 'Personas', unidad: 'porcentaje', meta: 10, descripcion: '% de personas que dejaron la empresa en los últimos 12 meses', estandar: true },
  { nombre: 'Avance plan 90 días', dim: 'Liderazgo', unidad: 'porcentaje', meta: 100, descripcion: '% de acciones del plan completadas', estandar: true },
  { nombre: 'Decisiones delegadas', dim: 'Liderazgo', unidad: 'porcentaje', meta: 70, descripcion: '% de decisiones operacionales tomadas sin el dueño', estandar: true },
  { nombre: 'Reuniones con acuerdos cerrados', dim: 'Liderazgo', unidad: 'porcentaje', meta: 100, descripcion: '% de reuniones que terminan con acuerdos escritos y dueño', estandar: true },
]

const DIMS = ['Todos', 'Finanzas', 'Operaciones', 'Personas', 'Liderazgo']

function getColor(kpi: KPI) {
  if (kpi.meta === 0) return '#5A6888'
  const pct = (kpi.actual / kpi.meta) * 100
  // Para KPIs donde menos es mejor (DSO, ausentismo, rotación, gastos)
  const inverso = ['Días de cobranza (DSO)', 'Ausentismo', 'Rotación anual', 'Gastos fijos vs presupuesto'].includes(kpi.nombre)
  const score = inverso ? (kpi.meta / Math.max(kpi.actual, 0.01)) * 100 : pct
  if (score >= 90) return '#16A34A'
  if (score >= 70) return '#D97706'
  return '#EF4444'
}

function formatVal(kpi: KPI, val: number) {
  if (kpi.unidad === 'pesos') return `$ ${val.toLocaleString('es-CL')}`
  if (kpi.unidad === 'porcentaje') return `${val}%`
  if (kpi.unidad === 'dias') return `${val} días`
  if ((kpi.unidad as string) === 'horas') return `${val} hrs`
  return `${val}`
}

function getPct(kpi: KPI) {
  if (kpi.meta === 0) return 0
  const inverso = ['Días de cobranza (DSO)', 'Ausentismo', 'Rotación anual', 'Gastos fijos vs presupuesto'].includes(kpi.nombre)
  if (inverso) return Math.min(100, Math.round((kpi.meta / Math.max(kpi.actual, 0.01)) * 100))
  return Math.min(100, Math.round((kpi.actual / kpi.meta) * 100))
}

export default function KPIsPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)
  const [dimFiltro, setDimFiltro] = useState('Todos')
  const [showAgregar, setShowAgregar] = useState(false)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [editando, setEditando] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)

  // Form nuevo KPI
  const [formNombre, setFormNombre] = useState('')
  const [formDim, setFormDim] = useState('Operaciones')
  const [formUnidad, setFormUnidad] = useState<string>('porcentaje')
  const [formMeta, setFormMeta] = useState('')
  const [formDesc, setFormDesc] = useState('')

  useEffect(() => {
    async function load() {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data:emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)

      const {data:kpisGuardados} = await supabase.from('kpis_empresa').select('*').eq('user_id', user.id).order('dim')
      if (kpisGuardados && kpisGuardados.length > 0) {
        setKpis(kpisGuardados as KPI[])
      } else {
        // Cargar estándar
        const iniciales: KPI[] = KPIS_ESTANDAR.map(k => ({...k, id: crypto.randomUUID(), actual: 0}))
        await supabase.from('kpis_empresa').insert(iniciales.map(k => ({...k, user_id: user.id})))
        setKpis(iniciales)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function updateActual(id: string, val: string) {
    const num = parseFloat(val.replace(/\./g,'').replace(',','.')) || 0
    const nuevos = kpis.map(k => k.id === id ? {...k, actual: num} : k)
    setKpis(nuevos)
  }

  async function saveActual(id: string) {
    setSaving(true)
    const kpi = kpis.find(k => k.id === id)
    if (kpi) await supabase.from('kpis_empresa').update({actual: kpi.actual}).eq('id', id)
    setSaving(false)
    setEditando(null)
  }

  async function eliminarKPI(id: string) {
    await supabase.from('kpis_empresa').delete().eq('id', id)
    setKpis(prev => prev.filter(k => k.id !== id))
  }

  async function agregarDesdebiblioteca(kpiBase: Omit<KPI, 'id'|'actual'>) {
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) return
    const nuevo: KPI = {...kpiBase, id: crypto.randomUUID(), actual: 0}
    await supabase.from('kpis_empresa').insert({...nuevo, user_id: user.id})
    setKpis(prev => [...prev, nuevo])
    setShowBiblioteca(false)
  }

  async function crearKPI() {
    if (!formNombre) return
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const nuevo: KPI = {
      id: crypto.randomUUID(),
      nombre: formNombre,
      dim: formDim,
      unidad: formUnidad as any,
      meta: parseFloat(formMeta) || 0,
      actual: 0,
      descripcion: formDesc,
      estandar: false,
    }
    await supabase.from('kpis_empresa').insert({...nuevo, user_id: user.id})
    setKpis(prev => [...prev, nuevo])
    setFormNombre(''); setFormDim('Operaciones'); setFormUnidad('porcentaje'); setFormMeta(''); setFormDesc('')
    setShowAgregar(false)
    setSaving(false)
  }

  const kpisFiltrados = dimFiltro === 'Todos' ? kpis : kpis.filter(k => k.dim === dimFiltro)
  const bibliotecaDisponible = KPIS_ESTANDAR.filter(k => !kpis.find(existing => existing.nombre === k.nombre))

  const resumen = {
    verde: kpis.filter(k => k.actual > 0 && getColor(k) === '#16A34A').length,
    amarillo: kpis.filter(k => k.actual > 0 && getColor(k) === '#D97706').length,
    rojo: kpis.filter(k => k.actual > 0 && getColor(k) === '#EF4444').length,
    sinDato: kpis.filter(k => k.actual === 0).length,
  }

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando KPIs...</div>

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
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--text3)}
        .header-actions{display:flex;gap:10px;flex-wrap:wrap}
        .btn-primary{padding:9px 20px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-radius:0}
        .btn-primary:hover{background:#B45309}
        .btn-outline{padding:9px 20px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;border-radius:0}
        .btn-outline:hover{border-color:rgba(255,255,255,0.25);color:var(--text)}
        .semaforo-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:24px}
        .semaforo-cell{padding:16px 20px;background:var(--bg2);text-align:center}
        .semaforo-num{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;line-height:1}
        .semaforo-label{font-size:11px;color:var(--text2);margin-top:4px}
        .filtros{display:flex;gap:0;margin-bottom:24px;border:1px solid var(--border);width:fit-content}
        .filtro-btn{padding:8px 18px;border:none;background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;border-right:1px solid var(--border)}
        .filtro-btn:last-child{border-right:none}
        .filtro-btn:hover{color:var(--text);background:var(--bg2)}
        .filtro-btn.active{background:var(--amber-dim);color:var(--amber)}
        .kpis-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:var(--border);border:1px solid var(--border)}
        .kpi-card{background:var(--bg2);padding:24px;position:relative;transition:background 0.15s}
        .kpi-card:hover{background:var(--bg3)}
        .kpi-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
        .kpi-dim{font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;padding:3px 8px;border:1px solid;margin-bottom:8px;display:inline-block}
        .kpi-nombre{font-size:14px;font-weight:500;color:var(--text);line-height:1.4;margin-bottom:4px}
        .kpi-desc{font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:16px}
        .kpi-valores{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:10px}
        .kpi-actual{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;line-height:1}
        .kpi-meta-label{font-size:11px;color:var(--text2);text-align:right}
        .kpi-meta-val{font-family:'DM Mono',monospace;font-size:13px;color:var(--text3)}
        .kpi-bar-track{height:3px;background:var(--border);margin-bottom:12px}
        .kpi-bar-fill{height:100%;transition:width 0.5s ease}
        .kpi-actions{display:flex;gap:8px;align-items:center}
        .kpi-pct{font-family:'DM Mono',monospace;font-size:11px;margin-right:auto}
        .btn-mini{padding:4px 10px;border:1px solid var(--border);background:transparent;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;border-radius:0;transition:all 0.15s}
        .btn-mini:hover{border-color:var(--amber-border,rgba(217,119,6,0.3));color:var(--amber)}
        .btn-mini-red{border-color:rgba(239,68,68,0.2);color:rgba(239,68,68,0.5)}
        .btn-mini-red:hover{border-color:#EF4444;color:#EF4444;background:rgba(239,68,68,0.05)}
        .edit-inline{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
        .edit-row-inline{display:flex;gap:8px;align-items:center}
        .field-inline{flex:1;padding:7px 10px;border:1px solid var(--amber-dim,rgba(217,119,6,0.2));background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;border-radius:0}
        .field-inline:focus{border-color:var(--amber)}
        .field-label-small{font-size:11px;color:var(--text2);margin-bottom:4px}
        .btn-save-mini{padding:7px 14px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;border-radius:0;white-space:nowrap}
        .panel{position:fixed;top:0;right:0;bottom:0;width:420px;background:var(--bg2);border-left:1px solid var(--border);padding:32px;overflow-y:auto;z-index:100;animation:slideIn 0.2s ease}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .panel-title{font-family:'Playfair Display',serif;font-size:22px;color:var(--text);margin-bottom:24px;font-weight:400}
        .panel-close{position:absolute;top:24px;right:24px;background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer;line-height:1}
        .panel-close:hover{color:var(--text)}
        .field-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
        .field-label{font-size:12px;color:var(--text3);font-weight:500}
        .field{padding:10px 14px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;width:100%;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--text2)}
        select.field{cursor:pointer}
        .biblioteca-item{padding:14px;border:1px solid var(--border);background:var(--bg3);margin-bottom:8px;cursor:pointer;transition:all 0.15s}
        .biblioteca-item:hover{border-color:var(--amber-dim);background:var(--bg)}
        .biblioteca-item-nombre{font-size:13px;font-weight:500;color:var(--text);margin-bottom:4px}
        .biblioteca-item-desc{font-size:11px;color:var(--text2)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.kpis-grid{grid-template-columns:1fr}.panel{width:100%}.semaforo-bar{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo" onClick={()=>router.push('/dashboard')}><div className="mark">E</div>EOM OS</div>
          <div className="nav-section">Ciclo actual</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard')}>Dashboard</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/diagnostico')}>Diagnóstico</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/plan')}>Plan 90 días</div>
          <div className="nav-item active">KPIs</div>
          <div className="nav-section">Gestión</div>
          <div className="nav-item">Áreas</div>
          <div className="nav-item">Reuniones</div>
          <div className="nav-item">Mejora Continua</div>
          <div className="sidebar-bottom">
            <button className="btn-logout" onClick={async()=>{await supabase.auth.signOut();router.push('/auth')}}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="main">
          <div className="page-header">
            <div>
              <div className="page-title">Cockpit de KPIs</div>
              <div className="page-sub">{empresa?.nombre} · {kpis.length} indicadores activos</div>
            </div>
            <div className="header-actions">
              <button className="btn-outline" onClick={()=>{setShowBiblioteca(true);setShowAgregar(false)}}>+ Desde biblioteca</button>
              <button className="btn-primary" onClick={()=>{setShowAgregar(true);setShowBiblioteca(false)}}>+ Crear KPI</button>
            </div>
          </div>

          {/* Semáforo resumen */}
          <div className="semaforo-bar">
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'#16A34A'}}>{resumen.verde}</div>
              <div className="semaforo-label">En meta</div>
            </div>
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'#D97706'}}>{resumen.amarillo}</div>
              <div className="semaforo-label">En riesgo</div>
            </div>
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'#EF4444'}}>{resumen.rojo}</div>
              <div className="semaforo-label">Fuera de meta</div>
            </div>
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'var(--text2)'}}>{resumen.sinDato}</div>
              <div className="semaforo-label">Sin dato</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="filtros">
            {DIMS.map(d => (
              <button key={d} className={`filtro-btn ${dimFiltro===d?'active':''}`} onClick={()=>setDimFiltro(d)}>{d}</button>
            ))}
          </div>

          {/* Grid de KPIs */}
          <div className="kpis-grid">
            {kpisFiltrados.map(kpi => {
              const color = getColor(kpi)
              const dimColor = DIM_COLORS[kpi.dim] || '#D97706'
              const pct = getPct(kpi)
              return (
                <div key={kpi.id} className="kpi-card">
                  <div className="kpi-dim" style={{color:dimColor, borderColor:dimColor+'44', background:dimColor+'11'}}>{kpi.dim}</div>
                  <div className="kpi-nombre">{kpi.nombre}</div>
                  <div className="kpi-desc">{kpi.descripcion}</div>

                  <div className="kpi-valores">
                    <div>
                      <div style={{fontSize:'11px',color:'var(--text2)',marginBottom:'2px'}}>Actual</div>
                      <div className="kpi-actual" style={{color: kpi.actual > 0 ? color : 'var(--text2)'}}>
                        {kpi.actual > 0 ? formatVal(kpi, kpi.actual) : '—'}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="kpi-meta-label">Meta</div>
                      <div className="kpi-meta-val">{kpi.meta > 0 ? formatVal(kpi, kpi.meta) : '—'}</div>
                    </div>
                  </div>

                  <div className="kpi-bar-track">
                    <div className="kpi-bar-fill" style={{width:`${kpi.actual>0?pct:0}%`, background:color}} />
                  </div>

                  <div className="kpi-actions">
                    <span className="kpi-pct" style={{color: kpi.actual>0 ? color : 'var(--text2)'}}>
                      {kpi.actual > 0 ? `${pct}% de meta` : 'Sin dato aún'}
                    </span>
                    <button className="btn-mini" onClick={()=>setEditando(editando===kpi.id?null:kpi.id)}>
                      {editando===kpi.id ? 'Cerrar' : 'Actualizar'}
                    </button>
                    <button className="btn-mini btn-mini-red" onClick={()=>eliminarKPI(kpi.id)}>✕</button>
                  </div>

                  {editando === kpi.id && (
                    <div className="edit-inline">
                      <div className="field-label-small">Valor actual ({UNIDAD_LABELS[kpi.unidad] || kpi.unidad})</div>
                      <div className="edit-row-inline">
                        <input
                          className="field-inline"
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={kpi.actual || ''}
                          onChange={e => {
                            const num = parseFloat(e.target.value) || 0
                            setKpis(prev => prev.map(k => k.id === kpi.id ? {...k, actual: num} : k))
                          }}
                          onKeyDown={e => e.key === 'Enter' && saveActual(kpi.id)}
                          autoFocus
                        />
                        <button className="btn-save-mini" onClick={()=>saveActual(kpi.id)}>Guardar</button>
                      </div>
                      {kpi.meta === 0 && (
                        <>
                          <div className="field-label-small" style={{marginTop:'10px'}}>Meta</div>
                          <input
                            className="field-inline"
                            type="number"
                            placeholder="Ingresa la meta"
                            style={{width:'100%',marginTop:'4px'}}
                            onBlur={async e => {
                              const meta = parseFloat(e.target.value) || 0
                              setKpis(prev => prev.map(k => k.id === kpi.id ? {...k, meta} : k))
                              await supabase.from('kpis_empresa').update({meta}).eq('id', kpi.id)
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Panel crear KPI */}
      {showAgregar && (
        <>
          <div className="overlay" onClick={()=>setShowAgregar(false)} />
          <div className="panel">
            <button className="panel-close" onClick={()=>setShowAgregar(false)}>×</button>
            <div className="panel-title">Crear KPI propio</div>
            <div className="field-group">
              <label className="field-label">Nombre del indicador *</label>
              <input className="field" placeholder="Ej: Tiempo de instalación de equipos" value={formNombre} onChange={e=>setFormNombre(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Dimensión *</label>
              <select className="field" value={formDim} onChange={e=>setFormDim(e.target.value)}>
                {['Finanzas','Operaciones','Personas','Liderazgo'].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Unidad de medida *</label>
              <select className="field" value={formUnidad} onChange={e=>setFormUnidad(e.target.value)}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="pesos">Pesos ($)</option>
                <option value="dias">Días</option>
                <option value="horas">Horas</option>
                <option value="numero">Número</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Meta</label>
              <input className="field" type="number" placeholder="Ej: 95" value={formMeta} onChange={e=>setFormMeta(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Descripción (opcional)</label>
              <input className="field" placeholder="Qué mide este indicador" value={formDesc} onChange={e=>setFormDesc(e.target.value)} />
            </div>
            <button className="btn-primary" style={{width:'100%',padding:'12px'}} onClick={crearKPI} disabled={!formNombre||saving}>
              {saving ? 'Guardando...' : 'Agregar KPI →'}
            </button>
          </div>
        </>
      )}

      {/* Panel biblioteca */}
      {showBiblioteca && (
        <>
          <div className="overlay" onClick={()=>setShowBiblioteca(false)} />
          <div className="panel">
            <button className="panel-close" onClick={()=>setShowBiblioteca(false)}>×</button>
            <div className="panel-title">Biblioteca de KPIs</div>
            <p style={{fontSize:'13px',color:'var(--text3)',marginBottom:'20px',lineHeight:1.6}}>
              KPIs estándar disponibles para agregar. Los que ya tienes activos no aparecen.
            </p>
            {bibliotecaDisponible.length === 0 ? (
              <p style={{fontSize:'13px',color:'var(--text2)'}}>Ya tienes todos los KPIs estándar activos.</p>
            ) : (
              bibliotecaDisponible.map((k,i) => (
                <div key={i} className="biblioteca-item" onClick={()=>agregarDesdebiblioteca(k)}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:DIM_COLORS[k.dim],textTransform:'uppercase',letterSpacing:'0.08em'}}>{k.dim}</span>
                  </div>
                  <div className="biblioteca-item-nombre">{k.nombre}</div>
                  <div className="biblioteca-item-desc">{k.descripcion}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  )
}
