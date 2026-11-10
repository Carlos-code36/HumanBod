import type { PatientData } from '../../src/types/medical'

/**
 * Crea un paciente válido por defecto (adulto sin diabetes).
 * Solo se cambia lo que interesa en cada prueba:
 *   createPatient({ edad: 67, pesoKg: 95 })
 */
export function createPatient(overrides: Partial<PatientData> = {}): PatientData {
  return {
    edad: 45,
    sexo: 'F',
    pesoKg: 70,
    tallaCm: 165,
    cinturaCm: 85,
    actividadFisica: true,
    frutasVerdurasDiario: true,
    medicacionPresion: false,
    glucosaAltaPrevia: false,
    antecedentesFamiliares: 'ninguno',
    tieneDiabetes: false,
    ...overrides,
  }
}

/** Paciente con diabetes y datos de laboratorio completos y normales. */
function createDiabeticPatient(overrides: Partial<PatientData> = {}): PatientData {
  return createPatient({
    edad: 58,
    tieneDiabetes: true,
    hba1cPorcentaje: 6.8,
    glucosaAyunasMgDl: 125,
    aniosDiagnostico: 6,
    tfg: 95,
    albuminuriaMgG: 10,
    presionSistolica: 128,
    presionDiastolica: 80,
    ...overrides,
  })
}

/**
 * Personas predefinidas (ver ESCENARIOS.md).
 * Los resultados esperados se verificarán en las Fases 3 y 4.
 */
export const personas = {
  /** Joven, IMC normal, activo → riesgo bajo, todo verde. */
  sano: createPatient({ edad: 28, sexo: 'M', pesoKg: 72, tallaCm: 178, cinturaCm: 82 }),

  /** 55 años, IMC ~31, sedentario, antecedentes → FINDRISC alto. */
  prediabetes: createPatient({
    edad: 55,
    pesoKg: 84,
    tallaCm: 165,
    cinturaCm: 102,
    actividadFisica: false,
    frutasVerdurasDiario: false,
    glucosaAltaPrevia: true,
    antecedentesFamiliares: 'primer_grado',
  }),

  /** Diabetes bien controlada → riñón G1/A1. */
  diabetesControlada: createDiabeticPatient(),

  /** TFG 50, albuminuria 120 → riñón G3a/A2. */
  nefropatiaModerada: createDiabeticPatient({
    aniosDiagnostico: 14,
    hba1cPorcentaje: 8.4,
    tfg: 50,
    albuminuriaMgG: 120,
  }),

  /** TFG 12, albuminuria 500 → riñón G5/A3. */
  nefropatiaSevera: createDiabeticPatient({
    edad: 66,
    aniosDiagnostico: 22,
    hba1cPorcentaje: 9.5,
    tfg: 12,
    albuminuriaMgG: 500,
  }),

  /** Diabetes sin análisis de laboratorio → órganos "sin_datos". */
  datosIncompletos: createPatient({ edad: 50, tieneDiabetes: true }),

  /** Valores en los límites permitidos → no debe romper nada. */
  extremo: createDiabeticPatient({
    edad: 100,
    pesoKg: 250,
    tallaCm: 120,
    cinturaCm: 200,
    hba1cPorcentaje: 15,
    tfg: 1,
    albuminuriaMgG: 5000,
  }),
} satisfies Record<string, PatientData>

export type PersonaId = keyof typeof personas
