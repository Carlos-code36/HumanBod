import { describe, expect, it } from 'vitest'
import {
  LIMITES,
  PERFILES,
  resumir,
  simular,
  validarParametros,
  type ParametrosFisiologicos,
} from '../../src/engine/bergman'

const sano = PERFILES.sano.parametros
const comida60 = [{ carbohidratosG: 60, minuto: 0 }]
const sim = (p: ParametrosFisiologicos, comidas = comida60, minutos = 300, dt?: number) =>
  simular(p, comidas, { minutos, dt, muestreo: 1 })

describe('F4-01: equilibrio sin comida', () => {
  it.each(Object.keys(PERFILES))('%s: glucosa e insulina se quedan en el valor basal', (id) => {
    const p = PERFILES[id as keyof typeof PERFILES].parametros
    for (const pt of sim(p, [], 600)) {
      expect(pt.glucosa).toBeCloseTo(p.Gb, 9)
      expect(pt.insulina).toBeCloseTo(p.Ib, 9)
    }
  })
})

describe('F4-02: comida en persona sana', () => {
  const r = resumir(sim(sano), sano.Gb)

  it('la glucosa sube a un pico plausible (120–160 mg/dL) entre los 30 y 75 min', () => {
    expect(r.picoGlucosa).toBeGreaterThan(120)
    expect(r.picoGlucosa).toBeLessThan(160)
    expect(r.minutoPico).toBeGreaterThanOrEqual(30)
    expect(r.minutoPico).toBeLessThanOrEqual(75)
  })

  it('a las 2 h está por debajo de 140 mg/dL (rango normal posprandial)', () => {
    expect(r.glucosa2h).toBeLessThan(140)
  })

  it('vuelve cerca del basal y no baja de forma irreal (sin hipoglucemia)', () => {
    const pts = sim(sano)
    expect(r.minutosRetorno).toBeDefined()
    expect(Math.abs(pts.at(-1)!.glucosa - sano.Gb)).toBeLessThan(5)
    expect(Math.min(...pts.map((p) => p.glucosa))).toBeGreaterThan(sano.Gb - 5)
  })

  it('la insulina sube y vuelve a su basal', () => {
    const pts = sim(sano)
    expect(r.picoInsulina).toBeGreaterThan(sano.Ib * 3)
    expect(Math.abs(pts.at(-1)!.insulina - sano.Ib)).toBeLessThan(3)
  })
})

describe('F4-03: menor sensibilidad a la insulina', () => {
  it('pico más alto y retorno más lento que en la persona sana', () => {
    const rSano = resumir(sim(sano), sano.Gb)
    const resistente = { ...sano, SI: sano.SI / 4 }
    const rRes = resumir(sim(resistente), resistente.Gb)
    expect(rRes.picoGlucosa).toBeGreaterThan(rSano.picoGlucosa)
    expect(rRes.minutosRetorno ?? Infinity).toBeGreaterThan(rSano.minutosRetorno!)
  })

  it('a menor SI, mayor pico (monótono)', () => {
    const picos = [8e-4, 4e-4, 2e-4, 1e-4, 0.5e-4].map((SI) => resumir(sim({ ...sano, SI }), sano.Gb).picoGlucosa)
    for (let i = 1; i < picos.length; i++) expect(picos[i]).toBeGreaterThan(picos[i - 1]!)
  })

  it('con resistencia, el páncreas compensa con más insulina', () => {
    const r = resumir(sim(PERFILES.resistencia.parametros), PERFILES.resistencia.parametros.Gb)
    expect(r.picoInsulina).toBeGreaterThan(resumir(sim(sano), sano.Gb).picoInsulina)
  })

  it('el perfil de diabetes queda en rango de diabetes a las 2 h (≥200 mg/dL)', () => {
    const p = PERFILES.diabetes.parametros
    expect(resumir(sim(p), p.Gb).glucosa2h).toBeGreaterThanOrEqual(200)
  })

  it('más carbohidratos → pico más alto', () => {
    const pico = (g: number) => resumir(sim(sano, [{ carbohidratosG: g, minuto: 0 }]), sano.Gb).picoGlucosa
    expect(pico(30)).toBeLessThan(pico(60))
    expect(pico(60)).toBeLessThan(pico(120))
  })
})

describe('F4-04: nunca negativo, NaN ni Infinity', () => {
  const extremos = (k: keyof typeof LIMITES & keyof ParametrosFisiologicos) => [LIMITES[k].min, LIMITES[k].max]

  it('combinaciones de parámetros en los límites permitidos', () => {
    let casos = 0
    for (const SG of extremos('SG'))
      for (const SI of extremos('SI'))
        for (const beta of extremos('beta'))
          for (const Gb of extremos('Gb'))
            for (const carbohidratosG of [0, LIMITES.carbohidratosG.max]) {
              const pts = simular({ SG, SI, beta, Gb, Ib: 10 }, [{ carbohidratosG, minuto: 0 }], { minutos: 600 })
              for (const pt of pts) {
                expect(Number.isFinite(pt.glucosa) && pt.glucosa >= 0).toBe(true)
                expect(Number.isFinite(pt.insulina) && pt.insulina >= 0).toBe(true)
              }
              casos++
            }
    expect(casos).toBe(32)
  })

  it('varias comidas seguidas', () => {
    const comidas = [0, 240, 480, 600].map((minuto) => ({ carbohidratosG: 200, minuto }))
    for (const pt of simular(PERFILES.diabetes.parametros, comidas, { minutos: 24 * 60 })) {
      expect(Number.isFinite(pt.glucosa) && pt.glucosa >= 0).toBe(true)
    }
  })
})

describe('F4-05: estabilidad numérica', () => {
  it.each(Object.keys(PERFILES))('%s: con la mitad del paso el resultado casi no cambia (< 0.1 mg/dL)', (id) => {
    const p = PERFILES[id as keyof typeof PERFILES].parametros
    const a = sim(p, comida60, 360, 1)
    const b = sim(p, comida60, 360, 0.5)
    for (let i = 0; i < a.length; i++) {
      expect(b[i]!.t).toBe(a[i]!.t)
      expect(Math.abs(a[i]!.glucosa - b[i]!.glucosa)).toBeLessThan(0.1)
    }
  })
})

describe('F4-06: parámetros fuera de rango se rechazan', () => {
  it.each([
    [{ SI: -1e-4 }, 'SI'],
    [{ SI: 1 }, 'SI'],
    [{ SG: 0 }, 'SG'],
    [{ beta: 5 }, 'beta'],
    [{ Gb: 20 }, 'Gb'],
    [{ Ib: Number.NaN }, 'Ib'],
  ])('%o → error en %s', (cambio, campo) => {
    const p = { ...sano, ...cambio }
    expect(validarParametros(p).join()).toContain(campo)
    expect(() => simular(p, comida60, { minutos: 60 })).toThrow(RangeError)
  })

  it('los perfiles predefinidos están dentro de los límites', () => {
    for (const perfil of Object.values(PERFILES)) expect(validarParametros(perfil.parametros)).toEqual([])
  })

  it('duración o paso inválidos se rechazan', () => {
    expect(() => simular(sano, [], { minutos: 0 })).toThrow(RangeError)
    expect(() => simular(sano, [], { minutos: 60, dt: -1 })).toThrow(RangeError)
  })

  it('carbohidratos negativos se ignoran (no "quitan" glucosa)', () => {
    const pts = sim(sano, [{ carbohidratosG: -50, minuto: 0 }])
    for (const pt of pts) expect(pt.glucosa).toBeCloseTo(sano.Gb, 9)
  })
})

describe('F4-07: rendimiento', () => {
  it('24 h con paso de 0.5 min se calcula en menos de 100 ms', () => {
    const inicio = performance.now()
    simular(PERFILES.diabetes.parametros, [0, 300, 720].map((minuto) => ({ carbohidratosG: 60, minuto })), { minutos: 24 * 60 })
    expect(performance.now() - inicio).toBeLessThan(100)
  })
})

describe('muestreo y resumen', () => {
  it('guarda un punto cada 5 min por defecto, incluido el minuto 0 y el final', () => {
    const pts = simular(sano, comida60, { minutos: 60 })
    expect(pts.map((p) => p.t)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60])
  })

  it('una comida a mitad de la simulación empieza a subir después de ese minuto', () => {
    const pts = sim(sano, [{ carbohidratosG: 60, minuto: 120 }], 300)
    expect(pts.find((p) => p.t === 119)!.glucosa).toBeCloseTo(sano.Gb, 9)
    expect(pts.find((p) => p.t === 150)!.glucosa).toBeGreaterThan(sano.Gb + 5)
  })

  it('resumir una simulación vacía lanza error', () => {
    expect(() => resumir([], 90)).toThrow(RangeError)
  })
})
