<script setup>
import { computed } from 'vue'
import Select from 'primevue/select'
import { t, translateValue, locale } from '../../../i18n.js'
import { sortProducts } from '../product-order.js'
import { formatQuantity } from '../../../shared/presentation/utils/presentation.js'
const props = defineProps({ modelValue: { type: [String, Number], default: '' }, products: { type: Array, required: true }, inputId: { type: String, required: true }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const options = computed(() => sortProducts(props.products, 'name', 'asc', locale.value).map(product => ({
  id: String(product.id), name: product.name, stock: product.stock,
  category: translateValue(product.category),
  searchText: normalize([product.id, product.name, product.category].join(' '))
})))
const selected = computed(() => options.value.find(product => product.id === String(props.modelValue)))
</script>
<template>
  <Select
    :input-id="inputId"
    :model-value="modelValue === '' ? null : String(modelValue)"
    :options="options"
    option-label="name"
    option-value="id"
    filter
    :filter-fields="['name', 'category', 'searchText']"
    :filter-placeholder="t('searchProductHint')"
    :empty-filter-message="t('noMatchingProducts')"
    :placeholder="t('selectProduct')"
    :disabled="disabled"
    class="product-picker"
    @update:model-value="emit('update:modelValue', $event ?? '')"
  >
    <template #value="slotProps">
      <span class="name-truncate" :title="selected?.name">{{ selected?.name || slotProps.placeholder }}</span>
    </template>
    <template #option="slotProps">
      <div class="picker-option">
        <strong class="name-truncate" :title="slotProps.option.name">{{ slotProps.option.name }}</strong>
        <small :title="slotProps.option.category">{{ slotProps.option.category }} &#183; {{ t('stock') }}: {{ formatQuantity(slotProps.option.stock) }}</small>
      </div>
    </template>
  </Select>
</template>
