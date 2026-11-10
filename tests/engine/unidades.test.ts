import { describe, expect, it } from 'vitest'
import { PatientSchema } from '../../src/data/patientSchema'
import {
  glucosaMgDlAMmolL,
  glucosaMmolLAMgDl,
  hba1cMmolMolAPorcentaje,
  hba1cPorcentajeAMmolMol,
  imc,
  parsearNumero,
} from '../../src/engine/unidades'
import { createPatient } from '../factories/patientFactory'

describe('F3-04: conversión de unidades', () => {
  it('glucosa: 7.0 mmol/L = 126 mg/dL (umbral de diabetes)', () => {
    expect(glucosaMmolLAMgDl(7)).toBe(126)
    expect(glucosaMgDlAMmolL(126)).toBe(7)
  })

  it('HbA1c: 48 mmol/mol ≈ 6.5 % y 39 mmol/mol ≈ 5.7 % (umbrales ADA)', () => {
    expect(hba1cMmolMolAPorcentaje(48)).toBeCloseTo(6.54, 2)
    expect(hba1cMmolMolAPorcentaje(39)).toBeCloseTo(5.72, 2)
    expect(hba1cMmolMolAPorcentaje(47)).toBeLessThan(6.5)
    expect(hba1cMmolMolAPorcentaje(38)).toBeLessThan(5.7)
  })

  it('ida y vuelta sin pérdida', () => {
    for (const v of [4, 5.7, 6.5, 9.3]) expect(hba1cMmolMolAPorcentaje(hba1cPorcentajeAMmolMol(v))).toBeCloseTo(v, 10)
    for (const v of [70, 100, 126, 400]) expect(glucosaMmolLAMgDl(glucosaMgDlAMmolL(v))).toBeCloseTo(v, 10)
  })

  it('IMC', () => {
    expect(imc(70, 175)).toBeCloseTo(22.86, 2)
  })
})

describe('F3-03: texto del formulario a número', () => {
  it.each([
    ['6.5', 6.5], ['6,5', 6.5], [' 42 ', 42], ['0', 0], ['-3', -3],
  ])('"%s" → %s', (texto, n) => {
    expect(parsearNumero(texto)).toBe(n)
  })

  it('vacío → undefined', () => {
    expect(parsearNumero('')).toBeUndefined()
    expect(parsearNumero('   ')).toBeUndefined()
  })

  it.each(['abc', '6.5.1', '6,5,1', '1e3', '12kg', '.', '--1'])('"%s" → NaN', (texto) => {
    expect(parsearNumero(texto)).toBeNaN()
  })
})

describe('F3-01: validación de rangos (PatientSchema)', () => {
  const error = (o: Parameters<typeof createPatient>[0]) => {
    const r = PatientSchema.safeParse(createPatient(o))
    return r.success ? '' : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' | ')
  }

  it.each([
    [{ edad: -5 }, 'edad'],
    [{ edad: 17 }, 'edad'],
    [{ pesoKg: 0 }, 'pesoKg'],
    [{ tallaCm: 400 }, 'tallaCm'],
    [{ tfg: 250 }, 'tfg'],
    [{ tfg: -1 }, 'tfg'],
    [{ hba1cPorcentaje: 40 }, 'hba1cPorcentaje'],
    [{ edad: Number.NaN }, 'edad'],
  ])('%o → error en %s', (o, campo) => {
    expect(error(o)).toContain(campo)
  })

  it('mensaje en español con el rango', () => {
    expect(error({ tallaCm: 400 })).toContain('como máximo 250 cm')
    expect(error({ edad: Number.NaN })).toContain('Debe ser un número')
  })

  it('años con diabetes no pueden superar la edad', () => {
    expect(error({ edad: 40, tieneDiabetes: true, aniosDiagnostico: 50 })).toContain('mayor que la edad')
  })

  it('valores en los límites permitidos son válidos', () => {
    expect(error({ edad: 18, tallaCm: 100, tfg: 0 })).toBe('')
    expect(error({ edad: 120, tallaCm: 250, tfg: 200 })).toBe('')
  })
})
