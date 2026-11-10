import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { EJEMPLOS } from '../../data/ejemplos'
import { CALCULADOS, evaluar } from '../../engine/evaluar'
import { useAppStore } from '../../store/useAppStore'
import type { Disease } from '../../types/medical'
import { FORM_VACIO, OBLIGATORIOS, aPaciente, type CampoForm, type FormValues } from './formValues'

interface CampoProps {
  id: string
  label: string
  error?: string
  ayuda?: string
  children: ReactNode
}

function Campo({ id, label, error, ayuda, children }: CampoProps) {
  return (
    <div className={`campo${error ? ' campo-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span id={`${id}-msg`} className="msg-error" role="alert">
          {error}
        </span>
      ) : (
        ayuda && (
          <span id={`${id}-msg`} className="msg-ayuda">
            {ayuda}
          </span>
        )
      )}
    </div>
  )
}

/** Formulario de datos del paciente. Valida en vivo y recalcula los resultados en cada cambio (F3-05). */
export default function PatientForm({ disease }: { disease: Disease }) {
  const uid = useId()
  // Con "?ejemplo=<id>" en la dirección se abre con ese paciente de ejemplo cargado.
  const [ejemploInicial] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('ejemplo')
    return EJEMPLOS.find((e) => e.id === id)
  })
  const [v, setV] = useState<FormValues>(() => ({ ...FORM_VACIO, ...ejemploInicial?.valores }))
  const [tocados, setTocados] = useState<Set<CampoForm>>(new Set())
  const setEvaluacion = useAppStore((s) => s.setEvaluacion)

  const resultado = useMemo(() => aPaciente(v), [v])

  useEffect(() => {
    setEvaluacion(resultado.ok ? evaluar(resultado.paciente, disease) : null)
  }, [resultado, disease, setEvaluacion])

  const set = <K extends CampoForm>(campo: K, valor: FormValues[K]) => setV((prev) => ({ ...prev, [campo]: valor }))
  const tocar = (campo: CampoForm) => setTocados((prev) => new Set(prev).add(campo))

  // Un error se muestra si el campo ya se tocó o si tiene algo escrito (no al abrir el formulario vacío).
  const error = (campo: CampoForm): string | undefined => {
    if (resultado.ok) return undefined
    const msg = resultado.errores[campo]
    const valor = v[campo]
    const escrito = typeof valor === 'string' && valor.trim() !== ''
    return msg && (tocados.has(campo) || escrito) ? msg : undefined
  }

  const id = (campo: string) => `${uid}-${campo}`

  const texto = (campo: CampoForm & keyof FormValues, label: string, ayuda?: string, extra?: ReactNode) => {
    const err = error(campo)
    return (
      <Campo id={id(campo)} label={label} error={err} ayuda={ayuda}>
        <div className="input-unidad">
          <input
            id={id(campo)}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={v[campo] as string}
            onChange={(e) => set(campo, e.target.value as never)}
            onBlur={() => tocar(campo)}
            aria-invalid={Boolean(err)}
            aria-required={OBLIGATORIOS.includes(campo)}
            aria-describedby={err || ayuda ? `${id(campo)}-msg` : undefined}
          />
          {extra}
        </div>
      </Campo>
    )
  }

  const check = (campo: 'actividadFisica' | 'frutasVerdurasDiario' | 'medicacionPresion' | 'glucosaAltaPrevia' | 'tieneDiabetes', label: string) => (
    <label className="check">
      <input type="checkbox" checked={v[campo]} onChange={(e) => set(campo, e.target.checked)} />
      {label}
    </label>
  )

  const cargarEjemplo = (ejemploId: string) => {
    const ej = EJEMPLOS.find((e) => e.id === ejemploId)
    setV(ej ? { ...FORM_VACIO, ...ej.valores } : FORM_VACIO)
    setTocados(new Set())
  }

  const faltan = !resultado.ok && OBLIGATORIOS.filter((c) => resultado.errores[c] === 'Obligatorio')
  const conEtapaManual = disease.afectaciones.filter((a) => !CALCULADOS.has(a.organo))

  return (
    <form className="panel patient-form" onSubmit={(e) => e.preventDefault()} noValidate aria-label="Datos del paciente">
      <div className="form-header">
        <h2>Datos del paciente</h2>
        <label className="ejemplo">
          <span className="muted">Cargar ejemplo:</span>
          <select defaultValue={ejemploInicial?.id ?? ''} onChange={(e) => cargarEjemplo(e.target.value)} aria-label="Cargar paciente de ejemplo">
            <option value="">— Vacío —</option>
            {EJEMPLOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small">Paciente ficticio para aprender. No ingreses datos personales reales.</p>

      <fieldset>
        <legend>Datos generales</legend>
        <div className="grid-campos">
          {texto('edad', 'Edad (años)')}
          <Campo id={id('sexo')} label="Sexo">
            <select id={id('sexo')} value={v.sexo} onChange={(e) => set('sexo', e.target.value as FormValues['sexo'])}>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </Campo>
          {texto('pesoKg', 'Peso (kg)')}
          {texto('tallaCm', 'Talla (cm)')}
          {texto('cinturaCm', 'Cintura (cm)', 'A la altura del ombligo')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Hábitos y antecedentes</legend>
        <div className="checks">
          {check('actividadFisica', 'Hace al menos 30 minutos de actividad física al día')}
          {check('frutasVerdurasDiario', 'Come frutas o verduras todos los días')}
          {check('medicacionPresion', 'Toma o tomó medicación para la presión')}
          {check('glucosaAltaPrevia', 'Alguna vez le detectaron glucosa alta (incluye embarazo)')}
        </div>
        <Campo id={id('antecedentes')} label="Familiares con diabetes">
          <select
            id={id('antecedentes')}
            value={v.antecedentesFamiliares}
            onChange={(e) => set('antecedentesFamiliares', e.target.value as FormValues['antecedentesFamiliares'])}
          >
            <option value="ninguno">Ninguno</option>
            <option value="segundo_grado">Abuelos, tíos o primos</option>
            <option value="primer_grado">Padres, hermanos o hijos</option>
          </select>
        </Campo>
      </fieldset>

      <fieldset>
        <legend>Diabetes</legend>
        <div className="checks">{check('tieneDiabetes', 'Tiene diagnóstico de diabetes tipo 2')}</div>
        {v.tieneDiabetes && <div className="grid-campos">{texto('aniosDiagnostico', 'Años desde el diagnóstico')}</div>}
      </fieldset>

      <fieldset>
        <legend>Laboratorio (opcional)</legend>
        <div className="grid-campos">
          {texto(
            'hba1c',
            'HbA1c',
            undefined,
            <select aria-label="Unidad de HbA1c" value={v.hba1cUnidad} onChange={(e) => set('hba1cUnidad', e.target.value as FormValues['hba1cUnidad'])}>
              <option value="%">%</option>
              <option value="mmol/mol">mmol/mol</option>
            </select>,
          )}
          {texto(
            'glucosa',
            'Glucosa en ayunas',
            undefined,
            <select aria-label="Unidad de glucosa" value={v.glucosaUnidad} onChange={(e) => set('glucosaUnidad', e.target.value as FormValues['glucosaUnidad'])}>
              <option value="mg/dL">mg/dL</option>
              <option value="mmol/L">mmol/L</option>
            </select>,
          )}
          {texto('tfg', 'TFG (mL/min/1.73 m²)', 'Filtración glomerular estimada')}
          {texto('albuminuria', 'Albuminuria (mg/g)', 'Cociente albúmina/creatinina en orina')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Estudios previos (opcional)</legend>
        <p className="muted small">Si un especialista ya te indicó la etapa, selecciónala. Si no, deja "No sé".</p>
        <div className="grid-campos">
          {conEtapaManual.map((a) => (
            <Campo key={a.organo} id={id(`etapa-${a.organo}`)} label={a.complicacion}>
              <select
                id={id(`etapa-${a.organo}`)}
                value={v.etapasConocidas[a.organo] ?? ''}
                onChange={(e) => set('etapasConocidas', { ...v.etapasConocidas, [a.organo]: e.target.value })}
              >
                <option value="">No sé / sin estudio</option>
                {a.escalas.flatMap((esc) =>
                  esc.etapas.map((et) => (
                    <option key={`${esc.id}-${et.id}`} value={et.id}>
                      {et.nombre}
                    </option>
                  )),
                )}
              </select>
            </Campo>
          ))}
        </div>
      </fieldset>

      {faltan && faltan.length > 0 && (
        <p className="muted small" role="status">
          Completa los datos obligatorios para ver los resultados: edad, peso, talla y cintura.
        </p>
      )}
    </form>
  )
}
