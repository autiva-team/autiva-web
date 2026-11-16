import { beforeEach, expect, it, vi } from 'vitest'
import { db } from '../../offline/db'
import { guardarFotoVehiculo, leerFotosVehiculos, eliminarFotoVehiculo, prepararFoto } from './fotosVehiculos'

beforeEach(async () => {
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u-fotos' }))
  await db.fotosVehiculos.clear()
  await db.vehiculosVinculados.clear()
})

it('persiste la foto al reabrir IndexedDB y la aísla por cuenta', async () => {
  await guardarFotoVehiculo('v1', 'data:image/jpeg;base64,foto')
  db.close()
  await db.open()
  expect((await leerFotosVehiculos()).v1).toBe('data:image/jpeg;base64,foto')
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'otra-cuenta' }))
  expect(await leerFotosVehiculos()).toEqual({})
})

it('mantiene la foto al sincronizar el ID local y la borra con el vehículo', async () => {
  await guardarFotoVehiculo('local', 'imagen')
  await db.vehiculosVinculados.put({ id: 'local', servidorId: 'servidor', cuentaId: 'u-fotos' })
  expect((await leerFotosVehiculos()).servidor).toBe('imagen')
  await eliminarFotoVehiculo('servidor')
  expect(await leerFotosVehiculos()).toEqual({})
})

it('rechaza archivos incompatibles o demasiado grandes antes de decodificarlos', async () => {
  await expect(prepararFoto(new File(['hola'], 'foto.svg', { type: 'image/svg+xml' }))).rejects.toThrow('JPG')
  await expect(prepararFoto({ type: 'image/jpeg', size: 16 * 1024 * 1024 })).rejects.toThrow('15 MB')
})

it('solicita almacenamiento persistente sin perder la foto si el navegador lo rechaza', async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'storage')
  const persist = vi.fn().mockRejectedValue(new Error('No permitido'))
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } })
  try {
    await guardarFotoVehiculo('v1', 'foto-persistente')
    expect(persist).toHaveBeenCalledOnce()
    expect((await leerFotosVehiculos()).v1).toBe('foto-persistente')
  } finally {
    if (original) Object.defineProperty(navigator, 'storage', original)
    else delete navigator.storage
  }
})
