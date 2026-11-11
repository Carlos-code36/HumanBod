import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useAppStore, type Pestana } from '../../store/useAppStore'

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'organo', nombre: 'Órgano' },
  { id: 'paciente', nombre: 'Paciente' },
  { id: 'resultados', nombre: 'Resultados' },
]

/**
 * Panel lateral con pestañas. Todas las pestañas quedan montadas (solo se ocultan),
 * así el formulario no pierde lo escrito al cambiar de pestaña.
 * Teclado: flechas izquierda/derecha, Inicio y Fin para moverse entre pestañas.
 */
export default function PanelLateral({ contenido }: { contenido: Record<Pestana, ReactNode> }) {
  const pestana = useAppStore((s) => s.pestana)
  const setPestana = useAppStore((s) => s.setPestana)
  const hayResultados = useAppStore((s) => s.evaluacion !== null)
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  const alTeclear = (e: KeyboardEvent, i: number) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: PESTANAS.length - 1 }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    const j = (destino + PESTANAS.length) % PESTANAS.length
    setPestana(PESTANAS[j]!.id)
    botones.current[j]?.focus()
  }

  return (
    <aside className="drawer" aria-label="Información">
      <div className="tabs" role="tablist" aria-label="Secciones">
        {PESTANAS.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              botones.current[i] = el
            }}
            type="button"
            role="tab"
            id={`tab-${p.id}`}
            aria-selected={pestana === p.id}
            aria-controls={`panel-${p.id}`}
            tabIndex={pestana === p.id ? 0 : -1}
            className="tab"
            onClick={() => setPestana(p.id)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            {p.nombre}
            {p.id === 'resultados' && hayResultados && <span className="tab-punto" aria-label="(con datos)" />}
          </button>
        ))}
      </div>
      {PESTANAS.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`panel-${p.id}`}
          aria-labelledby={`tab-${p.id}`}
          className="tab-panel"
          hidden={pestana !== p.id}
        >
          {contenido[p.id]}
        </div>
      ))}
    </aside>
  )
}
