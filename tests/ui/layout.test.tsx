// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { useAppStore } from '../../src/store/useAppStore'

beforeAll(() => {
  // jsdom no implementa showModal/close de <dialog> ni ResizeObserver (Recharts).
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal: () => void; close: () => void }
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  proto.close ??= function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  useAppStore.setState({ selectedOrganId: null, evaluacion: null, niveles: {}, pestana: 'paciente' })
})
afterEach(cleanup)

const tab = (nombre: string) => screen.getByRole('tab', { name: new RegExp(`^${nombre}`) })
const panelVisible = () => screen.getByRole('tabpanel')
const lista = () => within(screen.getByRole('navigation', { name: 'Órganos' }))

describe('diseño: 3D siempre visible, información en pestañas', () => {
  it('abre en la pestaña "Paciente" con el visor presente (sin WebGL en jsdom: aviso + lista)', () => {
    render(<App />)
    expect(tab('Paciente').getAttribute('aria-selected')).toBe('true')
    expect(within(panelVisible()).getByRole('form', { name: 'Datos del paciente' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Visor del cuerpo' })).toBeTruthy()
    expect(screen.getByText(/no soporta 3D/)).toBeTruthy()
  })

  it('solo se ve un panel a la vez, y las pestañas cambian con clic', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    await user.click(tab('Resultados'))
    expect(within(panelVisible()).getByRole('heading', { name: 'Resultados' })).toBeTruthy()
  })

  it('las flechas del teclado mueven entre pestañas', async () => {
    const user = userEvent.setup()
    render(<App />)
    tab('Paciente').focus()
    await user.keyboard('{ArrowRight}')
    expect(tab('Resultados').getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tab('Resultados'))
    await user.keyboard('{ArrowRight}') // vuelve al inicio
    expect(tab('Órgano').getAttribute('aria-selected')).toBe('true')
  })

  it('seleccionar un órgano en la lista abre la pestaña "Órgano"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(lista().getByRole('button', { name: /Riñones/ }))
    expect(tab('Órgano').getAttribute('aria-selected')).toBe('true')
    expect(within(panelVisible()).getByRole('heading', { name: 'Riñones' })).toBeTruthy()
  })

  it('el formulario conserva lo escrito al cambiar de pestaña', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Cargar paciente de ejemplo'), 'complicaciones')
    await user.click(lista().getByRole('button', { name: /Riñones/ }))
    await user.click(tab('Paciente'))
    expect((screen.getByLabelText(/^Edad/, { selector: 'input' }) as HTMLInputElement).value).toBe('63')
  })

  it('en Resultados, elegir un órgano lleva a su detalle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Cargar paciente de ejemplo'), 'complicaciones')
    await user.click(tab('Resultados'))
    await user.click(within(panelVisible()).getByRole('button', { name: /Riñones/ }))
    expect(within(panelVisible()).getByText(/Resultado con los datos ingresados: G3a\/A2/)).toBeTruthy()
  })
})

describe('ventanas modales', () => {
  it('"Fuentes y créditos" abre una ventana con todas las fuentes y se cierra con ✕', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Fuentes y créditos' }))
    const dialogo = screen.getByRole('dialog', { name: 'Fuentes y créditos' })
    expect(dialogo.hasAttribute('open')).toBe(true)
    for (const texto of [/Lindström/, /KDIGO 2024/, /Bergman RN/, /BodyParts3D, © The Database Center/, /no se envían/]) {
      expect(within(dialogo).getAllByText(texto).length).toBeGreaterThan(0)
    }
    await user.click(within(dialogo).getByRole('button', { name: /Cerrar/ }))
    expect(dialogo.hasAttribute('open')).toBe(false)
  })

  it('el enlace de créditos sobre el 3D abre la misma ventana', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /BodyParts3D © DBCLS/ }))
    expect(screen.getByRole('dialog', { name: 'Fuentes y créditos' }).hasAttribute('open')).toBe(true)
  })

  it('"Simulación" abre la simulación en una ventana', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Simulación' }))
    const dialogo = screen.getByRole('dialog', { name: 'Simulación' })
    expect(await within(dialogo).findByText(/Pico de glucosa/)).toBeTruthy()
  })

  it('con una ventana abierta, Esc no quita la selección del órgano', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(lista().getByRole('button', { name: /Riñones/ }))
    await user.click(screen.getByRole('button', { name: 'Fuentes y créditos' }))
    await user.keyboard('{Escape}')
    expect(useAppStore.getState().selectedOrganId).toBe('rinones')
  })

  it('sin ventanas abiertas, Esc quita la selección', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(lista().getByRole('button', { name: /Riñones/ }))
    await user.keyboard('{Escape}')
    expect(useAppStore.getState().selectedOrganId).toBeNull()
  })

  it('"?perfil=diabetes" abre la simulación directamente', async () => {
    window.history.replaceState(null, '', '/?perfil=diabetes')
    render(<App />)
    const dialogo = screen.getByRole('dialog', { name: 'Simulación' })
    expect(dialogo.hasAttribute('open')).toBe(true)
    expect(await within(dialogo).findByText(/Perfil elegido \(diabetes tipo 2\)/)).toBeTruthy()
  })
})
