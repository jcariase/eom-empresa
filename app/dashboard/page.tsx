'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../components/Sidebar'
import { calcularMesPendiente } from '@/lib/mediciones'

function getEstado(score: number) {
  if (score <= 35) return {nombre:'Modo Bombero',color:'#EF4444'}
  if (score <= 55) return {nombre:'Estabilidad Base',color:'#D97706'}
  if (score <= 75) return {nombre:'Gestión Estructurada',color:'#2563EB'}
  return {nombre:'Excelencia Autónoma',color:'#16A34A'}
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

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando...</div>
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
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .sidebar{background:var(--surf-2);border-right:1px solid var(--brd);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--txt-1);padding:0 20px 24px;border-bottom:1px solid var(--brd);display:flex;align-items:center;gap:8px;margin-bottom:16px}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .sidebar-empresa{padding:12px 20px;margin-bottom:8px}
        .sidebar-empresa-name{font-size:13px;font-weight:500;color:var(--txt-1);margin-bottom:2px}
        .sidebar-empresa-rubro{font-size:11px;color:var(--txt-2)}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--txt-3);cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s}
        .nav-item:hover{color:var(--txt-1);background:var(--surf-3)}
        .nav-item.active{color:var(--amber);background:var(--amber-dim,rgba(217,119,6,0.08))}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--brd)}
        .btn-logout{background:none;border:none;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .btn-logout:hover{color:var(--txt-1)}
        .main{padding:40px;overflow-y:auto}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--txt-3);margin-bottom:32px}
        .cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);margin-bottom:24px}
        .card{padding:24px;background:var(--surf-2)}
        .card-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:10px}
        .card-val{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1)}
        .card-sub{font-size:12px;color:var(--txt-2);margin-top:4px}
        .section-title{font-size:13px;font-weight:500;color:var(--txt-1);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--brd)}
        .fin-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
        .fin-card{background:var(--surf-2);border:1px solid var(--brd);padding:24px}
        .fin-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--brd)}
        .fin-row:last-child{border-bottom:none;padding-top:14px;margin-top:4px;border-top:1px solid var(--brd-2)}
        .fin-label{font-size:13px;color:var(--txt-3)}
        .fin-val{font-family:'DM Mono',monospace;font-size:14px;font-weight:500}
        .diag-card{background:var(--surf-2);border:1px solid var(--brd);padding:28px;margin-bottom:20px}
        .diag-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
        .diag-estado{display:inline-flex;align-items:center;gap:10px}
        .diag-score{font-family:'Playfair Display',serif;font-size:36px;font-weight:400}
        .diag-nombre{font-size:14px;font-weight:500}
        .dims-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--brd);border:1px solid var(--brd)}
        .dim{padding:16px;background:var(--surf-3);text-align:center}
        .dim-label{font-family:'DM Mono',monospace;font-size:9px;color:var(--txt-2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .dim-val{font-family:'Playfair Display',serif;font-size:22px;font-weight:400}
        .dim-bar{height:2px;background:var(--brd);margin-top:6px}
        .dim-fill{height:100%}
        .ciclo-card{background:var(--surf-2);border:1px solid var(--brd);border-left:2px solid var(--amber);padding:24px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        .ciclo-info{}
        .ciclo-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber);margin-bottom:8px}
        .ciclo-title{font-size:16px;font-weight:500;color:var(--txt-1);margin-bottom:4px}
        .ciclo-sub{font-size:13px;color:var(--txt-3)}
        .ciclo-counter{text-align:center;flex-shrink:0}
        .ciclo-days{font-family:'Playfair Display',serif;font-size:48px;color:var(--amber);line-height:1}
        .ciclo-days-label{font-size:12px;color:var(--txt-2);margin-top:4px}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}.fin-grid{grid-template-columns:1fr}.dims-row{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="layout">
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
                <div style={{background:'var(--surf-2)',border:'1px solid var(--brd)',borderLeft:'2px solid #16A34A',padding:'28px',marginBottom:'24px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
                    <div style={{flex:1,minWidth:280}}>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#16A34A',marginBottom:10}}>Ciclo 1 completado</div>
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
                      style={{padding:'14px 28px',border:'none',background:'#16A34A',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:'14px',fontWeight:500,cursor:'pointer',flexShrink:0}}
                      onClick={()=>router.push('/dashboard/diagnostico?nuevo=true')}
                    >
                      Iniciar ciclo 2 — Nuevo diagnóstico →
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div style={{background:'var(--surf-2)',border:'1px solid var(--brd)',borderLeft:'2px solid var(--amber)',padding:'24px 28px',marginBottom:'24px'}}>
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
            <div className="ciclo-card">
              <div className="ciclo-info">
                <div className="ciclo-label">Medición mensual pendiente</div>
                <div className="ciclo-title">Quedan {Math.max(0, 60 - diasCiclo)} días para la medición del ciclo</div>
                <div className="ciclo-sub">Registra los números del último mes cerrado en Cierre de ciclo.</div>
              </div>
            </div>
          )}

          {/* KPIs financieros */}
          <div className="section-title">Resultado operacional — baseline del ciclo</div>
          <div className="cards-grid" style={{marginBottom:'24px'}}>
            {[
              {label:'Ingresos / mes',val:`$ ${fmt(ing)}`,sub:'Promedio últimos 3 meses',color:'var(--green-light)'},
              {label:'Margen bruto',val:`$ ${fmt(margen)}`,sub:`${ing>0?Math.round((margen/ing)*100):0}% sobre ingresos`,color:margen>=0?'var(--txt-1)':'var(--red)'},
              {label:'Resultado operacional',val:`$ ${fmt(resultadoOp)}`,sub:'Antes del retiro del dueño',color:resultadoOp>=0?'var(--txt-1)':'var(--red)'},
              {label:'Resultado real',val:`$ ${fmt(resultadoReal)}`,sub:'Lo que le queda al negocio',color:resultadoReal>=0?'var(--green-light)':'var(--red)'},
            ].map((c,i)=>(
              <div key={i} className="card">
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
              <div className="diag-card">
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
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#07090E'}} />}>
      <DashboardContent />
    </Suspense>
  )
}
