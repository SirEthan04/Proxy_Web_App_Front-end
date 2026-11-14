<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import RequestState from '../../../shared/presentation/components/RequestState.vue'
import ProductPicker from '../../../inventory/presentation/components/ProductPicker.vue'
import { useProductsStore } from '../../../inventory/application/inventory.js'
import { loadRealLots, useRealOperationsStore } from '../../application/real-operations.js'
import { useAuthStore } from '../../../iam/application/auth.js'
import { PERMISSIONS } from '../../../iam/domain/permissions.js'
import { operationsError } from '../../infrastructure/real-operations-api.js'
import { prepareWaste, prepareCount, WRITE_BLOCKED } from '../../domain/real-operations.js'
import { countDifference, formatQuantity, lotLabel, productLabel, recordReference } from '../../../shared/presentation/utils/presentation.js'
import RecordDetails from '../../../shared/presentation/components/RecordDetails.vue'
const props = defineProps({ kind: { type: String, required: true } })
const emit = defineEmits(['registered'])
const inventory = useProductsStore()
const auth = useAuthStore(), operations = useRealOperationsStore()
onBeforeRouteLeave(() => !operations.submitting)
const canWrite = computed(() => auth.can(props.kind === 'waste' ? PERMISSIONS.WASTE_WRITE : PERMISSIONS.OPERATIONS_WRITE))
const productId = ref(''), lotId = ref(''), quantity = ref(''), reason = ref(''), notes = ref('')
const items = ref([]), lotsByProduct = ref({}), lotsLoading = ref(false), lotsError = ref(null), feedback = ref(''), validationError = ref('')
const lots = computed(() => lotsByProduct.value[productId.value] || [])
const product = computed(() => inventory.products.find(p => p.id === productId.value))
const available = computed(() => lotId.value ? lots.value.find(l => l.id === lotId.value)?.quantityAvailable : product.value?.stock)
const difference = computed(() => countDifference(quantity.value, available.value))
const savedId = ref(null), showSaved = ref(false)
function expected(item) {
  return item.lotId ? lotsByProduct.value[item.productId]?.find(l => l.id === item.lotId)?.quantityAvailable : inventory.products.find(p => p.id === item.productId)?.stock
}
const disabled = computed(() => operations.submitting || inventory.loading || !!inventory.loadError || lotsLoading.value || !!lotsError.value)
let lotRequest = 0
async function loadLots(id) {
  const request = ++lotRequest
  lotId.value = ''; lotsError.value = null; lotsLoading.value = !!id
  if (!id) return
  delete lotsByProduct.value[id]
  try { const result = await loadRealLots(id); if (request === lotRequest) lotsByProduct.value[id] = result }
  catch (e) { if (request === lotRequest) lotsError.value = operationsError(e) }
  finally { if (request === lotRequest) lotsLoading.value = false }
}
const reload = async () => {
  feedback.value = ''; validationError.value = ''; lotsByProduct.value = {}; ++lotRequest
  try { await inventory.loadProducts(); await loadLots(productId.value) }
  catch { lotsLoading.value = false }
}
watch(productId, id => { feedback.value = ''; validationError.value = ''; loadLots(id) })
watch([lotId, quantity, reason, notes, items], () => { feedback.value = ''; validationError.value = '' }, { deep: true })
onMounted(reload)
function validate() {
  feedback.value = ''; validationError.value = ''
  if (disabled.value) return
  try {
    if (props.kind === 'waste') prepareWaste({ productId: productId.value, lotId: lotId.value, quantity: quantity.value, reason: reason.value }, inventory.products, lots.value)
    else prepareCount({ notes: notes.value, items: items.value }, inventory.products, Object.values(lotsByProduct.value).flat())
    feedback.value = 'Los datos son válidos. Pulsa Registrar para guardar la operación.'
  } catch (e) { validationError.value = e.message }
}
function addItem() {
  validationError.value = ''; feedback.value = ''
  try {
    const proposed = [...items.value, { productId: productId.value, lotId: lotId.value || null, countedQuantity: quantity.value }]
    const result = prepareCount({ notes: notes.value, items: proposed }, inventory.products, Object.values(lotsByProduct.value).flat())
    items.value = result.items; quantity.value = ''
  } catch (e) { validationError.value = e.message }
}
async function submit() {
  if (disabled.value || !canWrite.value || operations.needsReview) return
  if (!globalThis.confirm(props.kind === 'waste' ? '¿Registrar esta merma? Se descontará del stock disponible.' : '¿Registrar el conteo físico? El stock permanecerá sin cambios.')) return
  feedback.value = ''; validationError.value = ''
  try {
    const result = props.kind === 'waste'
      ? await operations.registerWaste({ productId: productId.value, lotId: lotId.value || null, quantity: quantity.value, reason: reason.value })
      : await operations.registerCount({ notes: notes.value, items: items.value.map(i => ({ ...i })) })
    quantity.value = ''; reason.value = ''; items.value = []; notes.value = ''
    await loadLots(productId.value)
    // Defer feedback until the draft watchers have cleared the old validation message.
    await Promise.resolve()
    savedId.value = result.id
    feedback.value = recordReference(props.kind === 'waste' ? 'Waste' : 'count', result.id) + (props.kind === 'waste' ? ' registrada correctamente. ' : ' registrado correctamente. ') + (operations.warning || (lotsError.value ? 'No se pudieron actualizar los lotes; vuelve a consultar antes de continuar.' : props.kind === 'waste' ? 'Las existencias están actualizadas.' : 'El stock permanece sin cambios.'))
    emit('registered', result)
  } catch (e) { validationError.value = e.message }
}
</script>
<template>
  <section class="panel">
    <div class="section-heading"><h2>{{ kind === 'waste' ? 'Registrar merma' : 'Registrar conteo físico' }}</h2><Button text :disabled="disabled" @click="reload">Actualizar existencias</Button></div>
    <p v-if="kind === 'count'" class="muted-copy">Anota la cantidad que encontraste. La diferencia se registra para revisión y no cambia las existencias.</p>
    <p v-else class="muted-copy">Indica el producto, la cantidad perdida y el motivo. La merma descontará las existencias disponibles.</p>
    <p v-if="!canWrite" class="report-notice" role="status">{{ WRITE_BLOCKED }}</p>
    <p v-if="operations.needsReview" class="review-warning" role="alert">No pudimos confirmar el resultado anterior. Revisa el historial antes de repetir el registro.</p>
    <RequestState :loading="inventory.loading" :error="inventory.loadError" @retry="reload" />
    <form class="form-grid form" @submit.prevent="validate" novalidate>
      <div class="field span-2"><label :for="kind + '-product'">Producto</label><ProductPicker :input-id="kind + '-product'" v-model="productId" :products="inventory.products" :disabled="disabled" /></div>
      <div class="field"><label :for="kind + '-lot'">Lote</label><select :id="kind + '-lot'" v-model="lotId" :disabled="disabled || !productId"><option value="">{{ kind === 'waste' ? 'Selección automática de lotes' : 'Todo el producto' }}</option><option v-for="lot in lots" :key="lot.id" :value="lot.id">{{ lotLabel(lot.id, lot.lotCode) }} · {{ formatQuantity(lot.quantityAvailable) }}</option></select></div>
      <div class="field"><label :for="kind + '-quantity'">{{ kind === 'waste' ? 'Cantidad perdida (unidades)' : 'Cantidad contada (unidades)' }}</label><InputText :id="kind + '-quantity'" v-model="quantity" type="number" step="1" :min="kind === 'waste' ? 1 : 0" max="2147483647" :disabled="disabled" /></div>
      <RequestState :loading="lotsLoading" :error="lotsError" @retry="loadLots(productId)" />
      <div v-if="product && !disabled" class="count-preview span-2" aria-live="polite">
        <div><span>Stock actual del sistema</span><strong>{{ formatQuantity(available) }}</strong></div>
        <div v-if="kind === 'count'"><span>Diferencia estimada</span><strong :class="difference < 0 ? 'quantity-negative' : difference > 0 ? 'quantity-positive' : ''">{{ difference === null ? 'Introduce la cantidad contada' : formatQuantity(difference, true) }}</strong></div>
      </div>
      <div v-if="kind === 'waste'" class="field span-2"><label for="waste-reason">Motivo de la pérdida</label><InputText id="waste-reason" v-model="reason" maxlength="255" :disabled="disabled" placeholder="Por ejemplo: producto dañado" /><small>Hasta 255 caracteres.</small></div>
      <template v-else>
        <div class="field span-2"><label for="count-notes">Observaciones (opcional)</label><InputText id="count-notes" v-model="notes" maxlength="500" :disabled="disabled" /><small>Hasta 500 caracteres.</small></div>
        <Button type="button" :disabled="disabled || !productId" @click="addItem">Añadir producto al conteo</Button>
        <div v-if="items.length" class="table-scroll span-2" role="region" aria-label="Productos del conteo" tabindex="0"><table class="readable-table"><thead><tr><th>Producto</th><th>Lote</th><th>Stock actual</th><th>Cantidad contada</th><th>Diferencia estimada</th><th>Acción</th></tr></thead><tbody><tr v-for="(item, index) in items" :key="item.productId + ':' + item.lotId"><td><span class="name-truncate" :title="productLabel(item.productId, inventory.products)">{{ productLabel(item.productId, inventory.products) }}</span></td><td>{{ item.lotId ? lotLabel(item.lotId, lotsByProduct[item.productId]?.find(l => l.id === item.lotId)?.lotCode) : 'Todo el producto' }}</td><td>{{ formatQuantity(expected(item)) }}</td><td>{{ formatQuantity(item.countedQuantity) }}</td><td>{{ countDifference(item.countedQuantity, expected(item)) === null ? 'Actualiza las existencias' : formatQuantity(countDifference(item.countedQuantity, expected(item)), true) }}</td><td><Button type="button" text :disabled="operations.submitting" @click="items.splice(index, 1)">Quitar</Button></td></tr></tbody></table></div>
      </template>
      <p v-if="validationError" class="field-error span-2" role="alert">{{ validationError }}</p><p v-if="feedback" class="span-2" role="status">{{ feedback }}</p>
      <div class="form-actions"><Button type="submit" class="cancel-btn" :disabled="disabled">Revisar datos</Button><Button type="button" class="save-btn" :disabled="disabled || !canWrite || operations.needsReview" :loading="operations.submitting" @click="submit">{{ kind === 'waste' ? 'Registrar merma' : 'Registrar conteo' }}</Button></div>
    </form>
    <Button v-if="savedId" text @click="showSaved = true">Ver identificador del registro guardado</Button>
    <RecordDetails v-model:visible="showSaved" title="Registro guardado" :fields="{ 'Identificador completo': savedId }" />
  </section>
</template>
