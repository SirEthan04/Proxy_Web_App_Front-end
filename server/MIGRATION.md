# Migracion local validada

Se importaron exclusivamente ID 3 (Nesquik), 4 (Pepsi 500 ml), 7 (waza) y 8 (Leche Condensada), tras repetir la consulta GET del catalogo anterior y compararla con el snapshot revisado. Los productos 1 y 2 coincidian y se conservaron. No se importaron usuarios ni credenciales.

JSON Server fue detenido antes de escribir. Respaldo creado antes de la importacion: `server/db.json.1793997490810.backup.local`. Esta excluido de Git por `*.local`. El snapshot de productos `server/products-snapshot.local` tambien esta excluido.

Estado tras importar: seis productos (1, 2, 3, 4, 7, 8), dos usuarios demo, tres movimientos, dos mermas, tres compras (dos review y una completed), cero ventas. Todas las referencias a productos existen. La compra completada y el movimiento vinculados al producto 3 mantienen sus ID y datos originales.

Se compararon todas las colecciones contra el respaldo: usuarios, movimientos, mermas, compras y ventas quedaron iguales, con sus fechas intactas. Los productos originales tampoco cambiaron. No se concilio ni reenvio ninguna operacion pendiente.

## Importador reutilizable

`node server/import-products.mjs SNAPSHOT [BASE]` inspecciona sin escribir. La opcion `--apply` agrega exclusivamente productos faltantes, rechaza conflictos, comprueba referencias y crea respaldo antes de escribir. No ejecutarlo con JSON Server activo ni importar otros productos sin revisar su alcance. No sobrescribe productos existentes ni importa campos ajenos al catalogo.

## Infraestructura

El frontend utiliza exclusivamente `VITE_API_BASE_URL=http://localhost:3000`. Ambos alias HTTP comparten una instancia. El login y la restauracion de identidad consultan usuarios locales; las credenciales no se guardan en la sesion. La autenticacion sigue siendo demostrativa.

## Validacion

`node --test tests/workflows.test.mjs tests/local-infrastructure.test.mjs`: pruebas de dominio y de stores contra JSON Server aislado, incluidos escritura comercial, CRUD, ambos roles, persistencia y errores inyectados. Se verifica que la base del proyecto no cambia durante las pruebas. Build y diff se verifican por separado.

Pendiente: comprobacion visual responsive y de interacciones mediante navegador. No hay herramienta de navegador instalada disponible en esta sesion. El backend futuro debe implementar transacciones, idempotencia, concurrencia, autorizacion real y conciliacion auditada. No se cambio la logica de operaciones pendientes.

No se realizo staging, commit, push ni merge. Mensaje propuesto para un commit posterior tras revision: `refactor(infrastructure): migrate BodeGo to local JSON Server`.
