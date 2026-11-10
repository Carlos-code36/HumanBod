# Plan de trabajo — Prototipo "Cuerpo Humano + Diabetes tipo 2"

> **Aviso:** proyecto **educativo**. No es una herramienta de diagnóstico ni sustituye la valoración de un profesional de la salud.

---

## 1. Objetivo

Construir una aplicación (web primero, escritorio después) que:

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
| Modelos 3D | Z-Anatomy / BodyParts3D → Blender → `.glb` | Gratis, licencia abierta (CC BY-SA: dar crédito) |
| Estilos | CSS Modules o Tailwind | Sencillo de mantener |
| Gráficas | Recharts | Curvas de glucosa e insulina, progresión |
| Estado | Zustand | Estado global simple (paciente, órgano seleccionado) |
| Validación | Zod | Valida los JSON médicos y el formulario (rangos, unidades, campos obligatorios) |
| Pruebas | Vitest + factories de datos | Verificar que los cálculos clínicos den lo esperado (ver [ESCENARIOS.md](ESCENARIOS.md)) |
| Escritorio (fase final) | Tauri | Empaqueta la app web como app ligera de Windows o Mac |

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
- [ ] Implementar el modelo mínimo de Bergman (método Runge-Kutta 4)
- [ ] Gráfica de glucosa e insulina en el tiempo
- [ ] Controles: sensibilidad a la insulina (persona sana vs. con diabetes), comida, medicación (simplificada)

**Entregable:** simulador educativo de glucosa.

### Fase 5 — Anatomía real
- [ ] Descargar Z-Anatomy o BodyParts3D
- [ ] En Blender: seleccionar órganos, reducir polígonos, nombrar piezas, exportar `.glb`
- [ ] Reemplazar las figuras simples por el modelo real
- [ ] Agregar los créditos de licencia en la app

**Entregable:** cuerpo anatómico real.

### Fase 6 — Escritorio y pulido
- [ ] Empaquetar con Tauri (requiere instalar Rust)
- [ ] Aviso legal y educativo visible
- [ ] Página "Fuentes y referencias"
- [ ] Revisión de contenido por alguien con formación médica (ideal)

**Entregable:** app de escritorio instalable.

---

## 7. Riesgos y cómo manejarlos

| Riesgo | Mitigación |
|---|---|
| Información médica incorrecta | Citar fuente en cada regla, pruebas automáticas, revisión por profesional |
| Se interprete como diagnóstico | Aviso visible, lenguaje de "estimación educativa" |
| Modelos 3D pesados o lentos | Reducir polígonos en Blender, cargar progresivamente |
| Licencias de modelos 3D | Respetar CC BY-SA: créditos y misma licencia para los modelos derivados |
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
- Z-Anatomy / BodyParts3D — modelos 3D y licencias
- Documentación: React Three Fiber, Three.js, Vite, Tauri
