/**
 * currency.ts — Formato monetario centralizado para FinFlow
 *
 * Estándar República Dominicana:
 *   DOP → RD$ 25,430.75
 *   USD → US$ 1,200.50
 *
 * Regla: SIEMPRE mostrar símbolo propio. Nunca ambigüedad.
 */

/** Símbolo visible por moneda. Extiende esta tabla para nuevas monedas. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  DOP: 'RD$',
  USD: 'US$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  MXN: 'MX$',
}

/** Locale que formatea con puntos de miles y coma decimal (estilo RD) */
const LOCALE = 'es-DO'

/**
 * Formato completo con decimales.
 * Ejemplos:
 *   fmt(25430.75, 'DOP') → "RD$ 25,430.75"
 *   fmt(1200.5,  'USD') → "US$ 1,200.50"
 *   fmt(1200,    'USD') → "US$ 1,200.00"
 */
export function fmt(amount: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  try {
    const formatted = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))
    const sign = amount < 0 ? '-' : ''
    return `${sign}${symbol} ${formatted}`
  } catch {
    return `${symbol} ${Math.abs(amount).toFixed(2)}`
  }
}

/**
 * Formato sin decimales — para montos grandes donde los centavos no aportan.
 * Ejemplos:
 *   fmtRound(25430.75, 'DOP') → "RD$ 25,431"
 *   fmtRound(1200,     'USD') → "US$ 1,200"
 */
export function fmtRound(amount: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  try {
    const formatted = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(Math.round(amount)))
    const sign = amount < 0 ? '-' : ''
    return `${sign}${symbol} ${formatted}`
  } catch {
    return `${symbol} ${Math.round(Math.abs(amount)).toLocaleString(LOCALE)}`
  }
}

/**
 * Formato abreviado — para ejes de gráficos donde el espacio es limitado.
 * Ejemplos:
 *   fmtShort(25430, 'DOP') → "RD$ 25.4k"
 *   fmtShort(1200,  'USD') → "US$ 1.2k"
 *   fmtShort(980,   'USD') → "US$ 980"
 *   fmtShort(-5000, 'DOP') → "-RD$ 5k"
 */
export function fmtShort(amount: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000) {
    return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${symbol} ${(abs / 1_000).toFixed(1)}k`
  }
  return `${sign}${symbol} ${Math.round(abs)}`
}

/**
 * Solo el símbolo de una moneda.
 * Útil para labels cortos donde el número ya está formateado.
 */
export function currencySymbol(currency = 'USD'): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

/**
 * Detecta si dos transacciones usan monedas distintas.
 * Útil para decidir si mostrar el código de moneda explícitamente.
 */
export function hasMultipleCurrencies(currencies: string[]): boolean {
  return new Set(currencies).size > 1
}
