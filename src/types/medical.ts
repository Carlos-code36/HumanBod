/**
 * Tipos médicos base del proyecto.
 * Las unidades van explícitas en el nombre del campo para evitar confusiones.
 * Todos los tipos se generan desde esquemas Zod (una sola fuente de verdad):
 *  - src/data/schemas.ts        → órganos, enfermedades, niveles
 *  - src/data/patientSchema.ts  → datos del paciente
 */

import type { Nivel } from '../data/schemas'
import type { PatientData } from '../data/patientSchema'

export type { Afectacion, Disease, Escala, Etapa, Fuente, Organ } from '../data/schemas'
export type { PatientData } from '../data/patientSchema'

export type Sexo = PatientData['sexo']

/** Antecedentes familiares de diabetes, según categorías de FINDRISC. */
export type AntecedentesFamiliares = PatientData['antecedentesFamiliares']

/** Nivel de afectación de un órgano; define su color en el cuerpo 3D. */
export type NivelAfectacion = Nivel
