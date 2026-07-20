'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from './ThemeProvider'
import { MobileHeader } from './MobileHeader'
import { MobileNav, MobNavItem } from './MobileNav'

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" />
    </svg>
  ),
  diagnostico: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  plan: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="2" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="2" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  kpis: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="1,11 5,6 8,8 13,2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cierre: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  revision: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  configuracion: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  reuniones: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4" y1="1" x2="4" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="1" x2="10" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  mejora: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 12l4-4 2.5 2.5L13 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

const NAV_ITEMS = [
  { section: 'Ciclo actual', items: [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { key: 'diagnostico', label: 'Diagnóstico', path: '/dashboard/diagnostico' },
    { key: 'plan', label: 'Plan 90 días', path: '/dashboard/plan' },
    { key: 'kpis', label: 'KPIs', path: '/dashboard/kpis' },
    { key: 'cierre', label: 'Cierre de ciclo', path: '/dashboard/cierre' },
    { key: 'revision', label: 'Revisión EOM', path: '/dashboard/revision' },
  ]},
  { section: 'Gestión', items: [
    { key: 'configuracion', label: 'Configuración', path: '/dashboard/configuracion' },
    { key: 'reuniones', label: 'Reuniones', path: '/dashboard/reuniones' },
    { key: 'mejora', label: 'Mejora Continua', path: '/dashboard/mejora' },
  ]},
]

const ALL_ITEMS = NAV_ITEMS.flatMap(s => s.items)
const MOBILE_PRIMARY_KEYS = ['dashboard', 'diagnostico', 'kpis', 'plan', 'configuracion']

export default function Sidebar({ empresaNombre }: { empresaNombre?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [masAbierto, setMasAbierto] = useState(false)
  const { theme, toggleTheme } = useTheme()

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function navegar(path: string) {
    router.push(path)
    setMasAbierto(false)
  }

  const activeItem = ALL_ITEMS.find(i => i.path === pathname)
  const mobileItems: MobNavItem[] = MOBILE_PRIMARY_KEYS.map(key => {
    const item = ALL_ITEMS.find(i => i.key === key)!
    return { key: item.key, label: item.key === 'dashboard' ? 'Cockpit' : (item.key === 'configuracion' ? 'Perfil' : item.label), href: item.path, icon: ICONS[item.key] }
  })
  const mobileExtraKeys = ALL_ITEMS.map(i => i.key).filter(k => !MOBILE_PRIMARY_KEYS.includes(k))

  return (
    <>
      <style>{`
        .eom-sidebar{
          width:196px;flex-shrink:0;padding:20px 13px;display:flex;flex-direction:column;gap:2px;
          background:var(--eom-bg-sidebar);backdrop-filter:var(--eom-blur);-webkit-backdrop-filter:var(--eom-blur);
          border-right:1px solid var(--eom-border-sidebar);overflow:hidden;position:relative;z-index:10;
        }
        .logo-mark{font-family:'Playfair Display',serif;font-size:16px;color:#F5F5F7 !important;padding:0 7px 24px;border-bottom:1px solid var(--brd);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:6px;background:linear-gradient(145deg,var(--eom-gold),#8B6B3D);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0A0A0A;flex-shrink:0}
        .nav-item{padding:9px 7px;font-size:13px;color:rgba(245,245,247,0.65) !important;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:10px;border-radius:9px}
        .nav-item:hover{color:var(--txt-1) !important;background:var(--eom-bg-glass)}
        .nav-item.active{color:#E8C99A !important;background:var(--eom-gold-dim)}
        .nav-item-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .nav-section{padding:16px 7px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(245,245,247,0.45) !important}
        .sidebar-bottom{margin-top:auto;padding:16px 7px 0;border-top:1px solid var(--brd);display:flex;align-items:center;justify-content:space-between;gap:10px}
        .btn-logout{background:none;border:none;color:rgba(245,245,247,0.5) !important;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .btn-logout:hover{color:var(--txt-1) !important}
        .btn-theme{background:none;border:1px solid var(--brd-2);color:var(--txt-2);font-size:13px;cursor:pointer;padding:5px 9px;border-radius:8px;line-height:1}
        .btn-theme:hover{color:var(--eom-gold);border-color:var(--eom-border-gold)}

        @media (max-width: 900px) {
          .eom-sidebar{width:54px;padding:16px 8px}
          .eom-sidebar .logo-text,
          .eom-sidebar .nav-section,
          .eom-sidebar .nav-item-text{display:none}
          .eom-sidebar .logo-mark{justify-content:center;padding:0 0 20px}
          .eom-sidebar .nav-item{justify-content:center;padding:9px}
          .eom-sidebar .sidebar-bottom{flex-direction:column;gap:8px}
        }

        @media (max-width: 580px) {
          .eom-sidebar{display:none}
          .eom-mob-header,.eom-mob-nav{display:flex}
        }
        @media (min-width: 581px) {
          .eom-mob-header,.eom-mob-nav{display:none}
        }
      `}</style>

      {/* Sidebar desktop / tablet */}
      <aside className="eom-sidebar">
        <div className="logo-mark" onClick={() => router.push('/dashboard')} title="EOM OS">
          <div className="mark">E</div>
          <span className="logo-text">{empresaNombre || 'EOM OS'}</span>
        </div>
        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            <div className="nav-section">{section.section}</div>
            {section.items.map(item => (
              <div
                key={item.path}
                className={`nav-item eom-nav-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => router.push(item.path)}
                title={item.label}
              >
                <span className="nav-item-icon">{ICONS[item.key]}</span>
                <span className="nav-item-text">{item.label}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="sidebar-bottom">
          <button className="btn-logout" onClick={cerrarSesion} title="Cerrar sesión">Cerrar sesión</button>
          <button className="btn-theme" onClick={toggleTheme} title="Cambiar tema">{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </aside>

      {/* Mobile header + bottom nav */}
      <MobileHeader title={activeItem?.key === 'dashboard' ? 'Cockpit' : (activeItem?.label || 'EOM OS')} empresaNombre={empresaNombre} />
      <MobileNav
        items={mobileItems}
        activeItem={activeItem?.key}
        onNavigate={navegar}
        onMore={() => setMasAbierto(true)}
      />

      {masAbierto && (
        <>
          <div
            onClick={() => setMasAbierto(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
            background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px 18px 0 0',
            padding: '20px 8px calc(20px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
            {mobileExtraKeys.map(key => {
              const item = ALL_ITEMS.find(i => i.key === key)!
              return (
                <div
                  key={item.key}
                  onClick={() => navegar(item.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', fontSize: 14, color: '#F5F5F7', cursor: 'pointer', borderRadius: 10 }}
                >
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A96E' }}>{ICONS[item.key]}</span>
                  {item.label}
                </div>
              )
            })}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 14px' }} />
            <div
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', fontSize: 14, color: '#F5F5F7', cursor: 'pointer', borderRadius: 10 }}
            >
              <span style={{ width: 18 }}>{theme === 'dark' ? '☀' : '☾'}</span>
              Cambiar tema
            </div>
            <div
              onClick={cerrarSesion}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', fontSize: 14, color: 'rgba(245,245,247,0.6)', cursor: 'pointer', borderRadius: 10 }}
            >
              <span style={{ width: 18 }}>⏻</span>
              Cerrar sesión
            </div>
          </div>
        </>
      )}
    </>
  )
}
