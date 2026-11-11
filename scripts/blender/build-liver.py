# Genera public/models/liver.glb: hígado detallado a partir de BodyParts3D, procesado con Blender.
#
# Uso (Blender 4.2 o más nuevo, sin abrir la ventana):
#   blender -b --factory-startup -P scripts/blender/build-liver.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]
#
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
#
# Qué hace:
#  1. Parénquima: BodyParts3D divide el hígado en segmentos (II a VIII) y el lóbulo caudado. Se unen y se
#     fusionan en una sola superficie con remallado por vóxeles (desaparecen las costuras entre segmentos).
#  2. Hilio y alrededores: vesícula biliar, conductos biliares (hepáticos, hepático común, cístico),
#     vena porta, arteria hepática y vena cava inferior detrás del hígado. Los vasos que van DENTRO del
#     hígado no se incluyen: no se verían.
#  3. Textura de color (lobulillos, manchas suaves) y mapa de normales horneados sobre una malla liviana.
#  4. Exporta .glb con un nodo "liver" y una malla por tejido, cada una con su material.

import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
from comun import (  # noqa: E402
    archivos, centro_de, conceptos, crear, engrosar, exportar, hornear, malla_liviana, material_simple,
    nodos, nombre_especifico, rampa, remallar, triangulos, vaso, vista_previa,
)

higado = set(conceptos["FMA7197"])

# ---------- 1. Parénquima ----------

segmentos = [fj for fj in conceptos["FMA7197"]
             if "hepatovenous segment" in nombre_especifico(fj) or nombre_especifico(fj) == "caudate lobe of liver"]
alto = crear("parenquima_alto", segmentos)
engrosar(alto, 0.5)            # cierra las rendijas entre segmentos antes de fusionar
remallar(alto, 1.0, suavizado=14)
engrosar(alto, -0.5)
centro = centro_de(alto)
zs = [v.co.z for v in alto.data.vertices]
z_min, z_max = min(zs), max(zs)
print(f"Parénquima ({len(segmentos)} piezas): {triangulos(alto)} triángulos; centro {tuple(round(c, 3) for c in centro)}")


# ---------- 2. Vesícula, conductos y vasos del hilio ----------

def cerca(r_mm):
    return lambda co: (co - centro).length <= r_mm / 1000


def del_hilio(nombres_):
    """Elementos del hígado cuyo concepto más específico es uno de estos (troncos que salen del hilio)."""
    return [fj for fj in conceptos["FMA7197"] if nombre_especifico(fj) in nombres_]


vesicula = vaso("vesicula_biliar", archivos("FMA7202"), 0.6, 5000)
conductos = vaso("conductos_biliares",
                 archivos("FMA14668", "FMA14539", "FMA14670", "FMA14669"), 0.4, 4000, engrosar_mm=0.2)
porta = vaso("vena_porta",
             [fj for fj in archivos("FMA45628") if fj not in higado]
             + del_hilio({"trunk of left portal vein", "trunk of right portal vein"}),
             0.6, 5000, dentro=cerca(140))
arteria = vaso("arteria_hepatica",
               [fj for fj in archivos("FMA14771") if fj not in higado]
               + del_hilio({"hepatic artery proper", "trunk of right hepatic artery", "trunk of left hepatic artery"}),
               0.4, 4000, engrosar_mm=0.2, dentro=cerca(120))
cava = vaso("vena_cava_inferior", archivos("FMA10951"), 0.8, 4000, z_min=z_min - 0.01, z_max=z_max + 0.005)


# ---------- 3. Materiales ----------

material_simple(vesicula, "vesicula", "#5f8a3e", 0.3)
material_simple(conductos, "conducto_biliar", "#8fa43c", 0.4)
material_simple(porta, "vena_porta", "#7d56b8", 0.4)
material_simple(arteria, "arteria", "#c0302c", 0.36)
material_simple(cava, "vena", "#34519a", 0.42)


def material_parenquima():
    """Hígado: rojo pardo, lobulillos hexagonales apenas visibles y manchas suaves; cápsula brillante."""
    m = bpy.data.materials.new("parenquima_procedural")
    n, l, bsdf, coord = nodos(m)
    # Manchas grandes
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 35
    ruido.inputs["Detail"].default_value = 5
    l.new(coord.outputs["Object"], ruido.inputs["Vector"])
    base = rampa(n, l, ruido.outputs["Fac"], "#6b2620", "#99412f")
    # Lobulillos (~2–3 mm): borde de las celdas un poco más claro
    lobulillos = n.new("ShaderNodeTexVoronoi")
    lobulillos.feature = "DISTANCE_TO_EDGE"
    lobulillos.inputs["Scale"].default_value = 380
    l.new(coord.outputs["Object"], lobulillos.inputs["Vector"])
    borde = n.new("ShaderNodeMapRange")
    borde.inputs["From Min"].default_value = 0.0
    borde.inputs["From Max"].default_value = 0.08
    borde.inputs["To Min"].default_value = 0.22
    borde.inputs["To Max"].default_value = 0.0
    l.new(lobulillos.outputs["Distance"], borde.inputs["Value"])
    mezcla = n.new("ShaderNodeMix")
    mezcla.data_type = "RGBA"
    mezcla.inputs[7].default_value = (0.42, 0.16, 0.11, 1)
    l.new(borde.outputs["Result"], mezcla.inputs["Factor"])
    l.new(base.outputs["Color"], mezcla.inputs[6])
    l.new(mezcla.outputs[2], bsdf.inputs["Base Color"])
    # Relieve muy fino de los lobulillos
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.08
    relieve.inputs["Distance"].default_value = 0.0003
    l.new(lobulillos.outputs["Distance"], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.4
    return m


bajo = malla_liviana(alto, "parenquima", 16000)
alto.data.materials.append(material_parenquima())
print(f"Parénquima (exportado): {triangulos(bajo)} triángulos")


# ---------- 4. Horneado y exportación ----------

# El borde inferior del hígado es delgado: distancia de horneado corta para no tocar la cara opuesta.
hornear(alto, bajo, rugosidad=0.4, distancia_mm=2.5)
exportar("liver", [bajo, vesicula, conductos, porta, arteria, cava], "liver.glb")
vista_previa("higado", centro, 0.22, [("frente", 0, 1.0), ("abajo", 0, 1.0, -55), ("atras", 180, 1.0), ("detalle", 30, 0.6)])
