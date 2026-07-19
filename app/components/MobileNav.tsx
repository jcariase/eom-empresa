'use client'

import { ReactNode } from 'react'

export interface MobNavItem {
  key: string
  label: string
  href: string
  icon: ReactNode
}

export function MobileNav({
  items,
  activeItem,
  onNavigate,
  onMore,
}: {
  items: MobNavItem[]
  activeItem?: string
  onNavigate: (href: string) => void
  onMore: () => void
}) {
  return (
    <nav className="eom-mob-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(10, 10, 10, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
        {items.map(item => {
          const isActive = item.key === activeItem
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.href)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '2px 8px', minWidth: 48,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'rgba(201,169,110,0.18)' : 'transparent',
                color: isActive ? '#C9A96E' : 'rgba(245,245,247,0.35)',
              }}>
                {item.icon}
              </div>
              <span style={{
                fontSize: 10, letterSpacing: '-0.2px',
                color: isActive ? '#C9A96E' : 'rgba(245,245,247,0.32)',
              }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{ width: 20, height: 2, borderRadius: 2, background: '#C9A96E' }} />
              )}
            </button>
          )
        })}
        <button
          onClick={onMore}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '2px 8px', minWidth: 48,
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 6, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'rgba(245,245,247,0.35)',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2.5" cy="7" r="1.4" fill="currentColor" />
              <circle cx="7" cy="7" r="1.4" fill="currentColor" />
              <circle cx="11.5" cy="7" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <span style={{ fontSize: 10, letterSpacing: '-0.2px', color: 'rgba(245,245,247,0.32)' }}>Más</span>
        </button>
      </div>
    </nav>
  )
}
