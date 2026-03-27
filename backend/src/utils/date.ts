export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1)
}

export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999)
}

export function monthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Devuelve los límites UTC (inicio y fin) de un día específico,
 * usando UTC puro para ser agnóstico al timezone del servidor.
 *
 * Toda la app almacena fechas como UTC. Al agrupar y filtrar
 * siempre usamos UTC para garantizar consistencia entre el
 * gráfico y la lista de transacciones.
 *
 * @param year  - año   (ej: 2026)
 * @param month - mes   (1-12)
 * @param day   - día   (1-31)
 */
export function utcDayBoundaries(year: number, month: number, day: number): {
  from: Date
  to: Date
  fromIso: string
  toIso: string
} {
  const from = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const to   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  return { from, to, fromIso: from.toISOString(), toIso: to.toISOString() }
}

/**
 * Devuelve los límites UTC del mes completo.
 */
export function utcMonthBoundaries(year: number, month: number): {
  from: Date
  to: Date
} {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const to   = new Date(Date.UTC(year, month,     0, 23, 59, 59, 999)) // día 0 del mes siguiente = último día del mes
  return { from, to }
}
