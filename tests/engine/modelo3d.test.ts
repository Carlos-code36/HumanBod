import { NodeIO, type Node } from '@gltf-transform/core'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { ORGANS } from '../../src/data/organs'

const RUTA = fileURLToPath(new URL('../../public/models/body.glb', import.meta.url))

interface Caja {
  min: [number, number, number]
  max: [number, number, number]
  centro: [number, number, number]
  valoresInvalidos: number
}

const nodos = new Map<string, Node>()
const cajas = new Map<string, Caja>()

function caja(node: Node): Caja {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  let valoresInvalidos = 0
  for (const prim of node.getMesh()!.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')!.getArray()!
    for (let i = 0; i < pos.length; i++) {
      const v = pos[i]!
      if (!Number.isFinite(v)) valoresInvalidos++
      const eje = i % 3
      if (v < min[eje]!) min[eje] = v
      if (v > max[eje]!) max[eje] = v
    }
  }
  const centro = [0, 1, 2].map((k) => (min[k]! + max[k]!) / 2) as [number, number, number]
  return { min, max, centro, valoresInvalidos }
}

beforeAll(async () => {
  const doc = await new NodeIO().read(RUTA)
  for (const n of doc.getRoot().listNodes()) {
    nodos.set(n.getName(), n)
    if (n.getMesh()) cajas.set(n.getName(), caja(n))
  }
})

describe('F5-02: piezas del modelo ↔ organs.json', () => {
  it.each(ORGANS.map((o) => [o.id, o.mesh]))('%s → pieza "%s" existe y tiene malla', (_id, mesh) => {
    expect(nodos.get(mesh)?.getMesh(), `falta "${mesh}" en body.glb`).toBeTruthy()
  })

  it('incluye la piel para la silueta', () => {
    expect(cajas.has('skin')).toBe(true)
  })

  it('ninguna pieza tiene valores NaN o infinitos', () => {
    for (const [nombre, c] of cajas) expect(c.valoresInvalidos, nombre).toBe(0)
  })

  it('cada pieza registra su origen (para los créditos)', () => {
    for (const nombre of cajas.keys()) expect(nodos.get(nombre)!.getExtras().fuente, nombre).toBeTruthy()
  })
})

describe('F5-03: tamaño del archivo', () => {
  it('pesa menos de 15 MB', () => {
    expect(statSync(RUTA).size).toBeLessThan(15 * 1024 * 1024)
  })
})

describe('orientación y escala anatómica', () => {
  const c = (nombre: string) => cajas.get(nombre)!

  it('altura humana (1.5–2.0 m) con los pies en el suelo', () => {
    expect(c('skin').min[1]).toBeCloseTo(0, 2)
    expect(c('skin').max[1]).toBeGreaterThan(1.5)
    expect(c('skin').max[1]).toBeLessThan(2.0)
  })

  it('el cuerpo está centrado en X (de frente a la cámara)', () => {
    expect(Math.abs(c('skin').centro[0])).toBeLessThan(0.05)
  })

  it('el corazón está hacia la izquierda del paciente (+X) y el hígado hacia la derecha (−X)', () => {
    expect(c('heart').centro[0]).toBeGreaterThan(0)
    expect(c('liver').centro[0]).toBeLessThan(0)
  })

  it('los ojos están en la cabeza y miran hacia la cámara (+Z)', () => {
    expect(c('eyes').centro[1]).toBeGreaterThan(1.45)
    expect(c('eyes').centro[2]).toBeGreaterThan(c('skin').centro[2])
  })

  it('los riñones están detrás del corazón (más lejos de la cámara) y debajo de él', () => {
    expect(c('kidneys').centro[2]).toBeLessThan(c('heart').centro[2])
    expect(c('kidneys').centro[1]).toBeLessThan(c('heart').centro[1])
  })

  it('orden vertical: ojos > corazón > hígado > riñones', () => {
    const y = (n: string) => c(n).centro[1]
    expect(y('eyes')).toBeGreaterThan(y('heart'))
    expect(y('heart')).toBeGreaterThan(y('liver'))
    expect(y('liver')).toBeGreaterThan(y('kidneys'))
  })

  it('todos los órganos quedan dentro de la piel', () => {
    const piel = c('skin')
    for (const o of ORGANS) {
      const org = c(o.mesh)
      for (let k = 0; k < 3; k++) {
        expect(org.min[k]!, `${o.mesh} eje ${k}`).toBeGreaterThanOrEqual(piel.min[k]! - 0.01)
        expect(org.max[k]!, `${o.mesh} eje ${k}`).toBeLessThanOrEqual(piel.max[k]! + 0.01)
      }
    }
  })

  it('los nervios esquemáticos recorren brazos y piernas (de casi el suelo a los hombros)', () => {
    expect(c('nerves').min[1]).toBeLessThan(0.2)
    expect(c('nerves').max[1]).toBeGreaterThan(1.2)
  })
})
