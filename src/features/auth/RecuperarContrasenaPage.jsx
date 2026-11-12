import AppShell from '../../components/AppShell'
import Icon from '../../components/Icons'
import './RecuperarContrasenaPage.css'

/**
 * Recuperación de contraseña: la API todavía no tiene un endpoint
 * para restablecerla, así que se informa con claridad en lugar de
 * simular un proceso que no cambia nada.
 */
export default function RecuperarContrasenaPage({ onVolver }) {
  return (
    <AppShell titulo="Recuperar contraseña" descripcion="Muy pronto podrás restablecerla desde aquí.">
      <div className="recuperar-proximamente" role="status">
        <span className="proximamente-etiqueta">Próximamente</span>
        <p>
          Estamos preparando el envío de un enlace a tu correo para crear una contraseña nueva de forma segura.
        </p>
        <p>
          Mientras tanto, intenta iniciar sesión con las contraseñas que sueles usar o crea una cuenta nueva.
        </p>
      </div>
      <button type="button" className="btn btn--primario btn--lg btn--bloque" onClick={onVolver}>
        <Icon name="chevron-izquierda" size={18} />
        Volver a iniciar sesión
      </button>
    </AppShell>
  )
}
