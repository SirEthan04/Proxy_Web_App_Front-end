export { formatDate, businessDate, formatMinorSoles as formatMoney } from '../../shared/presentation/utils/presentation.js'
import { recordReference } from '../../shared/presentation/utils/presentation.js'
export const commercialReference = (kind, id) => recordReference(kind, id)
