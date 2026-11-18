# Créditos de los modelos 3D (`body.glb`, `heart.glb`, `liver.glb`, `pancreas.glb`, `kidneys.glb`, `eyes.glb`)

**BodyParts3D, © The Database Center for Life Science.**
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/

## Licencia

- La página oficial de licencia (actualizada en 2025) indica **Creative Commons Attribution 4.0 International (CC BY 4.0)**:
  https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Los archivos OBJ descargados (versión 4.0, de 2011–2013) llevan en su encabezado **CC Attribution-Share Alike 2.1 Japan**.

Por precaución se cumplen ambas: se da crédito y este modelo derivado se distribuye bajo la misma licencia
(CC BY-SA 2.1 JP / compatible con CC BY 4.0). Esto aplica **solo al modelo 3D**, no al código de la aplicación.

## Modificaciones realizadas

Generado con `scripts/build-anatomy.mjs` a partir de `partof_BP3D_4.0_obj_99.zip`:

- Selección de piezas: piel (FMA7163), corazón (FMA7088), hígado (FMA7197), páncreas (FMA7198),
  riñones (FMA7204, FMA7205) y globos oculares (FMA12514, FMA12515).
- Cambio de unidades y ejes (mm, Z arriba → m, Y arriba) y reducción de polígonos con meshoptimizer.
- **Nervios periféricos: trazado esquemático propio.** BodyParts3D no incluye nervios de brazos y piernas;
  se dibujaron tubos que siguen húmero–radio y fémur–tibia. No representan el recorrido anatómico real.

### `heart.glb` (corazón detallado)

Generado con Blender mediante `scripts/blender/build-heart.py`, a partir de los mismos archivos:

- Cavidades de los ventrículos (FMA9466, FMA9291) y paredes y cavidades de las aurículas (FMA9531, FMA9457,
  FMA9465, FMA11359); arterias y venas coronarias (elementos de FMA7088); aorta (FMA3736, FMA3768, FMA3784);
  tronco y arterias pulmonares extrapulmonares (FMA8612, FMA50872, FMA50873); venas cavas (FMA4720, FMA10951);
  venas pulmonares extrapulmonares (FMA49911, FMA49913, FMA49914, FMA49916).
- **Superficie externa de los ventrículos reconstruida** (BodyParts3D solo trae la cavidad): envolvente de las
  cavidades y de las coronarias, remallado por vóxeles y suavizado. Es una aproximación, no una medición.
- Vasos recortados cerca del corazón; coronarias engrosadas 0,35 mm para que se vean.
- Grasa epicárdica, color y relieve del músculo: **texturas procedurales propias**, horneadas en Blender.

### `liver.glb` (hígado detallado)

Generado con Blender mediante `scripts/blender/build-liver.py`, a partir de los mismos archivos:

- Parénquima: segmentos hepatovenosos II a VIII y lóbulo caudado (elementos de FMA7197), fusionados con
  remallado por vóxeles y suavizados.
- Vesícula biliar (FMA7202); conductos hepático común, cístico, hepático derecho e izquierdo (FMA14668,
  FMA14539, FMA14669, FMA14670); vena porta extrahepática y troncos de sus ramas (FMA45628); arteria hepática
  común, propia y troncos de sus ramas (FMA14771); vena cava inferior recortada a la altura del hígado (FMA10951).
- Color, lobulillos y relieve: **texturas procedurales propias**, horneadas en Blender.

### `pancreas.glb` (páncreas detallado)

Generado con Blender mediante `scripts/blender/build-pancreas.py`, a partir de los mismos archivos:

- Parénquima del páncreas (FMA63120), remallado y suavizado.
- Duodeno (FMA7206); arteria esplénica (FMA14773), cortada al final de la cola; tronco celíaco (FMA14812);
  tronco de la arteria mesentérica superior (FMA66358); aorta abdominal (FMA3789) recortada a la altura del
  páncreas; vena porta extrahepática (FMA71904, FMA50735).
- Color, lóbulos y relieve: **texturas procedurales propias**, horneadas en Blender.

### `kidneys.glb` (riñones detallados)

Generado con Blender mediante `scripts/blender/build-kidneys.py`, a partir de los mismos archivos:

- Riñón derecho e izquierdo (FMA7204, FMA7205): subdivididos, remallados y suavizados.
- Glándulas suprarrenales (FMA15629, FMA15630); arterias renales (FMA14752, FMA14753); aorta abdominal
  (FMA3789) y vena cava inferior (FMA10951) recortadas a la altura de los riñones.
- **Uréteres (FMA15571, FMA15572) reconstruidos** como tubos de ~4 mm que siguen el eje de la malla original
  (la del derecho está abierta); solo los primeros 7 cm.
- Color, capilares y relieve: **texturas procedurales propias**, horneadas en Blender.

### `eyes.glb` (ojos detallados)

Generado con Blender mediante `scripts/blender/build-eyes.py`:

- **Globos oculares de construcción propia** (esclerótica, córnea, iris, pupila y retina), con la posición,
  el radio y la dirección de la mirada **medidos** en la esclerótica y la córnea de BodyParts3D
  (FMA58271, FMA58272, FMA58239, FMA58240). Ventana de corte para ver la retina.
- Retina: disco óptico, mácula y vasos **dibujados de forma esquemática** (no son un trazado real de una
  persona), horneados en la textura.
- Músculos extraoculares de BodyParts3D: rectos superior, inferior, lateral y medial, y oblicuos superior
  e inferior de cada ojo (FMA49044 a FMA49057), recortados junto a la ventana.
- **Nervio óptico reconstruido** (BodyParts3D no lo incluye): tubo desde el polo posterior del ojo hasta el
  vértice de la órbita, donde convergen los músculos rectos.
