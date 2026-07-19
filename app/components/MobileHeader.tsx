'use client'

export function MobileHeader({ title = 'Cockpit', empresaNombre }: {
  title?: string
  empresaNombre?: string
}) {
  return (
    <header className="eom-mob-header" style={{
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 18px 10px',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(10, 10, 10, 0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{
          width: 26, height: 26, background: 'linear-gradient(145deg, #C9A96E, #8B6B3D)',
          borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#0A0A0A', flexShrink: 0,
        }}>E</div>
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.4px', color: '#F5F5F7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
      </div>
      {empresaNombre && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)',
          color: '#C9A96E', fontSize: 10, padding: '4px 10px', borderRadius: 20,
          maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {empresaNombre}
        </div>
      )}
    </header>
  )
}
