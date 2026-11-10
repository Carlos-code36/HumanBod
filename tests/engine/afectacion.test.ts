import { describe, expect, it } from 'vitest'
import { NIVELES, colorDeNivel, etiquetaDeNivel, normalizarNivel } from '../../src/engine/afectacion'

describe('F1-05: color y etiqueta por nivel', () => {
  it.each([
    ['sin_datos', '#9aa0a6', 'Sin datos'],
    ['normal', '#34a853', 'Normal'],
    ['leve', '#f2c200', 'Leve'],
    ['moderada', '#f57c00', 'Moderada'],
    ['severa', '#d93025', 'Severa'],
  ])('%s → %s (%s)', (nivel, color, etiqueta) => {
    expect(colorDeNivel(nivel)).toBe(color)
    expect(etiquetaDeNivel(nivel)).toBe(etiqueta)
  })

  it('cada nivel tiene un color distinto', () => {
    const colores = NIVELES.map(colorDeNivel)
    expect(new Set(colores).size).toBe(NIVELES.length)
  })
})

describe('F1-06: nivel desconocido o inválido → gris, sin errores', () => {
  it.each([undefined, null, '', 'grave', 'SEVERA', 3, NaN, {}, []])('%s → sin_datos', (valor) => {
    expect(normalizarNivel(valor)).toBe('sin_datos')
    expect(colorDeNivel(valor)).toBe('#9aa0a6')
    expect(etiquetaDeNivel(valor)).toBe('Sin datos')
  })
})
