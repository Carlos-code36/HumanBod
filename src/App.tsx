function App() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Cuerpo Humano · Diabetes tipo 2</h1>
      <p
        role="note"
        style={{
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          borderRadius: 8,
          padding: '0.75rem 1rem',
        }}
      >
        <strong>Aviso:</strong> herramienta educativa. No sirve para diagnóstico ni sustituye la
        valoración de un profesional de la salud.
      </p>
      <p>Fase 0 lista: proyecto configurado. La Fase 1 agregará el cuerpo 3D.</p>
    </main>
  )
}

export default App
