# Compras pendientes y correcciones de codigo

Respaldo previo a esta fase: `server/db.json.1794000155328.before-simplification.backup.local`.
Esta excluido de Git. No se modifico la base del proyecto ni sus seguimientos reales.

## Casos existentes

- Leche Pura Vida, compra d38ded29-13a0-42c4-8ff9-a1f1d96a1916: stock registrado 4, previsto 5, actual 4. Paso stock_attempted, sin movimiento asociado.
- Coca Cola, compra 69decdc0-05f7-4fbc-94a7-30b1418b8882: stock registrado 21, previsto 22, actual 21. Paso stock_attempted, sin movimiento asociado.
- Waza, compra 57554593-39ac-4f57-b743-bdd66babae74: ausente de la base local. Producto 7 con stock 12, sin movimiento asociado en los registros consultados. Hace falta el seguimiento del navegador original.

No hay evidencia suficiente para proponer una escritura correctora para ninguno.
Mantener registros y bloqueos. Para Leche y Coca Cola hacen falta respuestas o logs originales de actualizacion del catalogo anterior y un historial fiable de cambios; contrastar con comprobantes e inventario fisico. Para Waza, obtener primero el seguimiento y origen de la instancia utilizada. Un conteo fisico o un stock actual coincidente por si solos no prueban que una compra escribio stock. No cambiar phase a planned ni borrar el pendiente.

## Fallos reproducibles de codigo corregidos

1. Una excepcion al limpiar el marcador local despues de la ultima confirmacion del servidor entraba en el catch de procesamiento y reescribia completed como review. La limpieza ahora queda fuera de ese catch: si falla, se conserva el marcador completado y el resultado confirmado.
2. Se comparaban lineas JSON con JSON.stringify sin normalizar el orden de propiedades. Una respuesta semanticamente igual con propiedades reordenadas se rechazaba. Ahora se comparan documentos completos con orden canonico de claves, preservando el orden de arrays y los valores. JSON Server normal conserva UUID y referencias en las pruebas; no se encontro un fallo de ID propio de JSON Server.
3. Un fallo de lectura previo al primer intento de escritura aparecia con mensaje de resultado incierto. Ahora informa que no se iniciaron escrituras, conserva el carrito y exige restablecer la consulta antes de confirmar otra vez.
4. La respuesta de stock no se comprobaba antes de continuar al movimiento. Ahora se comprueban ID, stock y estado para una actualizacion comercial; una respuesta discordante mantiene la operacion en revision.
5. Leer historiales eliminaba marcadores locales terminales e ignoraba discrepancias con una version local incierta. Ahora la lectura no limpia el seguimiento y conserva un bloqueo conservador si existe esa discrepancia.

Estos fallos son reproducibles mediante inyeccion de fallos. No demuestran la causa exacta de las tres operaciones historicas, para las cuales faltan respuestas originales. La fase stock_attempted se persiste antes de intentar la escritura, por lo que no confirma que esta haya ocurrido.

## Interfaz y limites

Sin ruta /commercial/review ni entrada de menu adicional. La evidencia disponible se consulta en un desplegable del detalle comercial pendiente, solo para administrador. El empleado conserva el estado general. No hay acciones de correccion, reintento o desbloqueo.

JSON Server sigue siendo el unico origen configurable con VITE_API_BASE_URL. No ofrece transacciones, concurrencia segura ni autorizacion real. No se agregaron compensaciones, reintentos de stock/movimientos o dependencias.

## Pruebas

`node --test --test-concurrency=1 tests/workflows.test.mjs tests/local-infrastructure.test.mjs tests/reconciliation.test.mjs tests/commercial-reliability.test.mjs`

Copias temporales y puertos aislados: compras/ventas de uno y varios productos, IDs, stock y movimientos enlazados, persistencia, permisos, fallos de lectura, HTTP 503, desconexion, respuesta de movimiento perdida despues de persistir, respuesta de stock incorrecta, respuestas JSON reordenadas, limpieza local fallida y doble envio concurrente. El escenario de cancelacion verifica ausencia de escritura cuando no se envia el comando; falta comprobacion visual del dialogo mediante navegador. Las traducciones se comprueban en las pruebas existentes.
