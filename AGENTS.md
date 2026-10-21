# Autiva Web — contexto para el agente

## Qué es Autiva
PWA de expediente digital vehicular: registro de cargas de combustible, servicios de mantenimiento, gastos, recordatorios y estadísticas por vehículo. Proyecto escolar (UTTT, Aplicaciones Web Progresivas) de un equipo de dos personas.

## Arquitectura
Cliente-servidor desacoplado. Este repo es solo el **frontend**.
- **Frontend (este repo):** SPA en React + Vite, construida como PWA con el modelo **App Shell + offline-first**.
- **Backend (otro repo, autiva-api):** API REST en ASP.NET con autenticación JWT. Base URL en la variable `VITE_API_URL`.
- **Despliegue:** Azure Static Web Apps (front) y Azure App Service (API).

## Stack
- React + Vite (JavaScript), React Router
- `vite-plugin-pwa` con estrategia **injectManifest** (service worker propio en `src/sw.js`)
- Workbox (`workbox-precaching`, `workbox-routing`, `workbox-strategies`)
- Dexie (IndexedDB) para la captura offline

## Estructura de carpetas (organizada por funcionalidad)
```
src/
  app/            Router, layout principal, rutas protegidas
  features/
    auth/         registro, login, recuperar contraseña
    vehiculos/    alta, listado, detalle (expediente), edición
    cargas/       registro, historial, rendimiento km/L
    servicios/    registro, historial, próximo servicio
    recordatorios/
    gastos/
    estadisticas/
    perfil/       datos del usuario y preferencias
  offline/        db.js (Dexie) y syncQueue.js (cola de pendientes)
  push/           suscripcion.js (permiso y suscripción Web Push)
  api/            cliente.js (fetch con JWT, base URL desde VITE_API_URL)
  components/     componentes reutilizables (botones, inputs, tarjetas)
  sw.js           service worker
public/
  pwa-192.png, pwa-512.png, pwa-512-maskable.png
  staticwebapp.config.json
```
Cada feature agrupa sus propias páginas, componentes y llamadas a la API (por ejemplo `features/cargas/pages/`, `features/cargas/components/`, `features/cargas/cargasApi.js`).

## Requisitos PWA
1. **Manifest** en `vite.config.js`: name y short_name "Autiva", `display: "standalone"`, `start_url: "/"`, íconos 192, 512 y 512 maskable.
2. **Service worker (`src/sw.js`):**
   - `precacheAndRoute(self.__WB_MANIFEST)` y `cleanupOutdatedCaches()` para el App Shell.
   - `NavigationRoute` hacia `index.html` para que las rutas de React funcionen offline.
   - Peticiones GET a la API con estrategia `NetworkFirst` (timeout de 4 s).
   - Eventos `push` y `notificationclick` para mostrar notificaciones y abrir la URL indicada.
3. **Offline (HU-018):** las cargas y los servicios se guardan primero en IndexedDB con un id generado con `crypto.randomUUID()`. Se envían en lote a `POST /api/sincronizacion` al volver la conexión (evento `online`) y al abrir la app. No depender de la Background Sync API, porque Safari no la soporta.
4. **Push (HU-016):** obtener la clave VAPID con `GET /api/push/clave-publica`, suscribirse con `pushManager.subscribe` y enviar la suscripción a `POST /api/push/suscripciones`. Pedir el permiso solo después de un clic del usuario.
5. **`public/staticwebapp.config.json`** con `navigationFallback` hacia `/index.html`.

## Reglas de trabajo
- No crear ramas nuevas: trabajar en la rama que ya está activa.
- Textos de la interfaz en español.
- Mensajes de commit con el formato del catálogo de endpoints, por ejemplo `feat(cargas): agregar registro de carga (HU-008)`.
- No inventar endpoints: usar solo los del catálogo (`/api/auth`, `/api/vehiculos`, `/api/cargas`, `/api/servicios`, `/api/recordatorios`, `/api/push`, `/api/sincronizacion`, `/api/usuarios/me`).
- Para probar la PWA, usar `npm run build && npm run preview`, no solo `npm run dev`.