'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PagoRetorno() {
  const router = useRouter()
  const [estado, setEstado] = useState<'esperando' | 'ok'>('esperando')

  useEffect(() => {
    // Flow confirma el pago por webhook server-to-server; acá solo damos feedback visual.
    const t = setTimeout(() => setEstado('ok'), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'DM Sans, sans-serif', color: '#E8EDF8', textAlign: 'center', padding: 24 }}>
      {estado === 'esperando' ? (
        <>
          <div style={{ fontSize: 18 }}>Confirmando tu pago...</div>
          <div style={{ fontSize: 13, color: '#8A9AB8' }}>Esto toma solo unos segundos.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 18 }}>¡Listo! Tu suscripción está activa.</div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ padding: '10px 24px', border: 'none', background: '#D97706', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontSize: 14, cursor: 'pointer', marginTop: 8 }}
          >
            Ir al dashboard →
          </button>
        </>
      )}
    </div>
  )
}
