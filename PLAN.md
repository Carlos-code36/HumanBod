# Plan de trabajo — Prototipo "Cuerpo Humano + Diabetes tipo 2"

> **Aviso:** proyecto **educativo**. No es una herramienta de diagnóstico ni sustituye la valoración de un profesional de la salud.

---

## 1. Objetivo

Construir una **aplicación web** que:

1. Muestre un **esquema 3D del cuerpo humano** con órganos seleccionables.
2. Permita estudiar **una enfermedad** (diabetes tipo 2): qué órganos afecta, cómo progresa y por qué.
3. **Estime la afectación** de cada órgano a partir de datos que ingresa el usuario, usando escalas y criterios clínicos **publicados y citados**.
4. Incluya una **simulación sencilla** de glucosa e insulina para entender la fisiología.

### Fuera de alcance (por ahora)
- Diagnóstico o recomendaciones médicas reales.
- Guardar datos reales de pacientes.
- Otras enfermedades (se agregarán cuando el modelo de datos esté probado).

---

## 2. Tecnologías

| Parte | Tecnología | Motivo |
|---|---|---|
| Lenguaje | TypeScript | Tipado: menos errores en datos médicos y cálculos |
| Interfaz | React + Vite | Estándar, rápido, mucha documentación |
| 3D | Three.js + React Three Fiber + Drei | Cuerpo 3D interactivo en el navegador |
| Modelos 3D | BodyParts3D → `scripts/build-anatomy.mjs` (gltf-transform + meshoptimizer, **sin Blender**) → `.glb` | Gratis, licencia abierta (dar crédito; ver `public/models/CREDITOS.md`) |
| Estilos | CSS Modules o Tailwind | Sencillo de mantener |
| Gráficas | Recharts | Curvas de glucosa e insulina, progresión |
| Estado | Zustand | Estado global simple (paciente, órgano seleccionado) |
| Validación | Zod | Valida los JSON médicos y el formulario (rangos, unidades, campos obligatorios) |
| Pruebas | Vitest + factories de datos | Verificar que los cálculos clínicos den lo esperado (ver [ESCENARIOS.md](ESCENARIOS.md)) |
| Publicación | Hosting estático (por definir: GitHub Pages, Netlify, Vercel o Cloudflare Pages) | La app es solo archivos estáticos: no necesita servidor propio |

---

## 3. Estructura del proyecto

```
new/
├── PLAN.md
├── public/
│   └── models/
│       └── body.glb              # Modelo 3D (fase 5; antes, figuras simples)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── BodyViewer/           # Escena 3D, órganos clicables, colores por afectación
│   │   ├── PatientForm/          # Formulario de datos del usuario
│   │   ├── OrganPanel/           # Detalle del órgano seleccionado
│   │   ├── RiskSummary/          # Resumen de riesgo y afectación
│   │   └── SimulationChart/      # Gráfica glucosa/insulina
│   ├── data/
│   │   ├── organs.json           # Catálogo de órganos (id, nombre, sistema)
│   │   └── diseases/
│   │       └── diabetes_t2.json  # Conocimiento de la enfermedad
│   ├── engine/
│   │   ├── findrisc.ts           # Escala de riesgo FINDRISC
│   │   ├── kidney.ts             # Estadificación renal (KDIGO)
│   │   ├── staging.ts            # Reglas generales de afectación por órgano
│   │   └── bergman.ts            # Modelo mínimo glucosa-insulina
│   ├── store/
│   │   └── usePatientStore.ts
│   └── types/
│       └── medical.ts            # Tipos: Organ, Disease, Stage, PatientData...
└── tests/
    ├── factories/                # Creadores de datos de prueba (pacientes, órganos...)
    └── engine/                   # Pruebas de cada cálculo
```

**Principio clave:** la **lógica médica** (`engine/` y `data/`) va separada de la **interfaz**. Así se puede probar, revisar y reemplazar sin tocar el 3D.

---

## 4. Modelo de datos

### 4.1 Órgano
```json
{ "id": "rinon", "nombre": "Riñones", "sistema": "urinario", "mesh": "kidney" }
```
`mesh` es el nombre de la pieza dentro del modelo 3D. Es lo que conecta los datos con lo que se ve.

### 4.2 Enfermedad
```json
{
  "id": "diabetes_t2",
  "nombre": "Diabetes mellitus tipo 2",
  "descripcion": "...",
  "fuentes": ["ADA Standards of Care", "KDIGO", "OMS"],
  "organos": [
    {
      "organo": "rinon",
      "complicacion": "Enfermedad renal diabética",
      "metodo": "kdigo",
      "etapas": ["G1", "G2", "G3a", "G3b", "G4", "G5"],
      "factores": ["tfg", "albuminuria"]
    },
    {
      "organo": "ojos",
      "complicacion": "Retinopatía diabética",
      "metodo": "ingreso_manual",
      "etapas": ["Sin retinopatía", "No proliferativa leve", "Moderada", "Severa", "Proliferativa"]
    }
  ]
}
```

### 4.3 Datos del usuario (paciente simulado)
Edad, sexo, peso, talla (→ IMC), cintura, actividad física, consumo de frutas y verduras, antecedentes familiares, medicación para la presión, HbA1c, glucosa en ayunas, años con diagnóstico, TFG (eGFR), albuminuria y presión arterial.

---

## 5. Motor de cálculo

Cada cálculo debe tener: **fuente citada**, **pruebas automáticas** y **explicación visible** para el usuario (por qué salió ese resultado).

| Módulo | Qué calcula | Para quién | Fuente |
|---|---|---|---|
| `findrisc.ts` | Riesgo de desarrollar diabetes en 10 años (puntaje 0–26) | Personas **sin** diagnóstico | Lindström & Tuomilehto, 2003 |
| `kidney.ts` | Etapa renal G1–G5 según TFG, y A1–A3 según albuminuria | Personas **con** diabetes | Guías KDIGO |
| `glucemia.ts` | Normal / prediabetes / diabetes por HbA1c y glucosa en ayunas | Todos | ADA |
| `evaluar.ts` | Une todo; ojos, nervios, corazón e hígado usan la etapa que indique el usuario | Todos | Escalas de diabetes_t2.json |
| `bergman.ts` | Curva de glucosa e insulina tras una comida (ecuaciones diferenciales) | Simulación educativa | Bergman et al., 1979 |

> ⚠️ Antes de programar cada módulo hay que **verificar umbrales y puntajes contra la publicación original**. No se debe copiar de memoria ni de fuentes secundarias.

### Verificación realizada (Fase 3, noviembre de 2026)
- **FINDRISC:** puntajes y categorías confirmados con varias fuentes secundarias coincidentes (no se pudo acceder al artículo original de *Diabetes Care* 2003).
  **Decisión:** el cuestionario no define los extremos de "25–30" ni "94–102"; se toman **incluidos** (IMC 30.0 → 1 punto, 30.1 → 3 puntos).
- **KDIGO:** categorías G y A confirmadas con resúmenes de la guía 2024; colores del mapa de calor confirmados con la figura KDIGO (versión 2012).
  **Pendiente:** confirmar que el mapa 2024 no cambió colores.
- **ADA (HbA1c y glucosa):** umbrales estándar (5.7 / 6.5 % y 100 / 126 mg/dL), sin verificación en línea adicional.

### Modos de uso
- **Modo prevención:** sin diagnóstico → FINDRISC → riesgo y órganos que podrían afectarse.
- **Modo complicaciones:** con diagnóstico → estadificación por órgano → colores en el cuerpo 3D.

### Colores de afectación
`gris` sin datos · `verde` normal · `amarillo` leve · `naranja` moderada · `rojo` severa

---

## 6. Fases y tareas

> Los escenarios de prueba y los problemas posibles de cada fase están en [ESCENARIOS.md](ESCENARIOS.md).

### Fase 0 — Preparación
- [x] Revisar Node.js (`node -v`, versión 18 o mayor)
- [x] Crear el proyecto con Vite (`react-ts`)
- [x] Instalar dependencias (three, @react-three/fiber, @react-three/drei, zustand, recharts, zod, vitest)
- [x] Crear `tests/factories/` con las personas de prueba
- [x] Inicializar git

### Fase 1 — Cuerpo 3D básico
- [x] Escena 3D con cámara orbital (girar y hacer zoom)
- [x] Silueta con **figuras simples** (esferas y cápsulas) como órganos: páncreas, riñones, ojos, corazón, nervios periféricos, hígado
- [x] Clic en un órgano → se resalta y muestra su nombre
- [x] Coloreado según el nivel de afectación
- [x] Lista lateral accesible con teclado, aviso si no hay WebGL, carga diferida del 3D

**Entregable:** cuerpo esquemático interactivo.

### Fase 2 — Conocimiento de la enfermedad
- [x] Definir esquemas Zod en `data/schemas.ts` (los tipos de `types/medical.ts` se generan de ahí)
- [x] Escribir `organs.json` y `diabetes_t2.json` con fuentes
- [x] Panel lateral: al seleccionar un órgano, mostrar complicación, etapas y explicación
- [ ] **Pendiente:** revisión del contenido médico por un profesional (hoy está marcado como borrador)

**Entregable:** explorador educativo de la diabetes en el cuerpo.

### Fase 3 — Formulario y cálculo de afectación
- [x] Formulario de datos con validación de rangos (Zod), coma decimal y selector de unidades
- [x] `findrisc.ts` con pruebas
- [x] `kidney.ts` (KDIGO, incluido el mapa de calor) con pruebas
- [x] `glucemia.ts` (categorías ADA por HbA1c y glucosa en ayunas) con pruebas
- [x] Ojos, nervios, corazón e hígado: etapa conocida por estudios previos (en `evaluar.ts`, no hizo falta `staging.ts` aparte)
- [x] Conectar resultados → colores del cuerpo + resumen de riesgo
- [x] Mostrar "por qué" de cada resultado y su fuente
- [x] Pacientes de ejemplo (`?ejemplo=<id>`) y pruebas de interfaz con Testing Library

**Entregable:** primera versión de "medir y predecir la afectación".

### Fase 4 — Simulación fisiológica
- [x] Implementar el modelo mínimo de Bergman (método Runge-Kutta 4), con absorción de la comida y secreción de insulina
- [x] Gráfica de glucosa e insulina en el tiempo (dos gráficas, sin doble eje; referencia sana discontinua; tabla de datos)
- [x] Controles: perfil (sana / resistencia / diabetes), sensibilidad a la insulina, secreción, glucosa en ayunas, carbohidratos, una comida o un día
- [x] Medicación: **decisión** — no se simulan medicamentos con efectos inventados; se explica que los tratamientos actúan sobre sensibilidad o secreción y el usuario mueve esos controles
- [x] Botón para usar el perfil que corresponde al paciente evaluado; `?perfil=<id>` en la dirección

**Verificación (noviembre de 2026):** SI y SG de referencia según Bergman, *Diabetes* 1989 (sana 7.6 × 10⁻⁴; obesidad 2.3 × 10⁻⁴; diabetes tipo 2 0.61 × 10⁻⁴; SG 0.026 → 0.014 en diabetes). La secreción (β) y la absorción (kabs) **no vienen de la literatura**: se calibraron para que la persona sana tenga un pico de ~140 mg/dL a los ~45 min y ~100 mg/dL a las 2 h con 60 g de carbohidratos.

**Entregable:** simulador educativo de glucosa.

### Fase 5 — Anatomía real
- [x] Descargar BodyParts3D 4.0 (árbol PART-OF, 62 MB; no se guarda en el repositorio)
- [x] **Sin Blender:** `scripts/build-anatomy.mjs` selecciona órganos por concepto FMA, cambia ejes y unidades, reduce polígonos y exporta `public/models/body.glb` (1.9 MB)
- [x] Nervios periféricos **esquemáticos** (BodyParts3D no incluye nervios de brazos y piernas): tubos que siguen húmero–radio y fémur–tibia, con aviso en el panel
- [x] Reemplazar las figuras simples por el modelo real; las figuras quedan como respaldo si el modelo no carga
- [x] Piel translúcida con opción "Mostrar piel"; indicador de carga con porcentaje
- [x] Agregar los créditos de licencia en la app (pie de página) y en `public/models/CREDITOS.md`

**Licencia (verificada en noviembre de 2026):** la página oficial indica **CC BY 4.0**, pero los archivos OBJ llevan en su encabezado **CC BY-SA 2.1 Japón**. Se cumplen ambas: crédito y misma licencia para el modelo derivado (solo el modelo, no el código).

**Para regenerar el modelo:** descargar `partof_BP3D_4.0_obj_99.zip` y `partof_element_parts.txt` (enlaces en el encabezado del script) y ejecutar
`node scripts/build-anatomy.mjs <carpeta-obj> <partof_element_parts.txt>`.

**Entregable:** cuerpo anatómico real.

### Fase 5b — Órganos detallados con Blender

> **Pedido del usuario (11 de noviembre de 2026):** los modelos 3D se veían muy básicos; ya tiene Blender instalado (5.3). Se empieza por el corazón y se revisa antes de seguir con los demás órganos.

- [x] **Corazón** — `scripts/blender/build-heart.py` (Blender sin ventana) → `public/models/heart.glb` (1.5 MB):
  - BodyParts3D trae las **cavidades** de los ventrículos (la sangre), no la pared: la superficie externa se reconstruye con la envolvente de las cavidades y de las coronarias (que corren sobre la pared), se une con las aurículas y se fusiona con remallado por vóxeles
  - Grandes vasos recortados cerca del corazón: aorta, tronco y arterias pulmonares, venas cavas, venas pulmonares
  - Arterias y venas coronarias; grasa epicárdica en los surcos por donde corren
  - Textura de color y mapa de normales horneados (relieve fino del músculo) sobre una malla liviana de 14 000 triángulos
  - Materiales propios: arterias en rojo y venas en azul (convención de los atlas); arteria pulmonar azul y venas pulmonares rojas
- [x] Visor: el modelo detallado reemplaza la pieza simple de `body.glb` y conserva sus colores; el **nivel de afectación se muestra como un brillo en el borde** del órgano con el color del nivel. Si `heart.glb` no carga, se usa la pieza simple
- [x] La cámara se centra y se acerca al órgano elegido (antes, al acercarse, el corazón quedaba fuera de la vista)
- [x] Revisión del corazón por el usuario (aprobado y con commit el 11 de noviembre de 2026)
- [x] Código común en `scripts/blender/comun.py` (lectura de BodyParts3D, transformación, horneado, exportación, vista previa); cada órgano tiene su propio `build-<órgano>.py`
- [x] **Hígado** — `scripts/blender/build-liver.py` → `public/models/liver.glb` (1.0 MB):
  - Parénquima: los 8 segmentos de BodyParts3D (II a VIII y lóbulo caudado) fusionados en una sola superficie (sin costuras)
  - Vesícula biliar, conductos biliares (hepáticos, hepático común, cístico), vena porta, arteria hepática y vena cava inferior detrás del hígado. Los vasos internos no se incluyen (no se verían)
  - Textura con lobulillos apenas visibles y manchas suaves; cápsula algo brillante
- [x] Etiqueta del órgano sobre su centro (antes iba encima y la del hígado caía sobre el corazón); la cámara apunta al centro y se aleja más para órganos grandes (los nervios se ven completos)
- [x] Revisión del hígado por el usuario (aprobado el 11 de noviembre de 2026)
- [x] **Páncreas** — `scripts/blender/build-pancreas.py` → `public/models/pancreas.glb` (1.0 MB):
  - Parénquima (cabeza, cuerpo y cola) con textura lobulada (lóbulos de ~4 mm con surcos suaves)
  - Contexto como en los atlas: duodeno (la "C" alrededor de la cabeza), arteria esplénica (cortada al final de la cola, porque el modelo no tiene bazo), tronco celíaco, arteria mesentérica superior, aorta abdominal y vena porta
- [x] Revisión del páncreas por el usuario (aprobado el 11 de noviembre de 2026)
- [ ] Riñones y ojos con el mismo proceso
- [ ] Nervios: hoy son esquemáticos; un trazado más realista requiere otra fuente de datos

**Para regenerar el corazón o el hígado** (mismos archivos de BodyParts3D que la Fase 5; cambiar `build-heart.py` por `build-liver.py` o `build-pancreas.py`):
`"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" -b --factory-startup -P scripts/blender/build-heart.py -- <carpeta-obj> <partof_element_parts.txt> [--preview <carpeta>]`
(`--preview` guarda imágenes renderizadas de frente, de lado, de atrás y de cerca). Tarda unos 45 s.

### Fase 6 — Web: publicación y pulido

> **Decisión (10 de noviembre de 2026):** se descarta la versión de escritorio (Tauri). La aplicación será **solo web**.

- [x] Aviso legal y educativo visible (encabezado de la página, desde la Fase 0)
- [x] **Rediseño de la interfaz** (pedido del usuario: al hacer scroll se perdía el 3D): el 3D ocupa la pantalla y nunca se pierde; la página no hace scroll; la información va en un panel lateral con pestañas (Órgano, Paciente, Resultados) con su propio scroll; la lista de órganos flota sobre el 3D; Simulación y Fuentes se abren en ventanas modales. En celular: 3D arriba, pestañas abajo, lista de órganos como fila de chips y ventanas a pantalla completa
- [x] Sección "Fuentes y referencias" con todas las fuentes (enfermedad, FINDRISC, KDIGO, ADA, Bergman, BodyParts3D), en la ventana "Fuentes y créditos"
- [ ] Metadatos web: título, descripción, idioma, ícono propio y vista previa al compartir el enlace
- [ ] Uso en celular: tocar órganos, girar con un dedo, pellizcar para hacer zoom, formulario cómodo
- [ ] Compatibilidad: Chrome, Edge, Firefox y Safari
- [ ] Rendimiento y accesibilidad medidos con Lighthouse
- [ ] Privacidad: confirmar y explicar que los datos del formulario no salen del navegador (texto ya incluido en "Fuentes y créditos"; falta la prueba F6-07)
- [ ] Publicar en un hosting estático (**requiere elegir el servicio y tu cuenta**)
- [ ] Revisión de contenido por alguien con formación médica (ideal)

**Entregable:** sitio web público, usable en computadora y celular.

---

## 7. Riesgos y cómo manejarlos

| Riesgo | Mitigación |
|---|---|
| Información médica incorrecta | Citar fuente en cada regla, pruebas automáticas, revisión por profesional |
| Se interprete como diagnóstico | Aviso visible, lenguaje de "estimación educativa" |
| Modelos 3D pesados o lentos | Reducir polígonos con meshoptimizer (1.9 MB en total), carga diferida con indicador |
| Licencias de modelos 3D | Créditos visibles en la app y en `CREDITOS.md`; misma licencia para el modelo derivado |
| Alcance que crece demasiado | Una enfermedad hasta terminar la fase 4; recién después, agregar otras |

---

## 8. Siguientes enfermedades (después del prototipo)
El modelo de datos está pensado para reutilizarse:
- Hipertensión arterial (corazón, riñón, cerebro, ojos)
- Enfermedad renal crónica (ya se tendría KDIGO)
- Enfermedad cardiovascular (escalas de riesgo como SCORE2 o Framingham)

---

## 9. Referencias a consultar
- American Diabetes Association — *Standards of Care in Diabetes* (edición vigente)
- KDIGO — *Clinical Practice Guideline for Diabetes Management in CKD* y clasificación de ERC
- Lindström J, Tuomilehto J. *The Diabetes Risk Score* (FINDRISC). Diabetes Care, 2003
- Bergman RN et al. *Quantitative estimation of insulin sensitivity*. Am J Physiol, 1979
- BodyParts3D — https://dbarchive.biosciencedbc.jp/en/bodyparts3d/ (licencia: /en/bodyparts3d/lic.html)
- Documentación: React Three Fiber, Three.js, Vite
