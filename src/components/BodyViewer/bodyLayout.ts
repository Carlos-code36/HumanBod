/**
 * Cuerpo esquemático con figuras simples (Fase 1).
 * Unidades aproximadas en metros; el cuerpo mira hacia +Z (hacia la cámara),
 * por lo que el lado DERECHO del paciente queda en -X.
 * En la Fase 5 se reemplaza por un modelo anatómico real (.glb) con los mismos nombres de mesh.
 */

export type Vec3 = [number, number, number]

export type Shape =
  | { kind: 'sphere'; radius: number }
  | { kind: 'capsule'; radius: number; length: number }
  | { kind: 'cylinder'; radius: number; length: number }

export interface Part {
  shape: Shape
  position: Vec3
  rotation?: Vec3
  scale?: Vec3
}

const HALF_PI = Math.PI / 2

/** Silueta translúcida del cuerpo: no se puede seleccionar. */
export const SILHOUETTE: Part[] = [
  { shape: { kind: 'sphere', radius: 0.11 }, position: [0, 1.62, 0] }, // cabeza
  { shape: { kind: 'cylinder', radius: 0.05, length: 0.1 }, position: [0, 1.5, 0] }, // cuello
  { shape: { kind: 'capsule', radius: 0.17, length: 0.42 }, position: [0, 1.15, 0], scale: [1, 1, 0.7] }, // tronco
  { shape: { kind: 'capsule', radius: 0.045, length: 0.55 }, position: [-0.25, 1.1, 0], rotation: [0, 0, -0.12] }, // brazo der.
  { shape: { kind: 'capsule', radius: 0.045, length: 0.55 }, position: [0.25, 1.1, 0], rotation: [0, 0, 0.12] }, // brazo izq.
  { shape: { kind: 'capsule', radius: 0.065, length: 0.72 }, position: [-0.09, 0.45, 0] }, // pierna der.
  { shape: { kind: 'capsule', radius: 0.065, length: 0.72 }, position: [0.09, 0.45, 0] }, // pierna izq.
]

/** Piezas de cada órgano, por nombre de mesh (ver organs.json). */
export const ORGAN_PARTS: Record<string, Part[]> = {
  eyes: [
    { shape: { kind: 'sphere', radius: 0.018 }, position: [-0.038, 1.645, 0.088] },
    { shape: { kind: 'sphere', radius: 0.018 }, position: [0.038, 1.645, 0.088] },
  ],
  heart: [{ shape: { kind: 'sphere', radius: 0.055 }, position: [0.035, 1.28, 0.03], scale: [1, 1.15, 0.9] }],
  liver: [{ shape: { kind: 'sphere', radius: 1 }, position: [-0.055, 1.15, 0.02], scale: [0.085, 0.05, 0.06] }],
  pancreas: [
    { shape: { kind: 'capsule', radius: 0.016, length: 0.09 }, position: [0.035, 1.08, -0.01], rotation: [0, 0, HALF_PI + 0.2] },
  ],
  kidneys: [
    { shape: { kind: 'sphere', radius: 1 }, position: [-0.075, 1.03, -0.05], scale: [0.035, 0.055, 0.03] },
    { shape: { kind: 'sphere', radius: 1 }, position: [0.075, 1.03, -0.05], scale: [0.035, 0.055, 0.03] },
  ],
  nerves: [
    { shape: { kind: 'cylinder', radius: 0.008, length: 0.6 }, position: [-0.25, 1.1, 0.02], rotation: [0, 0, -0.12] },
    { shape: { kind: 'cylinder', radius: 0.008, length: 0.6 }, position: [0.25, 1.1, 0.02], rotation: [0, 0, 0.12] },
    { shape: { kind: 'cylinder', radius: 0.01, length: 0.85 }, position: [-0.09, 0.45, 0.03] },
    { shape: { kind: 'cylinder', radius: 0.01, length: 0.85 }, position: [0.09, 0.45, 0.03] },
  ],
}
