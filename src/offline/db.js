import Dexie from 'dexie'
import { cuentaActual } from './cuenta'
export const db = new Dexie('autiva-offline')
db.version(1).stores({ cargasPendientes: 'id, vehiculoId, creadoEn', serviciosPendientes: 'id, vehiculoId, creadoEn' })
db.version(2).stores({
  cargasPendientes: 'id, vehiculoId, cuentaId, creadoEn',
  serviciosPendientes: 'id, vehiculoId, cuentaId, creadoEn',
  vehiculosPendientes: 'id, cuentaId, creadoEn',
  vehiculosVinculados: 'id, cuentaId',
}).upgrade(async (tx) => {
  const cuentaId = cuentaActual()
  for (const tabla of ['cargasPendientes', 'serviciosPendientes']) {
    await tx.table(tabla).toCollection().modify((registro) => { registro.cuentaId = cuentaId })
  }
})

db.version(3).stores({ fotosVehiculos: '[cuentaId+vehiculoId], cuentaId' })
