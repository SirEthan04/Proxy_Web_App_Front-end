import { createPurchase } from './purchase.js'
export const createSale = (lines, products, registeredBy) => createPurchase(lines, products, registeredBy, 'sale')
