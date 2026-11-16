import FormularioEdicion from '../../components/FormularioEdicion'
import { editarServicio } from './serviciosApi'
import { fechaMexico } from '../../utils/fechas'
const tipos = [[1, 'Aceite y filtros'], [2, 'Frenos'], [3, 'Llantas'], [4, 'Afinación'], [5, 'Batería'], [6, 'Otro']]
export default function ServicioEdicion({ servicio, ...props }) {
  const campos = [
    { nombre: 'tipoServicioId', etiqueta: 'Tipo de servicio', opciones: [['', 'Selecciona el servicio'], ...tipos] },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', required: true, max: fechaMexico() },
    { nombre: 'kilometrajeServicio', etiqueta: 'Kilometraje (km)', tipo: 'number', required: true, min: 0 },
    { nombre: 'costo', etiqueta: 'Costo', tipo: 'number', required: true, min: 0, step: '0.01' },
    { nombre: 'metaProximoKm', etiqueta: 'Próximo servicio (km)', tipo: 'number', min: servicio.kilometrajeServicio + 1 },
    { nombre: 'fechaRetorno', etiqueta: 'Fecha de regreso', tipo: 'date' },
    { nombre: 'taller', etiqueta: 'Taller', maxLength: 120 },
    { nombre: 'folio', etiqueta: 'Folio', maxLength: 50 },
    { nombre: 'notas', etiqueta: 'Notas', maxLength: 500 },
  ]
  return <FormularioEdicion {...props} titulo="Editar servicio" campos={campos} inicial={{ ...servicio, tipoServicioId: tipos.find(([, nombre]) => nombre === servicio.tipoServicio)?.[0] || '' }} guardar={(v) => editarServicio(servicio.id, { tipoServicioId: Number(v.tipoServicioId), fecha: v.fecha, kilometrajeServicio: Number(v.kilometrajeServicio), costo: Number(v.costo), metaProximoKm: v.metaProximoKm === '' || v.metaProximoKm == null ? null : Number(v.metaProximoKm), fechaRetorno: v.fechaRetorno || null, taller: v.taller?.trim() || null, folio: v.folio?.trim() || null, notas: v.notas?.trim() || null })} />
}
