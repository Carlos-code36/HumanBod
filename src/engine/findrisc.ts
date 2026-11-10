import type { PatientData } from '../types/medical'
import type { Nivel } from '../data/schemas'
import { imc } from './unidades'

/**
 * FINDRISC — Finnish Diabetes Risk Score.
 * Lindström J, Tuomilehto J. The Diabetes Risk Score. Diabetes Care 2003;26:725-731.
 *
 * Estima el riesgo de desarrollar diabetes tipo 2 en 10 años (puntaje 0–26).
 * Solo se aplica a personas SIN diagnóstico de diabetes.
 *
 * Puntajes verificados contra varias fuentes secundarias consistentes (noviembre de 2026).
 * Los límites exactos no los define el cuestionario original ("25–30", "94–102");
 * DECISIÓN: los rangos incluyen ambos extremos (IMC 30.0 → 1 punto; 30.1 → 3 puntos).
 */

export const FUENTE_FINDRISC = 'Lindström J, Tuomilehto J. Diabetes Care, 2003'

export interface FactorFindrisc {
  factor: string
  valor: string
  puntos: number
  maximo: number
}

export type CategoriaFindrisc = 'baja' | 'ligeramente_elevada' | 'moderada' | 'alta' | 'muy_alta'

export interface ResultadoFindrisc {
  puntaje: number
  categoria: CategoriaFindrisc
  /** Etiqueta para "Riesgo …": Bajo, Ligeramente elevado, Moderado, Alto, Muy alto. */
  etiqueta: string
  /** Riesgo aproximado de desarrollar diabetes en 10 años. */
  riesgo10Anios: string
  nivel: Exclude<Nivel, 'sin_datos'>
  desglose: FactorFindrisc[]
}

const CATEGORIAS: { max: number; categoria: CategoriaFindrisc; etiqueta: string; riesgo: string; nivel: ResultadoFindrisc['nivel'] }[] = [
  { max: 6, categoria: 'baja', etiqueta: 'Bajo', riesgo: 'aprox. 1 de cada 100', nivel: 'normal' },
  { max: 11, categoria: 'ligeramente_elevada', etiqueta: 'Ligeramente elevado', riesgo: 'aprox. 1 de cada 25', nivel: 'leve' },
  { max: 14, categoria: 'moderada', etiqueta: 'Moderado', riesgo: 'aprox. 1 de cada 6', nivel: 'moderada' },
  { max: 20, categoria: 'alta', etiqueta: 'Alto', riesgo: 'aprox. 1 de cada 3', nivel: 'severa' },
  { max: 26, categoria: 'muy_alta', etiqueta: 'Muy alto', riesgo: 'aprox. 1 de cada 2', nivel: 'severa' },
]

export function puntosEdad(edad: number): number {
  const anios = Math.floor(edad)
  if (anios < 45) return 0
  if (anios <= 54) return 2
  if (anios <= 64) return 3
  return 4
}

export function puntosImc(valorImc: number): number {
  if (valorImc < 25) return 0
  if (valorImc <= 30) return 1
  return 3
}

/** Umbrales distintos por sexo: hombres 94/102 cm, mujeres 80/88 cm. */
export function puntosCintura(cinturaCm: number, sexo: PatientData['sexo']): number {
  const [bajo, alto] = sexo === 'M' ? [94, 102] : [80, 88]
  if (cinturaCm < bajo) return 0
  if (cinturaCm <= alto) return 3
  return 4
}

const PUNTOS_ANTECEDENTES: Record<PatientData['antecedentesFamiliares'], number> = {
  ninguno: 0,
  segundo_grado: 3,
  primer_grado: 5,
}

const TEXTO_ANTECEDENTES: Record<PatientData['antecedentesFamiliares'], string> = {
  ninguno: 'ninguno',
  segundo_grado: 'abuelos, tíos o primos',
  primer_grado: 'padres, hermanos o hijos',
}

export function categoriaFindrisc(puntaje: number) {
  const c = CATEGORIAS.find((c) => puntaje <= c.max)
  if (!c || puntaje < 0 || !Number.isInteger(puntaje)) throw new RangeError(`Puntaje FINDRISC fuera de rango: ${puntaje}`)
  return c
}

export function calcularFindrisc(p: PatientData): ResultadoFindrisc {
  const valorImc = imc(p.pesoKg, p.tallaCm)
  const siNo = (v: boolean) => (v ? 'sí' : 'no')

  const desglose: FactorFindrisc[] = [
    { factor: 'Edad', valor: `${Math.floor(p.edad)} años`, puntos: puntosEdad(p.edad), maximo: 4 },
    { factor: 'Índice de masa corporal', valor: `${valorImc.toFixed(1)} kg/m²`, puntos: puntosImc(valorImc), maximo: 3 },
    { factor: 'Cintura', valor: `${p.cinturaCm} cm`, puntos: puntosCintura(p.cinturaCm, p.sexo), maximo: 4 },
    { factor: 'Actividad física diaria (30 min)', valor: siNo(p.actividadFisica), puntos: p.actividadFisica ? 0 : 2, maximo: 2 },
    { factor: 'Frutas o verduras todos los días', valor: siNo(p.frutasVerdurasDiario), puntos: p.frutasVerdurasDiario ? 0 : 1, maximo: 1 },
    { factor: 'Medicación para la presión', valor: siNo(p.medicacionPresion), puntos: p.medicacionPresion ? 2 : 0, maximo: 2 },
    { factor: 'Glucosa alta alguna vez', valor: siNo(p.glucosaAltaPrevia), puntos: p.glucosaAltaPrevia ? 5 : 0, maximo: 5 },
    {
      factor: 'Familiares con diabetes',
      valor: TEXTO_ANTECEDENTES[p.antecedentesFamiliares],
      puntos: PUNTOS_ANTECEDENTES[p.antecedentesFamiliares],
      maximo: 5,
    },
  ]

  const puntaje = desglose.reduce((s, f) => s + f.puntos, 0)
  const c = categoriaFindrisc(puntaje)
  return { puntaje, categoria: c.categoria, etiqueta: c.etiqueta, riesgo10Anios: c.riesgo, nivel: c.nivel, desglose }
}
