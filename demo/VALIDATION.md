# Validacion de esta fase

Verificado con Node: calculos en centimos, compra/venta de varios productos, stock insuficiente, duplicados, cambios de catalogo, permisos Administrador/Empleado, 12 categorias y compatibilidad Galletas/Snacks, orden numerico y textual, previews de ajustes y mermas, clasificacion de errores HTTP y conservacion del seguimiento pendiente en almacenamiento simulado. Importador offline: 59 productos validos, ejecucion repetible sin duplicados y rechazo de server/db.json.

Comandos: `node --test tests/workflows.test.mjs` (5 pruebas), `npm.cmd run build`, `git diff --check`.

Pendiente: pruebas de interfaz en navegador de alta/edicion, alta rapida desde Compras, confirmacion/cancelacion, flujos completos contra servicios aislados con fallos de escritura inyectados, traducciones visuales y responsive. La CLI chrome-devtools no esta disponible. Las pruebas unitarias no sustituyen esas verificaciones.

No se realizaron peticiones a servicios compartidos. La fase posterior autorizada importo exclusivamente los productos 3, 4, 7 y 8. Los historiales y seguimientos review se conservaron. Ver server/MIGRATION.md. No se ha creado commit porque falta completar la validacion solicitada.

Backend ASP.NET Core: autorizacion del lado servidor, transacciones atomicas entre documento/stock/movimiento, idempotencia y conciliacion auditada; contrato autorizado para persistir motivos de ajustes; control de concurrencia y validacion de eliminacion por referencias. No se modificaron contratos HTTP ni estados de conciliacion en esta fase.

Validacion adicional de infraestructura local: node --test tests/local-infrastructure.test.mjs. Prueba stores contra una copia aislada de JSON Server, incluidos CRUD, ambos roles, compras/ventas, ajustes, mermas, errores y persistencia.
