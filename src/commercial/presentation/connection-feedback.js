// Translate read failures for the UI without changing application error policy.
export function connectionFeedback(error) {
  let cause = error
  for (let depth = 0; cause && depth < 6; depth++, cause = cause.cause) {
    if (cause.messageKey === 'commercialJournalFailed') return 'commercialJournalFailed'
    if (cause.response?.status === 404) return 'posServiceMissing'
    if (cause.response?.status >= 500) return 'posServiceUnavailable'
    if (['ERR_NETWORK', 'ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT'].includes(cause.code)) return 'posServiceOffline'
  }
  return error?.messageKey || 'commercialVerifyFailed'
}
