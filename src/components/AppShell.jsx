import './AppShell.css'

export default function AppShell({ subtitulo, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-backdrop" aria-hidden="true">
        <span className="auth-blob blob-1" />
        <span className="auth-blob blob-2" />
        <span className="auth-blob blob-3" />
      </div>

      <main className="auth-main">
        <section className="auth-card">
          <header className="auth-brand">
            <span className="brand-mark">A</span>
            <div>
              <h1>Autiva</h1>
              <p>Expediente digital vehicular</p>
            </div>
          </header>

          {subtitulo && <h2 className="auth-title">{subtitulo}</h2>}

          {children}
        </section>

        <p className="auth-footer">Tu vehículo, en un solo lugar.</p>
      </main>
    </div>
  )
}
