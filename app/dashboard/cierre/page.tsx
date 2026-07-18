'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../../components/Sidebar'
import { hoyChile, primerDiaMes, formatoISO, fechaLocalDesdeISO, labelMes } from '@/lib/fecha'

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
  { key: 'ingresos', empresaKey: 'ingresos_mensual', label: 'Ingresos del mes', mejorSi: 'sube' },
  { key: 'costo_directo', empresaKey: 'costo_directo_mensual', label: 'Costo directo del mes', mejorSi: 'baja' },
  { key: 'gastos_fijos', empresaKey: 'gastos_fijos_mensual', label: 'Gastos fijos del mes', mejorSi: 'baja' },
  { key: 'retiro_dueno', empresaKey: 'retiro_dueno_mensual', label: 'Retiro del dueño', mejorSi: 'neutro' },
  { key: 'clientes_activos', empresaKey: 'clientes_activos', label: 'Clientes activos', mejorSi: 'sube' },
] as const

type Medicion = {
  id: string
  empresa_id: string
  ciclo_numero: number
  periodo: string
  ingresos: number
  costo_directo: number
  gastos_fijos: number
  retiro_dueno: number
  clientes_activos: number
  es_baseline: boolean
  comentario: string | null
}

function deriv(m: { ingresos: number; costo_directo: number; gastos_fijos: number; retiro_dueno: number }) {
  const margen = m.ingresos - m.costo_directo
  const resultadoOp = margen - m.gastos_fijos
  const resultadoReal = resultadoOp - m.retiro_dueno
  return { margen, resultadoOp, resultadoReal }
}

export default function CierreCicloPage() {
  const router = useRouter()
  const [empresa, setEmpresa] = useState<any>(null)
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({
    ingresos: '', costo_directo: '', gastos_fijos: '', retiro_dueno: '', clientes_activos: '',
  })
  const [comentario, setComentario] = useState('')

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: emp } = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
    if (!emp || !emp.onboarding_completo) { router.push('/onboarding'); return }
    const { data: meds } = await supabase.from('mediciones_empresa')
      .select('*').eq('empresa_id', emp.id).order('periodo', { ascending: true })
    setEmpresa(emp)
    setMediciones(meds || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const periodoActualDate = primerDiaMes(hoyChile())
  const periodoActualISO = formatoISO(periodoActualDate)
  const medicionMes = mediciones.find(m => m.periodo === periodoActualISO)

  useEffect(() => {
    if (!empresa) return
    if (medicionMes && !medicionMes.es_baseline) {
      setForm({
        ingresos: fmt(medicionMes.ingresos),
        costo_directo: fmt(medicionMes.costo_directo),
        gastos_fijos: fmt(medicionMes.gastos_fijos),
        retiro_dueno: fmt(medicionMes.retiro_dueno),
        clientes_activos: fmt(medicionMes.clientes_activos),
      })
      setComentario(medicionMes.comentario || '')
    } else {
      setForm({ ingresos: '', costo_directo: '', gastos_fijos: '', retiro_dueno: '', clientes_activos: '' })
      setComentario('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa, mediciones.length, medicionMes?.id])

  if (loading) return <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6888', fontFamily: 'DM Sans,sans-serif', fontSize: '13px' }}>Cargando...</div>
  if (!empresa) return null

  const cicloActual = empresa.ciclo_numero || 1
  const diasCiclo = empresa.ciclo_inicio ? Math.floor((Date.now() - new Date(empresa.ciclo_inicio).getTime()) / (1000 * 60 * 60 * 24)) : 0

  const baseCiclo = {
    ingresos_mensual: empresa.ingresos_mensual || 0,
    costo_directo_mensual: empresa.costo_directo_mensual || 0,
    gastos_fijos_mensual: empresa.gastos_fijos_mensual || 0,
    retiro_dueno_mensual: empresa.retiro_dueno_mensual || 0,
    clientes_activos: empresa.clientes_activos || 0,
  }

  const baselineRow = mediciones.find(m => m.es_baseline)
  const medicionesMensuales = mediciones.filter(m => !m.es_baseline)
  const ultimaMedicion = medicionesMensuales[medicionesMensuales.length - 1]

  async function guardar() {
    setError('')
    const vals: Record<string, number> = {}
    for (const c of CAMPOS) {
      if (form[c.key].trim() === '') { setError(`Falta completar: ${c.label}`); return }
      vals[c.key] = parseCLP(form[c.key])
    }
    setGuardando(true)
    const payload = {
      empresa_id: empresa.id,
      ciclo_numero: cicloActual,
      periodo: periodoActualISO,
      ingresos: vals.ingresos,
      costo_directo: vals.costo_directo,
      gastos_fijos: vals.gastos_fijos,
      retiro_dueno: vals.retiro_dueno,
      clientes_activos: vals.clientes_activos,
      comentario: comentario.trim() || null,
    }
    if (medicionMes) {
      const { data, error: err } = await supabase.from('mediciones_empresa')
        .update(payload).eq('id', medicionMes.id).select()
      setGuardando(false)
      if (err || !data || data.length === 0) { setError('No se pudo guardar: este período ya no es editable.'); return }
    } else {
      const { error: err } = await supabase.from('mediciones_empresa').insert(payload)
      setGuardando(false)
      if (err) { setError('No se pudo guardar la medición. Intenta de nuevo.'); return }
    }
    cargar()
  }

  async function iniciarSiguienteCiclo() {
    if (!ultimaMedicion) return
    setGuardando(true)
    // Ancla contable: el ciclo parte el dia 1 del mes. Hasta el dia 5 hay
    // gracia (parte retroactivo al 1 de este mes); despues, el 1 del mes siguiente.
    const hoy = new Date()
    const inicio = hoy.getDate() <= 5
      ? new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
    const { error: err } = await supabase.from('empresas_empresa')
      .update({
        ciclo_inicio: inicio.toISOString(),
        ciclo_numero: cicloActual + 1,
        // La medición más reciente pasa a ser la base del ciclo que comienza
        ingresos_mensual: ultimaMedicion.ingresos,
        costo_directo_mensual: ultimaMedicion.costo_directo,
        gastos_fijos_mensual: ultimaMedicion.gastos_fijos,
        retiro_dueno_mensual: ultimaMedicion.retiro_dueno,
        clientes_activos: ultimaMedicion.clientes_activos,
      })
      .eq('id', empresa.id)
    setGuardando(false)
    if (err) { setError('No se pudo iniciar el nuevo ciclo.'); return }
    cargar()
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
        .form-card{background:var(--surf-2);border:1px solid var(--brd);padding:28px;margin-bottom:24px}
        .form-title{font-size:13px;font-weight:500;color:var(--txt-1);margin-bottom:6px;padding-bottom:10px;border-bottom:1px solid var(--brd)}
        .form-hint{font-size:12px;color:var(--txt-2);margin-bottom:20px;margin-top:8px;line-height:1.6}
        .campo{margin-bottom:18px}
        .campo-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:6px;display:flex;justify-content:space-between}
        .campo-base{color:var(--txt-3);text-transform:none;letter-spacing:0}
        .campo input{width:100%;background:var(--surf-3);border:1px solid var(--brd-2);color:var(--txt-1);font-family:'DM Mono',monospace;font-size:15px;padding:10px 12px;outline:none}
        .campo input:focus{border-color:var(--amber)}
        .campo textarea{width:100%;background:var(--surf-3);border:1px solid var(--brd-2);color:var(--txt-1);font-family:'DM Sans',sans-serif;font-size:13px;padding:10px 12px;outline:none;resize:vertical;min-height:70px}
        .btn-guardar{background:var(--amber);border:none;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:12px 28px;cursor:pointer;margin-top:8px}
        .btn-guardar:disabled{opacity:0.5;cursor:not-allowed}
        .btn-secundario{background:none;border:1px solid var(--amber);color:var(--amber);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:12px 28px;cursor:pointer}
        .error-msg{color:#EF4444;font-size:13px;margin-top:12px}
        .rep-header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px}
        .rep-badge{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber);border:1px solid var(--amber-border,rgba(217,119,6,0.3));padding:4px 10px}
        table.rep{width:100%;border-collapse:collapse}
        table.rep th{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);text-align:right;padding:10px 12px;border-bottom:1px solid var(--brd-2)}
        table.rep th:first-child{text-align:left}
        table.rep td{font-family:'DM Mono',monospace;font-size:13px;color:var(--txt-1);text-align:right;padding:10px 12px;border-bottom:1px solid var(--brd)}
        table.rep td:first-child{font-family:'DM Sans',sans-serif;color:var(--txt-3);text-align:left}
        table.rep tr.derivado td{border-top:1px solid var(--brd-2);font-weight:500}
        .delta{font-size:12px}
        .delta.bien{color:#16A34A}
        .delta.mal{color:#EF4444}
        .delta.neutro{color:var(--txt-2)}
        .rep-comentario{background:var(--surf-3);border:1px solid var(--brd);padding:16px;font-size:13px;color:var(--txt-3);line-height:1.6;margin-bottom:24px}
        .badge-baseline{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--amber);border:1px solid var(--amber-border,rgba(217,119,6,0.3));padding:2px 8px;margin-left:8px}
        .tabla-scroll{overflow-x:auto}
        .ciclo-fin{background:var(--surf-2);border:1px solid var(--brd);border-left:2px solid #16A34A;padding:24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={empresa.nombre} />

        <main className="main">
          <div className="page-title">Cierre de ciclo</div>
          <div className="page-sub">Ciclo {cicloActual} · Día {diasCiclo} · {empresa.nombre}</div>

          {/* Fin de ciclo: al día 90 con al menos una medición mensual, ofrecer arranque del siguiente */}
          {ultimaMedicion && diasCiclo >= 90 && (
            <div className="ciclo-fin">
              <div>
                <div className="aviso-title">Ciclo {cicloActual} completado</div>
                <div className="aviso-sub">
                  Tu última medición mensual será la línea base del siguiente ciclo.
                  Al iniciar el ciclo {cicloActual + 1} parte un nuevo período de 90 días.
                </div>
              </div>
              <button className="btn-secundario" onClick={iniciarSiguienteCiclo} disabled={guardando}>
                {guardando ? 'Iniciando...' : `Iniciar ciclo ${cicloActual + 1}`}
              </button>
            </div>
          )}

          {/* (a) Formulario del mes a registrar */}
          {medicionMes && medicionMes.es_baseline ? (
            <div className="aviso">
              <div className="aviso-title">{labelMes(periodoActualDate)} es tu mes de línea base</div>
              <div className="aviso-sub">
                Este período quedó registrado como el punto de partida de tu ciclo.
                Tu primer registro mensual estará disponible el próximo mes.
              </div>
            </div>
          ) : (
            <div className="form-card">
              <div className="form-title">Medición de {labelMes(periodoActualDate)}</div>
              <div className="form-hint">
                Ingresa los valores reales del último mes cerrado. A la derecha de cada campo
                ves el punto de partida de este ciclo. Formato en pesos chilenos, sin decimales.
              </div>
              {CAMPOS.map(c => {
                const esClientes = c.key === 'clientes_activos'
                const baseVal = (baseCiclo as any)[c.empresaKey] || 0
                return (
                  <div className="campo" key={c.key}>
                    <div className="campo-label">
                      <span>{c.label}</span>
                      <span className="campo-base">inicio del ciclo: {esClientes ? fmt(baseVal) : '$' + fmt(baseVal)}</span>
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
                <div className="campo-label"><span>Comentario del mes (opcional)</span></div>
                <textarea
                  placeholder="Qué funcionó, qué no, y qué aprendiste este mes"
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                />
              </div>
              <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : medicionMes ? 'Actualizar medición' : 'Guardar medición'}
              </button>
              {error && <div className="error-msg">{error}</div>}
            </div>
          )}

          {/* (b) Tabla de evolución */}
          {mediciones.length > 0 && (
            <div className="form-card">
              <div className="form-title">Evolución mensual</div>
              <div className="tabla-scroll">
                <table className="rep">
                  <thead>
                    <tr><th>Mes</th><th>Ingresos</th><th>Costo directo</th><th>Gastos fijos</th><th>Retiro dueño</th><th>Clientes</th><th>Resultado real</th></tr>
                  </thead>
                  <tbody>
                    {mediciones.map(m => {
                      const d = deriv(m)
                      return (
                        <tr key={m.id}>
                          <td>{labelMes(fechaLocalDesdeISO(m.periodo))}{m.es_baseline && <span className="badge-baseline">Baseline</span>}</td>
                          <td>${fmt(m.ingresos)}</td>
                          <td>${fmt(m.costo_directo)}</td>
                          <td>${fmt(m.gastos_fijos)}</td>
                          <td>${fmt(m.retiro_dueno)}</td>
                          <td>{fmt(m.clientes_activos)}</td>
                          <td>${fmt(d.resultadoReal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* (c) Comparativo baseline vs última medición */}
          {baselineRow && (
            <div className="form-card">
              <div className="rep-header">
                <div className="form-title" style={{ border: 'none', padding: 0, margin: 0 }}>Baseline vs última medición</div>
                {ultimaMedicion && (
                  <div className="rep-badge">{labelMes(fechaLocalDesdeISO(ultimaMedicion.periodo))}</div>
                )}
              </div>
              {ultimaMedicion ? (
                <div className="tabla-scroll">
                  <table className="rep">
                    <thead>
                      <tr><th>Indicador</th><th>Baseline</th><th>Última medición</th><th>Variación</th></tr>
                    </thead>
                    <tbody>
                      {CAMPOS.map(campo => {
                        const actual = (ultimaMedicion as any)[campo.key]
                        const b = (baselineRow as any)[campo.key]
                        const esClientes = campo.key === 'clientes_activos'
                        return (
                          <tr key={campo.key}>
                            <td>{campo.label}</td>
                            <td>{esClientes ? fmt(b) : '$' + fmt(b)}</td>
                            <td>{esClientes ? fmt(actual) : '$' + fmt(actual)}</td>
                            <td><Delta actual={actual} base={b} mejorSi={campo.mejorSi} /></td>
                          </tr>
                        )
                      })}
                      {(() => {
                        const dA = deriv(ultimaMedicion)
                        const dB = deriv(baselineRow)
                        return (
                          <>
                            <tr className="derivado"><td>Margen</td><td>${fmt(dB.margen)}</td><td>${fmt(dA.margen)}</td><td><Delta actual={dA.margen} base={dB.margen} mejorSi="sube" /></td></tr>
                            <tr className="derivado"><td>Resultado operacional</td><td>${fmt(dB.resultadoOp)}</td><td>${fmt(dA.resultadoOp)}</td><td><Delta actual={dA.resultadoOp} base={dB.resultadoOp} mejorSi="sube" /></td></tr>
                            <tr className="derivado"><td>Resultado real (post retiro)</td><td>${fmt(dB.resultadoReal)}</td><td>${fmt(dA.resultadoReal)}</td><td><Delta actual={dA.resultadoReal} base={dB.resultadoReal} mejorSi="sube" /></td></tr>
                          </>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="aviso-sub">Aún no tienes una medición mensual registrada para comparar con tu línea base.</div>
              )}
              {ultimaMedicion?.comentario && <div className="rep-comentario" style={{ marginTop: 16, marginBottom: 0 }}>{ultimaMedicion.comentario}</div>}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
