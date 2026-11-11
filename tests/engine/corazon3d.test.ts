// Corazón detallado hecho con Blender (scripts/blender/build-heart.py → public/models/heart.glb).
// Se lee el JSON del .glb directamente: usa texturas WebP (EXT_texture_webp) y no hace falta decodificarlas.
import { NodeIO } from '@gltf-transform/core'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const RUTA = fileURLToPath(new URL('../../public/models/heart.glb', import.meta.url))
const RUTA_CUERPO = fileURLToPath(new URL('../../public/models/body.glb', import.meta.url))

interface Gltf {
  nodes: { name: string; mesh?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] }[]
  meshes: { name: string; primitives: { attributes: Record<string, number>; material?: number }[] }[]
  materials: { name: string; normalTexture?: unknown; pbrMetallicRoughness?: { baseColorTexture?: unknown; baseColorFactor?: number[] } }[]
  accessors: { min?: number[]; max?: number[]; count: number }[]
  extensionsRequired?: string[]
}

function leerJson(ruta: string): Gltf {
  const b = readFileSync(ruta)
  expect(b.toString('ascii', 0, 4)).toBe('glTF')
  const largo = b.readUInt32LE(12)
  return JSON.parse(b.toString('utf8', 20, 20 + largo)) as Gltf
}

const PIEZAS = ['miocardio', 'arterias_coronarias', 'venas_coronarias', 'aorta', 'tronco_pulmonar', 'venas_cavas', 'venas_pulmonares']

let g: Gltf
const cajas = new Map<string, { min: number[]; max: number[] }>()
let cajaCuerpo: { min: number[]; max: number[] }

beforeAll(async () => {
  g = leerJson(RUTA)
  for (const n of g.nodes) {
    if (n.mesh === undefined) continue
    const acc = g.accessors[g.meshes[n.mesh]!.primitives[0]!.attributes.POSITION!]!
    cajas.set(n.name, { min: acc.min!, max: acc.max! })
  }
  const doc = await new NodeIO().read(RUTA_CUERPO)
  const pos = doc.getRoot().listNodes().find((n) => n.getName() === 'heart')!.getMesh()!.listPrimitives()[0]!.getAttribute('POSITION')!
  cajaCuerpo = { min: pos.getMin([]), max: pos.getMax([]) }
})

describe('Corazón detallado (heart.glb)', () => {
  it('tiene un nodo "heart" con todas las piezas como hijas', () => {
    const raiz = g.nodes.find((n) => n.name === 'heart')
    expect(raiz).toBeTruthy()
    const hijas = raiz!.children!.map((i) => g.nodes[i]!.name)
    expect(hijas.sort()).toEqual([...PIEZAS].sort())
  })

  it('sin transformaciones en los nodos (las mallas ya están en coordenadas del cuerpo)', () => {
    for (const n of g.nodes) {
      expect(n.translation ?? n.rotation ?? n.scale ?? n.matrix, n.name).toBeUndefined()
    }
  })

  it('cada pieza tiene normales y su propio material', () => {
    for (const nombre of PIEZAS) {
      const n = g.nodes.find((x) => x.name === nombre)!
      const prim = g.meshes[n.mesh!]!.primitives[0]!
      expect(prim.attributes.NORMAL, nombre).toBeDefined()
      expect(prim.material, nombre).toBeDefined()
    }
  })

  it('el miocardio usa textura de color, mapa de normales y coordenadas UV', () => {
    const n = g.nodes.find((x) => x.name === 'miocardio')!
    const prim = g.meshes[n.mesh!]!.primitives[0]!
    const mat = g.materials[prim.material!]!
    expect(mat.pbrMetallicRoughness?.baseColorTexture).toBeTruthy()
    expect(mat.normalTexture).toBeTruthy()
    expect(prim.attributes.TEXCOORD_0).toBeDefined()
  })

  it('arterias en rojo y venas en azul (convención de los atlas)', () => {
    const color = (nombre: string) => {
      const n = g.nodes.find((x) => x.name === nombre)!
      return g.materials[g.meshes[n.mesh!]!.primitives[0]!.material!]!.pbrMetallicRoughness!.baseColorFactor!
    }
    for (const rojo of ['aorta', 'arterias_coronarias']) expect(color(rojo)[0]!, rojo).toBeGreaterThan(color(rojo)[2]!)
    for (const azul of ['venas_cavas', 'venas_coronarias', 'tronco_pulmonar']) expect(color(azul)[2]!, azul).toBeGreaterThan(color(azul)[0]!)
  })

  it('el miocardio ocupa el mismo lugar que el corazón de body.glb (±1,5 cm)', () => {
    const m = cajas.get('miocardio')!
    for (let k = 0; k < 3; k++) {
      const centro = (m.min[k]! + m.max[k]!) / 2
      const centroCuerpo = (cajaCuerpo.min[k]! + cajaCuerpo.max[k]!) / 2
      expect(Math.abs(centro - centroCuerpo), `eje ${k}`).toBeLessThan(0.015)
    }
  })

  it('tamaño de un corazón adulto (8–15 cm de largo) y hacia la izquierda del paciente (+X)', () => {
    const m = cajas.get('miocardio')!
    const largo = Math.max(...[0, 1, 2].map((k) => m.max[k]! - m.min[k]!))
    expect(largo).toBeGreaterThan(0.08)
    expect(largo).toBeLessThan(0.15)
    expect((m.min[0]! + m.max[0]!) / 2).toBeGreaterThan(0)
  })

  it('las piezas están cerca del corazón (los vasos se recortaron)', () => {
    for (const [nombre, c] of cajas) {
      for (let k = 0; k < 3; k++) {
        expect(c.max[k]! - c.min[k]!, `${nombre} eje ${k}`).toBeLessThan(0.2)
      }
    }
  })

  it('pesa menos de 3 MB', () => {
    expect(statSync(RUTA).size).toBeLessThan(3 * 1024 * 1024)
  })
})
