# BodeGo

Prototipo universitario: Vue 3, JavaScript, Vite, Pinia, Axios, PrimeVue y JSON Server. Conserva IAM, Inventory, Operations, Commercial, Monitoring, Reporting y Shared.

## Ejecutar en otra computadora

1. Instalar Node.js 22.12 o posterior de la rama 22, o Node.js 24, con npm.
2. Clonar y abrir el proyecto en WebStorm o una terminal:

```sh
git clone --branch feature/commercial-purchases-sales https://github.com/SirEthan04/Proxy_Web_App_Front-end.git
cd Proxy_Web_App_Front-end
npm install
```

Esta version se desarrolla en feature/commercial-purchases-sales. Clonar esa rama permite obtener el codigo y la semilla; las bases locales, respaldos y perfiles no se distribuyen. No se ha realizado merge a main ni develop.

3. En una primera terminal, iniciar JSON Server:

```sh
npm run server
```

Se crea server/work-db.json desde server/seed.json solo si no existe; de lo contrario conserva sus datos. La consola muestra todos los recursos disponibles, incluidos products, users, operations, wastes, purchases y sales en http://localhost:3001.

4. En una segunda terminal, iniciar solamente Vue + Vite:

```sh
npm run dev
```

Vite muestra `Local: http://localhost:5174/` y consulta la API http://localhost:3001. Este comando no inicia ni modifica JSON Server.

5. Abrir **http://localhost:5174** en Brave, Chrome, Edge o Firefox.
6. Para detener todo, pulsar **Ctrl+C en cada terminal**. Cada comando controla unicamente su propio servicio.

En WebStorm usar dos terminales independientes o dos configuraciones npm, server y dev, con la raiz del proyecto como directorio de trabajo. No se necesita un perfil especial. No se abre ningun navegador automaticamente. Si PowerShell bloquea npm.ps1, usar npm.cmd con los mismos argumentos.

| Servicio | URL |
| --- | --- |
| Vite | http://localhost:5174 |
| JSON Server | http://localhost:3001 |

Los puertos son fijos. Si estan ocupados, el comando informa el puerto y trata de identificar el proceso y su PID con las herramientas disponibles del sistema; si no puede, lo indica. No inicia silenciosamente en otro puerto ni mata procesos ajenos. Detener la ejecucion anterior con Ctrl+C o identificar el programa desde el administrador de procesos antes de cerrarlo y volver a ejecutar el comando del servicio correspondiente. Vite utiliza strictPort y JSON Server comprueba su puerto. Si un servicio no inicia, el otro permanece independiente. Un proceso antiguo node scripts/dev.mjs del arranque conjunto puede ocupar ambos puertos: detenerlo con Ctrl+C en su terminal antes de abrir las dos nuevas terminales. Si esa terminal no existe, comprobar el PID y la linea de comando en el administrador de procesos antes de finalizar exclusivamente ese proceso; no cerrar todos los procesos Node.

## Datos locales reproducibles

La semilla versionada **server/seed.json** contiene seis productos y dos usuarios demo. Compras, ventas, movimientos y mermas comienzan vacios. Precios, stock y vencimientos son ficticios; no hay pendientes antiguos ni historiales personales. No se copia automaticamente server/db.json ni la demo anterior.

El primer arranque crea **server/work-db.json**, excluido de Git. Los siguientes lo reutilizan sin sobrescribirlo. Una base incompleta o corrupta produce un error y se conserva para revisarla. Los ID internos se mantienen; la columna N.o solo indica la posicion visible y se recalcula al ordenar o filtrar.

| Rol | Correo | Clave exclusivamente demo |
| --- | --- | --- |
| Administrador | admin@bodego.com | 1234 |
| Empleado | empleado@bodego.com | 1234 |

No usar datos o claves reales. JSON Server expone usuarios y no proporciona autenticacion, permisos, concurrencia ni transacciones seguras. Eso corresponde al futuro backend ASP.NET Core.

server/db.json, server/demo-db.json, los respaldos y perfiles anteriores permanecen intactos y no los utiliza el arranque estandar. demo:dev y demo:server son alias de Vite y JSON Server respectivamente; no inician servicios conjuntos. demo:prepare queda como herramienta historica explicita; no se ejecuta al iniciar. demo:browser fue retirado.

## Conservar, reiniciar y recuperar datos

Para conservar datos, detener y volver a iniciar. Para un respaldo manual, detener los servicios y copiar server/work-db.json a un lugar seguro. No publicar respaldos ni perfiles en Git.

Para reiniciar deliberadamente solo la base de trabajo, detener npm run server y npm run dev en sus respectivas terminales y ejecutar:

```sh
npm run data:reset -- --backup-and-reset
```

Sin esa opcion no cambia nada. Rechaza el reinicio si el puerto 3001 esta ocupado. Antes de escribir crea un respaldo **server/work-db.json.FECHA.backup.local**, excluido de Git. No modifica el original, las copias anteriores ni los seguimientos del navegador.

Para recuperar un respaldo, detener servicios, guardar otra copia del archivo de trabajo actual y copiar el respaldo elegido sobre server/work-db.json; despues reiniciar.

Una instalacion nueva funciona con localStorage vacio. Si reutilizas un navegador con operaciones inciertas, sus seguimientos siguen protegidos y no se limpian automaticamente. Despues de un reinicio deliberado de base puedes usar otro perfil para una demostracion nueva conservando el original. El uso normal no depende de ningun perfil concreto.

## Futuro backend ASP.NET Core

La unica variable HTTP del frontend es **VITE_API_BASE_URL**. Desarrollo utiliza http://localhost:3001, configurado en .env.development y documentado en .env.example.

Para otro backend, crear .env.development.local con VITE_API_BASE_URL apuntando a su URL y ejecutar **npm run dev:frontend**, que inicia solo Vite. Reiniciar Vite tras cambiar la variable. El backend debe permitir CORS desde http://localhost:5174 y proporcionar los contratos correspondientes. Para un build con otra URL usar .env.production.local antes de npm run build. No se consume MockAPI.

## Validaciones y navegadores

```sh
npm test
npm run build
git diff --check
```

Las pruebas usan fixtures sinteticos versionados, la semilla y copias temporales; no requieren bases, respaldos ni perfiles de esta computadora. Cubren roles, login, productos, IDs mixtos, numeracion renderizada, compras, ventas, stock, movimientos, mermas, alertas, reportes, persistencia, traducciones y fallos parciales.

El frontend usa APIs estandar de versiones actuales de Brave, Chrome, Edge y Firefox sobre localhost. No utiliza extensiones ni APIs exclusivas de Edge. Hace falta permitir almacenamiento local para conservar sesion y seguimientos. La validacion visual manual en los cuatro navegadores y la ejecucion real en macOS/Linux siguen pendientes; no se presentan como pruebas realizadas.

Las escrituras inciertas siguen bloqueadas y no se reenvian automaticamente. El catalogo opcional de 59 productos continua separado en demo/catalog.json; el arranque no lo importa.
