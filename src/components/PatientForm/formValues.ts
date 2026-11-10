import { PatientSchema, RANGOS, type CampoNumerico, type PatientData } from '../../data/patientSchema'
import { glucosaMgDlAMmolL, glucosaMmolLAMgDl, hba1cMmolMolAPorcentaje, hba1cPorcentajeAMmolMol, parsearNumero } from '../../engine/unidades'

/** Valores tal como los escribe el usuario (texto), con la unidad elegida. */
export interface FormValues {
  edad: string
  sexo: 'F' | 'M'
  pesoKg: string
  tallaCm: string
  cinturaCm: string
  actividadFisica: boolean
  frutasVerdurasDiario: boolean
  medicacionPresion: boolean
  glucosaAltaPrevia: boolean
  antecedentesFamiliares: PatientData['antecedentesFamiliares']
  tieneDiabetes: boolean
  aniosDiagnostico: string
  hba1c: string
  hba1cUnidad: '%' | 'mmol/mol'
  glucosa: string
  glucosaUnidad: 'mg/dL' | 'mmol/L'
  tfg: string
  albuminuria: string
  etapasConocidas: Record<string, string>
}

export type CampoForm = keyof FormValues
export type Errores = Partial<Record<CampoForm, string>>

export const FORM_VACIO: FormValues = {
  edad: '',
  sexo: 'F',
  pesoKg: '',
  tallaCm: '',
  cinturaCm: '',
  actividadFisica: true,
  frutasVerdurasDiario: true,
  medicacionPresion: false,
  glucosaAltaPrevia: false,
  antecedentesFamiliares: 'ninguno',
  tieneDiabetes: false,
  aniosDiagnostico: '',
  hba1c: '',
  hba1cUnidad: '%',
  glucosa: '',
  glucosaUnidad: 'mg/dL',
  tfg: '',
  albuminuria: '',
  etapasConocidas: {},
}

export const OBLIGATORIOS: CampoForm[] = ['edad', 'pesoKg', 'tallaCm', 'cinturaCm']

/** Campo del esquema → campo del formulario (los que cambian de nombre por la unidad). */
const CAMPO_FORM: Partial<Record<string, CampoForm>> = {
  hba1cPorcentaje: 'hba1c',
  glucosaAyunasMgDl: 'glucosa',
  albuminuriaMgG: 'albuminuria',
}

const fmtRango = (n: number) => String(Math.round(n * 10) / 10)

/** Mensaje de rango en la unidad que eligió el usuario (no en la interna). */
function mensajeRango(v: FormValues, campo: CampoNumerico): string | undefined {
  const r = RANGOS[campo]
  if (campo === 'hba1cPorcentaje' && v.hba1cUnidad === 'mmol/mol') {
    return `Debe estar entre ${fmtRango(hba1cPorcentajeAMmolMol(r.min))} y ${fmtRango(hba1cPorcentajeAMmolMol(r.max))} mmol/mol`
  }
  if (campo === 'glucosaAyunasMgDl' && v.glucosaUnidad === 'mmol/L') {
    return `Debe estar entre ${fmtRango(glucosaMgDlAMmolL(r.min))} y ${fmtRango(glucosaMgDlAMmolL(r.max))} mmol/L`
  }
  return undefined
}

export type ResultadoForm = { ok: true; paciente: PatientData } | { ok: false; errores: Errores }

/** Convierte el formulario en un paciente válido o en errores por campo. */
export function aPaciente(v: FormValues): ResultadoForm {
  const errores: Errores = {}
  const num = (campo: CampoForm, texto: string) => {
    const n = parsearNumero(texto)
    if (n === undefined && OBLIGATORIOS.includes(campo)) errores[campo] = 'Obligatorio'
    return n
  }

  const hba1c = num('hba1c', v.hba1c)
  const glucosa = num('glucosa', v.glucosa)

  const raw = {
    edad: num('edad', v.edad),
    sexo: v.sexo,
    pesoKg: num('pesoKg', v.pesoKg),
    tallaCm: num('tallaCm', v.tallaCm),
    cinturaCm: num('cinturaCm', v.cinturaCm),
    actividadFisica: v.actividadFisica,
    frutasVerdurasDiario: v.frutasVerdurasDiario,
    medicacionPresion: v.medicacionPresion,
    glucosaAltaPrevia: v.glucosaAltaPrevia,
    antecedentesFamiliares: v.antecedentesFamiliares,
    tieneDiabetes: v.tieneDiabetes,
    // Los años con diagnóstico solo cuentan si la persona tiene diabetes.
    aniosDiagnostico: v.tieneDiabetes ? num('aniosDiagnostico', v.aniosDiagnostico) : undefined,
    hba1cPorcentaje: hba1c !== undefined && v.hba1cUnidad === 'mmol/mol' ? hba1cMmolMolAPorcentaje(hba1c) : hba1c,
    glucosaAyunasMgDl: glucosa !== undefined && v.glucosaUnidad === 'mmol/L' ? glucosaMmolLAMgDl(glucosa) : glucosa,
    tfg: num('tfg', v.tfg),
    albuminuriaMgG: num('albuminuria', v.albuminuria),
    etapasConocidas: Object.fromEntries(Object.entries(v.etapasConocidas).filter(([, etapa]) => etapa !== '')),
  }

  const r = PatientSchema.safeParse(raw)
  if (r.success && Object.keys(errores).length === 0) return { ok: true, paciente: r.data }

  for (const issue of r.error?.issues ?? []) {
    const campoSchema = String(issue.path[0])
    const campo = CAMPO_FORM[campoSchema] ?? (campoSchema as CampoForm)
    if (errores[campo]) continue
    const esRango = issue.code === 'too_small' || issue.code === 'too_big'
    errores[campo] = (esRango && mensajeRango(v, campoSchema as CampoNumerico)) || issue.message
  }
  return { ok: false, errores }
}
