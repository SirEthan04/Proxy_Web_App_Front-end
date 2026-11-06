# Catalogo de demostracion aislado

catalog.json contiene 59 productos. Precio S/ 3.50 y vencimiento 2030-12-31 son ficticios; stock inicial 0. El frontend no lee este archivo.

Crear una base JSON separada, fuera de server/db.json, con `{"demoOnly":true,"products":[]}`. Ejecutar `node demo/import-catalog.mjs RUTA --isolated-demo-only`. El importador funciona sin red, conserva registros y omite nombres existentes. Levantar JSON Server sobre esa copia y configurar explicitamente las variables Vite para servicios locales de prueba. Nunca usar MockAPI compartido.

Categorias: Galletas y Snacks anteriores se conservan como valores historicos. Correspondencia propuesta para una futura migracion autorizada: ambos a Galletas y snacks. No se aplica migracion. Los filtros incluyen valores antiguos presentes y Editar conserva la categoria actual.
