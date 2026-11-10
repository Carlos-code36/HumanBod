// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import SimulationPanel from '../../src/components/SimulationPanel/SimulationPanel'
import { DIABETES_T2 } from '../../src/data/diseases'
import { evaluar } from '../../src/engine/evaluar'
import { useAppStore } from '../../src/store/useAppStore'
import { personas } from '../factories/patientFactory'

beforeAll(() => {
  // jsdom no tiene ResizeObserver (Recharts lo usa para medir el contenedor).
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
beforeEach(() => useAppStore.setState({ selectedOrganId: null, evaluacion: null, niveles: {} }))
afterEach(cleanup)

const valorDe = (dt: string) => {
  const dd = screen.getByText(dt).nextElementSibling as HTMLElement
  return Number(dd.textContent!.match(/\d+/)![0])
}
const deslizador = (nombre: RegExp) => screen.getByLabelText(nombre) as HTMLInputElement

describe('panel de simulación', () => {
  it('muestra el resumen de la persona sana al abrir, con el aviso educativo', () => {
    render(<SimulationPanel />)
    expect(screen.getByText(/no sirve para tomar decisiones de tratamiento/)).toBeTruthy()
    expect(valorDe('Pico de glucosa')).toBe(140)
    expect(valorDe('Glucosa a las 2 h')).toBeLessThan(140)
  })

  it('F4-03: bajar la sensibilidad a la insulina sube el pico', () => {
    render(<SimulationPanel />)
    const antes = valorDe('Pico de glucosa')
    fireEvent.change(deslizador(/Sensibilidad a la insulina/), { target: { value: '25' } })
    expect(valorDe('Pico de glucosa')).toBeGreaterThan(antes)
  })

  it('elegir el perfil de diabetes mueve los controles y empeora la curva', async () => {
    const user = userEvent.setup()
    render(<SimulationPanel />)
    await user.selectOptions(screen.getByLabelText('Perfil'), 'diabetes')
    expect(deslizador(/Sensibilidad a la insulina/).value).toBe('8') // 0.61 / 7.6 ≈ 8 %
    expect(deslizador(/Glucosa en ayunas/).value).toBe('150')
    expect(valorDe('Glucosa a las 2 h')).toBeGreaterThanOrEqual(200)
    expect(screen.getByText(/Perfil elegido \(diabetes tipo 2\)/)).toBeTruthy()
  })

  it('al mover un control, la leyenda indica que el perfil está ajustado', () => {
    render(<SimulationPanel />)
    fireEvent.change(deslizador(/Secreción de insulina/), { target: { value: '50' } })
    expect(screen.getByText(/persona sana, ajustado/)).toBeTruthy()
  })

  it('F4-06: los controles tienen límites', () => {
    render(<SimulationPanel />)
    const si = deslizador(/Sensibilidad a la insulina/)
    expect([si.min, si.max]).toEqual(['5', '200'])
    const carbos = deslizador(/Carbohidratos/)
    expect([carbos.min, carbos.max]).toEqual(['0', '150'])
  })

  it('F4-07: un día completo (24 h) se calcula y muestra la tabla cada 30 min', async () => {
    const user = userEvent.setup()
    render(<SimulationPanel />)
    await user.selectOptions(screen.getByLabelText('Comidas'), 'dia')
    await user.click(screen.getByText('Ver los datos en tabla'))
    const filas = within(screen.getByRole('table')).getAllByRole('row')
    expect(filas).toHaveLength(1 + 24 * 2 + 1) // encabezado + cada 30 min de 0 a 24 h
  })

  it('sugiere el perfil que corresponde al paciente evaluado', async () => {
    useAppStore.getState().setEvaluacion(evaluar(personas.diabetesControlada, DIABETES_T2))
    const user = userEvent.setup()
    render(<SimulationPanel />)
    await user.click(screen.getByRole('button', { name: /perfil que corresponde al paciente: diabetes tipo 2/ }))
    expect((screen.getByLabelText('Perfil') as HTMLSelectElement).value).toBe('diabetes')
    expect(screen.queryByRole('button', { name: /perfil que corresponde/ })).toBeNull()
  })
})
