import jsonServer from 'json-server'
import { ensureLocalData } from './local-data.mjs'
import { checkPort } from './ports.mjs'

let server
async function close() {
  if (!server) return
  const active = server
  server = null
  await new Promise(resolve => { active.close(resolve); active.closeAllConnections?.() })
}
process.once('SIGINT', () => { void close() })
process.once('SIGTERM', () => { void close() })

try {
  await checkPort(3001, 'JSON Server')
  const database = await ensureLocalData()
  const app = jsonServer.create()
  const router = jsonServer.router(database)
  app.use(jsonServer.defaults())
  app.use(jsonServer.bodyParser)
  app.use(jsonServer.rewriter({ '/api/v1/*': '/$1' }))
  app.use(router)
  await new Promise((resolve, reject) => {
    server = app.listen(3001, 'localhost', resolve)
    server.once('error', reject)
  })
  console.log('\nJSON Server: ' + database + '\n\nResources')
  for (const name of Object.keys(router.db.getState())) {
    console.log('  http://localhost:3001/' + encodeURIComponent(name))
  }
  console.log('\nCtrl+C detiene solo JSON Server. Inicia Vite en otra terminal con npm run dev.\n')
} catch (error) {
  console.error('\nNo se pudo iniciar JSON Server: ' + error.message)
  await close()
  process.exitCode = 1
}
