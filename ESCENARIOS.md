# Escenarios de prueba y riesgos por fase

Complemento de [PLAN.md](PLAN.md). En cada fase se listan los **escenarios** que hay que probar (qué debe pasar), los **problemas que podrían ocurrir** y cómo prevenirlos.

**Tipos de prueba**
- 🧪 **Unitaria:** automática con Vitest; prueba una función aislada.
- 🔗 **Integración:** automática; prueba varias piezas juntas (por ejemplo, formulario → cálculo → color).
- 👁️ **Manual:** revisión a ojo en la app; lista para repasar antes de cerrar cada fase.

> ⚠️ Los umbrales clínicos de este documento sirven para **diseñar las pruebas**. Antes de usarlos en código hay que **confirmarlos con la publicación original** (ver PLAN.md, sección 9).

---

## Estado de los escenarios

Actualizado al cerrar la Fase 4. Las pruebas automáticas citan el ID del escenario en su nombre (buscar "F3-13" en `tests/`).

**Leyenda:** ✅ cubierto con prueba automática · 📸 verificado con capturas de pantalla · ⏳ pendiente de revisión manual del usuario · ⬜ fase no iniciada

| Fase | Escenario | Estado | Cómo se verificó |
|---|---|---|---|
| 0 | F0-01 `npm run dev` | ✅ | El servidor responde (comprobado por línea de comandos) |
| 0 | F0-02 `npm test` | ✅ | Se ejecuta en cada cierre de fase |
| 0 | F0-03 `npm run build` | ✅ | Se ejecuta en cada cierre de fase |
| 1 | F1-01 Cargar la app y ver el cuerpo | 📸 | Capturas a varios anchos |
| 1 | F1-02 Clic en un órgano | ✅ ⏳ | Lógica de selección probada; **el clic con mouse en el 3D falta probarlo a mano** |
| 1 | F1-03 Clic en el fondo / Esc | ✅ ⏳ | Lógica probada; **falta probarlo a mano** |
| 1 | F1-04 Órgano tapado por otro | ⏳ | Resuelto con la lista lateral; **falta probarlo a mano** |
| 1 | F1-05 Color por nivel | ✅ | `afectacion.test.ts` |
| 1 | F1-06 Nivel inválido → gris | ✅ | `afectacion.test.ts` |
| 1 | F1-07 Girar y zoom en los extremos | ⏳ | Límites de cámara configurados; **falta probarlo a mano** |
| 1 | F1-08 Ventana pequeña | 📸 ⏳ | Diseño a una columna verificado; el 3D en ventana angosta salió intermitente en capturas automáticas (ver problemas) |
| 2 | F2-01 a F2-04 Validación del JSON | ✅ | `disease.test.ts` |
| 2 | F2-05 Panel de órgano afectado | ✅ | `app.test.tsx` (interfaz) |
| 2 | F2-06 Órgano sin afectación | ✅ | `app.test.tsx` (interfaz) |
| 2 | F2-07 Texto largo en el panel | ⏳ | El panel tiene desplazamiento interno; **falta probarlo a mano** |
| 3 | F3-01 a F3-05 Formulario | ✅ | `formValues.test.ts`, `unidades.test.ts`, `app.test.tsx` |
| 3 | F3-10 a F3-15 FINDRISC | ✅ | `findrisc.test.ts`, `evaluar.test.ts` |
| 3 | F3-20 a F3-24 KDIGO | ✅ | `kidney.test.ts` |
| 3 | F3-30 a F3-32 Resultado general | ✅ | `evaluar.test.ts` |
| 4 | F4-01 a F4-07 Simulación | ✅ | `bergman.test.ts`, `simulation.test.tsx` |
| 5 | F5-01 a F5-07 Anatomía real | ⬜ | — |
| 6 | F6-01 a F6-06 Escritorio | ⬜ | — |

**Comprobación de que las pruebas detectan errores:** se introdujeron errores a propósito y las pruebas los detectaron. En FINDRISC, `<=` cambiado por `<` en el límite de IMC 30 (falló F3-13). En KDIGO, `>=` por `>` en TFG 60 (falló F3-20). En la simulación, Runge-Kutta 4 reemplazado por Euler (fallaron los 3 casos de F4-05).

### Problemas encontrados durante el desarrollo

| Fase | Problema | Cómo se resolvió |
|---|---|---|
| 0 | Vitest falla si la carpeta se abre como `c:\` (minúscula) | `scripts/vitest.mjs` (detalle en la tabla de la Fase 0) |
| 1 | Los pies del cuerpo salían cortados | Cámara más alejada y centrada más abajo |
| 1 | El canvas 3D ignoraba la altura del CSS (React Three Fiber pone `height: 100%` en línea) | Contenedor `.viewer-box` con altura fija |
| 1 | En capturas automáticas (Chrome sin ventana) el 3D a veces sale vacío | Problema de la herramienta de captura, no de la app: la misma captura repetida a veces sí lo muestra. Revisar a mano en F1-08 |
| 3 | Los campos de laboratorio con selector de unidad se salían del panel | Columnas más anchas y selector de unidad con ancho fijo |
| 3 | Concordancia: decía "Riesgo muy alta" | Etiquetas de FINDRISC en masculino ("Riesgo muy alto") |
| 3 | Las categorías salían "G3A" | Formato de la guía KDIGO: "G3a/A2" |
| 4 | Primera calibración irreal (pico de 190 mg/dL en persona sana) | Absorción y secreción recalibradas (ver PLAN.md, Fase 4) |
| 4 | El pico de glucosa tocaba el borde superior de la gráfica | Margen del ~15 % en el eje Y |

---

## Factories: datos de prueba reutilizables

En lugar de escribir un paciente completo en cada prueba, se usa una **factory**: una función que crea un paciente válido por defecto y permite cambiar solo lo que interesa.

```ts
// tests/factories/patientFactory.ts
import type { PatientData } from '../../src/types/medical';

export function createPatient(overrides: Partial<PatientData> = {}): PatientData {
  return {
    edad: 45,
    sexo: 'F',
    pesoKg: 70,
    tallaCm: 165,
    cinturaCm: 85,
    actividadFisica: true,
    frutasVerdurasDiario: true,
    medicacionPresion: false,
    glucosaAltaPrevia: false,
    antecedentesFamiliares: 'ninguno',
    tieneDiabetes: false,
    ...overrides,
  };
}
```

Uso en una prueba:
```ts
const p = createPatient({ edad: 67, pesoKg: 95 }); // solo cambia lo relevante
```

### Pacientes predefinidos (personas)
Se definen una sola vez y se reutilizan en pruebas, demos y revisión manual:

| Persona | Descripción | Resultado esperado |
|---|---|---|
| `sano` | Joven, IMC normal, activo | Riesgo bajo; todo verde |
| `prediabetes` | 55 años, IMC 31, sedentario, antecedentes familiares | FINDRISC alto; sin colores de complicación |
| `diabetesControlada` | HbA1c 6.8 %, TFG 95, albuminuria 10 | Riñón G1/A1 (verde) |
| `nefropatiaModerada` | TFG 50, albuminuria 120 | Riñón G3a/A2 (naranja) |
| `nefropatiaSevera` | TFG 12, albuminuria 500 | Riñón G5/A3 (rojo) |
| `datosIncompletos` | Diabetes sin análisis de laboratorio | Órganos en gris con "faltan datos" |
| `extremo` | Valores en los límites permitidos | Sin errores ni NaN |

Otras factories: `createOrgan()`, `createDisease()` y `createSimulationParams()`.

---

## Validación de datos con Zod (todas las fases)

Se agrega **Zod** al proyecto. Define "esquemas" que validan datos en tiempo de ejecución:
- Los **JSON de órganos y enfermedades** se validan al cargarse. Si alguien escribe mal un campo, la app lo avisa en vez de fallar en silencio.
- El **formulario** usa el mismo esquema: rangos permitidos, campos obligatorios y unidades.

Una sola fuente de verdad para los tipos (TypeScript) y para la validación.

---

## Fase 0 — Preparación

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F0-01 | `npm run dev` en proyecto recién creado | Abre en el navegador sin errores | 👁️ |
| F0-02 | `npm run test` sin pruebas propias | Vitest corre y termina en verde | 🧪 |
| F0-03 | `npm run build` | Genera `dist/` sin errores de TypeScript | 🔗 |

### Problemas posibles (Windows)
| Problema | Prevención |
|---|---|
| PowerShell bloquea `npm` ("la ejecución de scripts está deshabilitada") | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` o usar `npm.cmd` |
| Versión de Node antigua | Revisar `node -v` (18 o mayor) antes de empezar |
| Rutas con espacios o acentos | Mantener el proyecto en `c:\Development\new` |
| Dependencias incompatibles entre sí | Usar versiones fijas en `package.json` y guardar `package-lock.json` en git |
| Perder trabajo | git desde el primer día; un commit al cerrar cada tarea |
| ✅ **Ocurrió:** Vitest falla con "failed to find the current suite" si la carpeta se abre como `c:\` (minúscula) | Resuelto con `scripts/vitest.mjs`, que lanza Vitest con `C:\`. Usar siempre `npm test`, no `npx vitest` |

---

## Fase 1 — Cuerpo 3D básico

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F1-01 | Cargar la app | Se ve la silueta con todos los órganos | 👁️ |
| F1-02 | Clic en un órgano | Se resalta y aparece su nombre | 👁️ / 🔗 |
| F1-03 | Clic en el fondo vacío | Se quita la selección, sin errores | 👁️ |
| F1-04 | Clic en un órgano tapado por otro | Se selecciona el que está al frente; debe haber forma de llegar al de atrás (lista lateral) | 👁️ |
| F1-05 | Nivel de afectación de cada valor (`gris`→`rojo`) | El color corresponde al nivel | 🧪 |
| F1-06 | Nivel desconocido o inválido | Se muestra gris, no se rompe | 🧪 |
| F1-07 | Girar y hacer zoom al máximo y al mínimo | La cámara no atraviesa el modelo ni se pierde | 👁️ |
| F1-08 | Ventana pequeña o redimensionada | El canvas se ajusta | 👁️ |

### Problemas posibles
| Problema | Prevención |
|---|---|
| El navegador o la PC no soporta WebGL | Detectarlo y mostrar un mensaje más una lista de órganos sin 3D |
| Órgano del JSON sin pieza 3D (`mesh` inexistente) | Prueba que cruza `organs.json` con las piezas disponibles |
| Selección accesible solo con mouse | Lista lateral de órganos navegable con teclado |
| Colores difíciles de distinguir (daltonismo) | Además del color, mostrar texto o etiqueta del nivel |

---

## Fase 2 — Conocimiento de la enfermedad

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F2-01 | `diabetes_t2.json` pasa el esquema Zod | Válido | 🧪 |
| F2-02 | JSON con campo faltante o mal escrito | Zod lo rechaza con un mensaje claro | 🧪 |
| F2-03 | Cada `organo` referido en la enfermedad existe en `organs.json` | Sin referencias rotas | 🧪 |
| F2-04 | Cada complicación tiene al menos una fuente | Sin contenido sin citar | 🧪 |
| F2-05 | Seleccionar un órgano afectado | El panel muestra complicación, etapas y explicación | 🔗 |
| F2-06 | Seleccionar un órgano no afectado por la diabetes | El panel dice "sin afectación descrita" (no queda vacío) | 🔗 |
| F2-07 | Texto largo en el panel | Se desplaza; no rompe el diseño | 👁️ |

### Problemas posibles
| Problema | Prevención |
|---|---|
| Información médica incorrecta o desactualizada | Fuente y año en cada dato; revisión periódica |
| IDs inconsistentes (`riñon` vs `rinon`) | IDs sin acentos ni mayúsculas, validados por Zod |
| Mezclar texto de la interfaz con datos médicos | Datos solo en `data/`; la interfaz solo los lee |

---

## Fase 3 — Formulario y cálculo de afectación

### Escenarios: formulario
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F3-01 | Valores fuera de rango (edad -5, peso 0, talla 400) | Error visible en el campo; no se calcula | 🧪 / 👁️ |
| F3-02 | Campos vacíos opcionales | El cálculo sigue; esos órganos quedan en gris | 🔗 |
| F3-03 | Texto en campo numérico, coma decimal ("6,5") | Se acepta la coma o se avisa claramente | 🧪 |
| F3-04 | Unidades: glucosa mg/dL vs mmol/L, HbA1c % vs mmol/mol | Selector de unidad y conversión probada | 🧪 |
| F3-05 | Cambiar un dato | Los resultados y colores se actualizan al instante | 🔗 |

### Escenarios: FINDRISC (`findrisc.ts`)
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F3-10 | Persona `sano` | Puntaje bajo | 🧪 |
| F3-11 | Persona `prediabetes` | Puntaje alto | 🧪 |
| F3-12 | Puntaje mínimo y máximo posibles | 0 y 26 | 🧪 |
| F3-13 | **Valores en el límite** de cada categoría de edad, IMC y cintura | Cae en la categoría correcta (cuidado con `<` vs `<=`) | 🧪 |
| F3-14 | Cintura con umbral distinto según sexo | Aplica el umbral correcto | 🧪 |
| F3-15 | Persona que ya tiene diabetes | No se aplica FINDRISC; se usa el modo complicaciones | 🔗 |

### Escenarios: riñón KDIGO (`kidney.ts`)
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F3-20 | TFG 90, 60, 45, 30, 15 (límites exactos) | G1, G2, G3a, G3b, G4 (verificar con la guía) | 🧪 |
| F3-21 | TFG 89.9, 59.9, 44.9, 29.9, 14.9 | G2, G3a, G3b, G4, G5 | 🧪 |
| F3-22 | Albuminuria 29, 30, 300, 301 mg/g | A1, A2, A2, A3 (verificar el límite de 300) | 🧪 |
| F3-23 | TFG presente, sin albuminuria | Etapa G calculada; A "sin dato"; color según G | 🧪 |
| F3-24 | TFG negativa o absurda (> 200) | Rechazada por validación | 🧪 |

### Escenarios: resultado general
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F3-30 | Cada resultado muestra "por qué" y su fuente | Siempre visible | 🔗 |
| F3-31 | Mismos datos → mismo resultado | Determinista (sin aleatoriedad) | 🧪 |
| F3-32 | Todas las personas de la factory | Ninguna produce `NaN`, `undefined` ni errores | 🧪 |

### Problemas posibles
| Problema | Prevención |
|---|---|
| Error en un límite (`<` vs `<=`) | Pruebas de límites exactos (F3-13, F3-20 a F3-22) |
| Confusión de unidades | Unidad explícita en cada campo y en el tipo de dato |
| El usuario cree que es un diagnóstico | Aviso fijo junto a los resultados |
| Cálculo mezclado con la interfaz | Toda la lógica en `engine/` como funciones puras |

---

## Fase 4 — Simulación (modelo de Bergman)

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F4-01 | Sin comida, en equilibrio | La glucosa se mantiene en el valor basal | 🧪 |
| F4-02 | Comida en persona sana | La glucosa sube y vuelve cerca del basal | 🧪 |
| F4-03 | Comida con sensibilidad a la insulina baja | Pico más alto y retorno más lento que en sana | 🧪 |
| F4-04 | Ningún valor de la simulación es negativo, `NaN` o `Infinity` | Siempre válido | 🧪 |
| F4-05 | Reducir el paso de tiempo a la mitad | Resultado casi igual (el método es estable) | 🧪 |
| F4-06 | Parámetros extremos en los controles | Los controles limitan el rango; no se rompe | 🧪 / 👁️ |
| F4-07 | Simulación larga (24 h) | Responde rápido; la interfaz no se congela | 👁️ |

### Problemas posibles
| Problema | Prevención |
|---|---|
| Inestabilidad numérica (valores que explotan) | Runge-Kutta 4, paso pequeño y prueba F4-05 |
| Parámetros sin sentido fisiológico | Rangos tomados de la literatura y fijados en los controles |
| Se confunda con una predicción real | Etiquetarlo como "simulación educativa simplificada" |

---

## Fase 5 — Anatomía real (Blender → `.glb`)

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F5-01 | Cargar `body.glb` | Se ve completo, con orientación y escala correctas | 👁️ |
| F5-02 | Cada `mesh` de `organs.json` existe en el `.glb` | Prueba automática que lista las piezas | 🔗 |
| F5-03 | Peso del archivo | Por debajo del límite definido (por ejemplo, 15 MB) | 🔗 |
| F5-04 | Mientras carga | Indicador de carga; no pantalla en blanco | 👁️ |
| F5-05 | El archivo no carga (falta o está dañado) | Mensaje de error y vuelta a las figuras simples | 🔗 |
| F5-06 | Rendimiento en una PC modesta | Fluido (más de 30 fps) | 👁️ |
| F5-07 | Créditos de licencia visibles | Presentes en "Acerca de" | 👁️ |

### Problemas posibles
| Problema | Prevención |
|---|---|
| Nombres de piezas en Blender que no coinciden | Convención de nombres documentada y prueba F5-02 |
| Modelo muy pesado | Reducir polígonos (Decimate) y comprimir con Draco |
| Órganos internos tapados por piel o músculo | Capas que se pueden mostrar u ocultar |
| Incumplir la licencia CC BY-SA | Créditos y licencia en el repositorio y en la app |

---

## Fase 6 — Escritorio (Tauri) y pulido

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F6-01 | `npm run tauri build` | Genera el instalador `.msi` o `.exe` | 🔗 |
| F6-02 | Instalar en otra PC Windows limpia | Abre y funciona | 👁️ |
| F6-03 | Sin internet | Funciona completa (todo es local) | 👁️ |
| F6-04 | El modelo 3D carga dentro de la app de escritorio | Rutas correctas | 👁️ |
| F6-05 | Desinstalar | No deja restos importantes | 👁️ |
| F6-06 | Todas las pruebas automáticas | Verdes antes de generar el instalador | 🔗 |

### Problemas posibles
| Problema | Prevención |
|---|---|
| Falta Rust o las herramientas de compilación de C++ | Seguir los requisitos de Tauri para Windows antes de la fase |
| Falta WebView2 en la PC de destino | Configurar el instalador para incluirlo o descargarlo |
| Rutas de archivos distintas entre web y escritorio | Cargar recursos con rutas relativas; probar F6-04 |
| Windows SmartScreen advierte "app desconocida" | Normal sin firma digital; documentarlo |

---

## Reglas generales para evitar errores

1. **Nada se da por terminado sin pruebas en verde.**
2. **Cada cálculo médico tiene fuente, pruebas de límites y explicación visible.**
3. **La lógica médica no se mezcla con la interfaz.**
4. **Commit en git al cerrar cada tarea**, con mensaje claro.
5. **Al cerrar cada fase**, repasar sus escenarios manuales (👁️) como lista de verificación.
6. **Si aparece un error nuevo**, primero se escribe una prueba que lo reproduzca y después se corrige.
