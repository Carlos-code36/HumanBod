import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../src/store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ selectedOrganId: null, niveles: {} })
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

  it('setNiveles reemplaza los niveles', () => {
    useAppStore.getState().setNiveles({ rinones: 'moderada' })
    expect(useAppStore.getState().niveles).toEqual({ rinones: 'moderada' })
    useAppStore.getState().setNiveles({})
    expect(useAppStore.getState().niveles).toEqual({})
  })
})
