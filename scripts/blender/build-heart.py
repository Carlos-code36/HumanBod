# Genera public/models/heart.glb: corazón detallado a partir de BodyParts3D, procesado con Blender.
#
# Uso (Blender 4.2 o más nuevo, sin abrir la ventana):
#   blender -b --factory-startup -P scripts/blender/build-heart.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]
#
# Los datos se descargan igual que para scripts/build-anatomy.mjs (no se guardan en el repositorio).
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
#
# Qué hace:
#  1. Usa la MISMA transformación que build-anatomy.mjs (mm, Z arriba → m, Y arriba; pies en Y=0),
#     así el corazón queda exactamente en su sitio dentro del cuerpo.
#  2. Miocardio: BodyParts3D trae las CAVIDADES de los ventrículos (la sangre), no la pared.
#     Se engrosan (VI ≈ 9 mm, VD ≈ 4 mm), se unen con las aurículas y se fusionan en una sola
#     superficie con remallado por vóxeles; luego se suaviza.
#  3. Grandes vasos (aorta, tronco pulmonar, venas cavas, venas pulmonares) recortados cerca del corazón.
#  4. Arterias y venas coronarias, un poco engrosadas para que se vean.
#  5. Grasa epicárdica en los surcos por donde corren las coronarias (color según la distancia).
#  6. Hornea textura de color y mapa de normales (relieve fino) sobre una malla liviana.
#  7. Exporta .glb con un nodo "heart" y una malla por tejido, cada una con su material.

import bpy
import bmesh
import math
import os
import sys
from collections import defaultdict
from mathutils import Vector
from mathutils.kdtree import KDTree

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) < 2:
    print("Uso: blender -b -P build-heart.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]")
    sys.exit(1)
CARPETA_OBJ, ARCHIVO_PARTES = args[0], args[1]
PREVIEW = args[args.index("--preview") + 1] if "--preview" in args else None
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SALIDA = os.path.join(RAIZ, "public", "models", "heart.glb")
TEXTURA = 2048

# ---------- Lectura de BodyParts3D ----------

conceptos = defaultdict(list)
nombres = {}
with open(ARCHIVO_PARTES, encoding="utf8") as f:
    next(f)
    for linea in f:
        c, n, fj = linea.rstrip("\n").split("\t")
        conceptos[c].append(fj)
        nombres[c] = n


def archivos(*fmas, menos=()):
    quitar = {fj for c in menos for fj in conceptos[c]}
    out = []
    for c in fmas:
        if not conceptos[c]:
            raise RuntimeError(f"No hay archivos para {c}")
        out += [fj for fj in conceptos[c] if fj not in quitar and fj not in out]
    return out


def leer_obj(fj):
    pos, caras = [], []
    with open(os.path.join(CARPETA_OBJ, fj + ".obj")) as f:
        for linea in f:
            if linea.startswith("v "):
                pos.append(tuple(map(float, linea.split()[1:4])))
            elif linea.startswith("f "):
                vs = [int(t.split("/")[0]) - 1 for t in linea.split()[1:]]
                caras.append(vs)
    if not pos or not caras:
        raise RuntimeError(f"OBJ vacío: {fj}")
    return pos, caras


# ---------- Transformación (idéntica a build-anatomy.mjs) ----------

piel = [p for fj in archivos("FMA7163") for p in leer_obj(fj)[0]]
cx = (min(p[0] for p in piel) + max(p[0] for p in piel)) / 2
cy = (min(p[1] for p in piel) + max(p[1] for p in piel)) / 2
zmin = min(p[2] for p in piel)
rinon = [p for fj in archivos("FMA7204") for p in leer_obj(fj)[0]]
SX = -1 if sum(p[0] for p in rinon) / len(rinon) - cx > 0 else 1
del piel, rinon


def a_blender(p):
    # App (glTF, Y arriba): (sx(x−cx), z−zmin, −(y−cy)) / 1000.  El exportador de Blender convierte
    # Z arriba → Y arriba con (x, y, z) → (x, z, −y); por eso en Blender va (sx(x−cx), y−cy, z−zmin).
    return (SX * (p[0] - cx) / 1000, (p[1] - cy) / 1000, (p[2] - zmin) / 1000)


def crear(nombre, fjs):
    verts, caras = [], []
    for fj in fjs:
        pos, cs = leer_obj(fj)
        base = len(verts)
        verts += [a_blender(p) for p in pos]
        for c in cs:
            c = [base + i for i in c]
            caras.append(c[::-1] if SX == -1 else c)  # espejar invierte el giro de las caras
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(verts, [], caras)
    me.validate()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------- Utilidades de malla ----------

def activar(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def aplicar(ob, tipo, **props):
    activar(ob)
    m = ob.modifiers.new(tipo.lower(), tipo)
    for k, v in props.items():
        setattr(m, k, v)
    bpy.ops.object.modifier_apply(modifier=m.name)


def engrosar(ob, mm):
    """Mueve cada vértice hacia afuera según su normal (las cavidades → pared del ventrículo)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * (mm / 1000)
    bm.to_mesh(ob.data)
    bm.free()


def unir(obs, nombre):
    activar(obs[0])
    for o in obs[1:]:
        o.select_set(True)
    bpy.ops.object.join()
    obs[0].name = nombre
    obs[0].data.name = nombre
    return obs[0]


def recortar(ob, dentro=None, z_min=None):
    """Corta con un plano horizontal (z_min) y/o borra lo que queda fuera de una región; tapa los agujeros."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    if z_min is not None:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-6,
                               plane_co=(0, 0, z_min), plane_no=(0, 0, 1), clear_inner=True)
    if dentro:
        fuera = [v for v in bm.verts if not dentro(v.co)]
        bmesh.ops.delete(bm, geom=fuera, context="VERTS")
    bordes = [e for e in bm.edges if e.is_boundary]
    if bordes:
        bmesh.ops.holes_fill(bm, edges=bordes, sides=0)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def remallar(ob, voxel_mm, suavizado=0, triangulos=None):
    aplicar(ob, "REMESH", mode="VOXEL", voxel_size=voxel_mm / 1000, adaptivity=0.0)
    if suavizado:
        aplicar(ob, "CORRECTIVE_SMOOTH", iterations=suavizado, smooth_type="SIMPLE", use_only_smooth=True)
    if triangulos:
        diezmar(ob, triangulos)


def diezmar(ob, triangulos):
    actuales = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if actuales > triangulos:
        aplicar(ob, "DECIMATE", ratio=triangulos / actuales)


def triangulos(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def suave(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


# ---------- 1. Coronarias ----------

corazon_fjs = conceptos["FMA7088"]


def es_coronaria(fj, palabra):
    especifico = min((c for c in conceptos if fj in conceptos[c]), key=lambda c: len(conceptos[c]))
    return palabra in nombres[especifico]


art_cor = crear("arterias_coronarias", [fj for fj in corazon_fjs if es_coronaria(fj, "arter")])
ven_cor = crear("venas_coronarias", [fj for fj in corazon_fjs
                                     if es_coronaria(fj, "vein") or es_coronaria(fj, "sinus")])
# Puntos de las coronarias antes de engrosarlas: marcan la superficie externa real del corazón.
puntos_coronarias = [v.co.copy() for ob in (art_cor, ven_cor) for v in ob.data.vertices]
for ob in (art_cor, ven_cor):
    engrosar(ob, 0.35)
    remallar(ob, 0.45, suavizado=4, triangulos=9000)
    suave(ob)


# ---------- 2. Miocardio ----------
# Las cavidades de BodyParts3D son la SANGRE, no la pared; y las coronarias corren SOBRE la pared.
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
centro = sum((v.co for v in alto.data.vertices), Vector()) / len(alto.data.vertices)
zmin_corazon = min(v.co.z for v in alto.data.vertices)
print(f"Miocardio (alto detalle): {triangulos(alto)} triángulos; centro {tuple(round(c, 3) for c in centro)}")


# ---------- 3. Grandes vasos ----------

def esfera(r_mm):
    return lambda co: (co - centro).length <= r_mm / 1000


aorta = crear("aorta", archivos("FMA3736", "FMA3768", "FMA3784"))
recortar(aorta, lambda co: (co - centro).length <= 0.13, z_min=centro.z - 0.035)
tronco_pulm = crear("tronco_pulmonar", archivos("FMA8612", "FMA50872", "FMA50873", menos=("FMA67994", "FMA67995")))
recortar(tronco_pulm, esfera(85))
cavas = crear("venas_cavas", archivos("FMA4720", "FMA10951"))
recortar(cavas, lambda co: (co - centro).length <= 0.11, z_min=zmin_corazon - 0.015)
v_pulm = crear("venas_pulmonares", archivos("FMA49911", "FMA49913", "FMA49914", "FMA49916",
                                            menos=("FMA68002", "FMA68003", "FMA68004", "FMA68005")))
recortar(v_pulm, esfera(70))
for ob, mm in [(aorta, 0.8), (tronco_pulm, 0.8), (cavas, 0.8), (v_pulm, 0.6)]:
    remallar(ob, mm, suavizado=6, triangulos=6000 if ob is not v_pulm else 4000)
    suave(ob)


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


# Malla liviana (la que se exporta) con UV para hornear.
bajo = alto.copy()
bajo.data = alto.data.copy()
bajo.name = bajo.data.name = "miocardio"
bpy.context.scene.collection.objects.link(bajo)
diezmar(bajo, 14000)
suave(bajo)
suave(alto)
for ob in (alto, bajo):
    attr = ob.data.color_attributes.new("grasa", "FLOAT_COLOR", "POINT")
    for v in ob.data.vertices:
        g = 0.85 * peso_grasa(v.co)
        attr.data[v.index].color = (g, g, g, 1)
activar(bajo)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")
print(f"Miocardio (exportado): {triangulos(bajo)} triángulos")


# ---------- 5. Materiales ----------

def hex_lineal(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (1.0,)


def material_simple(nombre, color, rugosidad):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_lineal(color)
    bsdf.inputs["Roughness"].default_value = rugosidad
    return m


for ob, nombre, color, rug in [
    (aorta, "arteria", "#b8262e", 0.38),
    (tronco_pulm, "arteria_pulmonar", "#3f5fae", 0.38),
    (cavas, "vena", "#34519a", 0.42),
    (v_pulm, "vena_pulmonar", "#a33447", 0.42),
    (art_cor, "coronaria_arteria", "#d0302a", 0.32),
    (ven_cor, "coronaria_vena", "#2d4c9c", 0.36),
]:
    ob.data.materials.append(material_simple(nombre, color, rug))


def material_miocardio():
    """Material procedural del miocardio de alto detalle (solo para hornear)."""
    m = bpy.data.materials.new("miocardio_procedural")
    m.use_nodes = True
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    bsdf = n["Principled BSDF"]
    coord = n.new("ShaderNodeTexCoord")
    # Variación de color del músculo
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 90
    ruido.inputs["Detail"].default_value = 6
    l.new(coord.outputs["Object"], ruido.inputs["Vector"])
    rampa = n.new("ShaderNodeValToRGB")
    rampa.color_ramp.elements[0].color = hex_lineal("#7d1f24")
    rampa.color_ramp.elements[1].color = hex_lineal("#b3413d")
    l.new(ruido.outputs["Fac"], rampa.inputs["Fac"])
    # Grasa amarilla en los surcos
    grasa = n.new("ShaderNodeVertexColor")
    grasa.layer_name = "grasa"
    ruido_g = n.new("ShaderNodeTexNoise")
    ruido_g.inputs["Scale"].default_value = 160
    l.new(coord.outputs["Object"], ruido_g.inputs["Vector"])
    rampa_g = n.new("ShaderNodeValToRGB")
    rampa_g.color_ramp.elements[0].color = hex_lineal("#d9b36a")
    rampa_g.color_ramp.elements[1].color = hex_lineal("#f0d595")
    l.new(ruido_g.outputs["Fac"], rampa_g.inputs["Fac"])
    mezcla = n.new("ShaderNodeMix")
    mezcla.data_type = "RGBA"
    l.new(grasa.outputs["Color"], mezcla.inputs["Factor"])
    l.new(rampa.outputs["Color"], mezcla.inputs[6])
    l.new(rampa_g.outputs["Color"], mezcla.inputs[7])
    l.new(mezcla.outputs[2], bsdf.inputs["Base Color"])
    # Relieve: fibras (ondas a lo largo del eje largo) + glóbulos de grasa
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


# ---------- 6. Horneado (alto detalle + relieve → malla liviana) ----------

def imagen(nombre, no_color):
    img = bpy.data.images.new(nombre, TEXTURA, TEXTURA, alpha=False, float_buffer=no_color)
    if no_color:
        img.colorspace_settings.name = "Non-Color"
    return img


mat_bajo = bpy.data.materials.new("miocardio")
mat_bajo.use_nodes = True
nb = mat_bajo.node_tree.nodes
bsdf_b = nb["Principled BSDF"]
bsdf_b.inputs["Roughness"].default_value = 0.5
bajo.data.materials.append(mat_bajo)
img_color = imagen("miocardio_color", False)
img_normal = imagen("miocardio_normal", True)
nodo_color = nb.new("ShaderNodeTexImage")
nodo_color.image = img_color
nodo_normal = nb.new("ShaderNodeTexImage")
nodo_normal.image = img_normal
mapa_n = nb.new("ShaderNodeNormalMap")

escena = bpy.context.scene
escena.render.engine = "CYCLES"
escena.cycles.device = "CPU"
escena.cycles.samples = 4
escena.render.bake.use_selected_to_active = True
escena.render.bake.cage_extrusion = 0.003
escena.render.bake.max_ray_distance = 0.006
escena.render.bake.margin = 8

bpy.ops.object.select_all(action="DESELECT")
alto.select_set(True)
bajo.select_set(True)
bpy.context.view_layer.objects.active = bajo
for img, tipo, extra in [(img_color, "DIFFUSE", {"pass_filter": {"COLOR"}}), (img_normal, "NORMAL", {})]:
    nb.active = nodo_color if img is img_color else nodo_normal
    nodo_color.select = img is img_color
    nodo_normal.select = img is img_normal
    print(f"Horneando {img.name}…")
    bpy.ops.object.bake(type=tipo, **extra)

l = mat_bajo.node_tree.links
l.new(nodo_color.outputs["Color"], bsdf_b.inputs["Base Color"])
l.new(nodo_normal.outputs["Color"], mapa_n.inputs["Color"])
l.new(mapa_n.outputs["Normal"], bsdf_b.inputs["Normal"])
bpy.data.objects.remove(alto)
bajo.data.color_attributes.remove(bajo.data.color_attributes["grasa"])


# ---------- 7. Exportar ----------

raiz = bpy.data.objects.new("heart", None)
escena.collection.objects.link(raiz)
piezas = [bajo, art_cor, ven_cor, aorta, tronco_pulm, cavas, v_pulm]
for ob in piezas:
    ob.parent = raiz
    ob.data.name = ob.name
    ob.data.validate()  # quita caras degeneradas que deja el diezmado
for ob in bpy.data.objects:
    if ob not in piezas and ob is not raiz:
        bpy.data.objects.remove(ob)

os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=SALIDA,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_texcoords=True,
    export_tangents=False,
    export_attributes=False,
    export_image_format="WEBP",
    export_image_quality=82,
    export_cameras=False,
    export_lights=False,
    export_extras=False,
)
for ob in piezas:
    print(f"  {ob.name}: {triangulos(ob)} triángulos")
print(f"{SALIDA}: {os.path.getsize(SALIDA) / 1024 / 1024:.2f} MB")

# ---------- Vista previa opcional (render) ----------

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    escena.render.engine = "CYCLES"
    escena.cycles.samples = 48
    escena.render.resolution_x = 900
    escena.render.resolution_y = 1000
    escena.world = bpy.data.worlds.new("mundo")
    escena.world.use_nodes = True
    escena.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.06, 0.07, 0.09, 1)
    escena.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    for nombre_luz, energia, rot in [("clave", 3.0, (50, -20, -30)), ("relleno", 1.2, (60, 10, 140)),
                                     ("contra", 1.5, (110, 0, 180))]:
        luz = bpy.data.objects.new(nombre_luz, bpy.data.lights.new(nombre_luz, "SUN"))
        luz.data.energy = energia
        luz.rotation_euler = tuple(math.radians(a) for a in rot)
        escena.collection.objects.link(luz)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 85
    escena.collection.objects.link(cam)
    escena.camera = cam
    for nombre, ang, dist in [("frente", 0, 0.75), ("lado", 90, 0.75), ("atras", 180, 0.75), ("detalle", -25, 0.42)]:
        a = math.radians(ang)
        cam.location = centro + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.02))
        cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
        escena.render.filepath = os.path.join(PREVIEW, f"corazon_{nombre}.png")
        bpy.ops.render.render(write_still=True)
    print("Vista previa en", PREVIEW)
