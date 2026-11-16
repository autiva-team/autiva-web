import { useState } from 'react'
import ConfirmarDialogo from './ConfirmarDialogo'
import Alerta from './Alerta'
import { mensajeError } from '../utils/mensajes'
import { useAviso } from './Aviso'
export default function ConfirmarEliminacion({ titulo, mensaje, eliminar, onCerrar, onEliminado }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const { avisar } = useAviso()
  return <ConfirmarDialogo peligro titulo={titulo} mensaje={<>{mensaje}{error && <Alerta tipo="error">{error}</Alerta>}</>} textoConfirmar="Eliminar" textoProceso="Eliminando…" textoCancelar="Cancelar" cargando={cargando} onCancelar={onCerrar} onConfirmar={async () => {
    if (cargando) return
    setCargando(true)
    setError('')
    try { await eliminar(); onEliminado() }
    catch (err) { const mensaje = mensajeError(err, 'eliminar el registro'); setError(mensaje); avisar(mensaje, 'error') }
    finally { setCargando(false) }
  }} />
}
