import { locale } from '../../i18n.js'
export { formatDate, businessDate } from '../../shared/presentation/utils/date-format.js'
export function formatMoney(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) return '\u2014'
  const whole = BigInt(minor) / 100n
  const fraction = String(BigInt(minor) % 100n).padStart(2, '0')
  return new Intl.NumberFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { style: 'currency', currency: 'PEN' }).formatToParts(whole).map(part => part.type === 'fraction' ? fraction : part.value).join('')
}

// A compact display reference, never an invoice or a sequential document number.
export const commercialReference = (kind, id) => (locale.value === 'es' ? kind === 'purchase' ? 'C' : 'V' : kind === 'purchase' ? 'P' : 'S') + '-' + String(id).replaceAll('-', '').slice(-8).toUpperCase()
