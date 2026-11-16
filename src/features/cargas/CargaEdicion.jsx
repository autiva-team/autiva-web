import FormularioEdicion from '../../components/FormularioEdicion'
import { editarCarga } from './cargasApi'
import { fechaHoraLocal } from '../../utils/fechas'
const combustibles = [[1, 'Magna'], [2, 'Premium'], [3, 'Diésel']]
export default function CargaEdicion({ carga, ...props }) {
  const tipo = combustibles.find(([, nombre]) => nombre === carga.tipoCombustible)?.[0]
  const campos = [
    { nombre: 'tipoCombustibleId', etiqueta: 'Combustible', opciones: [['', 'Selecciona el combustible'], ...combustibles] },
    { nombre: 'litros', etiqueta: 'Litros', tipo: 'number', required: true, min: 0.01, step: '0.01' },
    { nombre: 'costoTotal', etiqueta: 'Costo total', tipo: 'number', required: true, min: 0.01, step: '0.01' },
    { nombre: 'odometro', etiqueta: 'Odómetro (km)', tipo: 'number', required: true, min: 0 },
    { nombre: 'fechaHora', etiqueta: 'Fecha y hora', tipo: 'datetime-local', required: true },
    { nombre: 'tanqueLleno', etiqueta: 'Tanque lleno', tipo: 'checkbox' },
    { nombre: 'gasolinera', etiqueta: 'Gasolinera', maxLength: 100 },
    { nombre: 'folio', etiqueta: 'Folio del comprobante (confírmalo al editar)', maxLength: 50 },
    { nombre: 'notas', etiqueta: 'Notas', maxLength: 300 },
  ]
  const inicial = { ...carga, tipoCombustibleId: tipo || '', fechaHora: fechaHoraLocal(carga.fechaHora) }
  return <FormularioEdicion {...props} titulo="Editar carga" campos={campos} inicial={inicial} guardar={(v) => editarCarga(carga.id, { tipoCombustibleId: Number(v.tipoCombustibleId), litros: Number(v.litros), costoTotal: Number(v.costoTotal), odometro: Number(v.odometro), tanqueLleno: v.tanqueLleno, fechaHora: v.fechaHora === inicial.fechaHora ? new Date(/Z$/i.test(carga.fechaHora) ? carga.fechaHora : `${carga.fechaHora}Z`).toISOString() : new Date(v.fechaHora).toISOString(), gasolinera: v.gasolinera?.trim() || null, folio: v.folio?.trim() || null, notas: v.notas?.trim() || null })} />
}
