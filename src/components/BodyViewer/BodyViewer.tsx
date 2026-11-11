import { OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Component, Suspense, createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Color, FrontSide, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry } from 'three'
import type { OrbitControls as ControlesOrbita } from 'three-stdlib'
import { ORGANS, findOrgan } from '../../data/organs'
import { colorDeNivel } from '../../engine/afectacion'
import { useAppStore } from '../../store/useAppStore'
import type { Organ } from '../../types/medical'
import { ORGAN_PARTS, SILHOUETTE, type Part } from './bodyLayout'

/** Modelo anatómico generado con scripts/build-anatomy.mjs (BodyParts3D). Usa BASE_URL: funciona si el sitio se publica en una subcarpeta. */
export const MODELO_URL = `${import.meta.env.BASE_URL}models/body.glb`

/** Centro del tronco (donde están los órganos): la cámara gira y se acerca hacia este punto. */
const TARGET: [number, number, number] = [0, 1.05, 0]

/**
 * Órganos con un modelo detallado propio, hecho con Blender (scripts/blender/build-<órgano>.py).
 * Reemplazan a la pieza simple de body.glb; si el archivo no carga, se usa la pieza simple.
 */
const MODELOS_DETALLADOS: Readonly<Record<string, string>> = {
  heart: `${import.meta.env.BASE_URL}models/heart.glb`,
  liver: `${import.meta.env.BASE_URL}models/liver.glb`,
  pancreas: `${import.meta.env.BASE_URL}models/pancreas.glb`,
}

// ---------- Etiqueta del órgano seleccionado ----------
// Es un elemento HTML normal encima del canvas; cada cuadro se proyecta la posición 3D a la pantalla.
// (Antes se usaba <Html> de drei, pero al seleccionar un órgano antes de que cargara el modelo la
//  etiqueta quedaba vacía y aparecía el error "removeChild: not a child of this node".)

type Punto = [number, number, number]

/** Dónde va la etiqueta de cada órgano y su centro (al que apunta la cámara); los registra cada pieza al montarse. */
interface PuntosOrgano {
  etiqueta: Punto
  centro: Punto
  /** Medida más larga del órgano (m), para elegir a qué distancia acercar la cámara. */
  tamano: number
}

const PuntosEtiqueta = createContext<Map<string, PuntosOrgano>>(new Map())

function SeguirEtiqueta({ etiquetaRef }: { etiquetaRef: RefObject<HTMLDivElement | null> }) {
  const puntos = useContext(PuntosEtiqueta)
  const v = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    const el = etiquetaRef.current
    if (!el) return
    const id = useAppStore.getState().selectedOrganId
    const p = id ? puntos.get(id)?.etiqueta : undefined
    if (!id || !p) {
      el.hidden = true
      return
    }
    v.set(p[0], p[1], p[2]).project(camera)
    // Detrás de la cámara o fuera de la vista: se oculta.
    const visible = v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05
    el.hidden = !visible
    if (!visible) return
    const x = ((v.x + 1) / 2) * size.width
    const y = ((1 - v.y) / 2) * size.height
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    const nombre = findOrgan(id)?.nombre ?? ''
    if (el.textContent !== nombre) el.textContent = nombre
  })
  return null
}

// ---------- La cámara se centra en el órgano elegido ----------
// Al elegir un órgano (en el 3D, la lista o los resultados) la cámara gira hacia él y se acerca,
// para ver el detalle. Al quitar la selección vuelve a apuntar al tronco. Si la persona arrastra
// o hace zoom durante el movimiento, se cancela.

/** Distancia de la cámara al órgano enfocado (m): 0,7 m, o más si el órgano es grande (nervios). */
const distanciaEnfoque = (tamano: number) => Math.max(0.7, tamano * 2.2)

function EnfocarOrgano() {
  const puntos = useContext(PuntosEtiqueta)
  const controles = useThree((s) => s.controls) as ControlesOrbita | null
  const destino = useRef<{ objetivo: Vector3; distancia: number | null } | null>(null)

  useEffect(
    () =>
      useAppStore.subscribe((s, antes) => {
        if (s.selectedOrganId === antes.selectedOrganId) return
        const p = s.selectedOrganId ? puntos.get(s.selectedOrganId) : undefined
        destino.current = p
          ? { objetivo: new Vector3(...p.centro), distancia: distanciaEnfoque(p.tamano) }
          : { objetivo: new Vector3(...TARGET), distancia: null }
      }),
    [puntos],
  )

  useEffect(() => {
    if (!controles) return
    const cancelar = () => (destino.current = null)
    controles.addEventListener('start', cancelar)
    return () => controles.removeEventListener('start', cancelar)
  }, [controles])

  useFrame(({ camera }, dt) => {
    const d = destino.current
    if (!controles || !d) return
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 5)
    // La cámara se mueve junto con el objetivo para no dar un giro brusco.
    const antes = controles.target.clone()
    controles.target.lerp(d.objetivo, k)
    camera.position.add(controles.target.clone().sub(antes))
    const dir = camera.position.clone().sub(controles.target)
    const actual = dir.length()
    if (d.distancia !== null && actual > d.distancia) {
      camera.position.copy(controles.target).add(dir.setLength(actual + (d.distancia - actual) * k))
    }
    controles.update()
    const llego = controles.target.distanceTo(d.objetivo) < 0.002
    const cerca = d.distancia === null || camera.position.distanceTo(controles.target) <= d.distancia + 0.005
    if (llego && cerca) destino.current = null
  })
  return null
}

// ---------- Interacción común (figuras simples y modelo real) ----------

/** Cómo se ve el órgano ahora: color del nivel de afectación y brillo (seleccionado / bajo el puntero). */
interface EstadoVisual {
  color: string
  glow: number
}

interface OrganInteractivoProps {
  organ: Organ
  /** Dónde poner la etiqueta con el nombre cuando está seleccionado, y el centro del órgano. */
  puntos: PuntosOrgano | undefined
  children: (material: ReactNode, estado: EstadoVisual) => ReactNode
}

function OrganInteractivo({ organ, puntos: propios, children }: OrganInteractivoProps) {
  const selected = useAppStore((s) => s.selectedOrganId === organ.id)
  const nivel = useAppStore((s) => s.niveles[organ.id])
  const selectOrgan = useAppStore((s) => s.selectOrgan)
  const [hovered, setHovered] = useState(false)
  const puntos = useContext(PuntosEtiqueta)

  useEffect(() => {
    if (!propios) return
    puntos.set(organ.id, propios)
    return () => {
      // Solo se borra si sigue siendo el punto de esta pieza (el modelo real reemplaza al esquemático).
      if (puntos.get(organ.id) === propios) puntos.delete(organ.id)
    }
  }, [puntos, organ.id, propios])

  const color = colorDeNivel(nivel)
  const glow = selected ? 0.55 : hovered ? 0.25 : 0
  const material = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.45} />

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Solo el órgano más cercano a la cámara recibe el clic (F1-04).
    e.stopPropagation()
    selectOrgan(organ.id)
  }

  return (
    <group
      name={organ.mesh}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      {children(material, { color, glow })}
    </group>
  )
}

// ---------- Modelos detallados (Blender) ----------
// Conservan sus materiales realistas (miocardio con textura, arterias rojas, venas azules).
// El nivel de afectación se muestra como un brillo en el borde del órgano (efecto Fresnel)
// y la selección añade un resplandor suave del mismo color.

interface UniformesBorde {
  uBordeColor: { value: Color }
  uBordeFuerza: { value: number }
}

function conBorde(original: MeshStandardMaterial): MeshStandardMaterial {
  const m = original.clone()
  const u: UniformesBorde = { uBordeColor: { value: new Color() }, uBordeFuerza: { value: 0 } }
  m.userData.borde = u
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u)
    shader.fragmentShader =
      'uniform vec3 uBordeColor;\nuniform float uBordeFuerza;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float bordeOrgano = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += uBordeColor * uBordeFuerza * bordeOrgano;`,
      )
  }
  m.customProgramCacheKey = () => 'organo-borde'
  return m
}

/** Color del nivel en el borde; al seleccionar o pasar el puntero, brillo más fuerte y resplandor. */
function aplicarEstado(materiales: MeshStandardMaterial[], estado: EstadoVisual) {
  const c = new Color(estado.color)
  for (const material of materiales) {
    const u = material.userData.borde as UniformesBorde
    u.uBordeColor.value.copy(c)
    u.uBordeFuerza.value = 0.45 + estado.glow * 0.9
    material.emissive.copy(c)
    material.emissiveIntensity = estado.glow * 0.12
  }
}

function PiezaDetallada({ url, estado }: { url: string; estado: EstadoVisual }) {
  const { scene } = useGLTF(url)
  const mallas = useMemo(() => {
    const out: { nombre: string; geometria: BufferGeometry; material: MeshStandardMaterial }[] = []
    scene.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        out.push({ nombre: o.name, geometria: o.geometry as BufferGeometry, material: conBorde(o.material) })
      }
    })
    if (out.length === 0) throw new Error(`El modelo ${url} no tiene mallas`)
    return out
  }, [scene, url])

  useEffect(() => () => mallas.forEach((m) => m.material.dispose()), [mallas])

  useEffect(() => aplicarEstado(mallas.map((m) => m.material), estado), [mallas, estado])

  return (
    <>
      {mallas.map((m) => (
        <mesh key={m.nombre} name={m.nombre} geometry={m.geometria} material={m.material} />
      ))}
    </>
  )
}

// ---------- Cuerpo esquemático (Fase 1): respaldo si el modelo real no carga ----------

function PartGeometry({ part }: { part: Part }) {
  const s = part.shape
  switch (s.kind) {
    case 'sphere':
      return <sphereGeometry args={[s.radius, 32, 16]} />
    case 'capsule':
      return <capsuleGeometry args={[s.radius, s.length, 8, 16]} />
    case 'cylinder':
      return <cylinderGeometry args={[s.radius, s.radius, s.length, 12]} />
  }
}

function CuerpoSimple() {
  return (
    <group>
      {SILHOUETTE.map((part, i) => (
        <mesh key={i} position={part.position} rotation={part.rotation} scale={part.scale} raycast={() => null}>
          <PartGeometry part={part} />
          <meshStandardMaterial color="#b9c3d6" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      ))}
      {ORGANS.map((organ) => {
        const parts = ORGAN_PARTS[organ.mesh] ?? []
        const p0 = parts[0]?.position
        return (
          <OrganInteractivo
            key={organ.id}
            organ={organ}
            puntos={p0 && { etiqueta: [p0[0], p0[1] + 0.09, p0[2]], centro: [p0[0], p0[1], p0[2]], tamano: 0.15 }}
          >
            {(material) =>
              parts.map((part, i) => (
                <mesh key={i} position={part.position} rotation={part.rotation} scale={part.scale}>
                  <PartGeometry part={part} />
                  {material}
                </mesh>
              ))
            }
          </OrganInteractivo>
        )
      })}
    </group>
  )
}

// ---------- Cuerpo anatómico (Fase 5) ----------

function geometriaDe(scene: { getObjectByName: (n: string) => unknown }, nombre: string): BufferGeometry | undefined {
  const obj = scene.getObjectByName(nombre)
  return obj instanceof Mesh ? (obj.geometry as BufferGeometry) : undefined
}

/**
 * Etiqueta sobre el centro del órgano, en su cara delantera (antes iba encima del órgano y la del
 * hígado caía sobre el corazón). La cámara apunta al centro.
 */
function puntosDe(g: BufferGeometry): PuntosOrgano {
  g.computeBoundingBox()
  const b = g.boundingBox!
  const c: Punto = [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2]
  const tamano = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z)
  return { etiqueta: [c[0], c[1], b.max.z], centro: c, tamano }
}

function CuerpoAnatomico({ mostrarPiel }: { mostrarPiel: boolean }) {
  const { scene } = useGLTF(MODELO_URL)
  const piezas = useMemo(
    () =>
      ORGANS.map((organ) => {
        const g = geometriaDe(scene, organ.mesh)
        // Si falta una pieza en el modelo, se lanza un error y se usa el cuerpo esquemático (F5-05).
        if (!g) throw new Error(`El modelo no tiene la pieza "${organ.mesh}" (${organ.id})`)
        return { organ, g, puntos: puntosDe(g) }
      }),
    [scene],
  )
  const piel = useMemo(() => geometriaDe(scene, 'skin'), [scene])

  return (
    <group>
      {piel && mostrarPiel && (
        // Piel translúcida tipo "rayos X": no intercepta clics, así se pueden elegir los órganos internos.
        <mesh geometry={piel} raycast={() => null} renderOrder={10}>
          <meshStandardMaterial color="#b8c8e6" transparent opacity={0.09} depthWrite={false} side={FrontSide} roughness={0.7} />
        </mesh>
      )}
      {piezas.map(({ organ, g, puntos }) => (
        <OrganInteractivo key={organ.id} organ={organ} puntos={puntos}>
          {(material, estado) => {
            const simple = <mesh geometry={g}>{material}</mesh>
            const url = MODELOS_DETALLADOS[organ.mesh]
            if (!url) return simple
            // Si el modelo detallado falla o aún está cargando, se ve la pieza simple de body.glb.
            return (
              <RespaldoModelo respaldo={simple} aviso={`No se pudo cargar ${url}; se usa la pieza simple:`}>
                <Suspense fallback={simple}>
                  <PiezaDetallada url={url} estado={estado} />
                </Suspense>
              </RespaldoModelo>
            )
          }}
        </OrganInteractivo>
      ))}
    </group>
  )
}

/** Si el modelo anatómico falla (no existe, está dañado o le falta una pieza), se muestra el esquemático. */
class RespaldoModelo extends Component<{ children: ReactNode; respaldo: ReactNode; aviso?: string }, { error: boolean }> {
  state = { error: false }

  static getDerivedStateFromError() {
    return { error: true }
  }

  componentDidCatch(error: unknown) {
    console.error(this.props.aviso ?? 'No se pudo cargar el modelo anatómico; se usa el esquemático:', error)
  }

  render() {
    return this.state.error ? this.props.respaldo : this.props.children
  }
}

/** Indicador de carga (F5-04), fuera del Canvas, con el progreso de descarga del modelo. */
function Cargando() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="viewer-loading" role="status">
      Cargando modelo anatómico… {Math.round(progress)} %
    </div>
  )
}

export default function BodyViewer() {
  const selectOrgan = useAppStore((s) => s.selectOrgan)
  const [mostrarPiel, setMostrarPiel] = useState(true)
  const puntos = useMemo(() => new Map<string, PuntosOrgano>(), [])
  const etiquetaRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <Canvas
        camera={{ position: [0, 1.1, 3.6], fov: 35, near: 0.05, far: 50 }}
        onPointerMissed={() => selectOrgan(null)} // F1-03: clic en el fondo quita la selección
        aria-label="Cuerpo humano en 3D. Usa la lista de órganos para navegar con el teclado."
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 3, 4]} intensity={1.7} />
        <directionalLight position={[-3, 1, -2]} intensity={0.6} />
        <directionalLight position={[0, -2, 3]} intensity={0.3} />
        <PuntosEtiqueta.Provider value={puntos}>
          <RespaldoModelo respaldo={<CuerpoSimple />}>
            <Suspense fallback={null}>
              <CuerpoAnatomico mostrarPiel={mostrarPiel} />
            </Suspense>
          </RespaldoModelo>
          <SeguirEtiqueta etiquetaRef={etiquetaRef} />
          <EnfocarOrgano />
        </PuntosEtiqueta.Provider>
        {/* F1-07: límites para que la cámara no atraviese el cuerpo ni se aleje demasiado */}
        <OrbitControls makeDefault target={TARGET} enablePan={false} minDistance={0.5} maxDistance={5} enableDamping />
      </Canvas>
      <div ref={etiquetaRef} className="organ-label organ-label-3d" hidden aria-hidden="true" />
      <Cargando />
      <label className="viewer-toggle">
        <input type="checkbox" checked={mostrarPiel} onChange={(e) => setMostrarPiel(e.target.checked)} />
        Mostrar piel
      </label>
    </>
  )
}

useGLTF.preload(MODELO_URL)
for (const url of Object.values(MODELOS_DETALLADOS)) useGLTF.preload(url)
