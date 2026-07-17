import { CONTACT_EMAIL } from '@/lib/plan'

function colorPorDias(diasRestantes: number): string {
  if (diasRestantes <= 1) return '#EF4444'
  if (diasRestantes <= 5) return '#D97706'
  return '#EAB308'
}

export default function PlanBanner({ diasRestantes }: { diasRestantes: number }) {
  const color = colorPorDias(diasRestantes)
  const texto = diasRestantes === 1 ? '1 día' : `${diasRestantes} días`

  return (
    <div style={{
      background: color,
      color: '#07090E',
      fontFamily: "'DM Sans',sans-serif",
      fontSize: 13,
      fontWeight: 500,
      padding: '8px 20px',
      textAlign: 'center',
    }}>
      Tu período vence en {texto} · <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#07090E', textDecoration: 'underline' }}>Contactar</a>
    </div>
  )
}
