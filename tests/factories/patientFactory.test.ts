import { describe, expect, it } from 'vitest'
import { createPatient, personas } from './patientFactory'

describe('createPatient', () => {
  it('crea un paciente válido por defecto sin diabetes', () => {
    const p = createPatient()
    expect(p.tieneDiabetes).toBe(false)
    expect(p.edad).toBeGreaterThan(0)
    expect(p.tallaCm).toBeGreaterThan(0)
  })

  it('solo cambia los campos indicados', () => {
    const base = createPatient()
    const p = createPatient({ edad: 67 })
    expect(p.edad).toBe(67)
    expect({ ...p, edad: base.edad }).toEqual(base)
  })

  it('cada llamada devuelve un objeto nuevo (las pruebas no se contaminan)', () => {
    const a = createPatient()
    const b = createPatient()
    a.edad = 99
    expect(b.edad).not.toBe(99)
  })
})

describe('personas', () => {
  it.each(Object.entries(personas))('%s no tiene valores numéricos inválidos', (_id, p) => {
    for (const valor of Object.values(p)) {
      if (typeof valor === 'number') {
        expect(Number.isFinite(valor)).toBe(true)
        expect(valor).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('las personas con datos de laboratorio tienen diabetes', () => {
    for (const p of Object.values(personas)) {
      if (p.tfg !== undefined) expect(p.tieneDiabetes).toBe(true)
    }
  })

  it('datosIncompletos no tiene laboratorio', () => {
    expect(personas.datosIncompletos.tfg).toBeUndefined()
    expect(personas.datosIncompletos.hba1cPorcentaje).toBeUndefined()
  })
})
