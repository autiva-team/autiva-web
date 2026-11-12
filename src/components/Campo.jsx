import { cloneElement, isValidElement, useId } from 'react'

/**
 * Campo de formulario accesible y consistente.
 *
 * - Asocia la etiqueta con el control (htmlFor / id).
 * - Une ayuda y error al control con aria-describedby.
 * - Marca el control con aria-invalid cuando hay error.
 * - Indica «(opcional)» con texto, no solo con color.
 *
 * Uso:
 *   <Campo etiqueta="Litros" error={errores.litros} ayuda="Ej. 35.5" sufijo="L">
 *     <input name="litros" type="number" ... />
 *   </Campo>
 */
export default function Campo({
  etiqueta,
  error,
  ayuda,
  opcional = false,
  requerido = false,
  prefijo,
  sufijo,
  accesorio,
  className = '',
  children,
}) {
  const idBase = useId()
  const control = isValidElement(children) ? children : null
  const idControl = control?.props.id || `${idBase}-control`
  const idAyuda = ayuda ? `${idBase}-ayuda` : undefined
  const idError = error ? `${idBase}-error` : undefined
  const describedBy = [idAyuda, idError, control?.props['aria-describedby']].filter(Boolean).join(' ') || undefined

  const claseControl = [control?.props.className, 'campo-control'].filter(Boolean).join(' ')

  const controlConAtributos = control
    ? cloneElement(control, {
        id: idControl,
        className: claseControl,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        'aria-required': requerido || undefined,
      })
    : children

  const conAdorno = prefijo || sufijo || accesorio
  const clasesGrupo = [
    'campo-grupo',
    prefijo ? 'campo-grupo--prefijo' : '',
    sufijo ? 'campo-grupo--sufijo' : '',
    accesorio ? 'campo-grupo--accesorio' : '',
  ].filter(Boolean).join(' ')
  return (
    <div className={`campo ${className}`.trim()}>
      <label htmlFor={idControl} className="campo-label">
        <span>
          {etiqueta}
          {requerido && <span className="campo-requerido" aria-hidden="true">*</span>}
          {opcional && <span className="campo-opcional">(opcional)</span>}
        </span>
      </label>
      {conAdorno ? (
        <div className={clasesGrupo}>
          {prefijo && <span className="campo-adorno campo-adorno--prefijo" aria-hidden="true">{prefijo}</span>}
          {controlConAtributos}
          {sufijo && <span className="campo-adorno campo-adorno--sufijo" aria-hidden="true">{sufijo}</span>}
          {accesorio && <span className="campo-accesorio">{accesorio}</span>}
        </div>
      ) : (
        controlConAtributos
      )}
      {ayuda && (
        <p id={idAyuda} className="campo-ayuda">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="campo-error">
          {error}
        </p>
      )}
    </div>
  )
}
