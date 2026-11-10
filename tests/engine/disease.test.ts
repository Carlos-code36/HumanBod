import { describe, expect, it } from 'vitest'
import { DIABETES_T2, afectacionDe, cargarEnfermedad, fuentesDe } from '../../src/data/diseases'
import diabetesJson from '../../src/data/diseases/diabetes_t2.json'
import { ORGANS } from '../../src/data/organs'
import { OrgansSchema } from '../../src/data/schemas'
import { createAfectacion, createDisease, createOrgan } from '../factories/diseaseFactory'

const ORGAN_IDS = ORGANS.map((o) => o.id)

/** Devuelve el mensaje de error de cargarEnfermedad, o '' si no falló. */
function errorAlCargar(raw: unknown): string {
  try {
    cargarEnfermedad(raw, ORGAN_IDS)
    return ''
  } catch (e) {
    return (e as Error).message
  }
}

describe('F2-01: diabetes_t2.json es válido', () => {
  it('pasa el esquema y las referencias cruzadas', () => {
    expect(() => cargarEnfermedad(diabetesJson, ORGAN_IDS)).not.toThrow()
  })

  it('describe los 6 órganos del cuerpo', () => {
    expect(DIABETES_T2.afectaciones.map((a) => a.organo).sort()).toEqual([...ORGAN_IDS].sort())
  })

  it('está marcado como borrador hasta su revisión profesional', () => {
    expect(DIABETES_T2.estadoRevision).toBe('borrador')
  })

  it('la factory crea una enfermedad válida', () => {
    expect(errorAlCargar(createDisease())).toBe('')
  })
})

describe('F2-02: datos mal escritos se rechazan con mensaje claro', () => {
  it('campo obligatorio faltante', () => {
    const { mecanismo: _omitido, ...sinMecanismo } = createAfectacion()
    const msg = errorAlCargar(createDisease({ afectaciones: [sinMecanismo as never] }))
    expect(msg).toContain('afectaciones.0.mecanismo')
  })

  it('texto vacío o solo espacios', () => {
    expect(errorAlCargar(createDisease({ nombre: '   ' }))).toContain('nombre: no puede estar vacío')
  })

  it('id con acentos o mayúsculas', () => {
    expect(errorAlCargar(createDisease({ id: 'Diabetes_Tipo_2' }))).toContain('id inválido')
    expect(errorAlCargar(createDisease({ afectaciones: [createAfectacion({ organo: 'riñones' })] }))).toContain('id inválido')
  })

  it('nivel inexistente en una etapa', () => {
    const a = createAfectacion()
    a.escalas[0]!.etapas[0]!.nivel = 'grave' as never
    expect(errorAlCargar(createDisease({ afectaciones: [a] }))).toContain('nivel')
  })

  it('una etapa no puede ser "sin_datos" (ese nivel es solo para la interfaz)', () => {
    const a = createAfectacion()
    a.escalas[0]!.etapas[0]!.nivel = 'sin_datos' as never
    expect(errorAlCargar(createDisease({ afectaciones: [a] }))).toContain('nivel')
  })

  it('escala con una sola etapa', () => {
    const a = createAfectacion()
    a.escalas[0]!.etapas = a.escalas[0]!.etapas.slice(0, 1)
    expect(errorAlCargar(createDisease({ afectaciones: [a] }))).toContain('al menos 2 etapas')
  })

  it('etapas repetidas dentro de una escala', () => {
    const a = createAfectacion()
    a.escalas[0]!.etapas[1]!.id = 'e1'
    expect(errorAlCargar(createDisease({ afectaciones: [a] }))).toContain('etapa repetida')
  })

  it('no es un objeto', () => {
    expect(errorAlCargar(null)).not.toBe('')
    expect(errorAlCargar('texto')).not.toBe('')
  })
})

describe('F2-03: referencias a órganos', () => {
  it('rechaza un órgano que no existe en organs.json', () => {
    const msg = errorAlCargar(createDisease({ afectaciones: [createAfectacion({ organo: 'bazo' })] }))
    expect(msg).toContain('el órgano "bazo" no existe')
  })

  it('rechaza el mismo órgano descrito dos veces', () => {
    const msg = errorAlCargar(createDisease({ afectaciones: [createAfectacion(), createAfectacion()] }))
    expect(msg).toContain('órgano repetido')
  })

  it('organs.json rechaza ids repetidos', () => {
    const r = OrgansSchema.safeParse([createOrgan(), createOrgan()])
    expect(r.success).toBe(false)
  })
})

describe('F2-04: todo el contenido está citado', () => {
  it('cada complicación tiene al menos una fuente', () => {
    expect(errorAlCargar(createDisease({ afectaciones: [createAfectacion({ fuentes: [] })] }))).toContain(
      'al menos una fuente',
    )
  })

  it('rechaza una fuente que no está en la lista', () => {
    const msg = errorAlCargar(createDisease({ afectaciones: [createAfectacion({ fuentes: ['inventada'] })] }))
    expect(msg).toContain('la fuente "inventada" no está')
  })

  it('rechaza una escala con fuente inexistente', () => {
    const a = createAfectacion()
    a.escalas[0]!.fuente = 'inventada'
    expect(errorAlCargar(createDisease({ afectaciones: [a] }))).toContain('escalas.0.fuente')
  })

  it('en diabetes_t2 cada escala y cada complicación tiene fuentes que existen', () => {
    for (const a of DIABETES_T2.afectaciones) {
      expect(fuentesDe(DIABETES_T2, a.fuentes)).toHaveLength(a.fuentes.length)
      for (const e of a.escalas) expect(fuentesDe(DIABETES_T2, [e.fuente])).toHaveLength(1)
    }
  })
})

describe('contenido de diabetes_t2', () => {
  it('cada escala va de menor a mayor afectación', () => {
    const orden = ['normal', 'leve', 'moderada', 'severa']
    for (const a of DIABETES_T2.afectaciones) {
      for (const e of a.escalas) {
        const posiciones = e.etapas.map((et) => orden.indexOf(et.nivel))
        expect(posiciones, `${a.organo} / ${e.id}`).toEqual([...posiciones].sort((x, y) => x - y))
      }
    }
  })

  it('cada escala empieza en un estado normal', () => {
    for (const a of DIABETES_T2.afectaciones) {
      for (const e of a.escalas) expect(e.etapas[0]!.nivel, `${a.organo} / ${e.id}`).toBe('normal')
    }
  })

  it('riñones tiene las categorías KDIGO G1–G5 y A1–A3', () => {
    const rinon = afectacionDe(DIABETES_T2, 'rinones')!
    const ids = rinon.escalas.flatMap((e) => e.etapas.map((et) => et.id))
    expect(ids).toEqual(['g1', 'g2', 'g3a', 'g3b', 'g4', 'g5', 'a1', 'a2', 'a3'])
  })
})

describe('F2-05 / F2-06: afectación de un órgano', () => {
  it('órgano afectado → devuelve su complicación', () => {
    expect(afectacionDe(DIABETES_T2, 'ojos')?.complicacion).toBe('Retinopatía diabética')
  })

  it('órgano sin afectación descrita → undefined (el panel muestra "sin afectación descrita")', () => {
    const soloRinon = createDisease()
    expect(afectacionDe(soloRinon, 'ojos')).toBeUndefined()
  })

  it('sin selección o id desconocido → undefined, sin errores', () => {
    expect(afectacionDe(DIABETES_T2, null)).toBeUndefined()
    expect(afectacionDe(DIABETES_T2, 'bazo')).toBeUndefined()
  })
})
