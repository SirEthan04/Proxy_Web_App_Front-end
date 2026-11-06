import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from './operations.js'
import { previewOperation } from '../domain/stock-change.js'
import { getProductStatus } from '../../inventory/domain/product.js'
// Operations owns stock movement execution; Commercial only supplies its source/journal.
export async function registerCommercialMovement({ kind, document, line, checkpoint, verifyCatalog }) {
  const products = useProductsStore()
  await products.loadProducts()
  const product = products.products.find(item => String(item.id) === String(line.productId))
  if (!product) throw Object.assign(new Error('Product missing'), { messageKey: 'productNotFound' })
  if (Number(product.stock) !== line.stockBefore || !verifyCatalog(product)) throw Object.assign(new Error('Catalog changed during processing'), { messageKey: 'commercialChanged' })
  const type = kind === 'purchase' ? 'Entrada' : 'Salida'
  const preview = previewOperation(product.stock, line.quantity, type)
  if (!preview.valid) throw Object.assign(new Error(preview.errorKey), { messageKey: preview.errorKey })
  line.stockAfter = preview.stockAfter
  line.phase = 'stock_attempted'
  await checkpoint()
  await products.updateProduct(product.id, { ...product, stock: preview.stockAfter, status: getProductStatus(preview.stockAfter) }, { kind, id: document.id })
  line.phase = 'stock_applied'
  await checkpoint()
  line.phase = 'movement_attempted'
  await checkpoint()
  const movement = await useOperationsStore().addOperation({ productId: product.id, productName: line.productName, quantity: line.quantity, type, sourceType: kind, sourceId: document.id, sourceLineId: line.id, registeredBy: document.registeredBy, date: new Date().toISOString() })
  if (movement.id === undefined || movement.id === null || movement.sourceId !== document.id || movement.sourceLineId !== line.id) throw Object.assign(new Error('Unverified movement'), { messageKey: 'commercialVerifyFailed' })
  line.movementId = movement.id
  line.phase = 'recorded'
  await checkpoint()
}
