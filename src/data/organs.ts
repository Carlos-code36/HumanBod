import organsJson from './organs.json'
import { OrgansSchema, formatearErrores, type Organ } from './schemas'

function cargarOrganos(): Organ[] {
  const r = OrgansSchema.safeParse(organsJson)
  if (!r.success) throw new Error(`organs.json no es válido:\n${formatearErrores(r.error)}`)
  return r.data
}

/** Catálogo de órganos, validado con Zod al cargar. */
export const ORGANS: readonly Organ[] = cargarOrganos()

export function findOrgan(id: string | null | undefined): Organ | undefined {
  return id ? ORGANS.find((o) => o.id === id) : undefined
}
