export const PRODUCT_CATEGORIES = Object.freeze(['Bebidas', 'Lácteos', 'Abarrotes', 'Conservas', 'Galletas y snacks', 'Dulces', 'Panadería', 'Desayuno', 'Limpieza', 'Higiene personal', 'Mascotas', 'Hogar'])

export function getProductValidationError(product, { includeStock = true } = {}) {
  if (typeof product.name !== 'string' || !product.name.trim() ||
      typeof product.category !== 'string' || !product.category.trim() ||
      product.price === '' || product.price === null || product.price === undefined ||
      !product.expirationDate ||
      (includeStock && (product.stock === '' || product.stock === null || product.stock === undefined))) return 'requiredFields'
  if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) return 'invalidProductPrice'
  if (includeStock && (!Number.isFinite(Number(product.stock)) || Number(product.stock) < 0)) return 'invalidProductStock'
  const date = String(product.expirationDate)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'invalidProductDate'
  const parsed = new Date(date + 'T00:00:00Z')
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return 'invalidProductDate'
  return null
}
