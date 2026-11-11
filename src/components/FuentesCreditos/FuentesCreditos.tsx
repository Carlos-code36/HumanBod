import { FUENTES_CALCULO, FUENTES_SIMULACION, MODELO_3D, NOTA_SIMULACION } from '../../data/referencias'
import type { Disease, Fuente } from '../../types/medical'

function ListaFuentes({ fuentes }: { fuentes: Fuente[] }) {
  return (
    <ul className="fuentes">
      {fuentes.map((f) => (
        <li key={f.id}>
          {f.autor}
          {f.anio ? ` (${f.anio})` : ''}. <em>{f.titulo}</em>
          {f.publicacion ? `. ${f.publicacion}` : ''}.
          {f.nota && <span className="muted"> {f.nota}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Todas las fuentes de la app y los créditos del modelo 3D. */
export default function FuentesCreditos({ disease }: { disease: Disease }) {
  return (
    <section className="fuentes-creditos">
      <h2>Fuentes y créditos</h2>
      {disease.estadoRevision === 'borrador' && (
        <p className="draft">El contenido médico está en borrador: pendiente de revisión por un profesional de la salud.</p>
      )}

      <h3>Contenido médico: {disease.nombre}</h3>
      <ListaFuentes fuentes={disease.fuentes} />

      <h3>Cálculos</h3>
      <ListaFuentes fuentes={FUENTES_CALCULO} />

      <h3>Simulación de glucosa e insulina</h3>
      <ListaFuentes fuentes={FUENTES_SIMULACION} />
      <p className="muted small">{NOTA_SIMULACION}</p>

      <h3>Modelo anatómico 3D</h3>
      <p>
        <a href={MODELO_3D.url} target="_blank" rel="noreferrer">
          {MODELO_3D.credito}
        </a>
        .{' '}
        <a href={MODELO_3D.urlLicencia} target="_blank" rel="noreferrer">
          Licencia
        </a>
        : {MODELO_3D.licencia}
      </p>
      <p className="muted small">Modificaciones: {MODELO_3D.modificaciones}</p>

      <h3>Privacidad</h3>
      <p className="small">
        Todos los cálculos se hacen en tu navegador. Los datos del formulario no se envían ni se guardan en ningún servidor.
      </p>
    </section>
  )
}
