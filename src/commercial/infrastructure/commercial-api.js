import { operationsApi } from '../../shared/infrastructure/http-client.js'
import { commercialDocument, commercialDocuments } from './commercial.assembler.js'
const endpoint = kind => {
  if (!['purchase', 'sale'].includes(kind)) throw new Error('Invalid commercial kind')
  return kind === 'purchase' ? '/purchases' : '/sales'
}
export async function getDocuments(kind) { return commercialDocuments((await operationsApi.get(endpoint(kind))).data) }
export async function createDocument(kind, document) { return commercialDocument((await operationsApi.post(endpoint(kind), document)).data) }
export async function updateDocument(kind, document) { return commercialDocument((await operationsApi.put(endpoint(kind) + '/' + encodeURIComponent(document.id), document)).data) }
