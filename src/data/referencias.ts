import type { Fuente } from '../types/medical'

/** Fuentes de los cálculos y la simulación (las del contenido médico están en diabetes_t2.json). */
export const FUENTES_CALCULO: Fuente[] = [
  {
    id: 'findrisc',
    titulo: 'The Diabetes Risk Score: a practical tool to predict type 2 diabetes risk (FINDRISC)',
    autor: 'Lindström J, Tuomilehto J',
    anio: 2003,
    publicacion: 'Diabetes Care',
    nota: 'Riesgo de diabetes en 10 años. Los extremos de los rangos ("25–30", "94–102") se toman incluidos.',
  },
  {
    id: 'kdigo',
    titulo: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease',
    autor: 'Kidney Disease: Improving Global Outcomes (KDIGO)',
    anio: 2024,
    publicacion: 'Kidney International',
    nota: 'Categorías G1–G5 y A1–A3, y mapa de riesgo.',
  },
  {
    id: 'ada',
    titulo: 'Standards of Care in Diabetes',
    autor: 'American Diabetes Association (ADA)',
    publicacion: 'Diabetes Care, suplemento anual',
    nota: 'Categorías por HbA1c y glucosa en ayunas.',
  },
]

export const FUENTES_SIMULACION: Fuente[] = [
  {
    id: 'bergman_1979',
    titulo: 'Quantitative estimation of insulin sensitivity',
    autor: 'Bergman RN, Ider YZ, Bowden CR, Cobelli C',
    anio: 1979,
    publicacion: 'American Journal of Physiology',
    nota: 'Modelo mínimo de glucosa e insulina.',
  },
  {
    id: 'bergman_1989',
    titulo: 'Toward physiological understanding of glucose tolerance: minimal-model approach',
    autor: 'Bergman RN',
    anio: 1989,
    publicacion: 'Diabetes',
    nota: 'Valores de referencia de sensibilidad a la insulina y efectividad de la glucosa.',
  },
]

export const NOTA_SIMULACION =
  'La secreción de insulina y la absorción de la comida no provienen de la literatura: se calibraron para obtener curvas plausibles (persona sana: pico de ~140 mg/dL a los ~45 min con 60 g de carbohidratos).'

export const MODELO_3D = {
  credito: 'BodyParts3D, © The Database Center for Life Science',
  url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/',
  urlLicencia: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
  licencia:
    'La página oficial indica CC BY 4.0; los archivos descargados (versión 4.0) indican CC BY-SA 2.1 Japón. Se cumplen ambas: crédito y misma licencia para el modelo derivado.',
  modificaciones:
    'Piezas seleccionadas (piel, corazón, hígado, páncreas, riñones y ojos), cambio de ejes y unidades, y reducción de polígonos. Los nervios periféricos son un trazado esquemático propio: el modelo original no los incluye.',
}
