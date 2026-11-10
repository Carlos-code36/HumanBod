import { Suspense, lazy, useEffect, useState } from 'react'
import './App.css'
import ViewerBoundary from './components/BodyViewer/ViewerBoundary'
import { hasWebGL } from './components/BodyViewer/webgl'
import OrganList from './components/OrganList/OrganList'
import { useAppStore } from './store/useAppStore'
import type { NivelAfectacion } from './types/medical'

// El 3D se carga aparte: la página aparece rápido y muestra "Cargando…" mientras tanto.
const BodyViewer = lazy(() => import('./components/BodyViewer/BodyViewer'))

/** Solo para ver los colores en la Fase 1. NO es un cálculo: los valores son de ejemplo. */
const DEMO_NIVELES: Record<string, NivelAfectacion> = {
  ojos: 'leve',
  corazon: 'normal',
  higado: 'normal',
  pancreas: 'severa',
  rinones: 'moderada',
  nervios: 'leve',
}

function App() {
  const [webgl] = useState(hasWebGL)
  // Con "?demo" en la dirección se abre con la vista previa activada.
  const [demo, setDemo] = useState(() => new URLSearchParams(window.location.search).has('demo'))
  const setNiveles = useAppStore((s) => s.setNiveles)
  const selectOrgan = useAppStore((s) => s.selectOrgan)

  useEffect(() => {
    setNiveles(demo ? DEMO_NIVELES : {})
  }, [demo, setNiveles])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectOrgan(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectOrgan])

  return (
    <div className="app">
      <header className="header">
        <h1>Cuerpo Humano · Diabetes tipo 2</h1>
        <p role="note" className="warning">
          <strong>Aviso:</strong> herramienta educativa. No sirve para diagnóstico ni sustituye la
          valoración de un profesional de la salud.
        </p>
      </header>

      <div className="layout">
        <section className="viewer" aria-label="Visor del cuerpo">
          <div className="viewer-box">
            {webgl ? (
              <ViewerBoundary>
                <Suspense fallback={<div className="viewer-fallback">Cargando cuerpo 3D…</div>}>
                  <BodyViewer />
                </Suspense>
              </ViewerBoundary>
            ) : (
              <div className="viewer-fallback" role="alert">
                Tu navegador o tarjeta gráfica no soporta 3D (WebGL). Puedes usar la lista de órganos.
              </div>
            )}
          </div>
          <p className="hint">Arrastra para girar · rueda para acercar · clic en un órgano para seleccionarlo</p>
        </section>

        <div className="side">
          <OrganList />
          <label className="demo-toggle">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            <span>
              Vista previa de colores <span className="muted">(valores de ejemplo, no es un cálculo)</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default App
