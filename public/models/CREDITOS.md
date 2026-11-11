# Créditos de los modelos 3D (`body.glb`, `heart.glb`)

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
