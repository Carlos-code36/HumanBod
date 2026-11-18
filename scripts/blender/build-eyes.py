# Genera public/models/eyes.glb: ojos detallados (con la retina visible), procesados con Blender.
#
# Uso (Blender 4.2 o más nuevo, sin abrir la ventana):
#   blender -b --factory-startup -P scripts/blender/build-eyes.py -- <carpeta-obj> <partof_element_parts.txt> [--preview carpeta]
#
# Crédito: "BodyParts3D, © The Database Center for Life Science" — ver public/models/CREDITOS.md.
#
# Qué hace:
#  1. Mide en BodyParts3D la posición, el tamaño y la dirección de cada globo ocular (esclerótica y córnea).
#     Ojo: en BodyParts3D algunas piezas del ojo DERECHO traen geometría de los dos ojos; por eso los
#     vértices se reparten por lado del cuerpo antes de medir.
#  2. Construye un globo ocular limpio con esas medidas: esclerótica, córnea transparente, iris y pupila.
#  3. El órgano de la app es la RETINA (retinopatía diabética): la esclerótica tiene una ventana de corte en
#     el cuadrante superior interno y se ve la retina por dentro, con el disco óptico, la mácula y los vasos.
#  4. Contexto: los 6 músculos de cada ojo (BodyParts3D) y un nervio óptico reconstruido (BodyParts3D no lo
#     incluye) desde la parte de atrás del ojo hasta el vértice de la órbita, donde convergen los rectos.
#  5. Exporta .glb con un nodo "eyes" y una malla por tejido, cada una con su material.

import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(__file__))
from comun import (  # noqa: E402
    a_blender, activar, archivos, crear, exportar, hex_lineal, hornear, leer_obj, malla_liviana,
    material_simple, nodos, rampa, remallar, suave, triangulos, unir, vista_previa,
)

LIMBO = 0.0058      # radio de la córnea (m)
PUPILA = 0.0017     # radio de la pupila (m)
GROSOR = 0.0006     # grosor de la esclerótica (m)


def vertices(*fmas):
    return [Vector(a_blender(p)) for fj in archivos(*fmas) for p in leer_obj(fj)[0]]


esclera = vertices("FMA58271", "FMA58272")
cornea = vertices("FMA58239", "FMA58240")


# ---------- 1. Medidas de cada ojo ----------

def medir(lado):
    """Centro, radio y dirección de la mirada del ojo de un lado (+1 izquierdo, −1 derecho)."""
    vs = [v for v in esclera if v.x * lado > 0]
    centro = sum(vs, Vector()) / len(vs)
    radios = sorted((v - centro).length for v in vs)
    radio = radios[len(radios) // 2]
    cs = [v for v in cornea if v.x * lado > 0]
    eje = (sum(cs, Vector()) / len(cs) - centro).normalized()
    # Marco local: z = mirada, x = hacia afuera (lateral), y = z × x
    lateral = Vector((lado, 0, 0))
    x = (lateral - eje * lateral.dot(eje)).normalized()
    y = eje.cross(x)
    arriba = 1 if y.z > 0 else -1   # en el ojo derecho "y" apunta hacia abajo
    marco = Matrix((x, y, eje)).transposed().to_4x4()
    marco.translation = centro
    print(f"Ojo {'izquierdo' if lado > 0 else 'derecho'}: centro {tuple(round(c, 4) for c in centro)}, "
          f"radio {radio * 1000:.1f} mm, mirada {tuple(round(c, 2) for c in eje)}")
    return {"lado": lado, "centro": centro, "radio": radio, "eje": eje, "marco": marco, "arriba": arriba}


ojos = [medir(-1), medir(1)]


# ---------- 2. Piezas del globo (se construyen en el marco local del ojo: z = mirada) ----------

def objeto(nombre, bm, ojo):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = ojo["marco"]
    suave(ob)
    return ob


def fijar(ob):
    """Aplica la transformación: las mallas quedan en coordenadas del cuerpo (los nodos sin transformar)."""
    activar(ob)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def esfera(radio, u=96, v=48):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=radio)
    return bm


def en_ventana(d, ojo, margen=0.0):
    """
    Ventana de corte: cuadrante superior INTERNO (hacia la nariz), por delante del ecuador (d = dirección
    local; x = lateral). Interno porque la cámara de la app queda entre los dos ojos y ve cada uno desde el
    lado de la nariz: una ventana externa quedaba de espaldas.
    """
    return d.x < -0.05 + margen and d.y * ojo["arriba"] > 0.05 - margen and d.z > -0.2 - margen


def borrar_caras(bm, condicion):
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if condicion(f.calc_center_median().normalized())],
                     context="FACES")


def h_limbo(radio):
    return math.sqrt(radio ** 2 - LIMBO ** 2)


piezas = {"esclera": [], "cornea": [], "iris": [], "pupila": [], "retina": []}

for ojo in ojos:
    R, lado = ojo["radio"], ojo["lado"]
    sufijo = "izq" if lado > 0 else "der"
    hl = h_limbo(R)

    # Esclerótica: esfera sin la zona de la córnea y sin la ventana; luego se le da grosor hacia adentro.
    bm = esfera(R)
    borrar_caras(bm, lambda d: d.z > hl / R or en_ventana(d, ojo))
    ob = objeto(f"esclera_{sufijo}", bm, ojo)
    m = ob.modifiers.new("grosor", "SOLIDIFY")
    m.thickness = GROSOR
    m.offset = -1
    activar(ob)
    bpy.ops.object.modifier_apply(modifier=m.name)
    piezas["esclera"].append(ob)

    # Córnea: casquete de una esfera más curva (radio 7,8 mm) que se apoya en el limbo.
    rc = 0.0078
    cos_borde = math.sqrt(1 - (LIMBO / rc) ** 2)
    desplazamiento = hl - rc * cos_borde
    bm = esfera(rc, 64, 32)
    borrar_caras(bm, lambda d: d.z < cos_borde - 0.02)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, desplazamiento))
    piezas["cornea"].append(objeto(f"cornea_{sufijo}", bm, ojo))

    # Iris (disco) y pupila (disco negro un poco más grueso, asoma por las dos caras)
    for nombre, radio, alto in (("iris", LIMBO - 0.0003, 0.0003), ("pupila", PUPILA, 0.0005)):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=radio, radius2=radio, depth=alto)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, hl - 0.0009))
        piezas[nombre].append(objeto(f"{nombre}_{sufijo}", bm, ojo))

    # Retina: superficie interna (normales hacia adentro) de la mitad posterior, sin la ventana.
    bm = esfera(R - GROSOR - 0.0001)
    borrar_caras(bm, lambda d: d.z > 0.55 or en_ventana(d, ojo, margen=0.03))
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    piezas["retina"].append(objeto(f"retina_{sufijo}", bm, ojo))


# ---------- 3. Retina: fondo de ojo (material procedural + vasos como tubos) horneado ----------

import random  # noqa: E402

ANG_DISCO = math.radians(15)


def vasos_retina(ojo, rr):
    """
    Vasos de la retina como tubos finos apoyados en su cara interna (solo para hornear la textura):
    arcadas temporales que rodean la mácula y vasos nasales, cada uno con arteria (más clara y fina) y
    vena (más oscura y gruesa), con ramas. Se dibujan en un "mapa" plano del fondo de ojo (mm; u = temporal,
    v = arriba; mácula en el origen) y se proyectan sobre la esfera.
    """
    rnd = random.Random(7 if ojo["lado"] > 0 else 11)
    dd = rr * 1000 * ANG_DISCO   # distancia disco–mácula (mm)

    def a3d(u, v, hundir=0.00012):
        r = math.hypot(u, v) / 1000
        a = r / rr
        k = math.sin(a) / r if r > 1e-9 else 0
        return Vector((u / 1000 * k, v / 1000 * ojo["arriba"] * k, -math.cos(a))) * (rr - hundir)

    def bezier(p0, p1, p2, p3, n=28):
        pts = []
        for i in range(n + 1):
            t = i / n
            pts.append(tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
                             for a, b, c, d in zip(p0, p1, p2, p3)))
        return pts

    trazos = []   # (puntos 2D, radio en mm, es_vena)

    def rama(pts, radio, vena, nivel):
        trazos.append((pts, radio, vena))
        if nivel == 0:
            return
        for t in (0.3, 0.5, 0.7, 0.88):
            i = int(t * (len(pts) - 1))
            x, y = pts[i]
            dx, dy = pts[min(i + 1, len(pts) - 1)][0] - x, pts[min(i + 1, len(pts) - 1)][1] - y
            # Sale hacia afuera de la mácula, desviada al azar
            afuera = math.atan2(y, x) + rnd.uniform(-0.5, 0.5)
            largo = rnd.uniform(2.0, 4.5) * (0.8 if nivel == 1 else 1.0)
            dir_ = math.atan2(dy, dx) * 0.4 + afuera * 0.6
            fin = (x + math.cos(dir_) * largo, y + math.sin(dir_) * largo)
            medio = ((x + fin[0]) / 2 + rnd.uniform(-0.4, 0.4), (y + fin[1]) / 2 + rnd.uniform(-0.4, 0.4))
            rama(bezier((x, y), medio, medio, fin, 12), radio * 0.62, vena, nivel - 1)

    for s_ in (1, -1):
        caminos = [
            ((-dd, s_ * 0.3), (-dd + 1.5, s_ * 3.6), (3.5, s_ * 5.2), (11.0, s_ * 4.2)),    # arcada temporal
            ((-dd, s_ * 0.3), (-dd - 0.8, s_ * 3.0), (-dd - 2.5, s_ * 6.0), (-dd - 5.5, s_ * 10.0)),  # nasal
            ((-dd, s_ * 0.1), (-dd - 3.0, s_ * 0.6), (-dd - 6.0, s_ * 1.2), (-dd - 9.5, s_ * 2.2)),   # nasal horizontal
        ]
        for c in caminos:
            for vena, desp, radio in ((False, 0.0, 0.085), (True, 0.38, 0.12)):
                cc = [(x + desp * 0.3, y + s_ * desp) for x, y in c]
                cc[0] = c[0]
                rama(bezier(*cc), radio, vena, 2)

    objetos = {False: [], True: []}
    for pts, radio, vena in trazos:
        curva = bpy.data.curves.new("vaso", "CURVE")
        curva.dimensions = "3D"
        curva.bevel_depth = radio / 1000
        curva.bevel_resolution = 1
        sp = curva.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, (u, v) in zip(sp.points, pts):
            co = a3d(u, v, hundir=radio / 1000 + 0.00003)
            p.co = (co.x, co.y, co.z, 1)
        ob = bpy.data.objects.new("vaso", curva)
        bpy.context.scene.collection.objects.link(ob)
        ob.matrix_world = ojo["marco"]
        objetos[vena].append(ob)
    resultado = []
    for vena, obs in objetos.items():
        bpy.ops.object.select_all(action="DESELECT")
        for o in obs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        bpy.ops.object.convert(target="MESH")
        junto = unir(list(bpy.context.selected_objects), "venas_retina" if vena else "arterias_retina")
        junto.data.materials.clear()
        material_simple(junto, "vena_retina" if vena else "arteria_retina", "#6e1216" if vena else "#c23a2d", 0.4)
        resultado.append(junto)
    print(f"  vasos de la retina: {len(trazos)} trazos")
    return resultado


def material_retina(ojo):
    """Fondo de ojo: naranja rojizo, disco óptico pálido (nasal) y mácula oscura (centro). Los vasos se dibujan aparte."""
    R = ojo["radio"]
    disco = Vector((-math.sin(ANG_DISCO), 0, -math.cos(ANG_DISCO))) * R   # nasal = −x local
    macula = Vector((0, 0, -1)) * R
    m = bpy.data.materials.new(f"retina_procedural_{ojo['lado']}")
    n, l, bsdf, coord = nodos(m)

    def distancia_a(punto):
        resta = n.new("ShaderNodeVectorMath")
        resta.operation = "DISTANCE"
        resta.inputs[1].default_value = punto
        l.new(coord.outputs["Object"], resta.inputs[0])
        return resta.outputs["Value"]

    # Fondo con variación suave
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 300
    l.new(coord.outputs["Object"], ruido.inputs["Vector"])
    fondo = rampa(n, l, ruido.outputs["Fac"], "#b8401f", "#d8622c")
    color = fondo.outputs["Color"]

    def mezclar(color_actual, factor, rgba):
        mz = n.new("ShaderNodeMix")
        mz.data_type = "RGBA"
        mz.inputs[7].default_value = rgba
        l.new(factor, mz.inputs["Factor"])
        l.new(color_actual, mz.inputs[6])
        return mz.outputs[2]

    def mancha(punto, radio, borde):
        """1 dentro del radio, 0 fuera, con transición suave."""
        mr = n.new("ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = radio
        mr.inputs["From Max"].default_value = radio + borde
        mr.inputs["To Min"].default_value = 1.0
        mr.inputs["To Max"].default_value = 0.0
        l.new(distancia_a(punto), mr.inputs["Value"])
        return mr.outputs["Result"]

    color = mezclar(color, mancha(macula, 0.0007, 0.0013), hex_lineal("#82301a"))
    color = mezclar(color, mancha(disco, 0.0008, 0.0004), hex_lineal("#f3d6a0"))
    l.new(color, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.55
    return m


retinas = []
for ojo, alto in zip(ojos, piezas["retina"]):
    alto.name = alto.data.name = alto.name + "_alto"
    nombre = "retina_derecha" if ojo["lado"] < 0 else "retina_izquierda"
    bajo = malla_liviana(alto, nombre, 10 ** 6)
    alto.data.materials.append(material_retina(ojo))
    rr = ojo["radio"] - GROSOR - 0.0001
    alto = unir([alto, *vasos_retina(ojo, rr)], alto.name)
    hornear(alto, bajo, rugosidad=0.55, distancia_mm=0.6, resolucion=1024)
    fijar(bajo)
    retinas.append(bajo)

for clave in ("esclera", "cornea", "iris", "pupila"):
    for ob in piezas[clave]:
        fijar(ob)


# ---------- 4. Esclerótica con vasitos (horneada) ----------

escleroticas_alto = unir(piezas["esclera"], "escleroticas_alto")
m = bpy.data.materials.new("esclera_procedural")
n, l, bsdf, coord = nodos(m)
ruido = n.new("ShaderNodeTexNoise")
ruido.inputs["Scale"].default_value = 400
l.new(coord.outputs["Object"], ruido.inputs["Vector"])
base = rampa(n, l, ruido.outputs["Fac"], "#eee6dc", "#f8f3ec")
deform = n.new("ShaderNodeTexNoise")
deform.inputs["Scale"].default_value = 250
mv = n.new("ShaderNodeMix")
mv.data_type = "VECTOR"
mv.inputs["Factor"].default_value = 0.001
l.new(coord.outputs["Object"], mv.inputs[4])
l.new(deform.outputs["Color"], mv.inputs[5])
vasitos = n.new("ShaderNodeTexVoronoi")
vasitos.feature = "DISTANCE_TO_EDGE"
vasitos.inputs["Scale"].default_value = 220
l.new(mv.outputs[1], vasitos.inputs["Vector"])
linea = n.new("ShaderNodeMapRange")
linea.inputs["From Max"].default_value = 0.02
linea.inputs["To Min"].default_value = 0.35
linea.inputs["To Max"].default_value = 0.0
l.new(vasitos.outputs["Distance"], linea.inputs["Value"])
mz = n.new("ShaderNodeMix")
mz.data_type = "RGBA"
mz.inputs[7].default_value = hex_lineal("#c2464a")
l.new(linea.outputs["Result"], mz.inputs["Factor"])
l.new(base.outputs["Color"], mz.inputs[6])
l.new(mz.outputs[2], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.35
# La copia liviana se hace ANTES de asignar el material procedural (si no, la copia se queda con él).
escleroticas = malla_liviana(escleroticas_alto, "escleroticas", 10 ** 6)
escleroticas_alto.data.materials.append(m)
hornear(escleroticas_alto, escleroticas, rugosidad=0.35, distancia_mm=0.4, resolucion=1024)


# ---------- 5. Córnea, iris, pupila ----------

corneas = unir(piezas["cornea"], "corneas")
iris = unir(piezas["iris"], "iris")
pupilas = unir(piezas["pupila"], "pupilas")
mat_c = material_simple(corneas, "cornea", "#dff1ff", 0.04)
mat_c.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.18
mat_c.surface_render_method = "BLENDED"
material_simple(iris, "iris", "#6a4526", 0.6)
material_simple(pupilas, "pupila", "#050505", 0.2)


# ---------- 6. Músculos y nervio óptico ----------

musculos = crear("musculos", archivos(
    "FMA49044", "FMA49045", "FMA49046", "FMA49047", "FMA49054", "FMA49055",
    "FMA49056", "FMA49057", "FMA49050", "FMA49051", "FMA49052", "FMA49053"))
remallar(musculos, 0.4, suavizado=6, objetivo=9000)


def en_corte(co):
    """Músculo que pasa por delante de la ventana (cerca del globo y en su dirección): se recorta."""
    for ojo in ojos:
        local = ojo["marco"].inverted() @ co
        if local.length < ojo["radio"] + 0.004 and en_ventana(local.normalized(), ojo, margen=0.05):
            return True
    return False


bm = bmesh.new()
bm.from_mesh(musculos.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if en_corte(f.calc_center_median())], context="FACES")
bm.to_mesh(musculos.data)
bm.free()
suave(musculos)
material_simple(musculos, "musculo", "#a8473f", 0.5)

nervios = []
for ojo in ojos:
    lado = ojo["lado"]
    # Vértice de la órbita: el punto más posterior de los cuatro rectos de ese ojo
    rectos = {1: ("FMA49045", "FMA49047", "FMA49055", "FMA49057"), -1: ("FMA49044", "FMA49046", "FMA49054", "FMA49056")}
    vs = sorted(vertices(*rectos[lado]), key=lambda v: v.y, reverse=True)  # +Y = hacia atrás
    vertice = sum(vs[:max(20, len(vs) // 50)], Vector()) / max(20, len(vs) // 50)
    inicio = ojo["centro"] - ojo["eje"] * (ojo["radio"] - 0.001)
    # Leve curva (el nervio no es recto): punto medio desplazado hacia abajo
    medio = (inicio + vertice) / 2 + Vector((0, 0, -0.002))
    curva = bpy.data.curves.new(f"nervio_optico_{lado}", "CURVE")
    curva.dimensions = "3D"
    curva.bevel_depth = 0.0018
    curva.bevel_resolution = 4
    curva.use_fill_caps = True
    sp = curva.splines.new("BEZIER")
    sp.bezier_points.add(2)
    for p, co in zip(sp.bezier_points, (inicio, medio, vertice)):
        p.co = co
        p.handle_left_type = p.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(curva.name, curva)
    bpy.context.scene.collection.objects.link(ob)
    activar(ob)
    bpy.ops.object.convert(target="MESH")
    nervios.append(bpy.context.view_layer.objects.active)
nervio = unir(nervios, "nervios_opticos")
suave(nervio)
material_simple(nervio, "nervio_optico", "#e9dcb8", 0.5)


# ---------- 7. Exportar ----------

exportar("eyes", [escleroticas, *retinas, corneas, iris, pupilas, musculos, nervio], "eyes.glb")
centro = (ojos[0]["centro"] + ojos[1]["centro"]) / 2
vista_previa("ojos", centro, 0.09, [("frente", 0, 1.0), ("lado", 70, 0.8), ("arriba", 20, 0.9, 50),
                                    ("detalle", 35, 0.45, 15)])
