import { z } from 'zod'

/**
 * Esquemas Zod: validan los JSON médicos al cargarlos y generan los tipos de TypeScript.
 * Una sola fuente de verdad: si el JSON no cumple, la app avisa con un mensaje claro.
 */

/** ids sin acentos, mayúsculas ni espacios: "rinones", "retinopatia_dr". */
const Id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id inválido: usa minúsculas, números y "_" (sin acentos ni espacios)')
const Texto = z.string().trim().min(1, 'no puede estar vacío')

export const NivelSchema = z.enum(['sin_datos', 'normal', 'leve', 'moderada', 'severa'])

export const OrganSchema = z.object({
  id: Id,
  nombre: Texto,
  sistema: Texto,
  /** Nombre de la pieza en el modelo 3D. */
  mesh: Texto,
  /** Aclaración que se muestra en el panel (por ejemplo, si la pieza 3D es esquemática). */
  nota: z.string().optional(),
})

export const OrgansSchema = z
  .array(OrganSchema)
  .min(1)
  .superRefine((organs, ctx) => {
    const vistos = new Set<string>()
    organs.forEach((o, i) => {
      if (vistos.has(o.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `id repetido: "${o.id}"` })
      vistos.add(o.id)
    })
  })

export const FuenteSchema = z.object({
  id: Id,
  titulo: Texto,
  autor: Texto,
  /** Año de la publicación. Se omite en guías que se actualizan cada año. */
  anio: z.number().int().min(1900).max(2100).optional(),
  publicacion: z.string().optional(),
  nota: z.string().optional(),
})

export const EtapaSchema = z.object({
  id: Id,
  nombre: Texto,
  descripcion: Texto,
  /** Nivel de afectación con el que se colorea el órgano en esta etapa. */
  nivel: NivelSchema.exclude(['sin_datos']),
})

export const EscalaSchema = z.object({
  id: Id,
  nombre: Texto,
  fuente: Id,
  etapas: z.array(EtapaSchema).min(2, 'una escala necesita al menos 2 etapas'),
})

export const AfectacionSchema = z.object({
  organo: Id,
  complicacion: Texto,
  /** Por qué la diabetes afecta este órgano. */
  mecanismo: Texto,
  escalas: z.array(EscalaSchema).min(1),
  /** Cómo y cada cuánto se revisa. */
  deteccion: z.array(Texto).min(1),
  fuentes: z.array(Id).min(1, 'cada complicación necesita al menos una fuente'),
})

export const DiseaseSchema = z.object({
  id: Id,
  nombre: Texto,
  descripcion: Texto,
  /** "borrador" hasta que lo revise un profesional de la salud. */
  estadoRevision: z.enum(['borrador', 'revisado']),
  fuentes: z.array(FuenteSchema).min(1),
  afectaciones: z.array(AfectacionSchema).min(1),
})

export type Nivel = z.infer<typeof NivelSchema>
export type Organ = z.infer<typeof OrganSchema>
export type Fuente = z.infer<typeof FuenteSchema>
export type Etapa = z.infer<typeof EtapaSchema>
export type Escala = z.infer<typeof EscalaSchema>
export type Afectacion = z.infer<typeof AfectacionSchema>
export type Disease = z.infer<typeof DiseaseSchema>

/**
 * Valida una enfermedad y sus referencias cruzadas:
 * órganos existentes, fuentes existentes, ids únicos.
 */
export function diseaseSchemaFor(organIds: readonly string[]) {
  const organos = new Set(organIds)
  return DiseaseSchema.superRefine((d, ctx) => {
    const fuentes = new Set<string>()
    d.fuentes.forEach((f, i) => {
      if (fuentes.has(f.id)) ctx.addIssue({ code: 'custom', path: ['fuentes', i, 'id'], message: `fuente repetida: "${f.id}"` })
      fuentes.add(f.id)
    })

    const organosVistos = new Set<string>()
    d.afectaciones.forEach((a, i) => {
      const path = ['afectaciones', i]
      if (!organos.has(a.organo)) {
        ctx.addIssue({ code: 'custom', path: [...path, 'organo'], message: `el órgano "${a.organo}" no existe en organs.json` })
      }
      if (organosVistos.has(a.organo)) {
        ctx.addIssue({ code: 'custom', path: [...path, 'organo'], message: `órgano repetido: "${a.organo}"` })
      }
      organosVistos.add(a.organo)

      a.fuentes.forEach((f, j) => {
        if (!fuentes.has(f)) ctx.addIssue({ code: 'custom', path: [...path, 'fuentes', j], message: `la fuente "${f}" no está en la lista de fuentes` })
      })
      a.escalas.forEach((e, j) => {
        if (!fuentes.has(e.fuente)) {
          ctx.addIssue({ code: 'custom', path: [...path, 'escalas', j, 'fuente'], message: `la fuente "${e.fuente}" no está en la lista de fuentes` })
        }
        const etapas = new Set<string>()
        e.etapas.forEach((et, k) => {
          if (etapas.has(et.id)) {
            ctx.addIssue({ code: 'custom', path: [...path, 'escalas', j, 'etapas', k, 'id'], message: `etapa repetida: "${et.id}"` })
          }
          etapas.add(et.id)
        })
      })
    })
  })
}

/** Convierte los errores de Zod en un mensaje legible: "afectaciones.0.organo: el órgano ... no existe". */
export function formatearErrores(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('\n')
}
