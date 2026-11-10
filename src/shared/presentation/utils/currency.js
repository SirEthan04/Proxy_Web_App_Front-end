export const formatSoles = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value))
  ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value)) : '\u2014'
