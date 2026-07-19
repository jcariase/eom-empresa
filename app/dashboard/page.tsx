'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import { supabase } from '@/lib/supabase'
import Sidebar from '../components/Sidebar'
import { AmbientBackground } from '../components/AmbientBackground'
import { calcularMesPendiente } from '@/lib/mediciones'

function getEstado(score: number) {
  if (score <= 35) return {nombre:'Modo Bombero',color:'var(--eom-danger)'}
  if (score <= 55) return {nombre:'Estabilidad Base',color:'var(--eom-gold)'}
  if (score <= 75) return {nombre:'Gestión Estructurada',color:'var(--eom-gold-light)'}
  return {nombre:'Excelencia Autónoma',color:'var(--eom-success)'}
}

function fmt(n: number) { return n.toLocaleString('es-CL') }

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forzarCicloCumplido = searchParams.get('test_ciclo_cumplido') === 'true'
  const [empresa, setEmpresa] = useState<any>(null)
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [tieneMesPendiente, setTieneMesPendiente] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data:emp} = await supabase.from('empresas_empresa').select('*').eq('user_id',user.id).single()
      if (!emp || !emp.onboarding_completo) { router.push('/onboarding'); return }
      const {data:diag} = await supabase.from('diagnosticos_empresa').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).single()
      const {data:meds} = await supabase.from('mediciones_empresa').select('periodo,es_baseline').eq('empresa_id',emp.id)
      const baseline = (meds || []).find(m => m.es_baseline)
      const { pendiente } = calcularMesPendiente(baseline?.periodo, (meds || []).map(m => m.periodo))
      setEmpresa(emp)
      setDiagnostico(diag)
      setTieneMesPendiente(pendiente !== null)
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (loading || !empresa) return
    gsap.from('.eom-kpi-card', { opacity: 0, y: 12, scale: 0.99, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.2 })
    gsap.from('.eom-nav-item', { opacity: 0, x: -6, duration: 0.5, stagger: 0.04, ease: 'power3.out', delay: 0.1 })
    gsap.from('.eom-panel', { opacity: 0, y: 10, scale: 0.99, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.35 })
  }, [loading, empresa])

  if (loading) return <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--eom-text-2)',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando...</div>
  if (!empresa) return null

  const estado = diagnostico ? getEstado(diagnostico.score_total) : null
  const ing = empresa.ingresos_mensual||0
  const cd = empresa.costo_directo_mensual||0
  const gf = empresa.gastos_fijos_mensual||0
  const ret = empresa.retiro_dueno_mensual||0
  const margen = ing - cd
  const resultadoOp = margen - gf
  const resultadoReal = resultadoOp - ret

  const diasCiclo = empresa.ciclo_inicio ? Math.floor((Date.now()-new Date(empresa.ciclo_inicio).getTime())/(1000*60*60*24)) : 0
  const diasRestantes = Math.max(0, 90 - diasCiclo)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--txt-1);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .main{flex:1;padding:20px 22px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;min-width:0}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1)}
        .page-sub{font-size:14px;color:var(--txt-3);margin-top:-12px}
        .cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
        .card{padding:22px;background:var(--eom-bg-glass);backdrop-filter:var(--eom-blur);-webkit-backdrop-filter:var(--eom-blur);border:1px solid var(--eom-border);border-radius:14px}
        .card-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:10px}
        .card-val{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1)}
        .card-sub{font-size:12px;color:var(--txt-2);margin-top:4px}
        .section-title{font-size:13px;font-weight:500;color:var(--txt-1);padding-bottom:10px;border-bottom:1px solid var(--brd)}
        .diag-card{background:var(--eom-bg-glass);backdrop-filter:var(--eom-blur);-webkit-backdrop-filter:var(--eom-blur);border:1px solid var(--eom-border);border-radius:14px;padding:28px}
        .diag-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
        .diag-estado{display:inline-flex;align-items:center;gap:10px}
        .diag-score{font-family:'Playfair Display',serif;font-size:36px;font-weight:400}
        .diag-nombre{font-size:14px;font-weight:500}
        .dims-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .dim{padding:16px;background:var(--eom-bg-glass);border:1px solid var(--eom-border);border-radius:12px;text-align:center}
        .dim-label{font-family:'DM Mono',monospace;font-size:9px;color:var(--txt-2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .dim-val{font-family:'Playfair Display',serif;font-size:22px;font-weight:400}
        .dim-bar{height:2px;background:var(--brd);margin-top:6px;border-radius:2px;overflow:hidden}
        .dim-fill{height:100%}
        .ciclo-card{background:var(--eom-bg-glass);backdrop-filter:var(--eom-blur);-webkit-backdrop-filter:var(--eom-blur);border:1px solid var(--eom-border);border-left:2px solid var(--eom-gold);border-radius:14px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        .ciclo-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--eom-gold);margin-bottom:8px}
        .ciclo-title{font-size:16px;font-weight:500;color:var(--txt-1);margin-bottom:4px}
        .ciclo-sub{font-size:13px;color:var(--txt-3)}
        @media(max-width:900px){.main{padding:18px 16px}}
        @media(max-width:580px){
          .main{padding:72px 14px 108px;gap:14px}
          .dims-row{grid-template-columns:1fr 1fr}
        }
      `}</style>

      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <AmbientBackground />
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
          <Sidebar empresaNombre={empresa.nombre} />

          <main className="main">
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Ciclo {empresa.ciclo_numero || 1} · {empresa.nombre}</div>

          {/* Contador ciclo */}
          {(() => {
            const inicio = empresa?.ciclo_inicio ? new Date(empresa.ciclo_inicio) : new Date()
            const fin = new Date(inicio); fin.setDate(fin.getDate() + 90)
            const hoy = new Date()
            const transcurridos = Math.min(90, Math.max(0, Math.floor((hoy.getTime()-inicio.getTime())/(1000*60*60*24))))
            const restantes = Math.max(0, 90-transcurridos)
            const pctCiclo = Math.round((transcurridos/90)*100)
            const fmtDate = (d: Date) => d.toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})
            const cicloCumplido = restantes === 0 || forzarCicloCumplido
            const scoreActual = diagnostico?.score_total || 0
            const fueExcelencia = scoreActual > 75

            if (cicloCumplido) {
              return (
                <div className="eom-panel" style={{background:'var(--eom-bg-glass)',backdropFilter:'var(--eom-blur)',WebkitBackdropFilter:'var(--eom-blur)',border:'1px solid var(--eom-border)',borderLeft:'2px solid var(--eom-success)',borderRadius:14,padding:'28px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
                    <div style={{flex:1,minWidth:280}}>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--eom-success)',marginBottom:10}}>Ciclo 1 completado</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'22px',color:'var(--txt-1)',marginBottom:10,fontWeight:400}}>
                        {fueExcelencia
                          ? 'Llegaste a Excelencia Autónoma. Ese no es el destino.'
                          : 'Tu primer ciclo de 90 días terminó.'}
                      </div>
                      <div style={{fontSize:'14px',color:'var(--txt-3)',lineHeight:1.7,marginBottom:4}}>
                        {fueExcelencia
                          ? 'Lo bueno es el enemigo de lo excelente. El estándar que alcanzaste hoy se convierte en el piso del ciclo siguiente. Es momento de medir de nuevo y subir la vara.'
                          : 'Es momento de medir tu progreso real. Haz un nuevo diagnóstico para ver qué cambió desde el inicio y definir el foco del próximo ciclo.'}
                      </div>
                    </div>
                    <button
                      style={{padding:'14px 28px',border:'none',borderRadius:10,background:'var(--eom-success)',color:'#0A0A0A',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',fontWeight:500,cursor:'pointer',flexShrink:0}}
                      onClick={()=>router.push('/dashboard/diagnostico?nuevo=true')}
                    >
                      Iniciar ciclo 2 — Nuevo diagnóstico →
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div className="eom-panel" style={{background:'var(--eom-bg-glass)',backdropFilter:'var(--eom-blur)',WebkitBackdropFilter:'var(--eom-blur)',border:'1px solid var(--eom-border)',borderLeft:'2px solid var(--eom-gold)',borderRadius:14,padding:'24px 28px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:16}}>
                  <div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--amber)',marginBottom:8}}>Ciclo EOM 1 · En curso</div>
                    <div style={{fontSize:'15px',fontWeight:500,color:'var(--txt-1)',marginBottom:4}}>Ciclo de 90 días</div>
                    <div style={{fontSize:'13px',color:'var(--txt-3)'}}>Al terminar, EOM activa el re-diagnóstico. El estándar de hoy se convierte en tu piso.</div>
                  </div>
                  <div style={{display:'flex',gap:32,flexShrink:0}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'40px',color:'var(--amber)',lineHeight:1}}>{restantes}</div>
                      <div style={{fontSize:'11px',color:'var(--txt-2)',marginTop:4}}>días restantes</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'40px',color:'var(--txt-3)',lineHeight:1}}>{transcurridos}</div>
                      <div style={{fontSize:'11px',color:'var(--txt-2)',marginTop:4}}>días transcurridos</div>
                    </div>
                  </div>
                </div>
                <div style={{height:'4px',background:'var(--brd)',marginBottom:10}}>
                  <div style={{height:'100%',background:'var(--amber)',width:`${pctCiclo}%`,transition:'width 0.5s ease'}} />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <div style={{fontSize:'12px',color:'var(--txt-2)'}}>📅 Inicio: <span style={{color:'var(--txt-3)'}}>{fmtDate(inicio)}</span></div>
                  <div style={{fontSize:'12px',color:'var(--txt-2)'}}>{pctCiclo}% completado</div>
                  <div style={{fontSize:'12px',color:'var(--txt-2)'}}>🏁 Cierre: <span style={{color:'var(--txt-3)'}}>{fmtDate(fin)}</span></div>
                </div>
              </div>
            )
          })()}

          {/* Aviso de medición mensual pendiente */}
          {diasCiclo >= 55 && tieneMesPendiente === true && (
            <div className="ciclo-card eom-panel">
              <div>
                <div className="ciclo-label">Medición mensual pendiente</div>
                <div className="ciclo-title">Quedan {Math.max(0, 60 - diasCiclo)} días para la medición del ciclo</div>
                <div className="ciclo-sub">Registra los números del último mes cerrado en Cierre de ciclo.</div>
              </div>
            </div>
          )}

          {/* KPIs financieros */}
          <div className="section-title">Resultado operacional — baseline del ciclo</div>
          <div className="cards-grid">
            {[
              {label:'Ingresos / mes',val:`$ ${fmt(ing)}`,sub:'Promedio últimos 3 meses',color:'var(--green-light)'},
              {label:'Margen bruto',val:`$ ${fmt(margen)}`,sub:`${ing>0?Math.round((margen/ing)*100):0}% sobre ingresos`,color:margen>=0?'var(--txt-1)':'var(--red)'},
              {label:'Resultado operacional',val:`$ ${fmt(resultadoOp)}`,sub:'Antes del retiro del dueño',color:resultadoOp>=0?'var(--txt-1)':'var(--red)'},
              {label:'Resultado real',val:`$ ${fmt(resultadoReal)}`,sub:'Lo que le queda al negocio',color:resultadoReal>=0?'var(--green-light)':'var(--red)'},
            ].map((c,i)=>(
              <div key={i} className="card eom-kpi-card">
                <div className="card-label">{c.label}</div>
                <div className="card-val" style={{color:c.color,fontSize:'22px'}}>{c.val}</div>
                <div className="card-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Diagnostico */}
          {diagnostico && estado && (
            <>
              <div className="section-title">Diagnóstico de madurez</div>
              <div className="diag-card eom-panel">
                <div className="diag-header">
                  <div className="diag-estado">
                    <div className="diag-score" style={{color:estado.color}}>{diagnostico.score_total}</div>
                    <div>
                      <div className="diag-nombre" style={{color:estado.color}}>{estado.nombre}</div>
                      <div style={{fontSize:'12px',color:'var(--txt-2)'}}>de 100 puntos · Ciclo 1</div>
                    </div>
                  </div>
                </div>
                <div className="dims-row">
                  {['Finanzas','Operaciones','Personas','Liderazgo'].map(dim=>{
                    const s = diagnostico.scores[dim]||0
                    const e = getEstado(s)
                    return (
                      <div key={dim} className="dim">
                        <div className="dim-label">{dim}</div>
                        <div className="dim-val" style={{color:e.color}}>{s}</div>
                        <div className="dim-bar"><div className="dim-fill" style={{width:`${s}%`,background:e.color}} /></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
          </main>
        </div>
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#0A0A0A'}} />}>
      <DashboardContent />
    </Suspense>
  )
}
