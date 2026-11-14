export { alertTypeLabels as alertTypes, alertStatusLabels as alertStatuses } from '../../shared/presentation/utils/presentation.js'
export function adaptAlert(value) {
  if (!value || typeof value.id !== 'string' || typeof value.productId !== 'string' || typeof value.message !== 'string' || typeof value.alertType !== 'string' || typeof value.status !== 'string' || typeof value.createdAt !== 'string') throw new Error('Contrato de alerta inválido')
  return { id: value.id, productId: value.productId, lotId: value.lotId, attendedByUserId: value.attendedByUserId, alertType: value.alertType, status: value.status, message: value.message, createdAt: value.createdAt, attendedAt: value.attendedAt }
}
export function adaptAlerts(value) {
  if (!Array.isArray(value)) throw new Error('Contrato de alertas inválido')
  return value.map(adaptAlert)
}
