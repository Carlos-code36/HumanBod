# Genera public/models/pancreas.glb: páncreas detallado a partir de BodyParts3D, procesado con Blender.
#
# Uso (Blender 4.2 o más nuevo, sin abrir la ventana):
#   blender -b --factory-startup -P scripts/blender/build-pancreas.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]
#
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
#
# Qué hace:
#  1. Parénquima del páncreas (cabeza, cuerpo y cola) remallado y suavizado. El conducto pancreático va
#     por dentro y no se incluye (no se vería).
#  2. Contexto, como en los atlas: duodeno (la "C" que rodea la cabeza), arteria esplénica a lo largo del
#     borde superior, tronco celíaco, arteria mesentérica superior, aorta abdominal y vena porta detrás del
#     cuello del páncreas; todo recortado cerca del páncreas.
#  3. Textura lobulada (lóbulos de ~5 mm con surcos) horneada en color y mapa de normales.
#  4. Exporta .glb con un nodo "pancreas" y una malla por tejido, cada una con su material.

import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
from comun import (  # noqa: E402
    archivos, centro_de, crear, exportar, hornear, malla_liviana, material_simple, nodos, rampa,
    remallar, triangulos, vaso, vista_previa,
)

# ---------- 1. Parénquima ----------

alto = crear("parenquima_alto", archivos("FMA63120"))
remallar(alto, 0.7, suavizado=10)
centro = centro_de(alto)
zs = [v.co.z for v in alto.data.vertices]
z_min, z_max = min(zs), max(zs)
print(f"Páncreas (alto detalle): {triangulos(alto)} triángulos; centro {tuple(round(c, 3) for c in centro)}")


# ---------- 2. Contexto ----------

def cerca(r_mm):
    return lambda co: (co - centro).length <= r_mm / 1000


duodeno = vaso("duodeno", archivos("FMA7206"), 0.8, 6000)
# Sin bazo en el modelo: la arteria esplénica se corta al final de la cola (si no, sus ramas flotan).
x_cola = max(v.co.x for v in alto.data.vertices)
esplenica = vaso("arteria_esplenica", archivos("FMA14773"), 0.4, 4000, engrosar_mm=0.2,
                 dentro=lambda co: co.x <= x_cola + 0.004)
celiaco = vaso("tronco_celiaco", archivos("FMA14812"), 0.4, 1500, engrosar_mm=0.2)
mesenterica = vaso("arteria_mesenterica_superior", archivos("FMA66358"), 0.5, 2000, z_min=z_min - 0.03)
aorta = vaso("aorta_abdominal", archivos("FMA3789"), 0.8, 3000, z_min=z_min - 0.04, z_max=z_max + 0.03)
porta = vaso("vena_porta", archivos("FMA71904", "FMA50735", menos=("FMA7197",)), 0.6, 2500, dentro=cerca(75))


# ---------- 3. Materiales ----------

material_simple(duodeno, "duodeno", "#c98a7b", 0.45)
material_simple(esplenica, "arteria", "#c0302c", 0.36)
material_simple(celiaco, "arteria_celiaca", "#c0302c", 0.36)
material_simple(mesenterica, "arteria_mesenterica", "#c0302c", 0.36)
material_simple(aorta, "aorta", "#b8262e", 0.38)
material_simple(porta, "vena_porta", "#7d56b8", 0.4)


def material_parenquima():
    """Páncreas: rosado amarillento y lobulado; los surcos entre lóbulos, más oscuros y hundidos."""
    m = bpy.data.materials.new("parenquima_procedural")
    n, l, bsdf, coord = nodos(m)
    # Coordenadas deformadas con ruido: lóbulos irregulares y redondeados, no baldosas.
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 120
    deformar = n.new("ShaderNodeMix")
    deformar.data_type = "VECTOR"
    deformar.inputs["Factor"].default_value = 0.0012
    l.new(coord.outputs["Object"], deformar.inputs[4])
    l.new(ruido.outputs["Color"], deformar.inputs[5])
    lobulos = n.new("ShaderNodeTexVoronoi")
    lobulos.inputs["Scale"].default_value = 240  # celdas de ~4 mm
    l.new(deformar.outputs[1], lobulos.inputs["Vector"])
    borde = n.new("ShaderNodeTexVoronoi")
    borde.feature = "DISTANCE_TO_EDGE"
    borde.inputs["Scale"].default_value = 240
    l.new(deformar.outputs[1], borde.inputs["Vector"])
    # Cada lóbulo con un tono un poco distinto
    tono = rampa(n, l, lobulos.outputs["Color"], "#d79d7c", "#ecc39b")
    surco = n.new("ShaderNodeMapRange")
    surco.inputs["From Min"].default_value = 0.0
    surco.inputs["From Max"].default_value = 0.09
    surco.inputs["To Min"].default_value = 0.4
    surco.inputs["To Max"].default_value = 0.0
    l.new(borde.outputs["Distance"], surco.inputs["Value"])
    mezcla = n.new("ShaderNodeMix")
    mezcla.data_type = "RGBA"
    mezcla.inputs[7].default_value = (0.36, 0.16, 0.1, 1)
    l.new(surco.outputs["Result"], mezcla.inputs["Factor"])
    l.new(tono.outputs["Color"], mezcla.inputs[6])
    l.new(mezcla.outputs[2], bsdf.inputs["Base Color"])
    # Relieve: lóbulos abombados (distancia al borde, suavizada)
    alto_lobulo = n.new("ShaderNodeMath")
    alto_lobulo.operation = "POWER"
    alto_lobulo.inputs[1].default_value = 0.5
    l.new(borde.outputs["Distance"], alto_lobulo.inputs[0])
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.35
    relieve.inputs["Distance"].default_value = 0.0012
    l.new(alto_lobulo.outputs[0], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.5
    return m


bajo = malla_liviana(alto, "parenquima", 10000)
alto.data.materials.append(material_parenquima())
print(f"Páncreas (exportado): {triangulos(bajo)} triángulos")


# ---------- 4. Horneado y exportación ----------

hornear(alto, bajo, rugosidad=0.5, distancia_mm=3.0)
exportar("pancreas", [bajo, duodeno, esplenica, celiaco, mesenterica, aorta, porta], "pancreas.glb")
vista_previa("pancreas", centro, 0.16, [("frente", 0, 1.0), ("atras", 180, 1.0), ("abajo", 0, 1.0, -50), ("detalle", -20, 0.55)])
