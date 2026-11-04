import { getOperations } from '../infrastructure/operation-api.js'
import { getWastes } from '../infrastructure/waste-api.js'

// Application query exposed to Inventory; HTTP contracts remain in Operations.
export async function hasProductHistory(productId) {
  try {
    const [operations, wastes] = await Promise.all([getOperations(), getWastes()])
    if (!Array.isArray(operations.data) || !Array.isArray(wastes.data)) throw new Error('Invalid history response')
    return [...operations.data, ...wastes.data].some(record => String(record.productId) === String(productId))
  } catch (cause) {
    throw Object.assign(new Error('Unable to verify product history', { cause }), { messageKey: 'productHistoryCheckFailed' })
  }
}
