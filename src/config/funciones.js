// Funciones que dependen de endpoints que la API publicada todavía no expone.
// Mientras estén en false, la app NO llama a esos endpoints (evita errores 404)
// y muestra la función como «Próximamente». Cuando la API los publique,
// basta con cambiar el valor a true.
export const FUNCIONES = {
  // GET /api/vehiculos/{id}/recordatorios, GET /api/recordatorios
  // y PATCH /api/recordatorios/{id}/concluir
  listaRecordatorios: false,
  // /api/push/clave-publica, /suscribir, /desuscribir y /notificaciones
  notificacionesPush: false,
}
