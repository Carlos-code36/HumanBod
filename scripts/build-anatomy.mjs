// Genera public/models/body.glb a partir de BodyParts3D (sin Blender).
//
// Uso:
//   node scripts/build-anatomy.mjs <carpeta-con-FJxxxx.obj> <partof_element_parts.txt>
//
// Descarga (no se guarda en el repositorio):
//   https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip
//   https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_element_parts.txt
//
// Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
//
// Qué hace:
//  1. Junta los elementos (archivos FJ) de cada órgano según los conceptos FMA.
//  2. Convierte milímetros/Z arriba → metros/Y arriba, con el cuerpo mirando hacia +Z y los pies en Y=0.
//  3. Reduce polígonos con meshoptimizer.
//  4. Dibuja los nervios periféricos de forma ESQUEMÁTICA (BodyParts3D no los incluye),
//     como tubos que siguen los huesos de brazos y piernas.
//  5. Escribe un .glb con un nodo por pieza, con el mismo nombre que usa la app (organs.json → mesh).

import { Document, NodeIO } from '@gltf-transform/core'
import { MeshoptSimplifier } from 'meshoptimizer'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [carpetaObj, archivoPartes] = process.argv.slice(2)
if (!carpetaObj || !archivoPartes) {
  console.error('Uso: node scripts/build-anatomy.mjs <carpeta-obj> <partof_element_parts.txt>')
  process.exit(1)
}

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(RAIZ, 'public', 'models', 'body.glb')

/** Pieza del modelo → conceptos FMA (árbol PART-OF) y triángulos objetivo tras simplificar. */
const PIEZAS = {
  skin: { fma: ['FMA7163'], triangulos: 24000, nombre: 'Piel' },
  heart: { fma: ['FMA7088'], triangulos: 8000, nombre: 'Corazón' },
  liver: { fma: ['FMA7197'], triangulos: 6000, nombre: 'Hígado' },
  pancreas: { fma: ['FMA7198'], triangulos: 3000, nombre: 'Páncreas' },
  kidneys: { fma: ['FMA7204', 'FMA7205'], triangulos: 4000, nombre: 'Riñones' },
  eyes: { fma: ['FMA12514', 'FMA12515'], triangulos: 3000, nombre: 'Globos oculares' },
}

/** Huesos usados solo para trazar los nervios esquemáticos (no se exportan). */
const HUESOS = {
  humeroDer: 'FMA23130', humeroIzq: 'FMA23131',
  radioDer: 'FMA23464', radioIzq: 'FMA23465',
  femurDer: 'FMA24474', femurIzq: 'FMA24475',
  tibiaDer: 'FMA24477', tibiaIzq: 'FMA24478',
}

// ---------- Lectura ----------

/** concepto FMA → lista de archivos FJ */
function leerPartes(ruta) {
  const mapa = new Map()
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/).slice(1)) {
    const [concepto, , archivo] = linea.split('\t')
    if (!concepto || !archivo) continue
    // Formatos válidos: FJ1234 y FJ1234M (variante del mismo elemento).
    if (!/^FJ\d+M?$/.test(archivo)) throw new Error(`Id de archivo inesperado: ${archivo}`)
    if (!mapa.has(concepto)) mapa.set(concepto, [])
    mapa.get(concepto).push(archivo)
  }
  return mapa
}

/** OBJ mínimo: "v x y z", "vn x y z", "f a//a b//b c//c" (BodyParts3D usa el mismo índice para v y vn). */
function leerObj(ruta) {
  const pos = []
  const nor = []
  const idx = []
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    if (linea.startsWith('v ')) {
      const [, x, y, z] = linea.trim().split(/\s+/)
      pos.push(+x, +y, +z)
    } else if (linea.startsWith('vn ')) {
      const [, x, y, z] = linea.trim().split(/\s+/)
      nor.push(+x, +y, +z)
    } else if (linea.startsWith('f ')) {
      const vs = linea.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1)
      for (let i = 1; i + 1 < vs.length; i++) idx.push(vs[0], vs[i], vs[i + 1])
    }
  }
  if (pos.length === 0 || idx.length === 0) throw new Error(`OBJ vacío: ${ruta}`)
  if (nor.length !== pos.length) throw new Error(`Normales y vértices no coinciden en ${ruta}`)
  for (const v of [...pos, ...nor]) if (!Number.isFinite(v)) throw new Error(`Valor no numérico en ${ruta}`)
  for (const i of idx) if (i < 0 || i >= pos.length / 3) throw new Error(`Índice fuera de rango en ${ruta}`)
  return { pos, nor, idx }
}

function unir(mallas) {
  const pos = []
  const nor = []
  const idx = []
  // Sin "push(...arr)": con cientos de miles de valores desborda la pila.
  for (const m of mallas) {
    const base = pos.length / 3
    for (const v of m.pos) pos.push(v)
    for (const v of m.nor) nor.push(v)
    for (const i of m.idx) idx.push(base + i)
  }
  return { pos, nor, idx }
}

const partes = leerPartes(archivoPartes)
const archivosDe = (fma) => {
  const a = partes.get(fma)
  if (!a?.length) throw new Error(`No hay archivos para ${fma}`)
  return a
}
const cargar = (conceptos) =>
  unir(conceptos.flatMap(archivosDe).map((fj) => leerObj(join(carpetaObj, `${fj}.obj`))))

// ---------- Orientación ----------

const piel = cargar(PIEZAS.skin.fma)
const rango = (arr, eje) => {
  let min = Infinity
  let max = -Infinity
  for (let i = eje; i < arr.length; i += 3) {
    if (arr[i] < min) min = arr[i]
    if (arr[i] > max) max = arr[i]
  }
  return [min, max]
}
const [xMin, xMax] = rango(piel.pos, 0)
const [yMin, yMax] = rango(piel.pos, 1)
const [zMin] = rango(piel.pos, 2)
const cx = (xMin + xMax) / 2
const cy = (yMin + yMax) / 2

// Lado derecho del paciente: debe quedar en -X (a la izquierda de quien mira de frente).
const centroX = (m) => {
  let s = 0
  for (let i = 0; i < m.pos.length; i += 3) s += m.pos[i]
  return s / (m.pos.length / 3)
}
const rinonDer = cargar(['FMA7204'])
const sx = centroX(rinonDer) - cx > 0 ? -1 : 1

// BodyParts3D: Z arriba, -Y hacia adelante (la cara tiene Y negativo). App: Y arriba, +Z hacia la cámara.
// (x, y, z) mm → (sx·(x−cx), z−zMin, −(y−cy)) m
function transformar(m) {
  const pos = new Float32Array(m.pos.length)
  const nor = new Float32Array(m.nor.length)
  for (let i = 0; i < m.pos.length; i += 3) {
    pos[i] = (sx * (m.pos[i] - cx)) / 1000
    pos[i + 1] = (m.pos[i + 2] - zMin) / 1000
    pos[i + 2] = -(m.pos[i + 1] - cy) / 1000
    const nx = sx * m.nor[i]
    const ny = m.nor[i + 2]
    const nz = -m.nor[i + 1]
    const len = Math.hypot(nx, ny, nz) || 1
    nor[i] = nx / len
    nor[i + 1] = ny / len
    nor[i + 2] = nz / len
  }
  const idx = new Uint32Array(m.idx)
  // Espejar un eje invierte el orden de los triángulos: se corrige para que las caras miren hacia afuera.
  if (sx === -1) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]
  return { pos, nor, idx }
}

// ---------- Simplificación ----------

await MeshoptSimplifier.ready

function simplificar(m, triangulos) {
  const objetivo = Math.min(m.idx.length, triangulos * 3)
  const [nuevos] = MeshoptSimplifier.simplify(m.idx, m.pos, 3, objetivo, 0.02, ['LockBorder'])
  // Compactar: dejar solo los vértices usados.
  const remap = new Map()
  const pos = []
  const nor = []
  const idx = new Uint32Array(nuevos.length)
  for (let i = 0; i < nuevos.length; i++) {
    const v = nuevos[i]
    if (!remap.has(v)) {
      remap.set(v, pos.length / 3)
      pos.push(m.pos[3 * v], m.pos[3 * v + 1], m.pos[3 * v + 2])
      nor.push(m.nor[3 * v], m.nor[3 * v + 1], m.nor[3 * v + 2])
    }
    idx[i] = remap.get(v)
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx }
}

// ---------- Nervios esquemáticos ----------

/** Centro de los vértices en el 5 % superior o inferior (por altura) de un hueso ya transformado. */
function extremo(m, arriba) {
  const ys = []
  for (let i = 1; i < m.pos.length; i += 3) ys.push(m.pos[i])
  ys.sort((a, b) => a - b)
  const corte = arriba ? ys[Math.floor(ys.length * 0.95)] : ys[Math.floor(ys.length * 0.05)]
  let sx_ = 0
  let sy = 0
  let sz = 0
  let n = 0
  for (let i = 0; i < m.pos.length; i += 3) {
    const y = m.pos[i + 1]
    if (arriba ? y >= corte : y <= corte) {
      sx_ += m.pos[i]
      sy += y
      sz += m.pos[i + 2]
      n++
    }
  }
  return [sx_ / n, sy / n, sz / n]
}

const hueso = (fma) => transformar(cargar([fma]))

/** Hombro→codo→muñeca o cadera→rodilla→tobillo: extremos del hueso proximal y extremo inferior del distal. */
function trayecto(prox, dist) {
  const a = hueso(prox)
  const b = hueso(dist)
  return [extremo(a, true), extremo(a, false), extremo(b, false)]
}

/** Tubo a lo largo de una polilínea (8 lados, radio en metros). */
function tubo(puntos, radio = 0.0045, lados = 8, pasosPorTramo = 12) {
  const muestras = []
  for (let s = 0; s < puntos.length - 1; s++) {
    for (let k = 0; k < pasosPorTramo; k++) {
      const t = k / pasosPorTramo
      muestras.push(puntos[s].map((v, i) => v + (puntos[s + 1][i] - v) * t))
    }
  }
  muestras.push(puntos.at(-1))
  const pos = []
  const nor = []
  const idx = []
  for (let i = 0; i < muestras.length; i++) {
    const p = muestras[i]
    const q = muestras[Math.min(i + 1, muestras.length - 1)]
    const o = muestras[Math.max(i - 1, 0)]
    let t = [q[0] - o[0], q[1] - o[1], q[2] - o[2]]
    const lt = Math.hypot(...t)
    t = t.map((v) => v / lt)
    // Base perpendicular estable: se cruza con el eje que menos se parece a la tangente.
    const ref = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
    let u = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]
    const lu = Math.hypot(...u)
    u = u.map((v) => v / lu)
    const w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
    for (let j = 0; j < lados; j++) {
      const ang = (j / lados) * Math.PI * 2
      const n = [0, 1, 2].map((k) => Math.cos(ang) * u[k] + Math.sin(ang) * w[k])
      pos.push(...p.map((v, k) => v + radio * n[k]))
      nor.push(...n)
    }
    if (i > 0) {
      const a0 = (i - 1) * lados
      const b0 = i * lados
      for (let j = 0; j < lados; j++) {
        const j2 = (j + 1) % lados
        idx.push(a0 + j, b0 + j, b0 + j2, a0 + j, b0 + j2, a0 + j2)
      }
    }
  }
  return { pos, nor, idx }
}

const nervios = unir([
  tubo(trayecto(HUESOS.humeroDer, HUESOS.radioDer)),
  tubo(trayecto(HUESOS.humeroIzq, HUESOS.radioIzq)),
  tubo(trayecto(HUESOS.femurDer, HUESOS.tibiaDer)),
  tubo(trayecto(HUESOS.femurIzq, HUESOS.tibiaIzq)),
])

// ---------- Escritura del .glb ----------

const doc = new Document()
doc.createBuffer()
const escena = doc.createScene('cuerpo')
const resumen = []

function agregar(nombre, m, extras) {
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.pos)))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.nor)))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(m.idx)))
    .setMaterial(doc.createMaterial(nombre))
  const malla = doc.createMesh(nombre).addPrimitive(prim)
  escena.addChild(doc.createNode(nombre).setMesh(malla).setExtras(extras))
  resumen.push({ pieza: nombre, triangulos: m.idx.length / 3, vertices: m.pos.length / 3 })
}

for (const [nombre, def] of Object.entries(PIEZAS)) {
  const original = nombre === 'skin' ? piel : cargar(def.fma)
  const m = simplificar(transformar(original), def.triangulos)
  agregar(nombre, m, { nombre: def.nombre, fma: def.fma, fuente: 'BodyParts3D 4.0 (PART-OF)' })
}
agregar('nerves', nervios, {
  nombre: 'Nervios periféricos (esquemáticos)',
  fuente: 'Trazado esquemático a lo largo de húmero-radio y fémur-tibia de BodyParts3D',
})

mkdirSync(dirname(SALIDA), { recursive: true })
await new NodeIO().write(SALIDA, doc)

console.table(resumen)
const alto = rango(transformar(piel).pos, 1)
console.log(`Altura del cuerpo: ${alto[0].toFixed(3)}–${alto[1].toFixed(3)} m · lado derecho del paciente en ${sx === -1 ? '-X (espejado)' : '-X'}`)
console.log(`${SALIDA}: ${(statSync(SALIDA).size / 1024 / 1024).toFixed(2)} MB`)
