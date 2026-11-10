import type { NivelAfectacion } from '../types/medical'

/** Niveles ordenados de menor a mayor afectación. */
export const NIVELES: readonly NivelAfectacion[] = [
  'sin_datos',
  'normal',
  'leve',
  'moderada',
  'severa',
] as const

interface InfoNivel {
  color: string
  etiqueta: string
}

const INFO: Record<NivelAfectacion, InfoNivel> = {
  sin_datos: { color: '#9aa0a6', etiqueta: 'Sin datos' },
  normal: { color: '#34a853', etiqueta: 'Normal' },
  leve: { color: '#f2c200', etiqueta: 'Leve' },
  moderada: { color: '#f57c00', etiqueta: 'Moderada' },
  severa: { color: '#d93025', etiqueta: 'Severa' },
}

export function esNivelValido(valor: unknown): valor is NivelAfectacion {
  return typeof valor === 'string' && (NIVELES as readonly string[]).includes(valor)
}

/** Cualquier valor desconocido o inválido se trata como "sin_datos" (gris). Nunca lanza error. */
export function normalizarNivel(valor: unknown): NivelAfectacion {
  return esNivelValido(valor) ? valor : 'sin_datos'
}

export function colorDeNivel(valor: unknown): string {
  return INFO[normalizarNivel(valor)].color
}

/** Texto del nivel: se muestra junto al color para no depender solo de él (daltonismo). */
export function etiquetaDeNivel(valor: unknown): string {
  return INFO[normalizarNivel(valor)].etiqueta
}
