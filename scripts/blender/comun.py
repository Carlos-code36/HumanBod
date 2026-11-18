# Funciones comunes para generar órganos detallados con Blender a partir de BodyParts3D.
# Lo usan build-heart.py, build-liver.py, etc. (se importa desde la misma carpeta).
#
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.

import bpy
import bmesh
import math
import os
import sys
from collections import defaultdict
from mathutils import Vector

TEXTURA = 2048
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# ---------- Argumentos ----------

_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(_args) < 2:
    print("Uso: blender -b --factory-startup -P scripts/blender/build-<órgano>.py -- "
          "<carpeta-obj> <partof_element_parts.txt> [--preview carpeta]")
    sys.exit(1)
CARPETA_OBJ, ARCHIVO_PARTES = _args[0], _args[1]
PREVIEW = _args[_args.index("--preview") + 1] if "--preview" in _args else None


def salida(nombre_archivo):
    return os.path.join(RAIZ, "public", "models", nombre_archivo)


# ---------- Lectura de BodyParts3D ----------

conceptos = defaultdict(list)
nombres = {}
with open(ARCHIVO_PARTES, encoding="utf8") as _f:
    next(_f)
    for _linea in _f:
        _c, _n, _fj = _linea.rstrip("\n").split("\t")
        conceptos[_c].append(_fj)
        nombres[_c] = _n


def archivos(*fmas, menos=()):
    """Archivos FJ de los conceptos FMA, sin los de `menos` y sin repetir."""
    quitar = {fj for c in menos for fj in conceptos[c]}
    out = []
    for c in fmas:
        if not conceptos[c]:
            raise RuntimeError(f"No hay archivos para {c}")
        out += [fj for fj in conceptos[c] if fj not in quitar and fj not in out]
    if not out:
        raise RuntimeError(f"Selección vacía: {fmas} menos {menos}")
    return out


def nombre_especifico(fj):
    """Nombre del concepto más específico (el de menos elementos) que contiene el archivo."""
    return nombres[min((c for c in conceptos if fj in conceptos[c]), key=lambda c: len(conceptos[c]))]


def leer_obj(fj):
    pos, caras = [], []
    with open(os.path.join(CARPETA_OBJ, fj + ".obj")) as f:
        for linea in f:
            if linea.startswith("v "):
                pos.append(tuple(map(float, linea.split()[1:4])))
            elif linea.startswith("f "):
                caras.append([int(t.split("/")[0]) - 1 for t in linea.split()[1:]])
    if not pos or not caras:
        raise RuntimeError(f"OBJ vacío: {fj}")
    return pos, caras


# ---------- Transformación (idéntica a scripts/build-anatomy.mjs) ----------

_piel = [p for fj in archivos("FMA7163") for p in leer_obj(fj)[0]]
_cx = (min(p[0] for p in _piel) + max(p[0] for p in _piel)) / 2
_cy = (min(p[1] for p in _piel) + max(p[1] for p in _piel)) / 2
_zmin = min(p[2] for p in _piel)
_rinon = [p for fj in archivos("FMA7204") for p in leer_obj(fj)[0]]
SX = -1 if sum(p[0] for p in _rinon) / len(_rinon) - _cx > 0 else 1
del _piel, _rinon


def a_blender(p):
    # App (glTF, Y arriba): (sx(x−cx), z−zmin, −(y−cy)) / 1000.  El exportador de Blender convierte
    # Z arriba → Y arriba con (x, y, z) → (x, z, −y); por eso en Blender va (sx(x−cx), y−cy, z−zmin).
    # En Blender: +X = izquierda del paciente, −Y = hacia adelante (la cara), +Z = arriba.
    return (SX * (p[0] - _cx) / 1000, (p[1] - _cy) / 1000, (p[2] - _zmin) / 1000)


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
    """Mueve cada vértice hacia afuera (o hacia adentro, si mm < 0) según su normal."""
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


def recortar(ob, dentro=None, z_min=None, z_max=None):
    """Corta con planos horizontales y/o borra lo que queda fuera de una región; tapa los agujeros."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for z, abajo in ((z_min, True), (z_max, False)):
        if z is not None:
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-6,
                                   plane_co=(0, 0, z), plane_no=(0, 0, 1),
                                   clear_inner=abajo, clear_outer=not abajo)
    if dentro:
        fuera = [v for v in bm.verts if not dentro(v.co)]
        bmesh.ops.delete(bm, geom=fuera, context="VERTS")
    bordes = [e for e in bm.edges if e.is_boundary]
    if bordes:
        bmesh.ops.holes_fill(bm, edges=bordes, sides=0)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def triangulos(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def diezmar(ob, objetivo):
    actuales = triangulos(ob)
    if actuales > objetivo:
        aplicar(ob, "DECIMATE", ratio=objetivo / actuales)


def remallar(ob, voxel_mm, suavizado=0, objetivo=None):
    """Remallado por vóxeles: une piezas sueltas en una sola superficie cerrada y limpia."""
    aplicar(ob, "REMESH", mode="VOXEL", voxel_size=voxel_mm / 1000, adaptivity=0.0)
    if suavizado:
        aplicar(ob, "CORRECTIVE_SMOOTH", iterations=suavizado, smooth_type="SIMPLE", use_only_smooth=True)
    if objetivo:
        diezmar(ob, objetivo)


def suave(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def vaso(nombre, fjs, voxel_mm=0.6, objetivo=5000, engrosar_mm=0.0, dentro=None, z_min=None, z_max=None):
    """Vaso o conducto: recorte opcional, remallado y sombreado suave."""
    ob = crear(nombre, fjs)
    if dentro or z_min is not None or z_max is not None:
        recortar(ob, dentro, z_min, z_max)
    if engrosar_mm:
        engrosar(ob, engrosar_mm)
    remallar(ob, voxel_mm, suavizado=6, objetivo=objetivo)
    suave(ob)
    return ob


def tubo_por_eje(nombre, fjs, radio_mm, paso_mm=4.0, z_min=None):
    """
    Tubo que sigue el eje de un conducto (uréter, por ejemplo). Sirve cuando la malla original está
    abierta o rota y el remallado la pierde: se corta en franjas horizontales, se toma el centro de cada
    franja, se suaviza esa línea y se barre un círculo a lo largo de ella.
    """
    tmp = crear(nombre + "_tmp", fjs)
    puntos = [v.co.copy() for v in tmp.data.vertices if z_min is None or v.co.z >= z_min]
    bpy.data.objects.remove(tmp)
    paso = paso_mm / 1000
    franjas = defaultdict(list)
    for p in puntos:
        franjas[round(p.z / paso)].append(p)
    eje = [sum(ps, Vector()) / len(ps) for _, ps in sorted(franjas.items(), reverse=True)]
    # Promedio móvil de 5 franjas: quita los saltos donde el conducto se ensancha (pelvis renal).
    suave_eje = [sum(eje[max(0, i - 2):i + 3], Vector()) / len(eje[max(0, i - 2):i + 3]) for i in range(len(eje))]
    curva = bpy.data.curves.new(nombre, "CURVE")
    curva.dimensions = "3D"
    curva.bevel_depth = radio_mm / 1000
    curva.bevel_resolution = 3
    curva.use_fill_caps = True
    spline = curva.splines.new("POLY")
    spline.points.add(len(suave_eje) - 1)
    for punto, co in zip(spline.points, suave_eje):
        punto.co = (co.x, co.y, co.z, 1)
    ob = bpy.data.objects.new(nombre, curva)
    bpy.context.scene.collection.objects.link(ob)
    activar(ob)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = nombre
    suave(ob)
    return ob


def centro_de(ob):
    return sum((v.co for v in ob.data.vertices), Vector()) / len(ob.data.vertices)


# ---------- Materiales ----------

def hex_lineal(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (1.0,)


def material_simple(ob, nombre, color, rugosidad):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_lineal(color)
    bsdf.inputs["Roughness"].default_value = rugosidad
    ob.data.materials.append(m)
    return m


def nodos(material):
    """Atajo para construir materiales procedurales: (nodos, enlaces, bsdf, coordenadas)."""
    material.use_nodes = True
    n, l = material.node_tree.nodes, material.node_tree.links
    return n, l, n["Principled BSDF"], n.new("ShaderNodeTexCoord")


def rampa(n, l, entrada, color_a, color_b):
    r = n.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].color = hex_lineal(color_a)
    r.color_ramp.elements[1].color = hex_lineal(color_b)
    l.new(entrada, r.inputs["Fac"])
    return r


# ---------- Horneado: alto detalle + relieve procedural → malla liviana con texturas ----------

def malla_liviana(alto, nombre, objetivo):
    """Copia diezmada de la malla de alto detalle, con UV para hornear."""
    bajo = alto.copy()
    bajo.data = alto.data.copy()
    bajo.name = bajo.data.name = nombre
    bpy.context.scene.collection.objects.link(bajo)
    diezmar(bajo, objetivo)
    suave(bajo)
    suave(alto)
    activar(bajo)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")
    return bajo


def hornear(alto, bajo, rugosidad, distancia_mm=6.0, resolucion=TEXTURA):
    """Hornea color y normales del material de `alto` sobre `bajo`; borra `alto`."""
    def imagen(nombre, no_color):
        img = bpy.data.images.new(nombre, resolucion, resolucion, alpha=False, float_buffer=no_color)
        if no_color:
            img.colorspace_settings.name = "Non-Color"
        return img

    mat = bpy.data.materials.new(bajo.name)
    mat.use_nodes = True
    nb = mat.node_tree.nodes
    bsdf = nb["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rugosidad
    bajo.data.materials.append(mat)
    img_color = imagen(f"{bajo.name}_color", False)
    img_normal = imagen(f"{bajo.name}_normal", True)
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
    escena.render.bake.cage_extrusion = distancia_mm / 2000
    escena.render.bake.max_ray_distance = distancia_mm / 1000
    escena.render.bake.margin = 8

    bpy.ops.object.select_all(action="DESELECT")
    alto.select_set(True)
    bajo.select_set(True)
    bpy.context.view_layer.objects.active = bajo
    for img, nodo, tipo, extra in [(img_color, nodo_color, "DIFFUSE", {"pass_filter": {"COLOR"}}),
                                   (img_normal, nodo_normal, "NORMAL", {})]:
        nb.active = nodo
        nodo_color.select = nodo is nodo_color
        nodo_normal.select = nodo is nodo_normal
        print(f"Horneando {img.name}…")
        bpy.ops.object.bake(type=tipo, **extra)

    if PREVIEW:  # para revisar el horneado
        os.makedirs(PREVIEW, exist_ok=True)
        for img in (img_color, img_normal):
            img.save_render(os.path.join(PREVIEW, f"{img.name}.png"))

    l = mat.node_tree.links
    l.new(nodo_color.outputs["Color"], bsdf.inputs["Base Color"])
    l.new(nodo_normal.outputs["Color"], mapa_n.inputs["Color"])
    l.new(mapa_n.outputs["Normal"], bsdf.inputs["Normal"])
    bpy.data.objects.remove(alto)
    for attr in list(bajo.data.color_attributes):
        bajo.data.color_attributes.remove(attr)


# ---------- Exportar y vista previa ----------

def exportar(nombre_nodo, piezas, archivo):
    """Exporta un .glb con un nodo vacío `nombre_nodo` y las piezas como hijas."""
    ruta = salida(archivo)
    raiz = bpy.data.objects.new(nombre_nodo, None)
    bpy.context.scene.collection.objects.link(raiz)
    for ob in piezas:
        ob.parent = raiz
        ob.data.name = ob.name
        ob.data.validate()  # quita caras degeneradas que deja el diezmado
    for ob in list(bpy.data.objects):
        if ob not in piezas and ob is not raiz:
            bpy.data.objects.remove(ob)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=ruta,
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
    print(f"{ruta}: {os.path.getsize(ruta) / 1024 / 1024:.2f} MB")


def vista_previa(prefijo, centro, tamano_m, vistas=None):
    """Renders de control (Cycles). `vistas`: (nombre, ángulo alrededor de Z, distancia relativa[, elevación])."""
    if not PREVIEW:
        return
    vistas = vistas or [("frente", 0, 1.0), ("lado", 90, 1.0), ("atras", 180, 1.0), ("detalle", -25, 0.56)]
    os.makedirs(PREVIEW, exist_ok=True)
    escena = bpy.context.scene
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
    base = tamano_m * 5.2  # con lente de 85 mm el órgano ocupa ~40 % del cuadro
    for nombre, ang, rel, *elev in vistas:
        a = math.radians(ang)
        e = math.radians(elev[0]) if elev else 0.0  # elevación: negativa = desde abajo
        d = base * rel
        cam.location = centro + Vector((math.sin(a) * d * math.cos(e), -math.cos(a) * d * math.cos(e),
                                        0.02 + d * math.sin(e)))
        cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
        escena.render.filepath = os.path.join(PREVIEW, f"{prefijo}_{nombre}.png")
        bpy.ops.render.render(write_still=True)
    print("Vista previa en", PREVIEW)
