import type { FormValues } from '../components/PatientForm/formValues'

/** Pacientes ficticios para explorar la app. No son personas reales. */
export const EJEMPLOS: { id: string; nombre: string; valores: Partial<FormValues> }[] = [
  {
    id: 'riesgo_bajo',
    nombre: 'Adulto joven, sin diabetes, riesgo bajo',
    valores: { edad: '28', sexo: 'M', pesoKg: '72', tallaCm: '178', cinturaCm: '82' },
  },
  {
    id: 'prediabetes',
    nombre: 'Sin diagnóstico, varios factores de riesgo',
    valores: {
      edad: '55', sexo: 'F', pesoKg: '84', tallaCm: '165', cinturaCm: '102',
      actividadFisica: false, frutasVerdurasDiario: false, glucosaAltaPrevia: true,
      antecedentesFamiliares: 'primer_grado', hba1c: '6.1',
    },
  },
  {
    id: 'diabetes_controlada',
    nombre: 'Diabetes de 6 años, bien controlada',
    valores: {
      edad: '58', sexo: 'M', pesoKg: '82', tallaCm: '172', cinturaCm: '98',
      tieneDiabetes: true, aniosDiagnostico: '6', hba1c: '6.8', tfg: '95', albuminuria: '10',
      etapasConocidas: { ojos: 'sin_rd', nervios: 'n0' },
    },
  },
  {
    id: 'complicaciones',
    nombre: 'Diabetes de 14 años con complicaciones',
    valores: {
      edad: '63', sexo: 'F', pesoKg: '88', tallaCm: '160', cinturaCm: '104', medicacionPresion: true,
      tieneDiabetes: true, aniosDiagnostico: '14', hba1c: '8.4', tfg: '50', albuminuria: '120',
      etapasConocidas: { ojos: 'rdnp_moderada', nervios: 'n2', corazon: 'b', higado: 'esteatosis' },
    },
  },
]
