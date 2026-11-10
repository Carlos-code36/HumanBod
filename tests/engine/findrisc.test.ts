import { describe, expect, it } from 'vitest'
import { calcularFindrisc, categoriaFindrisc, puntosCintura, puntosEdad, puntosImc } from '../../src/engine/findrisc'
import { createPatient, personas } from '../factories/patientFactory'

/** Paciente con el máximo de puntos en todos los factores. */
const peorCaso = createPatient({
  edad: 70,
  sexo: 'M',
  pesoKg: 110,
  tallaCm: 170, // IMC 38
  cinturaCm: 120,
  actividadFisica: false,
  frutasVerdurasDiario: false,
  medicacionPresion: true,
  glucosaAltaPrevia: true,
  antecedentesFamiliares: 'primer_grado',
})

/** Paciente con 0 puntos en todos los factores. */
const mejorCaso = createPatient({ edad: 30, sexo: 'F', pesoKg: 55, tallaCm: 165, cinturaCm: 70 })

describe('FINDRISC: personas', () => {
  it('F3-10: persona sana → 0 puntos, riesgo bajo', () => {
    const r = calcularFindrisc(personas.sano)
    expect(r.puntaje).toBe(0)
    expect(r.categoria).toBe('baja')
    expect(r.nivel).toBe('normal')
  })

  it('F3-11: persona con prediabetes → riesgo alto o muy alto', () => {
    // 55 años (3) + IMC 30.9 (3) + cintura 102 mujer (4) + sin actividad (2) + sin frutas (1)
    // + glucosa alta previa (5) + padre/madre (5) = 23
    const r = calcularFindrisc(personas.prediabetes)
    expect(r.puntaje).toBe(23)
    expect(r.categoria).toBe('muy_alta')
  })

  it('F3-12: puntaje mínimo 0 y máximo 26', () => {
    expect(calcularFindrisc(mejorCaso).puntaje).toBe(0)
    expect(calcularFindrisc(peorCaso).puntaje).toBe(26)
  })

  it('el desglose suma el puntaje y respeta el máximo de cada factor', () => {
    for (const p of [mejorCaso, peorCaso, ...Object.values(personas)]) {
      const r = calcularFindrisc(p)
      expect(r.desglose.reduce((s, f) => s + f.puntos, 0)).toBe(r.puntaje)
      expect(r.desglose.reduce((s, f) => s + f.maximo, 0)).toBe(26)
      for (const f of r.desglose) expect(f.puntos).toBeLessThanOrEqual(f.maximo)
    }
  })

  it('cada factor suma los puntos publicados', () => {
    const base = calcularFindrisc(mejorCaso).puntaje
    const delta = (o: Parameters<typeof createPatient>[0]) => calcularFindrisc({ ...mejorCaso, ...o }).puntaje - base
    expect(delta({ actividadFisica: false })).toBe(2)
    expect(delta({ frutasVerdurasDiario: false })).toBe(1)
    expect(delta({ medicacionPresion: true })).toBe(2)
    expect(delta({ glucosaAltaPrevia: true })).toBe(5)
    expect(delta({ antecedentesFamiliares: 'segundo_grado' })).toBe(3)
    expect(delta({ antecedentesFamiliares: 'primer_grado' })).toBe(5)
  })
})

describe('F3-13: valores en el límite', () => {
  it.each([
    [44, 0], [44.9, 0], [45, 2], [54, 2], [54.9, 2], [55, 3], [64, 3], [64.9, 3], [65, 4], [100, 4],
  ])('edad %s → %s puntos', (edad, puntos) => {
    expect(puntosEdad(edad)).toBe(puntos)
  })

  it.each([
    [24.9, 0], [24.99, 0], [25, 1], [30, 1], [30.01, 3], [45, 3],
  ])('IMC %s → %s puntos', (valor, puntos) => {
    expect(puntosImc(valor)).toBe(puntos)
  })

  it('F3-14: cintura con umbral distinto según sexo', () => {
    // Hombres: <94 → 0 · 94–102 → 3 · >102 → 4
    expect([93.9, 94, 102, 102.1].map((c) => puntosCintura(c, 'M'))).toEqual([0, 3, 3, 4])
    // Mujeres: <80 → 0 · 80–88 → 3 · >88 → 4
    expect([79.9, 80, 88, 88.1].map((c) => puntosCintura(c, 'F'))).toEqual([0, 3, 3, 4])
    // Misma cintura, distinto resultado por sexo
    expect(puntosCintura(85, 'M')).toBe(0)
    expect(puntosCintura(85, 'F')).toBe(3)
  })

  it.each([
    [0, 'baja'], [6, 'baja'], [7, 'ligeramente_elevada'], [11, 'ligeramente_elevada'], [12, 'moderada'],
    [14, 'moderada'], [15, 'alta'], [20, 'alta'], [21, 'muy_alta'], [26, 'muy_alta'],
  ])('puntaje %s → categoría %s', (puntaje, categoria) => {
    expect(categoriaFindrisc(puntaje).categoria).toBe(categoria)
  })

  it('rechaza puntajes imposibles', () => {
    expect(() => categoriaFindrisc(-1)).toThrow(RangeError)
    expect(() => categoriaFindrisc(27)).toThrow(RangeError)
    expect(() => categoriaFindrisc(3.5)).toThrow(RangeError)
  })
})
