import type { Organ } from '../types/medical'
import organsJson from './organs.json'

/** Catálogo de órganos. En la Fase 2 se validará con Zod al cargar. */
export const ORGANS: readonly Organ[] = organsJson

export function findOrgan(id: string | null | undefined): Organ | undefined {
  return id ? ORGANS.find((o) => o.id === id) : undefined
}
