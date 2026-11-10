import { describe, expect, it } from 'vitest'
import { ORGAN_PARTS, SILHOUETTE } from '../../src/components/BodyViewer/bodyLayout'
import { ORGANS, findOrgan } from '../../src/data/organs'

describe('catálogo de órganos', () => {
  it('incluye los órganos de la Fase 1', () => {
    const ids = ORGANS.map((o) => o.id)
    expect(ids).toEqual(expect.arrayContaining(['pancreas', 'rinones', 'ojos', 'corazon', 'nervios', 'higado']))
  })

  it('los ids son únicos', () => {
    const ids = ORGANS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('los ids no tienen acentos, mayúsculas ni espacios', () => {
    for (const o of ORGANS) expect(o.id).toMatch(/^[a-z][a-z_]*$/)
  })

  it('findOrgan devuelve undefined para ids desconocidos o vacíos', () => {
    expect(findOrgan('rinones')?.nombre).toBe('Riñones')
    expect(findOrgan('riñon')).toBeUndefined()
    expect(findOrgan(null)).toBeUndefined()
    expect(findOrgan('')).toBeUndefined()
  })
})

describe('órganos ↔ modelo 3D', () => {
  it('cada órgano tiene piezas 3D (mesh existente)', () => {
    for (const o of ORGANS) {
      expect(ORGAN_PARTS[o.mesh], `falta el mesh "${o.mesh}" de ${o.id}`).toBeDefined()
      expect(ORGAN_PARTS[o.mesh]!.length).toBeGreaterThan(0)
    }
  })

  it('no hay piezas 3D huérfanas (sin órgano en el catálogo)', () => {
    const usados = new Set(ORGANS.map((o) => o.mesh))
    for (const mesh of Object.keys(ORGAN_PARTS)) expect(usados.has(mesh), `mesh huérfano: ${mesh}`).toBe(true)
  })

  it('todas las medidas son números finitos y positivos', () => {
    const parts = [...SILHOUETTE, ...Object.values(ORGAN_PARTS).flat()]
    for (const p of parts) {
      for (const n of [...p.position, ...(p.rotation ?? []), ...(p.scale ?? [])]) expect(Number.isFinite(n)).toBe(true)
      for (const n of p.scale ?? []) expect(n).toBeGreaterThan(0)
      expect(p.shape.radius).toBeGreaterThan(0)
    }
  })

  it('los órganos quedan dentro de la silueta (altura entre pies y cabeza)', () => {
    for (const p of Object.values(ORGAN_PARTS).flat()) {
      expect(p.position[1]).toBeGreaterThan(0)
      expect(p.position[1]).toBeLessThan(1.75)
    }
  })
})
