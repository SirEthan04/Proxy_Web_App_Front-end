function cell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  // Spreadsheet applications should treat external text as text, not formulas.
  if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

export function buildCsv(columns, rows) {
  const lines = [columns.map(column => cell(column.header)).join(',')]
  for (const row of rows) lines.push(columns.map(column => cell(column.value(row))).join(','))
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

export function downloadCsv(filename, columns, rows) {
  const url = URL.createObjectURL(new Blob([buildCsv(columns, rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
