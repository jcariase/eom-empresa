'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const AREAS_SUGERIDAS: Record<string, string[]> = {
  'Equipos y maquinaria': ['Operaciones','Comercial','Logística y Bodega','Administración y Finanzas','Servicio Técnico'],
  'Construcción': ['Operaciones en terreno','Comercial','Administración','Logística','Recursos Humanos'],
  'Manufactura': ['Producción','Calidad','Comercial','Logística','Administración'],
  'Servicios': ['Operaciones','Comercial','Administración','Recursos Humanos'],
  'Retail': ['Ventas','Bodega e Inventario','Administración','Compras'],
  'Otro': ['Operaciones','Comercial','Administración'],
}

const PREGUNTAS = [
  {dim:'Finanzas',texto:'¿Conoces tu utilidad neta del mes anterior antes del día 10?',impacto:'Sin esto, tomas decisiones de gasto a ciegas.'},
  {dim:'Finanzas',texto:'¿Tienes proyección de flujo de caja para los próximos 30 días?',impacto:'El 60% de las pymes que quiebran son rentables pero sin caja.'},
  {dim:'Finanzas',texto:'¿Tu cobranza tiene proceso definido con fechas y responsable?',impacto:'Un proceso reduce días de cobro en 30–40%.'},
  {dim:'Finanzas',texto:'¿Tus gastos fijos están documentados y los revisas mensualmente?',impacto:'Empresas que revisan gastos fijos ahorran en promedio 8–12% anual.'},
  {dim:'Finanzas',texto:'¿Tienes metas financieras escritas con número y fecha?',impacto:'Metas escritas aumentan la probabilidad de logro en 42%.'},
  {dim:'Operaciones',texto:'¿Las reuniones de tu equipo terminan con acuerdos escritos y dueño?',impacto:'Sin acuerdos escritos, el 70% de lo decidido no se ejecuta.'},
  {dim:'Operaciones',texto:'¿Tienes indicadores operacionales que revisas cada semana?',impacto:'KPIs semanales permiten corregir desviaciones 4x más rápido.'},
  {dim:'Operaciones',texto:'¿Los problemas que aparecen este mes son distintos a los del mes pasado?',impacto:'Problemas repetidos cuestan 2x más que resolverlos una vez bien.'},
  {dim:'Operaciones',texto:'¿Tienes objetivos trimestrales definidos y el equipo los conoce?',impacto:'Equipos con objetivos trimestrales logran 35% más de resultados.'},
  {dim:'Operaciones',texto:'¿Puedes irte una semana y la operación no colapsa?',impacto:'Si no puedes, tu negocio depende de ti como persona, no como sistema.'},
  {dim:'Personas',texto:'¿Tu equipo sabe exactamente qué se espera de ellos en términos de resultados?',impacto:'Claridad de rol reduce fricción y reuniones en 40%.'},
  {dim:'Personas',texto:'¿Las personas toman decisiones de su área sin consultarte todo?',impacto:'Cada decisión que pasa por ti es un cuello de botella.'},
  {dim:'Personas',texto:'¿Tu equipo propone mejoras por iniciativa propia al menos una vez al mes?',impacto:'Empresas con cultura bottom-up reducen costos 15–20% más rápido.'},
  {dim:'Personas',texto:'¿La rotación de personal en tu empresa es baja (menos del 15% anual)?',impacto:'Reemplazar a una persona cuesta entre 50–200% de su sueldo anual.'},
  {dim:'Personas',texto:'¿Tu equipo entiende cómo su trabajo impacta los resultados del negocio?',impacto:'Equipos con conexión causa-efecto tienen 2.5x más compromiso.'},
  {dim:'Liderazgo',texto:'¿Tienes tiempo real para pensar en el futuro del negocio, no solo en apagar incendios?',impacto:'Líderes que invierten menos del 20% en estrategia crecen 40% menos.'},
  {dim:'Liderazgo',texto:'¿Delegas con confianza o terminas rehaciendo el trabajo?',impacto:'Rehacer trabajo cuesta el doble y destruye la motivación del equipo.'},
  {dim:'Liderazgo',texto:'¿Tus decisiones importantes tienen datos detrás, no solo intuición?',impacto:'Decisiones basadas en datos tienen 3x más probabilidad de ser correctas.'},
  {dim:'Liderazgo',texto:'¿Sabes cuáles son las 3 prioridades más importantes de este trimestre?',impacto:'Líderes que revisan prioridades semanalmente logran objetivos 60% más.'},
  {dim:'Liderazgo',texto:'¿Tu negocio podría funcionar sin ti por un mes con resultados similares?',impacto:'Un negocio que depende de una persona no es un activo, es un trabajo.'},
]

const DIMS = ['Finanzas','Operaciones','Personas','Liderazgo']

function getEstado(score: number) {
  if (score <= 35) return {nombre:'Modo Bombero',color:'#EF4444',bg:'rgba(239,68,68,0.1)',desc:'Tu organización opera en crisis permanente. Todo pasa por ti. El primer ciclo EOM estabiliza la base.'}
  if (score <= 55) return {nombre:'Estabilidad Base',color:'#D97706',bg:'rgba(217,119,6,0.1)',desc:'Tienes algunos sistemas pero sigues siendo el cuello de botella clave. El ciclo EOM elimina esa dependencia.'}
  if (score <= 75) return {nombre:'Gestión Estructurada',color:'#2563EB',bg:'rgba(37,99,235,0.1)',desc:'Tu sistema funciona. El siguiente salto es que opere solo, sin que tú lo empujes.'}
  return {nombre:'Excelencia Autónoma',color:'#16A34A',bg:'rgba(22,163,74,0.1)',desc:'Tu empresa trabaja para ti. EOM activa el ciclo siguiente para que este estándar no se cristalice.'}
}

function getPlan(scores: Record<string,number>): {area:string,foco:string,acciones:string[]}[] {
  const sorted = DIMS.map(d => ({dim:d, score:scores[d]||0})).sort((a,b)=>a.score-b.score)
  const planes: Record<string,{foco:string,acciones:string[]}> = {
    'Finanzas': {foco:'Visibilidad financiera real',acciones:['Implementar cierre mensual antes del día 10','Construir proyección de caja a 30 días','Definir 3 KPIs financieros semanales']},
    'Operaciones': {foco:'Estandarizar y delegar la operación',acciones:['Documentar los 3 procesos más críticos','Instalar reunión semanal de equipo con acuerdos escritos','Definir KPIs por área con responsable']},
    'Personas': {foco:'Construir equipo autónomo',acciones:['Definir roles y resultados esperados por persona','Delegar una decisión recurrente a tu equipo este mes','Crear mecanismo de propuestas de mejora del equipo']},
    'Liderazgo': {foco:'Liberar tiempo estratégico',acciones:['Bloquear 4 horas semanales para estrategia sin interrupciones','Definir las 3 prioridades del trimestre con el equipo','Crear tablero de decisiones delegadas vs. centralizadas']},
  }
  return sorted.slice(0,3).map(s => ({area:s.dim, ...planes[s.dim]}))
}

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

export default function Onboarding() {
  const router = useRouter()
  const [userId, setUserId] = useState<string|null>(null)
  const [paso, setPaso] = useState(1)
  const [guardando, setGuardando] = useState(false)

  // Paso 1 — Empresa
  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState('')
  const [personas, setPersonas] = useState('')
  const [ingresos, setIngresos] = useState('')
  const [costoDirecto, setCostoDirecto] = useState('')
  const [gastosFijos, setGastosFijos] = useState('')
  const [retiro, setRetiro] = useState('')
  const [clientes, setClientes] = useState('')

  function handleMiles(val: string, setter: (v: string) => void) {
    const raw = val.replace(/\./g, '').replace(/\D/g, '')
    if (raw === '') { setter(''); return }
    setter(parseInt(raw).toLocaleString('es-CL'))
  }
  function parseMiles(val: string) { return parseInt(val.replace(/\./g,'')) || 0 }

  // Paso 2 — Areas
  const [areas, setAreas] = useState<string[]>([])
  const [areaInput, setAreaInput] = useState('')

  // Paso 3 — Diagnostico
  const [respuestas, setRespuestas] = useState<Record<number,number>>({})
  const [resultado, setResultado] = useState<any>(null)

  // Paso 4 — Plan
  const [plan, setPlan] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => {
      if (!data.user) router.push('/auth')
      else setUserId(data.user.id)
    })
  }, [router])

  useEffect(() => {
    if (rubro && AREAS_SUGERIDAS[rubro]) setAreas(AREAS_SUGERIDAS[rubro])
  }, [rubro])

  function calcScore(resp: Record<number,number>) {
    const total = Object.values(resp).reduce((a,b)=>a+b,0)
    return Math.round((total/(PREGUNTAS.length*5))*100)
  }

  function calcDimScore(dim: string, resp: Record<number,number>) {
    const idxs = PREGUNTAS.map((p,i)=>p.dim===dim?i:-1).filter(i=>i>=0)
    const sum = idxs.reduce((a,i)=>a+(resp[i]||0),0)
    return Math.round((sum/(idxs.length*5))*100)
  }

  async function guardarEmpresa() {
    if (!userId) return
    setGuardando(true)
    const {error: empError} = await supabase.from('empresas_empresa').upsert({
      user_id: userId,
      nombre,
      rubro,
      num_personas: parseInt(personas),
      ingresos_mensual: parseMiles(ingresos),
      costo_directo_mensual: parseMiles(costoDirecto),
      gastos_fijos_mensual: parseMiles(gastosFijos),
      retiro_dueno_mensual: parseMiles(retiro),
      clientes_activos: parseInt(clientes),
      areas,
      ciclo_inicio: new Date().toISOString(),
    })
    if (empError) { console.error('Error guardando empresa:', empError); setGuardando(false); return }
    setGuardando(false)
    setPaso(3)
  }

  async function guardarDiagnostico() {
    if (!userId) return
    setGuardando(true)
    const score_total = calcScore(respuestas)
    const scores: Record<string,number> = {}
    DIMS.forEach(d => {scores[d] = calcDimScore(d, respuestas)})
    const estado = getEstado(score_total)
    const planGenerado = getPlan(scores)

    await supabase.from('diagnosticos_empresa').insert({
      user_id: userId,
      scores,
      score_total,
      estado: estado.nombre,
      ciclo: 1,
      respuestas,
    })

    setResultado({score_total, scores, estado})
    setPlan(planGenerado)
    setGuardando(false)
    setPaso(4)
  }

  async function finalizarOnboarding() {
    if (!userId) return
    setGuardando(true)
    await supabase.from('empresas_empresa').upsert({user_id: userId, onboarding_completo: true}, {onConflict: 'user_id'})
    setGuardando(false)
    router.push('/dashboard')
  }

  const totalResp = Object.keys(respuestas).length
  const completo = totalResp === PREGUNTAS.length

  // Resultado financiero preview
  const ing = parseMiles(ingresos)
  const cd = parseMiles(costoDirecto)
  const gf = parseMiles(gastosFijos)
  const ret = parseMiles(retiro)
  const margenBruto = ing - cd
  const resultadoOp = margenBruto - gf
  const resultadoReal = resultadoOp - ret

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#07090E;--bg2:#0C0F18;--bg3:#111520;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);--text:#E8EDF8;--text2:#5A6888;--text3:#8A9AB8;--amber:#D97706;--amber-light:#FCD34D;--amber-dim:rgba(217,119,6,0.12);--amber-border:rgba(217,119,6,0.25);--green:#16A34A;--green-light:#4ADE80;--red:#EF4444}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .shell{max-width:760px;margin:0 auto;padding:60px 24px 120px}
        .progress{display:flex;align-items:center;gap:0;margin-bottom:56px}
        .step-dot{width:32px;height:32px;border-radius:50%;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;color:var(--text2);flex-shrink:0;transition:all 0.3s}
        .step-dot.active{border-color:var(--amber);color:var(--amber);background:var(--amber-dim)}
        .step-dot.done{border-color:var(--green);color:var(--green);background:rgba(22,163,74,0.1)}
        .step-line{flex:1;height:1px;background:var(--border)}
        .step-line.done{background:var(--green)}
        .paso-kicker{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--amber);margin-bottom:16px}
        .paso-title{font-family:'Playfair Display',serif;font-size:clamp(24px,3.5vw,36px);color:var(--text);margin-bottom:8px;font-weight:400}
        .paso-title em{font-style:italic;color:var(--amber-light)}
        .paso-sub{font-size:15px;color:var(--text3);line-height:1.7;margin-bottom:36px}
        .field-group{display:flex;flex-direction:column;gap:6px;margin-bottom:20px}
        .field-label{font-size:12px;color:var(--text3);font-weight:500;letter-spacing:0.02em}
        .field{padding:12px 16px;border:1px solid var(--border2);background:var(--bg2);color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;width:100%;transition:border-color 0.15s;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--text2)}
        select.field{cursor:pointer}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .financiero-preview{background:var(--bg2);border:1px solid var(--border);padding:24px;margin-top:24px;margin-bottom:24px}
        .preview-title{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text2);margin-bottom:16px}
        .preview-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}
        .preview-row:last-child{border-bottom:none;padding-top:12px;margin-top:4px}
        .preview-label{font-size:13px;color:var(--text3)}
        .preview-val{font-family:'DM Mono',monospace;font-size:14px;font-weight:500}
        .areas-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
        .area-tag{padding:6px 14px;border:1px solid var(--amber-border);background:var(--amber-dim);color:var(--amber-light);font-size:13px;display:flex;align-items:center;gap:8px;border-radius:0}
        .area-tag-x{cursor:pointer;color:var(--amber);font-size:16px;line-height:1}
        .area-tag-x:hover{color:#fff}
        .areas-sugeridas{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
        .area-sug{padding:6px 14px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-size:13px;cursor:pointer;transition:all 0.15s;border-radius:0}
        .area-sug:hover{border-color:var(--amber-border);color:var(--amber-light);background:var(--amber-dim)}
        .area-add-row{display:flex;gap:10px}
        .btn-add{padding:12px 20px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;white-space:nowrap;border-radius:0}
        .btn-add:hover{border-color:var(--amber-border);color:var(--amber)}
        .diag-dim{margin-bottom:32px}
        .diag-dim-label{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px}
        .diag-pregunta{background:var(--bg2);border:1px solid var(--border);padding:20px;margin-bottom:10px}
        .preg-texto{font-size:14px;color:var(--text);margin-bottom:6px;line-height:1.55}
        .preg-impacto{font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.5}
        .preg-opciones{display:flex;gap:8px}
        .preg-opt{flex:1;padding:8px 4px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all 0.15s;text-align:center;border-radius:0}
        .preg-opt:hover{border-color:var(--amber-border);color:var(--amber-light)}
        .preg-opt.sel{border-color:var(--amber);background:var(--amber-dim);color:var(--amber-light)}
        .progress-bar{height:2px;background:var(--border);margin-bottom:28px}
        .progress-fill{height:100%;background:var(--amber);transition:width 0.3s}
        .resultado-card{text-align:center;padding:36px;border:1px solid;margin-bottom:28px}
        .res-urgencia{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px}
        .res-score{font-family:'Playfair Display',serif;font-size:64px;font-weight:400;line-height:1}
        .res-label{font-size:13px;color:var(--text3);margin-bottom:12px}
        .res-estado{display:inline-block;padding:6px 18px;font-size:14px;font-weight:500;margin-bottom:16px}
        .res-desc{font-size:14px;color:var(--text3);line-height:1.7;max-width:480px;margin:0 auto}
        .dims-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:28px}
        .dim-cell{padding:20px 16px;background:var(--bg2);text-align:center}
        .dim-label{font-family:'DM Mono',monospace;font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px}
        .dim-score{font-family:'Playfair Display',serif;font-size:28px;font-weight:400}
        .dim-bar{height:2px;background:var(--border);margin-top:8px}
        .dim-fill{height:100%;transition:width 0.8s ease}
        .plan-item{background:var(--bg2);border:1px solid var(--border);border-left:2px solid var(--amber);padding:24px;margin-bottom:12px}
        .plan-area{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber);margin-bottom:8px}
        .plan-foco{font-size:16px;font-weight:500;color:var(--text);margin-bottom:14px}
        .plan-acciones{display:flex;flex-direction:column;gap:8px}
        .plan-accion{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text3)}
        .plan-accion::before{content:'→';color:var(--amber);flex-shrink:0;margin-top:1px}
        .btn-primary{width:100%;padding:16px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:background 0.15s;border-radius:0;margin-top:8px}
        .btn-primary:hover{background:#B45309}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed}
        .btn-back{background:none;border:none;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0;margin-bottom:24px}
        .btn-back:hover{color:var(--text)}
        @media(max-width:640px){.field-row{grid-template-columns:1fr}.dims-grid{grid-template-columns:1fr 1fr}.preg-opciones{flex-wrap:wrap}}
      `}</style>

      <div className="shell">
        {/* Progress */}
        <div className="progress">
          {[1,2,3,4].map((n,i) => (
            <div key={n} style={{display:'flex',alignItems:'center',flex:n<4?1:'initial'}}>
              <div className={`step-dot ${paso===n?'active':paso>n?'done':''}`}>
                {paso>n ? '✓' : n}
              </div>
              {n < 4 && <div className={`step-line ${paso>n?'done':''}`} />}
            </div>
          ))}
        </div>

        {/* PASO 1 — Tu empresa */}
        {paso === 1 && (
          <div>
            <div className="paso-kicker">Paso 1 de 4</div>
            <h1 className="paso-title">Tu <em>empresa</em></h1>
            <p className="paso-sub">Estos datos establecen el punto de partida del ciclo. Al terminar los 90 días, EOM los compara con los resultados reales.</p>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Nombre de la empresa *</label>
                <input className="field" placeholder="Ej: Dyma Equipos" value={nombre} onChange={e=>setNombre(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Número de personas *</label>
                <input className="field" type="number" placeholder="Ej: 30" value={personas} onChange={e=>setPersonas(e.target.value)} />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Rubro principal *</label>
              <select className="field" value={rubro} onChange={e=>setRubro(e.target.value)}>
                <option value="">Selecciona tu rubro</option>
                {Object.keys(AREAS_SUGERIDAS).map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{height:'1px',background:'var(--border)',margin:'28px 0'}} />
            <p className="paso-sub" style={{marginBottom:'20px'}}>Números base del ciclo — ingresos y costos promedio de los últimos 3 meses</p>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Ingresos mensuales promedio ($) *</label>
                <input className="field" placeholder="Ej: 45.000.000" value={ingresos} onChange={e=>handleMiles(e.target.value,setIngresos)} />
              </div>
              <div className="field-group">
                <label className="field-label">Costo directo mensual promedio ($) *</label>
                <input className="field" placeholder="Lo que gastas para producir/entregar" value={costoDirecto} onChange={e=>handleMiles(e.target.value,setCostoDirecto)} />
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Gastos fijos mensuales ($) *</label>
                <input className="field" placeholder="Arriendo, sueldos admin, servicios" value={gastosFijos} onChange={e=>handleMiles(e.target.value,setGastosFijos)} />
              </div>
              <div className="field-group">
                <label className="field-label">Retiro del dueño mensual ($) *</label>
                <input className="field" placeholder="Lo que te pagas a ti mismo" value={retiro} onChange={e=>handleMiles(e.target.value,setRetiro)} />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Clientes activos este mes</label>
              <input className="field" type="number" placeholder="Número de clientes activos" value={clientes} onChange={e=>setClientes(e.target.value)} />
            </div>

            {ing > 0 && (
              <div className="financiero-preview">
                <div className="preview-title">Resultado operacional — baseline del ciclo</div>
                <div className="preview-row">
                  <span className="preview-label">Ingresos</span>
                  <span className="preview-val" style={{color:'var(--green-light)'}}>$ {fmt(ing)}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Costo directo</span>
                  <span className="preview-val" style={{color:'var(--red)'}}>− $ {fmt(cd)}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Margen bruto</span>
                  <span className="preview-val" style={{color:margenBruto>=0?'var(--text)':'var(--red)'}}>$ {fmt(margenBruto)}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Gastos fijos</span>
                  <span className="preview-val" style={{color:'var(--red)'}}>− $ {fmt(gf)}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Retiro dueño</span>
                  <span className="preview-val" style={{color:'var(--red)'}}>− $ {fmt(ret)}</span>
                </div>
                <div className="preview-row" style={{borderTop:'1px solid var(--border2)',marginTop:'8px'}}>
                  <span style={{fontSize:'14px',fontWeight:500,color:'var(--text)'}}>Resultado real del negocio</span>
                  <span className="preview-val" style={{fontSize:'18px',color:resultadoReal>=0?'var(--green-light)':'var(--red)'}}>$ {fmt(resultadoReal)}</span>
                </div>
              </div>
            )}

            <button
              className="btn-primary"
              disabled={!nombre||!rubro||!personas||!ingresos||!costoDirecto||!gastosFijos||!retiro||guardando}
              onClick={() => setPaso(2)}
            >
              Continuar → Definir áreas
            </button>
          </div>
        )}

        {/* PASO 2 — Areas */}
        {paso === 2 && (
          <div>
            <button className="btn-back" onClick={()=>setPaso(1)}>← Volver</button>
            <div className="paso-kicker">Paso 2 de 4</div>
            <h1 className="paso-title">Las <em>áreas</em> de tu empresa</h1>
            <p className="paso-sub">Define las áreas funcionales de tu organización. El diagnóstico y el plan 90 días se organizan por área.</p>

            {areas.length > 0 && (
              <div className="areas-tags">
                {areas.map(a => (
                  <div key={a} className="area-tag">
                    {a}
                    <span className="area-tag-x" onClick={()=>setAreas(prev=>prev.filter(x=>x!==a))}>×</span>
                  </div>
                ))}
              </div>
            )}

            {AREAS_SUGERIDAS[rubro] && (
              <>
                <p style={{fontSize:'12px',color:'var(--text2)',marginBottom:'10px'}}>Sugeridas para tu rubro — haz clic para agregar</p>
                <div className="areas-sugeridas">
                  {AREAS_SUGERIDAS[rubro].filter(a=>!areas.includes(a)).map(a=>(
                    <button key={a} className="area-sug" onClick={()=>setAreas(prev=>[...prev,a])}>{a}</button>
                  ))}
                </div>
              </>
            )}

            <p style={{fontSize:'12px',color:'var(--text2)',marginBottom:'10px'}}>O agrega una área personalizada</p>
            <div className="area-add-row">
              <input
                className="field"
                placeholder="Nombre del área"
                value={areaInput}
                onChange={e=>setAreaInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&areaInput.trim()){setAreas(prev=>[...prev,areaInput.trim()]);setAreaInput('')}}}
              />
              <button className="btn-add" onClick={()=>{if(areaInput.trim()){setAreas(prev=>[...prev,areaInput.trim()]);setAreaInput('')}}}>Agregar</button>
            </div>

            <button
              className="btn-primary"
              style={{marginTop:'32px'}}
              disabled={areas.length===0||guardando}
              onClick={guardarEmpresa}
            >
              {guardando ? 'Guardando...' : 'Continuar → Diagnóstico'}
            </button>
          </div>
        )}

        {/* PASO 3 — Diagnostico */}
        {paso === 3 && (
          <div>
            <div className="paso-kicker">Paso 3 de 4</div>
            <h1 className="paso-title">Diagnóstico de <em>madurez</em></h1>
            <p className="paso-sub">20 preguntas en 4 dimensiones. Responde con honestidad — el diagnóstico vale lo que valen tus respuestas.</p>

            <div className="progress-bar">
              <div className="progress-fill" style={{width:`${(totalResp/PREGUNTAS.length)*100}%`}} />
            </div>
            <p style={{fontSize:'12px',color:'var(--text2)',marginBottom:'28px'}}>{totalResp} de {PREGUNTAS.length} respondidas</p>

            {DIMS.map(dim => (
              <div key={dim} className="diag-dim">
                <div className="diag-dim-label">{dim}</div>
                {PREGUNTAS.map((p,i) => p.dim===dim && (
                  <div key={i} className="diag-pregunta">
                    <div className="preg-texto">{p.texto}</div>
                    <div className="preg-impacto">↗ {p.impacto}</div>
                    <div className="preg-opciones">
                      {[{v:1,l:'Nunca'},{v:2,l:'Rara vez'},{v:3,l:'A veces'},{v:4,l:'Casi siempre'},{v:5,l:'Siempre'}].map(opt=>(
                        <button
                          key={opt.v}
                          className={`preg-opt ${respuestas[i]===opt.v?'sel':''}`}
                          onClick={()=>setRespuestas(prev=>({...prev,[i]:opt.v}))}
                        >
                          {opt.v}<br/><span style={{fontSize:'10px'}}>{opt.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <button
              className="btn-primary"
              disabled={!completo||guardando}
              onClick={guardarDiagnostico}
            >
              {guardando ? 'Calculando...' : completo ? 'Ver mi diagnóstico →' : `Faltan ${PREGUNTAS.length-totalResp} preguntas`}
            </button>
          </div>
        )}

        {/* PASO 4 — Plan */}
        {paso === 4 && resultado && (
          <div>
            <div className="paso-kicker">Paso 4 de 4 — Tu diagnóstico</div>
            <h1 className="paso-title">Tu <em>plan de 90 días</em></h1>

            <div className="resultado-card" style={{borderColor:resultado.estado.color+'44',background:resultado.estado.bg}}>
              <div className="res-urgencia" style={{color:resultado.estado.color}}>Resultado EOM · Ciclo 1</div>
              <div className="res-score" style={{color:resultado.estado.color}}>{resultado.score_total}</div>
              <div className="res-label">de 100 puntos</div>
              <div className="res-estado" style={{background:resultado.estado.color+'22',color:resultado.estado.color}}>{resultado.estado.nombre}</div>
              <p className="res-desc">{resultado.estado.desc}</p>
            </div>

            <div className="dims-grid">
              {DIMS.map(dim => {
                const s = resultado.scores[dim]||0
                const e = getEstado(s)
                return (
                  <div key={dim} className="dim-cell">
                    <div className="dim-label">{dim}</div>
                    <div className="dim-score" style={{color:e.color}}>{s}</div>
                    <div className="dim-bar"><div className="dim-fill" style={{width:`${s}%`,background:e.color}} /></div>
                  </div>
                )
              })}
            </div>

            <p style={{fontSize:'10px',color:'var(--text2)',marginBottom:'20px',fontFamily:"'DM Mono', monospace",textTransform:'uppercase',letterSpacing:'0.1em'}}>Focos prioritarios — 3 áreas con mayor impacto</p>

            {plan.map((p,i) => (
              <div key={i} className="plan-item">
                <div className="plan-area">{p.area}</div>
                <div className="plan-foco">{p.foco}</div>
                <div className="plan-acciones">
                  {p.acciones.map((a: string,j: number) => (
                    <div key={j} className="plan-accion">{a}</div>
                  ))}
                </div>
              </div>
            ))}

            <button className="btn-primary" style={{marginTop:'32px'}} onClick={finalizarOnboarding} disabled={guardando}>
              {guardando ? 'Preparando tu dashboard...' : 'Entrar al dashboard →'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
