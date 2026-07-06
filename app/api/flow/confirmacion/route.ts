import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obtenerEstado } from '@/lib/flow'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const token = form.get('token') as string
  if (!token) return NextResponse.json({ error: 'Falta token' }, { status: 400 })

  try {
    const estado = await obtenerEstado(token)
    if (estado.status === 2) {
      const userId = estado.commerceOrder.split('_')[1]
      const vence = new Date()
      vence.setDate(vence.getDate() + 30)
      await supabaseAdmin.from('empresas_empresa').update({
        plan_activo: true,
        plan_nombre: 'Suscripción EOM OS',
        plan_vence: vence.toISOString().split('T')[0],
      }).eq('user_id', userId)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error verificando pago' }, { status: 500 })
  }
}
