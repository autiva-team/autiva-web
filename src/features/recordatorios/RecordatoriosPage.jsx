import { FUNCIONES } from '../../config/funciones'
import RecordatoriosApiPage from './RecordatoriosApiPage'
import RecordatoriosLocalPage from './RecordatoriosLocalPage'

/**
 * Recordatorios.
 * - Con la API completa (FUNCIONES.listaRecordatorios): lista, filtros y
 *   «Hecho» con GET /recordatorios y PATCH /concluir.
 * - Sin ella: resumen del servidor y los creados en este dispositivo.
 */
export default function RecordatoriosPage(props) {
  return FUNCIONES.listaRecordatorios ? <RecordatoriosApiPage {...props} /> : <RecordatoriosLocalPage {...props} />
}
