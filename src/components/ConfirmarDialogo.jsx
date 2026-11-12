import Modal from './Modal'
import Spinner from './Spinner'

/**
 * Diálogo de confirmación accesible. Sustituye a window.confirm:
 * mantiene el foco, se cierra con Escape y bloquea la acción hasta
 * que el usuario decide. La opción segura recibe el foco primero.
 */
export default function ConfirmarDialogo({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  textoProceso,
  onConfirmar,
  onCancelar,
  cargando = false,
  peligro = false,
}) {
  const proceso = textoProceso || (peligro ? 'Eliminando…' : 'Procesando…')
  return (
    <Modal titulo={titulo} onCerrar={cargando ? () => {} : onCancelar} className="modal-confirmar">
      <p className="modal-texto">{mensaje}</p>
      <div className="modal-acciones">
        <button
          type="button"
          className="btn btn--secundario"
          onClick={onCancelar}
          disabled={cargando}
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          className={peligro ? 'btn btn--peligro' : 'btn btn--primario'}
          onClick={onConfirmar}
          disabled={cargando}
          aria-busy={cargando || undefined}
        >
          {cargando && <Spinner size={16} />}
          {cargando ? proceso : textoConfirmar}
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {cargando ? proceso : ''}
      </p>
    </Modal>
  )
}
