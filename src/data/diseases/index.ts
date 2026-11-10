import { ORGANS } from '../organs'
import { diseaseSchemaFor, formatearErrores, type Afectacion, type Disease, type Fuente } from '../schemas'
import diabetesT2Json from './diabetes_t2.json'

/** Valida una enfermedad contra el esquema y el catálogo de órganos. Lanza un error legible si falla. */
export function cargarEnfermedad(raw: unknown, organIds: readonly string[] = ORGANS.map((o) => o.id)): Disease {
  const r = diseaseSchemaFor(organIds).safeParse(raw)
  if (!r.success) throw new Error(`Datos de enfermedad no válidos:\n${formatearErrores(r.error)}`)
  return r.data
}

export const DIABETES_T2: Disease = cargarEnfermedad(diabetesT2Json)

/** Afectación de un órgano en la enfermedad, o undefined si no está descrita. */
export function afectacionDe(disease: Disease, organId: string | null | undefined): Afectacion | undefined {
  return organId ? disease.afectaciones.find((a) => a.organo === organId) : undefined
}

export function fuentesDe(disease: Disease, ids: readonly string[]): Fuente[] {
  return ids.flatMap((id) => disease.fuentes.filter((f) => f.id === id))
}
