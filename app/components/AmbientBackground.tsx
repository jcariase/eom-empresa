'use client'

import { useEffect, useRef } from 'react'

export function AmbientBackground() {
  const o1 = useRef<HTMLDivElement>(null)
  const o2 = useRef<HTMLDivElement>(null)
  const o3 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let t = 0
    let raf: number
    const animate = () => {
      t += 0.003
      if (o1.current) {
        o1.current.style.transform = `translate(${Math.sin(t * 0.7) * 18}px, ${Math.cos(t * 0.5) * 22}px)`
      }
      if (o2.current) {
        o2.current.style.transform = `translate(${Math.cos(t * 0.6) * -15}px, ${Math.sin(t * 0.4) * -18}px)`
      }
      if (o3.current) {
        o3.current.style.transform = `translate(${Math.sin(t * 0.5) * 10}px, ${Math.cos(t * 0.7) * 12}px)`
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  const orbBase: React.CSSProperties = {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
    willChange: 'transform',
  }

  return (
    <>
      <div ref={o1} style={{
        ...orbBase,
        width: 420, height: 420, top: -140, left: -60,
        background: 'radial-gradient(circle, rgba(201,169,110,0.22), transparent 70%)',
        filter: 'blur(70px)',
      }} />
      <div ref={o2} style={{
        ...orbBase,
        width: 320, height: 320, bottom: -90, right: -20,
        background: 'radial-gradient(circle, rgba(160,100,55,0.18), transparent 70%)',
        filter: 'blur(65px)',
      }} />
      <div ref={o3} style={{
        ...orbBase,
        width: 200, height: 200, top: '40%', left: '35%',
        background: 'radial-gradient(circle, rgba(140,80,60,0.10), transparent 70%)',
        filter: 'blur(55px)',
      }} />
    </>
  )
}
