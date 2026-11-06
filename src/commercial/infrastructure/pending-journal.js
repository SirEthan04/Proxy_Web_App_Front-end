import { validDocument } from '../domain/commercial-status.js'
const key = 'bodego-commercial-pending-v1'
const failure = () => Object.assign(new Error('Pending journal unavailable'), { messageKey: 'commercialJournalFailed' })
export function readPending() {
  // Pure snapshot read. Diagnostic screens must use this directly, without cleanup.
  try {
    const entries = JSON.parse(localStorage.getItem(key) || '[]')
    if (!Array.isArray(entries) || entries.some(item => !['purchase', 'sale'].includes(item.kind) || !validDocument(item.document))) throw failure()
    return entries
  } catch { throw failure() }
}
export function savePending(kind, document) {
  try {
    const entries = readPending().filter(item => item.kind !== kind || item.document.id !== document.id)
    entries.push({ kind, document: JSON.parse(JSON.stringify(document)) })
    localStorage.setItem(key, JSON.stringify(entries))
  } catch { throw failure() }
}
export function removePending(kind, id) {
  try { localStorage.setItem(key, JSON.stringify(readPending().filter(item => item.kind !== kind || item.document.id !== id))) } catch { throw failure() }
}
