export type PlanEstado = 'pagado' | 'pendiente' | 'piloto' | 'vencido'

export type PlanStatus = {
  estado: PlanEstado
  diasRestantes: number | null
}

type EmpresaPlan = {
  plan_activo?: boolean | null
  plan_vence?: string | null
}

export const CONTACT_EMAIL = 'jc0904@gmail.com'
export const EXCEPTION_EMAILS = ['jc0904@gmail.com', 'jarias@fen.uchile.cl']

function hoyChile(): Date {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  return new Date(`${hoy}T00:00:00`)
}

export function getPlanStatus(empresa: EmpresaPlan): PlanStatus {
  if (empresa.plan_activo) return { estado: 'pagado', diasRestantes: null }
  if (!empresa.plan_vence) return { estado: 'pendiente', diasRestantes: null }

  const hoy = hoyChile()
  const vence = new Date(`${empresa.plan_vence}T00:00:00`)
  const diasRestantes = Math.round((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  if (diasRestantes < 0) return { estado: 'vencido', diasRestantes }
  return { estado: 'piloto', diasRestantes }
}
