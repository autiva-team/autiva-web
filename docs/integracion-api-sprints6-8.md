# Integración del API con las vistas

Revisión del 15 de noviembre de 2026. Se contrastaron los controladores, DTO y catálogos del repositorio hermano `autiva-api` con la guía de frontend de los sprints 6–8. Se mantuvo la rama activa y la organización por feature del frontend.

## Entornos

- Desarrollo: `.env.development`, API `https://localhost:7043`.
- Producción y `npm run build`: `.env.production`, API `https://autiva-api-czb7d8cxc6f7cgew.mexicocentral-01.azurewebsites.net`.
- Una variable `VITE_API_URL` definida en el proceso de CI tiene prioridad sobre los archivos de entorno. No se alterna automáticamente de servidor al fallar una petición.
- Para una compilación contra el backend local: `npm run build -- --mode development`, seguida de `npm run preview`.

El API local no estaba iniciado durante esta revisión: no se pudo consultar Swagger por HTTP. El análisis local se realizó sobre el código fuente. El API público respondió 401 sin credenciales en `/api/usuarios/me`, `/api/usuarios/me/preferencias` y las rutas de gastos y estadísticas de un GUID de prueba; `/swagger/v1/swagger.json` respondió 404. Esto comprueba disponibilidad y protección, pero no sustituye pruebas de respuestas autenticadas ni demuestra por sí solo todos los contratos publicados.

## Vistas y rutas integradas

| Función | Rutas del API | Vista |
| --- | --- | --- |
| Resumen mensual de gastos | GET `/api/vehiculos/{id}/gastos/resumen?anio=&mes=` | Gastos: total, variación, promedio diario y distribución |
| Captura de otros gastos | POST `/api/vehiculos/{id}/gastos` | Modal con categoría, concepto, monto, fecha y odómetro opcional |
| Historial de otros gastos | GET `/api/vehiculos/{id}/gastos?anio=&mes=&categoriaId=&pagina=&tamano=` | Gastos: filtros y paginación; cargas y servicios mantienen su historial |
| Edición de vehículo | PUT `/api/vehiculos/{id}` | Detalle del vehículo → Editar |
| Eliminación de vehículo | DELETE `/api/vehiculos/{id}` | Confirmación; recarga vehículos y elimina pendientes locales asociados |
| Edición de carga | PUT `/api/cargas/{id}` | Historial → Ver detalle → Editar |
| Eliminación de carga | DELETE `/api/cargas/{id}` | Confirmación; recarga historial y rendimiento |
| Edición de servicio | PUT `/api/servicios/{id}` | Historial → Ver detalle → Editar |
| Eliminación de servicio | DELETE `/api/servicios/{id}` | Confirmación; recarga historial y próximo servicio |
| Próximo servicio | GET `/api/vehiculos/{id}/servicios/proximo` | Avance, km pendientes o atraso y fecha estimada cuando existe |
| Recuperación de contraseña | POST `/api/auth/recuperar-contrasena` | Login → Recuperar contraseña, sin Authorization |
| Restablecimiento | POST `/api/auth/restablecer-contrasena` | Ruta pública `/restablecer-contrasena?token=...`, incluso con sesión existente |
| Estadísticas | GET `/api/vehiculos/{id}/estadisticas?periodo=` | Selector 1M, 3M, 6M, 1A, costos, distancias y rendimiento mensual |
| Perfil | GET y PUT `/api/usuarios/me` | Datos del servidor y edición de nombre/correo; actualiza el menú |
| Preferencias | GET y PUT `/api/usuarios/me/preferencias` | Guarda los cuatro campos; última sincronización de solo lectura |

No se agregaron rutas de API ajenas al backend. La navegación conserva el mecanismo de vistas de `App.jsx`; no se añadió una migración de router.

## Cambios de comportamiento

- La captura de cargas y servicios guarda primero un GUID en IndexedDB y usa el lote de sincronización. Los eventos de apertura y conexión siguen funcionando sin Background Sync.
- La cola elimina únicamente ids confirmados o fallidos explícitamente por la API. Conserva los no mencionados y comunica los motivos de los fallidos.
- Los recordatorios conservan el orden entregado por el servidor. Al concluir, un 404 o 409 muestra el mensaje y recarga la lista.
- El año del vehículo se valida desde 1950 hasta el año siguiente al actual.
- La edición de cargas preserva la fecha UTC original, incluidos segundos, si no se cambia el control, y conserva el valor de tanque lleno.
- Los formularios PUT envían todos los campos del contrato, convirtiendo números y opcionales.
- Las estadísticas distinguen null de cero; los meses sin rendimiento no se convierten en puntos de valor cero. La preferencia mpg convierte el rendimiento y la distancia mostrados en estadísticas; los formularios continúan capturando kilómetros.
- Desactivar los avisos de cuenta guarda la preferencia y desuscribe el dispositivo si estaba activo. La autorización del navegador sigue solicitándose por clic.

## Limitaciones detectadas en el backend

`CargaResponse` local no devuelve `folio`, aunque el PUT lo acepta. El campo de edición pide confirmarlo al editar; no es posible recuperar automáticamente un folio anterior con ese contrato. Además, `CargaSincronizacionDto` no contiene `folio`: la captura por lote no lo persiste. El formulario de alta no pide ese dato para evitar que se capture y luego se pierda. Puede agregarse mediante el formulario de edición. Conviene incluir ese campo en ambos DTO del backend para mantenerlo de extremo a extremo. No se modificó el repositorio del API.

La guía indica que el correo de recuperación aún no dispone de servidor SMTP. No se enviaron correos ni se crearon o eliminaron registros en producción durante la validación.

## Validación

- Vitest: 118 pruebas aprobadas, incluidas recuperación, token, formularios de edición, gastos, periodos, próximo servicio y sincronización parcial.
- ESLint de archivos modificados y nuevos: aprobado.
- `npm run build`: aprobado, con service worker generado mediante injectManifest.
- Se probó la compilación con `npm run preview`: la ruta de restablecimiento y el manifest respondieron HTTP 200. La revisión posterior de diseño generó 17 capturas en navegador con datos de prueba para escritorio, móvil y modo oscuro, sin errores de JavaScript ni desbordamientos horizontales en las pantallas comprobadas. No se probaron operaciones autenticadas contra el servidor real.
- `npm run lint` global tiene errores previos de Fast Refresh en `components/Aviso.jsx` y `context/TemaContext.jsx`, y avisos en los reportes de cobertura generados. No forman parte de esta integración.

## Guardado offline, rapidez y marca

Se conserva el diseño oficial. Se reemplazó únicamente la imagen del logo y sus derivados de favicon e instalación; el indicador de conexión ahora mantiene su texto visible al quedar sin red en móvil.

Las altas de vehículos, cargas y servicios se persisten en IndexedDB antes de enviar datos. El vehículo recibe un GUID temporal; al registrar con `POST /api/vehiculos`, se remapean sus cargas y servicios al GUID del servidor y se envían a `POST /api/sincronizacion`. Los registros se separan por cuenta. Las validaciones rechazadas de un vehículo se conservan para su corrección; las fallas de red y servidor se reintentan al reconectar, volver a la app y cada 30 segundos mientras está visible. Si se pierde la respuesta del alta, se reconcilia por placas y datos del vehículo antes de repetir el POST.

Las consultas GET tienen caché local por cuenta, deduplicación de peticiones simultáneas y revalidación en segundo plano. El arranque carga vehículos, perfil e inicio en paralelo; seleccionar otro vehículo ya no repite ese arranque. Las pantallas se cargan por módulos, con todos sus estilos precargados para mantener el aspecto oficial y todos los módulos incluidos en el App Shell offline. La caché del service worker también se separa por sesión.

En la prueba de navegador con un API local de prueba y el service worker real, guardar un vehículo sin internet tomó 72 ms y abrir vehículos con caché tomó 327 ms. Se recargó la app sin red y se conservaron el vehículo y su carga; al reconectar se registraron una sola vez, con el GUID correcto. Estas mediciones corresponden al entorno de prueba, no garantizan el tiempo de una primera consulta al API remoto.
