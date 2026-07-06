import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearPago } from '@/lib/flow'

const PRECIO_MENSUAL = 390000

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`
  const commerceOrder = `empresa_${user.id}_${Date.now()}`

  try {
    const pago = await crearPago({
      commerceOrder,
      subject: 'Suscripción mensual EOM OS Empresa',
      amount: PRECIO_MENSUAL,
      email: user.email,
      urlConfirmation: `${appUrl}/api/flow/confirmacion`,
      urlReturn: `${appUrl}/pago/retorno`,
    })
    return NextResponse.json({ url: `${pago.url}?token=${pago.token}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error creando pago' }, { status: 500 })
  }
}
