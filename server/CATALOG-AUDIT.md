# Revision del catalogo

Revision de solo lectura de server/db.json y GET /products, /purchases, /sales, /operations y /wastes. Los endpoints coincidieron con el archivo. Siete productos, sin identificadores duplicados ni errores de validacion de campos obligatorios. No se realizaron eliminaciones, cambios de ID ni escrituras sobre la base del proyecto.

| Producto | ID real | Stock | Diagnostico |
| --- | --- | ---: | --- |
| Coca Cola 500ml | 1 | 21 | Compra pendiente persistida. Bloqueado; tambien requiere atencion por vencimiento registrado. |
| Leche Pura Vida | 2 | 4 | Compra pendiente persistida. Bloqueado; tambien requiere atencion por vencimiento registrado. |
| Nesquik | 3 | 3 | Datos validos; sin pendiente remoto. Tiene compra y movimiento historicos. |
| Pepsi 500 ml | 4 | 10 | Datos validos; sin referencias remotas ni pendientes remotos. |
| waza | 7 | 12 | Datos validos; sin referencias remotas. Seguimiento local pendiente reportado previamente; falta consultar el navegador original. No eliminar. |
| Leche Condensada | 8 | 12 | Datos validos; sin referencias remotas ni pendientes remotos. |
| Pan Bimbo | X9PeXW7 | 20 | Datos validos; compra completada y movimiento 4 correctamente vinculados. Conservar. |

Disponibilidad sujeta a los seguimientos locales de cada navegador. Ningun producto tiene stock cero. No se demuestra que algun producto sea una prueba innecesaria: no se propone eliminar ninguno. Ausencia de referencias del servidor no prueba ausencia de seguimientos locales. Las fechas vencidas corresponden a alertas existentes; no se cambiaron reglas comerciales para bloquear por vencimiento.

## Identificadores y presentacion

La version instalada de JSON Server utiliza createId en node_modules/json-server/lib/server/mixins.js: si la coleccion esta vacia devuelve 1; si el ID seleccionado es numerico finito lo incrementa; en otro caso usa nanoid(7). Por eso una coleccion mixta puede generar X9PeXW7. No es un defecto ni se debe renumerar.

Se ordena por nombre y se oculta la columna del ID tecnico. El detalle conserva el identificador real con una etiqueta explicita; busqueda, rutas y relaciones mantienen los ID originales comparados como texto. No se crea un codigo alternativo ficticio.

## Cambios

Orden compartido y estable para tabla, selector y resultados comerciales; mensajes de bloqueo, agotado, precio/costo invalido y stock invalido. La tabla consulta pendientes para explicar restricciones conocidas y avisa si no puede verificarlos. Los adaptadores codifican el ID como segmento URL sin convertirlo a numero. Los precios desconocidos no se presentan como cero. Se rechazan existencias booleanas en la validacion comercial, que antes Number(true) interpretaba como una unidad.

## Pruebas

node --test --test-concurrency=1 tests/catalog-identifiers.test.mjs tests/workflows.test.mjs tests/local-infrastructure.test.mjs tests/reconciliation.test.mjs tests/commercial-reliability.test.mjs

Trece pruebas satisfactorias. Copias aisladas de JSON Server: ID numerico 9001 y alfanumerico Alpha7, ID generado por servidor, creacion/edicion, proteccion del stock en edicion, compra multiple desde cero, venta multiple, stock insuficiente, permisos, bloqueo por seguimiento local, movimientos enlazados e historial persistente. Las demas suites comprueban fallos parciales y consultas sin efectos secundarios. La base original queda identica durante las pruebas.

Pendiente la comprobacion visual de responsive en navegador, no disponible en esta sesion. No se modificaron las reglas de pendientes ni se conecto MockAPI. Sin staging, commit, push o merge.
