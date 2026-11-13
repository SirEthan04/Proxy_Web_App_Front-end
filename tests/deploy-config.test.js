import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveApiBase, guardLegacy } from '../src/shared/infrastructure/api-config.js'

test('producción exige origen HTTPS explícito sin localhost ni rutas', () => {
  for (const value of [undefined, '', 'http://api.example.org', 'https://localhost:5281', 'https://127.0.0.1', 'https://[::1]', 'https://api.example.org/api/v1', 'https://user:pass@api.example.org', 'https://api.example.org?token=x']) {
    assert.throws(() => resolveApiBase({ PROD: true, VITE_API_BASE_URL: value }), /VITE_API_BASE_URL/)
  }
  assert.equal(resolveApiBase({ PROD: true, VITE_API_BASE_URL: 'https://api.example.org/' }), 'https://api.example.org/api/v1')
  assert.equal(resolveApiBase(), 'http://localhost:5281/api/v1')
})

test('legacy se rechaza en producción antes de ejecutar solicitudes', () => {
  assert.throws(() => guardLegacy({}, true), /no está disponible en producción/)
  const config = {}
  assert.equal(guardLegacy(config, false), config)
})
