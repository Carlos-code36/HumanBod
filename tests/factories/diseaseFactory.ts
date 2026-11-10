import type { Afectacion, Disease, Organ } from '../../src/types/medical'

export function createOrgan(overrides: Partial<Organ> = {}): Organ {
  return { id: 'organo_prueba', nombre: 'Órgano de prueba', sistema: 'prueba', mesh: 'test_mesh', ...overrides }
}

export function createAfectacion(overrides: Partial<Afectacion> = {}): Afectacion {
  return {
    organo: 'rinones',
    complicacion: 'Complicación de prueba',
    mecanismo: 'Mecanismo de prueba.',
    escalas: [
      {
        id: 'escala_prueba',
        nombre: 'Escala de prueba',
        fuente: 'fuente_prueba',
        etapas: [
          { id: 'e1', nombre: 'Etapa 1', descripcion: 'Sin daño.', nivel: 'normal' },
          { id: 'e2', nombre: 'Etapa 2', descripcion: 'Daño severo.', nivel: 'severa' },
        ],
      },
    ],
    deteccion: ['Prueba anual.'],
    fuentes: ['fuente_prueba'],
    ...overrides,
  }
}

/** Enfermedad mínima válida. Cada llamada devuelve un objeto nuevo. */
export function createDisease(overrides: Partial<Disease> = {}): Disease {
  return {
    id: 'enfermedad_prueba',
    nombre: 'Enfermedad de prueba',
    descripcion: 'Descripción de prueba.',
    estadoRevision: 'borrador',
    fuentes: [{ id: 'fuente_prueba', titulo: 'Título', autor: 'Autor', anio: 2024 }],
    afectaciones: [createAfectacion()],
    ...overrides,
  }
}
