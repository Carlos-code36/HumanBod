import type { Disease, Nivel } from '../data/schemas'
import type { PatientData } from '../types/medical'
import { calcularFindrisc, type ResultadoFindrisc } from './findrisc'
import { FUENTE_ADA, NIVEL_GLUCEMICO, categoriaPorGlucosaAyunas, categoriaPorHba1c, peorCategoria } from './glucemia'
import { FUENTE_KDIGO, clasificarRinon, nombreCategoria } from './kidney'

/**
 * Evalúa a un paciente: riesgo (FINDRISC) y afectación por órgano.
 * Función pura: mismos datos → mismo resultado (F3-31). Cada resultado explica el porqué y su fuente (F3-30).
 */

export interface ResultadoOrgano {
  organo: string
  nivel: Nivel
  /** Resumen corto: "G3a/A2", "Prediabetes", "No proliferativa leve". */
  titulo: string
  explicacion: string[]
  fuente?: string
}

export interface Evaluacion {
  /** "prevencion": sin diagnóstico (aplica FINDRISC). "complicaciones": con diabetes. */
  modo: 'prevencion' | 'complicaciones'
  findrisc?: ResultadoFindrisc
  organos: Record<string, ResultadoOrgano>
}

/** Órganos con cálculo propio; el resto usa la etapa conocida por estudios previos. */
export const CALCULADOS = new Set(['pancreas', 'rinones'])

const fmt = (n: number, dec = 1) => n.toFixed(dec).replace(/\.0+$/, '')

function evaluarPancreas(p: PatientData): ResultadoOrgano {
  const porHba1c = p.hba1cPorcentaje === undefined ? undefined : categoriaPorHba1c(p.hba1cPorcentaje)
  const porGlucosa = p.glucosaAyunasMgDl === undefined ? undefined : categoriaPorGlucosaAyunas(p.glucosaAyunasMgDl)
  const valores: string[] = []
  if (p.hba1cPorcentaje !== undefined) valores.push(`HbA1c ${fmt(p.hba1cPorcentaje)} %`)
  if (p.glucosaAyunasMgDl !== undefined) valores.push(`glucosa en ayunas ${fmt(p.glucosaAyunasMgDl, 0)} mg/dL`)

  if (p.tieneDiabetes) {
    const explicacion = ['Diagnóstico de diabetes informado por el usuario.']
    if (valores.length) explicacion.push(`Valores actuales: ${valores.join(', ')}.`)
    if (p.hba1cPorcentaje !== undefined) {
      explicacion.push(
        p.hba1cPorcentaje < 7
          ? 'La HbA1c está dentro de la meta habitual para adultos (menor a 7 %).'
          : 'La HbA1c está por encima de la meta habitual para adultos (menor a 7 %).',
      )
    }
    return { organo: 'pancreas', nivel: 'moderada', titulo: 'Diabetes', explicacion, fuente: FUENTE_ADA }
  }

  const cat = peorCategoria(porHba1c, porGlucosa)
  if (!cat) {
    return {
      organo: 'pancreas',
      nivel: 'sin_datos',
      titulo: 'Sin datos',
      explicacion: ['Ingresa HbA1c o glucosa en ayunas para clasificar.'],
    }
  }
  const titulo = { normal: 'Normal', prediabetes: 'Prediabetes', diabetes: 'Rango de diabetes' }[cat]
  const explicacion = [`${valores.join(', ')} → ${titulo.toLowerCase()} según criterios de la ADA.`]
  if (porHba1c && porGlucosa && porHba1c !== porGlucosa) explicacion.push('Las pruebas no coinciden: se toma la categoría más alta.')
  if (cat === 'diabetes') explicacion.push('Un solo valor no basta para diagnosticar: requiere confirmación médica con una segunda prueba.')
  return { organo: 'pancreas', nivel: NIVEL_GLUCEMICO[cat], titulo, explicacion, fuente: FUENTE_ADA }
}

function evaluarRinon(p: PatientData): ResultadoOrgano {
  const r = clasificarRinon(p.tfg, p.albuminuriaMgG)
  if (!r) {
    return {
      organo: 'rinones',
      nivel: 'sin_datos',
      titulo: 'Sin datos',
      explicacion: ['Ingresa la TFG y/o la albuminuria (cociente albúmina/creatinina) para clasificar.'],
    }
  }
  const explicacion: string[] = []
  if (p.tfg !== undefined) explicacion.push(`TFG ${fmt(p.tfg)} mL/min/1.73 m² → categoría ${nombreCategoria(r.tfg!)}.`)
  if (p.albuminuriaMgG !== undefined) explicacion.push(`Albuminuria ${fmt(p.albuminuriaMgG)} mg/g → categoría ${nombreCategoria(r.albuminuria!)}.`)
  if (r.completo) {
    explicacion.push(`Combinación ${r.etiqueta} en el mapa de riesgo de KDIGO.`)
  } else {
    explicacion.push(
      r.tfg
        ? 'Falta la albuminuria: el riesgo se estima solo con la TFG y podría ser mayor.'
        : 'Falta la TFG: el riesgo se estima solo con la albuminuria y podría ser mayor.',
    )
  }
  explicacion.push('Para diagnosticar enfermedad renal crónica, la alteración debe mantenerse más de 3 meses.')
  return { organo: 'rinones', nivel: r.nivel, titulo: r.etiqueta, explicacion, fuente: FUENTE_KDIGO }
}

function evaluarPorEtapaConocida(p: PatientData, disease: Disease, organo: string): ResultadoOrgano {
  const afectacion = disease.afectaciones.find((a) => a.organo === organo)
  const etapaId = p.etapasConocidas?.[organo]
  if (!afectacion || !etapaId) {
    return {
      organo,
      nivel: 'sin_datos',
      titulo: 'Sin datos',
      explicacion: ['Selecciona la etapa si la conoces por un estudio previo (por ejemplo, un examen de especialista).'],
    }
  }
  for (const escala of afectacion.escalas) {
    const etapa = escala.etapas.find((e) => e.id === etapaId)
    if (etapa) {
      const fuente = disease.fuentes.find((f) => f.id === escala.fuente)
      return {
        organo,
        nivel: etapa.nivel,
        titulo: etapa.nombre,
        explicacion: [`Etapa indicada por el usuario según un estudio previo (${escala.nombre}).`, etapa.descripcion],
        fuente: fuente ? `${fuente.autor}${fuente.anio ? `, ${fuente.anio}` : ''}` : undefined,
      }
    }
  }
  return { organo, nivel: 'sin_datos', titulo: 'Sin datos', explicacion: [`Etapa no reconocida: "${etapaId}".`] }
}

export function evaluar(p: PatientData, disease: Disease): Evaluacion {
  const organos: Record<string, ResultadoOrgano> = {}
  for (const a of disease.afectaciones) {
    if (a.organo === 'pancreas') organos.pancreas = evaluarPancreas(p)
    else if (a.organo === 'rinones') organos.rinones = evaluarRinon(p)
    else if (!CALCULADOS.has(a.organo)) organos[a.organo] = evaluarPorEtapaConocida(p, disease, a.organo)
  }
  // F3-15: FINDRISC solo para personas sin diagnóstico de diabetes.
  return p.tieneDiabetes
    ? { modo: 'complicaciones', organos }
    : { modo: 'prevencion', findrisc: calcularFindrisc(p), organos }
}

export function nivelesDe(e: Evaluacion | null): Record<string, Nivel> {
  if (!e) return {}
  return Object.fromEntries(Object.values(e.organos).map((r) => [r.organo, r.nivel]))
}
