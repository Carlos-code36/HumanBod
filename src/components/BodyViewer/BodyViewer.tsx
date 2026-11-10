import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import { ORGANS } from '../../data/organs'
import { colorDeNivel } from '../../engine/afectacion'
import { useAppStore } from '../../store/useAppStore'
import type { Organ } from '../../types/medical'
import { ORGAN_PARTS, SILHOUETTE, type Part } from './bodyLayout'

/** Centro aproximado del cuerpo; la cámara gira alrededor de este punto. */
const TARGET: [number, number, number] = [0, 0.92, 0]

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

/** Silueta translúcida. No intercepta clics para que se puedan seleccionar los órganos internos. */
function Silhouette() {
  return (
    <group>
      {SILHOUETTE.map((part, i) => (
        <mesh
          key={i}
          position={part.position}
          rotation={part.rotation}
          scale={part.scale}
          raycast={() => null}
        >
          <PartGeometry part={part} />
          <meshStandardMaterial color="#b9c3d6" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function OrganMesh({ organ }: { organ: Organ }) {
  const parts = ORGAN_PARTS[organ.mesh] ?? []
  const selected = useAppStore((s) => s.selectedOrganId === organ.id)
  const nivel = useAppStore((s) => s.niveles[organ.id])
  const selectOrgan = useAppStore((s) => s.selectOrgan)
  const [hovered, setHovered] = useState(false)

  const color = colorDeNivel(nivel)
  const glow = selected ? 0.55 : hovered ? 0.25 : 0

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Solo el órgano más cercano a la cámara recibe el clic (F1-04).
    e.stopPropagation()
    selectOrgan(organ.id)
  }

  const labelPos = parts[0]?.position
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
      {parts.map((part, i) => (
        <mesh key={i} position={part.position} rotation={part.rotation} scale={part.scale}>
          <PartGeometry part={part} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.5} />
        </mesh>
      ))}
      {selected && labelPos && (
        <Html position={[labelPos[0], labelPos[1] + 0.09, labelPos[2]]} center style={{ pointerEvents: 'none' }}>
          <div className="organ-label">{organ.nombre}</div>
        </Html>
      )}
    </group>
  )
}

export default function BodyViewer() {
  const selectOrgan = useAppStore((s) => s.selectOrgan)
  return (
    <Canvas
      camera={{ position: [0, 1.0, 3.4], fov: 35, near: 0.05, far: 50 }}
      onPointerMissed={() => selectOrgan(null)} // F1-03: clic en el fondo quita la selección
      aria-label="Cuerpo humano en 3D. Usa la lista de órganos para navegar con el teclado."
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} />
      <directionalLight position={[-3, 1, -2]} intensity={0.5} />
      <Silhouette />
      {ORGANS.map((organ) => (
        <OrganMesh key={organ.id} organ={organ} />
      ))}
      {/* F1-07: límites para que la cámara no atraviese el cuerpo ni se aleje demasiado */}
      <OrbitControls target={TARGET} enablePan={false} minDistance={0.7} maxDistance={5} enableDamping />
    </Canvas>
  )
}
