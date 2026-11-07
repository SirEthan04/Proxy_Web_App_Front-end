# BodeGo

Prototipo universitario con Vue 3, Vite, Pinia, Axios, PrimeVue y JSON Server.

## Instalación e inicio

Instalar Node.js 22.12 o posterior de la rama 22, o Node.js 24, con npm.

```sh
git clone --branch feature/commercial-purchases-sales https://github.com/SirEthan04/Proxy_Web_App_Front-end.git
cd Proxy_Web_App_Front-end
npm ci
```

Terminal 1:

```sh
npm run server
```

JSON Server: http://localhost:3001. Expone `/products`, `/users`, `/operations`, `/wastes`, `/purchases` y `/sales`. También conserva la reescritura `/api/v1/*` en `scripts/server.mjs`.

Terminal 2:

```sh
npm run dev
```

Abrir manualmente http://localhost:5174 en Brave, Chrome, Edge o Firefox. No requiere un perfil especial ni abre el navegador automáticamente. Ambos puertos son fijos; si están ocupados, detener el servicio anterior desde su terminal. No se finalizan procesos ajenos. Ctrl+C en cada terminal detiene su servicio. Si PowerShell bloquea npm.ps1, usar npm.cmd.

## Datos y recuperación

`server/seed.json` contiene seis productos y dos usuarios ficticios; compras, ventas, movimientos y mermas comienzan vacíos. El primer arranque crea `server/work-db.json` desde la semilla únicamente si falta. Los siguientes arranques conservan los datos; una base incompleta o corrupta se conserva y produce un error. No se renumeran identificadores: la columna N.º representa la posición visible al ordenar o filtrar.

| Rol | Correo | Clave de demostración |
| --- | --- | --- |
| Administrador | admin@bodego.com | 1234 |
| Empleado | empleado@bodego.com | 1234 |

Para respaldar: detener ambos servicios y copiar `server/work-db.json` fuera del proyecto. Para recuperar: detener los servicios, respaldar primero la base actual y copiar la copia elegida sobre ese archivo. No publicar bases locales, respaldos, perfiles ni secretos. No hay comando de reinicio destructivo.

El navegador conserva sesión y seguimientos de operaciones inciertas en localStorage. No borrar esos seguimientos para desbloquear operaciones ni reenviar escrituras inciertas automáticamente. El uso normal funciona con almacenamiento vacío y no depende de un perfil concreto.

JSON Server es un backend de demostración: expone usuarios y no proporciona autenticación real, autorización en servidor ni transacciones seguras. No utilizar datos ni claves reales.

## Estructura activa

- `src/`: interfaz, roles, validaciones, reglas de negocio, traducciones y protección de stock.
- `public/`: recursos públicos.
- `server/seed.json`: semilla versionada para instalaciones nuevas.
- `server/work-db.json`: datos locales persistentes, excluidos de Git.
- `scripts/server.mjs`: arranque independiente de JSON Server y rutas.
- `scripts/local-data.mjs`: creación segura de la base si no existe.
- `scripts/ports.mjs`: comprobación del puerto sin cambiarlo ni cerrar otros procesos.
- `vite.config.js`: Vite en localhost:5174, sin apertura automática.

Los históricos, importadores, herramientas de demostración y pruebas se archivaron fuera del proyecto durante la limpieza de presentación. No son requisitos del arranque. No se mantienen pruebas automatizadas en esta entrega.

## Validación de presentación

```sh
npm run build
git diff --check
```

Antes de retirar las pruebas se ejecutaron las 20 existentes con éxito sobre fixtures y bases aisladas. Cubren login de ambos roles, permisos, productos, numeración, compras, ventas, carrito múltiple, stock, movimientos, mermas, alertas, reportes, traducciones, persistencia y errores parciales. Esta cobertura no sustituye una revisión visual interactiva.

Para la presentación, verificar manualmente dashboard, búsqueda y formularios, carrito, alertas, reportes y cambio español/inglés; revisar tamaños móvil y escritorio en Brave, Chrome, Edge y Firefox. Permitir almacenamiento local. Las reglas responsive existen, pero la validación visual en los cuatro navegadores y la ejecución real en macOS/Linux siguen pendientes.

## Configuración HTTP

`VITE_API_BASE_URL` es la única variable HTTP del frontend. `.env.development` y `.env.example` apuntan a http://localhost:3001. Para otro backend, crear `.env.development.local` y reiniciar `npm run dev`; el backend debe permitir CORS desde http://localhost:5174 y respetar los contratos. Para producción puede configurarse `.env.production.local` antes del build. No se consume MockAPI.
