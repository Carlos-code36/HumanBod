import { create } from 'zustand'
import { findOrgan } from '../data/organs'
import { nivelesDe, type Evaluacion } from '../engine/evaluar'
import type { NivelAfectacion } from '../types/medical'

interface AppState {
  /** Órgano seleccionado (id de organs.json) o null. */
  selectedOrganId: string | null
  /** Resultado del cálculo con los datos del formulario; null si el formulario no es válido. */
  evaluacion: Evaluacion | null
  /** Nivel de afectación por id de órgano (derivado de la evaluación). Lo que falta es "sin_datos". */
  niveles: Record<string, NivelAfectacion>
  selectOrgan: (id: string | null) => void
  setEvaluacion: (e: Evaluacion | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedOrganId: null,
  evaluacion: null,
  niveles: {},
  // Un id desconocido se ignora y deja la selección vacía (no rompe la app).
  selectOrgan: (id) => set({ selectedOrganId: findOrgan(id) ? id : null }),
  setEvaluacion: (evaluacion) => set({ evaluacion, niveles: nivelesDe(evaluacion) }),
}))
