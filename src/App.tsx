import { Suspense, lazy, useEffect, useState } from 'react'
import './App.css'
import ViewerBoundary from './components/BodyViewer/ViewerBoundary'
import { hasWebGL } from './components/BodyViewer/webgl'
import OrganList from './components/OrganList/OrganList'
import OrganPanel from './components/OrganPanel/OrganPanel'
import PatientForm from './components/PatientForm/PatientForm'
import ResultsSummary from './components/ResultsSummary/ResultsSummary'
import { DIABETES_T2 } from './data/diseases'
import { useAppStore } from './store/useAppStore'

// El 3D se carga aparte: la página aparece rápido y muestra "Cargando…" mientras tanto.
const BodyViewer = lazy(() => import('./components/BodyViewer/BodyViewer'))
// Las gráficas (Recharts) también se cargan aparte.
const SimulationPanel = lazy(() => import('./components/SimulationPanel/SimulationPanel'))

function App() {
  const [webgl] = useState(hasWebGL)
  const selectOrgan = useAppStore((s) => s.selectOrgan)

  // Con "?organo=rinones" en la dirección se abre con ese órgano seleccionado (los ids inválidos se ignoran).
  useEffect(() => {
    const organo = new URLSearchParams(window.location.search).get('organo')
    if (organo) selectOrgan(organo)
  }, [selectOrgan])

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
        <div className="main">
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
          <div className="form-results">
            <PatientForm disease={DIABETES_T2} />
            <ResultsSummary />
          </div>
          <Suspense fallback={<div className="panel muted">Cargando simulación…</div>}>
            <SimulationPanel />
          </Suspense>
        </div>

        <div className="side">
          <OrganList />
          <OrganPanel disease={DIABETES_T2} />
        </div>
      </div>

      <footer className="creditos">
        Modelo anatómico 3D: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noreferrer">BodyParts3D</a>,
        © The Database Center for Life Science, bajo licencia Creative Commons (
        <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">ver licencia</a>
        ). Modificado: piezas seleccionadas, polígonos reducidos y nervios periféricos dibujados de forma esquemática.
      </footer>
    </div>
  )
}

export default App
