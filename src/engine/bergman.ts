/**
 * Simulación educativa de glucosa e insulina tras una comida.
 *
 * Basada en el MODELO MÍNIMO DE BERGMAN:
 *   Bergman RN, et al. Quantitative estimation of insulin sensitivity. Am J Physiol, 1979.
 *   Valores de referencia de SI y SG: Bergman RN. Toward physiological understanding of
 *   glucose tolerance: minimal-model approach. Diabetes, 1989.
 *
 *   dG/dt = −(SG + X)·G + SG·Gb + Ra(t)/V        glucosa en plasma (mg/dL)
 *   dX/dt = −p2·X + p2·SI·(I − Ib)               acción de la insulina (1/min)
 *   dI/dt = −n·(I − Ib) + β·max(G − Gb, 0)       insulina en plasma (μU/mL)
 *
 * SIMPLIFICACIONES (para uso educativo; NO sirve para decisiones clínicas ni para calcular dosis):
 *  - La secreción de insulina (β) es una respuesta lineal a la glucosa por encima de la basal;
 *    su valor está calibrado para obtener curvas plausibles, no proviene de la literatura.
 *    Calibración con 60 g de carbohidratos (noviembre de 2026):
 *      sana:        pico ~140 mg/dL a los ~45 min, ~100 a las 2 h, insulina pico ~57 μU/mL
 *      resistencia: pico ~163, ~126 a las 2 h, insulina pico ~108 (el páncreas compensa)
 *      diabetes:    pico ~288 a los ~100 min, ~283 a las 2 h, insulina pico ~53
 *  - La absorción de la comida usa dos compartimentos intestinales con una sola constante.
 *  - p2, n, V, f y kabs son valores típicos redondeados, iguales para todos los perfiles.
 */

export interface ParametrosFisiologicos {
  /** Efectividad de la glucosa: capacidad de la glucosa de bajar por sí misma (1/min). */
  SG: number
  /** Sensibilidad a la insulina (1/min por μU/mL). */
  SI: number
  /** Respuesta de secreción de insulina (μU/mL/min por mg/dL sobre la basal). */
  beta: number
  /** Glucosa basal en ayunas (mg/dL). */
  Gb: number
  /** Insulina basal en ayunas (μU/mL). */
  Ib: number
}

export interface Comida {
  /** Carbohidratos de la comida (g). */
  carbohidratosG: number
  /** Minuto en que se come. */
  minuto: number
}

export interface PuntoSimulacion {
  t: number
  glucosa: number
  insulina: number
}

/** Constantes compartidas (valores típicos). */
export const CONSTANTES = {
  /** Velocidad de la acción de la insulina (1/min). */
  p2: 0.025,
  /** Depuración de insulina (1/min). */
  n: 0.2,
  /** Volumen de distribución de la glucosa (dL), ≈1.7 dL/kg × 70 kg. */
  V: 119,
  /** Fracción de los carbohidratos que llega a la sangre. */
  f: 0.9,
  /** Velocidad de absorción intestinal (1/min). Calibrada: pico de glucosa a ~45 min en persona sana. */
  kabs: 0.02,
} as const

export type PerfilId = 'sano' | 'resistencia' | 'diabetes'

export const PERFILES: Record<PerfilId, { nombre: string; descripcion: string; parametros: ParametrosFisiologicos }> = {
  sano: {
    nombre: 'Persona sana',
    descripcion: 'Sensibilidad a la insulina normal (SI ≈ 7.6 × 10⁻⁴).',
    parametros: { SG: 0.026, SI: 7.6e-4, beta: 0.2, Gb: 90, Ib: 8 },
  },
  resistencia: {
    nombre: 'Resistencia a la insulina',
    descripcion: 'Como en personas con obesidad sin diabetes (SI ≈ 2.3 × 10⁻⁴): el páncreas compensa secretando más.',
    parametros: { SG: 0.026, SI: 2.3e-4, beta: 0.3, Gb: 100, Ib: 14 },
  },
  diabetes: {
    nombre: 'Diabetes tipo 2',
    descripcion: 'Sensibilidad muy baja (SI ≈ 0.61 × 10⁻⁴), menor efectividad de la glucosa (SG ≈ 0.014) y secreción reducida.',
    parametros: { SG: 0.014, SI: 0.61e-4, beta: 0.06, Gb: 150, Ib: 12 },
  },
}

/** Límites de los controles (F4-06). Fuera de estos rangos el modelo deja de tener sentido fisiológico. */
export const LIMITES = {
  SG: { min: 0.005, max: 0.05 },
  SI: { min: 0.1e-4, max: 20e-4 },
  beta: { min: 0, max: 2 },
  Gb: { min: 60, max: 300 },
  Ib: { min: 1, max: 50 },
  carbohidratosG: { min: 0, max: 200 },
  minutos: { min: 30, max: 24 * 60 },
} as const

export function validarParametros(p: ParametrosFisiologicos): string[] {
  const errores: string[] = []
  for (const k of ['SG', 'SI', 'beta', 'Gb', 'Ib'] as const) {
    const { min, max } = LIMITES[k]
    if (!Number.isFinite(p[k]) || p[k] < min || p[k] > max) errores.push(`${k} fuera de rango (${min}–${max}): ${p[k]}`)
  }
  return errores
}

/** Estado interno: glucosa, acción de insulina, insulina y dos compartimentos del intestino (mg). */
type Estado = [G: number, X: number, I: number, Q1: number, Q2: number]

function derivadas(s: Estado, p: ParametrosFisiologicos): Estado {
  const [G, X, I, Q1, Q2] = s
  const { p2, n, V, f, kabs } = CONSTANTES
  const Ra = f * kabs * Q2 // mg/min que entran a la sangre
  return [
    -(p.SG + X) * G + p.SG * p.Gb + Ra / V,
    -p2 * X + p2 * p.SI * (I - p.Ib),
    -n * (I - p.Ib) + p.beta * Math.max(G - p.Gb, 0),
    -kabs * Q1,
    kabs * Q1 - kabs * Q2,
  ]
}

/** Un paso de Runge-Kutta de 4.º orden. */
function rk4(s: Estado, p: ParametrosFisiologicos, dt: number): Estado {
  const suma = (a: Estado, b: Estado, k: number) => a.map((v, i) => v + k * b[i]!) as Estado
  const k1 = derivadas(s, p)
  const k2 = derivadas(suma(s, k1, dt / 2), p)
  const k3 = derivadas(suma(s, k2, dt / 2), p)
  const k4 = derivadas(suma(s, k3, dt), p)
  return s.map((v, i) => v + (dt / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!)) as Estado
}

export interface OpcionesSimulacion {
  /** Duración total (min). */
  minutos: number
  /** Paso de integración (min). Por defecto 0.5. */
  dt?: number
  /** Cada cuántos minutos se guarda un punto. Por defecto 5. */
  muestreo?: number
}

/**
 * Simula desde el estado basal (en equilibrio). Lanza un error si los parámetros están fuera de rango.
 * Garantiza valores finitos y no negativos (F4-04).
 */
export function simular(p: ParametrosFisiologicos, comidas: Comida[], opciones: OpcionesSimulacion): PuntoSimulacion[] {
  const errores = validarParametros(p)
  if (errores.length) throw new RangeError(errores.join('; '))
  const { minutos, dt = 0.5, muestreo = 5 } = opciones
  if (!(minutos > 0) || !(dt > 0) || !(muestreo > 0)) throw new RangeError('Duración, paso y muestreo deben ser positivos')

  let s: Estado = [p.Gb, 0, p.Ib, 0, 0]
  const pendientes = [...comidas].sort((a, b) => a.minuto - b.minuto)
  const puntos: PuntoSimulacion[] = []
  const pasos = Math.round(minutos / dt)
  const cadaN = Math.max(1, Math.round(muestreo / dt))

  for (let i = 0; i <= pasos; i++) {
    const t = i * dt
    // Las comidas entran al primer compartimento del intestino, en mg.
    while (pendientes.length && pendientes[0]!.minuto <= t + 1e-9) {
      s[3] += Math.max(0, pendientes.shift()!.carbohidratosG) * 1000
    }
    if (i % cadaN === 0) puntos.push({ t, glucosa: s[0], insulina: s[2] })
    if (i < pasos) {
      s = rk4(s, p, dt)
      // Protección: la glucosa y la insulina no pueden ser negativas.
      s[0] = Math.max(0, s[0])
      s[2] = Math.max(0, s[2])
      if (!s.every(Number.isFinite)) throw new Error(`Simulación inestable en t=${t} min`)
    }
  }
  return puntos
}

export interface ResumenCurva {
  picoGlucosa: number
  minutoPico: number
  picoInsulina: number
  /** Glucosa 2 horas después de la comida (mg/dL), si la simulación llega. */
  glucosa2h?: number
  /** Minutos hasta volver a menos de 10 mg/dL sobre la basal tras el pico, si ocurre. */
  minutosRetorno?: number
}

export function resumir(puntos: PuntoSimulacion[], Gb: number, minutoComida = 0): ResumenCurva {
  if (puntos.length === 0) throw new RangeError('Simulación vacía')
  let pico = puntos[0]!
  for (const pt of puntos) if (pt.glucosa > pico.glucosa) pico = pt
  const picoInsulina = Math.max(...puntos.map((pt) => pt.insulina))
  const a2h = puntos.find((pt) => pt.t >= minutoComida + 120)
  const retorno = puntos.find((pt) => pt.t > pico.t && pt.glucosa < Gb + 10)
  return {
    picoGlucosa: pico.glucosa,
    minutoPico: pico.t,
    picoInsulina,
    glucosa2h: a2h?.glucosa,
    minutosRetorno: retorno ? retorno.t - minutoComida : undefined,
  }
}
