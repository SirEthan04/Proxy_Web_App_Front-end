# IAM JWT y escrituras reales de BodeGo

## Rama y recuperación de Commercial

Se actualizó develop por fast-forward a `c7a5abb` y se creó
`feature/integracion-iam-frontend`. No se hicieron cambios de implementación en
develop ni main, commits, push, rebase o PR. Se recuperaron selectivamente los diez
archivos de `42877d7` con `git restore --source=42877d7 --worktree -- <archivos>`.
No se aplicó el commit completo sobre Operations/Inventory ni se cambió su historial.
Se adaptó Commercial a JWT y al contrato vigente sin userId.

Backend inspeccionado solo en lectura en `feature/autenticacion-iam`, HEAD
`26f3f7b`, que incluye `0a55f7f`. No se crearon usuarios ni se modificó MySQL.

## Contratos de autenticación

`POST /api/v1/auth/login`:

```text
Request: { email: string, password: string }
Response: {
  accessToken: string, tokenType: "Bearer", expiresAt: ISO UTC DateTime,
  user: { id: GUID, name: string, email: string, roleId: int, role: string }
}
```

`GET /api/v1/auth/me` requiere Bearer y devuelve directamente:

```text
{ id: GUID, name: string, email: string, roleId: int, role: "Administrador" | "Empleado" }
```

Se comprueba `/auth/me` después de recibir el token antes de admitir la sesión.
No se busca un usuario por correo en JSON Server, ni se toma un GUID demo como identidad.
Login admite correo hasta 180 caracteres y contraseña hasta 128 según el Resource.
Se manejan 400, 401, 403, 429 y fallos de conexión en español.

## Almacenamiento, Bearer y navegación

El token, su vencimiento y el usuario de `/me` viven únicamente en memoria de la
página, compartida reactivamente con Pinia. No se escriben JWT ni contraseñas en
localStorage, sessionStorage, cookies, archivos o logs. Al recargar/cerrar la página
es necesario iniciar sesión otra vez. La contraseña se limpia del formulario al
terminar el intento, también si falla. La antigua identidad demo en localStorage
no se lee; logout la elimina si existe.

Esta elección evita persistir un Bearer reutilizable en almacenamiento del navegador,
pero el código de la página sigue teniendo acceso al token en memoria: deben mantenerse
las defensas frente a XSS y utilizar HTTPS fuera del entorno local. No existe endpoint
de refresh ni logout en este backend; logout elimina la sesión local, no revoca un
token ya emitido por el servidor.

`attachBearer` se aplica a `queryApi` e `inventoryApi`. Solo añade Authorization
al origen y prefijo exacto `/api/v1` configurados por VITE_API_BASE_URL. El login
no lleva Bearer. No se añade al cliente legacy, otros hosts ni rutas ajenas.
Una respuesta 401 autenticada borra la sesión; 403 no eleva roles ni simula éxito.
Se evita que respuestas tardías de otra sesión sobrescriban datos o invaliden una
sesión nueva. Logout durante login no restaura la sesión al llegar la respuesta.

Un temporizador borra la sesión al llegar expiresAt; también se comprueba antes
de navegar y escribir. La pérdida de token en una ruta protegida redirige a login.
Administrador conserva todos los permisos de interfaz; Empleado puede operar compras,
ventas, mermas y conteos, pero no reportes ni administración. La autorización definitiva
la aplican las políticas del backend con el usuario activo obtenido del JWT.

## Commercial

Se habilitan GET de compras/ventas, detalle y lotes; POST de creación y confirmación:

```text
POST /api/v1/purchases
POST /api/v1/sales
Body: { items: [{ productId: GUID, lotId: GUID | null, quantity: int, unitAmount: decimal }] }

POST /api/v1/purchases/{id}/confirm
POST /api/v1/sales/{id}/confirm
Sin JSON de usuario.
```

El cuerpo se construye con una lista explícita de campos. Nunca se envía userId,
ni siquiera si el llamador proporciona uno. Producto activo, cantidades int32
positivas, importes de hasta dos decimales y referencias de lotes se validan con
Inventory real. Se conserva carrito, historial, detalle y confirmación separada.

Crear devuelve Draft y no aplica cambios locales de stock. Confirmar verifica
antes que el documento siga Draft; solo acepta una respuesta Confirmed. Después
recarga catálogo/stock, listado y descarta lotes cacheados. El backend aumenta
stock para compra y lo descuenta para venta; Vue no ejecuta deltas ni crea movimientos.
Si una confirmación exitosa no puede refrescar los GET, se muestra advertencia.
Los 409 no se reintentan automáticamente; se consulta el documento para reconciliar.

Las escrituras tienen bloqueo de doble clic. Un resultado incierto al crear
bloquea nuevos envíos en el store hasta verificar el historial. No se reenvía ningún
POST automáticamente. Los bloqueos son locales a esta página; recargarla no prueba
que una operación incierta haya fallado: debe verificarse antes de repetir.

## Operations

```text
POST /api/v1/wastes
{ productId: GUID, lotId: GUID | null, quantity: int, reason: string }

POST /api/v1/inventory-counts
{ notes: string | null, items: [{ productId: GUID, lotId: GUID | null, countedQuantity: int }] }
```

No se envía userId; la identidad sale de la política OperationsOperator.
Se conservan las validaciones previas: merma positiva, stock/lotes consistentes,
motivo de hasta 255 caracteres; conteo no negativo, notas opcionales hasta 500,
al menos un detalle, sin duplicados ni mezcla de producto total y sus lotes.
Se refrescan productos y lotes antes de validar el envío. Los selectores y el stock
proceden del store Inventory real y su endpoint `/products/{id}/lots`.

Antes de enviar se pide confirmación en la interfaz. Una merma exitosa recarga
Inventory, movimientos y mermas. Un conteo conserva la cabecera y detalles devueltos,
con diferencias calculadas por backend, sin ajuste automático de stock. Continúa
existiendo solo GET `/inventory-counts/{id}`, sin listado inventado.
Se separa la confirmación del registro de un posible error de recarga posterior.
Con error de conexión/5xx después de intentar un POST se bloquea el reenvío local
y se indica que el resultado es incierto. Los registros no se eliminan ni se revierten.

## Archivos y compatibilidad

IAM: store `auth.js`, servicios reales, `session.js`, guard y Login.vue.
HTTP: `bearer.js`, clientes query/Inventory; acceso opcional a env en cliente legacy
para permitir sus pruebas Node, sin añadirle Authorization.
Commercial: los archivos recuperados y adaptados de 42877d7.
Operations: servicio/store reales, formulario y comentario de dominio actualizado.
Navegación: watcher de sesión en main y Sidebar con stores reales para bloqueo de logout.

Monitoring y Reporting conservan sus pantallas y consultas. Inventory conserva su
store y endpoints. No se tocó firebase.json ni configuración de hosting.
Se conservan los antiguos servicios/stores legacy por compatibilidad, pero login,
carritos/historiales comerciales y las pantallas Operations ya no los utilizan.
La pantalla de administración de usuarios sigue siendo legacy y queda fuera de
esta integración; no permite crear usuarios en MySQL. Su migración es pendiente.
Las acciones de edición/eliminación de Inventory que no tengan contrato backend
continúan fuera del alcance de esta entrega.

## Pruebas y límites de la verificación

`npm.cmd audit`: 0 vulnerabilidades. Build correcto, con advertencia de bundle >500 kB.
`npm.cmd test`: 38 pruebas, incluyendo las anteriores y los casos JWT, roles,
Bearer limitado, sesión expirada/logout, respuestas tardías, compras/ventas y
confirmaciones, mermas/conteos, ausencia de userId, stock autoritativo, errores y
doble clic. Todos los POST de las pruebas usan adapters mocks, sin red ni MySQL.
`git diff --check`: correcto, con avisos de normalización de finales de línea Windows.

GET reales verificados: OpenAPI 200, /auth/me sin token 401, purchases 200 (5),
sales 200 (8), inventory-movements 200 (14), wastes 200 ([]).
OpenAPI confirma login POST y me GET y los POST vigentes de Operations.
No se ejecutó login real, compras, ventas, confirmaciones, mermas o conteos reales.
No se pidió ni guardó la contraseña del Administrador. No se probaron visualmente
las pantallas ni CORS en navegador.

## Prueba manual pendiente con tu Administrador

1. Ejecutar el backend en feature/autenticacion-iam con 0a55f7f y 26f3f7b.
2. Revisar VITE_API_BASE_URL=http://localhost:5281 y ejecutar `npm.cmd run dev`
   en http://localhost:5174. Las funciones integradas no necesitan JSON Server.
3. Introducir manualmente admin@bodego.com y su contraseña en Vue. Comprobar login,
   `/me`, acceso a módulos y ausencia de errores CORS. No compartir tokens ni claves.
4. Cuando decidas probar escrituras reales, crear una compra Draft y comprobar que
   no altera stock; confirmar desde detalle y comprobar aumento de stock y lotes.
5. Crear y confirmar una venta con stock disponible; verificar stock y movimientos.
6. Registrar una merma válida y verificar historial, lotes y stock; registrar un
   conteo con diferencias y comprobar que no ajusta stock. Copiar su GUID de la respuesta
   para consultarlo desde la pestaña Conteos físicos.
7. Comprobar doble clic, cantidades inválidas, stock insuficiente, errores, logout y
   vencimiento. Recargar la página exige login de nuevo. No repetir operaciones de
   resultado incierto sin verificarlas primero.

Las escrituras están implementadas y probadas con mocks; su aceptación real contra
tu backend y los efectos de MySQL siguen pendientes de tu prueba manual autorizada.
