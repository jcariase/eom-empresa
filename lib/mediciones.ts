import { hoyChile, primerDiaMes, sumarMeses, fechaLocalDesdeISO, formatoISO } from './fecha'

export type MesPendiente = {
  pendiente: Date | null
  proximaDisponible: Date
}

// Rango registrable: desde el mes siguiente al baseline (mes de inscripción)
// hasta el mes calendario anterior al actual. Devuelve el mes más antiguo
// sin medición dentro de ese rango, o null si está todo al día.
export function calcularMesPendiente(baselinePeriodo: string | null | undefined, periodosRegistrados: string[]): MesPendiente {
  const mesActual = primerDiaMes(hoyChile())
  const mesLimite = sumarMeses(mesActual, -1)
  const proximaDisponible = sumarMeses(mesActual, 1)

  if (!baselinePeriodo) return { pendiente: null, proximaDisponible }

  const mesInscripcion = sumarMeses(fechaLocalDesdeISO(baselinePeriodo), 1)
  if (mesInscripcion.getTime() > mesLimite.getTime()) return { pendiente: null, proximaDisponible }

  const registrados = new Set(periodosRegistrados)
  let cursor = mesInscripcion
  while (cursor.getTime() <= mesLimite.getTime()) {
    if (!registrados.has(formatoISO(cursor))) return { pendiente: cursor, proximaDisponible }
    cursor = sumarMeses(cursor, 1)
  }
  return { pendiente: null, proximaDisponible }
}
