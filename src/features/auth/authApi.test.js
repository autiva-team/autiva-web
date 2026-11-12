import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/cliente', () => ({ request: vi.fn(() => Promise.resolve({})) }))

import { request } from '../../api/cliente'
import { cerrarSesion, iniciarSesion, registrarUsuario } from './authApi'
import { validarEmail } from '../../utils/validaciones'

beforeEach(() => request.mockClear())

describe('authApi', () => {
  it('registra, inicia y cierra sesión con los endpoints de /api/auth', async () => {
    await registrarUsuario({ nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'secreta123' })
    await iniciarSesion({ correo: 'ana@correo.com', contrasena: 'secreta123' })
    await cerrarSesion()
    expect(request.mock.calls[0]).toEqual([
      '/api/auth/registrar',
      { method: 'POST', body: JSON.stringify({ nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'secreta123' }) },
    ])
    expect(request.mock.calls[1]).toEqual([
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ correo: 'ana@correo.com', contrasena: 'secreta123' }) },
    ])
    expect(request.mock.calls[2]).toEqual(['/api/auth/logout', { method: 'POST' }])
  })
})

describe('validarEmail', () => {
  it('acepta correos con dominio y extensión', () => {
    expect(validarEmail('nombre@correo.com')).toBe(true)
    expect(validarEmail('a.b@sub.dominio.mx')).toBe(true)
  })

  it('rechaza correos incompletos o con espacios', () => {
    expect(validarEmail('nombre@correo')).toBe(false)
    expect(validarEmail('nombre correo@dominio.com')).toBe(false)
    expect(validarEmail('@dominio.com')).toBe(false)
  })
})
