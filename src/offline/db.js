import Dexie from 'dexie'

// Base de datos local (IndexedDB) para captura offline.
export const db = new Dexie('autiva-offline')

db.version(1).stores({
  cargasPendientes: 'id, vehiculoId, creadoEn',
  serviciosPendientes: 'id, vehiculoId, creadoEn',
})