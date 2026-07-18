import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPlanStatus, EXCEPTION_EMAILS } from '@/lib/plan'
import PlanBanner from './PlanBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const esExcepcion = !!user.email && EXCEPTION_EMAILS.includes(user.email)
  let mostrarBanner: number | null = null

  if (!esExcepcion) {
    const { data: empresa } = await supabase
      .from('empresas_empresa')
      .select('plan_activo, plan_vence')
      .eq('user_id', user.id)
      .maybeSingle()

    if (empresa) {
      const { estado, diasRestantes } = getPlanStatus(empresa)

      if (estado === 'pendiente') redirect('/cuenta-pendiente')
      if (estado === 'vencido') redirect('/plan-vencido')
      if (estado === 'piloto' && diasRestantes !== null) {
        mostrarBanner = diasRestantes
      }
    }
  }

  return (
    <>
      {mostrarBanner !== null && <PlanBanner diasRestantes={mostrarBanner} />}
      {children}
    </>
  )
}
