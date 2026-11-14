# BodeGo

Frontend para gestionar inventario y operaciones de una bodega, conectado a una API ASP.NET Core .NET 10 con JWT y MySQL. Vue no administra la base de datos directamente.

## Tecnologías y arquitectura

Vue 3, Vite 7, Pinia, Axios, PrimeVue 4 y Vue Router. Los seis Bounded Contexts en `src/` son IAM, Inventory, Commercial, Operations, Monitoring y Reporting. Cada módulo separa dominio, aplicación, infraestructura y presentación; `shared` reúne HTTP, componentes y utilidades.

## Requisitos e inicio local

Node.js 22.12+ de la rama 22 o Node.js 24 y npm. Backend compatible iniciado por separado y CORS autorizado para `http://localhost:5174`.

```sh
npm ci
```

Copiar `.env.example` a `.env.development.local` y ajustar la URL pública del backend. El archivo local está ignorado y no debe publicarse.

```sh
npm run dev
```

Abrir `http://localhost:5174`. El puerto es fijo. En PowerShell se puede usar `npm.cmd` si la política bloquea `npm.ps1`. Reiniciar Vite después de cambiar variables.

## Variables públicas

| Variable | Desarrollo | Producción |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Origen de la API; por defecto `http://localhost:5281` | Obligatoria: origen HTTPS real asignado al backend en Render |
| `VITE_LEGACY_API_BASE_URL` | Opcional, JSON Server local en `http://localhost:3001` | No configurar: cliente deshabilitado |

La URL principal debe contener solo el origen, sin `/api/v1`, rutas, credenciales, query ni fragmentos. Los clientes añaden `/api/v1` una vez. El build rechaza URL ausente, HTTP o localhost en producción. No hay URL definitiva de producción todavía. Cambiar estas variables requiere recompilar: Vite las incorpora al JavaScript público. Nunca colocar claves JWT, contraseñas, tokens o conexiones MySQL en variables `VITE_`.

## Autenticación y permisos

Login envía `{ email, password }` a `POST /api/v1/auth/login` y valida la identidad mediante `GET /api/v1/auth/me`. JWT, vencimiento e identidad permanecen solo en memoria: recargar o cerrar la página exige iniciar sesión de nuevo. No hay refresh; logout elimina la sesión local y no revoca tokens del servidor.

Axios agrega Bearer exclusivamente al origen configurado y prefijo `/api/v1`, excepto login. Nunca al cliente legacy ni a otros dominios. Expiración o 401 autenticado limpia la sesión; 403 muestra falta de permisos. Vue Router usa `createWebHistory` y guardas de autenticación/permisos. Administrador tiene todos los permisos de interfaz; Empleado puede operar compras, ventas, mermas y conteos, sin reportes ni administración. El backend aplica la autorización definitiva.

## Módulos y endpoints implementados

Rutas API relativas a `/api/v1`:

| Contexto | Funciones y endpoints |
| --- | --- |
| IAM | Login, sesión y roles: `/auth/login`, `/auth/me` |
| Inventory | Catálogo, stock, productos y categorías: GET `/products`, `/products/{id}`, `/products/low-stock`, `/products/{id}/lots`, `/categories`, `/categories/{id}`; POST `/products`, `/categories` |
| Commercial | Compras y ventas: GET/POST `/purchases`, `/sales`; GET `/{id}` y POST `/{id}/confirm` en ambos recursos |
| Operations | GET `/inventory-movements`, GET/POST `/wastes`, POST `/inventory-counts`, GET `/inventory-counts/{id}` |
| Monitoring | Alertas y detalles: GET `/alerts`, `/alerts/{id}` |
| Reporting | Dashboard y reportes reales: GET `/reports/sales-summary`, `/reports/top-products`; fechas `from`/`to` opcionales, límite del ranking 1–100 |

Crear compras/ventas genera Draft sin alterar stock; confirmar es una acción independiente. El backend decide stock, lotes y FIFO. Las escrituras comerciales y de Operations no envían userId: la identidad procede del JWT. Una merma descuenta stock; un conteo conserva diferencias calculadas por backend sin ajuste automático. Se conservan validaciones y bloqueo de doble envío; no se reintentan POST automáticamente. Ante resultado incierto, revisar historial antes de repetir, incluso después de recargar.

La interfaz conserva español, fechas `es-PE` en `America/Lima`, importes en soles y GUID completos para contratos y detalles, ocultos en tablas principales. No se inventan datos para listas vacías ni nombres de responsables no disponibles.

Los servicios presentan errores 400 (datos), 401 (sesión), 403 (permisos), 404 (recurso), 409 (conflicto), 500 y conexión/CORS en español. Un fallo al refrescar después de confirmar se informa sin repetir la escritura.

## Pruebas y compilación

```sh
npm test
npm run build
npm audit
git diff --check
```

Las pruebas Node usan fixtures y adaptadores Axios mock; no necesitan backend ni ejecutan POST reales a MySQL. Cubren JWT, roles, rutas protegidas, servicios, contratos, operaciones y presentación, más configuración de producción. Para compilar es obligatorio proporcionar `VITE_API_BASE_URL` con el origen HTTPS real mediante el entorno o `.env.production.local` (ignorado). `npm run preview` permite revisar `dist` localmente; no es servidor de producción.

## Despliegue en Render Static Site

Después de revisar y fusionar el PR a `develop`:

1. En Render elegir **New → Static Site** y conectar este repositorio.
2. Seleccionar rama `develop`, raíz del repositorio, Build Command `npm ci && npm run build` y Publish Directory `dist`.
3. Configurar `VITE_API_BASE_URL` con el origen HTTPS real del backend Docker en Render. Se recomienda `NODE_VERSION=24` para reproducir el entorno de Node. No configurar variables legacy ni secretos del backend.
4. En Redirects/Rewrites agregar Source `/*`, Destination `/index.html`, Action **Rewrite**. Así las rutas internas llegan a Vue Router al recargar y sus guardas redirigen a login al perder la sesión en memoria.
5. El equipo backend debe permitir el origen HTTPS exacto del Static Site mediante CORS, incluyendo `Authorization`, `Content-Type`, GET, POST y preflight OPTIONS. No se cambia el backend desde este repositorio.
6. Desplegar y revisar HTTPS, login, roles, navegación y recarga de rutas internas. No ejecutar escrituras de prueba sobre datos reales sin autorización.

No se necesita Docker ni un proceso Node para servir el frontend. Referencias: [Static Sites](https://render.com/docs/static-sites) y [rewrites de Render](https://render.com/docs/redirects-rewrites).

## Legacy y limitaciones

- `/users` es la única pantalla enrutada que sigue consumiendo JSON Server mediante `user-api.js`. En producción muestra una limitación explícita sin solicitudes ni tabla de usuarios demo; su migración a IAM real queda pendiente. La consulta real `/users` para resolver nombres de responsables es independiente y requiere permisos.
- Los antiguos stores/servicios de productos, Commercial y Operations, y el componente QuickProduct no están conectados a las pantallas actuales. Se conservan por compatibilidad. Todo el cliente legacy rechaza solicitudes en producción, aunque se configure su variable.
- Para desarrollo legacy únicamente: `npm run server` inicia JSON Server en 3001. `server/seed.json` es una semilla ficticia; `server/work-db.json` local se crea solo si falta y está ignorado. No usar credenciales ni datos reales. No es necesario para login ni módulos integrados.
- Inventory no ofrece edición/borrado real; no se simula éxito. Conteos solo admite consulta por GUID, sin endpoint de listado. Alertas son de lectura; reportes no inventan series temporales ni métricas ausentes.
- Las pruebas mock no sustituyen aceptación visual, CORS, login real y efectos de escrituras con el backend definitivo. El bundle puede superar el umbral recomendado de Vite.
- Los registros identificables como desarrollo no autorizan su eliminación. Conservar historial, relaciones y stock; cualquier depuración de datos requiere una auditoría y autorización separadas.
