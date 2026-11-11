> Documento histórico de la entrega previa a JWT. Para el estado actual de identidad, contratos sin userId y escrituras habilitadas, consulta [IAM-FRONTEND-INTEGRATION.md](IAM-FRONTEND-INTEGRATION.md).

# Integración de Operations

## Alcance y estado

Rama `feature/integracion-operations`, inicialmente limpia, desde develop remoto
`e5405e46caeca1953bbc739f4a4ad239aec32ee8`. Incluye Monitoring/Reporting vía PR #5
y no contiene el commit `42877d7`. Esta entrega se guarda en un único commit local,
sin push ni PR de esta integración.
No se modificaron backend ni datos MySQL. Todas las consultas reales ejecutadas fueron GET.

Se inspeccionaron controladores, Commands, Queries, Resources, Assemblers,
servicios, reglas de dominio y persistencia de Operations e Inventory.
OpenAPI en ejecución confirmó las rutas descritas a continuación.

## Endpoints y contratos

Base: `VITE_API_BASE_URL=http://localhost:5281`, sufijo `/api/v1`.
Se reutiliza el cliente Axios real `queryApi`, con timeout de 10 segundos y sin
fallback legacy ni Authorization de la sesión demo. Los siguientes son esquemas
del contrato inspeccionado; no son registros inventados para MySQL.

### Movimientos

`GET /api/v1/inventory-movements` devuelve un array directo:

```text
{
  id: GUID string, productId: GUID string, lotId: GUID string | null,
  userId: GUID string, movementType: string, quantityDelta: int,
  sourceType: string, sourceId: string, createdAt: ISO DateTime string
}
```

Tipos: `Purchase`, `Sale`, `Waste`, `CountAdjustment`. Se conserva el signo de
quantityDelta y el origen. El repositorio ordena por fecha descendente y GUID.
Vue muestra todos los registros recibidos, sin invertirlos ni crear movimientos.
La búsqueda por producto, GUID, tipo u origen es local. El producto se resuelve
con Inventory real; si falta o falla el catálogo, se muestra su GUID.
No existe POST para registrar movimientos manuales: se retiró de esta pantalla
el formulario de entradas/salidas que antes alteraba stock en JSON Server.
El origen se presenta como texto: no se enlaza a documentos Commercial legacy.

### Mermas

`GET /api/v1/wastes` devuelve un array directo:

```text
{
  id: GUID string, productId: GUID string, lotId: GUID string | null,
  userId: GUID string, quantity: int, reason: string,
  registeredAt: ISO DateTime string
}
```

`POST /api/v1/wastes` existe en backend; su contrato es:

```text
{ productId: GUID, lotId: GUID | null, userId: GUID, quantity: int, reason: string }
```

Requiere usuario activo real, producto activo, cantidad positiva int32,
motivo no vacío (máximo 255 caracteres) y lote perteneciente al producto si se indica.
La merma descuenta existencias y crea movimientos con delta negativo en la misma
transacción. Sin lote específico, el backend selecciona lotes por receivedAt y GUID
(no por vencimiento). Comprueba stock total consistente con suma de lotes y stock
suficiente tanto del producto como de los lotes seleccionados.
Concurrencia, referencias y stock inconsistente/insuficiente pueden producir 409.

El formulario permite seleccionar producto/lote reales, escribir cantidad y motivo,
y validar localmente un borrador. Nunca actualiza stock ni añade una merma al historial.

### Conteos físicos

**No existe GET de listado `/api/v1/inventory-counts`.** Devuelve 405.
Se usa la ruta real `GET /api/v1/inventory-counts/{id}`:

```text
{
  id: GUID string, userId: GUID string, countedAt: ISO DateTime string,
  status: "Draft" | "Confirmed" | "Cancelled", notes: string | null,
  items: [{ id: GUID string, productId: GUID string, lotId: GUID string | null,
            expectedQuantity: int, countedQuantity: int, difference: int }]
}
```

La pestaña Conteos físicos dentro de `/operations` permite introducir el GUID
de un conteo existente y recargarlo. No se inventan identificadores ni listados.
Un GUID inválido se rechaza antes de HTTP; un recurso ausente muestra el error 404.

`POST /api/v1/inventory-counts` existe; su contrato es:

```text
{
  userId: GUID, notes: string | null,
  items: [{ productId: GUID, lotId: GUID | null, countedQuantity: int }]
}
```

Requiere usuario activo, al menos un detalle, cantidad física entera no negativa
y notas opcionales no vacías si se envían (máximo 500 caracteres). Se omiten notas
en blanco como null. No se repite producto/lote ni se mezcla un conteo total del
producto con conteos de sus lotes. Los lotes deben pertenecer al producto.
El backend obtiene expectedQuantity, calcula difference = countedQuantity - expectedQuantity
y confirma el documento. **No ajusta stock ni crea movimientos.** Vue no envía
expectedQuantity ni difference. El borrador admite varios productos/lotes y permite
quitar detalles locales; esto no elimina registros históricos.

## Bloqueo de escritura e IAM

Los botones Registrar están deshabilitados con explicación visible en español.
Los métodos de aplicación y de infraestructura de creación también rechazan siempre
con el mismo mensaje, incluso con un userId arbitrario o invocaciones repetidas.
No existe un flag del formulario que habilite escrituras. No se implementa una
llamada Axios POST ejecutable en esta entrega; los endpoints POST solo tienen
contratos y preparación local. Los borradores omiten userId deliberadamente.
No se sustituye por un usuario de JSON Server, ni se ofrece un selector de usuario.

**Las escrituras no están completadas ni verificadas contra MySQL.** Para habilitarlas
se necesita integrar identidad IAM real y autorizar las escrituras. En esa entrega,
tras una merma confirmada se debe recargar el store real Inventory, los lotes,
mermas y movimientos; nunca descontar stock localmente. No se reintentan POST
automáticamente y habrá que gestionar los resultados inciertos antes de reenviar.

## Arquitectura e Inventory

* `real-operations-api.js`: servicios GET y guardas de escritura, errores españoles.
* `real-operations.assembler.js`: adaptación estricta sin conversiones de GUID.
* `domain/real-operations.js`: cantidades, referencias, borradores y reglas locales.
* `application/real-operations.js`: store Pinia `real-operations`, consultas independientes.
* `Operations.vue` y `Waste.vue`: listados reales; `PreparedOperationForm.vue`:
  formulario reutilizado para borradores de merma/conteo.

Se reutiliza `useProductsStore` de `inventory/application/inventory.js` (no el store
legacy `products.js`). No se crea otra fuente de stock de productos.
Cambio mínimo en `inventory-api.js`: se añade GET `/products/{id}/lots` usando su
cliente existente; acceso opcional a import.meta.env permite importar ese servicio
en pruebas Node y no cambia su configuración Vite.
Los lotes de los formularios se consultan por producto y se descartan al recargar.
Se descartan respuestas tardías al cambiar rápidamente de producto. Su cache local
solo sirve para preparar referencias de detalles; no actualiza existencias reales.

Sin cambios en IAM, Commercial, Monitoring, Reporting, rutas o Sidebar.
La navegación de conteos se incluye en Operations para conservar rutas y permisos
demo actuales. `firebase.json` permanece intacto.

Los stores y servicios legacy de Operations se conservan porque Commercial y sus
reconciliaciones todavía los importan. Las nuevas pantallas no los utilizan.
IAM, Commercial y sus flujos legacy de movimientos/stock continúan usando JSON Server;
no confundirlos con los nuevos listados reales. Inventory, Monitoring y Reporting
mantienen sus integraciones reales existentes.

## Estados y errores

Listas vacías se muestran como ausencia de registros, sin datos de relleno.
Consultas tienen carga, recarga y mensajes de conexión, 400, 404, 409 y 500.
Se limpian resultados previos antes de cada consulta; no se muestran como actuales
si falla la API. Se rechazan respuestas mal formadas. La recarga duplicada del store
no repite solicitudes. Los formularios validan stock insuficiente, producto inactivo,
lote incorrecto, cantidades y campos obligatorios, pero siguen bloqueados para envío.
Las fechas se muestran como llegan del backend: no se inventa una zona horaria
para DateTime persistidos sin sufijo UTC.

## Pruebas y comprobaciones

* `npm.cmd audit`: 0 vulnerabilidades.
* `npm.cmd run build`: correcto; advertencia de chunk mayor de 500 kB.
* `npm.cmd test`: 18 pruebas aprobadas, 7 existentes de Monitoring/Reporting y
  11 nuevas de Operations. Cubren adaptadores, vacíos, cantidades int32, stock,
  referencias reales, conteos, errores HTTP/conexión, bloqueo y doble invocación,
  ausencia de datos ficticios y reutilización de Inventory. Fixtures aislados;
  los adaptadores Axios mock no escriben en ninguna base.
* `git diff --check`: correcto, con avisos de normalización LF/CRLF de Windows.
* GET reales: movimientos HTTP 200 (14 registros); mermas HTTP 200 (`[]`);
  productos y lotes HTTP 200. Contratos de movimientos, mermas y lotes validados
  también con los adaptadores reales desde Node.
* OpenAPI confirmó GET de conteos solo por GUID; GET de la colección devuelve 405.
  No se consultó un conteo existente: no se dispone de su GUID desde un listado
  y no se crearon datos para obtenerlo. Consulta/adaptación de conteos probada con mocks.
* No se ejecutaron POST, PUT, PATCH, DELETE, migraciones ni SQL de escritura.
* No se realizó revisión visual del navegador ni prueba real de envío de formularios.

## Verificación manual

1. Con el backend existente en 5281 y sus datos, iniciar Vue con `npm.cmd run dev`
   en 5174. Para el acceso demo y Commercial mantener JSON Server en 3001.
2. Entrar con la sesión demo y abrir `/operations`. Comparar movimientos, deltas,
   lotes, fechas y orígenes con Scalar. Buscar, recargar y probar sin conexión.
3. En Conteos físicos, consultar un GUID existente proporcionado por el equipo;
   comprobar estado, cabecera y detalles. No registrar un conteo para obtener un GUID.
4. Preparar varios detalles de conteo, incluido cero; probar duplicados y mezcla
   de total/lote. Validar el borrador y comprobar que Registrar permanece bloqueado.
5. Abrir `/waste`, comprobar lista vacía o mermas existentes; seleccionar productos
   y lotes reales, cantidades positivas e insuficientes, y motivo. Validar sin enviar.
6. En Network comprobar únicamente GET a la API real desde estas pantallas;
   el acceso de demostración puede seguir consultando JSON Server.
7. Revisar móvil/escritorio, recargas, CORS, cambio rápido de producto, ausencia
   de falsas confirmaciones y que Inventory no cambia stock al validar borradores.
