/**
 * Conversión de unidades. Internamente se usa siempre:
 *  - glucosa en mg/dL
 *  - HbA1c en % (NGSP)
 */

/** 1 mmol/L de glucosa ≈ 18 mg/dL (7.0 mmol/L = 126 mg/dL, umbral de diabetes de la ADA). */
const MG_DL_POR_MMOL_L = 18

export function glucosaMmolLAMgDl(mmolL: number): number {
  return mmolL * MG_DL_POR_MMOL_L
}

export function glucosaMgDlAMmolL(mgDl: number): number {
  return mgDl / MG_DL_POR_MMOL_L
}

/** Ecuación maestra NGSP–IFCC: % = mmol/mol / 10.929 + 2.15 (48 mmol/mol ≈ 6.5 %). */
export function hba1cMmolMolAPorcentaje(mmolMol: number): number {
  return mmolMol / 10.929 + 2.15
}

export function hba1cPorcentajeAMmolMol(porcentaje: number): number {
  return (porcentaje - 2.15) * 10.929
}

/** Índice de masa corporal (kg/m²). */
export function imc(pesoKg: number, tallaCm: number): number {
  const m = tallaCm / 100
  return pesoKg / (m * m)
}

/**
 * Convierte texto del formulario a número. Acepta coma decimal ("6,5").
 * Devuelve undefined si está vacío y NaN si no es un número válido.
 */
export function parsearNumero(texto: string): number | undefined {
  const t = texto.trim().replace(',', '.')
  if (t === '') return undefined
  if (!/^-?\d+(\.\d+)?$/.test(t)) return Number.NaN
  return Number(t)
}
