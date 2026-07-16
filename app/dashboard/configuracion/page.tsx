'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../../components/Sidebar'

function fmt(n: number) { return n.toLocaleString('es-CL') }
function parseMiles(val: string) { return parseInt(val.replace(/\./g,'')) || 0 }
function handleMiles(val: string, setter: (v: string) => void) {
  const raw = val.replace(/\./g, '').replace(/\D/g, '')
  if (raw === '') { setter(''); return }
  setter(parseInt(raw).toLocaleString('es-CL'))
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState('')
  const [personas, setPersonas] = useState('')
  const [ingresos, setIngresos] = useState('')
  const [costoDirecto, setCostoDirecto] = useState('')
  const [gastosFijos, setGastosFijos] = useState('')
  const [retiro, setRetiro] = useState('')
  const [clientes, setClientes] = useState('')
  const [areas, setAreas] = useState<string[]>([])
  const [areaInput, setAreaInput] = useState('')
  const [suscripcion, setSuscripcion] = useState<{ activo: boolean; plan_nombre: string; plan_vence: string | null }>({ activo: false, plan_nombre: 'Trial', plan_vence: null })
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    async function load() {
      const {data: {user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data: emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setNombre(emp.nombre || '')
      setRubro(emp.rubro || '')
      setPersonas(String(emp.num_personas || ''))
      setIngresos(emp.ingresos_mensual ? emp.ingresos_mensual.toLocaleString('es-CL') : '')
      setCostoDirecto(emp.costo_directo_mensual ? emp.costo_directo_mensual.toLocaleString('es-CL') : '')
      setGastosFijos(emp.gastos_fijos_mensual ? emp.gastos_fijos_mensual.toLocaleString('es-CL') : '')
      setRetiro(emp.retiro_dueno_mensual ? emp.retiro_dueno_mensual.toLocaleString('es-CL') : '')
      setClientes(String(emp.clientes_activos || ''))
      setAreas(emp.areas || [])
      setSuscripcion({
        activo: !!emp.plan_activo,
        plan_nombre: emp.plan_nombre || 'Trial',
        plan_vence: emp.plan_vence || null,
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function suscribirse() {
    setPagando(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/flow/crear', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPagando(false)
        alert(data.error || 'No se pudo iniciar el pago')
      }
    } catch {
      setPagando(false)
      alert('Error de conexión con Flow')
    }
  }

  async function guardarDatosEmpresa() {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('empresas_empresa').update({
      nombre, rubro, num_personas: parseInt(personas) || 0,
    }).eq('user_id', user.id)
    setSaving(false)
    setSavedMsg('Datos de la empresa actualizados')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  async function guardarNumerosBase() {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('empresas_empresa').update({
      ingresos_mensual: parseMiles(ingresos),
      costo_directo_mensual: parseMiles(costoDirecto),
      gastos_fijos_mensual: parseMiles(gastosFijos),
      retiro_dueno_mensual: parseMiles(retiro),
      clientes_activos: parseInt(clientes) || 0,
    }).eq('user_id', user.id)
    setSaving(false)
    setSavedMsg('Números base del ciclo actualizados')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  async function guardarAreas() {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('empresas_empresa').update({areas}).eq('user_id', user.id)
    setSaving(false)
    setSavedMsg('Áreas actualizadas')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  function agregarArea() {
    if (areaInput.trim() && !areas.includes(areaInput.trim())) {
      setAreas(prev => [...prev, areaInput.trim()])
      setAreaInput('')
    }
  }

  function quitarArea(area: string) {
    setAreas(prev => prev.filter(a => a !== area))
  }

  const ing = parseMiles(ingresos)
  const cd = parseMiles(costoDirecto)
  const gf = parseMiles(gastosFijos)
  const ret = parseMiles(retiro)
  const margenBruto = ing - cd
  const resultadoOp = margenBruto - gf
  const resultadoReal = resultadoOp - ret

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando configuración...</div>

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
        .main{padding:40px;max-width:720px;overflow-y:auto}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--txt-3);margin-bottom:32px}
        .saved-toast{background:var(--green-light);color:#0a2e15;font-size:13px;font-weight:500;padding:10px 16px;margin-bottom:20px;display:inline-block}
        .section{background:var(--surf-2);border:1px solid var(--brd);padding:28px;margin-bottom:24px}
        .section-title{font-size:15px;font-weight:500;color:var(--txt-1);margin-bottom:6px}
        .section-sub{font-size:13px;color:var(--txt-3);margin-bottom:20px;line-height:1.6}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .field-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
        .field-label{font-size:12px;color:var(--txt-3);font-weight:500}
        .field{padding:11px 14px;border:1px solid var(--brd-2);background:var(--surf-3);color:var(--txt-1);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;width:100%;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--txt-2)}
        .btn-save{padding:11px 24px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-radius:0}
        .btn-save:hover{background:#B45309}
        .btn-save:disabled{opacity:0.5;cursor:not-allowed}
        .resultado-preview{background:var(--surf-3);border:1px solid var(--brd);padding:20px;margin:16px 0;font-family:'DM Mono',monospace;font-size:13px}
        .resultado-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--brd)}
        .resultado-row:last-child{border-bottom:none;padding-top:10px;margin-top:4px;border-top:1px solid var(--brd-2)}
        .areas-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
        .area-tag{padding:7px 14px;border:1px solid var(--amber-border);background:var(--amber-dim);color:var(--amber-light);font-size:13px;display:flex;align-items:center;gap:8px}
        .area-tag-x{cursor:pointer;color:var(--amber);font-size:16px;line-height:1}
        .area-tag-x:hover{color:#fff}
        .area-add-row{display:flex;gap:10px}
        .btn-add{padding:11px 20px;border:1px solid var(--brd-2);background:transparent;color:var(--txt-3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;white-space:nowrap}
        .btn-add:hover{border-color:var(--amber-border);color:var(--amber)}
        .warning-box{background:rgba(217,119,6,0.08);border:1px solid var(--amber-border);padding:14px 16px;font-size:12px;color:var(--txt-3);line-height:1.6;margin-bottom:16px}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}.field-row{grid-template-columns:1fr}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={nombre} />

        <main className="main">
          <div className="page-title">Configuración</div>
          <div className="page-sub">Datos de tu empresa, números base y áreas</div>

          {savedMsg && <div className="saved-toast">{savedMsg}</div>}

          {/* Suscripción */}
          <div className="section">
            <div className="section-title">Suscripción</div>
            {suscripcion.activo ? (
              <div>
                <div style={{ color: '#16A34A', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>✓ {suscripcion.plan_nombre} — activo</div>
                {suscripcion.plan_vence && (
                  <div className="section-sub">Vigente hasta {new Date(suscripcion.plan_vence).toLocaleDateString('es-CL')}</div>
                )}
              </div>
            ) : (
              <div>
                <div className="section-sub" style={{ marginBottom: 12 }}>Suscripción mensual EOM OS Empresa: $390.000/mes.</div>
                <button
                  onClick={suscribirse}
                  disabled={pagando}
                  style={{ padding: '10px 20px', border: 'none', background: '#D97706', color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  {pagando ? 'Redirigiendo a Flow...' : 'Suscribirse ahora →'}
                </button>
              </div>
            )}
          </div>

          {/* Datos de la empresa */}
          <div className="section">
            <div className="section-title">Datos de la empresa</div>
            <div className="section-sub">Información general de tu organización.</div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Nombre de la empresa</label>
                <input className="field" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Número de personas</label>
                <input className="field" type="number" value={personas} onChange={e => setPersonas(e.target.value)} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Rubro principal</label>
              <input className="field" value={rubro} onChange={e => setRubro(e.target.value)} />
            </div>
            <button className="btn-save" onClick={guardarDatosEmpresa} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar datos de empresa'}
            </button>
          </div>

          {/* Números base */}
          <div className="section">
            <div className="section-title">Números base del ciclo</div>
            <div className="section-sub">
              Estos son los valores de partida del ciclo vigente y se comparan con la medición del día 60. Si ya guardaste la medición de este ciclo, el reporte conserva la base con la que se generó; los cambios que hagas aquí aplican hacia adelante. Al iniciar un ciclo nuevo, la última medición se convierte automáticamente en la nueva base.
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Ingresos mensuales promedio ($)</label>
                <input className="field" value={ingresos} onChange={e => handleMiles(e.target.value, setIngresos)} />
              </div>
              <div className="field-group">
                <label className="field-label">Costo directo mensual promedio ($)</label>
                <input className="field" value={costoDirecto} onChange={e => handleMiles(e.target.value, setCostoDirecto)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Gastos fijos mensuales ($)</label>
                <input className="field" value={gastosFijos} onChange={e => handleMiles(e.target.value, setGastosFijos)} />
              </div>
              <div className="field-group">
                <label className="field-label">Retiro del dueño mensual ($)</label>
                <input className="field" value={retiro} onChange={e => handleMiles(e.target.value, setRetiro)} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Clientes activos</label>
              <input className="field" type="number" value={clientes} onChange={e => setClientes(e.target.value)} />
            </div>

            {ing > 0 && (
              <div className="resultado-preview">
                <div className="resultado-row"><span>Margen bruto</span><span style={{color: margenBruto >= 0 ? 'var(--txt-1)' : 'var(--red)'}}>$ {fmt(margenBruto)}</span></div>
                <div className="resultado-row"><span>Resultado operacional</span><span style={{color: resultadoOp >= 0 ? 'var(--txt-1)' : 'var(--red)'}}>$ {fmt(resultadoOp)}</span></div>
                <div className="resultado-row"><span style={{fontWeight: 500, color: 'var(--txt-1)'}}>Resultado real</span><span style={{fontWeight: 500, color: resultadoReal >= 0 ? 'var(--green-light)' : 'var(--red)'}}>$ {fmt(resultadoReal)}</span></div>
              </div>
            )}

            <button className="btn-save" onClick={guardarNumerosBase} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar números base'}
            </button>
          </div>

          {/* Áreas */}
          <div className="section">
            <div className="section-title">Áreas de la empresa</div>
            <div className="section-sub">
              Las áreas definen cómo se organiza tu cockpit de KPIs. Cada área tiene sus propios indicadores.
            </div>

            <div className="warning-box">
              Si eliminas un área que ya tiene KPIs activos, esos KPIs no se borran pero dejan de aparecer en el cockpit. Revisa antes de quitar un área en uso.
            </div>

            {areas.length > 0 && (
              <div className="areas-tags">
                {areas.map(a => (
                  <div key={a} className="area-tag">
                    {a}
                    <span className="area-tag-x" onClick={() => quitarArea(a)}>×</span>
                  </div>
                ))}
              </div>
            )}

            <div className="area-add-row" style={{marginBottom: 16}}>
              <input
                className="field"
                placeholder="Nombre de la nueva área"
                value={areaInput}
                onChange={e => setAreaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarArea()}
              />
              <button className="btn-add" onClick={agregarArea}>Agregar</button>
            </div>

            <button className="btn-save" onClick={guardarAreas} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar áreas'}
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
