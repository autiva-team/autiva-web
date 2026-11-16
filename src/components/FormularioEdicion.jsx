import { useState } from 'react'
import Modal from './Modal'
import Campo from './Campo'
import Alerta from './Alerta'
import { mensajeError } from '../utils/mensajes'
import { useAviso } from './Aviso'

// Los campos y la conversión del contrato pertenecen a cada feature.
export default function FormularioEdicion({ titulo, campos, inicial, guardar, onCerrar, onGuardado, children, ocupado = false }) {
  const [valores, setValores] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const { avisar } = useAviso()
  const enviar = async (evento) => {
    evento.preventDefault()
    if (guardando || ocupado) return
    setGuardando(true)
    setError('')
    try { const datos = await guardar(valores); onGuardado(datos) }
    catch (err) { const mensaje = mensajeError(err, 'guardar los cambios'); setError(mensaje); avisar(mensaje, 'error') }
    finally { setGuardando(false) }
  }
  return <Modal titulo={titulo} onCerrar={() => !guardando && onCerrar()}>
    <form className="formulario formulario-edicion" onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <fieldset disabled={guardando} style={{ border: 0, padding: 0, display: 'grid', gap: 16 }}>
        {campos.map(({ nombre, etiqueta, opciones, tipo = 'text', ...atributos }) => <Campo key={nombre} etiqueta={etiqueta}>
          {opciones ? <select value={valores[nombre] ?? ''} onChange={(e) => setValores({ ...valores, [nombre]: e.target.value })} required>{opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select>
            : <input type={tipo} {...atributos} value={tipo === 'checkbox' ? undefined : valores[nombre] ?? ''} checked={tipo === 'checkbox' ? Boolean(valores[nombre]) : undefined} onChange={(e) => setValores({ ...valores, [nombre]: tipo === 'checkbox' ? e.target.checked : e.target.value })} />}
        </Campo>)}
        {children}
      </fieldset>
      <div className="modal-acciones"><button type="button" className="btn btn--secundario" disabled={guardando} onClick={onCerrar}>Cancelar</button><button className="btn btn--primario" disabled={guardando || ocupado}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  </Modal>
}
