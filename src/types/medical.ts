/**
 * Tipos médicos base del proyecto.
 * Las unidades van explícitas en el nombre del campo para evitar confusiones.
 * Los tipos de datos médicos (órganos, enfermedades, niveles) se generan desde los esquemas Zod
 * en src/data/schemas.ts. PatientData pasará a Zod en la Fase 3, junto con el formulario.
 */

import type { Nivel } from '../data/schemas'

export type { Afectacion, Disease, Escala, Etapa, Fuente, Organ } from '../data/schemas'

export type Sexo = 'F' | 'M'

/** Antecedentes familiares de diabetes, según categorías de FINDRISC. */
export type AntecedentesFamiliares = 'ninguno' | 'segundo_grado' | 'primer_grado'

/** Nivel de afectación de un órgano; define su color en el cuerpo 3D. */
export type NivelAfectacion = Nivel

export interface PatientData {
  edad: number
  sexo: Sexo
  pesoKg: number
  tallaCm: number
  cinturaCm: number
  /** Al menos 30 minutos de actividad física diaria. */
  actividadFisica: boolean
  frutasVerdurasDiario: boolean
  medicacionPresion: boolean
  /** Alguna vez se detectó glucosa alta (chequeo, embarazo, enfermedad). */
  glucosaAltaPrevia: boolean
  antecedentesFamiliares: AntecedentesFamiliares
  tieneDiabetes: boolean

  // Datos de laboratorio: opcionales. Si faltan, el órgano queda en "sin_datos".
  hba1cPorcentaje?: number
  glucosaAyunasMgDl?: number
  aniosDiagnostico?: number
  /** Tasa de filtración glomerular estimada (TFG / eGFR), mL/min/1.73m². */
  tfg?: number
  /** Cociente albúmina/creatinina en orina, mg/g. */
  albuminuriaMgG?: number
  presionSistolica?: number
  presionDiastolica?: number
}

