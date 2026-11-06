import { locale } from '../../../i18n.js'
export const formatDate = value => {
  if (!value || !Number.isFinite(Date.parse(value))) return value || '\u2014'
  return new Intl.DateTimeFormat(locale.value === 'es' ? 'es-PE' : 'en-US', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
export const businessDate = value => {
  if (!value || !Number.isFinite(Date.parse(value))) return ''
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = type => parts.find(item => item.type === type).value
  return part('year') + '-' + part('month') + '-' + part('day')
}
