import { z } from 'zod'

/**
 * Datos del paciente (simulado). Unidades canónicas: glucosa mg/dL, HbA1c %, TFG mL/min/1.73 m², ACR mg/g.
 * Los rangos son límites de plausibilidad para evitar errores de captura, no valores normales.
 */
export const RANGOS = {
  edad: { min: 18, max: 120, unidad: 'años' },
  pesoKg: { min: 20, max: 350, unidad: 'kg' },
  tallaCm: { min: 100, max: 250, unidad: 'cm' },
  cinturaCm: { min: 40, max: 250, unidad: 'cm' },
  aniosDiagnostico: { min: 0, max: 100, unidad: 'años' },
  hba1cPorcentaje: { min: 3, max: 20, unidad: '%' },
  glucosaAyunasMgDl: { min: 20, max: 1000, unidad: 'mg/dL' },
  tfg: { min: 0, max: 200, unidad: 'mL/min/1.73 m²' },
  albuminuriaMgG: { min: 0, max: 10000, unidad: 'mg/g' },
  presionSistolica: { min: 50, max: 300, unidad: 'mmHg' },
  presionDiastolica: { min: 30, max: 200, unidad: 'mmHg' },
} as const

export type CampoNumerico = keyof typeof RANGOS

function numero(campo: CampoNumerico) {
  const r = RANGOS[campo]
  return z
    .number({ error: 'Debe ser un número' })
    .min(r.min, `Debe ser al menos ${r.min} ${r.unidad}`)
    .max(r.max, `Debe ser como máximo ${r.max} ${r.unidad}`)
}

export const PatientSchema = z
  .object({
    edad: numero('edad'),
    sexo: z.enum(['F', 'M']),
    pesoKg: numero('pesoKg'),
    tallaCm: numero('tallaCm'),
    cinturaCm: numero('cinturaCm'),
    /** Al menos 30 minutos de actividad física diaria. */
    actividadFisica: z.boolean(),
    frutasVerdurasDiario: z.boolean(),
    medicacionPresion: z.boolean(),
    /** Alguna vez se detectó glucosa alta (chequeo, embarazo, enfermedad). */
    glucosaAltaPrevia: z.boolean(),
    antecedentesFamiliares: z.enum(['ninguno', 'segundo_grado', 'primer_grado']),
    tieneDiabetes: z.boolean(),

    // Laboratorio: opcional. Si falta, el órgano queda "sin datos".
    hba1cPorcentaje: numero('hba1cPorcentaje').optional(),
    glucosaAyunasMgDl: numero('glucosaAyunasMgDl').optional(),
    aniosDiagnostico: numero('aniosDiagnostico').optional(),
    /** Tasa de filtración glomerular estimada (TFG / eGFR). */
    tfg: numero('tfg').optional(),
    /** Cociente albúmina/creatinina en orina. */
    albuminuriaMgG: numero('albuminuriaMgG').optional(),
    presionSistolica: numero('presionSistolica').optional(),
    presionDiastolica: numero('presionDiastolica').optional(),

    /** Etapa conocida por estudios previos, por órgano: { ojos: "rdnp_leve" }. */
    etapasConocidas: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.aniosDiagnostico !== undefined && p.aniosDiagnostico > p.edad) {
      ctx.addIssue({ code: 'custom', path: ['aniosDiagnostico'], message: 'No puede ser mayor que la edad' })
    }
  })

export type PatientData = z.infer<typeof PatientSchema>
