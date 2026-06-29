'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PREGUNTAS = [
  {dim:'Finanzas',texto:'¿Conoces tu utilidad neta del mes anterior antes del día 10?'},
  {dim:'Finanzas',texto:'¿Tienes proyección de flujo de caja para los próximos 30 días?'},
  {dim:'Finanzas',texto:'¿Tu cobranza tiene proceso definido con fechas y responsable?'},
  {dim:'Finanzas',texto:'¿Tus gastos fijos están documentados y los revisas mensualmente?'},
  {dim:'Finanzas',texto:'¿Tienes metas financieras escritas con número y fecha?'},
  {dim:'Operaciones',texto:'¿Las reuniones de tu equipo terminan con acuerdos escritos y dueño?'},
  {dim:'Operaciones',texto:'¿Tienes indicadores operacionales que revisas cada semana?'},
  {dim:'Operaciones',texto:'¿Los problemas que aparecen este mes son distintos a los del mes pasado?'},
  {dim:'Operaciones',texto:'¿Tienes objetivos trimestrales definidos y el equipo los conoce?'},
  {dim:'Operaciones',texto:'¿Puedes irte una semana y la operación no colapsa?'},
  {dim:'Personas',texto:'¿Tu equipo sabe exactamente qué se espera de ellos en términos de resultados?'},
  {dim:'Personas',texto:'¿Las personas toman decisiones de su área sin consultarte todo?'},
  {dim:'Personas',texto:'¿Tu equipo propone mejoras por iniciativa propia al menos una vez al mes?'},
  {dim:'Personas',texto:'¿La rotación de personal en tu empresa es baja (menos del 15% anual)?'},
  {dim:'Personas',texto:'¿Tu equipo entiende cómo su trabajo impacta los resultados del negocio?'},
  {dim:'Liderazgo',texto:'¿Tienes tiempo real para pensar en el futuro del negocio, no solo en apagar incendios?'},
  {dim:'Liderazgo',texto:'¿Delegas con confianza o terminas rehaciendo el trabajo?'},
  {dim:'Liderazgo',texto:'¿Tus decisiones importantes tienen datos detrás, no solo intuición?'},
  {dim:'Liderazgo',texto:'¿Sabes cuáles son las 3 prioridades más importantes de este trimestre?'},
  {dim:'Liderazgo',texto:'¿Tu negocio podría funcionar sin ti por un mes con resultados similares?'},
]

const DIMS = ['Finanzas','Operaciones','Personas','Liderazgo']

const DIM_COLORS: Record<string,string> = {
  Finanzas:'#D97706', Operaciones:'#2563EB', Personas:'#7C3AED', Liderazgo:'#16A34A'
}

const ANALISIS: Record<string,Record<string,string>> = {
  Finanzas: {
    critico: 'Tu empresa opera sin visibilidad financiera. Las decisiones de gasto, inversión y cobro se toman a ciegas. El primer foco del ciclo debe ser instalar un cierre mensual y una proyección de caja básica.',
    riesgo: 'Tienes algunos controles financieros pero no son sistemáticos. El riesgo es que los meses malos se descubren tarde. Prioriza automatizar el cierre mensual y formalizar el proceso de cobranza.',
    bueno: 'Tu visibilidad financiera está por sobre la media. El siguiente paso es usar esos datos para tomar decisiones proactivas, no solo para reportar.',
    excelente: 'Tienes un sistema financiero sólido. El desafío ahora es que ese sistema funcione sin tu intervención directa y que tu equipo lo entienda tan bien como tú.',
  },
  Operaciones: {
    critico: 'Tu operación depende completamente de ti. Sin procesos documentados ni indicadores, cada problema es una crisis nueva. La prioridad es documentar los 3 procesos más críticos e instalar una reunión semanal con acuerdos.',
    riesgo: 'Tienes algunos procesos pero son inconsistentes. Los mismos problemas reaparecen porque no se ataca la causa raíz. Formaliza los KPIs operacionales y asigna responsables claros por área.',
    bueno: 'Tu operación tiene estructura. El siguiente nivel es que esa estructura se mantenga y mejore sin que tú la empujes.',
    excelente: 'Tu operación es robusta. Los problemas se resuelven en el nivel correcto y los indicadores alertan antes de que escalen.',
  },
  Personas: {
    critico: 'Tu equipo no puede operar de forma autónoma. Los roles no son claros y las decisiones pasan todas por ti. El primer paso es definir por escrito qué se espera de cada persona y empezar a delegar una decisión concreta.',
    riesgo: 'Hay autonomía parcial pero el equipo aún depende de ti para decisiones que deberían ser propias. Trabaja en claridad de roles y crea espacios donde el equipo proponga mejoras.',
    bueno: 'Tu equipo tiene autonomía en las tareas del día a día. El desafío es que esa autonomía se extienda a decisiones más complejas y a la mejora continua.',
    excelente: 'Tu equipo opera, decide y mejora sin necesitar tu validación constante. Ese es el activo más valioso de una empresa escalable.',
  },
  Liderazgo: {
    critico: 'Estás atrapado en la operación. Más del 80% de tu tiempo lo consume resolver problemas del día a día. Sin tiempo para pensar en estrategia, la empresa no puede crecer de forma intencional.',
    riesgo: 'Tienes algo de tiempo estratégico pero es insuficiente e irregular. El riesgo es que las urgencias siempre ganen sobre lo importante. Bloquea tiempo fijo semanal para estrategia.',
    bueno: 'Tu balance entre operación y estrategia es aceptable. El siguiente paso es que las decisiones estratégicas estén respaldadas por datos y no solo por experiencia.',
    excelente: 'Lideras con datos, delegas con confianza y tienes tiempo para el futuro del negocio. Tu empresa podría sobrevivir sin ti por un período significativo.',
  },
}

function getEstado(score: number) {
  if (score <= 35) return {nombre:'Modo Bombero',color:'#EF4444',key:'critico'}
  if (score <= 55) return {nombre:'Estabilidad Base',color:'#D97706',key:'riesgo'}
  if (score <= 75) return {nombre:'Gestión Estructurada',color:'#2563EB',key:'bueno'}
  return {nombre:'Excelencia Autónoma',color:'#16A34A',key:'excelente'}
}

const OPCIONES = ['Nunca','Rara vez','A veces','Casi siempre','Siempre']

export default function DiagnosticoPage() {
  const router = useRouter()
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dimActiva, setDimActiva] = useState('Finanzas')

  useEffect(() => {
    async function load() {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data:emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)
      const {data:diag} = await supabase.from('diagnosticos_empresa').select('*').eq('user_id', user.id).order('created_at', {ascending:false}).limit(1).single()
      setDiagnostico(diag)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando diagnóstico...</div>

  const scores = diagnostico?.scores || {}
  const scoreTotal = diagnostico?.score_total || 0
  const estadoGlobal = getEstado(scoreTotal)

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
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--text3);margin-bottom:32px}
        .score-hero{background:var(--bg2);border:1px solid var(--border);padding:36px;margin-bottom:24px;display:grid;grid-template-columns:auto 1fr;gap:40px;align-items:center}
        .score-num{font-family:'Playfair Display',serif;font-size:80px;font-weight:400;line-height:1}
        .score-label{font-size:13px;color:var(--text2);margin-top:4px}
        .score-estado{display:inline-block;padding:6px 16px;font-size:14px;font-weight:500;margin-bottom:12px}
        .score-desc{font-size:15px;color:var(--text3);line-height:1.7;max-width:480px}
        .dims-tabs{display:flex;gap:0;margin-bottom:0;border:1px solid var(--border);border-bottom:none;width:fit-content}
        .dim-tab{padding:10px 20px;border:none;background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;border-right:1px solid var(--border);position:relative}
        .dim-tab:last-child{border-right:none}
        .dim-tab:hover{color:var(--text);background:var(--bg2)}
        .dim-tab.active{color:var(--text);background:var(--bg2)}
        .dim-tab.active::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px}
        .dim-panel{background:var(--bg2);border:1px solid var(--border);padding:28px;margin-bottom:24px}
        .dim-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
        .dim-score-big{font-family:'Playfair Display',serif;font-size:48px;font-weight:400;line-height:1}
        .dim-bar-track{height:4px;background:var(--border);flex:1;min-width:120px}
        .dim-bar-fill{height:100%;transition:width 0.8s ease}
        .dim-analisis{font-size:14px;color:var(--text3);line-height:1.75;padding:16px;background:var(--bg3);border-left:2px solid;margin-bottom:24px}
        .preguntas-list{display:flex;flex-direction:column;gap:1px;background:var(--border)}
        .pregunta-row{background:var(--bg2);padding:16px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;transition:background 0.15s}
        .pregunta-row:hover{background:var(--bg3)}
        .pregunta-texto{font-size:13px;color:var(--text);line-height:1.5}
        .pregunta-resp{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .resp-dots{display:flex;gap:3px}
        .resp-dot{width:8px;height:8px;border-radius:50%;background:var(--border2)}
        .resp-val{font-family:'DM Mono',monospace;font-size:11px;color:var(--text2);white-space:nowrap}
        .radar-wrap{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
        .dim-summary-card{background:var(--bg2);border:1px solid var(--border);padding:20px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
        .dim-summary-card:hover{background:var(--bg3)}
        .dim-summary-card.selected{border-color:rgba(255,255,255,0.2)}
        .dim-summary-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;transition:opacity 0.15s}
        .dim-summary-card.selected::before{opacity:1}
        .dim-summary-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px}
        .dim-summary-score{font-family:'Playfair Display',serif;font-size:36px;font-weight:400;line-height:1;margin-bottom:8px}
        .dim-summary-bar{height:2px;background:var(--border);margin-bottom:6px}
        .dim-summary-fill{height:100%;transition:width 0.6s ease}
        .dim-summary-estado{font-size:11px}
        .ciclo-badge{display:inline-flex;align-items:center;gap:8px;background:var(--amber-dim);border:1px solid var(--amber-border,rgba(217,119,6,0.25));padding:6px 14px;margin-bottom:24px}
        .ciclo-badge-text{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber)}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.score-hero{grid-template-columns:1fr}.radar-wrap{grid-template-columns:1fr 1fr}.pregunta-row{grid-template-columns:1fr}}
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo" onClick={()=>router.push('/dashboard')}><div className="mark">E</div>EOM OS</div>
          <div className="nav-section">Ciclo actual</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard')}>Dashboard</div>
          <div className="nav-item active">Diagnóstico</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/plan')}>Plan 90 días</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/kpis')}>KPIs</div>
          <div className="nav-section">Gestión</div>
          <div className="nav-item">Áreas</div>
          <div className="nav-item">Reuniones</div>
          <div className="nav-item">Mejora Continua</div>
          <div className="sidebar-bottom">
            <button className="btn-logout" onClick={async()=>{await supabase.auth.signOut();router.push('/auth')}}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="main">
          <div className="page-title">Diagnóstico EOM</div>
          <div className="page-sub">{empresa?.nombre} · Ciclo 1</div>

          {(() => {
            const inicio = empresa?.ciclo_inicio ? new Date(empresa.ciclo_inicio) : new Date()
            const fin = new Date(inicio); fin.setDate(fin.getDate() + 90)
            const hoy = new Date()
            const transcurridos = Math.min(90, Math.max(0, Math.floor((hoy.getTime()-inicio.getTime())/(1000*60*60*24))))
            const restantes = Math.max(0, 90-transcurridos)
            const pctCiclo = Math.round((transcurridos/90)*100)
            const fmtDate = (d: Date) => d.toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})
            return (
              <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'2px solid var(--amber)',padding:'20px 24px',marginBottom:'24px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:12}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--amber)'}}>Ciclo 1 · En curso</div>
                  <div style={{display:'flex',gap:24}}>
                    <div style={{fontSize:'12px',color:'var(--text2)'}}>📅 Inicio: <span style={{color:'var(--text3)'}}>{fmtDate(inicio)}</span></div>
                    <div style={{fontSize:'12px',color:'var(--text2)'}}>🏁 Cierre: <span style={{color:'var(--text3)'}}>{fmtDate(fin)}</span></div>
                    <div style={{fontSize:'12px',color:'var(--text2)'}}><span style={{color:'var(--amber)',fontWeight:500}}>{restantes} días restantes</span></div>
                  </div>
                </div>
                <div style={{height:'3px',background:'var(--border)'}}>
                  <div style={{height:'100%',background:'var(--amber)',width:`${pctCiclo}%`}} />
                </div>
              </div>
            )
          })()}

          {/* Score global */}
          <div className="score-hero">
            <div>
              <div className="score-num" style={{color:estadoGlobal.color}}>{scoreTotal}</div>
              <div className="score-label">de 100 puntos</div>
            </div>
            <div>
              <div className="score-estado" style={{background:estadoGlobal.color+'22',color:estadoGlobal.color}}>{estadoGlobal.nombre}</div>
              <p className="score-desc">
                {estadoGlobal.key === 'critico' && 'Tu organización opera en crisis permanente. Todo pasa por ti. El primer ciclo EOM estabiliza la base.'}
                {estadoGlobal.key === 'riesgo' && 'Tienes algunos sistemas pero sigues siendo el cuello de botella. El ciclo EOM elimina esa dependencia.'}
                {estadoGlobal.key === 'bueno' && 'Tu sistema funciona. El siguiente salto es que opere solo, sin que tú lo empujes.'}
                {estadoGlobal.key === 'excelente' && 'Tu empresa trabaja para ti. EOM activa el ciclo siguiente para que este estándar no se cristalice.'}
              </p>
            </div>
          </div>

          {/* Grid de dimensiones */}
          <div className="radar-wrap">
            {DIMS.map(dim => {
              const s = scores[dim] || 0
              const e = getEstado(s)
              const color = DIM_COLORS[dim]
              return (
                <div
                  key={dim}
                  className={`dim-summary-card ${dimActiva===dim?'selected':''}`}
                  style={dimActiva===dim?{borderColor:color+'44'}:{}}
                  onClick={()=>setDimActiva(dim)}
                >
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:color,opacity:dimActiva===dim?1:0.3}} />
                  <div className="dim-summary-label" style={{color}}>{dim}</div>
                  <div className="dim-summary-score" style={{color:e.color}}>{s}</div>
                  <div className="dim-summary-bar">
                    <div className="dim-summary-fill" style={{width:`${s}%`,background:e.color}} />
                  </div>
                  <div className="dim-summary-estado" style={{color:e.color}}>{e.nombre}</div>
                </div>
              )
            })}
          </div>

          {/* Detalle por dimensión */}
          <div className="dims-tabs">
            {DIMS.map(dim => (
              <button
                key={dim}
                className={`dim-tab ${dimActiva===dim?'active':''}`}
                style={dimActiva===dim?{color:DIM_COLORS[dim]}:{}}
                onClick={()=>setDimActiva(dim)}
              >
                {dim}
                {dimActiva===dim && <span style={{position:'absolute',bottom:0,left:0,right:0,height:'2px',background:DIM_COLORS[dim]}} />}
              </button>
            ))}
          </div>

          <div className="dim-panel">
            {(() => {
              const dim = dimActiva
              const s = scores[dim] || 0
              const e = getEstado(s)
              const color = DIM_COLORS[dim]
              const analisis = ANALISIS[dim]?.[e.key] || ''
              const pregsDelDim = PREGUNTAS.map((p,i)=>({...p,idx:i})).filter(p=>p.dim===dim)

              return (
                <>
                  <div className="dim-header">
                    <div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',letterSpacing:'0.1em',textTransform:'uppercase',color,marginBottom:'8px'}}>{dim}</div>
                      <div className="dim-score-big" style={{color:e.color}}>{s}<span style={{fontSize:'20px',color:'var(--text2)',fontFamily:'DM Sans,sans-serif',fontWeight:400}}> / 100</span></div>
                    </div>
                    <div style={{flex:1,maxWidth:'200px'}}>
                      <div style={{fontSize:'11px',color:'var(--text2)',marginBottom:'8px',textAlign:'right'}}>{e.nombre}</div>
                      <div className="dim-bar-track">
                        <div className="dim-bar-fill" style={{width:`${s}%`,background:e.color}} />
                      </div>
                    </div>
                  </div>

                  <div className="dim-analisis" style={{borderColor:color}}>
                    {analisis}
                  </div>

                  <div style={{fontSize:'12px',color:'var(--text2)',marginBottom:'12px',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.08em'}}>Respuestas del diagnóstico</div>

                  <div className="preguntas-list">
                    {pregsDelDim.map((p,i) => {
                      // Reconstruct answer from score (approximate)
                      const dimPregs = PREGUNTAS.filter(q=>q.dim===dim)
                      const dimScore = scores[dim] || 0
                      const approxVal = Math.round((dimScore/100)*5)
                      const respIdx = Math.min(4, Math.max(0, approxVal - 1))

                      return (
                        <div key={i} className="pregunta-row">
                          <div className="pregunta-texto">{p.texto}</div>
                          <div className="pregunta-resp">
                            <div className="resp-dots">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className="resp-dot" style={{
                                  background: n <= approxVal
                                    ? approxVal >= 4 ? '#16A34A' : approxVal >= 3 ? '#D97706' : '#EF4444'
                                    : 'var(--border2)'
                                }} />
                              ))}
                            </div>
                            <span className="resp-val">{OPCIONES[respIdx]}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        </main>
      </div>
    </>
  )
}
