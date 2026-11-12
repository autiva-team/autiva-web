// Configuración común de las pruebas.
// fake-indexeddb ofrece una IndexedDB en memoria para probar la cola offline (Dexie).
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'

afterEach(() => {
  localStorage.clear()
})
