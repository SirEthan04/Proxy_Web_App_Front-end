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

test('inventory report numbers displayed rows and keeps real product detail links', async () => {
  const previousWindow = globalThis.window
  globalThis.window = { matchMedia: () => ({ matches: false }) }
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = path => vite.ssrLoadModule('/src/' + path)
  try {
    const component = (await load('reporting/presentation/Reports.vue')).default
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useAuthStore } = await load('iam/application/auth.js')
    const { setLocale } = await load('i18n.js')
    const products = [
      { id: 'X9PeXW7', name: 'Pan Bimbo', category: 'Panaderia', price: 5.2, stock: 20, status: 'Activo' },
      { id: 10, name: 'Arroz', category: 'Abarrotes', price: 3.5, stock: 20, status: 'Activo' },
      { id: 'Xn7rK2s', name: 'Galletas', category: 'Dulces', price: 2, stock: 10, status: 'Activo' }
    ]
    async function render(rows, language = 'es') {
      setLocale(language)
      const pinia = createPinia(); setActivePinia(pinia)
      useProductsStore().products = rows
      // Read-only fixture: do not fetch or write any running database.
      useProductsStore().loadProducts = async () => rows
      useAuthStore().user = { name: 'Admin', role: 'Administrador' }
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component }] })
      await router.push('/reports'); await router.isReady()
      const app = createSSRApp(component)
      app.use(pinia); app.use(router); app.use(PrimeVue); app.use(ConfirmationService); app.use(ToastService)
      const html = await renderToString(app)
      const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1]
      const numbers = [...body.matchAll(/class="catalog-row-number">(\d+)<\/td>/g)].map(m => Number(m[1]))
      assert.deepEqual(numbers, rows.map((_, index) => index + 1))
      for (const product of rows) assert.ok(body.includes(`href="/products/${product.id}"`))
      assert.ok(!body.includes('>X9PeXW7<') && !body.includes('>Xn7rK2s<'))
      assert.ok(html.includes(language === 'es' ? '>N.º</th>' : '>No.</th>'))
      return body
    }
    const before = JSON.stringify(products)
    await render(products)
    await render([...products].reverse())
    await render(products.slice(1))
    await render(products, 'en')
    assert.equal(JSON.stringify(products), before)
  } finally {
    await vite.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
