import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

test('catalog renders consecutive positions after sorting/filtering without exposing technical IDs as numbers', async () => {
  const previousWindow = globalThis.window
  globalThis.window = { matchMedia: () => ({ matches: false }) }
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = path => vite.ssrLoadModule('/src/' + path)
  try {
    const component = (await load('inventory/presentation/Products.vue')).default
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useAuthStore } = await load('iam/application/auth.js')
    async function render(search = '', direction = 'asc') {
      const pinia = createPinia(); setActivePinia(pinia)
      useProductsStore().products = [
        { id: 'X9PeXW7', name: 'Pan Bimbo', stock: 20, price: 5.2, category: 'Panaderia' },
        { id: 1, name: 'Coca Cola', stock: 21, price: 3.5, category: 'Bebidas' }
      ]
      useAuthStore().user = { name: 'Admin', role: 'Administrador' }
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component }] })
      await router.push('/products'); await router.isReady()
      const app = createSSRApp(component)
      app.use(pinia); app.use(router); app.use(PrimeVue); app.use(ConfirmationService); app.use(ToastService)
      app.mixin({ created() {
        if (this.$options.__name === 'Products') {
          this.$.setupState.search = search
          this.$.setupState.sortDirection = direction
        }
      } })
      return renderToString(app)
    }
    const initial = await render()
    const body = initial.match(/<tbody>([\s\S]*?)<\/tbody>/)[1]
    assert.deepEqual([...body.matchAll(/class="catalog-row-number">(\d+)<\/td>/g)].map(m => m[1]), ['1','2'])
    assert.ok(body.indexOf('Coca Cola') < body.indexOf('Pan Bimbo'))
    assert.ok(!body.includes('>X9PeXW7<'))
    const filtered = await render('Pan')
    const filteredBody = filtered.match(/<tbody>([\s\S]*?)<\/tbody>/)[1]
    assert.deepEqual([...filteredBody.matchAll(/class="catalog-row-number">(\d+)<\/td>/g)].map(m => m[1]), ['1'])
    assert.ok(!filteredBody.includes('Coca Cola'))
    const descending = (await render('', 'desc')).match(/<tbody>([\s\S]*?)<\/tbody>/)[1]
    assert.ok(descending.indexOf('Pan Bimbo') < descending.indexOf('Coca Cola'))
    assert.ok(!initial.includes('Este producto tiene una operaci'))
  } finally {
    await vite.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
