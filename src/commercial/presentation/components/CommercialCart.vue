<script setup>
import '../real-commercial.css'
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../../../iam/application/auth.js'
import { PERMISSIONS } from '../../../iam/domain/permissions.js'
import { t, locale } from '../../../i18n.js'
import { useProductsStore } from '../../../inventory/application/inventory.js'
import AppLayout from '../../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../../shared/presentation/components/RequestState.vue'
import CommercialConnection from './CommercialConnection.vue'
import { useCommercialStore } from '../../application/real-commercial.js'
import { validateCart, catalogChanged } from '../../domain/commercial-validation.js'
import { toMinor, lineTotal, totalMinor } from '../../domain/money.js'
import { lotLabel, formatDate } from '../../../shared/presentation/utils/presentation.js'
import { formatMoney, commercialReference } from '../format.js'
import { productAvailability } from '../../domain/product-availability.js'
import { sortProducts } from '../../../inventory/presentation/product-order.js'
const props = defineProps({ kind: { type: String, required: true } })
const router = useRouter(), confirm = useConfirm(), toast = useToast()
const products = useProductsStore(), commercial = useCommercialStore()
const auth = useAuthStore()
const cartElement = ref(null), cartHeight = ref(null)
function fitCart() {
  if (!cartElement.value || window.innerWidth < 768) { cartHeight.value = null; return }
  cartHeight.value = Math.max(280, window.innerHeight - Math.max(20, cartElement.value.getBoundingClientRect().top) - 16) + 'px'
}
onMounted(() => { window.addEventListener('resize', fitCart); window.addEventListener('scroll', fitCart, { passive: true }); nextTick(fitCart) })
onBeforeUnmount(() => { window.removeEventListener('resize', fitCart); window.removeEventListener('scroll', fitCart) })
const search = ref(''), searchInput = ref(null), resultLimit = ref(12), lines = ref([])
const confirming = ref(false), message = ref(null), attemptedId = ref(null), completedDocument = ref(null)
const checking = ref(false), connectionError = ref(null), connectionReady = ref(false)
const purchase = computed(() => props.kind === 'purchase')
const base = computed(() => purchase.value ? '/purchases' : '/sales')
const locked = computed(() => products.saving || commercial.submitting || confirming.value || Boolean(attemptedId.value))
const disabled = computed(() => locked.value || products.loading || checking.value || Boolean(products.loadError))
const validation = computed(() => attemptedId.value ? null : validateCart(props.kind, lines.value, products.products))
const lineError = line => attemptedId.value ? null : validateCart(props.kind, [line], products.products)
const quantityError = (line, quantity = line.quantity) => {
  if (attemptedId.value) return null
  const key = validateCart(props.kind, [{ ...line, quantity, unitAmount: purchase.value ? '0' : line.unitAmount }], products.products)
  return ['commercialQuantityError', 'insufficientStock', 'invalidProductStock', 'productNotFound'].includes(key) ? key : null
}
const amountError = line => lineError(line) === 'commercialAmountError'
const total = computed(() => totalMinor(lines.value.map(line => ({ quantity: Number(line.quantity), unitAmountMinor: toMinor(line.unitAmount) }))))
const units = computed(() => lines.value.reduce((sum, line) => sum + (quantityError(line) ? 0 : Number(line.quantity)), 0))
const hasZero = computed(() => lines.value.some(line => toMinor(line.unitAmount) === 0))
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const matches = computed(() => products.products.filter(product => normalize([product.name, product.id, product.category].join(' ')).includes(normalize(search.value))))
const results = computed(() => sortProducts(matches.value, 'name', 'asc', locale.value).slice(0, resultLimit.value))
const productIssue = product => productAvailability(props.kind, product)
const inCart = product => lines.value.find(line => String(line.productId) === String(product.id))
const newLine = product => ({ productId: String(product.id), productName: product.name, quantity: '1', lotId: '', unitAmount: purchase.value ? '' : String(product.price), expectedStock: Number(product.stock) })
const addUnavailable = product => {
  if (disabled.value || product.active === false) return true
  const line = inCart(product) || newLine(product)
  const quantity = inCart(product) ? Number(line.quantity) + 1 : 1
  return Boolean(validateCart(props.kind, [{ ...line, quantity, unitAmount: purchase.value ? '0' : line.unitAmount }], products.products))
}
const notify = (severity, key) => toast.add({ severity, summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'), detail: t(key), life: 8000 })
function refreshSnapshots() {
  for (const line of lines.value) {
    const product = products.products.find(item => String(item.id) === String(line.productId))
    if (!product) continue
    line.expectedStock = Number(product.stock)
    line.productName = product.name
    if (!purchase.value) line.unitAmount = String(product.price)
  }
}
async function load() {
  if (locked.value || checking.value) return
  checking.value = true; connectionReady.value = false; connectionError.value = null
  const results = await Promise.allSettled([commercial.load(props.kind)])
  if (results[0].status === 'rejected') connectionError.value = results[0].reason.message
  else connectionReady.value = true
  if (results[0].status === 'fulfilled' && lines.value.length && catalogChanged(props.kind, lines.value, products.products)) {
    refreshSnapshots(); message.value = 'commercialChanged'
  }
  checking.value = false
}
onMounted(load)
watch([message, checking, completedDocument, () => lines.value.length], () => nextTick(fitCart))
onBeforeRouteLeave(() => !commercial.submitting && !confirming.value)
async function add(product, event) {
  if (addUnavailable(product)) return
  try { await commercial.loadLots(product.id) } catch (error) { message.value = error.message; return }
  if (addUnavailable(product)) return
  const existing = inCart(product)
  if (existing) existing.quantity = String(Number(existing.quantity) + 1)
  else lines.value.push(newLine(product))
  message.value = 'posAdded'
  await nextTick()
  if (event?.detail === 0) searchInput.value?.$el?.focus({ preventScroll: true })
}
function changeQuantity(line, delta) {
  const quantity = Number(line.quantity) + delta
  if (disabled.value || quantityError(line, quantity)) return
  line.quantity = String(quantity)
}
async function execute(snapshot) {
  if (commercial.submitting || attemptedId.value) return
  try {
    const document = await commercial.register(props.kind, snapshot)
    attemptedId.value = document.id
    completedDocument.value = document
    message.value = null
    await nextTick()
    globalThis.document.getElementById('pos-start-another')?.focus()
  } catch (error) {
    message.value = error.message
    attemptedId.value = commercial.activeDocumentId
    notify('error', message.value)
  }
}
function startAnother() {
  if (commercial.submitting || !completedDocument.value) return
  lines.value = []; attemptedId.value = null; completedDocument.value = null; message.value = null; search.value = ''
  nextTick(() => searchInput.value?.$el?.focus({ preventScroll: true }))
}
function review() {
  if (disabled.value || !connectionReady.value || commercial.writeBlocked || validation.value) return
  const snapshot = JSON.parse(JSON.stringify(lines.value))
  confirming.value = true
  confirm.require({
    header: 'Guardar borrador',
    message: t('posConfirmSummary', { products: lines.value.length, units: units.value, total: formatMoney(total.value) }) + '\n' + 'El borrador no modifica el stock. Se confirma por separado desde el detalle.',
    acceptLabel: 'Guardar borrador', rejectLabel: t('cancel'), defaultFocus: 'reject',
    acceptProps: { severity: 'success' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { confirming.value = false; return execute(snapshot) },
    reject: () => { confirming.value = false }, onHide: () => { confirming.value = false }
  })
}
</script>
<template>
  <AppLayout>
    <div class="content pos-workspace commercial-page">
      <PageHeader :title="t(purchase ? 'commercialNewPurchase' : 'commercialNewSale')" :description="'Prepara tu operación y confirma cuando está lista. El stock cambia al confirmar.'">
        <template #actions>
          <Button class="cancel-btn" :disabled="locked" @click="router.push(base)">{{ t('commercialBack') }}</Button>
        </template>
      </PageHeader>
      <RequestState :loading="products.loading" :error="products.loadError" @retry="load" />
      <CommercialConnection :loading="checking && !products.loading" :error="connectionError" @retry="load" />
      <p v-if="commercial.writeBlocked" class="review-warning" role="alert">{{ commercial.writeBlocked }}</p>
      <p v-if="commercial.warning" class="review-warning" role="status">{{ commercial.warning }}</p>
      <p v-if="message && message !== 'posAdded'" class="review-warning" role="alert">{{ t(message) }}</p>
      <p v-if="attemptedId && !completedDocument" class="review-warning" role="status">{{ t('commercialAttemptLocked') }} <router-link :to="base + '/' + attemptedId">{{ t('posViewDetails') }}</router-link>
      </p>
      <section v-if="completedDocument" class="panel pos-success" role="status" aria-live="polite">
        <div>
          <h2>Borrador guardado. El stock no ha cambiado.</h2>
          <p>{{ commercialReference(kind, completedDocument.id) }} &#183; {{ formatMoney(completedDocument.totalMinor) }}</p>
        </div>
        <div class="pos-success-actions">
          <Button id="pos-start-another" type="button" class="new-btn" @click="startAnother">{{ t(purchase ? 'commercialNewPurchase' : 'commercialNewSale') }}</Button>
          <router-link class="inline-action" :to="base + '/' + completedDocument.id">{{ t('posViewDetails') }}</router-link>
        </div>
      </section>
      <div class="pos-grid">
        <section class="panel pos-catalog" :aria-label="t('posFindProducts')">
          <label for="pos-search" class="pos-section-title">{{ t('posFindProducts') }}</label>
          <InputText id="pos-search" ref="searchInput" v-model="search" type="search" :placeholder="t('posSearchHint')" :disabled="locked" autocomplete="off" class="pos-search" @input="resultLimit = 12" />
          <p class="pos-result-count" aria-live="polite">{{ t('posResultCount', { count: results.length, total: matches.length }) }}</p>
          <ul class="pos-products">
            <li v-for="product in results" :key="product.id" class="pos-product" :data-product-id="product.id">
              <div class="pos-product-info">
                <h2 :title="product.name">{{ product.name }}</h2>
                <p>
                  <strong>{{ formatMoney(toMinor(product.price)) }}</strong>
                  <span>{{ t('stock') }}: {{ product.stock }}</span>
                </p>
                <small v-if="productIssue(product)" class="field-error">{{ t(productIssue(product)) }}</small>
                <small v-if="inCart(product)">{{ t('posInCart', { quantity: inCart(product).quantity }) }}</small>
              </div>
              <Button type="button" class="pos-add" :disabled="addUnavailable(product)" :aria-label="t('posAddNamed', { product: product.name })" @click="add(product, $event)">{{ t('posAdd') }}</Button>
            </li>
          </ul>
          <p v-if="!products.loading && !products.loadError && !results.length" class="empty">{{ t(products.products.length ? 'noMatchingProducts' : 'noProducts') }}</p>
          <router-link v-if="purchase && auth.can(PERMISSIONS.PRODUCTS_CREATE)" class="inline-action" to="/products/new">Registrar producto en Inventory</router-link>
          <Button v-if="results.length < matches.length" type="button" severity="secondary" text :disabled="locked" @click="resultLimit += 12">{{ t('posShowMore') }}</Button>
          <p class="sr-only" role="status">{{ message === 'posAdded' ? t('posAdded') : '' }}</p>
        </section>
        <form id="pos-cart" ref="cartElement" :style="{ maxHeight: cartHeight }" class="panel pos-cart commercial-cart" @submit.prevent="review" novalidate>
          <div class="pos-cart-heading">
            <h2>{{ t('posCart') }}</h2>
            <span>{{ t('posCartCount', { products: lines.length }) }}</span>
            <strong class="pos-cart-heading-total">{{ formatMoney(total) }}</strong>
          </div>
          <p v-if="!lines.length" class="empty pos-empty-cart">{{ t('posEmptyCart') }}</p>
          <div class="pos-lines commercial-lines">
            <section v-for="(line, index) in lines" :key="line.productId" class="pos-line commercial-line" :data-line-product="line.productId">
              <div class="pos-line-heading">
                <h3 :title="line.productName">{{ line.productName }}</h3>
                <Button type="button" severity="danger" text :disabled="disabled" :aria-label="t('posRemoveNamed', { product: line.productName })" @click="lines.splice(index, 1)">{{ t('commercialRemove') }}</Button>
              </div>
              <div class="field">
                <label :for="'lot-' + index">Lote</label>
                <select :id="'lot-' + index" v-model="line.lotId" :disabled="disabled" @focus="commercial.loadLots(line.productId).catch(error => message = error.message)">
                  <option value="">{{ purchase ? 'Crear lote al confirmar' : 'Selección automática' }}</option>
                  <option v-for="lot in commercial.lots[line.productId] || []" :key="lot.id" :value="lot.id">{{ lotLabel(lot.id, lot.lotCode) }} · {{ lot.quantityAvailable }} unidades{{ lot.expirationDate ? ' - ' + formatDate(lot.expirationDate) : '' }}</option>
                </select>
                <small>{{ purchase ? 'Selección automática: se crea un lote al confirmar.' : 'Selección automática: se usan primero los lotes más antiguos.' }}</small>
              </div>
              <div class="pos-line-fields">
                <div class="field">
                  <label :for="'quantity-' + index">{{ t('quantity') }}</label>
                  <div class="pos-quantity-controls">
                    <Button type="button" class="pos-minus" severity="secondary" outlined :disabled="disabled || Boolean(quantityError(line, Number(line.quantity) - 1))" :aria-label="t('posDecreaseNamed', { product: line.productName })" @click="changeQuantity(line, -1)">&#8722;</Button>
                    <InputText :id="'quantity-' + index" v-model="line.quantity" type="number" min="1" step="1" :max="purchase ? undefined : line.expectedStock" inputmode="numeric" :disabled="disabled" :aria-invalid="Boolean(quantityError(line))" :aria-describedby="quantityError(line) ? 'quantity-error-' + index : undefined" />
                    <Button type="button" class="pos-plus" severity="secondary" outlined :disabled="disabled || Boolean(quantityError(line, Number(line.quantity) + 1))" :aria-label="t('posIncreaseNamed', { product: line.productName })" @click="changeQuantity(line, 1)">+</Button>
                  </div>
                  <small v-if="quantityError(line)" :id="'quantity-error-' + index" class="field-error" role="alert">{{ t(quantityError(line)) }}</small>
                </div>
                <div class="field pos-unit-amount">
                  <label :for="purchase ? 'amount-' + index : undefined">{{ t(purchase ? 'commercialUnitCost' : 'commercialUnitPrice') }}</label>
                  <InputText v-if="purchase" :id="'amount-' + index" v-model="line.unitAmount" inputmode="decimal" placeholder="0.00" :disabled="disabled" :aria-invalid="amountError(line)" :aria-describedby="amountError(line) ? 'amount-error-' + index : undefined" />
                  <strong v-else>{{ formatMoney(toMinor(line.unitAmount)) }}</strong>
                  <small v-if="amountError(line)" :id="'amount-error-' + index" class="field-error" role="alert">{{ t('commercialAmountError') }}</small>
                </div>
                <div class="pos-subtotal">
                  <span>{{ t('commercialSubtotal') }}</span>
                  <strong>{{ formatMoney(lineTotal(Number(line.quantity), toMinor(line.unitAmount))) }}</strong>
                </div>
              </div>
              <p class="commercial-stock">{{ t('stock') }}: {{ line.expectedStock }} <template v-if="!quantityError(line)">
                  <span aria-hidden="true">&#8594;</span> Stock estimado tras confirmar: {{ line.expectedStock + (purchase ? 1 : -1) * Number(line.quantity) }} <span v-if="purchase">({{ t('posUnitsIncoming', { quantity: line.quantity }) }})</span>
                </template>
              </p>
            </section>
          </div>
          <div class="pos-checkout">
            <p v-if="lines.length && validation" class="field-error" role="alert">{{ t(validation) }}</p>
            <p v-if="hasZero && !attemptedId" class="pos-zero-notice">{{ t('commercialZeroNotice') }}</p>
            <div class="pos-total" aria-live="polite">
              <span>{{ t('commercialTotal') }}</span>
              <strong>{{ formatMoney(total) }}</strong>
            </div>
            <Button id="commercial-review" type="submit" class="save-btn" :disabled="disabled || !connectionReady || !!commercial.writeBlocked || Boolean(validation)" :loading="commercial.submitting">Guardar borrador</Button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
