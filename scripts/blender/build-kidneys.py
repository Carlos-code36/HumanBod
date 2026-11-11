# Genera public/models/kidneys.glb: riñones detallados a partir de BodyParts3D, procesados con Blender.
#
# Uso (Blender 4.2 o más nuevo, sin abrir la ventana):
#   blender -b --factory-startup -P scripts/blender/build-kidneys.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]
#
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
#
# Qué hace:
#  1. Riñones: en BodyParts3D cada riñón es una malla de baja resolución (facetada). Se subdivide, se remalla
#     y se suaviza para obtener una superficie lisa, conservando la forma y el hilio.
#  2. Contexto: glándulas suprarrenales, arterias renales, uréteres (primeros centímetros, reconstruidos
#     como tubos porque la malla original del derecho está abierta), aorta abdominal
#     y vena cava inferior a la altura de los riñones. BodyParts3D no incluye las venas renales.
#  3. Textura (cápsula brillante con manchas suaves y capilares finos) horneada en color y mapa de normales.
#  4. Exporta .glb con un nodo "kidneys" y una malla por tejido, cada una con su material.

import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
from comun import (  # noqa: E402
    aplicar, archivos, centro_de, crear, exportar, hornear, malla_liviana, material_simple, nodos, rampa,
    remallar, triangulos, tubo_por_eje, unir, vaso, vista_previa,
)

# ---------- 1. Riñones ----------

alto = crear("rinones_alto", archivos("FMA7204", "FMA7205"))
aplicar(alto, "SUBSURF", levels=2, render_levels=2)  # quita el facetado de la malla original
remallar(alto, 0.6, suavizado=8)
centro = centro_de(alto)
zs = [v.co.z for v in alto.data.vertices]
z_min, z_max = min(zs), max(zs)
print(f"Riñones (alto detalle): {triangulos(alto)} triángulos; centro {tuple(round(c, 3) for c in centro)}")


# ---------- 2. Contexto ----------

suprarrenales = vaso("glandulas_suprarrenales", archivos("FMA15629", "FMA15630"), 0.5, 3000)
arterias = vaso("arterias_renales", archivos("FMA14752", "FMA14753"), 0.4, 3000, engrosar_mm=0.2)
# Uréteres: la parte baja del derecho viene ABIERTA en BodyParts3D y el remallado la perdía.
# Se reconstruyen como tubos de ~4 mm que siguen su eje real.
ureteres = unir([tubo_por_eje("ureter_der", archivos("FMA15571"), 2.0, z_min=z_min - 0.07),
                 tubo_por_eje("ureter_izq", archivos("FMA15572"), 2.0, z_min=z_min - 0.07)], "ureteres")
aorta = vaso("aorta_abdominal", archivos("FMA3789"), 0.8, 3000, z_min=z_min - 0.02, z_max=z_max + 0.01)
cava = vaso("vena_cava_inferior", archivos("FMA10951"), 0.8, 3000, z_min=z_min - 0.02, z_max=z_max + 0.01)


# ---------- 3. Materiales ----------

material_simple(suprarrenales, "suprarrenal", "#d9a441", 0.5)
material_simple(arterias, "arteria", "#c0302c", 0.36)
material_simple(ureteres, "ureter", "#e3cfa8", 0.45)
material_simple(aorta, "aorta", "#b8262e", 0.38)
material_simple(cava, "vena", "#34519a", 0.42)


def material_rinon():
    """Riñón: rojo pardo con manchas suaves y capilares finos bajo la cápsula; superficie brillante."""
    m = bpy.data.materials.new("rinon_procedural")
    n, l, bsdf, coord = nodos(m)
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 45
    ruido.inputs["Detail"].default_value = 6
    l.new(coord.outputs["Object"], ruido.inputs["Vector"])
    base = rampa(n, l, ruido.outputs["Fac"], "#6e2620", "#9c4535")
    # Capilares: líneas finas y ramificadas (bordes de voronoi deformado), un poco más rojas
    deformar = n.new("ShaderNodeTexNoise")
    deformar.inputs["Scale"].default_value = 80
    mezcla_v = n.new("ShaderNodeMix")
    mezcla_v.data_type = "VECTOR"
    mezcla_v.inputs["Factor"].default_value = 0.004
    l.new(coord.outputs["Object"], mezcla_v.inputs[4])
    l.new(deformar.outputs["Color"], mezcla_v.inputs[5])
    vasitos = n.new("ShaderNodeTexVoronoi")
    vasitos.feature = "DISTANCE_TO_EDGE"
    vasitos.inputs["Scale"].default_value = 70
    l.new(mezcla_v.outputs[1], vasitos.inputs["Vector"])
    linea = n.new("ShaderNodeMapRange")
    linea.inputs["From Min"].default_value = 0.0
    linea.inputs["From Max"].default_value = 0.015
    linea.inputs["To Min"].default_value = 0.22
    linea.inputs["To Max"].default_value = 0.0
    l.new(vasitos.outputs["Distance"], linea.inputs["Value"])
    mezcla = n.new("ShaderNodeMix")
    mezcla.data_type = "RGBA"
    mezcla.inputs[7].default_value = (0.55, 0.06, 0.06, 1)
    l.new(linea.outputs["Result"], mezcla.inputs["Factor"])
    l.new(base.outputs["Color"], mezcla.inputs[6])
    l.new(mezcla.outputs[2], bsdf.inputs["Base Color"])
    # Relieve muy suave de la cápsula
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.06
    relieve.inputs["Distance"].default_value = 0.0003
    l.new(ruido.outputs["Fac"], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.3
    return m


bajo = malla_liviana(alto, "rinones", 12000)
alto.data.materials.append(material_rinon())
print(f"Riñones (exportado): {triangulos(bajo)} triángulos")


# ---------- 4. Horneado y exportación ----------

hornear(alto, bajo, rugosidad=0.3, distancia_mm=3.0)
exportar("kidneys", [bajo, suprarrenales, arterias, ureteres, aorta, cava], "kidneys.glb")
vista_previa("rinones", centro, 0.2, [("frente", 0, 1.0), ("atras", 180, 1.0), ("lado", 90, 1.0), ("detalle", -30, 0.5)])
