import { findOrgan } from '../../data/organs'
import { colorDeNivel, etiquetaDeNivel } from '../../engine/afectacion'
import { FUENTE_FINDRISC } from '../../engine/findrisc'
import { useAppStore } from '../../store/useAppStore'

/** Resumen de resultados: riesgo FINDRISC (sin diabetes) y afectación por órgano. */
export default function ResultsSummary() {
  const evaluacion = useAppStore((s) => s.evaluacion)
  const selectOrgan = useAppStore((s) => s.selectOrgan)

  if (!evaluacion) {
    return (
      <section className="panel results" aria-label="Resultados">
        <h2>Resultados</h2>
        <p className="muted">Completa los datos del paciente (o carga un ejemplo) para ver los resultados.</p>
      </section>
    )
  }

  const f = evaluacion.findrisc
  return (
    <section className="panel results" aria-label="Resultados" aria-live="polite">
      <h2>Resultados</h2>
      <p className="note-inline">Estimación educativa. No es un diagnóstico.</p>

      {f && (
        <div className="findrisc">
          <h3>Riesgo de desarrollar diabetes en 10 años (FINDRISC)</h3>
          <p className="findrisc-score">
            <span className="dot" style={{ background: colorDeNivel(f.nivel) }} aria-hidden="true" />
            <strong>{f.puntaje}</strong>/26 puntos · Riesgo <strong>{f.etiqueta.toLowerCase()}</strong> ({f.riesgo10Anios})
          </p>
          <details>
            <summary>¿Por qué? Ver puntos por factor</summary>
            <table className="desglose">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Valor</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {f.desglose.map((d) => (
                  <tr key={d.factor}>
                    <td>{d.factor}</td>
                    <td>{d.valor}</td>
                    <td>
                      {d.puntos} / {d.maximo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <p className="muted small">Fuente: {FUENTE_FINDRISC}</p>
        </div>
      )}
      {!f && <p className="muted small">Con diagnóstico de diabetes no se calcula el riesgo FINDRISC; se evalúan las complicaciones.</p>}

      <h3>Afectación por órgano</h3>
      <ul className="resultados-organos">
        {Object.values(evaluacion.organos).map((r) => (
          <li key={r.organo}>
            <button type="button" className="organ-button" onClick={() => selectOrgan(r.organo)}>
              <span className="dot" style={{ background: colorDeNivel(r.nivel) }} aria-hidden="true" />
              <span className="organ-name">
                {findOrgan(r.organo)?.nombre ?? r.organo}
                <span className="muted small"> · {r.titulo}</span>
              </span>
              <span className="badge">{etiquetaDeNivel(r.nivel)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">Haz clic en un órgano para ver la explicación y la fuente.</p>
    </section>
  )
}
