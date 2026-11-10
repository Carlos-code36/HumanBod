import { afectacionDe, fuentesDe } from '../../data/diseases'
import { findOrgan } from '../../data/organs'
import { colorDeNivel, etiquetaDeNivel } from '../../engine/afectacion'
import { useAppStore } from '../../store/useAppStore'
import type { Disease, Escala, Fuente } from '../../types/medical'

function Cita({ fuente }: { fuente: Fuente }) {
  return (
    <li>
      {fuente.autor}
      {fuente.anio ? ` (${fuente.anio})` : ''}. <em>{fuente.titulo}</em>
      {fuente.publicacion ? `. ${fuente.publicacion}` : ''}.{fuente.nota ? ` ${fuente.nota}` : ''}
    </li>
  )
}

function EscalaView({ escala, disease }: { escala: Escala; disease: Disease }) {
  const [fuente] = fuentesDe(disease, [escala.fuente])
  return (
    <div className="escala">
      <h5>{escala.nombre}</h5>
      <ol className="etapas">
        {escala.etapas.map((e) => (
          <li key={e.id}>
            <span className="dot" style={{ background: colorDeNivel(e.nivel) }} aria-hidden="true" />
            <div>
              <strong>{e.nombre}</strong> <span className="muted">· {etiquetaDeNivel(e.nivel)}</span>
              <p>{e.descripcion}</p>
            </div>
          </li>
        ))}
      </ol>
      {fuente && <p className="muted small">Fuente: {fuente.autor}{fuente.anio ? `, ${fuente.anio}` : ''}</p>}
    </div>
  )
}

/** Detalle del órgano seleccionado dentro de la enfermedad, o resumen de la enfermedad si no hay selección. */
export default function OrganPanel({ disease }: { disease: Disease }) {
  const selectedId = useAppStore((s) => s.selectedOrganId)
  const nivel = useAppStore((s) => (selectedId ? s.niveles[selectedId] : undefined))
  const resultado = useAppStore((s) => (selectedId ? s.evaluacion?.organos[selectedId] : undefined))
  const organ = findOrgan(selectedId)
  const afectacion = afectacionDe(disease, selectedId)

  return (
    <section className="panel detail-panel" aria-live="polite" aria-label="Detalle">
      {disease.estadoRevision === 'borrador' && (
        <p className="draft">Contenido en borrador: pendiente de revisión por un profesional de la salud.</p>
      )}

      {!organ && (
        <>
          <h2>{disease.nombre}</h2>
          <p>{disease.descripcion}</p>
          <p className="muted">Selecciona un órgano en el cuerpo o en la lista para ver cómo lo afecta. Esc quita la selección.</p>
        </>
      )}

      {organ && !afectacion && (
        <>
          <h2>{organ.nombre}</h2>
          <p className="muted">Sistema {organ.sistema}</p>
          <p>No hay afectación descrita para {disease.nombre.toLowerCase()} en este órgano.</p>
        </>
      )}

      {organ && afectacion && (
        <>
          <h2>{organ.nombre}</h2>
          <p className="muted">
            Sistema {organ.sistema} · Afectación actual: <strong>{etiquetaDeNivel(nivel)}</strong>
          </p>

          <h3>{afectacion.complicacion}</h3>

          <div className="resultado-organo">
            <h4>
              <span className="dot" style={{ background: colorDeNivel(nivel) }} aria-hidden="true" /> Resultado con los datos
              ingresados: {resultado ? resultado.titulo : 'Sin datos'}
            </h4>
            {resultado ? (
              <>
                <ul>
                  {resultado.explicacion.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                {resultado.fuente && <p className="muted small">Fuente: {resultado.fuente}</p>}
              </>
            ) : (
              <p className="muted small">Completa los datos del paciente para calcularlo.</p>
            )}
          </div>

          <h4>¿Por qué ocurre?</h4>
          <p>{afectacion.mecanismo}</p>

          <h4>Etapas</h4>
          {afectacion.escalas.map((e) => (
            <EscalaView key={e.id} escala={e} disease={disease} />
          ))}

          <h4>¿Cómo se detecta?</h4>
          <ul>
            {afectacion.deteccion.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>

          <h4>Fuentes</h4>
          <ul className="fuentes small">
            {fuentesDe(disease, afectacion.fuentes).map((f) => (
              <Cita key={f.id} fuente={f} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
