import { ReactNode, CSSProperties } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  gold?: boolean
}

export function GlassCard({ children, className = '', style, gold = false }: GlassCardProps) {
  const cls = [gold ? 'eom-glass-gold' : 'eom-glass', className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  )
}
