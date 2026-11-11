# Escenarios de prueba y riesgos por fase

Complemento de [PLAN.md](PLAN.md). En cada fase se listan los **escenarios** que hay que probar (qué debe pasar), los **problemas que podrían ocurrir** y cómo prevenirlos.

**Tipos de prueba**
- 🧪 **Unitaria:** automática con Vitest; prueba una función aislada.
- 🔗 **Integración:** automática; prueba varias piezas juntas (por ejemplo, formulario → cálculo → color).
- 👁️ **Manual:** revisión a ojo en la app; lista para repasar antes de cerrar cada fase.

> ⚠️ Los umbrales clínicos de este documento sirven para **diseñar las pruebas**. Antes de usarlos en código hay que **confirmarlos con la publicación original** (ver PLAN.md, sección 9).

---

## Estado de los escenarios

Actualizado tras el rediseño de la interfaz (Fase 6, en curso). Las pruebas automáticas citan el ID del escenario en su nombre (buscar "F3-13" en `tests/`).

**Leyenda:** ✅ cubierto con prueba automática · 🖱️ verificado en Chrome real con interacción automatizada (puppeteer: clics, teclado, rueda, arrastre) · 📸 verificado con capturas de pantalla · ⏳ pendiente de revisión manual del usuario · ⬜ fase no iniciada

| Fase | Escenario | Estado | Cómo se verificó |
|---|---|---|---|
| 0 | F0-01 `npm run dev` | ✅ | El servidor responde (comprobado por línea de comandos) |
| 0 | F0-02 `npm test` | ✅ | Se ejecuta en cada cierre de fase |
| 0 | F0-03 `npm run build` | ✅ | Se ejecuta en cada cierre de fase |
| 1 | F1-01 Cargar la app y ver el cuerpo | 📸 | Capturas a varios anchos |
| 1 | F1-02 Clic en un órgano | ✅ 🖱️ | Clic en el modelo real: selecciona el órgano y muestra su etiqueta |
| 1 | F1-03 Clic en el fondo / Esc | ✅ 🖱️ | Clic en el fondo y tecla Esc quitan la selección |
| 1 | F1-04 Órgano tapado por otro | ⏳ | Resuelto con la lista lateral y la opción "Mostrar piel"; **falta probarlo a mano** |
| 1 | F1-05 Color por nivel | ✅ | `afectacion.test.ts` |
| 1 | F1-06 Nivel inválido → gris | ✅ | `afectacion.test.ts` |
| 1 | F1-07 Girar y zoom en los extremos | 🖱️ | Rueda al máximo y al mínimo, y arrastre para girar: la cámara no atraviesa el cuerpo y el zoom apunta a los órganos |
| 1 | F1-08 Ventana pequeña | 🖱️ | A 600 px de ancho el modelo se ve completo (la intermitencia anterior era de la herramienta de captura) |
| 2 | F2-01 a F2-04 Validación del JSON | ✅ | `disease.test.ts` |
| 2 | F2-05 Panel de órgano afectado | ✅ | `app.test.tsx` (interfaz) |
| 2 | F2-06 Órgano sin afectación | ✅ | `app.test.tsx` (interfaz) |
| 2 | F2-07 Texto largo en el panel | ⏳ | El panel tiene desplazamiento interno; **falta probarlo a mano** |
| 3 | F3-01 a F3-05 Formulario | ✅ | `formValues.test.ts`, `unidades.test.ts`, `app.test.tsx` |
| 3 | F3-10 a F3-15 FINDRISC | ✅ | `findrisc.test.ts`, `evaluar.test.ts` |
| 3 | F3-20 a F3-24 KDIGO | ✅ | `kidney.test.ts` |
| 3 | F3-30 a F3-32 Resultado general | ✅ | `evaluar.test.ts` |
| 4 | F4-01 a F4-07 Simulación | ✅ | `bergman.test.ts`, `simulation.test.tsx` |
| 5 | F5-01 Cargar `body.glb` | 🖱️ ✅ | Se ve completo; pruebas de orientación anatómica (corazón a la izquierda del paciente, hígado a la derecha, riñones detrás) en `modelo3d.test.ts` |
| 5 | F5-02 Cada pieza de `organs.json` existe en el `.glb` | ✅ | `modelo3d.test.ts` |
| 5 | F5-03 Peso del archivo | ✅ | 1.9 MB (límite 15 MB) |
| 5 | F5-04 Indicador mientras carga | 🖱️ | "Cargando modelo anatómico… N %" |
| 5 | F5-05 El modelo no carga | 🖱️ | Archivo ocultado a propósito: aparece el cuerpo esquemático con los colores del paciente, sin bloquear la app |
| 5 | F5-06 Rendimiento en una PC modesta | ⏳ | Solo probado con gráficos por software; **falta probarlo en tu PC** |
| 5 | F5-07 Créditos de licencia visibles | 📸 | Pie de página y `public/models/CREDITOS.md` |
| 5b | F5-08 Corazón detallado en su sitio | ✅ 🖱️ | `corazon3d.test.ts`: mismo centro que el corazón de `body.glb` (±1,5 cm), tamaño adulto, a la izquierda del paciente; visto en Chrome dentro del cuerpo, con y sin piel |
| 5b | F5-09 Piezas y materiales del corazón | ✅ | `corazon3d.test.ts`: 7 piezas, miocardio con textura y mapa de normales, arterias rojas y venas azules |
| 5b | F5-10 Nivel de afectación visible en el corazón detallado | 🖱️ | Paciente de ejemplo: borde amarillo con "Leve", sin tapar el tejido; gris tenue con "Sin datos" |
| 5b | F5-11 `heart.glb` no carga | 🖱️ | Petición bloqueada a propósito: se ve el corazón simple de `body.glb`, la app sigue funcionando |
| 5b | F5-12 La cámara enfoca el órgano elegido | 🖱️ | Al elegir "Corazón" la cámara se centra y se acerca; arrastrar cancela el movimiento |
| 5b | F5-13 Revisión visual del corazón | ⏳ | **Falta tu revisión** |
| 6 | F6-01 a F6-08 Web: publicación y pulido | ⬜ | Pendientes |
| 6 | F6-09 El 3D no se pierde al leer información | ✅ 🖱️ | Escritorio (1440×900) y celular (390×844): la página no hace scroll y el 3D queda fijo al desplazar el panel |
| 6 | F6-10 Pestañas | ✅ | Clic y flechas del teclado; un solo panel visible (`layout.test.tsx`) |
| 6 | F6-11 Elegir un órgano abre su pestaña | ✅ 🖱️ | Desde la lista, desde Resultados y tocando el 3D en celular |
| 6 | F6-12 El formulario no pierde datos al cambiar de pestaña | ✅ | `layout.test.tsx` |
| 6 | F6-13 Ventanas modales | ✅ 🖱️ | Abren y cierran con ✕, clic fuera y Esc; con una ventana abierta, Esc no quita la selección del órgano |

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
| 5 | No hay Blender | Conversión propia con `gltf-transform` + `meshoptimizer` (`scripts/build-anatomy.mjs`) |
| 5 | BodyParts3D no incluye nervios de brazos y piernas | Nervios esquemáticos trazados con los huesos, con aviso en el panel y en los créditos |
| 5 | Licencia distinta en la web (CC BY 4.0) y en los archivos (CC BY-SA 2.1 JP) | Se cumplen ambas (ver `CREDITOS.md`) |
| 5 | Ids de archivo con sufijo "M" (`FJ1656M`) rechazados por la validación | Formato permitido `FJ1234` o `FJ1234M` |
| 5 | "Maximum call stack size exceeded" al unir mallas grandes | Copiar con bucles en vez de `push(...arr)` |
| 5 | Las pruebas usan módulos de Node y la app no tiene esos tipos | `tsconfig.test.json` separado: la app sigue sin acceso a Node |
| 5 | **Etiqueta del órgano vacía** si se seleccionaba antes de cargar el modelo (error "removeChild") | Se dejó de usar `<Html>` de drei: la etiqueta es HTML normal y se proyecta desde 3D cada cuadro |
| 5 | El zoom apuntaba a la pelvis | Centro de giro movido al tronco (1.05 m) |
| 5b | Los ventrículos salían pequeños y las coronarias "flotaban" fuera del corazón | BodyParts3D trae la cavidad (la sangre), no la pared: superficie reconstruida con la envolvente de cavidades y coronarias |
| 5b | Demasiada grasa amarilla en toda la superficie | Grasa solo a menos de ~5 mm de las coronarias |
| 5b | El color del nivel tapaba el tejido realista | El nivel se muestra como brillo de borde (Fresnel), más fuerte al seleccionar |
| 5b | Al acercarse, el corazón quedaba fuera de la vista (la cámara apunta al abdomen) | La cámara se centra en el órgano elegido |
| 5b | Avisos "Mesh is not valid" al exportar | `mesh.validate()` antes de exportar |
| 6 | Al hacer scroll para leer, el 3D se perdía de vista | Rediseño: 3D fijo, panel lateral con pestañas y ventanas modales |
| 6 | En celular la página quedaba 25 px más ancha que la pantalla | La columna de la página crecía para que cupiera el título sin saltos: `grid-template-columns: minmax(0, 1fr)` |
| 6 | En celular el encabezado ocupaba un tercio de la pantalla | Encabezado en una franja con textos cortos; el 3D pasó de empezar a 127 px a 58 px |
| 6 | Esc cerraba la ventana y además quitaba la selección del órgano | Esc solo quita la selección si no hay una ventana abierta |

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

## Fase 5 — Anatomía real (BodyParts3D → `.glb`, sin Blender)

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
| Nombres de piezas del modelo que no coinciden | Convención de nombres documentada y prueba F5-02 |
| Modelo muy pesado | Reducir polígonos (Decimate) y comprimir con Draco |
| Órganos internos tapados por piel o músculo | Capas que se pueden mostrar u ocultar |
| Incumplir la licencia del modelo | Créditos y licencia en el repositorio y en la app |

### Escenarios — Fase 5b: órganos detallados con Blender
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F5-08 | Corazón detallado en su sitio | Coincide con el corazón de `body.glb`; tamaño y lado correctos | 🔗 |
| F5-09 | Piezas y materiales | Miocardio con textura; arterias rojas y venas azules | 🔗 |
| F5-10 | Nivel de afectación | Visible (borde del color del nivel) sin perder el aspecto realista | 👁️ |
| F5-11 | `heart.glb` no carga | Se usa la pieza simple; la app sigue funcionando | 🔗 |
| F5-12 | Elegir un órgano | La cámara se centra en él y se acerca; arrastrar lo cancela | 👁️ |
| F5-13 | Revisión visual | Aprobado por el usuario | 👁️ |

---

## Fase 6 — Web: publicación y pulido

> Se descartó la versión de escritorio (Tauri) el 10 de noviembre de 2026: la aplicación es solo web.

### Escenarios
| ID | Escenario | Esperado | Tipo |
|---|---|---|---|
| F6-01 | `npm run check` y `npm run build` antes de publicar | Todo en verde; `dist/` sin errores | 🔗 |
| F6-02 | Abrir el sitio publicado (HTTPS) | Cargan la página, el modelo 3D y las gráficas | 👁️ |
| F6-03 | Chrome, Edge, Firefox y Safari | Funciona igual en todos | 👁️ |
| F6-04 | Celular | Tocar un órgano lo selecciona; un dedo gira; pellizcar hace zoom; el formulario se usa sin hacer zoom en la página | 👁️ |
| F6-05 | Enlaces con parámetros (`?ejemplo=`, `?organo=`, `?perfil=`) | Funcionan en el sitio publicado, también si está en una subcarpeta | 🔗 / 👁️ |
| F6-06 | Lighthouse | Rendimiento ≥ 80 y accesibilidad ≥ 90 | 👁️ |
| F6-07 | Privacidad | Escribir en el formulario no genera ninguna solicitud de red | 🔗 |
| F6-08 | Compartir el enlace | Se ve título, descripción e imagen de vista previa | 👁️ |
| F6-09 | Leer información (formulario, detalle, resultados) | El 3D sigue visible; la página no hace scroll, solo el panel | 🔗 / 👁️ |
| F6-10 | Pestañas del panel | Cambian con clic y con flechas del teclado | 🔗 |
| F6-11 | Elegir un órgano (3D, lista o resultados) | Se abre la pestaña "Órgano" con su detalle | 🔗 |
| F6-12 | Cambiar de pestaña con el formulario lleno | No se pierde nada de lo escrito | 🔗 |
| F6-13 | Ventanas modales (Simulación, Fuentes) | Se cierran con ✕, clic fuera y Esc; Esc no afecta la selección | 🔗 |

### Problemas posibles
| Problema | Prevención |
|---|---|
| El sitio se publica en una subcarpeta (por ejemplo, GitHub Pages: `/nombre-repo/`) y no encuentra el modelo | Rutas con `import.meta.env.BASE_URL` (ya se usa para el modelo); configurar `base` en Vite; probar F6-05 |
| Después de actualizar, el navegador muestra la versión anterior | Vite pone un código único en el nombre de cada archivo JS/CSS; el modelo `.glb` necesita un nombre con versión o encabezados de caché |
| Carga lenta en celulares con datos móviles | El 3D y las gráficas ya cargan aparte; comprimir con gzip/brotli (lo hacen los hostings); medir con Lighthouse |
| El celular no tiene WebGL o lo tiene desactivado | Ya existe el aviso y la lista de órganos sin 3D |
| Alguien ingresa datos reales de salud | Todo se calcula en el navegador y no se envía; aviso de no ingresar datos personales (ya existe); prueba F6-07 |
| Se interpreta como herramienta de diagnóstico | Aviso visible en el encabezado y en los resultados (ya existe) |

---

## Reglas generales para evitar errores

1. **Nada se da por terminado sin pruebas en verde.**
2. **Cada cálculo médico tiene fuente, pruebas de límites y explicación visible.**
3. **La lógica médica no se mezcla con la interfaz.**
4. **Commit en git al cerrar cada tarea**, con mensaje claro.
5. **Al cerrar cada fase**, repasar sus escenarios manuales (👁️) como lista de verificación.
6. **Si aparece un error nuevo**, primero se escribe una prueba que lo reproduzca y después se corrige.
