import { toMinor } from '../domain/money.js'
import { createPurchase } from '../domain/purchase.js'
import { createSale } from '../domain/sale.js'
import { validateCart, catalogChanged } from '../domain/commercial-validation.js'
import { createDocument, updateDocument } from '../infrastructure/commercial-api.js'
import { savePending, removePending } from '../infrastructure/pending-journal.js'
import { assertCommercialAvailable } from './product-history.js'
import { registerCommercialMovement } from '../../operations/application/inventory-movement.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { sameDocument } from '../domain/commercial-status.js'
const fail = key => { throw Object.assign(new Error(key), { messageKey: key }) }
export async function registerTransaction(kind, lines, user, onDocument) {
  const products = useProductsStore()
  try {
    await products.loadProducts()
    // Request review before any write, even when the new stock is now insufficient.
    if (catalogChanged(kind, lines, products.products)) fail('commercialChanged')
    const validationError = validateCart(kind, lines, products.products)
    if (validationError) fail(validationError)
    for (const line of lines) await assertCommercialAvailable(line.productId)
  } catch (cause) {
    if (cause.messageKey && cause.messageKey !== 'commercialVerifyFailed') throw cause
    throw Object.assign(new Error('Preflight read failed', { cause }), { messageKey: 'commercialBeforeWriteFailed' })
  }
  const document = kind === 'purchase' ? createPurchase(lines, products.products, user) : createSale(lines, products.products, user)
  let headerConfirmed = false
  const checkpoint = async () => {
    savePending(kind, document)
    const saved = await updateDocument(kind, document)
    if (!sameDocument(saved, document)) fail('commercialVerifyFailed')
    onDocument(saved)
  }
  // Durable browser marker precedes the first POST, including lost header responses.
  savePending(kind, document)
  onDocument(document)
  try {
    const saved = await createDocument(kind, document)
    if (!sameDocument(saved, document)) fail('commercialVerifyFailed')
    headerConfirmed = true
    onDocument(saved)
    for (const line of document.lines) await registerCommercialMovement({ kind, document, line, checkpoint, verifyCatalog: product => kind !== 'sale' || toMinor(product.price) === line.unitAmountMinor })
    document.status = 'completed'
    document.completedAt = new Date().toISOString()
    await checkpoint()
  } catch (cause) {
    // No stock compensation, movement retry or processing resume is performed.
    const safelyFailed = headerConfirmed && document.lines.every(line => line.phase === 'planned') && cause.messageKey === 'commercialChanged'
    document.status = safelyFailed ? 'failed' : 'review'
    document.completedAt = null
    document.errorKey = cause.messageKey || 'commercialWriteUncertain'
    let stateSaved = false
    try { savePending(kind, document) } catch { /* Existing durable marker remains conservative. */ }
    if (headerConfirmed) {
      try { await checkpoint(); stateSaved = true } catch { /* Remote may still say processing. */ }
    }
    if (safelyFailed && stateSaved) removePending(kind, document.id)
    onDocument(document)
    throw Object.assign(new Error('Commercial registration requires attention', { cause }), { messageKey: safelyFailed && stateSaved ? 'commercialChanged' : 'commercialWriteUncertain', documentId: document.id, stateSaved })
  }
  // The server already confirmed completion. A browser cleanup failure must not
  // rewrite that persisted result as review, nor encourage repeating the sale.
  try { removePending(kind, document.id) } catch { /* Keep the completed marker. */ }
  return document
}
