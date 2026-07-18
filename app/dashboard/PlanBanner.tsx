import { CONTACT_EMAIL } from '@/lib/plan'

function estiloPorDias(diasRestantes: number): { bg: string; texto: string } {
  if (diasRestantes <= 1) return { bg: '#EF4444', texto: '#fff' }
  if (diasRestantes <= 5) return { bg: '#D97706', texto: '#fff' }
  if (diasRestantes <= 15) return { bg: '#EAB308', texto: '#07090E' }
  return { bg: '#5A6888', texto: '#fff' }
}

export default function PlanBanner({ diasRestantes }: { diasRestantes: number }) {
  const { bg, texto: colorTexto } = estiloPorDias(diasRestantes)
  const texto = diasRestantes === 1 ? '1 día' : `${diasRestantes} días`

  return (
    <div style={{
      background: bg,
      color: colorTexto,
      fontFamily: "'DM Sans',sans-serif",
      fontSize: 13,
      fontWeight: 500,
      padding: '8px 20px',
      textAlign: 'center',
    }}>
      Tu período vence en {texto} · <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: colorTexto, textDecoration: 'underline' }}>Contactar</a>
    </div>
  )
}
