import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  /** Nombre accesible de la ventana. */
  etiqueta: string
  children: ReactNode
}

/**
 * Ventana modal con <dialog> nativo: atrapa el foco, se cierra con Esc y devuelve el foco al botón que la abrió.
 * También se cierra con el botón ✕ o haciendo clic fuera del contenido.
 */
export default function Modal({ abierto, onCerrar, etiqueta, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={etiqueta}
      onClose={onCerrar}
      onClick={(e) => {
        // Clic en el fondo oscuro (fuera de la caja): el evento llega al propio <dialog>.
        if (e.target === ref.current) onCerrar()
      }}
    >
      <div className="modal-caja">
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label={`Cerrar ${etiqueta.toLowerCase()}`}>
          ✕
        </button>
        {children}
      </div>
    </dialog>
  )
}
