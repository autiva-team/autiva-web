import { defineConfig } from 'vitest/config'

// Pruebas unitarias de la lógica de la app (módulos .js).
// Los componentes visuales (.jsx) y estilos se excluyen del cálculo de cobertura;
// la cobertura se envía a SonarQube en formato lcov.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
    setupFiles: ['src/test/setup.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/test/**', 'src/sw.js', 'src/main.jsx', 'src/**/*.jsx'],
    },
  },
})
