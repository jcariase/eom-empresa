'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../../components/Sidebar'

function fmt(n: number) { return n.toLocaleString('es-CL') }

function parseCLP(s: string): number {
  const limpio = s.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '')
  const n = Number(limpio)
  return isNaN(n) ? 0 : Math.round(n)
}

function fmtInput(s: string): string {
  const n = parseCLP(s)
  return n === 0 ? '' : n.toLocaleString('es-CL')
}

const CAMPOS = [
  { key: 'ingresos_mensual', base: 'base_ingresos', label: 'Ingresos del mes', mejorSi: 'sube' },
  { key: 'costo_directo_mensual', base: 'base_costo_directo', label: 'Costo directo del mes', mejorSi: 'baja' },
  { key: 'gastos_fijos_mensual', base: 'base_gastos_fijos', label: 'Gastos fijos del mes', mejorSi: 'baja' },
  { key: 'retiro_dueno_mensual', base: 'base_retiro_dueno', label: 'Retiro del dueño', mejorSi: 'neutro' },
  { key: 'clientes_activos', base: 'base_clientes', label: 'Clientes activos', mejorSi: 'sube' },
] as const

export default function CierreCicloPage() {
  const router = useRouter()
  const [empresa, setEmpresa] = useState<any>(null)
  const [cierre, setCierre] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({
    ingresos_mensual: '', costo_directo_mensual: '', gastos_fijos_mensual: '',
    retiro_dueno_mensual: '', clientes_activos: '',
  })
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: emp } = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp || !emp.onboarding_completo) { router.push('/onboarding'); return }
      const { data: c } = await supabase.from('cierres_ciclo_empresa')
        .select('*').eq('empresa_id', emp.id).order('ciclo_numero', { ascending: false }).limit(1).maybeSingle()
      setEmpresa(emp)
      setCierre(c)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6888', fontFamily: 'DM Sans,sans-serif', fontSize: '13px' }}>Cargando...</div>
  if (!empresa) return null

  const diasCiclo = empresa.ciclo_inicio ? Math.floor((Date.now() - new Date(empresa.ciclo_inicio).getTime()) / (1000 * 60 * 60 * 24)) : 0
  const habilitado = diasCiclo >= 60
  const yaCerrado = !!cierre

  async function guardar() {
    setError('')
    const vals: Record<string, number> = {}
    for (const c of CAMPOS) {
      const v = parseCLP(form[c.key])
      if (form[c.key].trim() === '') { setError(`Falta completar: ${c.label}`); return }
      vals[c.key] = v
    }
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('cierres_ciclo_empresa').insert({
      user_id: user!.id,
      empresa_id: empresa.id,
      ciclo_numero: 1,
      dia_ciclo: diasCiclo,
      ingresos_mensual: vals.ingresos_mensual,
      costo_directo_mensual: vals.costo_directo_mensual,
      gastos_fijos_mensual: vals.gastos_fijos_mensual,
      retiro_dueno_mensual: vals.retiro_dueno_mensual,
      clientes_activos: vals.clientes_activos,
      base_ingresos: empresa.ingresos_mensual || 0,
      base_costo_directo: empresa.costo_directo_mensual || 0,
      base_gastos_fijos: empresa.gastos_fijos_mensual || 0,
      base_retiro_dueno: empresa.retiro_dueno_mensual || 0,
      base_clientes: empresa.clientes_activos || 0,
      comentario: comentario.trim() || null,
    })
    setGuardando(false)
    if (err) { setError('No se pudo guardar el cierre. Intenta de nuevo.'); return }
    const { data: c } = await supabase.from('cierres_ciclo_empresa')
      .select('*').eq('empresa_id', empresa.id).order('ciclo_numero', { ascending: false }).limit(1).maybeSingle()
    setCierre(c)
  }

  // Derivados para el reporte
  function derivados(src: 'actual' | 'base') {
    if (!cierre) return { margen: 0, resultadoOp: 0, resultadoReal: 0 }
    const ing = src === 'actual' ? cierre.ingresos_mensual : cierre.base_ingresos
    const cd = src === 'actual' ? cierre.costo_directo_mensual : cierre.base_costo_directo
    const gf = src === 'actual' ? cierre.gastos_fijos_mensual : cierre.base_gastos_fijos
    const ret = src === 'actual' ? cierre.retiro_dueno_mensual : cierre.base_retiro_dueno
    const margen = ing - cd
    const resultadoOp = margen - gf
    const resultadoReal = resultadoOp - ret
    return { margen, resultadoOp, resultadoReal }
  }

  function Delta({ actual, base, mejorSi }: { actual: number, base: number, mejorSi: string }) {
    const d = actual - base
    if (d === 0 || mejorSi === 'neutro') return <span className="delta neutro">{d === 0 ? 'sin cambio' : (d > 0 ? '+' : '−') + fmt(Math.abs(d))}</span>
    const positivo = mejorSi === 'sube' ? d > 0 : d < 0
    const pct = base !== 0 ? Math.round(Math.abs(d) / Math.abs(base) * 100) : null
    return (
      <span className={`delta ${positivo ? 'bien' : 'mal'}`}>
        {d > 0 ? '+' : '−'}{fmt(Math.abs(d))}{pct !== null ? ` (${d > 0 ? '+' : '−'}${pct}%)` : ''}
      </span>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--txt-1);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .main{padding:40px;overflow-y:auto;max-width:900px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--txt-3);margin-bottom:32px}
        .aviso{background:var(--surf-2);border:1px solid var(--brd);border-left:2px solid var(--amber);padding:24px;margin-bottom:24px}
        .aviso-title{font-size:15px;font-weight:500;color:var(--txt-1);margin-bottom:6px}
        .aviso-sub{font-size:13px;color:var(--txt-3);line-height:1.6}
        .aviso-dias{font-family:'Playfair Display',serif;font-size:40px;color:var(--amber);line-height:1;margin-bottom:8px}
        .form-card{background:var(--surf-2);border:1px solid var(--brd);padding:28px;margin-bottom:24px}
        .form-title{font-size:13px;font-weight:500;color:var(--txt-1);margin-bottom:6px;padding-bottom:10px;border-bottom:1px solid var(--brd)}
        .form-hint{font-size:12px;color:var(--txt-2);margin-bottom:20px;margin-top:8px}
        .campo{margin-bottom:18px}
        .campo-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:6px;display:flex;justify-content:space-between}
        .campo-base{color:var(--txt-3);text-transform:none;letter-spacing:0}
        .campo input{width:100%;background:var(--surf-3);border:1px solid var(--brd-2);color:var(--txt-1);font-family:'DM Mono',monospace;font-size:15px;padding:10px 12px;outline:none}
        .campo input:focus{border-color:var(--amber)}
        .campo textarea{width:100%;background:var(--surf-3);border:1px solid var(--brd-2);color:var(--txt-1);font-family:'DM Sans',sans-serif;font-size:13px;padding:10px 12px;outline:none;resize:vertical;min-height:70px}
        .btn-guardar{background:var(--amber);border:none;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:12px 28px;cursor:pointer;margin-top:8px}
        .btn-guardar:disabled{opacity:0.5;cursor:not-allowed}
        .error-msg{color:#EF4444;font-size:13px;margin-top:12px}
        .rep-header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px}
        .rep-badge{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber);border:1px solid var(--amber-border,rgba(217,119,6,0.3));padding:4px 10px}
        table.rep{width:100%;border-collapse:collapse;margin-bottom:24px}
        table.rep th{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);text-align:right;padding:10px 12px;border-bottom:1px solid var(--brd-2)}
        table.rep th:first-child{text-align:left}
        table.rep td{font-family:'DM Mono',monospace;font-size:13px;color:var(--txt-1);text-align:right;padding:10px 12px;border-bottom:1px solid var(--brd)}
        table.rep td:first-child{font-family:'DM Sans',sans-serif;color:var(--txt-3);text-align:left}
        table.rep tr.derivado td{border-top:1px solid var(--brd-2);font-weight:500}
        .delta{font-size:12px}
        .delta.bien{color:#16A34A}
        .delta.mal{color:#EF4444}
        .delta.neutro{color:var(--txt-2)}
        .rep-comentario{background:var(--surf-3);border:1px solid var(--brd);padding:16px;font-size:13px;color:var(--txt-3);line-height:1.6}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={empresa.nombre} />

        <main className="main">
          <div className="page-title">Cierre de ciclo</div>
          <div className="page-sub">Día {diasCiclo} del ciclo · {empresa.nombre}</div>

          {yaCerrado ? (
            <>
              <div className="form-card">
                <div className="rep-header">
                  <div className="form-title" style={{ border: 'none', padding: 0, margin: 0 }}>Reporte antes / después</div>
                  <div className="rep-badge">Cierre día {cierre.dia_ciclo} · {new Date(cierre.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</div>
                </div>
                <table className="rep">
                  <thead>
                    <tr><th>Indicador</th><th>Inicio de ciclo</th><th>Día 60</th><th>Variación</th></tr>
                  </thead>
                  <tbody>
                    {CAMPOS.map(c => {
                      const actual = cierre[c.key]
                      const base = cierre[c.base]
                      const esClientes = c.key === 'clientes_activos'
                      return (
                        <tr key={c.key}>
                          <td>{c.label}</td>
                          <td>{esClientes ? fmt(base) : '$' + fmt(base)}</td>
                          <td>{esClientes ? fmt(actual) : '$' + fmt(actual)}</td>
                          <td><Delta actual={actual} base={base} mejorSi={c.mejorSi} /></td>
                        </tr>
                      )
                    })}
                    {(() => {
                      const a = derivados('actual'); const b = derivados('base')
                      return (
                        <>
                          <tr className="derivado"><td>Margen</td><td>${fmt(b.margen)}</td><td>${fmt(a.margen)}</td><td><Delta actual={a.margen} base={b.margen} mejorSi="sube" /></td></tr>
                          <tr className="derivado"><td>Resultado operacional</td><td>${fmt(b.resultadoOp)}</td><td>${fmt(a.resultadoOp)}</td><td><Delta actual={a.resultadoOp} base={b.resultadoOp} mejorSi="sube" /></td></tr>
                          <tr className="derivado"><td>Resultado real (post retiro)</td><td>${fmt(b.resultadoReal)}</td><td>${fmt(a.resultadoReal)}</td><td><Delta actual={a.resultadoReal} base={b.resultadoReal} mejorSi="sube" /></td></tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>
                {cierre.comentario && <div className="rep-comentario">{cierre.comentario}</div>}
              </div>
            </>
          ) : !habilitado ? (
            <div className="aviso">
              <div className="aviso-dias">{Math.max(0, 60 - diasCiclo)}</div>
              <div className="aviso-title">Días para el cierre de ciclo</div>
              <div className="aviso-sub">
                El cierre se habilita al día 60 del ciclo. Ese día capturas los mismos 5 números
                con los que partiste y la plataforma genera tu comparación antes / después.
                Mientras tanto, el foco está en ejecutar el Plan 90 días.
              </div>
            </div>
          ) : (
            <div className="form-card">
              <div className="form-title">Captura del día 60</div>
              <div className="form-hint">
                Ingresa los valores reales del último mes. A la derecha de cada campo ves el
                valor con el que iniciaste el ciclo. Formato en pesos chilenos, sin decimales.
              </div>
              {CAMPOS.map(c => {
                const esClientes = c.key === 'clientes_activos'
                const baseVal = c.key === 'ingresos_mensual' ? empresa.ingresos_mensual
                  : c.key === 'costo_directo_mensual' ? empresa.costo_directo_mensual
                  : c.key === 'gastos_fijos_mensual' ? empresa.gastos_fijos_mensual
                  : c.key === 'retiro_dueno_mensual' ? empresa.retiro_dueno_mensual
                  : empresa.clientes_activos
                return (
                  <div className="campo" key={c.key}>
                    <div className="campo-label">
                      <span>{c.label}</span>
                      <span className="campo-base">inicio: {esClientes ? fmt(baseVal || 0) : '$' + fmt(baseVal || 0)}</span>
                    </div>
                    <input
                      inputMode="numeric"
                      placeholder={esClientes ? '0' : '$ 0'}
                      value={form[c.key]}
                      onChange={e => setForm({ ...form, [c.key]: e.target.value })}
                      onBlur={e => setForm({ ...form, [c.key]: fmtInput(e.target.value) })}
                    />
                  </div>
                )
              })}
              <div className="campo">
                <div className="campo-label"><span>Comentario del ciclo (opcional)</span></div>
                <textarea
                  placeholder="Qué funcionó, qué no, y qué aprendiste este ciclo"
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                />
              </div>
              <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Cerrar ciclo y generar reporte'}
              </button>
              {error && <div className="error-msg">{error}</div>}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
