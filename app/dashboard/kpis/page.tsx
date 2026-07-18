'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '../../components/Sidebar'

type FormulaKPI =
  | { tipo: 'directo' }
  | { tipo: 'ratio'; componenteA: string; componenteB: string }

type KPI = {
  id: string
  nombre: string
  area: string
  unidad: 'porcentaje' | 'pesos' | 'dias' | 'horas' | 'numero'
  meta: number
  actual: number
  descripcion: string
  estandar: boolean
  es_inverso: boolean
  insumo_a: number | null
  insumo_b: number | null
  formula: FormulaKPI
}

type BibliotecaKPI = Omit<KPI, 'id' | 'actual' | 'area' | 'insumo_a' | 'insumo_b'>

const UNIDAD_LABELS: Record<string, string> = {
  porcentaje: '%', pesos: '$', dias: 'días', horas: 'hrs', numero: '#'
}

// La tabla kpis_empresa no tiene columna dedicada para la fórmula estructurada
// (solo insumo_a/insumo_b para los valores crudos). Se serializa en la columna
// `dim`, que no se usa en ningún otro punto de la app. operacion siempre es
// 'division' y por_cien siempre coincide con unidad === 'porcentaje', así que
// no hace falta persistir ninguno de los dos.
function parseFormula(dim: string | null | undefined): FormulaKPI {
  if (!dim) return { tipo: 'directo' }
  try {
    const p = JSON.parse(dim)
    if (p && p.tipo === 'ratio' && typeof p.componenteA === 'string' && typeof p.componenteB === 'string') {
      return { tipo: 'ratio', componenteA: p.componenteA, componenteB: p.componenteB }
    }
  } catch {}
  return { tipo: 'directo' }
}

function serializeFormula(f: FormulaKPI): string | null {
  if (f.tipo === 'directo') return null
  return JSON.stringify({ tipo: 'ratio', componenteA: f.componenteA, componenteB: f.componenteB })
}

function redondear(n: number, decimales = 1): number {
  const f = Math.pow(10, decimales)
  return Math.round(n * f) / f
}

function calcularRatio(a: number, b: number, porCien: boolean): number | null {
  if (b === 0) return null
  const r = a / b
  return redondear(porCien ? r * 100 : r, 1)
}

function formulaTexto(kpi: { formula: FormulaKPI; unidad: KPI['unidad'] }): string {
  if (kpi.formula.tipo === 'directo') return ''
  const porCien = kpi.unidad === 'porcentaje'
  return `(${kpi.formula.componenteA} ÷ ${kpi.formula.componenteB})${porCien ? ' × 100' : ''}`
}

function kpiDirecto(nombre: string, unidad: KPI['unidad'], meta: number, esInverso: boolean, descripcion: string): BibliotecaKPI {
  return { nombre, unidad, meta, estandar: true, es_inverso: esInverso, formula: { tipo: 'directo' }, descripcion }
}

function kpiRatio(nombre: string, unidad: KPI['unidad'], meta: number, esInverso: boolean, componenteA: string, componenteB: string, descripcion: string): BibliotecaKPI {
  return { nombre, unidad, meta, estandar: true, es_inverso: esInverso, formula: { tipo: 'ratio', componenteA, componenteB }, descripcion }
}

const BIBLIOTECA: Record<string, BibliotecaKPI[]> = {
  'Comercial': [
    kpiDirecto('Ingresos por ventas', 'pesos', 0, false, `¿Para qué sirve?\nSin saber cuánto vendiste, no puedes saber si tu empresa crece o se encoge.\n\n¿Cómo lo calculas?\nSuma todas las facturas o boletas emitidas este mes.\n\n¿Dónde encuentras el dato?\nSistema de facturación electrónica del SII o libro de ventas.`),
    kpiRatio('Tasa de cierre de propuestas', 'porcentaje', 30, false, 'Propuestas aceptadas', 'Total propuestas enviadas', `¿Para qué sirve?\nMide la efectividad de tu equipo de ventas. Una tasa baja puede indicar problemas de precio, propuesta o seguimiento.\n\n¿Cómo lo calculas?\nCuenta cuántas propuestas enviadas este mes fueron aceptadas. Divide por el total enviado.\n\n¿Dónde encuentras el dato?\nRegistro de propuestas o CRM. Si no tienes, una planilla simple con fecha, cliente, estado.`),
    kpiDirecto('Nuevos clientes del mes', 'numero', 5, false, `¿Para qué sirve?\nMedir cuántos clientes nuevos entran cada mes te dice si tu empresa está creciendo o solo reteniendo.\n\n¿Cómo lo calculas?\nCuenta los clientes que compraron este mes y no compraron en los últimos 6 meses.\n\n¿Dónde encuentras el dato?\nHistorial de ventas o registro de clientes.`),
    kpiRatio('Ticket promedio', 'pesos', 0, false, 'Ingresos totales', 'Número de ventas del mes', `¿Para qué sirve?\nSaber cuánto gasta en promedio cada cliente te ayuda a identificar si estás vendiendo poco por venta o si puedes hacer upselling.\n\n¿Cómo lo calculas?\nDivide los ingresos totales del mes por el número de órdenes o ventas.\n\n¿Dónde encuentras el dato?\nLibro de ventas.`),
    kpiDirecto('Tiempo de ciclo de venta', 'dias', 14, true, `¿Para qué sirve?\nUn ciclo de venta largo inmoviliza recursos y retrasa el ingreso de caja. Reducirlo mejora el flujo directamente.\n\n¿Cómo lo calculas?\nRegistra la fecha del primer contacto y la fecha de la primera factura. Promedia ese número.\n\n¿Dónde encuentras el dato?\nRegistro de oportunidades o CRM.`),
    kpiRatio('Tasa de retención de clientes', 'porcentaje', 80, false, 'Clientes que repitieron compra', 'Clientes del mes anterior', `¿Para qué sirve?\nRetener un cliente cuesta 5x menos que conseguir uno nuevo. Una tasa de retención baja es una fuga silenciosa de dinero.\n\n¿Cómo lo calculas?\nDe los clientes que compraron el mes pasado, cuántos volvieron a comprar este mes.\n\n¿Dónde encuentras el dato?\nHistorial de ventas.`),
  ],
  'Operaciones': [
    kpiRatio('Entregas a tiempo', 'porcentaje', 95, false, 'Entregas en fecha prometida', 'Total entregas', `¿Para qué sirve?\nEs el indicador más directo de confiabilidad. Un cliente al que le cumples siempre vuelve.\n\n¿Cómo lo calculas?\nCuenta las entregas del mes que llegaron en o antes de la fecha acordada. Divide por el total.\n\n¿Dónde encuentras el dato?\nRegistro de órdenes con fecha prometida y fecha real.`),
    kpiRatio('Órdenes sin error', 'porcentaje', 98, false, 'Órdenes sin reclamo', 'Total órdenes', `¿Para qué sirve?\nCada error tiene costo doble: corregirlo y la confianza perdida.\n\n¿Cómo lo calculas?\nResta las órdenes con reclamo del total. Divide por el total.\n\n¿Dónde encuentras el dato?\nRegistro de reclamos o libro de servicio.`),
    kpiRatio('Capacidad utilizada', 'porcentaje', 80, false, 'Producción real', 'Capacidad máxima', `¿Para qué sirve?\nMenos de 60% = recursos ociosos. Más de 90% = riesgo de errores y retrasos.\n\n¿Cómo lo calculas?\nDefine tu capacidad máxima (horas, equipos, unidades). Mide cuánto usaste realmente.\n\n¿Dónde encuentras el dato?\nControl de producción o registro de equipos.`),
    kpiRatio('Tiempo respuesta a clientes', 'horas', 4, true, 'Suma de horas de espera', 'Número de solicitudes', `¿Para qué sirve?\nResponder rápido aumenta la probabilidad de cierre y satisfacción.\n\n¿Cómo lo calculas?\nRegistra hora de entrada y hora de primera respuesta real. Promedia.\n\n¿Dónde encuentras el dato?\nWhatsApp Business o email.`),
    kpiDirecto('Costo de retrabajo', 'pesos', 0, true, `¿Para qué sirve?\nEl retrabajo es dinero que gastas dos veces por el mismo resultado. Medirlo hace visible un costo que suele esconderse.\n\n¿Cómo lo calculas?\nSuma los materiales, horas y subcontratos usados para corregir trabajos ya entregados.\n\n¿Dónde encuentras el dato?\nRegistro de garantías o correcciones internas.`),
  ],
  'Administración y Finanzas': [
    kpiDirecto('Margen bruto', 'porcentaje', 40, false, `¿Para qué sirve?\nTe dice cuánto queda de cada peso vendido antes de pagar gastos fijos.\n\n¿Cómo lo calculas?\nResta el costo directo (materiales, mano de obra directa) de los ingresos. Divide por los ingresos.\n\n¿Dónde encuentras el dato?\nFacturas de compra + liquidaciones de personal de producción.`),
    kpiDirecto('Días de cobranza (DSO)', 'dias', 30, true, `¿Para qué sirve?\nUn DSO alto significa que estás financiando a tus clientes. Eso seca la caja aunque el negocio sea rentable.\n\n¿Cómo lo calculas?\nToma el saldo de cuentas por cobrar al cierre del mes. Divide por los ingresos del mes. Multiplica por 30.\n\n¿Dónde encuentras el dato?\nBalance de cuentas por cobrar (tu contador lo tiene).`),
    kpiRatio('Gastos fijos vs presupuesto', 'porcentaje', 100, true, 'Gastos fijos reales', 'Gastos fijos presupuestados', `¿Para qué sirve?\nTe alerta cuando gastas más de lo planificado en costos inevitables.\n\n¿Cómo lo calculas?\nSuma arriendo, sueldos admin, servicios. Divide por lo que presupuestaste para esos ítems.\n\n¿Dónde encuentras el dato?\nComprobantes de pago del mes o resumen del contador.`),
    kpiDirecto('Flujo de caja proyectado', 'pesos', 0, false, `¿Para qué sirve?\nEl 60% de las pymes que quiebran son rentables pero se quedan sin caja. Proyectar evita las sorpresas.\n\n¿Cómo lo calculas?\nToma lo que tienes en cuentas hoy. Suma lo que esperas cobrar este mes. Resta lo que debes pagar.\n\n¿Dónde encuentras el dato?\nExtracto bancario + facturas por cobrar + compromisos de pago.`),
    kpiRatio('Pago a proveedores en plazo', 'porcentaje', 95, false, 'Facturas pagadas en plazo', 'Total facturas vencidas', `¿Para qué sirve?\nPagar tarde daña la relación con proveedores y puede cortar el crédito que necesitas para operar.\n\n¿Cómo lo calculas?\nDe todas las facturas que vencieron este mes, cuántas pagaste antes del vencimiento.\n\n¿Dónde encuentras el dato?\nRegistro de cuentas por pagar o tu contador.`),
  ],
  'Logística y Bodega': [
    kpiRatio('Exactitud de inventario', 'porcentaje', 98, false, 'Ítems con stock correcto', 'Total ítems contados', `¿Para qué sirve?\nUn inventario inexacto genera quiebres de stock o sobrestock, ambos cuestan dinero.\n\n¿Cómo lo calculas?\nHaz un conteo físico de una muestra. Compara con lo que dice el sistema. Los que coinciden son los correctos.\n\n¿Dónde encuentras el dato?\nConteo físico vs sistema de inventario.`),
    kpiDirecto('Tiempo de despacho', 'horas', 24, true, `¿Para qué sirve?\nUn despacho lento retrasa las entregas y afecta la satisfacción del cliente final.\n\n¿Cómo lo calculas?\nRegistra la hora en que la orden llega a bodega y la hora en que sale el despacho. Promedia.\n\n¿Dónde encuentras el dato?\nRegistro de órdenes de despacho.`),
    kpiRatio('Rotación de inventario', 'numero', 4, false, 'Costo de ventas anual', 'Inventario promedio', `¿Para qué sirve?\nUna rotación baja significa que tienes capital inmovilizado en bodega. Alto puede significar riesgo de quiebre.\n\n¿Cómo lo calculas?\nDivide el costo de lo vendido en el año por el valor promedio del inventario.\n\n¿Dónde encuentras el dato?\nCosto de ventas (contador) + valor de inventario (bodega).`),
    kpiDirecto('Quiebres de stock', 'numero', 0, true, `¿Para qué sirve?\nCada quiebre de stock es una venta perdida o una entrega retrasada. La meta es cero.\n\n¿Cómo lo calculas?\nRegistra cada vez que un ítem demandado no estaba disponible en bodega.\n\n¿Dónde encuentras el dato?\nSistema de inventario o registro de rechazos de orden.`),
  ],
  'Personas y RRHH': [
    kpiRatio('Ausentismo', 'porcentaje', 3, true, 'Días perdidos', 'Días hábiles totales del equipo', `¿Para qué sirve?\nEl ausentismo tiene costo directo: pagas el sueldo completo pero recibes menos trabajo.\n\n¿Cómo lo calculas?\nSuma días perdidos por licencias e inasistencias. Divide por personas × días hábiles del mes.\n\n¿Dónde encuentras el dato?\nControl de asistencia o libro de licencias médicas.`),
    kpiRatio('Rotación anual', 'porcentaje', 10, true, 'Personas que se fueron en 12 meses', 'Dotación promedio', `¿Para qué sirve?\nReemplazar a una persona cuesta entre 6 y 18 meses de su sueldo.\n\n¿Cómo lo calculas?\nCuenta renuncias y despidos de los últimos 12 meses. Divide por el promedio de dotación.\n\n¿Dónde encuentras el dato?\nFiniquitos de los últimos 12 meses.`),
    kpiRatio('Cumplimiento de compromisos', 'porcentaje', 90, false, 'Compromisos cerrados a tiempo', 'Total compromisos', `¿Para qué sirve?\nEs el termómetro más honesto de la cultura de tu equipo.\n\n¿Cómo lo calculas?\nLleva registro de los acuerdos de reuniones con responsable y fecha. Cuenta cuántos se cerraron en plazo.\n\n¿Dónde encuentras el dato?\nMódulo de Reuniones de EOM OS.`),
    kpiRatio('Horas de capacitación por persona', 'horas', 4, false, 'Total horas de capacitación', 'Número de personas', `¿Para qué sirve?\nEquipos que se capacitan cometen menos errores y tienen más compromiso.\n\n¿Cómo lo calculas?\nSuma todas las horas de capacitación del mes (cursos, inducciones, talleres). Divide por el número de personas.\n\n¿Dónde encuentras el dato?\nRegistro de capacitaciones o OTEC.`),
  ],
  'Servicio Técnico': [
    kpiRatio('Primera solución en terreno', 'porcentaje', 80, false, 'Trabajos resueltos en primera visita', 'Total trabajos', `¿Para qué sirve?\nVolver a atender un trabajo ya cobrado tiene costo doble: tiempo técnico y transporte. La meta es resolverlo en la primera visita.\n\n¿Cómo lo calculas?\nDe todos los trabajos del mes, cuántos se resolvieron sin necesidad de una segunda visita.\n\n¿Dónde encuentras el dato?\nRegistro de órdenes de trabajo.`),
    kpiDirecto('Tiempo de respuesta técnica', 'horas', 8, true, `¿Para qué sirve?\nUn cliente con equipo caído pierde plata cada hora que espera. Tu tiempo de respuesta define si vuelven a llamarte.\n\n¿Cómo lo calculas?\nRegistra hora de la solicitud y hora de llegada del técnico. Promedia.\n\n¿Dónde encuentras el dato?\nRegistro de órdenes de servicio.`),
    kpiDirecto('Satisfacción del cliente (NPS)', 'numero', 8, false, `¿Para qué sirve?\nUn NPS bajo predice pérdida de clientes antes de que se vayan. Te da tiempo de corregir.\n\n¿Cómo lo calculas?\nEnvía una encuesta simple post-servicio: "¿Del 1 al 10, cuánto nos recomendarías?" Promedia las respuestas.\n\n¿Dónde encuentras el dato?\nEncuesta por WhatsApp o formulario simple.`),
    kpiDirecto('Equipos en garantía activa', 'numero', 0, true, `¿Para qué sirve?\nCada equipo en garantía con problema es un costo directo y un cliente insatisfecho. La meta es cero.\n\n¿Cómo lo calculas?\nRegistra los trabajos que volvieron dentro del período de garantía con falla relacionada.\n\n¿Dónde encuentras el dato?\nRegistro de garantías o libro de servicio técnico.`),
  ],
}

const AREAS_DEFAULT = ['Comercial', 'Operaciones', 'Administración y Finanzas', 'Logística y Bodega', 'Personas y RRHH', 'Servicio Técnico']

function getBibliotecaKey(area: string): string | null {
  const normalizado = area.toLowerCase()
  if (normalizado.includes('comercial') || normalizado.includes('venta')) return 'Comercial'
  if (normalizado.includes('operacion') || normalizado.includes('producción') || normalizado.includes('produccion')) return 'Operaciones'
  if (normalizado.includes('administra') || normalizado.includes('finanza') || normalizado.includes('contab')) return 'Administración y Finanzas'
  if (normalizado.includes('logistic') || normalizado.includes('logíst') || normalizado.includes('bodega') || normalizado.includes('inventario')) return 'Logística y Bodega'
  if (normalizado.includes('persona') || normalizado.includes('rrhh') || normalizado.includes('recursos human') || normalizado.includes('talento')) return 'Personas y RRHH'
  if (normalizado.includes('servicio técnico') || normalizado.includes('servicio tecnico') || normalizado.includes('postventa') || normalizado.includes('soporte')) return 'Servicio Técnico'
  return null
}

function getColor(kpi: KPI) {
  if (kpi.meta === 0 || kpi.actual === 0) return '#5A6888'
  const pct = kpi.es_inverso ? (kpi.meta / Math.max(kpi.actual, 0.01)) * 100 : (kpi.actual / kpi.meta) * 100
  if (pct >= 90) return '#16A34A'
  if (pct >= 70) return '#D97706'
  return '#EF4444'
}

function getPct(kpi: KPI) {
  if (kpi.meta === 0 || kpi.actual === 0) return 0
  return Math.min(100, Math.round(kpi.es_inverso ? (kpi.meta / Math.max(kpi.actual, 0.01)) * 100 : (kpi.actual / kpi.meta) * 100))
}

// Para KPIs en puntos porcentuales, un "% de cumplimiento" (ej. 92%) se
// confunde con el propio valor del KPI (también un %). En su lugar se
// muestra la brecha en puntos contra la meta, que no tiene esa ambigüedad.
function textoCumplimiento(kpi: KPI, pct: number): string {
  if (kpi.unidad !== 'porcentaje') return `cumplimiento ${pct}%`
  const metaSuperada = kpi.es_inverso ? kpi.actual <= kpi.meta : kpi.actual >= kpi.meta
  if (metaSuperada) return 'meta superada'
  const brecha = redondear(Math.abs(kpi.meta - kpi.actual), 1)
  return `a ${brecha.toLocaleString('es-CL')} pts de la meta`
}

function formatVal(kpi: KPI, val: number) {
  const decimales = kpi.unidad === 'pesos' ? 0 : 1
  const n = val.toLocaleString('es-CL', { maximumFractionDigits: decimales })
  if (kpi.unidad === 'pesos') return `$ ${n}`
  if (kpi.unidad === 'porcentaje') return `${n}%`
  if (kpi.unidad === 'dias') return `${n} días`
  if (kpi.unidad === 'horas') return `${n} hrs`
  return n
}

function getSemaforoColor(score: number | null) {
  if (score === null) return '#5A6888'
  if (score >= 90) return '#16A34A'
  if (score >= 70) return '#D97706'
  return '#EF4444'
}

export default function KPIsPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState<any>(null)
  const [areas, setAreas] = useState<string[]>([])
  const [areaActiva, setAreaActiva] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ a: string; b: string; directo: string }>({ a: '', b: '', directo: '' })
  const [saving, setSaving] = useState(false)
  const [tooltip, setTooltip] = useState<{id: string, x: number, y: number} | null>(null)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [showCrear, setShowCrear] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formUnidad, setFormUnidad] = useState('porcentaje')
  const [formMeta, setFormMeta] = useState('')
  const [formTipo, setFormTipo] = useState<'directo' | 'ratio'>('directo')
  const [formComponenteA, setFormComponenteA] = useState('')
  const [formComponenteB, setFormComponenteB] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formEsInverso, setFormEsInverso] = useState(false)

  useEffect(() => {
    async function load() {
      const {data: {user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data: emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)
      const areasEmp = emp.areas?.length ? emp.areas : AREAS_DEFAULT
      setAreas(areasEmp)
      setAreaActiva(areasEmp[0])
      const {data: kpisData} = await supabase.from('kpis_empresa').select('*').eq('user_id', user.id)
      const parsed: KPI[] = (kpisData || []).map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        area: row.area,
        unidad: row.unidad,
        meta: row.meta,
        actual: row.actual,
        descripcion: row.descripcion,
        estandar: row.estandar,
        es_inverso: row.es_inverso,
        insumo_a: row.insumo_a,
        insumo_b: row.insumo_b,
        formula: parseFormula(row.dim),
      }))
      setKpis(parsed)
      setLoading(false)
    }
    load()
  }, [router])

  async function agregarDesdeBiblioteca(kpiBase: BibliotecaKPI) {
    const {data: {user}} = await supabase.auth.getUser()
    if (!user || !areaActiva) return
    setSaving(true)
    const id = crypto.randomUUID()
    const { error } = await supabase.from('kpis_empresa').insert({
      id, user_id: user.id, nombre: kpiBase.nombre, area: areaActiva, unidad: kpiBase.unidad,
      meta: kpiBase.meta, actual: 0, descripcion: kpiBase.descripcion, estandar: kpiBase.estandar,
      es_inverso: kpiBase.es_inverso, dim: serializeFormula(kpiBase.formula), insumo_a: null, insumo_b: null,
    })
    setSaving(false)
    if (error) return
    setKpis(prev => [...prev, { ...kpiBase, id, actual: 0, area: areaActiva, insumo_a: null, insumo_b: null }])
  }

  async function crearKPI() {
    if (!formNombre || !areaActiva) return
    if (formTipo === 'ratio' && (!formComponenteA.trim() || !formComponenteB.trim())) return
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const formula: FormulaKPI = formTipo === 'ratio'
      ? { tipo: 'ratio', componenteA: formComponenteA.trim(), componenteB: formComponenteB.trim() }
      : { tipo: 'directo' }
    const id = crypto.randomUUID()
    const meta = parseFloat(formMeta) || 0
    const { error } = await supabase.from('kpis_empresa').insert({
      id, user_id: user.id, nombre: formNombre, area: areaActiva, unidad: formUnidad,
      meta, actual: 0, descripcion: formDesc, estandar: false,
      es_inverso: formEsInverso, dim: serializeFormula(formula), insumo_a: null, insumo_b: null,
    })
    setSaving(false)
    if (error) return
    setKpis(prev => [...prev, {
      id, nombre: formNombre, area: areaActiva, unidad: formUnidad as KPI['unidad'],
      meta, actual: 0, descripcion: formDesc, estandar: false,
      es_inverso: formEsInverso, insumo_a: null, insumo_b: null, formula,
    }])
    setFormNombre(''); setFormUnidad('porcentaje'); setFormMeta('')
    setFormTipo('directo'); setFormComponenteA(''); setFormComponenteB('')
    setFormDesc(''); setFormEsInverso(false)
    setShowCrear(false)
  }

  function toggleEditar(kpi: KPI) {
    if (editando === kpi.id) { setEditando(null); return }
    setEditando(kpi.id)
    if (kpi.formula.tipo === 'ratio') {
      setEditValues({
        a: kpi.insumo_a !== null && kpi.insumo_a !== undefined ? String(kpi.insumo_a) : '',
        b: kpi.insumo_b !== null && kpi.insumo_b !== undefined ? String(kpi.insumo_b) : '',
        directo: '',
      })
    } else {
      setEditValues({ a: '', b: '', directo: kpi.actual ? String(kpi.actual) : '' })
    }
  }

  async function guardarRatio(kpi: KPI, a: number, b: number) {
    if (isNaN(a) || isNaN(b) || b === 0) return
    const resultado = calcularRatio(a, b, kpi.unidad === 'porcentaje')
    if (resultado === null) return
    setSaving(true)
    const { error } = await supabase.from('kpis_empresa').update({ actual: resultado, insumo_a: a, insumo_b: b }).eq('id', kpi.id)
    setSaving(false)
    if (error) return
    setKpis(prev => prev.map(k => k.id === kpi.id ? { ...k, actual: resultado, insumo_a: a, insumo_b: b } : k))
    setEditando(null)
  }

  async function guardarDirecto(kpi: KPI, val: number) {
    setSaving(true)
    const { error } = await supabase.from('kpis_empresa').update({ actual: val }).eq('id', kpi.id)
    setSaving(false)
    if (error) return
    setKpis(prev => prev.map(k => k.id === kpi.id ? { ...k, actual: val } : k))
    setEditando(null)
  }

  async function eliminar(id: string) {
    await supabase.from('kpis_empresa').delete().eq('id', id)
    setKpis(prev => prev.filter(k => k.id !== id))
  }

  const kpisArea = areaActiva ? kpis.filter(k => k.area === areaActiva) : []
  const bibliotecaKey = areaActiva ? getBibliotecaKey(areaActiva) : null
  const bibliotecaArea = areaActiva && bibliotecaKey ? (BIBLIOTECA[bibliotecaKey] || []).filter(b => !kpis.find(k => k.nombre === b.nombre && k.area === areaActiva)) : []

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando KPIs...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--txt-1);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .sidebar{background:var(--surf-2);border-right:1px solid var(--brd);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--txt-1);padding:0 20px 24px;border-bottom:1px solid var(--brd);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--txt-3);cursor:pointer;transition:all 0.15s}
        .nav-item:hover{color:var(--txt-1);background:var(--surf-3)}
        .nav-item.active{color:var(--amber);background:rgba(217,119,6,0.08)}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--txt-2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--brd)}
        .btn-logout{background:none;border:none;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .main{padding:40px;overflow-y:auto}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--txt-1);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--txt-3);margin-bottom:28px}
        .areas-overview{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);margin-bottom:28px}
        .area-card{padding:16px 18px;background:var(--surf-2);cursor:pointer;transition:background 0.15s;position:relative;overflow:hidden}
        .area-card:hover{background:var(--surf-3)}
        .area-card.active{background:var(--surf-3)}
        .area-card-accent{position:absolute;top:0;left:0;right:0;height:2px}
        .area-card-nombre{font-size:11px;font-weight:500;color:var(--txt-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;font-family:'DM Mono',monospace}
        .area-card-score{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;line-height:1;margin-bottom:4px}
        .area-card-sub{font-size:11px;color:var(--txt-2)}
        .area-bar{height:2px;background:var(--brd);margin-top:8px}
        .area-bar-fill{height:100%;transition:width 0.5s}
        .cockpit-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
        .cockpit-title{font-size:16px;font-weight:500;color:var(--txt-1)}
        .cockpit-sub{font-size:13px;color:var(--txt-3);margin-top:2px}
        .header-actions{display:flex;gap:8px}
        .btn-outline{padding:8px 16px;border:1px solid var(--brd-2);background:transparent;color:var(--txt-3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;border-radius:0}
        .btn-outline:hover{border-color:rgba(255,255,255,0.25);color:var(--txt-1)}
        .btn-amber{padding:8px 16px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-radius:0}
        .btn-amber:hover{background:#B45309}
        .semaforo{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--brd);border:1px solid var(--brd);margin-bottom:20px}
        .sem-cell{padding:14px 18px;background:var(--surf-2);text-align:center}
        .sem-num{font-family:'Playfair Display',serif;font-size:24px;font-weight:400;line-height:1}
        .sem-label{font-size:11px;color:var(--txt-2);margin-top:4px}
        .kpis-list{display:flex;flex-direction:column;gap:1px;background:var(--brd);border:1px solid var(--brd)}
        .kpi-row{background:var(--surf-2);padding:16px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;transition:background 0.15s}
        .kpi-row:hover{background:var(--surf-3)}
        .kpi-info{min-width:0}
        .kpi-nombre-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}
        .kpi-nombre{font-size:14px;font-weight:500;color:var(--txt-1)}
        .kpi-ratio{font-family:'DM Mono',monospace;font-size:10px;color:var(--txt-2);margin-bottom:8px}
        .kpi-bar-track{height:2px;background:var(--brd);max-width:200px}
        .kpi-bar-fill{height:100%;transition:width 0.5s}
        .kpi-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
        .kpi-valores{text-align:right}
        .kpi-actual{font-family:'Playfair Display',serif;font-size:22px;font-weight:400;line-height:1}
        .kpi-meta-label{font-size:11px;color:var(--txt-2);margin-top:2px}
        .kpi-actions{display:flex;gap:6px}
        .btn-mini{padding:4px 10px;border:1px solid var(--brd);background:transparent;color:var(--txt-2);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;border-radius:0}
        .btn-mini:hover{border-color:var(--amber);color:var(--amber)}
        .btn-mini-red:hover{border-color:var(--red);color:var(--red)}
        .tooltip-icon{width:14px;height:14px;border-radius:50%;border:1px solid var(--brd-2);display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:var(--txt-2);cursor:help;font-family:'DM Mono',monospace;transition:all 0.15s;flex-shrink:0}
        .tooltip-icon:hover{border-color:var(--amber);color:var(--amber)}
        .edit-inline{padding:12px 20px;background:var(--surf-3);border-top:1px solid var(--brd);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        .campo-mini{display:flex;flex-direction:column;gap:4px;flex:1;min-width:160px}
        .campo-mini label{font-size:11px;color:var(--txt-2)}
        .campo-resultado{font-family:'DM Mono',monospace;font-size:14px;color:var(--txt-1);font-weight:500;white-space:nowrap;padding:0 4px;flex-shrink:0}
        .field-inline{flex:1;padding:7px 10px;border:1px solid var(--amber-dim,rgba(217,119,6,0.2));background:var(--bg);color:var(--txt-1);font-family:'DM Mono',monospace;font-size:13px;outline:none;border-radius:0}
        .field-inline:focus{border-color:var(--amber)}
        .btn-save{padding:7px 14px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;border-radius:0;white-space:nowrap}
        .btn-save:disabled{opacity:0.5;cursor:not-allowed}
        .empty-area{padding:48px;text-align:center;border:1px solid var(--brd);background:var(--surf-2)}
        .empty-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--txt-1);margin-bottom:8px;font-weight:400}
        .empty-sub{font-size:13px;color:var(--txt-3);margin-bottom:24px;line-height:1.6}
        .panel{position:fixed;top:0;right:0;bottom:0;width:400px;background:var(--surf-2);border-left:1px solid var(--brd);padding:32px;overflow-y:auto;z-index:100;animation:slideIn 0.2s ease}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .panel-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--txt-1);margin-bottom:20px;font-weight:400}
        .panel-close{position:absolute;top:20px;right:20px;background:none;border:none;color:var(--txt-2);font-size:20px;cursor:pointer}
        .bib-item{padding:14px;border:1px solid var(--brd);background:var(--surf-3);margin-bottom:8px;cursor:pointer;transition:all 0.15s}
        .bib-item:hover{border-color:rgba(217,119,6,0.3);background:var(--bg)}
        .bib-nombre{font-size:13px;font-weight:500;color:var(--txt-1);margin-bottom:3px}
        .bib-ratio{font-family:'DM Mono',monospace;font-size:10px;color:var(--txt-2)}
        .field-group{margin-bottom:14px}
        .field-label{font-size:12px;color:var(--txt-3);margin-bottom:5px;display:block}
        .field{width:100%;padding:9px 12px;border:1px solid var(--brd-2);background:var(--surf-3);color:var(--txt-1);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--txt-2)}
        select.field{cursor:pointer}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.main{padding:20px 16px}.panel{width:100%}.areas-overview{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="layout">
        <Sidebar empresaNombre={empresa?.nombre} />

        <main className="main">
          <div className="page-title">Cockpit de KPIs</div>
          <div className="page-sub">{empresa?.nombre} · Vista por área</div>

          {/* Resumen por área */}
          <div className="areas-overview">
            {areas.map(area => {
              const kpisDeArea = kpis.filter(k => k.area === area)
              const enMeta = kpisDeArea.filter(k => k.actual > 0 && getColor(k) === '#16A34A').length
              const pctEnMeta = kpisDeArea.length > 0 ? Math.round((enMeta / kpisDeArea.length) * 100) : null
              const color = getSemaforoColor(pctEnMeta)
              return (
                <div key={area} className={`area-card ${areaActiva === area ? 'active' : ''}`} onClick={() => setAreaActiva(area)}>
                  <div className="area-card-accent" style={{background: color}} />
                  <div className="area-card-nombre">{area}</div>
                  <div className="area-card-score" style={{color: pctEnMeta !== null ? color : 'var(--txt-2)'}}>
                    {kpisDeArea.length === 0 ? '—' : `${enMeta}/${kpisDeArea.length} en meta`}
                  </div>
                  <div className="area-card-sub">
                    {kpisDeArea.length === 0 ? 'Sin KPIs' : ''}
                  </div>
                  <div className="area-bar">
                    <div className="area-bar-fill" style={{width: `${pctEnMeta || 0}%`, background: color}} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Cockpit del área activa */}
          {areaActiva && (
            <>
              <div className="cockpit-header">
                <div>
                  <div className="cockpit-title">{areaActiva}</div>
                  <div className="cockpit-sub">{kpisArea.length} indicadores · {kpisArea.filter(k => k.actual > 0).length} actualizados</div>
                </div>
                <div className="header-actions">
                  {bibliotecaArea.length > 0 && (
                    <button className="btn-outline" onClick={() => { setShowBiblioteca(true); setShowCrear(false) }}>
                      + Desde biblioteca
                    </button>
                  )}
                  <button className="btn-amber" onClick={() => { setShowCrear(true); setShowBiblioteca(false) }}>
                    + Crear KPI
                  </button>
                </div>
              </div>

              {/* Semáforo del área */}
              {kpisArea.length > 0 && (
                <div className="semaforo">
                  <div className="sem-cell">
                    <div className="sem-num" style={{color: '#16A34A'}}>{kpisArea.filter(k => k.actual > 0 && getColor(k) === '#16A34A').length}</div>
                    <div className="sem-label">En meta</div>
                  </div>
                  <div className="sem-cell">
                    <div className="sem-num" style={{color: '#D97706'}}>{kpisArea.filter(k => k.actual > 0 && getColor(k) === '#D97706').length}</div>
                    <div className="sem-label">En riesgo</div>
                  </div>
                  <div className="sem-cell">
                    <div className="sem-num" style={{color: '#EF4444'}}>{kpisArea.filter(k => k.actual > 0 && getColor(k) === '#EF4444').length}</div>
                    <div className="sem-label">Fuera de meta</div>
                  </div>
                </div>
              )}

              {kpisArea.length === 0 ? (
                <div className="empty-area">
                  <div className="empty-title">Sin KPIs en {areaActiva}</div>
                  <p className="empty-sub">Agrega indicadores desde la biblioteca o crea los propios del área.<br />EOM sugiere los más relevantes para este tipo de área.</p>
                  <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                    {bibliotecaArea.length > 0 && <button className="btn-outline" onClick={() => setShowBiblioteca(true)}>Ver biblioteca →</button>}
                    <button className="btn-amber" onClick={() => setShowCrear(true)}>Crear KPI propio →</button>
                  </div>
                </div>
              ) : (
                <div className="kpis-list">
                  {kpisArea.map(kpi => {
                    const color = getColor(kpi)
                    const pct = getPct(kpi)
                    const enEdicion = editando === kpi.id
                    const aNum = parseFloat(editValues.a)
                    const bNum = parseFloat(editValues.b)
                    const denominadorCero = enEdicion && kpi.formula.tipo === 'ratio' && editValues.b.trim() !== '' && bNum === 0
                    const resultadoPreview = enEdicion && kpi.formula.tipo === 'ratio' && !isNaN(aNum) && !isNaN(bNum) && bNum !== 0
                      ? calcularRatio(aNum, bNum, kpi.unidad === 'porcentaje')
                      : null
                    const textoFormula = formulaTexto(kpi)
                    return (
                      <div key={kpi.id}>
                        <div className="kpi-row">
                          <div className="kpi-info">
                            <div className="kpi-nombre-row">
                              <span className="kpi-nombre">{kpi.nombre}</span>
                              {kpi.descripcion && (
                                <div
                                  className="tooltip-icon"
                                  onMouseEnter={e => {
                                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                                    const spaceBelow = window.innerHeight - rect.bottom
                                    setTooltip({id: kpi.id, x: Math.min(rect.left, window.innerWidth - 336), y: spaceBelow > 300 ? rect.bottom + 8 : rect.top - 8})
                                  }}
                                  onMouseLeave={() => setTooltip(null)}
                                >i</div>
                              )}
                            </div>
                            {textoFormula && <div className="kpi-ratio">= {textoFormula}</div>}
                            <div className="kpi-bar-track">
                              <div className="kpi-bar-fill" style={{width: `${kpi.actual > 0 ? pct : 0}%`, background: color}} />
                            </div>
                          </div>
                          <div className="kpi-right">
                            <div className="kpi-valores">
                              <div className="kpi-actual" style={{color: kpi.actual > 0 ? color : 'var(--txt-2)'}}>
                                {kpi.actual > 0 ? formatVal(kpi, kpi.actual) : '—'}
                              </div>
                              <div className="kpi-meta-label">
                                {kpi.actual > 0 ? `${textoCumplimiento(kpi, pct)} · meta ${formatVal(kpi, kpi.meta)}` : `Meta: ${kpi.meta > 0 ? formatVal(kpi, kpi.meta) : 'sin definir'}`}
                              </div>
                            </div>
                            <div className="kpi-actions">
                              <button className="btn-mini" onClick={() => toggleEditar(kpi)}>
                                {enEdicion ? 'Cancelar' : 'Actualizar'}
                              </button>
                              <button className="btn-mini btn-mini-red" onClick={() => eliminar(kpi.id)}>✕</button>
                            </div>
                          </div>
                        </div>
                        {enEdicion && kpi.formula.tipo === 'ratio' && (
                          <div className="edit-inline">
                            <div className="campo-mini">
                              <label>{kpi.formula.componenteA}</label>
                              <input
                                className="field-inline" type="number" step="0.01" autoFocus
                                value={editValues.a}
                                onChange={e => setEditValues(v => ({...v, a: e.target.value}))}
                              />
                            </div>
                            <div className="campo-mini">
                              <label>{kpi.formula.componenteB}</label>
                              <input
                                className="field-inline" type="number" step="0.01"
                                value={editValues.b}
                                onChange={e => setEditValues(v => ({...v, b: e.target.value}))}
                              />
                            </div>
                            <div className="campo-resultado">
                              {denominadorCero
                                ? <span style={{color:'#EF4444'}}>El denominador no puede ser cero</span>
                                : resultadoPreview !== null
                                  ? <span>= {formatVal(kpi, resultadoPreview)}</span>
                                  : <span style={{color:'var(--txt-2)'}}>Ingresa ambos valores</span>}
                            </div>
                            <button className="btn-save" disabled={resultadoPreview === null} onClick={() => guardarRatio(kpi, aNum, bNum)}>
                              Guardar
                            </button>
                          </div>
                        )}
                        {enEdicion && kpi.formula.tipo === 'directo' && (
                          <div className="edit-inline">
                            <span style={{fontSize:'12px',color:'var(--txt-2)',flexShrink:0}}>Valor actual ({UNIDAD_LABELS[kpi.unidad]}):</span>
                            <input
                              className="field-inline"
                              type="number"
                              step="0.01"
                              autoFocus
                              value={editValues.directo}
                              onKeyDown={e => {
                                if (e.key === 'Enter') guardarDirecto(kpi, parseFloat(editValues.directo) || 0)
                              }}
                              onChange={e => setEditValues(v => ({...v, directo: e.target.value}))}
                            />
                            <button className="btn-save" onClick={() => guardarDirecto(kpi, parseFloat(editValues.directo) || 0)}>
                              Guardar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Tooltip global */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x,
          top: tooltip.y < window.innerHeight / 2 ? tooltip.y : 'auto',
          bottom: tooltip.y >= window.innerHeight / 2 ? `${window.innerHeight - tooltip.y + 8}px` : 'auto',
          width: '320px', background: '#1A2035', border: '1px solid rgba(255,255,255,0.12)',
          borderTop: '2px solid #D97706', padding: '16px', fontSize: '12px',
          color: '#8A9AB8', lineHeight: 1.7, zIndex: 1000, whiteSpace: 'pre-line',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none',
        }}>
          {kpis.find(k => k.id === tooltip.id)?.descripcion}
        </div>
      )}

      {/* Panel biblioteca */}
      {showBiblioteca && (
        <>
          <div className="overlay" onClick={() => setShowBiblioteca(false)} />
          <div className="panel">
            <button className="panel-close" onClick={() => setShowBiblioteca(false)}>×</button>
            <div className="panel-title">Biblioteca — {areaActiva}</div>
            <p style={{fontSize:'13px',color:'var(--txt-3)',marginBottom:'16px',lineHeight:1.6}}>
              KPIs sugeridos para esta área. Solo aparecen los que no tienes activos.
            </p>
            {bibliotecaArea.length === 0 ? (
              <p style={{fontSize:'13px',color:'var(--txt-2)'}}>Ya tienes todos los KPIs sugeridos para esta área.</p>
            ) : (
              bibliotecaArea.map((k, i) => (
                <div key={i} className="bib-item" onClick={() => { agregarDesdeBiblioteca(k); setShowBiblioteca(false) }}>
                  <div className="bib-nombre">{k.nombre}</div>
                  <div className="bib-ratio">{formulaTexto(k) ? `= ${formulaTexto(k)}` : 'Valor directo'}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Panel crear KPI */}
      {showCrear && (
        <>
          <div className="overlay" onClick={() => setShowCrear(false)} />
          <div className="panel">
            <button className="panel-close" onClick={() => setShowCrear(false)}>×</button>
            <div className="panel-title">Crear KPI — {areaActiva}</div>
            <div className="field-group">
              <label className="field-label">Nombre del indicador *</label>
              <input className="field" placeholder="Ej: Equipos disponibles vs total" value={formNombre} onChange={e => setFormNombre(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Unidad de medida *</label>
              <select className="field" value={formUnidad} onChange={e => setFormUnidad(e.target.value)}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="pesos">Pesos ($)</option>
                <option value="dias">Días</option>
                <option value="horas">Horas</option>
                <option value="numero">Número</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Meta</label>
              <input className="field" type="number" placeholder="Ej: 95" value={formMeta} onChange={e => setFormMeta(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Tipo de indicador *</label>
              <select className="field" value={formTipo} onChange={e => setFormTipo(e.target.value as 'directo' | 'ratio')}>
                <option value="directo">Valor directo</option>
                <option value="ratio">Ratio (A ÷ B)</option>
              </select>
            </div>
            {formTipo === 'ratio' && (
              <>
                <div className="field-group">
                  <label className="field-label">¿Qué mides? (numerador) *</label>
                  <input className="field" placeholder="Ej: Entregas a tiempo" value={formComponenteA} onChange={e => setFormComponenteA(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">¿Sobre qué total? (denominador) *</label>
                  <input className="field" placeholder="Ej: Total de entregas" value={formComponenteB} onChange={e => setFormComponenteB(e.target.value)} />
                </div>
              </>
            )}
            <div className="field-group">
              <label className="field-label">Descripción (para el tooltip)</label>
              <textarea className="field" placeholder="¿Para qué sirve? ¿Cómo se calcula? ¿Dónde se encuentra el dato?" value={formDesc} onChange={e => setFormDesc(e.target.value)} style={{minHeight:'80px',resize:'vertical'}} />
            </div>
            <div className="field-group" style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="checkbox" id="es-inverso" checked={formEsInverso} onChange={e => setFormEsInverso(e.target.checked)} style={{width:16,height:16}} />
              <label htmlFor="es-inverso" style={{fontSize:'13px',color:'var(--txt-3)',cursor:'pointer'}}>
                Este KPI es mejor cuando es más bajo (ej. días de espera, ausentismo, costos)
              </label>
            </div>
            <button
              className="btn-amber" style={{width:'100%',padding:'12px'}} onClick={crearKPI}
              disabled={!formNombre || saving || (formTipo === 'ratio' && (!formComponenteA.trim() || !formComponenteB.trim()))}
            >
              {saving ? 'Guardando...' : 'Agregar KPI →'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
