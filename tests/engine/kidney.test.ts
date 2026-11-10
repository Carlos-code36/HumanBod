import { describe, expect, it } from 'vitest'
import { categoriaAlbuminuria, categoriaTfg, clasificarRinon, nombreCategoria } from '../../src/engine/kidney'

describe('KDIGO: categoría por TFG', () => {
  it.each([
    [200, 'g1'], [90, 'g1'], [60, 'g2'], [45, 'g3a'], [30, 'g3b'], [15, 'g4'], [0, 'g5'],
  ])('F3-20: TFG %s (límite exacto) → %s', (tfg, cat) => {
    expect(categoriaTfg(tfg)).toBe(cat)
  })

  it.each([
    [89.9, 'g2'], [59.9, 'g3a'], [44.9, 'g3b'], [29.9, 'g4'], [14.9, 'g5'],
  ])('F3-21: TFG %s (justo debajo) → %s', (tfg, cat) => {
    expect(categoriaTfg(tfg)).toBe(cat)
  })

  it('F3-24: TFG negativa o no numérica se rechaza', () => {
    expect(() => categoriaTfg(-1)).toThrow(RangeError)
    expect(() => categoriaTfg(Number.NaN)).toThrow(RangeError)
  })
})

describe('KDIGO: categoría por albuminuria', () => {
  it.each([
    [0, 'a1'], [29, 'a1'], [29.9, 'a1'], [30, 'a2'], [300, 'a2'], [300.1, 'a3'], [301, 'a3'],
  ])('F3-22: %s mg/g → %s', (acr, cat) => {
    expect(categoriaAlbuminuria(acr)).toBe(cat)
  })
})

describe('KDIGO: mapa de calor', () => {
  // Filas G1..G5, columnas A1..A3 (verde=normal, amarillo=leve, naranja=moderada, rojo=severa)
  const esperado: Record<string, [string, string, string]> = {
    95: ['normal', 'leve', 'moderada'], // G1
    70: ['normal', 'leve', 'moderada'], // G2
    50: ['leve', 'moderada', 'severa'], // G3a
    35: ['moderada', 'severa', 'severa'], // G3b
    20: ['severa', 'severa', 'severa'], // G4
    10: ['severa', 'severa', 'severa'], // G5
  }
  const acr = [10, 100, 500] // A1, A2, A3

  it.each(Object.entries(esperado))('TFG %s × A1/A2/A3', (tfg, niveles) => {
    expect(acr.map((a) => clasificarRinon(Number(tfg), a)!.nivel)).toEqual(niveles)
  })

  it('etiqueta combinada', () => {
    expect(clasificarRinon(50, 120)).toMatchObject({ etiqueta: 'G3a/A2', completo: true })
  })

  it('F3-23: con TFG pero sin albuminuria → solo categoría G, marcado incompleto', () => {
    expect(clasificarRinon(50, undefined)).toMatchObject({ tfg: 'g3a', etiqueta: 'G3a', completo: false, nivel: 'leve' })
  })

  it('con albuminuria pero sin TFG → solo categoría A, marcado incompleto', () => {
    expect(clasificarRinon(undefined, 500)).toMatchObject({ albuminuria: 'a3', completo: false, nivel: 'moderada' })
  })

  it('sin datos → undefined', () => {
    expect(clasificarRinon(undefined, undefined)).toBeUndefined()
  })

  it('el dato parcial nunca es más grave que la peor combinación posible', () => {
    // Solo TFG asume A1 (mejor caso); solo ACR asume G1. Por eso se avisa que "podría ser mayor".
    for (const tfg of [95, 70, 50, 35, 20, 10]) {
      expect(clasificarRinon(tfg, undefined)!.nivel).toBe(clasificarRinon(tfg, 10)!.nivel)
    }
    for (const a of [10, 100, 500]) {
      expect(clasificarRinon(undefined, a)!.nivel).toBe(clasificarRinon(95, a)!.nivel)
    }
  })
})

describe('formato de las categorías', () => {
  it('se escriben como en la guía KDIGO', () => {
    expect(['g1', 'g3a', 'g3b', 'a2'].map((c) => nombreCategoria(c as never))).toEqual(['G1', 'G3a', 'G3b', 'A2'])
  })
})
