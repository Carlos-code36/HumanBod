import { beforeEach, describe, expect, it } from 'vitest'
import { DIABETES_T2 } from '../../src/data/diseases'
import { evaluar } from '../../src/engine/evaluar'
import { useAppStore } from '../../src/store/useAppStore'
import { personas } from '../factories/patientFactory'

beforeEach(() => {
  useAppStore.setState({ selectedOrganId: null, evaluacion: null, niveles: {} })
})

describe('selección de órganos (F1-02, F1-03)', () => {
  it('selecciona un órgano existente', () => {
    useAppStore.getState().selectOrgan('rinones')
    expect(useAppStore.getState().selectedOrganId).toBe('rinones')
  })

  it('null quita la selección (clic en el fondo / Esc)', () => {
    useAppStore.getState().selectOrgan('rinones')
    useAppStore.getState().selectOrgan(null)
    expect(useAppStore.getState().selectedOrganId).toBeNull()
  })

  it('un id desconocido no rompe y deja la selección vacía', () => {
    useAppStore.getState().selectOrgan('rinones')
    useAppStore.getState().selectOrgan('bazo_inexistente')
    expect(useAppStore.getState().selectedOrganId).toBeNull()
  })

  it('setEvaluacion actualiza los niveles derivados (colores del cuerpo)', () => {
    useAppStore.getState().setEvaluacion(evaluar(personas.nefropatiaModerada, DIABETES_T2))
    expect(useAppStore.getState().niveles.rinones).toBe('moderada')
    useAppStore.getState().setEvaluacion(null)
    expect(useAppStore.getState().niveles).toEqual({})
  })
})
