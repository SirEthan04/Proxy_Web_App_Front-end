> Documento histórico de la entrega previa a JWT. Para el estado actual de identidad, contratos sin userId y escrituras habilitadas, consulta [IAM-FRONTEND-INTEGRATION.md](IAM-FRONTEND-INTEGRATION.md).

# Integración Commercial con ASP.NET Core

## Estado y alcance

Rama `feature/integracion-commercial`, basada en `c3f4c5e`, igual a las
referencias locales `develop` y `origin/develop` al iniciar. Incluye Inventory.
No se modificó el backend, MySQL ni el historial Git. No hay commits ni push.

Las pantallas existentes Purchases, Sales, NewPurchase y NewSale conservan sus
componentes de historial y carrito, con estilos PrimeVue y navegación actuales.
CommercialDetails consulta el documento por GUID. Los estados reales se muestran
como Borrador (Draft), Confirmada (Confirmed) y Cancelada (Cancelled).

**Las lecturas reales están conectadas. Crear y confirmar permanecen bloqueados
por la identidad del login actual.** Los servicios y el flujo de escritura están
preparados y probados con mocks; no constituyen pruebas POST contra MySQL.

## Servicios y stores

- `real-commercial-api.js`: usa la instancia Axios `inventoryApi`, con
  `VITE_API_BASE_URL=http://localhost:5281` y un solo `/api/v1`.
- `real-commercial.js`: store Pinia `real-commercial`, exclusivo de las pantallas
  comerciales reales. No usa el journal local ni la secuencia de movimientos
  y actualizaciones de stock del flujo anterior.
- `inventory/application/inventory.js`: única fuente del stock real; se reutiliza
  sin modificarla. El adaptador agrega nombres desde este catálogo y conserva
  GUID de documentos, productos, detalles, lotes y usuarios.
- `backend-workflow.js`: separa creación de confirmación y permite probar ambas
  con dependencias controladas. No reintenta POST automáticamente.

Rutas verificadas en `CommercialControllers.cs`:

| Método | Ruta relativa a /api/v1 | Uso |
| --- | --- | --- |
| GET | /purchases | Listado |
| POST | /purchases | Crear Draft |
| GET | /purchases/{id} | Detalle |
| POST | /purchases/{id}/confirm | Confirmar |
| GET | /sales | Listado |
| POST | /sales | Crear Draft |
| GET | /sales/{id} | Detalle |
| POST | /sales/{id}/confirm | Confirmar |
| GET | /products | Catálogo y stock reales |
| GET | /products/low-stock | Inventory compartido |
| GET | /categories | Nombres de categorías |
| GET | /products/{id}/lots | Selector de lotes |

## Contratos reales

`CreateCommercialResource` es común a compras y ventas. No admite propiedades
adicionales. Esta plantilla requiere reemplazar los marcadores por referencias
reales y autorizadas; no contiene IDs para enviar a producción:

```json
{
  "userId": "<GUID DEL USUARIO AUTENTICADO REAL>",
  "items": [
    {
      "productId": "<GUID DEL PRODUCTO>",
      "lotId": null,
      "quantity": 2,
      "unitAmount": 2.50
    }
  ]
}
```

La respuesta `CommercialResponse` incluye `id`, `userId`, `registeredAt`,
`status`, `total` e `items`. Cada item contiene `id`, `productId`, `lotId`,
`quantity`, `unitAmount` y `subtotal`. Confirmar no requiere cuerpo JSON.
Los importes son decimales en la API; la presentación usa céntimos para calcular
totales. Las cantidades deben ser enteros positivos hasta Int32.MaxValue.

El frontend rechaza productos inexistentes/inactivos y lotes ajenos al producto.
El carrito conserva una línea por producto; permite varios productos, con un
lote opcional por línea. Las ventas conservan la validación local de stock
disponible; el backend resuelve cualquier cambio concurrente al confirmar.

## Draft, confirmación y stock

Guardar crea exclusivamente un Draft. No invoca confirmación ni modifica stock
en Vue. El detalle tiene una acción independiente de confirmación, deshabilitada
mientras se procesa, cuando no es Draft o cuando IAM no es compatible.
El store también impide solicitudes simultáneas y vuelve a consultar el estado
antes de confirmar.

Una compra sin `lotId` recibe un lote generado por el backend al confirmar,
con código `PUR-...` y vencimiento nulo. Con lote explícito, incrementa ese lote.
El contrato Commercial no permite indicar un código ni vencimiento manual;
la UI lo explica y no envía campos inventados.

Una venta sin `lotId` delega FIFO al backend, ordenado por `ReceivedAt` y GUID.
Con lote explícito, utiliza ese lote. Las reglas de reserva y los movimientos
pertenecen exclusivamente al backend; Vue no los reproduce.

Tras confirmar se invalidan los lotes y se recargan Inventory y el listado.
Si falla ese refresco, la confirmación recibida se conserva y se muestra una
advertencia; el error de carga de Inventory impide usar stock como actualizado.
No se aplican aumentos ni descuentos locales.

## IAM: bloqueo real

`auth-service.js` autentica contra JSON Server y retorna solo nombre, correo y
rol; no proporciona GUID de usuario ni sesión autenticada de ASP.NET Core.
Que exista un usuario con el mismo correo en MySQL no acredita su identidad.

Por ello `writeBlocked` informa la limitación y el resolver de identidad rechaza
crear y confirmar, incluso si alguien agrega un GUID a la identidad demo.
No se selecciona otro usuario ni se inventan credenciales. El backend comprueba
existencia del usuario al crear y que esté activo al confirmar, pero eso no
sustituye integrar autenticación real. No se modificó IAM.

Para habilitar escrituras en el futuro se deberá implementar un resolver de
sesión real, obtener/verificar su userId y reemplazar el bloqueo y su getter de
forma conjunta. No basta quitar el atributo disabled de un botón.

## Errores

400: datos inválidos; 404: recurso inexistente; 409: conflicto de stock, lote,
estado o concurrencia; 500: error del servidor; 503: servicio no disponible.
Se conserva el detalle/título real de ProblemDetails como texto, sin HTML.
Se muestran mensajes de conexión en español. En un error de confirmación se
consulta nuevamente el detalle y el stock, sin repetir POST. Un fallo de red al
escribir indica resultado incierto y pide revisar el historial antes de repetir.
Nunca se muestra éxito si el POST falla.

## Pruebas reproducibles sin escrituras reales

```powershell
node --test tests/commercial-integration.test.mjs
npm.cmd audit
npm.cmd run build
git diff --check
```

La suite usa el runner incorporado de Node 24 y adaptadores Axios controlados;
no abre conexiones ni escribe MySQL. Verifica rutas y métodos de ambos tipos,
contratos, GUID, validaciones, Draft sin stock, confirmación y refresco,
rechazo de doble clic, conflicto 409, error al refrescar y bloqueo IAM del store.
Los GUID de fixtures existen solo en la suite de mocks.

Consultas GET reales ejecutadas: purchases (5 registros), sales (8), detalle de
ambos, products (4), categories (4) y lotes de un producto: HTTP 200.
Los listados contienen Draft y Confirmed. CORS admite localhost:5174.
Los conteos reflejan el momento de la consulta, no son datos fijos de la UI.
No se ejecutaron POST, DELETE, migraciones ni limpieza de datos.

## Pruebas manuales y escrituras futuras (requieren aprobación)

Ahora, con API, JSON Server para login y Vite en 5174:

1. Abrir compras/ventas, refrescar, buscar y filtrar estados/fechas.
2. Abrir detalles y verificar líneas, totales, usuario GUID y estado.
3. Abrir carritos, buscar productos reales, agregar varios, cambiar cantidades
   y seleccionar lotes. Verificar que cantidades cero/negativas se rechacen.
4. Comprobar que guardar/confirmar estén bloqueados con explicación de IAM.
5. Revisar Network: estas pantallas usan 5281/api/v1, no JSON Server.
6. Apagar API para verificar error y reintento de lecturas.

Después de integrar IAM real y autorizar expresamente escrituras, preferentemente
en una base aislada:

1. Elegir usuario activo acreditado y productos/lotes existentes; anotar stock
   y cantidades de lotes con GET. No crear usuarios ni productos automáticamente.
2. En compra, agregar dos productos y guardar borrador. Revisar POST /purchases
   con el contrato anterior. Consultar detalle: Draft, stock idéntico al inicial.
3. Confirmar desde detalle: un POST /purchases/{id}/confirm. Revisar Confirmed,
   stock aumentado exactamente por las cantidades y listado actualizado.
4. En venta, usar cantidades disponibles; guardar Draft y verificar stock intacto.
   Confirmar y verificar decremento, FIFO o lote seleccionado, y refresco.
5. Probar doble clic. En base aislada, enviar otra confirmación del mismo GUID y
   comprobar 409 sin segundo cambio de stock. Probar stock concurrente insuficiente
   y revisar el mensaje real 409. No manipular stock directamente desde Vue.

Estas pruebas crean cabeceras y detalles de compras/ventas. La confirmación de
compras puede crear lotes y aumenta stock; ventas consumen lotes. Ambas crean
movimientos de inventario y actualizan versiones/estados. No son pruebas inocuas
para bodego_db. No ejecutar sin autorización; no se incluye limpieza destructiva.

## Compatibilidad y límites

IAM, Operations, Monitoring y Reporting siguen usando JSON Server y sus stores
anteriores. No se modificaron esos módulos ni el cliente HTTP compartido.
Los servicios comerciales antiguos y su journal se conservan porque los módulos
de demostración los usan para historial/validaciones. Las pantallas comerciales
reales ya no los usan; sus datos no aparecerán en reportes/alertas demo.
Registrar producto desde el carrito navega al formulario real de Inventory;
el registro rápido antiguo de JSON Server ya no se invoca desde Commercial.

Las escrituras reales siguen sin verificar por el bloqueo de IAM y la falta de
autorización para escribir datos de prueba. No se afirma una prueba completa
de navegador; la herramienta de navegador no está disponible en esta sesión.
