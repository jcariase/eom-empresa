'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../../components/Sidebar'

const NIVELES = ['', 'Base', 'Estabilización', 'Estandarización', 'Excelencia']
const ANCLAS = ['Inexistente', 'Iniciado', 'Aplicado', 'Sistemático', 'Excelencia']

function pctAScore(p: number): number {
  if (p >= 90) return 4
  if (p >= 70) return 3
  if (p >= 50) return 2
  if (p >= 25) return 1
  return 0
}

function calcularNivel(total: number, porDim: number[]): number {
  const minDim = Math.min(...porDim)
  if (total >= 102 && minDim >= 16) return 4
  if (total >= 78 && minDim >= 12 && porDim[2] >= 14 && porDim[3] >= 14) return 3
  if (total >= 48 && minDim >= 6) return 2
  return 1
}

export default function RevisionPage() {
  const router = useRouter()
  const [empresa, setEmpresa] = useState<any>(null)
  const [criterios, setCriterios] = useState<any[]>([])
  const [autoScores, setAutoScores] = useState<Record<number, { score: number, valor: string }>>({})
  const [manualScores, setManualScores] = useState<Record<number, number>>({})
  const [ultimaRevision, setUltimaRevision] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState('')
  const [dimAbierta, setDimAbierta] = useState<number | null>(1)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: emp } = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp || !emp.onboarding_completo) { router.push('/onboarding'); return }

      const [{ data: crits }, { data: kpis }, { data: reuniones }, { data: problemas }, { data: plan }, { data: cierres }, { data: revs }] = await Promise.all([
        supabase.from('rubrica_criterios').select('*').eq('version', 1).eq('activo', true).order('dimension').order('orden'),
        supabase.from('kpis_empresa').select('*').eq('user_id', user.id),
        supabase.from('reuniones_empresa').select('*').eq('user_id', user.id),
        supabase.from('problemas_empresa').select('*').eq('user_id', user.id),
        supabase.from('plan_empresa').select('*').eq('user_id', user.id),
        supabase.from('cierres_ciclo_empresa').select('*').eq('empresa_id', emp.id).order('ciclo_numero'),
        supabase.from('revisiones_empresa').select('*').eq('empresa_id', emp.id).eq('estado', 'cerrada').order('created_at', { ascending: false }).limit(1),
      ])

      setEmpresa(emp)
      setCriterios(crits || [])
      setUltimaRevision(revs?.[0] || null)
      setAutoScores(calcularAutos(emp, kpis || [], reuniones || [], problemas || [], plan || [], cierres || []))
      setLoading(false)
    }
    load()
  }, [router])

  function calcularAutos(emp: any, kpis: any[], reuniones: any[], problemas: any[], plan: any[], cierres: any[]) {
    const out: Record<number, { score: number, valor: string }> = {}
    const hace90 = new Date(Date.now() - 90 * 86400000)
    const hoy = new Date()
    const diasCiclo = emp.ciclo_inicio ? Math.floor((Date.now() - new Date(emp.ciclo_inicio).getTime()) / 86400000) : 0

    const reu90 = reuniones.filter(r => new Date(r.fecha + 'T12:00:00') >= hace90)
    const acuerdos = reuniones.flatMap(r => Array.isArray(r.acuerdos) ? r.acuerdos : [])
    const acuerdosVencidos = acuerdos.filter(a => a.cuando && new Date(a.cuando + 'T12:00:00') <= hoy)
    const prob90 = problemas.filter(p => new Date(p.created_at) >= hace90)

    // D1.3: KPIs con meta y área definidos
    const conMetaArea = kpis.filter(k => k.meta !== null && k.area)
    const p13 = kpis.length ? Math.round(conMetaArea.length / kpis.length * 100) : 0
    out[103] = { score: kpis.length ? pctAScore(p13) : 0, valor: kpis.length ? `${conMetaArea.length} de ${kpis.length} KPIs con meta y área (${p13}%)` : 'Sin KPIs creados' }

    // D1.4: plan del ciclo vigente existe tras un cierre
    const planCicloActual = plan.filter(p => p.ciclo === (emp.ciclo_numero || 1))
    out[104] = cierres.length === 0
      ? { score: planCicloActual.length > 0 ? 2 : 0, valor: planCicloActual.length ? 'Plan vigente; aún sin cierres para contrastar' : 'Sin plan del ciclo vigente' }
      : { score: planCicloActual.length > 0 ? 3 : 1, valor: planCicloActual.length ? 'Plan del ciclo vigente definido tras el último cierre' : 'Hubo cierre pero el ciclo vigente no tiene plan' }

    // D2.1: KPIs con valor actual
    const conValor = kpis.filter(k => k.actual !== null)
    const p21 = kpis.length ? Math.round(conValor.length / kpis.length * 100) : 0
    out[201] = { score: kpis.length ? pctAScore(p21) : 0, valor: kpis.length ? `${conValor.length} de ${kpis.length} KPIs con dato vigente (${p21}%)` : 'Sin KPIs creados' }

    // D2.2: KPIs con meta definida
    const conMeta = kpis.filter(k => k.meta !== null)
    const p22 = kpis.length ? Math.round(conMeta.length / kpis.length * 100) : 0
    out[202] = { score: kpis.length ? pctAScore(p22) : 0, valor: kpis.length ? `${conMeta.length} de ${kpis.length} KPIs con meta (${p22}%)` : 'Sin KPIs creados' }

    // D2.5: cierre del ciclo capturado a tiempo
    const ultimoCierre = cierres[cierres.length - 1]
    if (ultimoCierre) {
      const d = ultimoCierre.dia_ciclo || 60
      const s = d <= 70 ? 4 : d <= 80 ? 3 : d <= 90 ? 2 : 1
      out[205] = { score: s, valor: `Última medición capturada el día ${d} del ciclo` }
    } else {
      out[205] = diasCiclo < 60
        ? { score: 2, valor: `Día ${diasCiclo}: aún dentro de plazo para la primera medición` }
        : { score: 0, valor: `Día ${diasCiclo}: medición del ciclo pendiente` }
    }

    // D3.2: cadencia (proxy: reuniones últimos 90 días vs semanal = 13)
    const p32 = Math.min(100, Math.round(reu90.length / 13 * 100))
    out[302] = { score: pctAScore(p32), valor: `${reu90.length} reuniones en 90 días (referencia semanal: 13)` }

    // D3.3: reuniones con al menos un acuerdo completo
    const reuConAcuerdo = reu90.filter(r => Array.isArray(r.acuerdos) && r.acuerdos.some((a: any) => a.que && a.quien && a.cuando))
    const p33 = reu90.length ? Math.round(reuConAcuerdo.length / reu90.length * 100) : 0
    out[303] = { score: reu90.length ? pctAScore(p33) : 0, valor: reu90.length ? `${reuConAcuerdo.length} de ${reu90.length} reuniones con acuerdos completos (${p33}%)` : 'Sin reuniones en 90 días' }

    // D3.4: cumplimiento de acuerdos vencidos
    const cumplidos = acuerdosVencidos.filter(a => a.completado)
    const p34 = acuerdosVencidos.length ? Math.round(cumplidos.length / acuerdosVencidos.length * 100) : 0
    out[304] = { score: acuerdosVencidos.length ? pctAScore(p34) : 0, valor: acuerdosVencidos.length ? `${cumplidos.length} de ${acuerdosVencidos.length} acuerdos vencidos cumplidos (${p34}%)` : 'Sin acuerdos vencidos que medir' }

    // D4.1: registro de problemas en 90 días
    const s41 = prob90.length >= 10 ? 4 : prob90.length >= 6 ? 3 : prob90.length >= 3 ? 2 : prob90.length >= 1 ? 1 : 0
    out[401] = { score: s41, valor: `${prob90.length} problemas registrados en 90 días` }

    // D4.4: problemas vinculados a reuniones o acuerdos
    const vinculados = prob90.filter(p => p.reunion_id || p.acuerdo_id)
    const p44 = prob90.length ? Math.round(vinculados.length / prob90.length * 100) : 0
    out[404] = { score: prob90.length ? pctAScore(p44) : 0, valor: prob90.length ? `${vinculados.length} de ${prob90.length} problemas vinculados a reuniones (${p44}%)` : 'Sin problemas registrados' }

    // D6.2: concentración de responsables (acuerdos + problemas)
    const responsables: Record<string, number> = {}
    acuerdos.forEach(a => { if (a.quien) responsables[a.quien.trim().toLowerCase()] = (responsables[a.quien.trim().toLowerCase()] || 0) + 1 })
    problemas.forEach(p => { if (p.responsable) responsables[p.responsable.trim().toLowerCase()] = (responsables[p.responsable.trim().toLowerCase()] || 0) + 1 })
    const totalResp = Object.values(responsables).reduce((a, b) => a + b, 0)
    if (totalResp >= 3) {
      const top2 = Object.values(responsables).sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0)
      const conc = Math.round(top2 / totalResp * 100)
      const s62 = conc < 35 ? 4 : conc < 50 ? 3 : conc < 65 ? 2 : conc < 80 ? 1 : 0
      out[602] = { score: s62, valor: `Top 2 responsables concentran ${conc}% de acuerdos y problemas` }
    } else {
      out[602] = { score: 0, valor: 'Datos insuficientes para medir distribución' }
    }

    // D6.3: diversidad de origen (proxy: responsables distintos en problemas)
    const distintos = new Set(problemas.filter(p => p.responsable).map(p => p.responsable.trim().toLowerCase())).size
    const s63 = distintos >= 4 ? 4 : distintos >= 3 ? 3 : distintos >= 2 ? 2 : distintos >= 1 ? 1 : 0
    out[603] = { score: s63, valor: `${distintos} personas distintas registran problemas o mejoras` }

    return out
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6888', fontFamily: 'DM Sans,sans-serif', fontSize: '13px' }}>Cargando...</div>
  if (!empresa) return null

  const clave = (c: any) => c.dimension * 100 + c.orden

  function scoreDe(c: any): number | null {
    if (c.tipo === 'auto') return autoScores[clave(c)]?.score ?? 0
    return manualScores[clave(c)] ?? null
  }

  const dims = [1, 2, 3, 4, 5, 6].map(d => {
    const cs = criterios.filter(c => c.dimension === d)
    const scores = cs.map(scoreDe)
    const completa = scores.every(s => s !== null)
    const suma = scores.reduce((a: number, s) => a + (s ?? 0), 0)
    return { d, nombre: cs[0]?.dimension_nombre || '', criterios: cs, suma, completa }
  })

  const todasCompletas = dims.every(x => x.completa)
  const total = dims.reduce((a, x) => a + x.suma, 0)
  const nivel = todasCompletas ? calcularNivel(total, dims.map(x => x.suma)) : null

  function colorDim(suma: number) {
    if (suma >= 16) return '#16A34A'
    if (suma >= 12) return '#D97706'
    return '#EF4444'
  }

  async function guardar() {
    setError('')
    if (!todasCompletas) { setError('Faltan criterios por evaluar. Completa las 6 dimensiones.'); return }
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rev, error: e1 } = await supabase.from('revisiones_empresa').insert({
      user_id: user!.id,
      empresa_id: empresa.id,
      tipo: 'pulso',
      evaluador: 'Autoevaluación',
      puntaje_total: total,
      nivel_resultante: nivel,
      estado: 'cerrada',
    }).select().single()
    if (e1 || !rev) { setGuardando(false); setError('No se pudo guardar la revisión.'); return }
    const filas = criterios.map(c => ({
      user_id: user!.id,
      revision_id: rev.id,
      criterio_id: c.id,
      puntaje: scoreDe(c),
      puntaje_auto: c.tipo === 'auto' ? autoScores[clave(c)]?.score ?? null : null,
      valor_calculado: c.tipo === 'auto' ? autoScores[clave(c)]?.valor ?? null : null,
    }))
    const { error: e2 } = await supabase.from('revision_criterios').insert(filas)
    setGuardando(false)
    if (e2) { setError('Revisión creada pero falló el detalle. Intenta de nuevo.'); return }
    setUltimaRevision(rev)
    setGuardado(true)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--txt-1);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .main{padding:40px;overflow-y:auto;max-width:980px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--txt-3);margin-bottom:28px}
        .resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:28px}
        .res-card{background:var(--surf-2);border:1px solid var(--brd);padding:18px}
        .res-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:8px}
        .res-valor{font-family:'Playfair Display',serif;font-size:26px;line-height:1}
        .res-sub{font-size:11px;color:var(--txt-3);margin-top:6px}
        .dim-card{background:var(--surf-2);border:1px solid var(--brd);margin-bottom:12px}
        .dim-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer;gap:12px}
        .dim-nombre{font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px}
        .dim-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .dim-score{font-family:'DM Mono',monospace;font-size:13px;color:var(--txt-2)}
        .crit{padding:14px 20px;border-top:1px solid var(--brd)}
        .crit-texto{font-size:13px;color:var(--txt-1);margin-bottom:8px;line-height:1.5}
        .crit-auto{font-family:'DM Mono',monospace;font-size:11px;color:var(--txt-2);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .crit-auto-badge{background:var(--surf-3);border:1px solid var(--brd-2);padding:2px 8px;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--amber)}
        .crit-auto-score{font-size:15px;color:var(--txt-1);font-weight:500}
        .escala{display:flex;gap:6px;flex-wrap:wrap}
        .escala button{background:var(--surf-3);border:1px solid var(--brd-2);color:var(--txt-2);font-family:'DM Mono',monospace;font-size:12px;padding:6px 12px;cursor:pointer}
        .escala button.sel{background:var(--amber);border-color:var(--amber);color:#fff}
        .escala .ancla{font-size:10px;display:block;margin-top:2px;font-family:'DM Sans',sans-serif}
        .btn-guardar{background:var(--amber);border:none;color:#fff;font-size:14px;font-weight:500;padding:12px 28px;cursor:pointer;margin-top:16px;font-family:'DM Sans',sans-serif}
        .btn-guardar:disabled{opacity:0.5;cursor:not-allowed}
        .error-msg{color:#EF4444;font-size:13px;margin-top:12px}
        .ok-msg{color:#16A34A;font-size:13px;margin-top:12px}
        .prev-rev{font-size:12px;color:var(--txt-3);margin-bottom:20px}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={empresa.nombre} />

        <main className="main">
          <div className="page-title">Revisión EOM</div>
          <div className="page-sub">Pulso del sistema de gestión · {empresa.nombre}</div>

          {ultimaRevision && !guardado && (
            <div className="prev-rev">
              Última revisión: {new Date(ultimaRevision.created_at).toLocaleDateString('es-CL')} ·
              {' '}{ultimaRevision.puntaje_total} de 120 · Nivel {ultimaRevision.nivel_resultante} {NIVELES[ultimaRevision.nivel_resultante]}
            </div>
          )}

          <div className="resumen">
            <div className="res-card">
              <div className="res-label">Puntaje</div>
              <div className="res-valor">{total}<span style={{ fontSize: '14px', color: 'var(--txt-3)' }}> / 120</span></div>
              <div className="res-sub">{todasCompletas ? 'Evaluación completa' : 'Evaluación en curso'}</div>
            </div>
            <div className="res-card">
              <div className="res-label">Nivel</div>
              <div className="res-valor" style={{ color: 'var(--amber)' }}>{nivel ?? '—'}</div>
              <div className="res-sub">{nivel ? NIVELES[nivel] : 'Completa las 6 dimensiones'}</div>
            </div>
            <div className="res-card">
              <div className="res-label">Automáticos</div>
              <div className="res-valor">{criterios.filter(c => c.tipo === 'auto').length}</div>
              <div className="res-sub">calculados de tus datos reales</div>
            </div>
          </div>

          {dims.map(dim => (
            <div className="dim-card" key={dim.d}>
              <div className="dim-head" onClick={() => setDimAbierta(dimAbierta === dim.d ? null : dim.d)}>
                <div className="dim-nombre">
                  <span className="dim-dot" style={{ background: dim.completa ? colorDim(dim.suma) : 'var(--brd-2)' }} />
                  D{dim.d} · {dim.nombre}
                </div>
                <div className="dim-score">{dim.completa ? `${dim.suma} / 20` : `${dim.criterios.filter(c => scoreDe(c) !== null).length} de 5 evaluados`}</div>
              </div>
              {dimAbierta === dim.d && dim.criterios.map(c => (
                <div className="crit" key={c.id}>
                  <div className="crit-texto">{c.orden}. {c.criterio}</div>
                  {c.tipo === 'auto' ? (
                    <div className="crit-auto">
                      <span className="crit-auto-badge">Auto</span>
                      <span className="crit-auto-score">{autoScores[clave(c)]?.score ?? 0} / 4</span>
                      <span>{autoScores[clave(c)]?.valor}</span>
                    </div>
                  ) : (
                    <div className="escala">
                      {[0, 1, 2, 3, 4].map(v => (
                        <button key={v} className={manualScores[clave(c)] === v ? 'sel' : ''}
                          onClick={() => setManualScores({ ...manualScores, [clave(c)]: v })}>
                          {v}<span className="ancla">{ANCLAS[v]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <button className="btn-guardar" onClick={guardar} disabled={guardando || guardado}>
            {guardado ? 'Revisión guardada' : guardando ? 'Guardando...' : 'Guardar revisión (pulso)'}
          </button>
          {error && <div className="error-msg">{error}</div>}
          {guardado && <div className="ok-msg">Pulso guardado: {total} de 120, Nivel {nivel} {NIVELES[nivel!]}. Quedó registrado en el historial de revisiones.</div>}
        </main>
      </div>
    </>
  )
}
