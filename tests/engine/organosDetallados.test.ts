// Órganos detallados hechos con Blender (scripts/blender/build-<órgano>.py → public/models/<órgano>.glb).
// Se lee el JSON del .glb directamente: usan texturas WebP (EXT_texture_webp) y no hace falta decodificarlas.
import { NodeIO } from '@gltf-transform/core'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const ruta = (archivo: string) => fileURLToPath(new URL(`../../public/models/${archivo}`, import.meta.url))

interface Gltf {
  nodes: { name: string; mesh?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] }[]
  meshes: { name: string; primitives: { attributes: Record<string, number>; material?: number }[] }[]
  materials: { name: string; normalTexture?: unknown; pbrMetallicRoughness?: { baseColorTexture?: unknown; baseColorFactor?: number[] } }[]
  accessors: { min?: number[]; max?: number[]; count: number }[]
}

interface Caja {
  min: number[]
  max: number[]
}

function leerJson(archivo: string): Gltf {
  const b = readFileSync(ruta(archivo))
  expect(b.toString('ascii', 0, 4)).toBe('glTF')
  const largo = b.readUInt32LE(12)
  return JSON.parse(b.toString('utf8', 20, 20 + largo)) as Gltf
}

const centro = (c: Caja, k: number) => (c.min[k]! + c.max[k]!) / 2

interface Caso {
  archivo: string
  /** Nombre del nodo raíz = pieza de body.glb (organs.json → mesh). */
  nodo: string
  /** Pieza principal (la del tejido del órgano, con textura). */
  principal: string
  piezas: string[]
  rojos: string[]
  azules: string[]
  /** Largo máximo esperado de la pieza principal (m). */
  largo: [number, number]
  /** +1: a la izquierda del paciente (+X); −1: a la derecha; 0: cruza la línea media (no se comprueba). */
  lado: 1 | -1 | 0
  /** Tolerancia del centro respecto de la pieza de body.glb (m). */
  tolerancia: number
  maxMB: number
}

const CASOS: Caso[] = [
  {
    archivo: 'heart.glb',
    nodo: 'heart',
    principal: 'miocardio',
    piezas: ['miocardio', 'arterias_coronarias', 'venas_coronarias', 'aorta', 'tronco_pulmonar', 'venas_cavas', 'venas_pulmonares'],
    rojos: ['aorta', 'arterias_coronarias'],
    azules: ['venas_cavas', 'venas_coronarias', 'tronco_pulmonar'],
    largo: [0.08, 0.15],
    lado: 1,
    tolerancia: 0.015,
    maxMB: 3,
  },
  {
    archivo: 'liver.glb',
    nodo: 'liver',
    principal: 'parenquima',
    piezas: ['parenquima', 'vesicula_biliar', 'conductos_biliares', 'vena_porta', 'arteria_hepatica', 'vena_cava_inferior'],
    rojos: ['arteria_hepatica'],
    azules: ['vena_cava_inferior', 'vena_porta'],
    largo: [0.15, 0.26],
    lado: -1,
    tolerancia: 0.015,
    maxMB: 3,
  },
  {
    archivo: 'pancreas.glb',
    nodo: 'pancreas',
    principal: 'parenquima',
    piezas: ['parenquima', 'duodeno', 'arteria_esplenica', 'tronco_celiaco', 'arteria_mesenterica_superior', 'aorta_abdominal', 'vena_porta'],
    rojos: ['arteria_esplenica', 'aorta_abdominal', 'arteria_mesenterica_superior'],
    azules: ['vena_porta'],
    largo: [0.1, 0.22],
    lado: 0,
    tolerancia: 0.01,
    maxMB: 3,
  },
]

const cuerpo = new Map<string, Caja>()

beforeAll(async () => {
  const doc = await new NodeIO().read(ruta('body.glb'))
  for (const n of doc.getRoot().listNodes()) {
    const pos = n.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION')
    if (pos) cuerpo.set(n.getName(), { min: pos.getMin([]), max: pos.getMax([]) })
  }
})

describe.each(CASOS)('Órgano detallado $archivo', (caso) => {
  const g = leerJson(caso.archivo)
  const nodo = (nombre: string) => g.nodes.find((x) => x.name === nombre)!
  const primitiva = (nombre: string) => g.meshes[nodo(nombre).mesh!]!.primitives[0]!
  const material = (nombre: string) => g.materials[primitiva(nombre).material!]!
  const caja = (nombre: string): Caja => {
    const acc = g.accessors[primitiva(nombre).attributes.POSITION!]!
    return { min: acc.min!, max: acc.max! }
  }

  it(`tiene un nodo "${caso.nodo}" con todas las piezas como hijas`, () => {
    const raiz = g.nodes.find((n) => n.name === caso.nodo)
    expect(raiz).toBeTruthy()
    expect(raiz!.children!.map((i) => g.nodes[i]!.name).sort()).toEqual([...caso.piezas].sort())
  })

  it('sin transformaciones en los nodos (las mallas ya están en coordenadas del cuerpo)', () => {
    for (const n of g.nodes) expect(n.translation ?? n.rotation ?? n.scale ?? n.matrix, n.name).toBeUndefined()
  })

  it('cada pieza tiene normales y su propio material', () => {
    for (const nombre of caso.piezas) {
      expect(primitiva(nombre).attributes.NORMAL, nombre).toBeDefined()
      expect(primitiva(nombre).material, nombre).toBeDefined()
    }
  })

  it('la pieza principal usa textura de color, mapa de normales y coordenadas UV', () => {
    expect(material(caso.principal).pbrMetallicRoughness?.baseColorTexture).toBeTruthy()
    expect(material(caso.principal).normalTexture).toBeTruthy()
    expect(primitiva(caso.principal).attributes.TEXCOORD_0).toBeDefined()
  })

  it('arterias en rojo y venas en azul (convención de los atlas)', () => {
    const color = (n: string) => material(n).pbrMetallicRoughness!.baseColorFactor!
    for (const n of caso.rojos) expect(color(n)[0]!, n).toBeGreaterThan(color(n)[2]!)
    for (const n of caso.azules) expect(color(n)[2]!, n).toBeGreaterThan(color(n)[0]!)
  })

  it(`ocupa el mismo lugar que "${caso.nodo}" de body.glb`, () => {
    const m = caja(caso.principal)
    const c = cuerpo.get(caso.nodo)!
    for (let k = 0; k < 3; k++) expect(Math.abs(centro(m, k) - centro(c, k)), `eje ${k}`).toBeLessThan(caso.tolerancia)
  })

  it('tamaño adulto y del lado correcto del paciente', () => {
    const m = caja(caso.principal)
    const largo = Math.max(...[0, 1, 2].map((k) => m.max[k]! - m.min[k]!))
    expect(largo).toBeGreaterThan(caso.largo[0])
    expect(largo).toBeLessThan(caso.largo[1])
    if (caso.lado !== 0) expect(Math.sign(centro(m, 0))).toBe(caso.lado)
  })

  it('las piezas están cerca del órgano (los vasos se recortaron)', () => {
    for (const nombre of caso.piezas) {
      const c = caja(nombre)
      for (let k = 0; k < 3; k++) expect(c.max[k]! - c.min[k]!, `${nombre} eje ${k}`).toBeLessThan(0.26)
    }
  })

  it(`pesa menos de ${caso.maxMB} MB`, () => {
    expect(statSync(ruta(caso.archivo)).size).toBeLessThan(caso.maxMB * 1024 * 1024)
  })
})
