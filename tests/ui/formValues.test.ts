import { describe, expect, it } from 'vitest'
import { FORM_VACIO, aPaciente, type FormValues } from '../../src/components/PatientForm/formValues'

const completo: FormValues = { ...FORM_VACIO, edad: '50', pesoKg: '70', tallaCm: '170', cinturaCm: '90' }

function errores(v: Partial<FormValues>) {
  const r = aPaciente({ ...completo, ...v })
  return r.ok ? {} : r.errores
}

describe('aPaciente: conversión del formulario', () => {
  it('formulario vacío → obligatorios marcados', () => {
    const r = aPaciente(FORM_VACIO)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errores).toMatchObject({ edad: 'Obligatorio', pesoKg: 'Obligatorio', tallaCm: 'Obligatorio', cinturaCm: 'Obligatorio' })
    }
  })

  it('formulario mínimo completo → paciente válido', () => {
    const r = aPaciente(completo)
    expect(r.ok).toBe(true)
  })

  it('F3-03: acepta coma decimal', () => {
    const r = aPaciente({ ...completo, hba1c: '6,5', pesoKg: '70,5' })
    expect(r.ok && r.paciente.hba1cPorcentaje).toBe(6.5)
    expect(r.ok && r.paciente.pesoKg).toBe(70.5)
  })

  it('F3-03: texto no numérico → error claro', () => {
    expect(errores({ edad: 'cincuenta' }).edad).toBe('Debe ser un número')
  })

  it('F3-04: HbA1c en mmol/mol se convierte a %', () => {
    const r = aPaciente({ ...completo, hba1c: '48', hba1cUnidad: 'mmol/mol' })
    expect(r.ok && r.paciente.hba1cPorcentaje).toBeCloseTo(6.54, 2)
  })

  it('F3-04: glucosa en mmol/L se convierte a mg/dL', () => {
    const r = aPaciente({ ...completo, glucosa: '7', glucosaUnidad: 'mmol/L' })
    expect(r.ok && r.paciente.glucosaAyunasMgDl).toBe(126)
  })

  it('F3-04: el error de rango usa la unidad elegida por el usuario', () => {
    expect(errores({ glucosa: '100', glucosaUnidad: 'mmol/L' }).glucosa).toBe('Debe estar entre 1.1 y 55.6 mmol/L')
    expect(errores({ glucosa: '5000' }).glucosa).toBe('Debe ser como máximo 1000 mg/dL')
    expect(errores({ hba1c: '500', hba1cUnidad: 'mmol/mol' }).hba1c).toMatch(/mmol\/mol$/)
  })

  it('F3-01: valores fuera de rango marcan el campo correcto', () => {
    expect(errores({ edad: '-5' }).edad).toContain('al menos 18')
    expect(errores({ tallaCm: '400' }).tallaCm).toContain('como máximo 250')
    expect(errores({ tfg: '250' }).tfg).toContain('como máximo 200')
    expect(errores({ albuminuria: '-1' }).albuminuria).toContain('al menos 0')
  })

  it('F3-02: campos opcionales vacíos no generan errores', () => {
    const r = aPaciente({ ...completo, hba1c: '', glucosa: '', tfg: '', albuminuria: '' })
    expect(r.ok).toBe(true)
  })

  it('los años de diagnóstico se ignoran si no tiene diabetes', () => {
    const r = aPaciente({ ...completo, tieneDiabetes: false, aniosDiagnostico: '999' })
    expect(r.ok && r.paciente.aniosDiagnostico).toBeUndefined()
    expect(errores({ tieneDiabetes: true, aniosDiagnostico: '60' }).aniosDiagnostico).toBe('No puede ser mayor que la edad')
  })

  it('"No sé" en estudios previos no se envía como etapa', () => {
    const r = aPaciente({ ...completo, etapasConocidas: { ojos: '', nervios: 'n1' } })
    expect(r.ok && r.paciente.etapasConocidas).toEqual({ nervios: 'n1' })
  })
})
