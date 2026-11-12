// Funciones que dependen de endpoints opcionales de la API.
// En false, la app NO llama a esos endpoints (evita errores 404 si no existen)
// y muestra la función como «Próximamente». La API publicada ya los expone,
// por eso están en true.
export const FUNCIONES = {
  // GET /api/vehiculos/{id}/recordatorios, GET /api/recordatorios
  // y PATCH /api/recordatorios/{id}/concluir
  listaRecordatorios: true,
  // /api/push/clave-publica, /suscribir, /desuscribir y /notificaciones
  notificacionesPush: true,
}
