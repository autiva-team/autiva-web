import './AuthTabs.css'

/**
 * Selector de tipo de acceso. La opción actual se marca con
 * aria-current="page" porque cada opción es una pantalla distinta.
 */
export default function AuthTabs({ activo = 'login', onLogin, onRegistro }) {
  return (
    <nav className="auth-tabs" aria-label="Tipo de acceso">
      <button
        type="button"
        className={activo === 'login' ? 'auth-tab activo' : 'auth-tab'}
        onClick={activo === 'login' ? undefined : onLogin}
        aria-current={activo === 'login' ? 'page' : undefined}
      >
        Iniciar sesión
      </button>
      <button
        type="button"
        className={activo === 'registro' ? 'auth-tab activo' : 'auth-tab'}
        onClick={activo === 'registro' ? undefined : onRegistro}
        aria-current={activo === 'registro' ? 'page' : undefined}
      >
        Crear cuenta
      </button>
    </nav>
  )
}
