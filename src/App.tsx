import { Suspense, lazy, useEffect, useState } from 'react'
import './App.css'
import ViewerBoundary from './components/BodyViewer/ViewerBoundary'
import { hasWebGL } from './components/BodyViewer/webgl'
import FuentesCreditos from './components/FuentesCreditos/FuentesCreditos'
import Modal from './components/Modal/Modal'
import OrganList from './components/OrganList/OrganList'
import OrganPanel from './components/OrganPanel/OrganPanel'
import PanelLateral from './components/PanelLateral/PanelLateral'
import PatientForm from './components/PatientForm/PatientForm'
import ResultsSummary from './components/ResultsSummary/ResultsSummary'
import { DIABETES_T2 } from './data/diseases'
import { useAppStore } from './store/useAppStore'

// El 3D y las gráficas se cargan aparte: la página aparece rápido.
const BodyViewer = lazy(() => import('./components/BodyViewer/BodyViewer'))
const SimulationPanel = lazy(() => import('./components/SimulationPanel/SimulationPanel'))

type Ventana = 'simulacion' | 'fuentes' | null

function App() {
  const [webgl] = useState(hasWebGL)
  // Con "?perfil=<id>" la simulación abre directamente (útil para compartir un enlace).
  const [ventana, setVentana] = useState<Ventana>(() =>
    new URLSearchParams(window.location.search).has('perfil') ? 'simulacion' : null,
  )
  // La simulación se monta la primera vez que se abre y queda montada (conserva sus controles).
  const [simulacionUsada, setSimulacionUsada] = useState(ventana === 'simulacion')
  const selectOrgan = useAppStore((s) => s.selectOrgan)

  const abrir = (v: Exclude<Ventana, null>) => {
    if (v === 'simulacion') setSimulacionUsada(true)
    setVentana(v)
  }

  // Con "?organo=rinones" en la dirección se abre con ese órgano seleccionado (los ids inválidos se ignoran).
  useEffect(() => {
    const organo = new URLSearchParams(window.location.search).get('organo')
    if (organo) selectOrgan(organo)
  }, [selectOrgan])

  // Esc quita la selección, salvo que haya una ventana abierta (en ese caso Esc solo la cierra).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) selectOrgan(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectOrgan])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-titulo">
          <h1>Cuerpo Humano · Diabetes tipo 2</h1>
          <p role="note" className="aviso">
            <strong>Educativo:</strong> <span className="texto-largo">no sirve para diagnóstico ni sustituye a un profesional de la salud.</span>
            <span className="texto-corto">no es un diagnóstico.</span>
          </p>
        </div>
        <nav className="acciones" aria-label="Herramientas">
          <button type="button" className="boton" onClick={() => abrir('simulacion')}>
            Simulación
          </button>
          <button type="button" className="boton boton-secundario" onClick={() => abrir('fuentes')} aria-label="Fuentes y créditos">
            <span className="texto-largo">Fuentes y créditos</span>
            <span className="texto-corto" aria-hidden="true">
              Fuentes
            </span>
          </button>
        </nav>
      </header>

      <main className="escenario">
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
            <div className="organ-rail">
              <OrganList />
            </div>
            <p className="hint">Arrastra para girar · rueda o pellizca para acercar · toca un órgano para verlo</p>
            <button type="button" className="credito-mini" onClick={() => abrir('fuentes')}>
              Modelo 3D: BodyParts3D © DBCLS · créditos
            </button>
          </div>
        </section>

        <PanelLateral
          contenido={{
            organo: <OrganPanel disease={DIABETES_T2} />,
            paciente: <PatientForm disease={DIABETES_T2} />,
            resultados: <ResultsSummary />,
          }}
        />
      </main>

      <Modal abierto={ventana === 'simulacion'} onCerrar={() => setVentana(null)} etiqueta="Simulación">
        {simulacionUsada && (
          <Suspense fallback={<p className="muted">Cargando simulación…</p>}>
            <SimulationPanel />
          </Suspense>
        )}
      </Modal>
      <Modal abierto={ventana === 'fuentes'} onCerrar={() => setVentana(null)} etiqueta="Fuentes y créditos">
        <FuentesCreditos disease={DIABETES_T2} />
      </Modal>
    </div>
  )
}

export default App
