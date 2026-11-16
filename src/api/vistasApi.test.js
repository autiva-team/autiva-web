import { createElement } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { request } from './cliente'
import GastosPage from '../features/gastos/GastosPage'
import RecuperarContrasenaPage from '../features/auth/RecuperarContrasenaPage'
import CargaEdicion from '../features/cargas/CargaEdicion'
import ServicioEdicion from '../features/servicios/ServicioEdicion'
import PerfilFormulario from '../features/perfil/PerfilFormulario'

vi.mock('./cliente', () => ({ request: vi.fn() }))
vi.mock('../components/Aviso', () => ({ useAviso: () => ({ avisar: vi.fn() }) }))
beforeEach(() => { request.mockReset(); window.history.replaceState({}, '', '/') })
afterEach(cleanup)

it('solicita recuperación sin token y muestra el mensaje del servidor', async () => {
  request.mockResolvedValue({ mensaje: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.' })
  render(createElement(RecuperarContrasenaPage, { onVolver: vi.fn() }))
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } })
  fireEvent.click(screen.getByText('Enviar enlace'))
  await screen.findByText('Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.')
  expect(request).toHaveBeenCalledWith('/api/auth/recuperar-contrasena', expect.objectContaining({ sinAutenticacion: true, body: JSON.stringify({ correo: 'ana@example.com' }) }))
})

it('rechaza enlaces sin token y ofrece solicitar otro', () => {
  render(createElement(RecuperarContrasenaPage, { restablecer: true, onVolver: vi.fn(), onPedirOtro: vi.fn() }))
  expect(screen.getByText('El enlace no es válido.')).toBeTruthy()
  expect(screen.getByText('Pedir otro enlace')).toBeTruthy()
  expect(request).not.toHaveBeenCalled()
})

it('conserva el token de recuperación y valida la confirmación', async () => {
  window.history.replaceState({}, '', '/restablecer-contrasena?token=abc%2Bdef%3D')
  request.mockResolvedValue({ mensaje: 'Tu contraseña se actualizó.' })
  render(createElement(RecuperarContrasenaPage, { restablecer: true, onVolver: vi.fn() }))
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'contrasena123' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'diferente123' } })
  fireEvent.click(screen.getByText('Guardar contraseña'))
  expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
  expect(request).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'contrasena123' } })
  fireEvent.click(screen.getByText('Guardar contraseña'))
  await screen.findByText('Tu contraseña se actualizó.')
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ token: 'abc+def=', nuevaContrasena: 'contrasena123' })
})

it('consulta resumen e historial y registra gastos con GUID y campos numéricos', async () => {
  request.mockImplementation((ruta, opciones) => {
    if (opciones?.method === 'POST') return Promise.resolve({ id: 'nuevo' })
    return Promise.resolve(ruta.includes('resumen') ? { totalMes: 0, variacionPorcentaje: null, desglose: [] } : { items: [], totalPaginas: 0 })
  })
  render(createElement(GastosPage, { vehiculos: [{ id: 'v1', marca: 'Nissan', modelo: 'Versa' }], onSeleccionarVehiculo: vi.fn() }))
  await screen.findByText('Sin datos para comparar')
  fireEvent.click(screen.getByText('Registrar gasto'))
  fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Lavado' } })
  fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '180.50' } })
  fireEvent.click(screen.getByText('Guardar gasto'))
  await waitFor(() => expect(request.mock.calls.some(([, o]) => o?.method === 'POST')).toBe(true))
  const [ruta, opciones] = request.mock.calls.find(([, o]) => o?.method === 'POST')
  expect(ruta).toBe('/api/vehiculos/v1/gastos')
  expect(JSON.parse(opciones.body)).toMatchObject({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), monto: 180.5, categoriaId: 1, odometro: null })
})

it('editar carga preserva fecha UTC exacta y tanque parcial', async () => {
  request.mockResolvedValue({ id: 'c1' })
  render(createElement(CargaEdicion, { carga: { id: 'c1', tipoCombustible: 'Magna', fechaHora: '2026-10-28T18:30:25', tanqueLleno: false, litros: 35, costoTotal: 880, odometro: 11300 }, onCerrar: vi.fn(), onGuardado: vi.fn() }))
  fireEvent.click(screen.getByText('Guardar cambios'))
  await waitFor(() => expect(request).toHaveBeenCalled())
  expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ fechaHora: '2026-10-28T18:30:25.000Z', tanqueLleno: false, tipoCombustibleId: 1 })
})

it('editar servicio mantiene los opcionales y el catálogo de afinación', async () => {
  request.mockResolvedValue({ id: 's1' })
  render(createElement(ServicioEdicion, { servicio: { id: 's1', tipoServicio: 'Afinación', fecha: '2026-10-28', kilometrajeServicio: 10000, costo: 0, metaProximoKm: null, fechaRetorno: null, folio: 'F-123' }, onCerrar: vi.fn(), onGuardado: vi.fn() }))
  fireEvent.click(screen.getByText('Guardar cambios'))
  await waitFor(() => expect(request).toHaveBeenCalled())
  expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ tipoServicioId: 4, costo: 0, metaProximoKm: null, fechaRetorno: null, folio: 'F-123' })
})

it('guarda las cuatro preferencias sin enviar ultimaSincronizacion', async () => {
  request.mockImplementation((ruta, opciones) => Promise.resolve(ruta.includes('preferencias') ? opciones ? JSON.parse(opciones.body) : { notificacionesPush: true, unidadMedida: 'km_l', respaldoNube: true, modoOffline: true, ultimaSincronizacion: null } : { nombre: 'Ana', correo: 'ana@example.com', creadoEn: '2026-08-01T17:20:00', numeroVehiculos: 2 }))
  render(createElement(PerfilFormulario, { onUsuarioActualizado: vi.fn() }))
  await screen.findByText('Guardar preferencias')
  fireEvent.change(screen.getByLabelText('Unidad de rendimiento'), { target: { value: 'mpg' } })
  fireEvent.click(screen.getByText('Guardar preferencias'))
  await waitFor(() => expect(request.mock.calls.some(([, o]) => o?.method === 'PUT')).toBe(true))
  const [, opciones] = request.mock.calls.find(([, o]) => o?.method === 'PUT')
  expect(JSON.parse(opciones.body)).toEqual({ notificacionesPush: true, unidadMedida: 'mpg', respaldoNube: true, modoOffline: true })
})

it('consulta el periodo seleccionado y mantiene los meses sin rendimiento como ausencia de datos', async () => {
  const { default: EstadisticasPage } = await import('../features/estadisticas/EstadisticasPage')
  request.mockImplementation((ruta) => Promise.resolve(ruta.includes('preferencias') ? { unidadMedida: 'km_l' } : ruta.includes('/estadisticas') ? { desde: '2026-10-15', hasta: '2026-11-15', gastoTotal: 0, costoPorKm: null, distanciaKm: null, variacionCostoPorKm: null, rendimientoPromedio: null, gastoProyectadoMes: 0, rendimientoMensual: [{ anio: 2026, mes: 10, kmL: null }, { anio: 2026, mes: 11, kmL: 12 }] } : {}))
  render(createElement(EstadisticasPage, { vehiculos: [{ id: 'v1', marca: 'Nissan', modelo: 'Versa' }] }))
  await screen.findByText('Sin datos')
  expect(screen.getByRole('img', { name: /Rendimiento mensual/ })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /12.0 km\/L/ })).toHaveLength(1)
  fireEvent.click(screen.getByText('3 meses'))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/api/vehiculos/v1/estadisticas?periodo=3M'))
})

it('el próximo servicio viene del endpoint y no del primer registro paginado', async () => {
  const { default: ServiciosHistorialPage } = await import('../features/servicios/ServiciosHistorialPage')
  request.mockImplementation((ruta) => Promise.resolve(ruta.endsWith('/proximo') ? { ultimoServicio: { tipo: 'Afinación', kilometrajeServicio: 10000, fecha: '2026-10-01' }, metaKm: 15000, odometroActual: 12000, kmRestantes: 3000, porcentajeAvance: 40, diasEstimados: 60, fechaEstimada: '2027-01-01' } : { items: [], totalPaginas: 0 }))
  render(createElement(ServiciosHistorialPage, { vehiculos: [{ id: 'v1' }], vehiculoId: 'v1', onRegistrarServicio: vi.fn() }))
  await screen.findByText('Faltan 3,000 km')
  expect(screen.getByText('Fecha estimada: 2027-01-01 · 60 días')).toBeTruthy()
})

it('la gráfica no conecta meses sin datos y conserva los valores para lectura accesible', async () => {
  const { GraficaRendimiento } = await import('../features/estadisticas/GraficasEstadisticas')
  const { container } = render(createElement(GraficaRendimiento, { datos: [{ anio: 2026, mes: 8, kmL: 12 }, { anio: 2026, mes: 9, kmL: null }, { anio: 2026, mes: 10, kmL: 14 }], promedio: 13, formatear: (n) => n == null ? '—' : `${n.toFixed(1)} km/L` }))
  expect(container.querySelectorAll('polyline')).toHaveLength(2)
  expect(screen.getByText('Sin datos')).toBeTruthy()
  fireEvent.focus(screen.getByRole('button', { name: /ago 2026/ }))
  expect(screen.getByText('ago 2026: 12.0 km/L')).toBeTruthy()
})
