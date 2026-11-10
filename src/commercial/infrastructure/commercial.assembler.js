import { validDocument } from '../domain/commercial-status.js'
export function commercialDocument(resource) {
  if (!validDocument(resource)) throw Object.assign(new Error('Invalid commercial response'), { messageKey: 'commercialVerifyFailed' })
  return resource
}
export function commercialDocuments(resources) {
  if (!Array.isArray(resources)) throw Object.assign(new Error('Invalid commercial collection'), { messageKey: 'commercialVerifyFailed' })
  return resources.map(commercialDocument)
}
