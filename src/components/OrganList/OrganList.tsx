import { ORGANS, findOrgan } from '../../data/organs'
import { colorDeNivel, etiquetaDeNivel } from '../../engine/afectacion'
import { useAppStore } from '../../store/useAppStore'

/**
 * Lista de órganos: alternativa al 3D, accesible con teclado (Tab / Enter)
 * y forma de llegar a órganos tapados por otros (F1-04).
 */
export default function OrganList() {
  const selectedId = useAppStore((s) => s.selectedOrganId)
  const niveles = useAppStore((s) => s.niveles)
  const selectOrgan = useAppStore((s) => s.selectOrgan)
  const selected = findOrgan(selectedId)

  return (
    <aside className="panel">
      <h2>Órganos</h2>
      <ul className="organ-list">
        {ORGANS.map((organ) => {
          const nivel = niveles[organ.id]
          const isSelected = organ.id === selectedId
          return (
            <li key={organ.id}>
              <button
                type="button"
                className="organ-button"
                aria-pressed={isSelected}
                onClick={() => selectOrgan(isSelected ? null : organ.id)}
              >
                <span className="dot" style={{ background: colorDeNivel(nivel) }} aria-hidden="true" />
                <span className="organ-name">{organ.nombre}</span>
                <span className="badge">{etiquetaDeNivel(nivel)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <section className="detail" aria-live="polite">
        {selected ? (
          <>
            <h3>{selected.nombre}</h3>
            <p>
              Sistema: <strong>{selected.sistema}</strong>
              <br />
              Afectación: <strong>{etiquetaDeNivel(niveles[selected.id])}</strong>
            </p>
            <p className="muted">La información sobre la diabetes en este órgano llega en la Fase 2.</p>
          </>
        ) : (
          <p className="muted">Selecciona un órgano en el cuerpo o en la lista. Esc quita la selección.</p>
        )}
      </section>
    </aside>
  )
}
