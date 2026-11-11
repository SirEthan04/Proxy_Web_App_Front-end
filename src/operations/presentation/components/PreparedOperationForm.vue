<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import RequestState from '../../../shared/presentation/components/RequestState.vue'
import ProductPicker from '../../../inventory/presentation/components/ProductPicker.vue'
import { useProductsStore } from '../../../inventory/application/inventory.js'
import { loadRealLots } from '../../application/real-operations.js'
import { operationsError } from '../../infrastructure/real-operations-api.js'
import { prepareWaste, prepareCount, WRITE_BLOCKED } from '../../domain/real-operations.js'
const props = defineProps({ kind: { type: String, required: true } })
const inventory = useProductsStore()
const productId = ref(''), lotId = ref(''), quantity = ref(''), reason = ref(''), notes = ref('')
const items = ref([]), lotsByProduct = ref({}), lotsLoading = ref(false), lotsError = ref(null), feedback = ref(''), validationError = ref('')
const lots = computed(() => lotsByProduct.value[productId.value] || [])
const product = computed(() => inventory.products.find(p => p.id === productId.value))
const available = computed(() => lotId.value ? lots.value.find(l => l.id === lotId.value)?.quantityAvailable : product.value?.stock)
const disabled = computed(() => inventory.loading || !!inventory.loadError || lotsLoading.value || !!lotsError.value)
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
    feedback.value = 'Borrador validado localmente. No se envió al backend ni se modificó el stock. Falta userId de IAM real.'
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
</script>
<template>
  <section class="panel">
    <div class="section-heading"><h2>{{ kind === 'waste' ? 'Preparar merma' : 'Preparar conteo físico' }}</h2><Button text :disabled="inventory.loading || lotsLoading" @click="reload">Recargar productos y lotes</Button></div>
    <p class="report-notice" role="status">{{ WRITE_BLOCKED }}</p>
    <RequestState :loading="inventory.loading" :error="inventory.loadError" @retry="reload" />
    <form class="form-grid form" @submit.prevent="validate" novalidate>
      <div class="field span-2"><label :for="kind + '-product'">Producto real</label><ProductPicker :input-id="kind + '-product'" v-model="productId" :products="inventory.products" :disabled="inventory.loading || !!inventory.loadError" /></div>
      <div class="field"><label :for="kind + '-lot'">Lote</label><select :id="kind + '-lot'" v-model="lotId" :disabled="disabled || !productId"><option value="">{{ kind === 'waste' ? 'Sin lote específico (selección del backend)' : 'Total del producto' }}</option><option v-for="lot in lots" :key="lot.id" :value="lot.id">{{ lot.lotCode }} — {{ lot.quantityAvailable }} unidades — {{ lot.id }}</option></select></div>
      <div class="field"><label :for="kind + '-quantity'">{{ kind === 'waste' ? 'Cantidad de merma' : 'Cantidad física' }}</label><InputText :id="kind + '-quantity'" v-model="quantity" type="number" step="1" :min="kind === 'waste' ? 1 : 0" max="2147483647" :disabled="disabled" /><small v-if="product && !disabled">Existencia consultada: {{ available }}</small></div>
      <RequestState :loading="lotsLoading" :error="lotsError" @retry="loadLots(productId)" />
      <div v-if="kind === 'waste'" class="field span-2"><label for="waste-reason">Motivo (máximo 255 caracteres)</label><InputText id="waste-reason" v-model="reason" maxlength="255" :disabled="disabled" /></div>
      <template v-else>
        <div class="field span-2"><label for="count-notes">Notas opcionales (máximo 500 caracteres)</label><InputText id="count-notes" v-model="notes" maxlength="500" :disabled="disabled" /></div>
        <Button type="button" :disabled="disabled || !productId" @click="addItem">Añadir detalle al borrador</Button>
        <div v-if="items.length" class="table-scroll span-2"><table><thead><tr><th>Producto (GUID)</th><th>Lote</th><th>Cantidad física</th><th>Acción local</th></tr></thead><tbody><tr v-for="(item, index) in items" :key="item.productId + ':' + item.lotId"><td>{{ item.productId }}</td><td>{{ item.lotId || 'Total del producto' }}</td><td>{{ item.countedQuantity }}</td><td><Button type="button" text @click="items.splice(index, 1)">Quitar del borrador</Button></td></tr></tbody></table></div>
        <p class="span-2">El backend calcula existencias esperadas y diferencias. Este formulario no ajusta el stock.</p>
      </template>
      <p v-if="validationError" class="field-error span-2" role="alert">{{ validationError }}</p><p v-if="feedback" class="span-2" role="status">{{ feedback }}</p>
      <div class="form-actions"><Button type="submit" class="cancel-btn" :disabled="disabled">Validar borrador sin enviar</Button><Button type="button" class="save-btn" disabled :title="WRITE_BLOCKED">Registrar (bloqueado por IAM)</Button></div>
    </form>
  </section>
</template>
