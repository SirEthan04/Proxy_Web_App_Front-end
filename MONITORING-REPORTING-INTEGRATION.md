# Integración de Monitoring y Reporting

## Alcance y Git

Trabajo sobre `feature/integracion-monitoring-reporting`, inicialmente limpia y con HEAD
`c3f4c5e062731e9dc92402354553886ae1cd6600`, igual a `origin/develop` y al develop
remoto comprobado con `git ls-remote`. No contiene `42877d7` (Commercial).
Integración preparada para publicarse en un único commit mediante PR a develop,
sin cambios de rama ni modificaciones en el repositorio backend.
`firebase.json` no necesita cambios: solo configura Hosting.

Backend inspeccionado en modo lectura en `../BodeGo-Bakend/BodeGo`, rama
`feature/autenticacion-iam`. Se revisaron controladores, Resources, Assemblers,
QueryServices, repositorios y parser de filtros. No se usan endpoints de IAM.
No se ejecutaron escrituras HTTP, SQL ni migraciones.

## Cliente y contratos REST

`src/shared/infrastructure/query-client.js` crea un cliente Axios independiente,
timeout de 10 segundos, sin token ni fallback legacy. Base:
`VITE_API_BASE_URL=http://localhost:5281`, con sufijo `/api/v1`.
`VITE_LEGACY_API_BASE_URL=http://localhost:3001` permanece intacta.

Los siguientes son esquemas de los Resources reales, no resultados observados en MySQL:

* `GET /api/v1/alerts`: array directo de AlertResource, sin filtros del servidor.
* `GET /api/v1/alerts/{id}`: un AlertResource, GUID no vacío; 400 si inválido,
  404 si no existe.

```text
AlertResource {
  id: GUID string,
  productId: GUID string,
  lotId: GUID string | null,
  attendedByUserId: GUID string | null,
  alertType: "LowStock" | "OutOfStock" | "Expiration",
  status: "Pending" | "Attended",
  message: string,
  createdAt: ISO DateTime UTC string,
  attendedAt: ISO DateTime UTC string | null
}
```

El assembler backend usa `DateTime.SpecifyKind(..., Utc)` y los enums como strings.
Vue conserva los GUID y muestra las fechas tal como llegan, sin cambiar su zona.
Los filtros de tipo, estado y búsqueda son locales sobre alertas ya persistidas.
El detalle hace su propia consulta GET. No se generan alertas desde stock o fechas,
ni hay acciones de creación, cierre o eliminación.

* `GET /api/v1/reports/sales-summary?from=yyyy-MM-dd&to=yyyy-MM-dd`

```text
SalesSummaryResource { salesCount: integer, totalAmount: decimal number }
```

* `GET /api/v1/reports/top-products?from=yyyy-MM-dd&to=yyyy-MM-dd&limit=10`

```text
TopProductResource[] {
  productId: GUID string,
  productName: string,
  quantitySold: integer
}
```

`from` y `to` son opcionales y deben omitirse cuando no hay filtro; no se envían
strings vacíos. Años 1000–9999, fechas válidas y `from <= to`. Ambos días son
inclusivos: el backend implementa el final como el comienzo exclusivo del día siguiente
(salvo DateOnly.MaxValue). Vue envía el día de calendario sin conversiones horarias.
`limit` solo corresponde a top-products: entero 1–100, por defecto 10.
El resumen no recibe limit. Se validan los filtros antes de enviar solicitudes.

Los repositorios filtran exclusivamente ventas `Confirmed` por `registered_at`.
El resumen cuenta ventas y suma `total`, con cero cuando no hay registros.
Top-products suma cantidades de sale_items, ordena por cantidad descendente y GUID
ascendente en empates. No se calcula facturación ni ranking en Vue a partir de Commercial.

## Pantallas y arquitectura

Servicios: `alerts-api.js` y `reports-api.js`, exclusivamente GET.
Adaptadores puros: `alerts.assembler.js` y `report-contract.js`.
Stores Pinia: `useAlertsStore` (`real-alerts`) y `useReportsStore` (`real-reports`).
Se preservan layout, tarjetas, tablas, filtros, botones y accesos rápidos existentes.

`Alerts.vue`: tipo y estado traducidos a español, mensaje, GUID del producto,
fechas y detalle con lote y usuario de atención cuando existen. Los valores desconocidos
de enums se muestran sin sustituirlos por un estado inventado.

`Reports.vue`: resumen de ventas confirmadas, importe en soles, fechas, límite,
recarga y exportación CSV del resumen con periodo aplicado. La tabla de productos
incluye un gráfico mediante `meter`: cada barra representa quantitySold respecto al
máximo de los productos devueltos. No representa dinero, porcentajes ni evolución temporal.
La tabla proporciona las cifras accesibles del mismo gráfico.
Los cambios de filtros se aplican con Aplicar/Recargar; el periodo aplicado queda visible.

`Dashboard.vue`: total de alertas, pendientes, atendidas, cinco primeras alertas en
el orden del backend; para administradores, cantidad e importe de ventas confirmadas
de todo el periodo. Conserva accesos rápidos según permisos de demostración.
No muestra métricas de movimientos, mermas ni vencimientos calculadas con datos legacy.
Los cuatro endpoints no ofrecen esos indicadores ni una serie temporal de ventas.

El antiguo reporte de inventario derivaba del store legacy de productos; los reportes
de movimientos y mermas derivaban de JSON Server. Se retiran de Reports para evitar
presentarlos como información MySQL. El catálogo sigue accesible en Inventario y las
consultas de movimientos y mermas en sus módulos existentes. No se cambiaron esos módulos.

IAM (incluido login de demostración), Commercial y Operations siguen usando JSON Server,
así como el store compartido legacy de productos cuando esos flujos lo requieren.
Las pantallas Inventory ya integradas conservan su cliente real independiente.
Monitoring/Reporting y dashboard no importan esos stores legacy.
No se requiere IAM JWT: se mantiene la navegación con sesión de demostración y sus
permisos existentes; los nuevos servicios no consultan IAM ni envían Authorization.

## Estados y errores

Una lista vacía válida muestra ausencia de resultados; cero ventas y cero soles se
muestran como ceros reales. No se insertan filas ni cifras de demostración.
Carga, errores de conexión/backend apagado/CORS, 400, 404 y 500 tienen mensajes
en español y recarga. Una respuesta mal formada se identifica como tal.
Al recargar se limpian resultados anteriores; ante fallo no quedan cifras antiguas
como si correspondieran al nuevo filtro. No hay mensajes de éxito ante errores.
Resumen y ranking se publican juntos solo después de validar ambas respuestas.

## Validación ejecutada

* `npm.cmd audit`: 0 vulnerabilidades.
* `npm.cmd run build`: correcto. Advertencia de bundle mayor de 500 kB.
* `git diff --check`: correcto; Git avisa de normalización LF/CRLF en Windows.
* `npm.cmd test`: pruebas con runner nativo de Node, sin nuevas dependencias.
  Cubren adaptación y vacío de alertas, detalle por GUID, ceros y ranking,
  fechas reales y bisiestos, rango, límites, parámetros HTTP exactos, solo GET,
  fallos HTTP y conexión, limpieza de datos previos y ausencia de relleno ficticio.
  Los fixtures viven únicamente en tests y nunca se envían a MySQL.
* En la primera implementación la API y OpenAPI no respondían. En la revisión
  previa a publicación, los GET reales en localhost:5281 respondieron:
  alerts: HTTP 200 con `[]`; sales-summary: HTTP 200 con
  `{"salesCount":4,"totalAmount":37.50}`; top-products: HTTP 200 con dos productos,
  cantidades 9 y 6, conservando los GUID devueltos.
* Con `from=9999-12-31&to=9999-12-31`, resumen: HTTP 200 con cero ventas y cero
  importe; ranking con `limit=1`: HTTP 200 con `[]`. `limit=101`: HTTP 400.
  No se verificó detalle de una alerta real porque la lista estaba vacía.
* No se realizó revisión visual de navegador. No había suite de pruebas anterior
  ni script test en package.json; se agregó `node --test`.

## Comprobación manual desde Vue

1. Iniciar el backend por su procedimiento habitual, con su configuración MySQL existente.
   Esta integración no requiere ejecutar migraciones ni crear datos.
2. Verificar las dos variables Vite; iniciar `npm.cmd run server` para el login y
   módulos de demostración, y `npm.cmd run dev` para Vue en http://localhost:5174.
3. Usar la sesión de demostración administrativa existente (sin JWT real).
4. Abrir `/alerts`, recargar, filtrar por tipo/estado, buscar y abrir detalle de
   un GUID devuelto por la lista. Verificar fechas y campos opcionales.
5. Abrir `/reports`, comprobar el resumen, ranking y barras contra GET de Scalar.
   Probar sin fechas, mismo día, rango válido y límites 1 y 100; no crear ventas
   para obtener resultados. Validar ceros/listas vacías según los datos existentes.
6. Cambiar filtros, aplicarlos y verificar el periodo consultado y CSV del resumen.
   Rango invertido y límites inválidos no deben provocar solicitudes HTTP.
7. Revisar `/dashboard`, sus recargas y accesos rápidos, tamaños móvil/escritorio.
8. Detener temporalmente la API y recargar: debe aparecer error, no cifras antiguas.
   Volver a iniciarla y reintentar. En Network verificar GET a 5281 para los cuatro
   endpoints, sin escrituras ni llamadas a JSON Server desde estos stores.

Limitación pendiente: detalle de una alerta existente, CORS desde navegador y
presentación visual. Las respuestas HTTP anteriores se comprobaron sin navegador.
No se alteró la información de bodego_db.
