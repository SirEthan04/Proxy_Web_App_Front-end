import { OPERATION_TYPES } from './operation.js'
import { WASTE_REASONS } from './waste.js'

function invalid(errorKey, stock) {
  return { valid: false, errorKey, stockBefore: stock, stockAfter: null, quantity: null }
}

function validateQuantity(stock, quantity) {
  if (stock === null || stock === undefined || stock === '' || !Number.isFinite(Number(stock)) || Number(stock) < 0) return 'invalidProductStock'
  if (quantity === '' || quantity === null || quantity === undefined || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return 'positiveQuantity'
  return null
}

export function previewOperation(stock, quantity, type) {
  const error = validateQuantity(stock, quantity)
  if (error) return invalid(error, stock)
  if (!Object.values(OPERATION_TYPES).includes(type)) return invalid('requiredFields', stock)
  const before = Number(stock)
  const amount = Number(quantity)
  if (type === OPERATION_TYPES.EXIT && amount > before) return invalid('insufficientStock', before)
  const after = before + (type === OPERATION_TYPES.ENTRY ? amount : -amount)
  if (!Number.isFinite(after)) return invalid('invalidProductStock', before)
  return { valid: true, errorKey: null, stockBefore: before, stockAfter: after, quantity: amount }
}

export function previewWaste(stock, quantity, reason) {
  const error = validateQuantity(stock, quantity)
  if (error) return invalid(error, stock)
  if (!WASTE_REASONS.includes(reason)) return invalid('requiredFields', stock)
  const before = Number(stock)
  const amount = Number(quantity)
  if (amount > before) return invalid('wasteExceedsStock', before)
  return { valid: true, errorKey: null, stockBefore: before, stockAfter: before - amount, quantity: amount }
}
