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

function deriv(ing: number, cd: number, gf: number, ret: number) {
  const margen = ing - cd
  const resultadoOp = margen - gf
  const resultadoReal = resultadoOp - ret
  return { margen, resultadoOp, resultadoReal }
}

export default function CierreCicloPage() {
  const router = useRouter()
  const [empresa, setEmpresa] = useState<any>(null)
  const [cierres, setCierres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({
    ingresos_mensual: '', costo_directo_mensual: '', gastos_fijos_mensual: '',
    retiro_dueno_mensual: '', clientes_activos: '',
  })
  const [comentario, setComentario] = useState('')

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: emp } = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
    if (!emp || !emp.onboarding_completo) { router.push('/onboarding'); return }
    const { data: cs } = await supabase.from('cierres_ciclo_empresa')
      .select('*').eq('empresa_id', emp.id).order('ciclo_numero', { ascending: true })
    setEmpresa(emp)
    setCierres(cs || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6888', fontFamily: 'DM Sans,sans-serif', fontSize: '13px' }}>Cargando...</div>
  if (!empresa) return null

  const cicloActual = empresa.ciclo_numero || 1
  const diasCiclo = empresa.ciclo_inicio ? Math.floor((Date.now() - new Date(empresa.ciclo_inicio).getTime()) / (1000 * 60 * 60 * 24)) : 0
  const cierreActual = cierres.find(c => c.ciclo_numero === cicloActual)
  const cierrePrevio = cierres.find(c => c.ciclo_numero === cicloActual - 1)

  // Base del ciclo en curso: cierre del ciclo anterior, o el onboarding si es el ciclo 1
  const baseCiclo = cierrePrevio ? {
    ingresos_mensual: cierrePrevio.ingresos_mensual,
    costo_directo_mensual: cierrePrevio.costo_directo_mensual,
    gastos_fijos_mensual: cierrePrevio.gastos_fijos_mensual,
    retiro_dueno_mensual: cierrePrevio.retiro_dueno_mensual,
    clientes_activos: cierrePrevio.clientes_activos,
  } : {
    ingresos_mensual: empresa.ingresos_mensual || 0,
    costo_directo_mensual: empresa.costo_directo_mensual || 0,
    gastos_fijos_mensual: empresa.gastos_fijos_mensual || 0,
    retiro_dueno_mensual: empresa.retiro_dueno_mensual || 0,
    clientes_activos: empresa.clientes_activos || 0,
  }

  // Día 0: la base congelada del primer cierre, o el onboarding si aún no hay cierres
  const primerCierre = cierres[0]
  const dia0 = primerCierre ? {
    ingresos_mensual: primerCierre.base_ingresos,
    costo_directo_mensual: primerCierre.base_costo_directo,
    gastos_fijos_mensual: primerCierre.base_gastos_fijos,
    retiro_dueno_mensual: primerCierre.base_retiro_dueno,
    clientes_activos: primerCierre.base_clientes,
  } : baseCiclo

  async function guardar() {
    setError('')
    const vals: Record<string, number> = {}
    for (const c of CAMPOS) {
      if (form[c.key].trim() === '') { setError(`Falta completar: ${c.label}`); return }
      vals[c.key] = parseCLP(form[c.key])
    }
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('cierres_ciclo_empresa').insert({
      user_id: user!.id,
      empresa_id: empresa.id,
      ciclo_numero: cicloActual,
      dia_ciclo: diasCiclo,
      ingresos_mensual: vals.ingresos_mensual,
      costo_directo_mensual: vals.costo_directo_mensual,
      gastos_fijos_mensual: vals.gastos_fijos_mensual,
      retiro_dueno_mensual: vals.retiro_dueno_mensual,
      clientes_activos: vals.clientes_activos,
      base_ingresos: baseCiclo.ingresos_mensual,
      base_costo_directo: baseCiclo.costo_directo_mensual,
      base_gastos_fijos: baseCiclo.gastos_fijos_mensual,
      base_retiro_dueno: baseCiclo.retiro_dueno_mensual,
      base_clientes: baseCiclo.clientes_activos,
      comentario: comentario.trim() || null,
    })
    setGuardando(false)
    if (err) { setError('No se pudo guardar la medición. Intenta de nuevo.'); return }
    setForm({ ingresos_mensual: '', costo_directo_mensual: '', gastos_fijos_mensual: '', retiro_dueno_mensual: '', clientes_activos: '' })
    setComentario('')
    cargar()
  }

  async function iniciarSiguienteCiclo() {
    setGuardando(true)
    const { error: err } = await supabase.from('empresas_empresa')
      .update({ ciclo_inicio: new Date().toISOString(), ciclo_numero: cicloActual + 1 })
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

  function TablaComparacion({ titulo, base, badge }: { titulo: string, base: Record<string, number>, badge?: string }) {
    const c = cierreActual
    const dA = deriv(c.ingresos_mensual, c.costo_directo_mensual, c.gastos_fijos_mensual, c.retiro_dueno_mensual)
    const dB = deriv(base.ingresos_mensual, base.costo_directo_mensual, base.gastos_fijos_mensual, base.retiro_dueno_mensual)
    return (
      <div className="form-card">
        <div className="rep-header">
          <div className="form-title" style={{ border: 'none', padding: 0, margin: 0 }}>{titulo}</div>
          {badge && <div className="rep-badge">{badge}</div>}
        </div>
        <table className="rep">
          <thead>
            <tr><th>Indicador</th><th>Antes</th><th>Día 60</th><th>Variación</th></tr>
          </thead>
          <tbody>
            {CAMPOS.map(campo => {
              const actual = c[campo.key]
              const b = base[campo.key]
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
            <tr className="derivado"><td>Margen</td><td>${fmt(dB.margen)}</td><td>${fmt(dA.margen)}</td><td><Delta actual={dA.margen} base={dB.margen} mejorSi="sube" /></td></tr>
            <tr className="derivado"><td>Resultado operacional</td><td>${fmt(dB.resultadoOp)}</td><td>${fmt(dA.resultadoOp)}</td><td><Delta actual={dA.resultadoOp} base={dB.resultadoOp} mejorSi="sube" /></td></tr>
            <tr className="derivado"><td>Resultado real (post retiro)</td><td>${fmt(dB.resultadoReal)}</td><td>${fmt(dA.resultadoReal)}</td><td><Delta actual={dA.resultadoReal} base={dB.resultadoReal} mejorSi="sube" /></td></tr>
          </tbody>
        </table>
      </div>
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
        .hist-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--brd);font-size:13px}
        .hist-row:last-child{border-bottom:none}
        .hist-ciclo{font-family:'DM Mono',monospace;font-size:11px;color:var(--txt-2);text-transform:uppercase;letter-spacing:0.08em}
        .hist-val{font-family:'DM Mono',monospace;font-size:13px}
        .ciclo-fin{background:var(--surf-2);border:1px solid var(--brd);border-left:2px solid #16A34A;padding:24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={empresa.nombre} />

        <main className="main">
          <div className="page-title">Cierre de ciclo</div>
          <div className="page-sub">Ciclo {cicloActual} · Día {diasCiclo} · {empresa.nombre}</div>

          {/* Fin de ciclo: al día 90 con medición hecha, ofrecer arranque del siguiente */}
          {cierreActual && diasCiclo >= 90 && (
            <div className="ciclo-fin">
              <div>
                <div className="aviso-title">Ciclo {cicloActual} completado</div>
                <div className="aviso-sub">
                  La medición de este ciclo será la línea base del siguiente.
                  Al iniciar el ciclo {cicloActual + 1} parte un nuevo período de 90 días.
                </div>
              </div>
              <button className="btn-secundario" onClick={iniciarSiguienteCiclo} disabled={guardando}>
                {guardando ? 'Iniciando...' : `Iniciar ciclo ${cicloActual + 1}`}
              </button>
            </div>
          )}

          {cierreActual ? (
            <>
              <TablaComparacion
                titulo={`Este ciclo: inicio vs día 60`}
                base={{
                  ingresos_mensual: cierreActual.base_ingresos,
                  costo_directo_mensual: cierreActual.base_costo_directo,
                  gastos_fijos_mensual: cierreActual.base_gastos_fijos,
                  retiro_dueno_mensual: cierreActual.base_retiro_dueno,
                  clientes_activos: cierreActual.base_clientes,
                }}
                badge={`Medición día ${cierreActual.dia_ciclo} · ${new Date(cierreActual.fecha + 'T12:00:00').toLocaleDateString('es-CL')}`}
              />

              {cicloActual > 1 && (
                <TablaComparacion
                  titulo="Avance total: desde tu llegada a EOM"
                  base={dia0}
                  badge={`${cicloActual} ciclos`}
                />
              )}

              {cierreActual.comentario && <div className="rep-comentario">{cierreActual.comentario}</div>}
            </>
          ) : diasCiclo < 60 ? (
            <div className="aviso">
              <div className="aviso-dias">{60 - diasCiclo}</div>
              <div className="aviso-title">Días para la medición del ciclo {cicloActual}</div>
              <div className="aviso-sub">
                La medición se habilita al día 60, con dos meses contables cerrados.
                Ese día capturas los mismos 5 números con los que partió el ciclo y la
                plataforma genera tu comparación. Los días 60 a 90 son para corregir
                y planificar el ciclo siguiente. Recuerda: los resultados financieros
                maduran en 2 a 3 ciclos; el primer ciclo se gana con disciplina operacional.
              </div>
            </div>
          ) : (
            <div className="form-card">
              <div className="form-title">Medición del ciclo {cicloActual} · día {diasCiclo}</div>
              <div className="form-hint">
                Ingresa los valores reales del último mes cerrado. A la derecha de cada campo
                ves el punto de partida de este ciclo. Formato en pesos chilenos, sin decimales.
              </div>
              {CAMPOS.map(c => {
                const esClientes = c.key === 'clientes_activos'
                const baseVal = (baseCiclo as any)[c.key] || 0
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
                <div className="campo-label"><span>Comentario del ciclo (opcional)</span></div>
                <textarea
                  placeholder="Qué funcionó, qué no, y qué aprendiste este ciclo"
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                />
              </div>
              <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar medición y generar reporte'}
              </button>
              {error && <div className="error-msg">{error}</div>}
            </div>
          )}

          {/* Historial de ciclos anteriores */}
          {cierres.filter(c => c.ciclo_numero !== cicloActual).length > 0 && (
            <div className="form-card">
              <div className="form-title">Historial de ciclos</div>
              {cierres.filter(c => c.ciclo_numero !== cicloActual).map(c => {
                const d = deriv(c.ingresos_mensual, c.costo_directo_mensual, c.gastos_fijos_mensual, c.retiro_dueno_mensual)
                return (
                  <div className="hist-row" key={c.id}>
                    <span className="hist-ciclo">Ciclo {c.ciclo_numero} · {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</span>
                    <span className="hist-val">Ingresos ${fmt(c.ingresos_mensual)} · Resultado real ${fmt(d.resultadoReal)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
