export type PlanEstado = 'pagado' | 'pendiente' | 'piloto' | 'vencido'

export type PlanStatus = {
  estado: PlanEstado
  diasRestantes: number | null
}

import { hoyChile, fechaLocalDesdeISO, diffDias } from './fecha'

type EmpresaPlan = {
  plan_activo?: boolean | null
  plan_vence?: string | null
}

export const CONTACT_EMAIL = 'jc0904@gmail.com'
export const EXCEPTION_EMAILS = ['jc0904@gmail.com', 'jarias@fen.uchile.cl']

export function getPlanStatus(empresa: EmpresaPlan): PlanStatus {
  if (empresa.plan_activo) return { estado: 'pagado', diasRestantes: null }
  if (!empresa.plan_vence) return { estado: 'pendiente', diasRestantes: null }

  const hoy = hoyChile()
  const vence = fechaLocalDesdeISO(empresa.plan_vence)
  const diasRestantes = diffDias(vence, hoy)

  if (diasRestantes < 0) return { estado: 'vencido', diasRestantes }
  return { estado: 'piloto', diasRestantes }
}
