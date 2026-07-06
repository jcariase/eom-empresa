'use client'
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#07090E;--bg2:#0C0F18;--bg3:#111520;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);--text:#E8EDF8;--text2:#5A6888;--text3:#8A9AB8;--amber:#D97706;--amber-light:#FCD34D;--amber-dim:rgba(217,119,6,0.12);--amber-border:rgba(217,119,6,0.25);--green:#16A34A;--green-light:#4ADE80}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 48px;background:rgba(7,9,14,0.9);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
        .wordmark{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:10px}
        .mark{width:28px;height:28px;border-radius:6px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;font-family:'DM Mono',monospace}
        .nav-right{display:flex;gap:10px}
        .btn-ghost{padding:7px 18px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer}
        .btn-ghost:hover{border-color:var(--border2);color:var(--text)}
        .btn-amber{padding:7px 18px;border-radius:7px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer}
        .btn-amber:hover{background:#B45309}
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 24px 80px;text-align:center}
        .eyebrow{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--amber);margin-bottom:36px;display:flex;align-items:center;gap:10px;justify-content:center}
        .eyebrow::before,.eyebrow::after{content:'';height:1px;width:32px;background:var(--amber-border)}
        .hero-title{font-family:'Playfair Display',serif;font-size:clamp(40px,6vw,76px);line-height:1.1;color:var(--text);margin-bottom:24px;font-weight:400;max-width:860px}
        .hero-title em{font-style:italic;color:var(--amber-light)}
        .hero-sub{font-size:18px;color:var(--text3);line-height:1.7;max-width:520px;margin-bottom:52px}
        .hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
        .btn-main{padding:16px 40px;border-radius:10px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:all 0.2s}
        .btn-main:hover{background:#B45309;transform:translateY(-1px)}
        .btn-sec{padding:16px 40px;border-radius:10px;border:1.5px solid var(--border2);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:15px;cursor:pointer}
        .btn-sec:hover{color:var(--text);border-color:rgba(255,255,255,0.25)}
        .hero-note{font-size:13px;color:var(--text2);margin-top:20px}
        .rule{height:1px;background:var(--border);max-width:1100px;margin:0 auto}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);max-width:700px;margin:80px auto;text-align:center;gap:1px;background:var(--border);border:1px solid var(--border)}
        .stat{padding:40px 24px;background:var(--bg)}
        .stat-num{font-family:'Playfair Display',serif;font-size:48px;color:var(--amber);font-weight:400;line-height:1}
        .stat-label{font-size:13px;color:var(--text3);margin-top:8px;line-height:1.5}
        .pasos{padding:100px 24px;max-width:1100px;margin:0 auto}
        .kicker{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text2);margin-bottom:20px}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,48px);line-height:1.18;color:var(--text);margin-bottom:16px;font-weight:400}
        .section-title em{font-style:italic;color:var(--amber-light)}
        .section-sub{font-size:16px;color:var(--text3);line-height:1.7;max-width:520px;margin-bottom:52px}
        .pasos-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border)}
        .paso{padding:36px 28px;background:var(--bg);position:relative;overflow:hidden;transition:background 0.2s}
        .paso::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--amber);transform:scaleX(0);transform-origin:left;transition:transform 0.3s}
        .paso:hover::before{transform:scaleX(1)}
        .paso:hover{background:var(--bg2)}
        .paso-n{font-family:'DM Mono',monospace;font-size:40px;font-weight:500;color:var(--border2);line-height:1;margin-bottom:20px}
        .paso-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--amber);margin-bottom:10px}
        .paso-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:8px}
        .paso-desc{font-size:13px;color:var(--text2);line-height:1.65}
        .cta{padding:120px 24px;text-align:center}
        .cta-title{font-family:'Playfair Display',serif;font-size:clamp(32px,5vw,60px);line-height:1.15;color:var(--text);margin-bottom:20px;font-weight:400}
        .cta-title em{font-style:italic;color:var(--amber-light)}
        .footer{border-top:1px solid var(--border);padding:28px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .footer-word{font-family:'Playfair Display',serif;font-size:16px;color:var(--text2)}
        .footer-copy{font-size:12px;color:var(--text2)}
        @media(max-width:768px){.nav{padding:14px 20px}.pasos-grid{grid-template-columns:1fr 1fr}.stats{grid-template-columns:1fr}.hero-actions{flex-direction:column;align-items:center}}
      `}</style>

      <nav className="nav">
        <div className="wordmark"><div className="mark">E</div>EOM OS Empresa</div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={() => router.push('/auth')}>Ingresar</button>
          <button className="btn-amber" onClick={() => router.push('/auth?mode=register')}>Comenzar →</button>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">Sistema Operativo para Empresas</div>
        <h1 className="hero-title">Tu ERP te dice qué pasó.<br /><em>EOM te dice qué hacer con eso.</em></h1>
        <p className="hero-sub">Diagnóstico, plan de 90 días y disciplina de seguimiento semanal. En 90 días, tu organización sube de estado.</p>
        <div className="hero-actions">
          <button className="btn-main" onClick={() => router.push('/auth?mode=register')}>Comenzar diagnóstico →</button>
          <button className="btn-sec" onClick={() => router.push('/auth')}>Ya tengo cuenta</button>
        </div>
        <p className="hero-note">Sin tarjeta de crédito · 20 minutos para ver tu diagnóstico</p>
      </section>

      <div className="rule" />

      <section className="pasos" style={{paddingBottom:'40px'}}>
        <p className="section-sub" style={{maxWidth:'640px',margin:'0 auto',fontSize:'1.1rem'}}>
          EOM Empresa es el sistema operativo para empresas de 20 a 200 personas. No reemplaza tu ERP:
          toma los números que ya tienes y los convierte en diagnóstico, plan de 90 días y disciplina de
          seguimiento, para que tu organización deje de depender de que tú estés encima de todo.
        </p>
      </section>

      <div className="rule" />

      <section className="manifesto">
        <div className="manifesto-kicker">El principio fundacional de EOM</div>
        <blockquote className="manifesto-quote">
          Lo bueno es el enemigo de lo excelente.
        </blockquote>
        <div className="manifesto-rule" />
        <p className="manifesto-body">
          Toyota lo aprendió de Taiichi Ohno: <strong>el momento en que una empresa cree que llegó,
          empieza a retroceder.</strong> Sus competidores no descansan. El mercado no espera.
          La complacencia con lo que funciona hoy es el riesgo más silencioso de cualquier organización.
        </p>
        <p className="manifesto-body">
          EOM OS no es una herramienta para llegar a un destino. Es el sistema que institucionaliza
          la incomodidad productiva: <strong>cada ciclo de 90 días, tu estándar de ayer se convierte
          en tu piso de hoy.</strong>
        </p>
        <div className="manifesto-attribution">Excelencia Operacional Modular · Trilogía QVC</div>
      </section>

      <div className="rule" />

      <div className="stats">
        {[{n:'90',label:'días por ciclo de mejora'},{n:'4',label:'dimensiones evaluadas'},{n:'20',label:'minutos para tu primer diagnóstico'}].map((s,i)=>(
          <div key={i} className="stat"><div className="stat-num">{s.n}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>

      <div className="rule" />

      <section className="pasos">
        <div className="kicker">Cómo funciona</div>
        <h2 className="section-title">Del desorden a la<br /><em>excelencia autónoma</em></h2>
        <p className="section-sub">Cuatro pasos. Un ciclo de 90 días. El estándar de ayer es el piso de hoy.</p>
        <div className="pasos-grid">
          {[
            {n:'01',label:'Tu empresa',title:'Contexto y números base',desc:'Defines las áreas de tu empresa e ingresas los números que permiten medir el impacto real al cierre del ciclo.'},
            {n:'02',label:'Diagnóstico',title:'Mide tu madurez actual',desc:'20 preguntas en 4 dimensiones. Al terminar sabes exactamente en qué estado está tu organización.'},
            {n:'03',label:'Plan 90 días',title:'Focos prioritarios',desc:'EOM genera tu plan de acción basado en el diagnóstico. Tres focos, acciones concretas, responsables.'},
            {n:'04',label:'Ciclo siguiente',title:'Eleva el estándar',desc:'A los 90 días EOM activa un nuevo diagnóstico. Lo que era excelente ayer se convierte en tu piso de hoy.'},
          ].map(p=>(
            <div key={p.n} className="paso">
              <div className="paso-n">{p.n}</div>
              <div className="paso-label">{p.label}</div>
              <div className="paso-title">{p.title}</div>
              <div className="paso-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="rule" />

      <section className="cta">
        <h2 className="cta-title">Sal del <em>modo bombero.</em></h2>
        <p className="hero-sub" style={{margin:'0 auto 44px',textAlign:'center'}}>Empieza tu primer diagnóstico hoy. En 20 minutos tienes el mapa completo de tu organización.</p>
        <button className="btn-main" onClick={() => router.push('/auth?mode=register')}>Comenzar diagnóstico →</button>
        <p className="hero-note" style={{marginTop:'16px'}}>Sin tarjeta de crédito · Sin compromiso</p>
      </section>

      <footer className="footer">
        <div className="footer-word">EOM OS Empresa</div>
        <div className="footer-copy">© {new Date().getFullYear()} EOM OS · Excelencia Operacional Modular</div>
      </footer>
    </>
  )
}
