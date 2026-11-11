# Genera public/models/heart.glb: corazón detallado a partir de BodyParts3D, procesado con Blender.
#
# Uso (Blender 4.2 o más nuevo, sin abrir la ventana):
#   blender -b --factory-startup -P scripts/blender/build-heart.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]
#
# Los datos se descargan igual que para scripts/build-anatomy.mjs (no se guardan en el repositorio).
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
#
# Qué hace:
#  1. Usa la MISMA transformación que build-anatomy.mjs (ver comun.py): el corazón queda en su sitio.
#  2. Miocardio: BodyParts3D trae las CAVIDADES de los ventrículos (la sangre), no la pared. La superficie
#     externa se reconstruye con la envolvente de las cavidades y de las coronarias (que corren sobre la
#     pared), se une con las aurículas y se fusiona con remallado por vóxeles.
#  3. Grandes vasos (aorta, tronco pulmonar, venas cavas, venas pulmonares) recortados cerca del corazón.
#  4. Arterias y venas coronarias, un poco engrosadas para que se vean.
#  5. Grasa epicárdica en los surcos por donde corren las coronarias (color según la distancia).
#  6. Hornea textura de color y mapa de normales (relieve fino) sobre una malla liviana.
#  7. Exporta .glb con un nodo "heart" y una malla por tejido, cada una con su material.

import os
import sys

import bmesh
import bpy
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(__file__))
from comun import (  # noqa: E402
    archivos, conceptos, crear, engrosar, exportar, hex_lineal, hornear, malla_liviana, material_simple,
    nodos, nombre_especifico, rampa, remallar, suave, triangulos, unir, vaso, vista_previa, centro_de,
)

# ---------- 1. Coronarias ----------

corazon_fjs = conceptos["FMA7088"]
art_cor = crear("arterias_coronarias", [fj for fj in corazon_fjs if "arter" in nombre_especifico(fj)])
ven_cor = crear("venas_coronarias", [fj for fj in corazon_fjs
                                     if any(p in nombre_especifico(fj) for p in ("vein", "sinus"))])
# Puntos de las coronarias antes de engrosarlas: marcan la superficie externa real del corazón.
puntos_coronarias = [v.co.copy() for ob in (art_cor, ven_cor) for v in ob.data.vertices]
for ob in (art_cor, ven_cor):
    engrosar(ob, 0.35)
    remallar(ob, 0.45, suavizado=4, objetivo=9000)
    suave(ob)


# ---------- 2. Miocardio ----------
# Superficie de los ventrículos = envolvente convexa de las cavidades + las coronarias,
# un poco hundida para que los vasos queden semienterrados en la grasa del surco.

def envolvente(nombre, puntos):
    bm = bmesh.new()
    for p in puntos:
        bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts[:])
    sueltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=sueltos, context="VERTS")
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


cavidades = [crear("vi", archivos("FMA9466")), crear("vd", archivos("FMA9291"))]
ventriculos = envolvente("ventriculos", [v.co.copy() for ob in cavidades for v in ob.data.vertices] + puntos_coronarias)
for ob in cavidades:
    bpy.data.objects.remove(ob)
remallar(ventriculos, 1.2, suavizado=30)
engrosar(ventriculos, -1.6)
auriculas = crear("auriculas", archivos("FMA9531", "FMA9457", "FMA9465", "FMA11359"))
alto = unir([ventriculos, auriculas], "miocardio_alto")
remallar(alto, 0.8, suavizado=10)
centro = centro_de(alto)
zmin_corazon = min(v.co.z for v in alto.data.vertices)
print(f"Miocardio (alto detalle): {triangulos(alto)} triángulos; centro {tuple(round(c, 3) for c in centro)}")


# ---------- 3. Grandes vasos ----------

def esfera(r_mm):
    return lambda co: (co - centro).length <= r_mm / 1000


aorta = vaso("aorta", archivos("FMA3736", "FMA3768", "FMA3784"), 0.8, 6000,
             dentro=esfera(130), z_min=centro.z - 0.035)
tronco_pulm = vaso("tronco_pulmonar", archivos("FMA8612", "FMA50872", "FMA50873", menos=("FMA67994", "FMA67995")),
                   0.8, 6000, dentro=esfera(85))
cavas = vaso("venas_cavas", archivos("FMA4720", "FMA10951"), 0.8, 6000,
             dentro=esfera(110), z_min=zmin_corazon - 0.015)
v_pulm = vaso("venas_pulmonares", archivos("FMA49911", "FMA49913", "FMA49914", "FMA49916",
                                           menos=("FMA68002", "FMA68003", "FMA68004", "FMA68005")),
              0.6, 4000, dentro=esfera(70))


# ---------- 4. Grasa epicárdica: peso por cercanía a las coronarias ----------

arbol = KDTree(len(art_cor.data.vertices) + len(ven_cor.data.vertices))
i = 0
for ob in (art_cor, ven_cor):
    for v in ob.data.vertices:
        arbol.insert(v.co, i)
        i += 1
arbol.balance()


def peso_grasa(co):
    _, _, d = arbol.find(co)
    return max(0.0, min(1.0, 1 - (d * 1000 - 1.8) / 3.2)) ** 2


bajo = malla_liviana(alto, "miocardio", 14000)
for ob in (alto, bajo):
    attr = ob.data.color_attributes.new("grasa", "FLOAT_COLOR", "POINT")
    for v in ob.data.vertices:
        g = 0.85 * peso_grasa(v.co)
        attr.data[v.index].color = (g, g, g, 1)
print(f"Miocardio (exportado): {triangulos(bajo)} triángulos")


# ---------- 5. Materiales ----------

material_simple(aorta, "arteria", "#b8262e", 0.38)
material_simple(tronco_pulm, "arteria_pulmonar", "#3f5fae", 0.38)
material_simple(cavas, "vena", "#34519a", 0.42)
material_simple(v_pulm, "vena_pulmonar", "#a33447", 0.42)
material_simple(art_cor, "coronaria_arteria", "#d0302a", 0.32)
material_simple(ven_cor, "coronaria_vena", "#2d4c9c", 0.36)


def material_miocardio():
    """Material procedural del miocardio de alto detalle (solo para hornear)."""
    m = bpy.data.materials.new("miocardio_procedural")
    n, l, bsdf, coord = nodos(m)
    # Variación de color del músculo
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 90
    ruido.inputs["Detail"].default_value = 6
    l.new(coord.outputs["Object"], ruido.inputs["Vector"])
    musculo = rampa(n, l, ruido.outputs["Fac"], "#7d1f24", "#b3413d")
    # Grasa amarilla en los surcos
    grasa = n.new("ShaderNodeVertexColor")
    grasa.layer_name = "grasa"
    ruido_g = n.new("ShaderNodeTexNoise")
    ruido_g.inputs["Scale"].default_value = 160
    l.new(coord.outputs["Object"], ruido_g.inputs["Vector"])
    color_grasa = rampa(n, l, ruido_g.outputs["Fac"], "#d9b36a", "#f0d595")
    mezcla = n.new("ShaderNodeMix")
    mezcla.data_type = "RGBA"
    l.new(grasa.outputs["Color"], mezcla.inputs["Factor"])
    l.new(musculo.outputs["Color"], mezcla.inputs[6])
    l.new(color_grasa.outputs["Color"], mezcla.inputs[7])
    l.new(mezcla.outputs[2], bsdf.inputs["Base Color"])
    # Relieve: fibras (ondas) en el músculo + glóbulos (voronoi) en la grasa
    ondas = n.new("ShaderNodeTexWave")
    ondas.inputs["Scale"].default_value = 340
    ondas.inputs["Distortion"].default_value = 6
    ondas.inputs["Detail"].default_value = 3
    l.new(coord.outputs["Object"], ondas.inputs["Vector"])
    voronoi = n.new("ShaderNodeTexVoronoi")
    voronoi.inputs["Scale"].default_value = 520
    l.new(coord.outputs["Object"], voronoi.inputs["Vector"])
    alt = n.new("ShaderNodeMix")
    alt.data_type = "FLOAT"
    l.new(grasa.outputs["Color"], alt.inputs["Factor"])
    l.new(ondas.outputs["Fac"], alt.inputs[2])
    l.new(voronoi.outputs["Distance"], alt.inputs[3])
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.12
    relieve.inputs["Distance"].default_value = 0.0004
    l.new(alt.outputs[0], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.5
    return m


alto.data.materials.append(material_miocardio())


# ---------- 6. Horneado y exportación ----------

hornear(alto, bajo, rugosidad=0.5)
exportar("heart", [bajo, art_cor, ven_cor, aorta, tronco_pulm, cavas, v_pulm], "heart.glb")
vista_previa("corazon", centro, 0.14)
