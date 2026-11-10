import { describe, expect, it } from 'vitest'
import { DIABETES_T2 } from '../../src/data/diseases'
import { PatientSchema } from '../../src/data/patientSchema'
import { evaluar, nivelesDe } from '../../src/engine/evaluar'
import { categoriaPorGlucosaAyunas, categoriaPorHba1c, peorCategoria } from '../../src/engine/glucemia'
import { createPatient, personas } from '../factories/patientFactory'

describe('glucemia (ADA)', () => {
  it.each([
    [5.6, 'normal'], [5.69, 'normal'], [5.7, 'prediabetes'], [6.4, 'prediabetes'], [6.49, 'prediabetes'], [6.5, 'diabetes'],
  ])('HbA1c %s %% → %s', (v, c) => {
    expect(categoriaPorHba1c(v)).toBe(c)
  })

  it.each([
    [99, 'normal'], [99.9, 'normal'], [100, 'prediabetes'], [125, 'prediabetes'], [125.9, 'prediabetes'], [126, 'diabetes'],
  ])('glucosa en ayunas %s mg/dL → %s', (v, c) => {
    expect(categoriaPorGlucosaAyunas(v)).toBe(c)
  })

  it('si las pruebas no coinciden, manda la más alta', () => {
    expect(peorCategoria('normal', 'prediabetes')).toBe('prediabetes')
    expect(peorCategoria('diabetes', undefined, 'normal')).toBe('diabetes')
    expect(peorCategoria(undefined)).toBeUndefined()
  })
})

describe('evaluar: modos', () => {
  it('sin diabetes → modo prevención con FINDRISC', () => {
    const e = evaluar(personas.prediabetes, DIABETES_T2)
    expect(e.modo).toBe('prevencion')
    expect(e.findrisc?.puntaje).toBe(23)
  })

  it('F3-15: con diabetes → modo complicaciones, sin FINDRISC', () => {
    const e = evaluar(personas.diabetesControlada, DIABETES_T2)
    expect(e.modo).toBe('complicaciones')
    expect(e.findrisc).toBeUndefined()
  })
})

describe('evaluar: riñones con personas', () => {
  it.each([
    ['diabetesControlada', 'G1/A1', 'normal'],
    ['nefropatiaModerada', 'G3a/A2', 'moderada'],
    ['nefropatiaSevera', 'G5/A3', 'severa'],
  ] as const)('%s → %s (%s)', (persona, titulo, nivel) => {
    const r = evaluar(personas[persona], DIABETES_T2).organos.rinones!
    expect(r.titulo).toBe(titulo)
    expect(r.nivel).toBe(nivel)
  })
})

describe('evaluar: páncreas', () => {
  it('con diabetes informada → moderada, aunque la HbA1c esté en meta', () => {
    const r = evaluar(personas.diabetesControlada, DIABETES_T2).organos.pancreas!
    expect(r.nivel).toBe('moderada')
    expect(r.explicacion.join(' ')).toContain('dentro de la meta')
  })

  it('sin diagnóstico pero valor en rango de diabetes → avisa que requiere confirmación', () => {
    const r = evaluar(createPatient({ hba1cPorcentaje: 7.2 }), DIABETES_T2).organos.pancreas!
    expect(r.titulo).toBe('Rango de diabetes')
    expect(r.explicacion.join(' ')).toContain('confirmación')
  })

  it('pruebas que no coinciden → toma la más alta y lo explica', () => {
    const r = evaluar(createPatient({ hba1cPorcentaje: 5.5, glucosaAyunasMgDl: 110 }), DIABETES_T2).organos.pancreas!
    expect(r.titulo).toBe('Prediabetes')
    expect(r.explicacion.join(' ')).toContain('no coinciden')
  })
})

describe('evaluar: etapas conocidas por estudios previos', () => {
  it('etapa válida → nivel de la etapa', () => {
    const p = createPatient({ tieneDiabetes: true, etapasConocidas: { ojos: 'rdnp_moderada', nervios: 'n3' } })
    const e = evaluar(p, DIABETES_T2)
    expect(e.organos.ojos).toMatchObject({ nivel: 'moderada', titulo: 'No proliferativa moderada' })
    expect(e.organos.nervios).toMatchObject({ nivel: 'severa', titulo: 'N3' })
  })

  it('etapa desconocida → sin datos, sin errores', () => {
    const e = evaluar(createPatient({ etapasConocidas: { ojos: 'inventada' } }), DIABETES_T2)
    expect(e.organos.ojos).toMatchObject({ nivel: 'sin_datos' })
    expect(e.organos.ojos!.explicacion[0]).toContain('no reconocida')
  })

  it('una etapa de otro órgano no se aplica', () => {
    const e = evaluar(createPatient({ etapasConocidas: { ojos: 'g3a' } }), DIABETES_T2)
    expect(e.organos.ojos!.nivel).toBe('sin_datos')
  })
})

describe('F3-02 / datos incompletos', () => {
  it('sin laboratorio → órganos en "sin_datos" con indicación de qué falta', () => {
    const e = evaluar(personas.datosIncompletos, DIABETES_T2)
    for (const r of Object.values(e.organos)) {
      expect(r.nivel).not.toBe(undefined)
      if (r.organo !== 'pancreas') expect(r.nivel).toBe('sin_datos')
      expect(r.explicacion.length).toBeGreaterThan(0)
    }
  })
})

describe('propiedades generales', () => {
  it('F3-30: todo resultado con datos tiene explicación y fuente', () => {
    for (const p of Object.values(personas)) {
      for (const r of Object.values(evaluar(p, DIABETES_T2).organos)) {
        expect(r.explicacion.length).toBeGreaterThan(0)
        if (r.nivel !== 'sin_datos') expect(r.fuente).toBeTruthy()
      }
    }
  })

  it('F3-31: determinista (mismos datos → mismo resultado)', () => {
    for (const p of Object.values(personas)) {
      expect(evaluar(p, DIABETES_T2)).toEqual(evaluar(structuredClone(p), DIABETES_T2))
    }
  })

  it('F3-32: ninguna persona produce NaN, undefined ni errores', () => {
    for (const p of Object.values(personas)) {
      const e = evaluar(p, DIABETES_T2)
      expect(JSON.stringify(e)).not.toMatch(/NaN|undefined|Infinity/)
      expect(Object.keys(nivelesDe(e)).sort()).toEqual(DIABETES_T2.afectaciones.map((a) => a.organo).sort())
    }
  })

  it('todas las personas de la factory pasan la validación del formulario', () => {
    for (const [id, p] of Object.entries(personas)) {
      const r = PatientSchema.safeParse(p)
      expect(r.success, `${id}: ${r.error?.message}`).toBe(true)
    }
  })

  it('nivelesDe(null) → objeto vacío', () => {
    expect(nivelesDe(null)).toEqual({})
  })
})
