# Primera integracion Inventory

API: VITE_API_BASE_URL=http://localhost:5281 (origen sin /api/v1).
JSON Server: VITE_LEGACY_API_BASE_URL=http://localhost:3001.
.env.development.local esta ignorado por Git; reiniciar Vite tras cambiar variables.

Las pantallas Products, NewProduct y ProductDetails usan el store real-inventory
(application/inventory.js) y el cliente inventory-api.js. Los servicios y stores
anteriores quedan para los otros modulos. QuickProduct, usado desde compras,
sigue siendo parte del flujo de demostracion con JSON Server. No mezcla sus IDs
ni su stock con los datos reales. Los catalogos de esos modulos son independientes.

GET /api/v1/products, /products/{id}, /products/low-stock y /categories
estan conectados. POST /products y /categories estan implementados sin probar
escrituras. GET /categories/{id} queda disponible en el servicio.
No existen PUT/PATCH/DELETE equivalentes. La ruta de edicion conserva una
pantalla informativa. El stock inicial es cero y no se envia desde el formulario.
El vencimiento pertenece al lote, no al contrato de creacion del producto.
Los permisos del login local se conservan; la API inspeccionada no configura
autenticacion ni autorizacion. No se cambio el backend.

## CORS pendiente en BodeGo.API/Program.cs

Antes de builder.Build():

```csharp
builder.Services.AddCors(options => options.AddPolicy("VueInventory", policy =>
    policy.WithOrigins("http://localhost:5174")
          .WithMethods("GET", "POST")
          .WithHeaders("Content-Type")));
```

Antes de app.MapControllers(), despues de app.UseHttpsRedirection():

```csharp
app.UseCors("VueInventory");
```

No requiere credenciales ni origen comodin. Usar exactamente el origen autorizado;
si Vite arranca en otro puerto, fijar 5174 o autorizar ese origen explicitamente.
Comprobar que HTTP no redirija la preflight hacia HTTPS. Las consultas actuales
responden 200 por HTTP; OPTIONS devuelve 405 sin cabeceras CORS.

## Verificacion

npm.cmd audit: cero vulnerabilidades. npm.cmd run build: correcto, advertencia
por bundle superior a 500 kB. git diff --check: correcto.
No hay script de tests ni archivos de pruebas automatizadas en este frontend.
GET reales: productos, categorias, stock bajo y detalle de ambos: HTTP 200.
No se ejecutaron POST ni se escribieron datos de prueba. No se verifico el flujo
completo en navegador porque CORS sigue pendiente.

Desde Vue: iniciar JSON Server para login y modulos antiguos, iniciar API y Vite
en 5174. Tras autorizar y aplicar CORS, revisar listado, refresco, filtros,
stock bajo y detalles por GUID. Revisar selector de categorias real y stock
inicial de solo lectura. Solo con autorizacion para escribir datos reales,
registrar categoria/producto y verificar persistencia al refrescar. Detener API
para comprobar error y reintento. Verificar que Network use 5281/api/v1 para
Inventory y 3001 para los demas modulos. Comprobar 400/404/409/500 en un entorno
de pruebas; sus mensajes estan mapeados, no se provocaron errores de escritura.

## Git

Rama feature/integracion-backend, inicialmente identica a
origin/feature/commercial-purchases-sales (dcc7782). Contiene siete commits sobre
origin/develop; un PR a develop incluiria esos cambios previos. Informacion basada
en referencias locales, sin fetch. No se hicieron commits ni push.
package-lock.json conserva el cambio previo del usuario, sin editarlo.
