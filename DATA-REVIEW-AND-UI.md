# Presentación y revisión de datos de BodeGo

## Alcance y seguridad

Se conserva la rama `feature/integracion-iam-frontend` y todos sus cambios previos
sin commit. No se modificaron contratos REST, GUID, relaciones, reglas de stock,
autenticación ni permisos del backend. No se ejecutaron escrituras reales ni
migraciones, ni se solicitaron contraseñas o tokens. Sin commit, push, merge o PR.

Los datos siguientes se observaron mediante GET de products, categories, lotes por
producto, purchases, sales, inventory-movements, wastes y alerts. Son una fotografía
de la consulta, no un inventario transaccional de toda MySQL: otros usuarios pueden
seguir operando. Las relaciones se contrastaron con las configuraciones EF en modo
lectura. No se tuvo acceso SQL directo ni autenticación para consultar usuarios.

## Mejoras de presentación

* Mapeos centrales en `shared/presentation/utils/presentation.js`: Borrador,
  Confirmada/Confirmado, Cancelada/Cancelado, Compra, Venta, Merma, Ajuste por conteo,
  Pendiente, Atendida y tipos de alertas. Los valores JSON originales no cambian.
* Movimientos: producto, tipo, variación con signo/unidades, fecha, referencia de origen
  y Ver detalles. Filtros locales de búsqueda, tipo y fecha inclusiva en horario peruano.
* Mermas: tabla sin identificadores completos y detalle del responsable/producto/lote.
* Conteos: cantidad contada, stock consultado y diferencia estimada reactiva, varios
  productos/lotes y observaciones. El resultado guardado usa expectedQuantity,
  countedQuantity y difference recibidos del servidor. No se ajusta stock ni se
  ejecutan solicitudes de ajuste adicionales. Se conserva consulta individual por ID.
* Compras/ventas: estados traducidos, referencias breves, responsables cuando se pueden
  resolver y fechas legibles. Se conservan carrito, borrador, confirmación y acciones.
* Inventario: numeración visual, nombres/categorías con truncamiento y tooltip,
  búsqueda/filtros existentes, importe, cantidades y estados según stock/minimumStock
  reales. Un producto inactivo no se presenta como disponible.
* Monitoring, Reporting y Dashboard: se retiran textos internos sobre endpoints,
  se formatean fechas/importes y se ocultan GUID de las tablas principales.
* `RecordDetails.vue`: diálogo PrimeVue con datos completos seleccionables, accesible
  mediante Ver detalles, para conservar la trazabilidad sin saturar las tablas.

Los nombres largos no se renombran ni se limpian en MySQL. Se muestran completos en
detalles o tooltip. Se conservan las opciones de idioma existentes; los nuevos mapeos
y mensajes de esta presentación están en español y el idioma predeterminado es español.

Las referencias como `Compra · C9E708AD` y las etiquetas breves de lote son derivados
visuales del identificador/código real. No son correlativos, comprobantes ni códigos
persistentes. Pueden coincidir sus sufijos: ninguna acción ni relación usa esa etiqueta.
Todas las rutas, selects y POST conservan el GUID original completo.

Para resolver responsables se usa el usuario de `/auth/me` y, si el usuario tiene
permiso de administración, GET `/users` de la API real. Si falla o el rol no lo
permite, se muestra Nombre no disponible: no se deducen nombres a partir del correo,
de otro registro o de usuarios demo. Los códigos de lote proceden de GET de Inventory;
cuando falta el código se usa una referencia breve explícita de lote.

## Fechas, moneda y unidades

Fechas de eventos: `es-PE`, zona `America/Lima`, día/mes/año y hora de 12 horas,
sin fracciones de segundo. Los valores con Z u offset conservan su instante.
Se confirmó en dominio que RegisteredAt, CreatedAt, CountedAt, ReceivedAt se generan
con DateTime.UtcNow. Cuando MySQL los devuelve sin Kind/sufijo, se interpretan como
UTC antes de convertir a Lima. No se depende de la zona local del navegador.
DateOnly (vencimientos y filtros) conserva su día, sin corrimiento horario.
En detalles se conserva también la fecha original cuando corresponde.

Importes: `S/ 15.00`, incluido cero. Los totales comerciales conservan centavos enteros
para el formateo. Cantidades: +5 unidades, −2 unidades, −1 unidad. Los contratos no
incluyen unidades de medida físicas, por lo que no se inventan kg, litros o cajas.

## Diagnóstico de registros

### Productos y categoría identificables como desarrollo

| Identificador real | Nombre / situación | Relaciones observadas |
|---|---|---|
| `8782cc2f-cb0d-48dc-8dd8-1c9a732b0750` | Prueba confirmación flujo 0-20-17 e8403fc017524a8d9e0bc25573b7bfa0; stock 19 | 1 lote; 2 compras confirmadas; 2 ventas confirmadas y 2 borradores; 6 movimientos |
| `5643747b-49fc-410a-a1da-9dc41d7ee804` | Prueba confirmación varios detalles e8403fc017524a8d9e0bc25573b7bfa0; stock 0 | 3 lotes; 3 compras confirmadas y 1 borrador; 3 ventas confirmadas y 3 borradores; 8 movimientos |
| `f6b46b26-cd1e-4fba-bb34-e2d0bc082b03` | Categoría Pruebas confirmaciones e8403fc017524a8d9e0bc25573b7bfa0 | Vinculada a ambos productos. Descripción: Datos de desarrollo identificables; no borrar historia |

El lote del primer producto, `5acc32fc-2f3a-4f7a-be9b-8f290dbc7d94`, conserva
19 unidades. Los tres lotes del segundo (`dacaecbc-3d59-4f3d-a024-77a81375152d`,
`a34edb8e-8fc5-4fd4-876a-ab74577761a1`, `4fd49ae2-4afc-43c6-b98e-ca61228961f0`)
tienen cero disponibles, pero conservan historial y referencias. Cero stock no implica
que un lote sea huérfano o descartable.

Compras de esta categoría: confirmadas `d57c2668-2a58-421e-b4db-7b1aa06cdec1`,
`7b5c64f9-5ce7-40df-90f3-bbea55ea038c`, `cb4eff40-2318-4cd5-aa3d-57bbcb6116d0`,
`45eb15e7-132c-4714-93f5-184d8f0a4ef0`; borrador
`f0dcc10d-c331-4372-bb25-3d7c48d79600`.

Ventas de esta categoría: confirmadas `ada6ef00-45ed-47d1-9bd6-5fb02324ab80`,
`66246434-0541-4d2f-917e-fec7934ab77b`, `403cd4c5-82ed-49d7-9755-92290e0368cf`,
`eec5111a-5ba0-46d7-866c-d982a930a720`; borradores
`5794409c-d8c7-4905-a801-80632c0a44be`, `69971280-b180-4dc1-bc9a-fa0f6c644c1f`,
`38212db4-591d-40bf-8c61-91d86d1fc0ae`, `2e8975f5-eb45-46a9-b3a2-31d0e5072a9c`.

Los nombres y la categoría constituyen indicios fuertes de pruebas. No autorizan por
sí mismos el borrado de documentos confirmados ni de las existencias pendientes.

### Los dos productos Pollo

| Identificador | Hechos observados | Recomendación |
|---|---|---|
| `3ecd9073-94a8-4d83-a57a-20758d86f9d8` | Categoría Carnes, precio 15, stock 0, mínimo 6. Compra confirmada de 2 unidades `5f1361fd-06f4-4936-b4a9-c9aec9e708ad`; venta confirmada de 2 unidades `a71390b4-d20f-453f-9d85-e6b1f5534899`, ambas por S/ 30.00; 1 lote y 2 movimientos | Preservar. Puede corresponder a la demostración real reciente; no hay evidencia de que sea descartable |
| `5e28252d-8dc1-4f39-a39c-c4847c334ed4` | Mismo nombre/categoría/precio/mínimo; stock 0, versión 0; sin lotes, compras, ventas, movimientos, mermas o alertas visibles | Candidato a revisión de duplicado, no a borrado automático. Falta descartar referencias en conteos |

Categorías Bebidas `2ed9a4ed-e41b-4de1-b647-21d69ad1471f`, Carnes
`c4266b11-666a-4f52-bd9b-33bd68e1f166` y Verduras
`18d2902a-a44c-4231-998e-0a440e674fe4` no presentan evidencia de ser descartables.

### Mermas, alertas, conteos y usuarios

GET de mermas y alertas devolvió listas vacías válidas. Los movimientos observados
incluyen compras y ventas; no basta con esto para afirmar que no existen conteos.
El backend no lista conteos y sus registros no generan movimientos. No se dispone
de identificadores de conteos para consultarlos ni de acceso SQL de lectura, por lo
que esa parte del diagnóstico queda pendiente.

GET `/users` sin credenciales devuelve 401. Los documentos de desarrollo tienen el
responsable `01abb5fe-0462-4cc9-a28f-afa2467fbe7a`; los documentos de Pollo otro
responsable, pero no se dedujo quién es por su GUID. **Todos los usuarios y credenciales,
en especial el Administrador real admin@bodego.com, deben preservarse.** No se
inspeccionaron contraseñas ni hashes ni se intentó iniciar sesión.

## Plan de limpieza propuesto: ninguna acción ejecutada

1. **Opción preferida:** preparar una base separada para demostraciones y conservar
   bodego_db con su historial. Requiere autorización y configuración posterior;
   no se creó ni se cambió ninguna base en esta fase. No reutilizar credenciales
   reales ni asumir que un administrador se copia automáticamente.
2. Si se desea limpiar esta base, primero realizar y verificar un respaldo restaurable,
   detener escrituras y obtener una lista aprobada de GUID concretos. Completar una
   auditoría de lectura de inventory_counts/items y todas las referencias, mediante
   una cuenta de lectura o identificadores existentes proporcionados por el equipo.
3. Priorizar una separación visual/administrativa de datos de desarrollo, si se
   incorpora soporte explícito, antes que borrado. No existe un endpoint de archivado
   o cancelación que pueda suponerse disponible; no se inventará desde Vue.
4. Un borrador comercial no modifica stock, pero está relacionado con sus detalles,
   productos, lotes opcionales y usuario. Cualquier eliminación autorizada tendría
   que tratar primero esos detalles y después su cabecera, conservando referencias
   compartidas. Riesgo: pérdida del trabajo pendiente y de trazabilidad.
5. No borrar compras/ventas confirmadas ni sus movimientos de forma aislada. Habría
   que revisar conjuntamente documentos, detalles, lotes, mermas, alertas y conteos
   relacionados, y recalcular/verificar existencias y reportes en una copia aislada.
   Riesgo alto: stock inconsistente y estadísticas históricas incorrectas. La compra
   de 20 unidades de prueba todavía contribuye a las 19 unidades disponibles.
6. No borrar productos/categorías mientras existan relaciones. Para un duplicado
   Pollo sin referencias, evaluar primero la intención del dueño y la auditoría
   completa; solo después podría autorizarse una eliminación concreta o una
   desactivación soportada. Actualmente no hay contrato de edición/borrado de productos
   en la API integrada; no se simulará esa operación.
7. Mantener siempre usuarios/roles y credenciales reales, los documentos Pollo
   confirmados hasta decisión explícita y todos los archivos de pruebas automatizadas.

Las relaciones EF de producto/categoría, producto/lotes, documentos/detalles,
usuario/documentos, movimientos, mermas, alertas y conteos usan DeleteBehavior.Restrict,
incluidas claves compuestas lote/producto. No se deben desactivar claves foráneas ni
suponer borrado en cascada. SourceId de movimiento aporta además una relación de
negocio con la operación de origen que debe auditarse aunque no sea una FK a cada
tipo de documento. El orden definitivo de limpieza depende del grafo completo,
no de los nombres de registros ni del orden de esta lista.

## Verificación

`npm.cmd test`: 45 pruebas aprobadas (38 previas y 7 de presentación), incluyendo
traducción, fechas y zonas, moneda, cantidades, referencias/nombres, diferencias,
filtros y compilación de componentes con acciones basadas en GUID reales.
Se conserva la cobertura de IAM, Bearer, roles y operaciones con POST mock.
`npm.cmd run build`: correcto, con advertencia de bundle mayor de 500 kB.
`npm.cmd audit`: cero vulnerabilidades. `git diff --check`: sin errores;
Git informa normalización de finales de línea LF/CRLF en Windows.

La herramienta chrome-devtools-cli no está instalada en este entorno: no se realizó
revisión visual de navegador, autenticación real ni escrituras para comprobar la UI.
Los nombres de responsables de otros usuarios necesitan una sesión autorizada para
resolverse visualmente. Los listados vacíos se comprueban con mocks y GET existentes.

Antes del commit, revisar manualmente escritorio/móvil, nombres extensos y tooltips,
paneles de detalle y cierre con teclado, filtros de fecha/tipo, permisos de responsables,
selección de lotes, diferencia al contar cero y múltiples productos, y que las acciones
continúen abriendo el registro original. Cualquier prueba de registro real requiere
una decisión independiente: esta revisión no envió nuevos POST.
