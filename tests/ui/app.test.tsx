// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import OrganList from '../../src/components/OrganList/OrganList'
import OrganPanel from '../../src/components/OrganPanel/OrganPanel'
import PatientForm from '../../src/components/PatientForm/PatientForm'
import ResultsSummary from '../../src/components/ResultsSummary/ResultsSummary'
import { DIABETES_T2 } from '../../src/data/diseases'
import { useAppStore } from '../../src/store/useAppStore'
import { createDisease } from '../factories/diseaseFactory'

/** Monta la interfaz sin el visor 3D (jsdom no tiene WebGL). */
function montar(disease = DIABETES_T2) {
  const user = userEvent.setup()
  render(
    <>
      <PatientForm disease={disease} />
      <ResultsSummary />
      <OrganList />
      <OrganPanel disease={disease} />
    </>,
  )
  return user
}

const campo = (nombre: RegExp) => screen.getByLabelText(nombre, { selector: 'input' })
const resultados = () => screen.getByRole('region', { name: 'Resultados' })
const detalle = () => screen.getByRole('region', { name: 'Detalle' })
const badgeDe = (organo: string) =>
  within(screen.getByRole('navigation', { name: 'Órganos' })).getByRole('button', { name: new RegExp(organo) })

async function llenarMinimo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(campo(/^Edad/), '50')
  await user.type(campo(/^Peso/), '70')
  await user.type(campo(/^Talla/), '170')
  await user.type(campo(/^Cintura/), '78')
}

beforeEach(() => {
  useAppStore.setState({ selectedOrganId: null, evaluacion: null, niveles: {} })
})
afterEach(cleanup)

describe('formulario y resultados', () => {
  it('al abrir: sin errores visibles y resultados pendientes', () => {
    montar()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(within(resultados()).getByText(/Completa los datos del paciente/)).toBeTruthy()
  })

  it('con los datos mínimos aparece el FINDRISC', async () => {
    const user = montar()
    await llenarMinimo(user)
    // 50 años → 2 puntos; IMC 24.2, cintura 78 mujer, hábitos por defecto → 0
    expect(within(resultados()).getByText(/Riesgo de desarrollar diabetes/)).toBeTruthy()
    expect(within(resultados()).getByText('2')).toBeTruthy()
  })

  it('F3-05: cambiar un dato actualiza el resultado y el color al instante', async () => {
    const user = montar()
    await llenarMinimo(user)
    await user.type(campo(/^TFG/), '50')
    expect(within(badgeDe('Riñones')).getByText('Leve')).toBeTruthy()
    await user.type(campo(/^Albuminuria/), '120')
    expect(within(badgeDe('Riñones')).getByText('Moderada')).toBeTruthy()
    await user.clear(campo(/^TFG/))
    await user.type(campo(/^TFG/), '95')
    expect(within(badgeDe('Riñones')).getByText('Leve')).toBeTruthy()
  })

  it('F3-01: valor fuera de rango → error visible, campo inválido y sin resultados', async () => {
    const user = montar()
    await llenarMinimo(user)
    await user.type(campo(/^TFG/), '250')
    expect(screen.getByRole('alert').textContent).toContain('como máximo 200')
    expect(campo(/^TFG/).getAttribute('aria-invalid')).toBe('true')
    expect(within(resultados()).getByText(/Completa los datos del paciente/)).toBeTruthy()
  })

  it('un campo obligatorio vacío muestra "Obligatorio" solo después de tocarlo', async () => {
    const user = montar()
    expect(screen.queryByText('Obligatorio')).toBeNull()
    await user.click(campo(/^Edad/))
    await user.tab()
    expect(screen.getByText('Obligatorio')).toBeTruthy()
  })

  it('F3-15: con diabetes no se muestra el FINDRISC', async () => {
    const user = montar()
    await llenarMinimo(user)
    await user.click(screen.getByLabelText(/Tiene diagnóstico de diabetes/))
    expect(within(resultados()).queryByText(/Riesgo de desarrollar diabetes/)).toBeNull()
    expect(within(resultados()).getByText(/no se calcula el riesgo FINDRISC/)).toBeTruthy()
  })

  it('cargar un ejemplo llena el formulario y calcula', async () => {
    const user = montar()
    await user.selectOptions(screen.getByLabelText('Cargar paciente de ejemplo'), 'complicaciones')
    expect((campo(/^Edad/) as HTMLInputElement).value).toBe('63')
    expect(within(badgeDe('Riñones')).getByText('Moderada')).toBeTruthy()
    expect(within(badgeDe('Ojos')).getByText('Moderada')).toBeTruthy()
  })
})

describe('panel de detalle', () => {
  it('F2-05 / F3-30: órgano afectado muestra complicación, resultado, explicación y fuente', async () => {
    const user = montar()
    await user.selectOptions(screen.getByLabelText('Cargar paciente de ejemplo'), 'complicaciones')
    await user.click(badgeDe('Riñones'))
    const panel = detalle()
    expect(within(panel).getByText('Enfermedad renal crónica por diabetes')).toBeTruthy()
    expect(within(panel).getByText(/Resultado con los datos ingresados: G3a\/A2/)).toBeTruthy()
    expect(within(panel).getByText(/mapa de riesgo de KDIGO/)).toBeTruthy()
    expect(within(panel).getByText(/Fuente: KDIGO 2024/)).toBeTruthy()
  })

  it('F2-06: órgano sin afectación descrita → mensaje, no panel vacío', async () => {
    const soloRinon = createDisease() // solo describe "rinones"
    const user = montar(soloRinon)
    await user.click(badgeDe('Ojos'))
    expect(within(detalle()).getByText(/No hay afectación descrita/)).toBeTruthy()
  })

  it('sin selección muestra el resumen de la enfermedad y el aviso de borrador', () => {
    montar()
    expect(within(detalle()).getByText('Diabetes mellitus tipo 2')).toBeTruthy()
    expect(within(detalle()).getByText(/borrador/)).toBeTruthy()
  })
})
