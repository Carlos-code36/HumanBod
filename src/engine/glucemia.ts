import type { Nivel } from '../data/schemas'

/**
 * Categoría glucémica según criterios diagnósticos de la ADA (Standards of Care):
 *   HbA1c:            normal <5.7 % · prediabetes 5.7–6.4 % · diabetes ≥6.5 %
 *   Glucosa en ayunas: normal <100 · prediabetes 100–125 · diabetes ≥126 mg/dL
 * El diagnóstico real requiere confirmación con una segunda prueba.
 */

export const FUENTE_ADA = 'ADA, Standards of Care in Diabetes'

export type CategoriaGlucemica = 'normal' | 'prediabetes' | 'diabetes'

const ORDEN: CategoriaGlucemica[] = ['normal', 'prediabetes', 'diabetes']

export const NIVEL_GLUCEMICO: Record<CategoriaGlucemica, Exclude<Nivel, 'sin_datos'>> = {
  normal: 'normal',
  prediabetes: 'leve',
  diabetes: 'moderada',
}

export function categoriaPorHba1c(porcentaje: number): CategoriaGlucemica {
  if (porcentaje < 5.7) return 'normal'
  if (porcentaje < 6.5) return 'prediabetes'
  return 'diabetes'
}

export function categoriaPorGlucosaAyunas(mgDl: number): CategoriaGlucemica {
  if (mgDl < 100) return 'normal'
  if (mgDl < 126) return 'prediabetes'
  return 'diabetes'
}

/** Si hay varias pruebas, manda la categoría más alta. */
export function peorCategoria(...cats: (CategoriaGlucemica | undefined)[]): CategoriaGlucemica | undefined {
  const presentes = cats.filter((c): c is CategoriaGlucemica => c !== undefined)
  if (presentes.length === 0) return undefined
  return presentes.reduce((a, b) => (ORDEN.indexOf(b) > ORDEN.indexOf(a) ? b : a))
}
