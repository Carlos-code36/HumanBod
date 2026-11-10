import { useId, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PERFILES, resumir, simular, type Comida, type ParametrosFisiologicos, type PerfilId, type PuntoSimulacion } from '../../engine/bergman'
import { useAppStore } from '../../store/useAppStore'

type ModoComidas = 'una' | 'dia'

const SANO = PERFILES.sano.parametros

/** Escenarios de comidas. "dia": desayuno, comida y cena (minutos desde el desayuno). */
function comidasDe(modo: ModoComidas, carbohidratosG: number): { comidas: Comida[]; minutos: number } {
  return modo === 'una'
    ? { comidas: [{ carbohidratosG, minuto: 0 }], minutos: 6 * 60 }
    : { comidas: [0, 6 * 60, 12 * 60].map((minuto) => ({ carbohidratosG, minuto })), minutos: 24 * 60 }
}

interface Fila {
  t: number
  glucosa: number
  insulina: number
  glucosaRef: number
  insulinaRef: number
}

function combinar(a: PuntoSimulacion[], ref: PuntoSimulacion[]): Fila[] {
  return a.map((p, i) => ({ t: p.t, glucosa: p.glucosa, insulina: p.insulina, glucosaRef: ref[i]!.glucosa, insulinaRef: ref[i]!.insulina }))
}

const horas = (t: number) => {
  if (t < 60) return `${t} min`
  return t % 60 === 0 ? `${t / 60} h` : `${Math.floor(t / 60)} h ${t % 60} min`
}

/** Tope del eje Y: deja ~15 % de margen sobre el máximo (y sobre la línea de referencia) y redondea. */
const topeEje = (max: number, referencia = 0) => {
  const tope = Math.max(max, referencia) * 1.15
  const paso = tope > 200 ? 50 : tope > 50 ? 20 : 10
  return Math.ceil(tope / paso) * paso
}
const r0 = (n: number) => Math.round(n).toString()

interface TooltipProps {
  active?: boolean
  payload?: { payload: Fila }[]
  campo: 'glucosa' | 'insulina'
  unidad: string
}

function TooltipCurva({ active, payload, campo, unidad }: TooltipProps) {
  const fila = payload?.[0]?.payload
  if (!active || !fila) return null
  const ref = campo === 'glucosa' ? fila.glucosaRef : fila.insulinaRef
  return (
    <div className="chart-tooltip">
      <div className="muted small">{horas(fila.t)} después del inicio</div>
      <div>
        <span className="swatch swatch-serie" aria-hidden="true" /> Perfil elegido: <strong>{r0(fila[campo])}</strong> {unidad}
      </div>
      <div>
        <span className="swatch swatch-ref" aria-hidden="true" /> Persona sana: <strong>{r0(ref)}</strong> {unidad}
      </div>
    </div>
  )
}

interface GraficaProps {
  titulo: string
  datos: Fila[]
  campo: 'glucosa' | 'insulina'
  unidad: string
  referencia?: { y: number; etiqueta: string }
}

/** Una medida por gráfica (sin doble eje). Línea sólida = perfil elegido; discontinua = referencia sana. */
function Grafica({ titulo, datos, campo, unidad, referencia }: GraficaProps) {
  const max = datos.at(-1)?.t ?? 0
  const paso = max > 6 * 60 ? 120 : 60
  const ticks = Array.from({ length: Math.floor(max / paso) + 1 }, (_, i) => i * paso)
  return (
    <figure className="grafica">
      <figcaption>
        <strong>{titulo}</strong> <span className="muted small">({unidad})</span>
      </figcaption>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, max]}
            ticks={ticks}
            tickFormatter={(t: number) => `${t / 60} h`}
            stroke="var(--chart-axis)"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <YAxis
            width={44}
            stroke="var(--chart-axis)"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            domain={[0, (dataMax: number) => topeEje(dataMax, referencia?.y)]}
            allowDecimals={false}
          />
          {referencia && (
            <ReferenceLine
              y={referencia.y}
              stroke="var(--chart-axis)"
              strokeDasharray="2 4"
              label={{ value: referencia.etiqueta, position: 'insideTopRight', fill: 'var(--muted)', fontSize: 11 }}
            />
          )}
          <Tooltip content={<TooltipCurva campo={campo} unidad={unidad} />} cursor={{ stroke: 'var(--chart-axis)' }} />
          <Line
            type="monotone"
            dataKey={campo === 'glucosa' ? 'glucosaRef' : 'insulinaRef'}
            name="Persona sana"
            stroke="var(--serie-ref)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey={campo}
            name="Perfil elegido"
            stroke="var(--serie-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--panel-bg)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

interface DeslizadorProps {
  label: string
  valor: number
  min: number
  max: number
  paso: number
  sufijo: string
  ayuda: string
  onChange: (v: number) => void
}

function Deslizador({ label, valor, min, max, paso, sufijo, ayuda, onChange }: DeslizadorProps) {
  const id = useId()
  return (
    <div className="deslizador">
      <label htmlFor={id}>
        {label}: <strong>{valor} {sufijo}</strong>
      </label>
      <input id={id} type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onChange(Number(e.target.value))} aria-describedby={`${id}-ayuda`} />
      <span id={`${id}-ayuda`} className="msg-ayuda">
        {ayuda}
      </span>
    </div>
  )
}

/** Perfil sugerido según el resultado del páncreas del paciente (Fase 3). */
function perfilDelPaciente(nivel: string | undefined): PerfilId | undefined {
  if (nivel === 'normal') return 'sano'
  if (nivel === 'leve') return 'resistencia'
  if (nivel === 'moderada') return 'diabetes'
  return undefined
}

/** Con "?perfil=diabetes" (o "resistencia") en la dirección, la simulación abre con ese perfil. */
function perfilInicial(): PerfilId {
  const id = new URLSearchParams(window.location.search).get('perfil')
  return id && id in PERFILES ? (id as PerfilId) : 'sano'
}

const pct = (valor: number, base: number) => Math.round((valor / base) * 100)

export default function SimulationPanel() {
  const [inicial] = useState(() => PERFILES[perfilInicial()])
  const [perfil, setPerfil] = useState<PerfilId>(perfilInicial)
  // Controles relativos a la persona sana, para que se entiendan sin unidades técnicas.
  const [siPct, setSiPct] = useState(() => pct(inicial.parametros.SI, SANO.SI))
  const [betaPct, setBetaPct] = useState(() => pct(inicial.parametros.beta, SANO.beta))
  const [gb, setGb] = useState(inicial.parametros.Gb)
  const [carbohidratos, setCarbohidratos] = useState(60)
  const [modo, setModo] = useState<ModoComidas>('una')
  const nivelPancreas = useAppStore((s) => s.evaluacion?.organos.pancreas?.nivel)
  const sugerido = perfilDelPaciente(nivelPancreas)

  const aplicarPerfil = (id: PerfilId) => {
    const p = PERFILES[id].parametros
    setPerfil(id)
    setSiPct(pct(p.SI, SANO.SI))
    setBetaPct(pct(p.beta, SANO.beta))
    setGb(p.Gb)
  }

  const calculo = useMemo(() => {
    const parametros: ParametrosFisiologicos = {
      ...PERFILES[perfil].parametros,
      SI: (SANO.SI * siPct) / 100,
      beta: (SANO.beta * betaPct) / 100,
      Gb: gb,
    }
    const { comidas, minutos } = comidasDe(modo, carbohidratos)
    try {
      const datos = combinar(simular(parametros, comidas, { minutos }), simular(SANO, comidas, { minutos }))
      const pts = datos.map((d) => ({ t: d.t, glucosa: d.glucosa, insulina: d.insulina }))
      return { datos, resumen: resumir(pts, parametros.Gb), error: undefined }
    } catch (e) {
      return { datos: [], resumen: undefined, error: (e as Error).message }
    }
  }, [perfil, siPct, betaPct, gb, carbohidratos, modo])

  const { datos, resumen, error } = calculo
  const tabla = datos.filter((d) => d.t % 30 === 0)

  return (
    <section className="panel simulacion" aria-label="Simulación de glucosa e insulina">
      <div className="form-header">
        <h2>Simulación: glucosa e insulina después de comer</h2>
      </div>
      <p className="note-inline">
        Simulación educativa simplificada (modelo mínimo de Bergman). No representa a una persona real y no sirve para tomar
        decisiones de tratamiento ni para calcular dosis.
      </p>

      <div className="sim-controles">
        <div className="campo">
          <label htmlFor="sim-perfil">Perfil</label>
          <select id="sim-perfil" value={perfil} onChange={(e) => aplicarPerfil(e.target.value as PerfilId)}>
            {(Object.keys(PERFILES) as PerfilId[]).map((id) => (
              <option key={id} value={id}>
                {PERFILES[id].nombre}
              </option>
            ))}
          </select>
          <span className="msg-ayuda">{PERFILES[perfil].descripcion}</span>
          {sugerido && sugerido !== perfil && (
            <button type="button" className="link-button" onClick={() => aplicarPerfil(sugerido)}>
              Usar el perfil que corresponde al paciente: {PERFILES[sugerido].nombre.toLowerCase()}
            </button>
          )}
        </div>
        <div className="campo">
          <label htmlFor="sim-modo">Comidas</label>
          <select id="sim-modo" value={modo} onChange={(e) => setModo(e.target.value as ModoComidas)}>
            <option value="una">Una comida (6 horas)</option>
            <option value="dia">Un día: 3 comidas cada 6 horas (24 horas)</option>
          </select>
        </div>
        <Deslizador label="Carbohidratos por comida" valor={carbohidratos} min={0} max={150} paso={5} sufijo="g" ayuda="Un plato de arroz o pasta ≈ 45–60 g" onChange={setCarbohidratos} />
        <Deslizador label="Sensibilidad a la insulina" valor={siPct} min={5} max={200} paso={5} sufijo="% de lo normal" ayuda="Cuánto responden músculos, hígado y grasa a la insulina" onChange={setSiPct} />
        <Deslizador label="Secreción de insulina" valor={betaPct} min={0} max={300} paso={5} sufijo="% de lo normal" ayuda="Cuánta insulina libera el páncreas cuando sube la glucosa" onChange={setBetaPct} />
        <Deslizador label="Glucosa en ayunas" valor={gb} min={70} max={250} paso={5} sufijo="mg/dL" ayuda="Valor de partida antes de comer" onChange={setGb} />
      </div>

      {error && (
        <p className="msg-error" role="alert">
          No se pudo simular: {error}
        </p>
      )}

      {resumen && (
        <>
          <dl className="sim-resumen" aria-live="polite">
            <div>
              <dt>Pico de glucosa</dt>
              <dd>
                {r0(resumen.picoGlucosa)} mg/dL <span className="muted small">a los {horas(resumen.minutoPico)}</span>
              </dd>
            </div>
            <div>
              <dt>Glucosa a las 2 h</dt>
              <dd>{resumen.glucosa2h !== undefined ? `${r0(resumen.glucosa2h)} mg/dL` : '—'}</dd>
            </div>
            <div>
              <dt>Pico de insulina</dt>
              <dd>{r0(resumen.picoInsulina)} μU/mL</dd>
            </div>
            <div>
              <dt>Vuelta a la glucosa de ayunas</dt>
              <dd>{resumen.minutosRetorno !== undefined ? horas(resumen.minutosRetorno) : 'no vuelve en este periodo'}</dd>
            </div>
          </dl>

          <div className="leyenda" aria-label="Leyenda">
            <span>
              <span className="swatch swatch-serie" aria-hidden="true" /> Perfil elegido ({PERFILES[perfil].nombre.toLowerCase()}
              {siPct !== pct(PERFILES[perfil].parametros.SI, SANO.SI) ||
              betaPct !== pct(PERFILES[perfil].parametros.beta, SANO.beta) ||
              gb !== PERFILES[perfil].parametros.Gb
                ? ', ajustado'
                : ''}
              )
            </span>
            <span>
              <span className="swatch swatch-ref" aria-hidden="true" /> Persona sana (referencia)
            </span>
          </div>

          <div className="graficas">
            <Grafica titulo="Glucosa" datos={datos} campo="glucosa" unidad="mg/dL" referencia={{ y: 140, etiqueta: '140: normal a las 2 h' }} />
            <Grafica titulo="Insulina" datos={datos} campo="insulina" unidad="μU/mL" />
          </div>

          <details>
            <summary>Ver los datos en tabla</summary>
            <div className="tabla-scroll">
              <table className="desglose">
                <thead>
                  <tr>
                    <th>Tiempo</th>
                    <th>Glucosa (mg/dL)</th>
                    <th>Glucosa, sana</th>
                    <th>Insulina (μU/mL)</th>
                    <th>Insulina, sana</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((d) => (
                    <tr key={d.t}>
                      <td>{horas(d.t)}</td>
                      <td>{r0(d.glucosa)}</td>
                      <td>{r0(d.glucosaRef)}</td>
                      <td>{r0(d.insulina)}</td>
                      <td>{r0(d.insulinaRef)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      <details className="sim-explicacion">
        <summary>¿Cómo funciona y cómo actúan los tratamientos?</summary>
        <ul>
          <li>Al comer, los carbohidratos se absorben en el intestino y la glucosa en sangre sube.</li>
          <li>El páncreas responde liberando insulina; la insulina ayuda a que músculos, hígado y grasa usen la glucosa, y esta vuelve a bajar.</li>
          <li>
            En la <strong>resistencia a la insulina</strong> el cuerpo responde menos: el páncreas compensa liberando más insulina. En la{' '}
            <strong>diabetes tipo 2</strong> la sensibilidad es muy baja y la secreción ya no alcanza, así que la glucosa sube más y tarda en bajar.
          </li>
          <li>
            Muchos tratamientos actúan sobre estos mismos mecanismos: la actividad física y algunos medicamentos mejoran la sensibilidad a la
            insulina; otros aumentan la secreción. Mueve los controles para ver el efecto de cada mecanismo. Los valores no representan la
            magnitud real de ningún tratamiento.
          </li>
        </ul>
        <p className="muted small">
          Modelo: Bergman RN, et al. Am J Physiol, 1979. Valores de sensibilidad a la insulina y efectividad de la glucosa de referencia:
          Bergman RN. Diabetes, 1989. La secreción de insulina y la absorción de la comida están simplificadas y calibradas para obtener
          curvas plausibles.
        </p>
      </details>
    </section>
  )
}
