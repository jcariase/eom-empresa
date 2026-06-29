'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type KPI = {
  id: string
  nombre: string
  dim: string
  unidad: 'porcentaje' | 'pesos' | 'dias' | 'numero' | 'horas'
  meta: number
  actual: number
  ratio: string
  descripcion: string
  estandar: boolean
}

const UNIDAD_LABELS: Record<string, string> = {
  porcentaje: '%', pesos: '$', dias: 'días', numero: '#'
}

const DIM_COLORS: Record<string, string> = {
  Finanzas: '#D97706', Operaciones: '#2563EB', Personas: '#7C3AED', Liderazgo: '#16A34A'
}

const KPIS_ESTANDAR: Omit<KPI, 'id' | 'actual'>[] = [
  {
    nombre: 'Ingresos por ventas', dim: 'Finanzas', unidad: 'pesos', meta: 0, estandar: true,
    ratio: 'Suma de todas las ventas del mes',
    descripcion: `¿Para qué sirve?
Sin saber cuánto vendiste, no puedes saber si tu empresa está creciendo o encogiendo. Es el punto de partida de cualquier decisión financiera.

¿Cómo lo calculas?
Suma todas las facturas o boletas que emitiste este mes. Por ejemplo: si emitiste 10 facturas por $2.000.000 cada una, tus ingresos son $20.000.000.

¿Dónde encuentras el dato?
En tu sistema de facturación electrónica del SII, en tu libro de ventas, o en el resumen que te da tu contador. Pídelo antes del día 10 del mes siguiente.`,
  },
  {
    nombre: 'Margen bruto', dim: 'Finanzas', unidad: 'porcentaje', meta: 40, estandar: true,
    ratio: '(Ventas − Costo de lo vendido) ÷ Ventas × 100',
    descripcion: `¿Para qué sirve?
Te dice cuánto te queda de cada peso que vendes, antes de pagar los sueldos de oficina, el arriendo y otros gastos fijos. Si este número es bajo, estás vendiendo barato o tus costos de producción son muy altos.

¿Cómo lo calculas?
Ejemplo: vendiste $10.000.000. Para producir o entregar eso gastaste $6.000.000 en materiales, insumos o personal directo. Tu margen bruto es ($10M - $6M) ÷ $10M × 100 = 40%.

¿Qué incluye el "costo de lo vendido"?
Solo lo que pagaste directamente para producir o entregar: materiales, insumos, subcontratos y sueldos del personal que hace el trabajo. No incluyas el arriendo, sueldos de administración ni tu propio retiro.

¿Dónde encuentras el dato?
Facturas de compra de insumos del mes + liquidaciones del personal de producción. Tu contador puede armarte este número.`,
  },
  {
    nombre: 'Días de cobranza (DSO)', dim: 'Finanzas', unidad: 'dias', meta: 30, estandar: true,
    ratio: '(Lo que te deben ÷ Ventas del mes) × 30',
    descripcion: `¿Para qué sirve?
Mide cuántos días pasan entre que emites una factura y tu cliente te paga. Si este número es alto, significa que tú estás pagando tus costos pero tu plata está "atrapada" en facturas sin cobrar. Eso es lo que seca la caja aunque la empresa sea rentable.

¿Cómo lo calculas?
Ejemplo: al cierre del mes tienes $15.000.000 en facturas sin cobrar. Tus ventas del mes fueron $30.000.000. DSO = ($15M ÷ $30M) × 30 = 15 días. Eso es excelente. Si el resultado fuera 60 días, significa que tus clientes te pagan 2 meses después.

¿Dónde encuentras el dato?
El saldo de cuentas por cobrar al cierre del mes te lo da tu contador o lo ves en tu libro de ventas pendientes de pago.`,
  },
  {
    nombre: 'Gastos fijos vs presupuesto', dim: 'Finanzas', unidad: 'porcentaje', meta: 100, estandar: true,
    ratio: '(Gastos fijos reales ÷ Gastos fijos planificados) × 100',
    descripcion: `¿Para qué sirve?
Te alerta cuando estás gastando más de lo que planificaste en costos que no puedes evitar aunque no vendas nada. Si este número supera el 100%, tu empresa está gastando más de lo que presupuestaste.

¿Cómo lo calculas?
Primero define tus gastos fijos mensuales: arriendo, sueldos administrativos, servicios básicos, seguros. Eso es tu presupuesto. Al cierre del mes, suma lo que realmente pagaste en esos mismos ítems y divide.
Ejemplo: presupuestaste $5.000.000 en fijos, pero gastaste $5.800.000. Resultado: 116%. Estás 16% sobre lo planificado.

¿Dónde encuentras el dato?
Comprobantes de pago del mes o el resumen que te entrega tu contador. Si no tienes presupuesto, usa el promedio de los últimos 3 meses como referencia.`,
  },
  {
    nombre: 'Entregas a tiempo', dim: 'Operaciones', unidad: 'porcentaje', meta: 95, estandar: true,
    ratio: '(Entregas en la fecha prometida ÷ Total de entregas) × 100',
    descripcion: `¿Para qué sirve?
Es el indicador más directo de confiabilidad. Un cliente al que le cumples siempre vuelve. Un cliente al que le fallas una vez empieza a buscar alternativas. Las empresas que mantienen este indicador sobre 95% tienen tasas de recompra significativamente más altas.

¿Cómo lo calculas?
Ejemplo: este mes hiciste 40 entregas o servicios. De esos, 37 fueron entregados en la fecha que le prometiste al cliente. Resultado: 37 ÷ 40 × 100 = 92.5%. Estás bajo la meta.

¿Dónde encuentras el dato?
Necesitas llevar un registro simple: cliente, fecha prometida, fecha real de entrega. Una planilla con esas 3 columnas es suficiente. Si no llevas registro hoy, empieza esta semana.`,
  },
  {
    nombre: 'Tiempo respuesta a clientes', dim: 'Operaciones', unidad: 'horas', meta: 4, estandar: true,
    ratio: 'Suma de horas de espera de todos los clientes ÷ Número de solicitudes',
    descripcion: `¿Para qué sirve?
El tiempo que un cliente espera tu respuesta define su primera impresión de tu servicio. Estudios de experiencia de cliente muestran que responder en menos de 4 horas aumenta la probabilidad de cierre en un 50% comparado con responder al día siguiente.

¿Cómo lo calculas?
Ejemplo: esta semana recibiste 5 solicitudes. Los tiempos de espera fueron 1h, 2h, 3h, 6h y 8h. Promedio: (1+2+3+6+8) ÷ 5 = 4 horas. Justo en la meta.

¿Dónde encuentras el dato?
Revisa tu WhatsApp Business o email. Anota la hora de entrada de cada solicitud y la hora en que respondiste. Con una semana de registro ya tienes un número representativo. Solo cuenta horas hábiles, no fines de semana.`,
  },
  {
    nombre: 'Órdenes sin error', dim: 'Operaciones', unidad: 'porcentaje', meta: 98, estandar: true,
    ratio: '(Órdenes sin reclamo ÷ Total de órdenes) × 100',
    descripcion: `¿Para qué sirve?
Cada error que cometes tiene un costo doble: el costo de corregirlo y el costo de la confianza perdida con el cliente. Una empresa que entrega bien a la primera gasta menos en retrabajos y retiene más clientes.

¿Cómo lo calculas?
Ejemplo: este mes atendiste 80 órdenes. 2 tuvieron reclamos o devoluciones. Resultado: (80-2) ÷ 80 × 100 = 97.5%. Levemente bajo la meta de 98%.

¿Qué cuenta como error?
Cualquier orden que el cliente devolvió, rechazó, o que tuviste que rehacer parcial o totalmente. No importa de quién fue la culpa.

¿Dónde encuentras el dato?
Tu registro de reclamos o libro de servicio. Si no llevas uno, los reclamos que recuerdas del mes son un punto de partida. A partir de ahora, anota cada reclamo apenas ocurra.`,
  },
  {
    nombre: 'Capacidad utilizada', dim: 'Operaciones', unidad: 'porcentaje', meta: 80, estandar: true,
    ratio: '(Lo que produjiste o entregaste ÷ Lo máximo que podrías) × 100',
    descripcion: `¿Para qué sirve?
Te dice si tienes recursos ociosos (capacidad desaprovechada) o si estás al límite (riesgo de errores y retrasos). El punto óptimo es entre 75% y 85%. Bajo 60% pagas por recursos que no usas. Sobre 90% el equipo se estresa y la calidad cae.

¿Cómo lo calculas?
Ejemplo: tienes 3 técnicos que pueden hacer 8 trabajos al día cada uno. En un mes de 22 días hábiles, tu capacidad máxima es 3 × 8 × 22 = 528 trabajos. Si hiciste 420, tu capacidad utilizada es 420 ÷ 528 × 100 = 79.5%. Perfecto.

¿Dónde encuentras el dato?
Define primero tu unidad de producción (trabajos, horas, pedidos, toneladas). Tu capacidad máxima la calculas tú. Lo que produjiste lo sacas de tu registro de órdenes o despachos del mes.`,
  },
  {
    nombre: 'Cumplimiento de compromisos', dim: 'Personas', unidad: 'porcentaje', meta: 90, estandar: true,
    ratio: '(Compromisos cerrados a tiempo ÷ Total de compromisos asumidos) × 100',
    descripcion: `¿Para qué sirve?
Es el termómetro más honesto de la cultura de tu equipo. Un equipo que cumple sus compromisos no necesita que el dueño esté encima de todo. Uno que no los cumple genera un ciclo donde tú tienes que supervisar cada detalle.

¿Cómo lo calculas?
Para calcularlo necesitas llevar registro de los acuerdos de tus reuniones: qué se comprometió, quién lo asumió y para cuándo. Al final del mes, cuenta cuántos se cerraron en plazo.
Ejemplo: en el mes se generaron 20 compromisos en reuniones. 17 se cerraron antes de la fecha acordada. Resultado: 17 ÷ 20 × 100 = 85%. Bajo la meta.

¿Dónde encuentras el dato?
Módulo de Reuniones de EOM OS, o una planilla simple con 3 columnas: qué, quién, cuándo. Sin ese registro, este KPI no se puede medir.`,
  },
  {
    nombre: 'Ausentismo', dim: 'Personas', unidad: 'porcentaje', meta: 3, estandar: true,
    ratio: '(Días de trabajo perdidos ÷ Días hábiles totales del equipo) × 100',
    descripcion: `¿Para qué sirve?
El ausentismo tiene un costo directo e invisible: pagas el sueldo completo pero recibes menos trabajo. Además, el resto del equipo carga con ese trabajo extra, lo que genera desgaste. Un ausentismo sobre 5% es una señal de alerta de clima laboral o problemas de salud del equipo.

¿Cómo lo calculas?
Ejemplo: tienes 10 personas. En el mes hubo 22 días hábiles. Total de días disponibles: 10 × 22 = 220 días. Durante el mes se perdieron 5 días por licencias y 2 por inasistencias. Total perdido: 7 días. Ausentismo: 7 ÷ 220 × 100 = 3.2%.

¿Dónde encuentras el dato?
Control de asistencia o libro de novedades. Si no llevas control de asistencia, el libro de licencias médicas de tu contador es un punto de partida.`,
  },
  {
    nombre: 'Rotación anual', dim: 'Personas', unidad: 'porcentaje', meta: 10, estandar: true,
    ratio: '(Personas que se fueron en 12 meses ÷ Promedio de personas en el equipo) × 100',
    descripcion: `¿Para qué sirve?
Reemplazar a una persona cuesta entre 6 y 18 meses de su sueldo si sumas reclutamiento, capacitación y el tiempo que le toma al reemplazante llegar al mismo rendimiento. Una rotación alta destruye conocimiento acumulado y desgasta al equipo que se queda.

¿Cómo lo calculas?
Ejemplo: en los últimos 12 meses salieron 4 personas (renuncias y despidos). Tu equipo promedio en ese período fue de 25 personas. Rotación: 4 ÷ 25 × 100 = 16%. Estás sobre la meta de 10%, lo que es una señal de alerta.

¿Qué no cuenta?
Fin de contratos temporales que sabías que terminaban, jubilaciones planificadas o reducción de dotación por decisión estratégica.

¿Dónde encuentras el dato?
Finiquitos de los últimos 12 meses. Tu contador o área de RRHH los tiene.`,
  },
  {
    nombre: 'Avance plan 90 días', dim: 'Liderazgo', unidad: 'porcentaje', meta: 100, estandar: true,
    ratio: '(Acciones completadas ÷ Total de acciones del plan) × 100',
    descripcion: `¿Para qué sirve?
La diferencia entre una empresa que planifica y una que ejecuta está en este número. Muchas empresas tienen buenos planes que nunca se materializan porque nadie lleva el control de avance. Este KPI te obliga a mirar la realidad de frente.

¿Cómo lo calculas?
Ve al módulo "Plan 90 días" de EOM y marca las acciones que ya completaste. EOM calcula el porcentaje automáticamente.

Si no usas el módulo de Plan, cuenta cuántas acciones definiste al inicio del ciclo y cuántas ya están terminadas.
Ejemplo: definiste 12 acciones. Llevas 7 completadas. Avance: 7 ÷ 12 × 100 = 58%.

¿Cada cuánto revisarlo?
Una vez a la semana, en tu reunión de equipo. El plan de 90 días no es un documento que se revisa al final — es una guía semanal.`,
  },
  {
    nombre: 'Decisiones delegadas', dim: 'Liderazgo', unidad: 'porcentaje', meta: 70, estandar: true,
    ratio: '(Decisiones que tomó tu equipo solo ÷ Total de decisiones operacionales) × 100',
    descripcion: `¿Para qué sirve?
Si tú tomas todas las decisiones, eres el cuello de botella de tu empresa. Cada vez que alguien te pregunta "¿qué hago con esto?", se detiene hasta que tú respondas. Este KPI mide qué tan lejos está tu empresa de funcionar sin depender de ti en cada paso.

¿Cómo lo calculas?
Durante una semana, lleva un registro simple de cada vez que alguien te consulta una decisión operacional. Al final, estima cuántas de esas decisiones podría haber tomado tu equipo con las herramientas y claridad correctas.
Ejemplo: te consultaron 20 veces. Estimas que 14 de esas consultas podrían haberlas resuelto solos con un proceso claro. Resultado: 14 ÷ 20 × 100 = 70%. En la meta.

¿Qué es una "decisión operacional"?
Cualquier decisión del día a día: cómo manejar un reclamo, qué proveedor usar, cómo organizar el trabajo. No incluye decisiones estratégicas como contratar personal clave o hacer inversiones grandes.`,
  },
  {
    nombre: 'Reuniones con acuerdos cerrados', dim: 'Liderazgo', unidad: 'porcentaje', meta: 100, estandar: true,
    ratio: '(Reuniones con acta de acuerdos ÷ Total de reuniones) × 100',
    descripcion: `¿Para qué sirve?
Una reunión sin acuerdos escritos es solo una conversación. Estudios de gestión muestran que el 70% de lo que se decide verbalmente en una reunión no se ejecuta. El acta no es burocracia — es la herramienta que convierte la conversación en acción.

¿Cómo lo calculas?
Cuenta cuántas reuniones del mes terminaron con un acta o registro que incluye: qué se decidió, quién es el responsable y para cuándo. Divídelo por el total de reuniones.
Ejemplo: tuviste 8 reuniones este mes. 6 terminaron con acta. Resultado: 6 ÷ 8 × 100 = 75%. Bajo la meta.

¿Qué debe tener un acta mínima?
Solo 3 columnas: QUÉ se acordó, QUIÉN es responsable, CUÁNDO debe estar listo. No necesita ser un documento formal — un WhatsApp con esa información cuenta.

¿Dónde encuentras el dato?
Módulo de Reuniones de EOM OS o tu propio registro de actas.`,
  },
]

const DIMS = ['Todos', 'Finanzas', 'Operaciones', 'Personas', 'Liderazgo']

function getColor(kpi: KPI) {
  if (kpi.meta === 0) return '#5A6888'
  const pct = (kpi.actual / kpi.meta) * 100
  // Para KPIs donde menos es mejor (DSO, ausentismo, rotación, gastos)
  const inverso = ['Días de cobranza (DSO)', 'Ausentismo', 'Rotación anual', 'Gastos fijos vs presupuesto'].includes(kpi.nombre)
  const score = inverso ? (kpi.meta / Math.max(kpi.actual, 0.01)) * 100 : pct
  if (score >= 90) return '#16A34A'
  if (score >= 70) return '#D97706'
  return '#EF4444'
}

function formatVal(kpi: KPI, val: number) {
  if (kpi.unidad === 'pesos') return `$ ${val.toLocaleString('es-CL')}`
  if (kpi.unidad === 'porcentaje') return `${val}%`
  if (kpi.unidad === 'dias') return `${val} días`
  if ((kpi.unidad as string) === 'horas') return `${val} hrs`
  return `${val}`
}

function getPct(kpi: KPI) {
  if (kpi.meta === 0) return 0
  const inverso = ['Días de cobranza (DSO)', 'Ausentismo', 'Rotación anual', 'Gastos fijos vs presupuesto'].includes(kpi.nombre)
  if (inverso) return Math.min(100, Math.round((kpi.meta / Math.max(kpi.actual, 0.01)) * 100))
  return Math.min(100, Math.round((kpi.actual / kpi.meta) * 100))
}

export default function KPIsPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)
  const [dimFiltro, setDimFiltro] = useState('Todos')
  const [showAgregar, setShowAgregar] = useState(false)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [editando, setEditando] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{id:string,x:number,y:number}|null>(null)

  // Form nuevo KPI
  const [formNombre, setFormNombre] = useState('')
  const [formDim, setFormDim] = useState('Operaciones')
  const [formUnidad, setFormUnidad] = useState<string>('porcentaje')
  const [formMeta, setFormMeta] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formRatio, setFormRatio] = useState('')

  useEffect(() => {
    async function load() {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const {data:emp} = await supabase.from('empresas_empresa').select('*').eq('user_id', user.id).single()
      if (!emp) { router.push('/onboarding'); return }
      setEmpresa(emp)

      const {data:kpisGuardados} = await supabase.from('kpis_empresa').select('*').eq('user_id', user.id).order('dim')
      if (kpisGuardados && kpisGuardados.length > 0) {
        setKpis(kpisGuardados as KPI[])
      } else {
        // Cargar estándar
        const iniciales: KPI[] = KPIS_ESTANDAR.map(k => ({...k, id: crypto.randomUUID(), actual: 0, ratio: k.ratio || ''}))
        await supabase.from('kpis_empresa').insert(iniciales.map(k => ({...k, user_id: user.id})))
        setKpis(iniciales)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function updateActual(id: string, val: string) {
    const num = parseFloat(val.replace(/\./g,'').replace(',','.')) || 0
    const nuevos = kpis.map(k => k.id === id ? {...k, actual: num} : k)
    setKpis(nuevos)
  }

  async function saveActual(id: string) {
    setSaving(true)
    const kpi = kpis.find(k => k.id === id)
    if (kpi) await supabase.from('kpis_empresa').update({actual: kpi.actual}).eq('id', id)
    setSaving(false)
    setEditando(null)
  }

  async function eliminarKPI(id: string) {
    await supabase.from('kpis_empresa').delete().eq('id', id)
    setKpis(prev => prev.filter(k => k.id !== id))
  }

  async function agregarDesdebiblioteca(kpiBase: Omit<KPI, 'id'|'actual'>) {
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) return
    const nuevo: KPI = {...kpiBase, id: crypto.randomUUID(), actual: 0}
    await supabase.from('kpis_empresa').insert({...nuevo, user_id: user.id})
    setKpis(prev => [...prev, nuevo])
    setShowBiblioteca(false)
  }

  async function crearKPI() {
    if (!formNombre) return
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const nuevo: KPI = {
      id: crypto.randomUUID(),
      nombre: formNombre,
      dim: formDim,
      unidad: formUnidad as any,
      meta: parseFloat(formMeta) || 0,
      actual: 0,
      ratio: formRatio,
      descripcion: formDesc,
      estandar: false,
    }
    await supabase.from('kpis_empresa').insert({...nuevo, user_id: user.id})
    setKpis(prev => [...prev, nuevo])
    setFormNombre(''); setFormDim('Operaciones'); setFormUnidad('porcentaje'); setFormMeta(''); setFormDesc(''); setFormRatio('')
    setShowAgregar(false)
    setSaving(false)
  }

  const kpisFiltrados = dimFiltro === 'Todos' ? kpis : kpis.filter(k => k.dim === dimFiltro)
  const bibliotecaDisponible = KPIS_ESTANDAR.filter(k => !kpis.find(existing => existing.nombre === k.nombre))

  const resumen = {
    verde: kpis.filter(k => k.actual > 0 && getColor(k) === '#16A34A').length,
    amarillo: kpis.filter(k => k.actual > 0 && getColor(k) === '#D97706').length,
    rojo: kpis.filter(k => k.actual > 0 && getColor(k) === '#EF4444').length,
    sinDato: kpis.filter(k => k.actual === 0).length,
  }

  if (loading) return <div style={{minHeight:'100vh',background:'#07090E',display:'flex',alignItems:'center',justifyContent:'center',color:'#5A6888',fontFamily:'DM Sans,sans-serif',fontSize:'13px'}}>Cargando KPIs...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#07090E;--bg2:#0C0F18;--bg3:#111520;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);--text:#E8EDF8;--text2:#5A6888;--text3:#8A9AB8;--amber:#D97706;--amber-light:#FCD34D;--amber-dim:rgba(217,119,6,0.12);--green:#16A34A;--green-light:#4ADE80;--red:#EF4444}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
        .sidebar{background:var(--bg2);border-right:1px solid var(--border);padding:24px 0;display:flex;flex-direction:column}
        .sidebar-logo{font-family:'Playfair Display',serif;font-size:16px;color:var(--text);padding:0 20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer}
        .mark{width:24px;height:24px;border-radius:5px;background:var(--amber);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:'DM Mono',monospace;flex-shrink:0}
        .nav-item{padding:10px 20px;font-size:13px;color:var(--text3);cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s}
        .nav-item:hover{color:var(--text);background:var(--bg3)}
        .nav-item.active{color:var(--amber);background:rgba(217,119,6,0.08)}
        .nav-section{padding:16px 20px 6px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text2)}
        .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border)}
        .btn-logout{background:none;border:none;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;padding:0}
        .main{padding:40px;overflow-y:auto}
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
        .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--text);margin-bottom:4px}
        .page-sub{font-size:14px;color:var(--text3)}
        .header-actions{display:flex;gap:10px;flex-wrap:wrap}
        .btn-primary{padding:9px 20px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-radius:0}
        .btn-primary:hover{background:#B45309}
        .btn-outline{padding:9px 20px;border:1px solid var(--border2);background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;border-radius:0}
        .btn-outline:hover{border-color:rgba(255,255,255,0.25);color:var(--text)}
        .semaforo-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-bottom:24px}
        .semaforo-cell{padding:16px 20px;background:var(--bg2);text-align:center}
        .semaforo-num{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;line-height:1}
        .semaforo-label{font-size:11px;color:var(--text2);margin-top:4px}
        .filtros{display:flex;gap:0;margin-bottom:24px;border:1px solid var(--border);width:fit-content}
        .filtro-btn{padding:8px 18px;border:none;background:transparent;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.15s;border-right:1px solid var(--border)}
        .filtro-btn:last-child{border-right:none}
        .filtro-btn:hover{color:var(--text);background:var(--bg2)}
        .filtro-btn.active{background:var(--amber-dim);color:var(--amber)}
        .kpis-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:var(--border);border:1px solid var(--border)}
        .kpi-card{background:var(--bg2);padding:24px;position:relative;transition:background 0.15s}
        .kpi-card:hover{background:var(--bg3)}
        .kpi-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
        .kpi-dim{font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;padding:3px 8px;border:1px solid;margin-bottom:8px;display:inline-block}
        .kpi-nombre{font-size:14px;font-weight:500;color:var(--text);line-height:1.4;margin-bottom:4px}
        .kpi-desc{font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:16px}
        .kpi-valores{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:10px}
        .kpi-actual{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;line-height:1}
        .kpi-meta-label{font-size:11px;color:var(--text2);text-align:right}
        .kpi-meta-val{font-family:'DM Mono',monospace;font-size:13px;color:var(--text3)}
        .kpi-bar-track{height:3px;background:var(--border);margin-bottom:12px}
        .kpi-bar-fill{height:100%;transition:width 0.5s ease}
        .kpi-actions{display:flex;gap:8px;align-items:center}
        .kpi-pct{font-family:'DM Mono',monospace;font-size:11px;margin-right:auto}
        .btn-mini{padding:4px 10px;border:1px solid var(--border);background:transparent;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;border-radius:0;transition:all 0.15s}
        .btn-mini:hover{border-color:var(--amber-border,rgba(217,119,6,0.3));color:var(--amber)}
        .btn-mini-red{border-color:rgba(239,68,68,0.2);color:rgba(239,68,68,0.5)}
        .btn-mini-red:hover{border-color:#EF4444;color:#EF4444;background:rgba(239,68,68,0.05)}
        .edit-inline{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
        .edit-row-inline{display:flex;gap:8px;align-items:center}
        .field-inline{flex:1;padding:7px 10px;border:1px solid var(--amber-dim,rgba(217,119,6,0.2));background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;border-radius:0}
        .field-inline:focus{border-color:var(--amber)}
        .field-label-small{font-size:11px;color:var(--text2);margin-bottom:4px}
        .btn-save-mini{padding:7px 14px;border:none;background:var(--amber);color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;border-radius:0;white-space:nowrap}
        .panel{position:fixed;top:0;right:0;bottom:0;width:420px;background:var(--bg2);border-left:1px solid var(--border);padding:32px;overflow-y:auto;z-index:100;animation:slideIn 0.2s ease}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .panel-title{font-family:'Playfair Display',serif;font-size:22px;color:var(--text);margin-bottom:24px;font-weight:400}
        .panel-close{position:absolute;top:24px;right:24px;background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer;line-height:1}
        .panel-close:hover{color:var(--text)}
        .field-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
        .field-label{font-size:12px;color:var(--text3);font-weight:500}
        .field{padding:10px 14px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;width:100%;border-radius:0}
        .field:focus{border-color:var(--amber)}
        .field::placeholder{color:var(--text2)}
        select.field{cursor:pointer}
        .biblioteca-item{padding:14px;border:1px solid var(--border);background:var(--bg3);margin-bottom:8px;cursor:pointer;transition:all 0.15s}
        .biblioteca-item:hover{border-color:var(--amber-dim);background:var(--bg)}
        .biblioteca-item-nombre{font-size:13px;font-weight:500;color:var(--text);margin-bottom:4px}
        .biblioteca-item-desc{font-size:11px;color:var(--text2)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99}
        .tooltip-wrap{position:relative;display:inline-flex;align-items:center;flex-shrink:0}
        .tooltip-icon{width:14px;height:14px;border-radius:50%;border:1px solid var(--border2);display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:var(--text2);cursor:help;flex-shrink:0;font-family:'DM Mono',monospace;margin-left:6px;transition:all 0.15s}
        .tooltip-icon:hover{border-color:var(--amber);color:var(--amber)}
        .tooltip-box{position:fixed;width:320px;background:#1A2035;border:1px solid var(--border2);padding:16px;font-size:12px;color:var(--text3);line-height:1.7;z-index:1000;pointer-events:none;opacity:0;transition:opacity 0.15s;border-top:2px solid var(--amber);white-space:pre-line;text-align:left;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
        .tooltip-wrap:hover .tooltip-box{opacity:1}

        .kpi-ratio{font-family:'DM Mono',monospace;font-size:10px;color:var(--text2);margin-bottom:12px;line-height:1.4;display:flex;align-items:flex-start;gap:4px}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.kpis-grid{grid-template-columns:1fr}.panel{width:100%}.semaforo-bar{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo" onClick={()=>router.push('/dashboard')}><div className="mark">E</div>EOM OS</div>
          <div className="nav-section">Ciclo actual</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard')}>Dashboard</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/diagnostico')}>Diagnóstico</div>
          <div className="nav-item" onClick={()=>router.push('/dashboard/plan')}>Plan 90 días</div>
          <div className="nav-item active">KPIs</div>
          <div className="nav-section">Gestión</div>
          <div className="nav-item">Áreas</div>
          <div className="nav-item">Reuniones</div>
          <div className="nav-item">Mejora Continua</div>
          <div className="sidebar-bottom">
            <button className="btn-logout" onClick={async()=>{await supabase.auth.signOut();router.push('/auth')}}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="main">
          <div className="page-header">
            <div>
              <div className="page-title">Cockpit de KPIs</div>
              <div className="page-sub">{empresa?.nombre} · {kpis.length} indicadores activos</div>
            </div>
            <div className="header-actions">
              <button className="btn-outline" onClick={()=>{setShowBiblioteca(true);setShowAgregar(false)}}>+ Desde biblioteca</button>
              <button className="btn-primary" onClick={()=>{setShowAgregar(true);setShowBiblioteca(false)}}>+ Crear KPI</button>
            </div>
          </div>

          {/* Semáforo resumen */}
          <div className="semaforo-bar">
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'#16A34A'}}>{resumen.verde}</div>
              <div className="semaforo-label">En meta</div>
            </div>
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'#D97706'}}>{resumen.amarillo}</div>
              <div className="semaforo-label">En riesgo</div>
            </div>
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'#EF4444'}}>{resumen.rojo}</div>
              <div className="semaforo-label">Fuera de meta</div>
            </div>
            <div className="semaforo-cell">
              <div className="semaforo-num" style={{color:'var(--text2)'}}>{resumen.sinDato}</div>
              <div className="semaforo-label">Sin dato</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="filtros">
            {DIMS.map(d => (
              <button key={d} className={`filtro-btn ${dimFiltro===d?'active':''}`} onClick={()=>setDimFiltro(d)}>{d}</button>
            ))}
          </div>

          {/* Grid de KPIs */}
          <div className="kpis-grid">
            {kpisFiltrados.map(kpi => {
              const color = getColor(kpi)
              const dimColor = DIM_COLORS[kpi.dim] || '#D97706'
              const pct = getPct(kpi)
              return (
                <div key={kpi.id} className="kpi-card">
                  <div className="kpi-dim" style={{color:dimColor, borderColor:dimColor+'44', background:dimColor+'11'}}>{kpi.dim}</div>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                    <div className="kpi-nombre">{kpi.nombre}</div>
                    <div
                      className="tooltip-icon"
                      onMouseEnter={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        const spaceBelow = window.innerHeight - rect.bottom
                        const y = spaceBelow > 300 ? rect.bottom + 8 : rect.top - 8
                        setTooltip({id:kpi.id, x: Math.min(rect.left, window.innerWidth - 336), y: spaceBelow > 300 ? y : rect.top - 8})
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >i</div>
                  </div>
                  {kpi.ratio && <div className="kpi-ratio">= {kpi.ratio}</div>}

                  <div className="kpi-valores">
                    <div>
                      <div style={{fontSize:'11px',color:'var(--text2)',marginBottom:'2px'}}>Actual</div>
                      <div className="kpi-actual" style={{color: kpi.actual > 0 ? color : 'var(--text2)'}}>
                        {kpi.actual > 0 ? formatVal(kpi, kpi.actual) : '—'}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="kpi-meta-label">Meta</div>
                      <div className="kpi-meta-val">{kpi.meta > 0 ? formatVal(kpi, kpi.meta) : '—'}</div>
                    </div>
                  </div>

                  <div className="kpi-bar-track">
                    <div className="kpi-bar-fill" style={{width:`${kpi.actual>0?pct:0}%`, background:color}} />
                  </div>

                  <div className="kpi-actions">
                    <span className="kpi-pct" style={{color: kpi.actual>0 ? color : 'var(--text2)'}}>
                      {kpi.actual > 0 ? `${pct}% de meta` : 'Sin dato aún'}
                    </span>
                    <button className="btn-mini" onClick={()=>setEditando(editando===kpi.id?null:kpi.id)}>
                      {editando===kpi.id ? 'Cerrar' : 'Actualizar'}
                    </button>
                    <button className="btn-mini btn-mini-red" onClick={()=>eliminarKPI(kpi.id)}>✕</button>
                  </div>

                  {editando === kpi.id && (
                    <div className="edit-inline">
                      <div className="field-label-small">Valor actual ({UNIDAD_LABELS[kpi.unidad] || kpi.unidad})</div>
                      <div className="edit-row-inline">
                        <input
                          className="field-inline"
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={kpi.actual || ''}
                          onChange={e => {
                            const num = parseFloat(e.target.value) || 0
                            setKpis(prev => prev.map(k => k.id === kpi.id ? {...k, actual: num} : k))
                          }}
                          onKeyDown={e => e.key === 'Enter' && saveActual(kpi.id)}
                          autoFocus
                        />
                        <button className="btn-save-mini" onClick={()=>saveActual(kpi.id)}>Guardar</button>
                      </div>
                      {kpi.meta === 0 && (
                        <>
                          <div className="field-label-small" style={{marginTop:'10px'}}>Meta</div>
                          <input
                            className="field-inline"
                            type="number"
                            placeholder="Ingresa la meta"
                            style={{width:'100%',marginTop:'4px'}}
                            onBlur={async e => {
                              const meta = parseFloat(e.target.value) || 0
                              setKpis(prev => prev.map(k => k.id === kpi.id ? {...k, meta} : k))
                              await supabase.from('kpis_empresa').update({meta}).eq('id', kpi.id)
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Panel crear KPI */}
      {showAgregar && (
        <>
          <div className="overlay" onClick={()=>setShowAgregar(false)} />
          <div className="panel">
            <button className="panel-close" onClick={()=>setShowAgregar(false)}>×</button>
            <div className="panel-title">Crear KPI propio</div>
            <div className="field-group">
              <label className="field-label">Nombre del indicador *</label>
              <input className="field" placeholder="Ej: Tiempo de instalación de equipos" value={formNombre} onChange={e=>setFormNombre(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Dimensión *</label>
              <select className="field" value={formDim} onChange={e=>setFormDim(e.target.value)}>
                {['Finanzas','Operaciones','Personas','Liderazgo'].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Unidad de medida *</label>
              <select className="field" value={formUnidad} onChange={e=>setFormUnidad(e.target.value)}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="pesos">Pesos ($)</option>
                <option value="dias">Días</option>
                <option value="horas">Horas</option>
                <option value="numero">Número</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Meta</label>
              <input className="field" type="number" placeholder="Ej: 95" value={formMeta} onChange={e=>setFormMeta(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Fórmula / Ratio (opcional)</label>
              <input className="field" placeholder="Ej: (A / B) × 100" value={formRatio} onChange={e=>setFormRatio(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Descripción (opcional)</label>
              <input className="field" placeholder="Cómo se calcula y de dónde sacar el dato" value={formDesc} onChange={e=>setFormDesc(e.target.value)} />
            </div>
            <button className="btn-primary" style={{width:'100%',padding:'12px'}} onClick={crearKPI} disabled={!formNombre||saving}>
              {saving ? 'Guardando...' : 'Agregar KPI →'}
            </button>
          </div>
        </>
      )}

      {/* Tooltip global */}
      {tooltip && (
        <div style={{
          position:'fixed',
          left: tooltip.x,
          top: tooltip.y < window.innerHeight/2 ? tooltip.y : 'auto',
          bottom: tooltip.y >= window.innerHeight/2 ? window.innerHeight - tooltip.y + 8 : 'auto',
          width:'320px',
          background:'#1A2035',
          border:'1px solid rgba(255,255,255,0.12)',
          borderTop:'2px solid #D97706',
          padding:'16px',
          fontSize:'12px',
          color:'#8A9AB8',
          lineHeight:1.7,
          zIndex:1000,
          whiteSpace:'pre-line',
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          pointerEvents:'none',
        }}>
          {kpis.find(k=>k.id===tooltip.id)?.descripcion}
        </div>
      )}

      {/* Panel biblioteca */}
      {showBiblioteca && (
        <>
          <div className="overlay" onClick={()=>setShowBiblioteca(false)} />
          <div className="panel">
            <button className="panel-close" onClick={()=>setShowBiblioteca(false)}>×</button>
            <div className="panel-title">Biblioteca de KPIs</div>
            <p style={{fontSize:'13px',color:'var(--text3)',marginBottom:'20px',lineHeight:1.6}}>
              KPIs estándar disponibles para agregar. Los que ya tienes activos no aparecen.
            </p>
            {bibliotecaDisponible.length === 0 ? (
              <p style={{fontSize:'13px',color:'var(--text2)'}}>Ya tienes todos los KPIs estándar activos.</p>
            ) : (
              bibliotecaDisponible.map((k,i) => (
                <div key={i} className="biblioteca-item" onClick={()=>agregarDesdebiblioteca(k)}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:DIM_COLORS[k.dim],textTransform:'uppercase',letterSpacing:'0.08em'}}>{k.dim}</span>
                  </div>
                  <div className="biblioteca-item-nombre">{k.nombre}</div>
                  <div className="biblioteca-item-desc">{k.descripcion}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  )
}
