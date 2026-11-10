import { create } from 'zustand'
import { findOrgan } from '../data/organs'
import type { NivelAfectacion } from '../types/medical'

interface AppState {
  /** Órgano seleccionado (id de organs.json) o null. */
  selectedOrganId: string | null
  /** Nivel de afectación por id de órgano. Lo que no está aquí se considera "sin_datos". */
  niveles: Record<string, NivelAfectacion>
  selectOrgan: (id: string | null) => void
  setNiveles: (niveles: Record<string, NivelAfectacion>) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedOrganId: null,
  niveles: {},
  // Un id desconocido se ignora y deja la selección vacía (no rompe la app).
  selectOrgan: (id) => set({ selectedOrganId: findOrgan(id) ? id : null }),
  setNiveles: (niveles) => set({ niveles }),
}))
