# Inicio vigente: dos terminales independientes

Usar npm run server para JSON Server 3001 con server/work-db.json y npm run dev para Vite 5174. La base se crea desde server/seed.json solo si falta. No hay arranque conjunto ni apertura automatica de navegador. Consulta README.md. El resto de este documento conserva informacion historica y no es una instruccion de inicio vigente.

# Configuracion sustituida por el arranque portatil

El arranque vigente es npm run dev: Vite 5174 y JSON Server 3001 con server/work-db.json, creado desde server/seed.json. No usa perfiles especiales ni abre Edge. demo:dev y demo:server son alias de ese entorno; demo:browser fue retirado. Consulta README.md.

La base server/demo-db.json y el perfil anteriores se conservan, pero no se usan en el arranque estandar. Lo siguiente documenta la preparacion historica, no las instrucciones actuales de inicio.

# Demostracion limpia de BodeGo

El responsable confirmo que las compras pendientes de Coca Cola y Leche Pura Vida fueron pruebas de desarrollo sin operaciones reales. Se creo `server/demo-db.json`, separado de `server/db.json`. Solo se excluyeron de la copia estas compras:

- d38ded29-13a0-42c4-8ff9-a1f1d96a1916: Leche Pura Vida, producto 2.
- 69decdc0-05f7-4fbc-94a7-30b1418b8882: Coca Cola, producto 1.

Se conservaron siete productos con sus ID y existencias exactas, dos compras completadas, cuatro movimientos, dos mermas, dos usuarios demo y cero ventas. Se validaron referencias de productos, compras/ventas, lineas y movimientos. Ningun movimiento referenciaba las compras excluidas. No se marco ninguna operacion como completada ni se altero el stock para representar una compra antigua.

Los datos originales y todos sus respaldos siguen intactos. `server/demo-db.manifest.local` registra los ID excluidos, la declaracion de procedencia y el hash del archivo original. La base de demo, manifiesto y perfil de navegador estan excluidos de Git.

## Iniciar desde WebStorm

Abrir el proyecto y usar terminales en su raiz:

Terminal 1:

```sh
npm.cmd run demo:server
```

Terminal 2:

```sh
npm.cmd run demo:dev
```

Terminal 3 (abre un Edge con perfil propio para la demostracion):

```sh
[retirado: abrir manualmente el navegador elegido]
```

URL del frontend: **http://localhost:5174**. API: **http://127.0.0.1:3001**.

La configuracion `.env.demo` contiene `VITE_API_BASE_URL=http://127.0.0.1:3001`. El modo demo no cambia `.env.development`. Si los puertos estan ocupados por servicios de esta misma sesion, ya estan iniciados: abrir el navegador; no arrancar una segunda copia. Vite usa strictPort para evitar cambiar silenciosamente la URL.

En WebStorm tambien pueden crearse configuraciones npm para los scripts `demo:server`, `demo:dev` y `demo:browser`, con esta raiz como directorio de trabajo.

El perfil separado reside en `demo/browser-profile.local`. No iniciar sesion ni sincronizar un perfil personal alli. Se conserva entre usos: si una nueva operacion queda realmente incierta, su seguimiento debe mantenerse; el lanzador no limpia ni reinicia ese perfil. El seguimiento antiguo de waza del navegador de trabajo no se copia ni se modifica.

Las cuentas siguen siendo las cuentas demo existentes: admin@bodego.com y empleado@bodego.com, clave demo 1234. No usar datos ni claves reales: JSON Server no proporciona autenticacion segura.

## Volver al entorno original

Detener `demo:dev` y `demo:server` con Ctrl+C en sus terminales y cerrar la ventana Edge de demostracion. No eliminar su base o perfil para ocultar errores nuevos.

En terminales separadas:

```sh
npm.cmd run server
npm.cmd run dev
```

Abrir la URL original que anuncie Vite (normalmente http://localhost:5173) en el navegador habitual. La API original sigue en http://localhost:3000 y usa server/db.json. Sus compras y seguimientos antiguos permanecen; esta demostracion no los concilia ni los desbloquea.

## Preparacion y protecciones

La base ya fue creada. `npm.cmd run demo:prepare` permite preparar la misma copia autorizada cuando aun no existe. Rechaza datos cambiados, referencias inconsistentes y sobrescrituras: no se usa para resetear una demo en la que ya se registraron operaciones. Nunca elimina el archivo original ni sus respaldos. No importa el catalogo semilla de 59 productos.

La columna N.o indica la posicion en la lista, se recalcula al ordenar o filtrar y no sustituye los ID internos, incluido X9PeXW7 de Pan Bimbo.

## Validacion

`node --test --test-concurrency=1 tests/catalog-identifiers.test.mjs tests/catalog-rendering.test.mjs tests/workflows.test.mjs tests/local-infrastructure.test.mjs tests/reconciliation.test.mjs tests/commercial-reliability.test.mjs tests/demo-environment.test.mjs`

La prueba especifica de demo usa una copia temporal de server/demo-db.json y un almacenamiento de navegador simulado vacio. Verifica compras y ventas de Coca Cola, Leche Pura Vida y waza, stock, movimientos, persistencia, ambos roles y ausencia de bloqueos antiguos. Las otras pruebas cubren fallos parciales, desconexion, prevencion de duplicados, seguimientos inciertos y numeracion renderizada. Las pruebas no escriben ni en la base original ni en la de demostracion preparada para el usuario.

Comprobaciones adicionales: npm.cmd run build y git diff --check. Sin staging, commit, push ni merge.
