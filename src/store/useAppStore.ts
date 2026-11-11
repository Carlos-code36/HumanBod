import { create } from 'zustand'
import { findOrgan } from '../data/organs'
import { nivelesDe, type Evaluacion } from '../engine/evaluar'
import type { NivelAfectacion } from '../types/medical'

/** Pestañas del panel lateral. */
export type Pestana = 'organo' | 'paciente' | 'resultados'

interface AppState {
  /** Órgano seleccionado (id de organs.json) o null. */
  selectedOrganId: string | null
  /** Resultado del cálculo con los datos del formulario; null si el formulario no es válido. */
  evaluacion: Evaluacion | null
  /** Nivel de afectación por id de órgano (derivado de la evaluación). Lo que falta es "sin_datos". */
  niveles: Record<string, NivelAfectacion>
  /** Pestaña visible del panel lateral. */
  pestana: Pestana
  /** Selecciona un órgano y muestra su pestaña. null quita la selección sin cambiar de pestaña. */
  selectOrgan: (id: string | null) => void
  setEvaluacion: (e: Evaluacion | null) => void
  setPestana: (p: Pestana) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedOrganId: null,
  evaluacion: null,
  niveles: {},
  pestana: 'paciente',
  // Un id desconocido se ignora y deja la selección vacía (no rompe la app).
  selectOrgan: (id) => {
    const valido = findOrgan(id) ? id : null
    set(valido ? { selectedOrganId: valido, pestana: 'organo' } : { selectedOrganId: null })
  },
  setEvaluacion: (evaluacion) => set({ evaluacion, niveles: nivelesDe(evaluacion) }),
  setPestana: (pestana) => set({ pestana }),
}))
