import crypto from 'crypto'

const FLOW_BASE = process.env.FLOW_BASE_URL || 'https://sandbox.flow.cl/api'

function firmar(params: Record<string, string>, secretKey: string) {
  const keys = Object.keys(params).sort()
  const toSign = keys.map(k => `${k}${params[k]}`).join('')
  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex')
}

export async function crearPago(opts: {
  commerceOrder: string
  subject: string
  amount: number
  email: string
  urlConfirmation: string
  urlReturn: string
}) {
  const apiKey = process.env.FLOW_API_KEY
  const secretKey = process.env.FLOW_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('Flow no configurado: faltan FLOW_API_KEY / FLOW_SECRET_KEY')

  const params: Record<string, string> = {
    apiKey,
    commerceOrder: opts.commerceOrder,
    subject: opts.subject,
    currency: 'CLP',
    amount: String(opts.amount),
    email: opts.email,
    urlConfirmation: opts.urlConfirmation,
    urlReturn: opts.urlReturn,
  }
  const s = firmar(params, secretKey)
  const body = new URLSearchParams({ ...params, s })

  const res = await fetch(`${FLOW_BASE}/payment/create`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || 'Error creando pago en Flow')
  return data as { url: string; token: string; flowOrder: number }
}

export async function obtenerEstado(token: string) {
  const apiKey = process.env.FLOW_API_KEY
  const secretKey = process.env.FLOW_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('Flow no configurado: faltan FLOW_API_KEY / FLOW_SECRET_KEY')

  const params = { apiKey, token }
  const s = firmar(params, secretKey)
  const qs = new URLSearchParams({ ...params, s })
  const res = await fetch(`${FLOW_BASE}/payment/getStatus?${qs.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || 'Error consultando estado en Flow')
  return data as { status: number; commerceOrder: string; amount: number; payer: { email: string } }
}
