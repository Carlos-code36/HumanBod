import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: boolean
}

/** Si el 3D falla por cualquier motivo, se muestra un aviso y la lista sigue funcionando. */
export default class ViewerBoundary extends Component<Props, State> {
  state: State = { error: false }

  static getDerivedStateFromError(): State {
    return { error: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Error en el visor 3D:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="viewer-fallback" role="alert">
          No se pudo mostrar el cuerpo en 3D. Puedes seguir usando la lista de órganos.
        </div>
      )
    }
    return this.props.children
  }
}
