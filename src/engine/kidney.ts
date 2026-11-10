import type { Nivel } from '../data/schemas'

/**
 * Clasificación de enfermedad renal crónica — KDIGO 2024 (Kidney International 105(4S), 2024).
 * Verificado (noviembre de 2026) con resúmenes de la guía y el mapa de calor KDIGO:
 *   TFG:  G1 ≥90 · G2 60–89 · G3a 45–59 · G3b 30–44 · G4 15–29 · G5 <15  (mL/min/1.73 m²)
 *   ACR:  A1 <30 · A2 30–300 · A3 >300  (mg/g)
 *
 * Nota: para diagnosticar ERC las alteraciones deben persistir más de 3 meses;
 * aquí solo se clasifica un valor puntual, con fines educativos.
 */

export const FUENTE_KDIGO = 'KDIGO 2024, guía de evaluación y manejo de la ERC'

export type CategoriaTfg = 'g1' | 'g2' | 'g3a' | 'g3b' | 'g4' | 'g5'
export type CategoriaAlbuminuria = 'a1' | 'a2' | 'a3'

export function categoriaTfg(tfg: number): CategoriaTfg {
  if (!Number.isFinite(tfg) || tfg < 0) throw new RangeError(`TFG inválida: ${tfg}`)
  if (tfg >= 90) return 'g1'
  if (tfg >= 60) return 'g2'
  if (tfg >= 45) return 'g3a'
  if (tfg >= 30) return 'g3b'
  if (tfg >= 15) return 'g4'
  return 'g5'
}

export function categoriaAlbuminuria(acrMgG: number): CategoriaAlbuminuria {
  if (!Number.isFinite(acrMgG) || acrMgG < 0) throw new RangeError(`Albuminuria inválida: ${acrMgG}`)
  if (acrMgG < 30) return 'a1'
  if (acrMgG <= 300) return 'a2'
  return 'a3'
}

type NivelRenal = Exclude<Nivel, 'sin_datos'>

/**
 * Mapa de calor KDIGO (riesgo de progresión, eventos cardiovasculares y mortalidad):
 * verde → normal, amarillo → leve, naranja → moderada, rojo → severa.
 */
const MAPA_CALOR: Record<CategoriaTfg, Record<CategoriaAlbuminuria, NivelRenal>> = {
  g1: { a1: 'normal', a2: 'leve', a3: 'moderada' },
  g2: { a1: 'normal', a2: 'leve', a3: 'moderada' },
  g3a: { a1: 'leve', a2: 'moderada', a3: 'severa' },
  g3b: { a1: 'moderada', a2: 'severa', a3: 'severa' },
  g4: { a1: 'severa', a2: 'severa', a3: 'severa' },
  g5: { a1: 'severa', a2: 'severa', a3: 'severa' },
}

/** Nivel solo por TFG, cuando falta la albuminuria (el riesgo real podría ser mayor). */
const NIVEL_SOLO_TFG: Record<CategoriaTfg, NivelRenal> = {
  g1: 'normal',
  g2: 'normal',
  g3a: 'leve',
  g3b: 'moderada',
  g4: 'severa',
  g5: 'severa',
}

/** Nivel solo por albuminuria, cuando falta la TFG. */
const NIVEL_SOLO_ACR: Record<CategoriaAlbuminuria, NivelRenal> = {
  a1: 'normal',
  a2: 'leve',
  a3: 'moderada',
}

/** Formato de la guía: g3a → "G3a", a2 → "A2". */
export function nombreCategoria(c: CategoriaTfg | CategoriaAlbuminuria): string {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

export interface ResultadoRenal {
  tfg?: CategoriaTfg
  albuminuria?: CategoriaAlbuminuria
  /** Ej.: "G3a/A2", "G2" o "A2". */
  etiqueta: string
  nivel: NivelRenal
  completo: boolean
}

/** Devuelve undefined si no hay ningún dato renal. */
export function clasificarRinon(tfg?: number, acrMgG?: number): ResultadoRenal | undefined {
  const g = tfg === undefined ? undefined : categoriaTfg(tfg)
  const a = acrMgG === undefined ? undefined : categoriaAlbuminuria(acrMgG)

  if (g && a) return { tfg: g, albuminuria: a, etiqueta: `${nombreCategoria(g)}/${nombreCategoria(a)}`, nivel: MAPA_CALOR[g][a], completo: true }
  if (g) return { tfg: g, etiqueta: nombreCategoria(g), nivel: NIVEL_SOLO_TFG[g], completo: false }
  if (a) return { albuminuria: a, etiqueta: nombreCategoria(a), nivel: NIVEL_SOLO_ACR[a], completo: false }
  return undefined
}
