'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from './ThemeProvider'

const NAV_ITEMS = [
  { section: 'Ciclo actual', items: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Diagnóstico', path: '/dashboard/diagnostico' },
    { label: 'Plan 90 días', path: '/dashboard/plan' },
    { label: 'KPIs', path: '/dashboard/kpis' },
  ]},
  { section: 'Gestión', items: [
    { label: 'Configuración', path: '/dashboard/configuracion' },
    { label: 'Reuniones', path: '/dashboard/reuniones' },
    { label: 'Mejora Continua', path: '/dashboard/mejora' },
  ]},
]

export default function Sidebar({ empresaNombre }: { empresaNombre?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { theme, toggleTheme } = useTheme()

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function navegar(path: string) {
    router.push(path)
    setMenuAbierto(false)
  }

  return (
    <>
      <style>{`
        .topbar-mobile{display:none}
        .sidebar-desktop{background:var(--surf-2);border-right:1px solid var(--brd);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--txt-1);padding:0 20px 24px;border-bottom:1px solid var(--brd);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--txt-3);cursor:pointer;transition:all 0.15s}
        .nav-item:hover{color:var(--txt-1);background:var(--surf-3)}
        .nav-item.active{color:var(--amber);background:var(--amber-dim)}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--brd);display:flex;align-items:center;justify-content:space-between;gap:10px}
        .btn-logout{background:none;border:none;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .btn-logout:hover{color:var(--txt-1)}
        .btn-theme{background:none;border:1px solid var(--brd-2);color:var(--txt-2);font-size:13px;cursor:pointer;padding:5px 9px;border-radius:0;line-height:1}
        .btn-theme:hover{color:var(--amber);border-color:var(--amber-border)}

        @media(max-width:768px){
          .sidebar-desktop{display:none}
          .topbar-mobile{
            display:flex;align-items:center;justify-content:space-between;
            position:sticky;top:0;z-index:50;
            background:var(--surf-2);border-bottom:1px solid var(--brd);
            padding:14px 16px;
          }
          .topbar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--txt-1);display:flex;align-items:center;gap:8px}
          .topbar-empresa{font-size:11px;color:var(--txt-2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .btn-menu{background:none;border:1px solid var(--brd-2);color:var(--txt-1);padding:8px 12px;font-size:13px;cursor:pointer;border-radius:0}
          .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200}
          .drawer{position:fixed;top:0;right:0;bottom:0;width:78%;max-width:300px;background:var(--surf-2);border-left:1px solid var(--brd);z-index:201;padding:20px 0;display:flex;flex-direction:column;animation:drawerIn 0.2s ease}
          .drawer-close{position:absolute;top:16px;right:16px;background:none;border:none;color:var(--txt-2);font-size:22px;cursor:pointer;padding:4px 8px}
        }
        @keyframes drawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
      `}</style>

      {/* Sidebar desktop */}
      <aside className="sidebar-desktop">
        <div className="sidebar-logo" onClick={() => router.push('/dashboard')}><div className="mark">E</div>EOM OS</div>
        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            <div className="nav-section">{section.section}</div>
            {section.items.map(item => (
              <div
                key={item.path}
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => router.push(item.path)}
              >
                {item.label}
              </div>
            ))}
          </div>
        ))}
        <div className="sidebar-bottom">
          <button className="btn-logout" onClick={cerrarSesion}>Cerrar sesión</button>
          <button className="btn-theme" onClick={toggleTheme} title="Cambiar tema">{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </aside>

      {/* Topbar + drawer mobile */}
      <div className="topbar-mobile">
        <div className="topbar-logo">
          <div className="mark">E</div>
          {empresaNombre ? <span className="topbar-empresa">{empresaNombre}</span> : 'EOM OS'}
        </div>
        <button className="btn-menu" onClick={() => setMenuAbierto(true)}>☰ Menú</button>
      </div>

      {menuAbierto && (
        <>
          <div className="drawer-overlay" onClick={() => setMenuAbierto(false)} />
          <div className="drawer">
            <button className="drawer-close" onClick={() => setMenuAbierto(false)}>×</button>
            <div className="sidebar-logo" onClick={() => navegar('/dashboard')}><div className="mark">E</div>EOM OS</div>
            {NAV_ITEMS.map(section => (
              <div key={section.section}>
                <div className="nav-section">{section.section}</div>
                {section.items.map(item => (
                  <div
                    key={item.path}
                    className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                    onClick={() => navegar(item.path)}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            ))}
            <div className="sidebar-bottom">
              <button className="btn-logout" onClick={cerrarSesion}>Cerrar sesión</button>
              <button className="btn-theme" onClick={toggleTheme} title="Cambiar tema">{theme === 'dark' ? '☀' : '☾'}</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
