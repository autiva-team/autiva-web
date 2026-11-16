import FormularioEdicion from '../../components/FormularioEdicion'
import { editarVehiculo } from './vehiculosApi'
import { useState } from 'react'
import Campo from '../../components/Campo'
import { guardarFotoVehiculo, prepararFoto } from './fotosVehiculos'
import { useAviso } from '../../components/Aviso'
const campos = [
  { nombre: 'marca', etiqueta: 'Marca', required: true, maxLength: 50 },
  { nombre: 'modelo', etiqueta: 'Modelo', required: true, maxLength: 50 },
  { nombre: 'anio', etiqueta: 'Año', tipo: 'number', required: true, min: 1950, max: new Date().getFullYear() + 1 },
  { nombre: 'placas', etiqueta: 'Placas', required: true, maxLength: 15 },
  { nombre: 'color', etiqueta: 'Color', maxLength: 30 },
  { nombre: 'estatus', etiqueta: 'Estado', opciones: [['activo', 'Activo'], ['en_taller', 'En taller']] },
]
export default function VehiculoEdicion({ vehiculo, foto, ...props }) {
  const [imagen, setImagen] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [errorFoto, setErrorFoto] = useState('')
  const { avisar } = useAviso()
  const elegir = async (evento) => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return
    setProcesando(true)
    setErrorFoto('')
    try { setImagen(await prepararFoto(archivo)) }
    catch (error) { setErrorFoto(error.message); avisar(error.message, 'error') }
    finally { setProcesando(false) }
  }
  return <FormularioEdicion {...props} titulo="Editar vehículo" campos={campos} inicial={vehiculo} ocupado={procesando || Boolean(errorFoto)} guardar={async (v) => {
    const datos = await editarVehiculo(vehiculo.id, { marca: v.marca.trim(), modelo: v.modelo.trim(), anio: Number(v.anio), placas: v.placas.trim().toUpperCase(), color: v.color?.trim() || null, fotoUrl: v.fotoUrl?.trim() || null, estatus: v.estatus })
    if (imagen) {
      try { await guardarFotoVehiculo(vehiculo.id, imagen) }
      catch { throw Object.assign(new Error('Los datos del vehículo se actualizaron, pero no se pudo guardar la foto en el dispositivo. Libera espacio e inténtalo de nuevo.'), { status: 422 }) }
    }
    return datos
  }}>
    <Campo etiqueta="Foto del vehículo" error={errorFoto} ayuda="Elige una foto de tu dispositivo. Se conserva en este dispositivo, también sin conexión. JPG, PNG, WebP o AVIF; máximo 15 MB.">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={elegir} disabled={procesando} />
    </Campo>
    {procesando && <p role="status">Preparando foto…</p>}
    {(imagen || foto || vehiculo.fotoUrl) && <img className="vehiculo-foto-preview" src={imagen || foto || vehiculo.fotoUrl} alt="Vista previa de la foto del vehículo" />}
  </FormularioEdicion>
}
