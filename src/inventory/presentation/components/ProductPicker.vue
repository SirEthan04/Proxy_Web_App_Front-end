<script setup>
import { computed } from 'vue'
import Select from 'primevue/select'
import { t, translateValue } from '../../../i18n.js'
const props = defineProps({ modelValue: { type: [String, Number], default: '' }, products: { type: Array, required: true }, inputId: { type: String, required: true }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const options = computed(() => props.products.map(product => ({
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
      <span>{{ selected?.name || slotProps.placeholder }}</span>
    </template>
    <template #option="slotProps">
      <div class="picker-option">
        <strong>{{ slotProps.option.name }}</strong>
        <small>{{ slotProps.option.category }} &#183; {{ t('stock') }}: {{ slotProps.option.stock }} &#183; {{ t('id') }}: {{ slotProps.option.id }}</small>
      </div>
    </template>
  </Select>
</template>
