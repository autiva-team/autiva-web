import { describe, expect, it, vi } from 'vitest'
import { enfocarPrimerError, mensajeError } from './mensajes'

function errorHttp(status, extra = {}) {
  return Object.assign(new Error(extra.message ?? `Error ${status}`), { status, ...extra })
}

describe('mensajeError', () => {
  it('explica la falta de conexión cuando no hubo respuesta HTTP', () => {
    expect(mensajeError(new TypeError('Failed to fetch'), 'guardar la carga')).toBe(
      'No se pudo guardar la carga. Revisa tu conexión a internet e inténtalo de nuevo.'
    )
  })

  it('usa una acción genérica si no se indica', () => {
    expect(mensajeError(undefined)).toMatch(/^No se pudo completar la operación\./)
  })

  it('incluye los errores de validación que envía la API', () => {
    const error = errorHttp(400, { errores: ['El título es obligatorio.', 'La fecha no es válida.'] })
    expect(mensajeError(error, 'crear el recordatorio')).toBe(
      'No se pudo crear el recordatorio. El título es obligatorio. La fecha no es válida.'
    )
  })

  it('en 400 o 422 usa el mensaje de la API o una guía genérica', () => {
    expect(mensajeError(errorHttp(400, { message: 'Placas duplicadas.' }), 'registrar')).toBe(
      'No se pudo registrar. Placas duplicadas.'
    )
    expect(mensajeError(errorHttp(422), 'registrar')).toBe(
      'No se pudo registrar. Revisa los datos marcados e inténtalo de nuevo.'
    )
  })

  it('explica sesión vencida, permisos y registros inexistentes', () => {
    expect(mensajeError(errorHttp(401), 'cargar')).toMatch(/Tu sesión terminó/)
    expect(mensajeError(errorHttp(403), 'cargar')).toMatch(/no tiene permiso/)
    expect(mensajeError(errorHttp(404), 'cargar')).toMatch(/aún no está disponible en el servidor/)
    expect(mensajeError(errorHttp(404, { message: 'No se encontró el vehículo.' }), 'cargar')).toBe(
      'No se pudo cargar. No se encontró el vehículo.'
    )
  })

  it('en 409 usa el mensaje de la API o uno de duplicado', () => {
    expect(mensajeError(errorHttp(409, { message: 'Ya existe esa cuenta.' }), 'crear')).toBe(
      'No se pudo crear. Ya existe esa cuenta.'
    )
    expect(mensajeError(errorHttp(409), 'crear')).toMatch(/Ya existe un registro/)
  })

  it('pide esperar ante demasiadas solicitudes y errores del servidor', () => {
    expect(mensajeError(errorHttp(429), 'enviar')).toMatch(/espera un momento/)
    expect(mensajeError(errorHttp(503), 'enviar')).toMatch(/problema temporal/)
  })

  it('para otros códigos usa el mensaje recibido o pide reintentar', () => {
    expect(mensajeError(errorHttp(418, { message: 'Soy una tetera' }), 'servir')).toBe(
      'No se pudo servir. Soy una tetera'
    )
    expect(mensajeError(errorHttp(418, { message: '' }), 'servir')).toBe('No se pudo servir. Inténtalo de nuevo.')
  })
})

describe('enfocarPrimerError', () => {
  it('no falla si no hay formulario', () => {
    expect(() => enfocarPrimerError(null)).not.toThrow()
  })

  it('enfoca y desplaza al primer campo inválido', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb()
      return 0
    })
    document.body.innerHTML = `
      <form>
        <input name="a" />
        <input name="b" aria-invalid="true" />
        <input name="c" aria-invalid="true" />
      </form>`
    const formulario = document.querySelector('form')
    const campo = formulario.querySelector('[name="b"]')
    campo.scrollIntoView = vi.fn()

    enfocarPrimerError(formulario)

    expect(document.activeElement).toBe(campo)
    expect(campo.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
  })

  it('no hace nada si no hay campos inválidos', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb()
      return 0
    })
    document.body.innerHTML = '<form><input name="a" /></form>'
    const formulario = document.querySelector('form')
    enfocarPrimerError(formulario)
    expect(document.activeElement).toBe(document.body)
  })
})
