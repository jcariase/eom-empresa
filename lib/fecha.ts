const ZONA_CHILE = 'America/Santiago'

// Convierte un string 'YYYY-MM-DD' (o con hora/zona colgando) en un Date
// local sin desplazamiento de día. new Date('YYYY-MM-DD') se interpreta
// como UTC medianoche y puede correr un día en zonas horarias negativas;
// el constructor de 3 argumentos siempre usa la zona horaria local.
export function fechaLocalDesdeISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function hoyChile(): Date {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_CHILE })
  return fechaLocalDesdeISO(iso)
}

export function primerDiaMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

export function formatoISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function diffDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export function labelMes(fecha: Date): string {
  const s = fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
