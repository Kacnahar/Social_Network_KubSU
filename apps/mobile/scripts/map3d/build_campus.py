# Строит 3D-модель территории в Blender и сохраняет её в .glb для приложения.
# Запуск из apps/mobile:
#   /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/map3d/build_campus.py
# Вход:  scripts/map3d/campus.json (контуры из OpenStreetMap, готовит scripts/map3d-osm.mjs)
# Выход: public/map3d/campus.glb, src/features/map3d/data/model.json, картинки-превью в scripts/map3d/out/
#
# Координаты данных: x — восток, z — юг, метры. В Blender: (x, -z, высота).
# Формы и цвета фасадов сверены с уличными панорамами виртуального тура; сами картинки тура не используются.
import bpy, json, math, os, random, sys
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT_DIR = os.path.join(HERE, 'out')
TEX_DIR = os.path.join(HERE, 'tex')
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(TEX_DIR, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'public', 'map3d'), exist_ok=True)

DATA = json.load(open(os.path.join(HERE, 'campus.json')))
rnd = random.Random(149)

MAIN_LEVEL = 3.6   # высота этажа учебного корпуса (типовая; точной в источниках нет)
# Северная часть главного корпуса: внутри построены пять этажей на тех же высотах, что этажи главного корпуса (4,03 м — шаг
# парадной лестницы). Снаружи этаж такой же высоты, иначе крыша оказалась бы ниже потолка пятого этажа и резала бы коридор.
NORTH_LEVEL = 4.03
LEVEL = 3.0        # высота этажа остальных зданий

# ---------------------------------------------------------------- помощники геометрии

def pts(flat):
    return [(flat[i], flat[i + 1]) for i in range(0, len(flat), 2)]

def W(x, z, h=0.0):
    """Точка данных (x, z, высота) -> точка Blender"""
    return Vector((x, -z, h))

def area2(poly):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))

def inside(p, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        a, b = poly[i], poly[j]
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]:
            c = not c
        j = i
    return c

def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))

def triangulate(poly):
    """Простое «отрезание ушей» для контуров без дыр"""
    idx = list(range(len(poly)))
    if area2(poly) < 0:
        idx.reverse()
    tris = []
    guard = 0
    while len(idx) > 3 and guard < 10000:
        guard += 1
        n = len(idx)
        cut = False
        for k in range(n):
            i0, i1, i2 = idx[(k - 1) % n], idx[k], idx[(k + 1) % n]
            a, b, c = poly[i0], poly[i1], poly[i2]
            cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            if cross <= 1e-9:
                continue
            ok = True
            for m in idx:
                if m in (i0, i1, i2):
                    continue
                p = poly[m]
                d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
                d2 = (c[0] - b[0]) * (p[1] - b[1]) - (c[1] - b[1]) * (p[0] - b[0])
                d3 = (a[0] - c[0]) * (p[1] - c[1]) - (a[1] - c[1]) * (p[0] - c[0])
                if d1 >= 0 and d2 >= 0 and d3 >= 0:
                    ok = False
                    break
            if ok:
                tris.append((i0, i1, i2))
                idx.pop(k)
                cut = True
                break
        if not cut:
            break
    if len(idx) == 3:
        tris.append(tuple(idx))
    return tris


# Высоты слоёв земли, метры. Между слоями, которые могут лежать друг на друге, не меньше 4 см:
# при меньшем зазоре телефон издалека не различает, какой слой выше, и поверхность мигает.
H_PAVING = 0.00      # серая плитка — основа всей территории
H_ASPHALT = 0.04     # проезды и парковки
H_WALK = 0.08        # пешеходные дорожки (поверх асфальта)
H_PLAZA = 0.12       # цветная плитка площади (поверх дорожек: на площади рисунок плитки не прерывается)
H_GRASS = 0.16       # газоны
H_ON_GRASS = 0.20    # дорожки и площадки, проложенные поверх газона
H_MARK = 0.04        # разметка — на столько выше своей поверхности


# Журнал для проверки (--audit): что и куда поставлено, какие слои земли где лежат
AUDIT = {'items': [], 'ground': []}


class Builder:
    """Копит грани по материалам и превращает их в один объект Blender"""

    def __init__(self, name):
        self.name = name
        self.verts, self.faces, self.mats, self.uvs = [], [], [], []
        self.mat_names = []

    def _mat(self, name):
        if name not in self.mat_names:
            self.mat_names.append(name)
        return self.mat_names.index(name)

    def face(self, mat, points, hint, uv_scale=1.0):
        """Грань из точек Blender; hint — куда должна смотреть лицевая сторона"""
        points = [Vector(p) for p in points]
        normal = (points[1] - points[0]).cross(points[2] - points[0])
        if normal.dot(Vector(hint)) < 0:
            points.reverse()
            normal = -normal
        normal.normalize()
        base = len(self.verts)
        self.verts.extend(points)
        self.faces.append(tuple(range(base, base + len(points))))
        self.mats.append(self._mat(mat))
        if abs(normal.z) > 0.7:
            self.uvs.extend([(p.x / uv_scale, p.y / uv_scale) for p in points])
        else:
            tangent = Vector((-normal.y, normal.x, 0)).normalized()
            self.uvs.extend([(p.dot(tangent) / uv_scale, p.z / uv_scale) for p in points])

    def flat(self, mat, poly, h, uv_scale=1.0):
        if self.name == 'ground':
            AUDIT['ground'].append((mat, h, list(poly)))
        for i, j, k in triangulate(poly):
            self.face(mat, [W(*poly[i], h), W(*poly[j], h), W(*poly[k], h)], (0, 0, 1), uv_scale)

    def box(self, mat, o, u, n, lu, ln, h0, h1, uv_scale=1.0, top=True, bottom=False):
        """Брусок: o — угол (x, z), u и n — единичные направления по земле, lu и ln — размеры, h0..h1 — высоты"""
        c = [(o[0], o[1]), (o[0] + u[0] * lu, o[1] + u[1] * lu),
             (o[0] + u[0] * lu + n[0] * ln, o[1] + u[1] * lu + n[1] * ln), (o[0] + n[0] * ln, o[1] + n[1] * ln)]
        mid = centroid(c)
        for a, b in zip(c, c[1:] + c[:1]):
            m = ((a[0] + b[0]) / 2 - mid[0], (a[1] + b[1]) / 2 - mid[1])
            self.face(mat, [W(*a, h0), W(*b, h0), W(*b, h1), W(*a, h1)], (m[0], -m[1], 0), uv_scale)
        if top:
            self.face(mat, [W(*c[0], h1), W(*c[1], h1), W(*c[2], h1), W(*c[3], h1)], (0, 0, 1), uv_scale)
        if bottom:
            self.face(mat, [W(*c[0], h0), W(*c[1], h0), W(*c[2], h0), W(*c[3], h0)], (0, 0, -1), uv_scale)

    def ribbon(self, mat, line, width, h, uv_scale=1.0):
        half = width / 2
        for a, b in zip(line, line[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            if L < 1e-6:
                continue
            ox, oz = -(b[1] - a[1]) / L * half, (b[0] - a[0]) / L * half
            self.flat(mat, [(a[0] + ox, a[1] + oz), (b[0] + ox, b[1] + oz), (b[0] - ox, b[1] - oz), (a[0] - ox, a[1] - oz)], h, uv_scale)
        # Круглая накладка в каждой точке, включая концы: без неё на поворотах и там, где одна дорога
        # продолжает другую, остаются «откушенные» углы. Радиус чуть больше полуширины — многоугольник покрывает круг.
        if width >= 1.0:
            r = half / math.cos(math.pi / 16)
            for p in line:
                self.flat(mat, [(p[0] + math.cos(t / 16 * math.tau) * r, p[1] + math.sin(t / 16 * math.tau) * r) for t in range(16)], h, uv_scale)

    def add_mesh(self, mat, verts, faces, hint_center=None):
        """Готовая фигура (например, шар кроны): вершины Blender и грани"""
        base = len(self.verts)
        mi = self._mat(mat)
        for f in faces:
            ps = [Vector(verts[i]) for i in f]
            self.verts.extend(ps)
            self.faces.append(tuple(range(len(self.verts) - len(ps), len(self.verts))))
            self.mats.append(mi)
            self.uvs.extend([(p.x, p.z) for p in ps])

    def build(self, smooth=False):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata([tuple(v) for v in self.verts], [], self.faces)
        for name in self.mat_names:
            mesh.materials.append(MATERIALS[name])
        mesh.polygons.foreach_set('material_index', self.mats)
        layer = mesh.uv_layers.new(name='UVMap')
        flat = [c for uv in self.uvs for c in uv]
        layer.data.foreach_set('uv', flat)
        if smooth:
            mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
        mesh.update()
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj

PARTS = {}

class Part:
    """Интерьер — отдельными объектами (холл, лестница, коридоры каждого этажа): приложение прячет те,
    что сейчас не видны, и телефону не приходится рисовать их зря. Наружные материалы (стены пристройки,
    стекло фасада) остаются в общем объекте зданий — они видны с улицы всегда."""

    def __init__(self, main, name, whole=False):
        self.main = main
        self.part = PARTS.setdefault(name, Builder(name))
        self.whole = whole          # коридоры и лестница целиком внутри здания: в часть уходит всё, включая ручки, перила и цифры на табличках

    def _to(self, mat):
        return self.part if self.whole or mat in INDOOR or mat == 'hall_light' else self.main

    def face(self, mat, *args, **kw):
        return self._to(mat).face(mat, *args, **kw)

    def box(self, mat, *args, **kw):
        return self._to(mat).box(mat, *args, **kw)

    def add_mesh(self, mat, *args, **kw):
        return self._to(mat).add_mesh(mat, *args, **kw)

# ---------------------------------------------------------------- текстуры (рисуем сами, чужих не берём)

def save_image(name, rgb):
    """rgb: массив (h, w, 3) в 0..1 -> PNG и картинка Blender"""
    h, w, _ = rgb.shape
    rgba = np.concatenate([rgb, np.ones((h, w, 1))], axis=2).astype(np.float32)
    image = bpy.data.images.new(name, w, h, alpha=False)
    image.pixels.foreach_set(rgba.reshape(-1))
    image.filepath_raw = os.path.join(TEX_DIR, name + '.png')
    image.file_format = 'PNG'
    image.save()
    return image

def noise(size, seed, octaves=5):
    rng = np.random.default_rng(seed)
    out = np.zeros((size, size))
    for o in range(octaves):
        n = 2 ** (o + 2)
        grid = rng.random((n, n))
        reps = size // n
        up = np.kron(grid, np.ones((reps, reps)))
        # сглаживание, чтобы не было квадратиков; сдвиги по кругу — текстура повторяется без швов
        for _ in range(2):
            up = (up + np.roll(up, reps // 2, 0) + np.roll(up, reps // 2, 1) + np.roll(up, (reps // 2, reps // 2), (0, 1))) / 4
        out += up / (2 ** o)
    out -= out.min()
    return out / out.max()

def tex_grass():
    n = noise(512, 1)[..., None]
    fine = np.random.default_rng(2).random((512, 512, 1))
    base = np.array([0.30, 0.45, 0.20]) * (0.93 + 0.12 * n) + (fine - 0.5) * 0.06
    return save_image('grass', np.clip(base, 0, 1))

def tex_asphalt():
    n = noise(512, 3)[..., None]
    fine = np.random.default_rng(4).random((512, 512, 1))
    base = np.array([0.42, 0.42, 0.43]) * (0.9 + 0.15 * n) + (fine - 0.5) * 0.08
    return save_image('asphalt', np.clip(base, 0, 1))

def tex_paving():
    """Обычная серая плитка 40x40 см; картинка покрывает 2x2 метра"""
    size, cells = 512, 5
    rng = np.random.default_rng(5)
    img = np.zeros((size, size, 3))
    step = size / cells
    yy, xx = np.mgrid[0:size, 0:size]
    cx, cy = (xx // step).astype(int), (yy // step).astype(int)
    tone = rng.random((cells, cells))[cy % cells, cx % cells]
    img[:] = np.array([0.72, 0.70, 0.66])
    img *= (0.92 + 0.12 * tone)[..., None]
    grout = ((xx % step) < 2.5) | ((yy % step) < 2.5)
    img[grout] = [0.52, 0.50, 0.47]
    img += (np.random.default_rng(6).random((size, size, 1)) - 0.5) * 0.04
    return save_image('paving', np.clip(img, 0, 1))

def tex_plaza():
    """Цветная плитка площади: розовые, жёлтые и серые квадраты с ромбами на стыках — как на панораме у входа"""
    size, cells = 512, 4
    img = np.zeros((size, size, 3))
    step = size / cells
    yy, xx = np.mgrid[0:size, 0:size]
    cx, cy = (xx // step).astype(int), (yy // step).astype(int)
    pink, sand, grey = np.array([0.62, 0.47, 0.45]), np.array([0.74, 0.68, 0.52]), np.array([0.70, 0.69, 0.66])
    pick = (cx + cy) % 2
    img[pick == 0] = pink
    img[pick == 1] = sand
    # ромбы на перекрёстках
    dx = np.minimum(xx % step, step - xx % step)
    dy = np.minimum(yy % step, step - yy % step)
    img[(dx + dy) < step * 0.3] = grey
    grout = ((xx % step) < 2) | ((yy % step) < 2) | (np.abs((dx + dy) - step * 0.3) < 1.5)
    img[grout] = [0.50, 0.47, 0.44]
    img *= (0.94 + 0.1 * noise(512, 7))[..., None]
    return save_image('plaza', np.clip(img, 0, 1))

def tex_plaster(name, color, seed):
    n = noise(256, seed)[..., None]
    fine = np.random.default_rng(seed + 1).random((256, 256, 1))
    return save_image(name, np.clip(np.array(color) * (0.95 + 0.08 * n) + (fine - 0.5) * 0.025, 0, 1))

# ---------------------------------------------------------------- материалы (PBR)

MATERIALS = {}

def material(name, color, rough=0.85, metal=0.0, image=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if image is not None:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    MATERIALS[name] = mat
    return mat

def make_materials():
    material('grass', (0.3, 0.47, 0.2), 0.95, image=tex_grass())
    material('apron', (0.66, 0.66, 0.67), 0.95)          # земля за оградой — серая: цветной остаётся только территория
    material('asphalt', (0.42, 0.42, 0.43), 0.9, image=tex_asphalt())
    material('paving', (0.72, 0.70, 0.66), 0.8, image=tex_paving())
    material('plaza', (0.7, 0.55, 0.45), 0.75, image=tex_plaza())
    material('curb', (0.86, 0.85, 0.82), 0.8)
    material('white', (0.93, 0.93, 0.91), 0.7, image=tex_plaster('plaster_white', (0.93, 0.93, 0.91), 11))
    material('church_white', (0.97, 0.97, 0.96), 0.7)     # храм: чистая белая штукатурка, без пятен
    material('concrete', (0.78, 0.75, 0.68), 0.85, image=tex_plaster('plaster_beige', (0.78, 0.75, 0.68), 13))
    material('grey', (0.70, 0.70, 0.69), 0.85, image=tex_plaster('plaster_grey', (0.70, 0.70, 0.69), 15))
    material('cream', (0.86, 0.80, 0.66), 0.85, image=tex_plaster('plaster_cream', (0.86, 0.80, 0.66), 17))
    material('brick', (0.72, 0.52, 0.42), 0.85, image=tex_plaster('plaster_brick', (0.72, 0.52, 0.42), 19))
    material('glass', (0.16, 0.24, 0.32), 0.12, 0.0)
    material('glass_tall', (0.30, 0.41, 0.50), 0.1, 0.0)
    material('frame', (0.95, 0.95, 0.94), 0.5)
    material('frame_dark', (0.25, 0.26, 0.28), 0.5, 0.4)
    material('roof', (0.47, 0.47, 0.48), 0.9)
    material('metal', (0.1, 0.1, 0.11), 0.45, 0.8)
    material('lamp', (0.55, 0.57, 0.6), 0.4, 0.7)
    material('lamp_glass', (0.98, 0.96, 0.85), 0.3)
    material('trunk', (0.33, 0.25, 0.18), 0.95)
    material('leaf_a', (0.27, 0.45, 0.17), 0.9)
    material('leaf_b', (0.36, 0.52, 0.2), 0.9)
    material('leaf_c', (0.22, 0.38, 0.16), 0.9)
    material('spruce', (0.12, 0.27, 0.17), 0.9)
    material('hedge', (0.3, 0.5, 0.2), 0.95)
    material('pitch', (0.11, 0.28, 0.10), 0.95)
    material('plinth', (0.45, 0.45, 0.46), 0.9)
    material('pipe', (0.5, 0.52, 0.55), 0.5, 0.6)
    material('line', (0.95, 0.95, 0.95), 0.8)
    material('step', (0.80, 0.79, 0.76), 0.75)
    material('blind', (0.90, 0.88, 0.82), 0.8)
    material('pitch2', (0.085, 0.23, 0.08), 0.95)
    material('track', (0.46, 0.12, 0.09), 0.9)
    material('court', (0.33, 0.43, 0.54), 0.85)
    material('net', (0.10, 0.42, 0.20), 0.8)
    material('seat_r', (0.74, 0.13, 0.13), 0.6)
    material('seat_b', (0.13, 0.27, 0.66), 0.6)
    material('gold', (0.80, 0.60, 0.16), 0.35, 0.9)
    material('tyre', (0.08, 0.08, 0.09), 0.9)
    material('car_white', (0.90, 0.90, 0.90), 0.4)
    material('car_silver', (0.60, 0.62, 0.64), 0.4)
    material('car_black', (0.10, 0.10, 0.11), 0.4)
    material('car_blue', (0.14, 0.24, 0.50), 0.4)
    material('car_red', (0.60, 0.12, 0.10), 0.4)
    material('ac', (0.92, 0.92, 0.91), 0.5)
    material('grille', (0.30, 0.31, 0.33), 0.6)
    material('roof_unit', (0.74, 0.75, 0.76), 0.5)
    material('wood', (0.55, 0.38, 0.22), 0.7)
    material('stone', (0.86, 0.85, 0.82), 0.75)
    material('bedstone', (0.22, 0.21, 0.20), 0.9)
    material('church_green', (0.13, 0.30, 0.22), 0.8)
    material('church_roof', (0.20, 0.25, 0.23), 0.6)
    material('sandstone', (0.78, 0.60, 0.46), 0.85)
    material('bedstone2', (0.34, 0.31, 0.28), 0.9)
    material('ink', (0.16, 0.11, 0.04), 0.6)
    material('sign_gold', (0.62, 0.47, 0.16), 0.4, 0.8)
    material('door_glass', (0.22, 0.30, 0.38), 0.1)
    material('hall_floor', (1.0, 1.0, 1.0), 0.4, image=tex_hall_tile('hall_floor', (0.86, 0.83, 0.76)))
    material('hall_ceiling', (1.0, 1.0, 1.0), 0.8, image=tex_hall_tile('hall_ceiling', (0.96, 0.96, 0.95)))
    material('hall_carpet', (1.0, 1.0, 1.0), 0.4, image=tex_hall_carpet())
    material('hall_wall', (0.94, 0.94, 0.92), 0.8)
    material('hall_light', (1.0, 1.0, 0.97), 0.3)
    material('cor_floor', (1.0, 1.0, 1.0), 0.4, image=tex_hall_tile('cor_floor', (0.80, 0.80, 0.77)))
    material('cor_wall', (0.95, 0.95, 0.95), 0.8)
    material('cor_band', (0.60, 0.61, 0.62), 0.6)
    for (fl_, wg_), col_ in ACCENT.items():
        material('band_%d_%s' % (fl_, wg_), col_, 0.6)
    material('door_wood', (0.42, 0.22, 0.12), 0.5)
    material('door_grey', (0.60, 0.64, 0.60), 0.5)
    material('door_frame', (0.88, 0.88, 0.86), 0.6)
    material('cor_plate', (0.97, 0.97, 0.96), 0.5)
    material('lm_red', (0.80, 0.24, 0.22), 0.6)
    material('lm_blue', (0.24, 0.40, 0.74), 0.6)
    material('lm_green', (0.30, 0.56, 0.30), 0.8)
    material('lm_yellow', (0.95, 0.82, 0.30), 0.6)
    material('lm_dark', (0.18, 0.19, 0.21), 0.6)
    material('lm_wood', (0.62, 0.44, 0.26), 0.6)
    material('lm_screen', (0.82, 0.92, 1.0), 0.2)
    material('cor_floor_check', (1.0, 1.0, 1.0), 0.4, image=tex_check())
    material('stair_window', (0.80, 0.90, 1.0), 0.2)
    material('stair_step', (0.78, 0.77, 0.74), 0.75)
    material('case_glass', (0.80, 0.88, 0.92), 0.1)
    material('chess_dark', (0.20, 0.20, 0.22), 0.5)
    material('chess_light', (0.90, 0.88, 0.80), 0.5)
    material('chess_white', (0.93, 0.91, 0.84), 0.5)
    material('chess_black', (0.13, 0.13, 0.15), 0.5)
    material('hall_stone', (0.80, 0.74, 0.62), 0.5)
    material('kiosk_glass', (0.74, 0.83, 0.88), 0.1)
    material('desk', (0.55, 0.57, 0.60), 0.6)
    material('desk_top', (0.25, 0.26, 0.28), 0.5)
    material('pot', (0.60, 0.36, 0.24), 0.8)
    material('sign_blue', (0.10, 0.25, 0.60), 0.5)
    material('flag_white', (0.95, 0.95, 0.95), 0.8)
    material('flag_blue', (0.10, 0.22, 0.62), 0.8)
    material('flag_red', (0.78, 0.12, 0.12), 0.8)
    material('mosaic', (1.0, 1.0, 1.0), 0.8, image=tex_mosaic())
    material('panel_white', (0.95, 0.95, 0.94), 0.5)
    material('emblem_panel', (1.0, 1.0, 1.0), 0.5, image=tex_emblem_panel())
    material('flower_r', (0.78, 0.16, 0.22), 0.9)
    material('flower_y', (0.93, 0.74, 0.16), 0.9)
    # окружение за оградой: нарочно блёклое и без деталей
    material('ctx_wall', (0.80, 0.80, 0.80), 0.95)
    material('ctx_roof', (0.84, 0.84, 0.85), 0.95)
    material('ctx_road', (0.54, 0.54, 0.55), 0.95)

# ---------------------------------------------------------------- фасады

STYLES = {
    # Крылья главного корпуса: длинные ленты окон, выступающие перекрытия и тонкие вертикальные рёбра
    'ribbon': dict(wall='concrete', bay=3.0, win_w=2.6, win_h=2.0, sill=0.95, recess=0.22, ledge=0.4, fin=0.28, glass='glass', frame='frame'),
    # Обычные дома на территории: отдельные окна в стене
    'punched': dict(wall='grey', bay=3.2, win_w=1.5, win_h=1.6, sill=0.9, recess=0.16, ledge=0.0, fin=0.0, glass='glass', frame='frame'),
    'plain': None,
}

def window(b, a, u, n, s0, w, y0, h, st):
    """Окно в проёме: откосы, стекло в глубине, рама с импостом и подоконник.
    a — начало стены (x, z), u — вдоль стены, n — наружу, s0 — отступ от начала, w и h — размеры проёма"""
    r = st['recess']
    def P(s, d, y):  # s — вдоль стены, d — наружу (минус — вглубь)
        return W(a[0] + u[0] * s + n[0] * d, a[1] + u[1] * s + n[1] * d, y)
    out, inn = (n[0], -n[1], 0), (-n[0], n[1], 0)
    wall = st['wall']
    # откосы
    b.face(wall, [P(s0, 0, y0), P(s0, -r, y0), P(s0, -r, y0 + h), P(s0, 0, y0 + h)], (u[0], -u[1], 0))
    b.face(wall, [P(s0 + w, 0, y0), P(s0 + w, -r, y0), P(s0 + w, -r, y0 + h), P(s0 + w, 0, y0 + h)], (-u[0], u[1], 0))
    b.face(wall, [P(s0, 0, y0 + h), P(s0 + w, 0, y0 + h), P(s0 + w, -r, y0 + h), P(s0, -r, y0 + h)], (0, 0, -1))
    # стекло
    b.face(st['glass'], [P(s0, -r, y0), P(s0 + w, -r, y0), P(s0 + w, -r, y0 + h), P(s0, -r, y0 + h)], out)
    # жалюзи за стеклом: примерно в каждом третьем окне, опущены на разную высоту
    if rnd.random() < 0.38:
        drop = h * rnd.choice([0.3, 0.45, 0.7, 1.0])
        b.face('blind', [P(s0, -r + 0.012, y0 + h - drop), P(s0 + w, -r + 0.012, y0 + h - drop), P(s0 + w, -r + 0.012, y0 + h), P(s0, -r + 0.012, y0 + h)], out)
    # кондиционер под окном: изредка, только выше первого этажа
    if y0 > 4 and rnd.random() < 0.07:
        o = (a[0] + u[0] * (s0 + w * 0.5 - 0.4), a[1] + u[1] * (s0 + w * 0.5 - 0.4))
        b.box('ac', o, u, n, 0.8, 0.3, y0 - 0.75, y0 - 0.2, bottom=True)
        b.face('grille', [P(s0 + w * 0.5 - 0.3, 0.305, y0 - 0.68), P(s0 + w * 0.5 + 0.3, 0.305, y0 - 0.68), P(s0 + w * 0.5 + 0.3, 0.305, y0 - 0.27), P(s0 + w * 0.5 - 0.3, 0.305, y0 - 0.27)], out)
    # рама по периметру и переплёт
    f, d = 0.07, -r + 0.03
    fr = st['frame']
    b.face(fr, [P(s0, d, y0), P(s0 + w, d, y0), P(s0 + w, d, y0 + f), P(s0, d, y0 + f)], out)
    b.face(fr, [P(s0, d, y0 + h - f), P(s0 + w, d, y0 + h - f), P(s0 + w, d, y0 + h), P(s0, d, y0 + h)], out)
    b.face(fr, [P(s0, d, y0), P(s0 + f, d, y0), P(s0 + f, d, y0 + h), P(s0, d, y0 + h)], out)
    b.face(fr, [P(s0 + w - f, d, y0), P(s0 + w, d, y0), P(s0 + w, d, y0 + h), P(s0 + w - f, d, y0 + h)], out)
    parts = max(2, round(w / 0.9))
    for k in range(1, parts):
        s = s0 + w * k / parts
        b.face(fr, [P(s - 0.025, d, y0), P(s + 0.025, d, y0), P(s + 0.025, d, y0 + h), P(s - 0.025, d, y0 + h)], out)
    b.face(fr, [P(s0, d, y0 + h * 0.68), P(s0 + w, d, y0 + h * 0.68), P(s0 + w, d, y0 + h * 0.68 + 0.05), P(s0, d, y0 + h * 0.68 + 0.05)], out)
    # подоконник: плита, слегка выступающая наружу
    o = (a[0] + u[0] * (s0 - 0.05) + n[0] * (-r), a[1] + u[1] * (s0 - 0.05) + n[1] * (-r))
    b.box('curb', o, u, n, w + 0.1, r + 0.07, y0 - 0.05, y0)


def facade(b, a, c, n, base, levels, lh, style, top_extra=0.7):
    """Стена от точки a до точки c (по земле), наружу — n. Режет стену на этажи и проёмы."""
    L = math.hypot(c[0] - a[0], c[1] - a[1])
    if L < 0.05:
        return
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    out = (n[0], -n[1], 0)
    top = base + levels * lh
    st = STYLES.get(style)
    def Q(s0, s1, y0, y1, mat):
        b.face(mat, [W(a[0] + u[0] * s0, a[1] + u[1] * s0, y0), W(a[0] + u[0] * s1, a[1] + u[1] * s1, y0),
                     W(a[0] + u[0] * s1, a[1] + u[1] * s1, y1), W(a[0] + u[0] * s0, a[1] + u[1] * s0, y1)], out, 3.0)
    wall = st['wall'] if st else style_wall.get(style, 'grey')
    margin = 1.0
    bays = int((L - 2 * margin) / st['bay']) if st else 0
    if bays < 1:
        if base == 0:
            Q(0, L, 0, 0.5, 'plinth')
        Q(0, L, 0.5 if base == 0 else base, top + top_extra, wall)
        return
    start = (L - bays * st['bay']) / 2
    gap = (st['bay'] - st['win_w']) / 2
    for i in range(levels):
        y0 = base + i * lh
        ys, yh = y0 + st['sill'], y0 + st['sill'] + st['win_h']
        if i == 0 and base == 0:
            Q(0, L, 0, 0.5, 'plinth')
            Q(0, L, 0.5, ys, wall)
        else:
            Q(0, L, y0, ys, wall)
        Q(0, L, yh, y0 + lh, wall)
        Q(0, start + gap, ys, yh, wall)
        Q(L - start - gap, L, ys, yh, wall)
        for k in range(bays):
            s0 = start + k * st['bay'] + gap
            window(b, a, u, n, s0, st['win_w'], ys, st['win_h'], st)
            if k < bays - 1:
                Q(s0 + st['win_w'], s0 + st['win_w'] + 2 * gap, ys, yh, wall)
        if st['ledge'] and i > 0:
            b.box('curb', (a[0], a[1]), u, n, L, st['ledge'], y0 - 0.14, y0, bottom=True)
    Q(0, L, top, top + top_extra, wall)
    if st['ledge']:
        b.box('curb', (a[0], a[1]), u, n, L, st['ledge'], top - 0.14, top, bottom=True)
    if st['fin']:
        for k in range(bays + 1):
            s = start + k * st['bay'] - 0.07
            b.box(wall, (a[0] + u[0] * s, a[1] + u[1] * s), u, n, 0.14, st['fin'], base, top)

style_wall = {}

def roof(b, poly, top, wall_mat, parapet=0.7):
    """Плоская крыша с парапетом и покрывной плитой"""
    b.flat('roof', poly, top, 2.0)
    sign = 1 if area2(poly) > 0 else -1
    for a, c in zip(poly, poly[1:] + poly[:1]):
        L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 0.05:
            continue
        u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
        n = (sign * u[1], -sign * u[0])          # наружу
        t = 0.3
        ia = (a[0] - n[0] * t, a[1] - n[1] * t)
        ic = (c[0] - n[0] * t, c[1] - n[1] * t)
        b.face(wall_mat, [W(*ia, top), W(*ic, top), W(*ic, top + parapet), W(*ia, top + parapet)], (-n[0], n[1], 0), 3.0)
        b.box('curb', (a[0] - n[0] * (t + 0.04), a[1] - n[1] * (t + 0.04)), u, n, L, t + 0.1, top + parapet, top + parapet + 0.08, bottom=True)


def outward_edges(poly):
    sign = 1 if area2(poly) > 0 else -1
    for a, c in zip(poly, poly[1:] + poly[:1]):
        L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 0.05:
            continue
        yield a, c, (sign * (c[1] - a[1]) / L, -sign * (c[0] - a[0]) / L), L


def generic_building(b, building, index):
    poly = pts(building['points'])
    levels = building['levels']
    small = abs(area2(poly)) / 2 < 150 or levels <= 1
    wall = ['grey', 'cream', 'brick', 'concrete'][index % 4]
    style = dict(STYLES['punched'], wall=wall)
    STYLES['_tmp'] = style
    top = levels * LEVEL
    for a, c, n, L in outward_edges(poly):
        if small:
            style_wall['plainwall'] = wall
            facade(b, a, c, n, 0, levels, LEVEL, 'plainwall', 0.4)
        else:
            facade(b, a, c, n, 0, levels, LEVEL, '_tmp', 0.6)
    roof(b, poly, top, wall, 0.4 if small else 0.6)
    if not small:
        roof_units(b, poly, top, max(1, int(abs(area2(poly)) / 2 / 220)))


INTERNET_WALL = (-117.5, -80.0)     # середина западного торца северного корпуса — вход в Центр Интернет


def internet_center(b, footprints):
    """Вход в Центр Интернет (панорама тура «У входа в Центр Интернет», фото Яндекса): выступающая стеклянная
    вставка лестничной клетки над входом во всю высоту, дверь с козырьком и синей вывеской, две ступени.
    Вставка — ближе к северному краю торца (на фото слева, если смотреть с проезда)."""
    best = None
    for fp in footprints:
        for a, c, n, L in outward_edges(fp):
            mid = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2)
            d = math.hypot(mid[0] - INTERNET_WALL[0], mid[1] - INTERNET_WALL[1])
            if best is None or d < best[0]:
                best = (d, a, c, n, L)
    _, a, c, n, L = best
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    north = 1 if u[1] < 0 else -1                 # в какую сторону вдоль стены север
    centre = L / 2 + north * L * 0.12
    top = 5 * NORTH_LEVEL
    def O(s_, d_):
        return (a[0] + u[0] * s_ + n[0] * d_, a[1] + u[1] * s_ + n[1] * d_)
    w = 4.4
    b.box('glass', O(centre - w / 2, 0), u, n, w, 0.5, 3.5, top - 0.4)
    for s_ in (centre - w / 2 - 0.35, centre + w / 2):
        b.box('concrete', O(s_, 0), u, n, 0.35, 0.62, 0, top + 0.6)
    for k in range(1, 4):
        b.box('frame', O(centre - w / 2 + w * k / 4 - 0.035, 0.5), u, n, 0.07, 0.04, 3.5, top - 0.4)
    y = 3.5 + 1.8
    while y < top - 0.6:
        b.box('frame', O(centre - w / 2, 0.5), u, n, w, 0.04, y - 0.05, y + 0.05)
        y += 1.8
    # вход: тёмная рама, стекло дверей, синяя вывеска, козырёк, ступени
    # дверь открыта: через неё входят в корпус Н (см. north_n). Проём 2,1 × 2,3 м, по бокам тёмные косяки
    b.box('plinth', O(centre - w / 2, 0), u, n, w / 2 - 1.05, 0.5, 0, 3.5)
    b.box('plinth', O(centre + 1.05, 0), u, n, w / 2 - 1.05, 0.5, 0, 3.5)
    b.box('plinth', O(centre - 1.05, 0), u, n, 2.1, 0.5, 2.75, 3.5, bottom=True)
    for s_ in (centre - 1.2, centre + 1.05):
        b.box('frame_dark', O(s_, 0.5), u, n, 0.15, 0.06, 0.3, 2.75)
    b.box('sign_blue', O(centre - 1.3, 0.52), u, n, 2.6, 0.06, 2.8, 3.25)
    b.box('white', O(centre - 2.7, 0.5), u, n, 5.4, 1.9, 3.3, 3.55, bottom=True)
    for i in range(2):
        b.box('step', O(centre - 2.4 - i * 0.3, 0.5), u, n, 4.8 + i * 0.6, 1.4 + (1 - i) * 0.0 + i * 0.35, 0, 0.3 - i * 0.15)


MOSAIC_WALL = (-139.5, 23.0)        # середина торцевой стены юго-западного крыла


def tex_mosaic():
    """Условное мозаичное панно: мелкая смальта в золотисто-охристых и коричневых тонах крупными пятнами.
    Рисунок настоящего панно (фигуры) не воспроизводится."""
    n1, n2 = noise(256, 71, 4), noise(256, 72, 6)
    rng = np.random.default_rng(73)
    gold, ochre, brown, cream = np.array([0.86, 0.66, 0.20]), np.array([0.70, 0.50, 0.17]), np.array([0.33, 0.21, 0.11]), np.array([0.90, 0.82, 0.58])
    t = n1[..., None]
    img = np.where(t < 0.38, brown, np.where(t < 0.55, ochre, np.where(t < 0.8, gold, cream)))
    img = img * (0.86 + 0.28 * n2[..., None])
    tile = (rng.random((64, 64, 1)) - 0.5).repeat(4, axis=0).repeat(4, axis=1) * 0.16        # отдельные кусочки смальты
    grid = np.ones((256, 256, 1))
    grid[::4, :, :] = 0.8
    grid[:, ::4, :] = 0.8
    return save_image('mosaic', np.clip((img + tile) * grid, 0, 1))


def cut_facade(b, f0, v0, A, U, N, vol, wall=None, door=None):
    """Вырезает из только что нарисованной стены (грани с номера f0) объём vol = (s0, s1, y0, y1): s — вдоль стены от её начала A
    по направлению U, y — высота; N — наружу. Если задан wall — вырез закрывается гладкой стеной из этого материала,
    в которой оставлен проём door = (s0, s1, y0, y1)."""
    def sdy(p):
        x, z = p.x - A[0], -p.y - A[1]
        return (x * U[0] + z * U[1], x * N[0] + z * N[1], p.z)
    def back(s_, d_, y_):
        return W(A[0] + U[0] * s_ + N[0] * d_, A[1] + U[1] * s_ + N[1] * d_, y_)
    tail = [(b.mat_names[b.mats[i]], [b.verts[j] for j in b.faces[i]], [b.uvs[j] for j in b.faces[i]]) for i in range(f0, len(b.faces))]
    del b.verts[v0:], b.uvs[v0:], b.faces[f0:], b.mats[f0:]
    s0, s1, y0, y1 = vol
    def spans(lo, hi, c0, c1):          # что остаётся от отрезка lo..hi после вычитания c0..c1
        return [(q0, q1) for q0, q1 in ((lo, min(hi, c0)), (max(lo, c1), hi)) if q1 - q0 > 1e-3]
    for mat, verts, uvs in tail:
        pieces = None
        if len(verts) == 4:
            c = [sdy(v) for v in verts]
            lo = [min(q[k] for q in c) for k in range(3)]
            hi = [max(q[k] for q in c) for k in range(3)]
            flat_ = [hi[k] - lo[k] < 1e-3 for k in range(3)]
            over_s, over_y = lo[0] < s1 - 1e-3 and hi[0] > s0 + 1e-3, lo[2] < y1 - 1e-3 and hi[2] > y0 + 1e-3
            if flat_[1] and not flat_[0] and not flat_[2] and over_s and over_y:                # грань в плоскости стены или параллельно ей
                pieces = [[(a_, lo[1], lo[2]), (b_, lo[1], lo[2]), (b_, lo[1], hi[2]), (a_, lo[1], hi[2])] for a_, b_ in spans(lo[0], hi[0], s0, s1)]
                m0, m1 = max(lo[0], s0), min(hi[0], s1)
                pieces += [[(m0, lo[1], a_), (m1, lo[1], a_), (m1, lo[1], b_), (m0, lo[1], b_)] for a_, b_ in spans(lo[2], hi[2], y0, y1)]
            elif flat_[0] and not flat_[2] and s0 < lo[0] < s1 and over_y:                       # грань поперёк стены (откос, ребро)
                pieces = [[(lo[0], lo[1], a_), (lo[0], hi[1], a_), (lo[0], hi[1], b_), (lo[0], lo[1], b_)] for a_, b_ in spans(lo[2], hi[2], y0, y1)]
            elif flat_[2] and not flat_[0] and y0 < lo[2] < y1 and over_s:                       # горизонтальная грань (подоконник, пояс)
                pieces = [[(a_, lo[1], lo[2]), (b_, lo[1], lo[2]), (b_, hi[1], lo[2]), (a_, hi[1], lo[2])] for a_, b_ in spans(lo[0], hi[0], s0, s1)]
        if pieces is None:
            base_ = len(b.verts)
            b.verts.extend(verts)
            b.uvs.extend(uvs)
            b.faces.append(tuple(range(base_, base_ + len(verts))))
            b.mats.append(b._mat(mat))
            continue
        normal = (verts[1] - verts[0]).cross(verts[2] - verts[0])
        for piece in pieces:
            b.face(mat, [back(*q) for q in piece], tuple(normal), 3.0)
    if wall:
        h0, h1, g0, g1 = door
        for a_, b_, c_, e_ in ((s0, h0, y0, y1), (h1, s1, y0, y1), (h0, h1, g1, y1), (h0, h1, y0, g0)):
            if b_ - a_ > 1e-3 and e_ - c_ > 1e-3:
                b.face(wall, [back(a_, 0.0, c_), back(b_, 0.0, c_), back(b_, 0.0, e_), back(a_, 0.0, e_)], (N[0], -N[1], 0), 3.0)


NA_FRAME = {}


def north_a_frame():
    """Привязка корпуса А (северная часть) к осям главного корпуса: s — вдоль главного фасада, d — вглубь (на север).
    Корпус А на контуре OpenStreetMap — длинный брусок между вершинами 26–27 (северная стена) и 5–7 (южная): 43 × 18,5 м.
    Переход на втором этаже идёт от холла у лифтов к двери в северном торце крыла главного корпуса («Коридор ФИСМО»)."""
    if NA_FRAME:
        return NA_FRAME
    centre = pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'center')['points'])
    a, c, n, L = max(outward_edges(centre), key=lambda e: e[2][1])
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    sd = lambda q: ((q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], -((q[0] - a[0]) * n[0] + (q[1] - a[1]) * n[1]))
    north = [sd(q) for q in pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'north')['points'])]
    west = [sd(q) for q in pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'west')['points'])]
    sW, sE = north[26][0], north[27][0]
    dN = (north[26][1] + north[27][1]) / 2
    dS = (north[5][1] + north[6][1] + north[7][1]) / 3
    S2 = lambda x: sW + (x - NA_FLOORS[2]['x'][0]) * (sE - sW) / (NA_FLOORS[2]['x'][1] - NA_FLOORS[2]['x'][0])
    ref, plan_k, plan_y0 = PLAN_UP[2]
    wx0, wx1, wy0, wy1 = COR2_RECTS['wingA']
    wing_s = tuple((ref[0] + (x - ref[1]) * ref[2] - PLAN_X0) / PLAN_K for x in (wx0, wx1))
    wing_d = PLAN2_D0 + (plan_y0 - wy0) / plan_k                  # северный конец «Коридора ФИСМО»
    link = (S2(349.0), S2(422.5))                                # переход на схеме 2 этажа корпуса А: x 349–422,5
    door = (max(link[0], wing_s[0]), min(link[1], wing_s[1]))
    wing_face = max(q[1] for q in west if abs(q[0] - (link[0] + link[1]) / 2) < 12)       # торцевая стена крыла
    rise = STAIR['steps'] * 2 * STAIR['rise']
    levels = [0.45 + rise * k for k in range(5)]
    NA_FRAME.update(a=a, u=u, n=n, sW=sW, sE=sE, dN=dN, dS=dS, link=link, door=door, wing_d=wing_d, wing_face=wing_face, levels=levels,
                    stair=dict(s0=S2(262.5), s1=S2(342.0) - 0.3, d_top=dS + 4.6, d_run=dS + 1.35, d_bot=dS + 0.3, steps=13, spine=0.3,
                               part='indoor_astairs', title='Лестница корпуса А', band='band_%d_na'))
    return NA_FRAME


NN_FRAME = {}
INTERNET_DOOR = {}


def internet_door():
    """Дверь Центра Интернет на западном торце северной части: стена, её оси и место двери вдоль стены (как в internet_center)"""
    if INTERNET_DOOR:
        return INTERNET_DOOR
    poly = pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'north')['points'])
    a, c, n, L = min(outward_edges(poly), key=lambda e: math.hypot((e[0][0] + e[1][0]) / 2 - INTERNET_WALL[0], (e[0][1] + e[1][1]) / 2 - INTERNET_WALL[1]))
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    centre = L / 2 + (1 if u[1] < 0 else -1) * L * 0.12
    INTERNET_DOOR.update(a=a, c=c, n=n, L=L, u=u, centre=centre, half=1.05)
    return INTERNET_DOOR


LIBRARY_DOOR = {}


def library_door():
    """Вход в библиотеку (корпус А3) на восточном торце северной части: на схеме 1 этажа тамбур стоит посередине стены"""
    if LIBRARY_DOOR:
        return LIBRARY_DOOR
    poly = pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'north')['points'])
    a, c, n, L = next(e for e in outward_edges(poly) if math.hypot(e[0][0] - poly[0][0], e[0][1] - poly[0][1]) < 1e-6)       # стена от вершины 0 к вершине 1
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    LIBRARY_DOOR.update(a=a, c=c, n=n, L=L, u=u, centre=L / 2, half=1.05)
    return LIBRARY_DOOR


KL_DOOR = {}
KL_PLAN_DOOR = (401.0, 232.0, 570.0)      # схема 1 этажа корпуса Л: середина между двумя дверями в южной стене, наружные грани западной и восточной стен


def korp_l_building():
    """Корпус Л (он же А4): отдельное здание во дворе за центральным блоком. В OpenStreetMap у него нет этажности
    (в campus.json записано «городское, 2 этажа»); по схемам тура в нём пять этажей — так и строится (решение пользователя)."""
    return next(bd for bd in DATA['buildings'] if abs(bd['points'][0] + 15.7) < 0.05 and abs(bd['points'][1] - 18.5) < 0.05)


def korp_l_door():
    """Вход в корпус Л с юга, по оси коридора. На схеме 1 этажа в южной стене коридора две двери, перед ними тамбур-пристройка,
    в который входят сбоку; пристройки в контуре OpenStreetMap нет, поэтому дверь одна — прямо в южной стене, посередине между теми двумя."""
    if KL_DOOR:
        return KL_DOOR
    poly = pts(korp_l_building()['points'])
    a, c, n, L = list(outward_edges(poly))[3]                    # южная стена: от юго-восточного угла к юго-западному
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    x, xw, xe = KL_PLAN_DOOR
    KL_DOOR.update(a=a, c=c, n=n, L=L, u=u, centre=L * (xe - x) / (xe - xw), half=1.05)
    return KL_DOOR


def street_door(a, c):
    """Если в стене a–c есть открытая дверь с улицы — её описание, иначе None"""
    return next((e for e in (internet_door(), library_door(), korp_l_door()) if same_edge(a, c, e)), None)


def korp_l_shell(b, building, index, meta):
    """Оболочка корпуса Л: пять этажей той же высоты, что в северной части; наружные стены — преграды по отдельности,
    в южной стене открытая дверь. Случайных чисел тратится столько же, сколько тратило прежнее двухэтажное здание, —
    иначе сдвинулась бы расстановка двора."""
    generic_building(Builder('_void'), building, index)
    keep = rnd.getstate()
    poly = pts(building['points'])
    wall = ['grey', 'cream', 'brick', 'concrete'][index % 4]
    STYLES['_tmp'] = dict(STYLES['punched'], wall=wall)
    for a, c, n, L in outward_edges(poly):
        u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
        e_ = street_door(a, c)
        spans_ = [(0.0, e_['centre'] - e_['half']), (e_['centre'] + e_['half'], L)] if e_ else [(0.0, L)]
        for t0_, t1_ in spans_:
            p_, q_ = (a[0] + u[0] * t0_, a[1] + u[1] * t0_), (a[0] + u[0] * t1_, a[1] + u[1] * t1_)
            meta['blocks'].append([round(v_, 2) for q in (p_, q_, (q_[0] - n[0] * 0.4, q_[1] - n[1] * 0.4), (p_[0] - n[0] * 0.4, p_[1] - n[1] * 0.4)) for v_ in q])
        f0_, v0_ = len(b.faces), len(b.verts)
        facade(b, a, c, n, 0, 5, NORTH_LEVEL, '_tmp', 0.6)
        if e_:
            cut_facade(b, f0_, v0_, a, u, n, (e_['centre'] - e_['half'], e_['centre'] + e_['half'], 0.0, 0.45 + 2.3))
    roof(b, poly, 5 * NORTH_LEVEL, wall, 0.6)
    rnd.setstate(keep)


def library_entrance(b, e=None):
    """Вход в библиотеку снаружи. На схеме — тамбур между двумя пилонами; как выглядит дверь, в скачанных источниках
    не разобрать, поэтому вид условный: тёмная рама открытой двери, вывеска, козырёк на двух пилонах, две ступени.
    Так же условно выглядит вход в корпус Л (e — его дверь)."""
    e = e or library_door()
    a, u, n, centre = e['a'], e['u'], e['n'], e['centre']
    def O(s_, d_):
        return (a[0] + u[0] * s_ + n[0] * d_, a[1] + u[1] * s_ + n[1] * d_)
    for s_ in (centre - 1.2, centre + 1.05):
        b.box('frame_dark', O(s_, 0), u, n, 0.15, 0.12, 0.3, 2.75)
    b.box('frame_dark', O(centre - 1.2, 0), u, n, 2.4, 0.12, 2.75, 2.9, bottom=True)
    b.box('sign_blue', O(centre - 1.3, 0.02), u, n, 2.6, 0.06, 2.95, 3.4)
    for s_ in (centre - 2.6, centre + 2.1):
        b.box('concrete', O(s_, 0), u, n, 0.5, 1.7, 0, 3.5)
    b.box('white', O(centre - 2.9, 0), u, n, 5.8, 2.0, 3.5, 3.75, bottom=True)
    for i in range(2):
        b.box('step', O(centre - 2.1 - i * 0.3, 0), u, n, 4.2 + i * 0.6, 1.5 + i * 0.35, 0, 0.3 - i * 0.15)


def same_edge(a, c, e):
    return math.hypot(a[0] - e['a'][0], a[1] - e['a'][1]) < 1e-6 and math.hypot(c[0] - e['c'][0], c[1] - e['c'][1]) < 1e-6


def north_n_frame():
    """Привязка корпуса Н (западный конец северной части) к осям главного корпуса. На контуре OpenStreetMap корпус Н — это
    западный блок (вершины 12–18), перемычка (11–12 и 19–20) и восточный блок (9–10, 20–23): длина 54 м. У каждого этажа своя
    привязка схемы: x — наружные грани западной и восточной стен, y — северная и южная стены перемычки.
    Лестница — над входом в Центр Интернет (на фасаде это стеклянная вставка), вход — по оси двери на фасаде.
    Переход на втором этаже идёт от коридора западного блока на юг к двери в северном торце дальнего западного крыла."""
    if NN_FRAME:
        return NN_FRAME
    F = north_a_frame()
    a, u, n = F['a'], F['u'], F['n']
    sd = lambda q: ((q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], -((q[0] - a[0]) * n[0] + (q[1] - a[1]) * n[1]))
    north = [sd(q) for q in pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'north')['points'])]
    west = [sd(q) for q in pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'west')['points'])]
    sW, sE = (north[16][0] + north[17][0]) / 2, (north[22][0] + north[9][0]) / 2
    # стены перемычки; северная привязана по внутренней грани (0,4 м от наружной): коридор идёт вплотную к ней,
    # и без этого отступа окна фасада оказались бы внутри коридора
    dN, dS = (north[19][1] + north[20][1]) / 2 - 0.4, (north[11][1] + north[12][1]) / 2
    d_south = sum(north[k][1] for k in (13, 14, 15, 16)) / 4                                 # южная стена западного блока
    e = internet_door()
    dc = sd((e['a'][0] + e['u'][0] * e['centre'], e['a'][1] + e['u'][1] * e['centre']))[1]   # ось входа
    (xw, xe) = NN_FLOORS[2]['x']
    S2 = lambda x: sW + (x - xw) * (sE - sW) / (xe - xw)
    ref, plan_k, plan_y0 = PLAN_UP[2]
    wx0, wx1, wy0, wy1 = COR2_RECTS['wingW']
    wing_s = tuple((ref[0] + (x - ref[1]) * ref[2] - PLAN_X0) / PLAN_K for x in (wx0, wx1))
    wing_d = PLAN2_D0 + (plan_y0 - wy0) / plan_k                  # северный конец «Коридора у ауд. №211»
    # Переход на схеме 2 этажа корпуса Н: x 105–181. Западная стена сдвинута на ширину коридора крыла (меньше метра):
    # схемы двух корпусов привязаны независимо, и без этого дверь коридора оказалась бы наполовину в стене перехода.
    link = (min(S2(105.0), wing_s[0]), S2(181.0))
    door = (max(link[0], wing_s[0]), min(link[1], wing_s[1]))
    wing_face = max(q[1] for q in west if abs(q[0] - (link[0] + link[1]) / 2) < 12)
    NN_FRAME.update(a=a, u=u, n=n, sW=sW, sE=sE, dN=dN, dS=dS, d_south=d_south, dc=dc, link=link, door=door, wing_d=wing_d, wing_face=wing_face,
                    levels=F['levels'],
                    stair=dict(s0=dc - 3.0, s1=dc + 3.0, d_bot=sW + 0.4, d_run=sW + 1.6, d_top=sW + 4.85, steps=13, spine=2.8, open_spine=True,
                               door=(dc - e['half'], dc + e['half'], 0.45 + 2.3),
                               part='indoor_nstairs', title='Лестница Центра Интернет', band='band_%d_nn'))
    return NN_FRAME


def bridges():
    """Переходы второго этажа: (ширина, дверь в торце крыла главного корпуса, глубина этой стены, глубина стены северной части)"""
    F, G = north_a_frame(), north_n_frame()
    return [dict(link=F['link'], door=F['door'], face=F['wing_face'], open=F['dS']),
            dict(link=G['link'], door=G['door'], face=G['wing_face'], open=G['d_south'])]


def facade_holes(a, c):
    """Проёмы в стене a–c: дверь Центра Интернет; для каждого перехода — дверь в торце крыла главного корпуса и проход
    во всю ширину перехода в стене северной части. Возвращает вырезы в осях самой стены: (объём, материал заплаты, проём в заплате)."""
    e = street_door(a, c)
    if e:
        return [((e['centre'] - e['half'], e['centre'] + e['half'], 0.0, 0.45 + 2.3), None, None)]
    F = north_a_frame()
    sd = lambda q: ((q[0] - F['a'][0]) * F['u'][0] + (q[1] - F['a'][1]) * F['u'][1], -((q[0] - F['a'][0]) * F['n'][0] + (q[1] - F['a'][1]) * F['n'][1]))
    (sa, da), (sc, dc) = sd(a), sd(c)
    if abs(da - dc) > 0.5:
        return []
    L = math.hypot(c[0] - a[0], c[1] - a[1])
    along = lambda s_: (s_ - sa) / (sc - sa) * L          # место вдоль стены по координате s главного корпуса
    span = lambda p0, p1: tuple(sorted((min(L, max(0.0, along(p0))), min(L, max(0.0, along(p1))))))      # в пределах этой стены
    f2 = F['levels'][1]
    d_ = (da + dc) / 2
    out = []
    for br in bridges():
        l0, l1 = br['link']
        if max(sa, sc) < l0 - 0.3 or min(sa, sc) > l1 + 0.3:
            continue
        if abs(d_ - br['face']) < 0.5:
            out.append((span(l0 - 0.2, l1 + 0.2) + (f2 - 0.3, f2 + 3.6), 'concrete', span(*br['door']) + (f2, f2 + 2.3)))
        elif abs(d_ - br['open']) < 0.5:
            out.append((span(l0 - 0.1, l1 + 0.1) + (f2, f2 + 3.3), None, None))      # чуть шире прохода: остатки окон не торчат внутрь
    return out


def bridge_shell(b, meta, br, f2):
    """Переход снаружи: закрытая галерея на уровне второго этажа между северной частью и торцом крыла. Как она выглядит
    на самом деле, в источниках нет (на схемах только план) — вид условный: гладкие стены с лентой окон."""
    F = north_a_frame()
    a, u, n = F['a'], F['u'], F['n']
    def I(s_, d_, y):
        return W(a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_, y)
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    (l0, l1), d0, d1 = br['link'], br['face'], br['open']
    y0, y1 = f2 - 0.3, f2 + 3.6
    for s_, hint, off in ((l0 - 0.2, (-u[0], u[1], 0), -0.02), (l1 + 0.2, (u[0], -u[1], 0), 0.02)):
        b.face('concrete', [I(s_, d0, y0), I(s_, d1, y0), I(s_, d1, y1), I(s_, d0, y1)], hint, 3.0)
        b.face('glass', [I(s_ + off, d0 + 0.5, f2 + 1.0), I(s_ + off, d1 - 0.5, f2 + 1.0), I(s_ + off, d1 - 0.5, f2 + 2.2), I(s_ + off, d0 + 0.5, f2 + 2.2)], hint)
    b.face('roof', [I(l0 - 0.2, d0, y1), I(l1 + 0.2, d0, y1), I(l1 + 0.2, d1, y1), I(l0 - 0.2, d1, y1)], (0, 0, 1), 2.0)
    b.face('concrete', [I(l0 - 0.2, d0, y0), I(l1 + 0.2, d0, y0), I(l1 + 0.2, d1, y0), I(l0 - 0.2, d1, y0)], (0, 0, -1), 3.0)
    # под переходом — обычная земля: без этой площадки человека, идущего по двору под галереей, «подняло» бы на неё
    meta['raised'].append({'points': [round(v_, 2) for q in (O(l0 - 1.0, d0), O(l1 + 1.0, d0), O(l1 + 1.0, d1), O(l0 - 1.0, d1)) for v_ in q], 'height': 0.0})
    spot = O((l0 + l1) / 2, (d0 + d1) / 2)           # точка на земле под переходом (для проверки: человек под галереей остаётся на земле)
    return {'x': round(spot[0], 2), 'z': round(spot[1], 2)}


def wing(b, building, meta=None):
    """Крыло главного корпуса: 4 этажа, ленточные окна"""
    poly = pts(building['points'])
    levels = building['levels']
    lh = NORTH_LEVEL if building.get('part') == 'north' else MAIN_LEVEL
    centre = [q for bd in DATA['buildings'] if bd.get('part') == 'center' for q in pts(bd['points'])]
    shared = lambda q: any(math.hypot(q[0] - c_[0], q[1] - c_[1]) < 0.3 for c_ in centre)
    for a, c, n, L in outward_edges(poly):
        if shared(a) and shared(c):
            continue            # стена, общая с центральным блоком: снаружи не видна, а в ней проход из холла в коридор
        if meta is not None:    # наружные стены — преграды по отдельности (внутри здания есть проходимые коридоры)
            e_ = street_door(a, c)                                  # двери Центра Интернет и библиотеки открыты
            spans_ = [(0.0, e_['centre'] - e_['half']), (e_['centre'] + e_['half'], L)] if e_ else [(0.0, L)]
            for t0_, t1_ in spans_:
                p_, q_ = (a[0] + (c[0] - a[0]) * t0_ / L, a[1] + (c[1] - a[1]) * t0_ / L), (a[0] + (c[0] - a[0]) * t1_ / L, a[1] + (c[1] - a[1]) * t1_ / L)
                meta['blocks'].append([round(v_, 2) for q in (p_, q_, (q_[0] - n[0] * 0.4, q_[1] - n[1] * 0.4), (p_[0] - n[0] * 0.4, p_[1] - n[1] * 0.4)) for v_ in q])
        mid = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2)
        if math.hypot(mid[0] - MOSAIC_WALL[0], mid[1] - MOSAIC_WALL[1]) < 4:
            # Торец юго-западного крыла: глухая стена с мозаичным панно во всю высоту (панорама тура, фото Яндекса).
            # Сам рисунок панно не воспроизводится — только его место, размер и общий золотисто-охристый тон.
            top_ = levels * MAIN_LEVEL
            u_ = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
            def wall(s0, s1, y0, y1, mat, d=0.0):
                b.face(mat, [W(a[0] + u_[0] * s0 + n[0] * d, a[1] + u_[1] * s0 + n[1] * d, y0), W(a[0] + u_[0] * s1 + n[0] * d, a[1] + u_[1] * s1 + n[1] * d, y0),
                             W(a[0] + u_[0] * s1 + n[0] * d, a[1] + u_[1] * s1 + n[1] * d, y1), W(a[0] + u_[0] * s0 + n[0] * d, a[1] + u_[1] * s0 + n[1] * d, y1)], (n[0], -n[1], 0), 3.0)
            wall(0, L, 0, top_ + 0.8, 'concrete')
            wall(0, L, 0, 0.9, 'plinth', 0.03)
            first = len(b.verts)
            wall(0.5, L - 0.5, 1.0, top_ + 0.3, 'mosaic', 0.06)
            uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
            if (b.verts[first] - W(a[0] + u_[0] * 0.5 + n[0] * 0.06, a[1] + u_[1] * 0.5 + n[1] * 0.06, 1.0)).length > 1e-6:
                uvs.reverse()
            b.uvs[first:first + 4] = uvs
            continue
        f0_, v0_ = len(b.faces), len(b.verts)
        facade(b, a, c, n, 0, levels, lh, 'ribbon', 0.8)
        for vol_, wall_, door_ in facade_holes(a, c):          # переход между корпусом А и крылом главного корпуса (2 этаж)
            cut_facade(b, f0_, v0_, a, ((c[0] - a[0]) / L, (c[1] - a[1]) / L), n, vol_, wall_, door_)
        # водосточные трубы: по одной примерно на каждые 18 метров длинной стены
        if L > 24:
            u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
            count = int(L / 18)
            for k in range(count):
                s = (k + 0.5) * L / count + 1.5
                x, z = a[0] + u[0] * s + n[0] * 0.5, a[1] + u[1] * s + n[1] * 0.5
                cone(b, 'pipe', x, z, 0.3, levels * lh + 0.2, 0.07, 0.07, 6)
                b.box('pipe', (x - u[0] * 0.1 - n[0] * 0.12, z - u[1] * 0.1 - n[1] * 0.12), u, n, 0.2, 0.24, levels * lh + 0.2, levels * lh + 0.45)
    roof(b, poly, levels * lh, 'concrete', 0.8)
    # У частей, открытых для прогулки, верхний этаж подходит под самую крышу: надстройки торчали бы в коридорах.
    # Поэтому там они уходят «в никуда» — но случайные числа тратятся те же, чтобы расстановка двора не сдвинулась.
    roof_units(b if meta is None else Builder('_void'), poly, levels * lh, int(abs(area2(poly)) / 2 / 160))


def tex_hall_carpet():
    """Тёмная плитка холла с мелкими белыми ромбами в узлах — как на панораме"""
    size = 128
    yy, xx = np.mgrid[0:size, 0:size]
    img = np.ones((size, size, 3)) * np.array([0.30, 0.31, 0.33])
    cell = size // 2
    diamond = (np.abs((xx % cell) - cell / 2) + np.abs((yy % cell) - cell / 2)) < cell * 0.14
    img[diamond] = np.array([0.88, 0.87, 0.82])
    seam = ((xx + yy) % cell < 1.2) | ((xx - yy) % cell < 1.2)
    img[seam & ~diamond] *= 0.86
    return save_image('hall_carpet', img)


def tex_check():
    """Пол в клетку — кремовые и серые плитки, как в коридоре ФКТиПМ на панораме"""
    size = 64
    yy, xx = np.mgrid[0:size, 0:size]
    img = np.where((((xx // 32) + (yy // 32)) % 2 == 0)[..., None], np.array([0.90, 0.87, 0.74]), np.array([0.66, 0.67, 0.66]))
    img[(xx % 32 < 1) | (yy % 32 < 1)] *= 0.88
    return save_image('cor_floor_check', img.astype(np.float64))


def tex_hall_tile(name, color):
    size = 64
    img = np.ones((size, size, 3)) * np.array(color)
    img[:2, :, :] *= 0.9
    img[:, :2, :] *= 0.9
    return save_image(name, img)


def hall(b, a, u, n, L, depth, axis, base, meta):
    """Холл первого этажа главного корпуса. Планировка — по схеме «Главный корпус, 1 этаж» виртуального тура
    (масштаб: ширина блока 58 м = 280 точек схемы), вид — по панораме «Холл корпуса А»:
    зал во всю ширину блока глубиной 12,5 м, ряд квадратных колонн, остеклённый тамбур у входа,
    пост охраны, напротив входа — проход между стеклянными киосками к парадной лестнице.
    s — вдоль фасада, d — вглубь от фасада; axis — ось входа."""
    HALL, CEIL = 12.5, base + 3.75
    raw, b = b, Part(b, 'indoor_hall')
    def I(s_, d_, y):
        return W(a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_, y)
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    inward, outward = (-n[0], n[1], 0), (n[0], -n[1], 0)
    along, against = (u[0], -u[1], 0), (-u[0], u[1], 0)
    def flat(mat, s0, s1, d0, d1, y, up=True, scale=1.0):
        b.face(mat, [I(s0, d0, y), I(s1, d0, y), I(s1, d1, y), I(s0, d1, y)], (0, 0, 1 if up else -1), scale)
    def wall_s(mat, s0, s1, d_, y0, y1, hint, scale=3.0):          # стена вдоль фасада
        b.face(mat, [I(s0, d_, y0), I(s1, d_, y0), I(s1, d_, y1), I(s0, d_, y1)], hint, scale)
    def wall_d(mat, s_, d0, d1, y0, y1, hint, scale=3.0):          # стена поперёк
        b.face(mat, [I(s_, d0, y0), I(s_, d1, y0), I(s_, d1, y1), I(s_, d0, y1)], hint, scale)
    def box(mat, s0, s1, d0, d1, y0, y1):
        b.box(mat, O(s0, d1), u, n, s1 - s0, d1 - d0, y0, y1)
    def block(s0, s1, d0, d1):                                     # преграда для пешехода
        meta['blocks'].append([round(v_, 2) for q in (O(s0, d0), O(s1, d0), O(s1, d1), O(s0, d1)) for v_ in q])

    # пол, тёмные «ковры» плитки между колоннами, потолок со светильниками
    flat('hall_floor', 0.25, L - 0.25, 0.25, depth - 0.25, base + 0.005, True, 0.6)
    columns = [axis + off for off in (-21.4, -15.2, -8.5, -2.9, 2.9, 9.4, 15.4, 21.6) if 1.5 < axis + off < L - 1.5]
    edges_s = [0.25] + columns + [L - 0.25]
    for s0, s1 in zip(edges_s, edges_s[1:]):
        if s1 - s0 > 3.0:
            for d0, d1 in ((1.4, 6.2), (8.6, 11.6)):
                flat('hall_carpet', s0 + 0.9, s1 - 0.9, d0, d1, base + 0.03, True, 1.2)
    flat('hall_ceiling', 0.25, L - 0.25, 0.25, depth - 0.25, CEIL, False, 0.6)
    # пятна солнца на полу от витражей фасада: направление — то же солнце, что и в запекании света.
    # В модель не попадают: приложение рисует их само полупрозрачными (см. Scene.tsx)
    sun_x, sun_z, sun_y = -170.0, 260.0, 230.0
    run = (-sun_x / sun_y, -sun_z / sun_y)                      # сдвиг луча по земле на метр высоты
    run_s, run_d = run[0] * u[0] + run[1] * u[1], -(run[0] * n[0] + run[1] * n[1])
    cells_ = round((L - 8.4) / 1.65)
    cw_ = (L - 8.4) / cells_
    meta['sun'] = {'y': round(base + 0.045, 3), 'quads': []}
    for k in range(cells_):
        s0, s1 = 4.2 + k * cw_ + 0.07, 4.2 + (k + 1) * cw_ - 0.07
        for h0, h1 in ((0.05, 1.78), (1.92, 3.25)):             # ниже и выше горизонтального переплёта
            quad_ = [O(s0 + h0 * run_s, 0.3 + h0 * run_d), O(s1 + h0 * run_s, 0.3 + h0 * run_d),
                     O(s1 + h1 * run_s, 0.3 + h1 * run_d), O(s0 + h1 * run_s, 0.3 + h1 * run_d)]
            meta['sun']['quads'].append([round(v_, 2) for q_ in quad_ for v_ in q_])
    s_ = 3.0
    while s_ < L - 2:
        for d_ in (3.2, 9.4):
            flat('hall_light', s_ - 0.3, s_ + 0.3, d_ - 0.3, d_ + 0.3, CEIL - 0.02, False)
        s_ += 3.0
    # стены зала: торцы, задняя стена с проходом к лестнице
    half = 3.5
    door_lo = HALL - 0.05 - 10.5 / PLAN_K                      # проём в главный коридор первого этажа (см. corridors)
    wall_d('hall_wall', 0.25, 0.25, door_lo, base, CEIL, along)
    wall_d('hall_wall', 0.25, door_lo, HALL, base + 2.3, CEIL, along)
    e_lo, e_hi = EAST_DOOR                                     # проём в корпус С (см. east_part)
    wall_d('hall_wall', L - 0.25, 0.25, e_lo, base, CEIL, against)
    wall_d('hall_wall', L - 0.25, e_hi, HALL, base, CEIL, against)
    wall_d('hall_wall', L - 0.25, e_lo, e_hi, base + 2.3, CEIL, against)
    wall_s('hall_wall', 0.25, axis - half, HALL, base, CEIL, outward)
    wall_s('hall_wall', axis + half, L - 0.25, HALL, base, CEIL, outward)
    # внутренняя сторона фасада: белые простенки и фрамуга над витражами
    wall_s('hall_wall', 0.25, 4.2, 0.26, base, CEIL, inward)
    wall_s('hall_wall', L - 4.2, L - 0.25, 0.26, base, CEIL, inward)
    wall_s('hall_wall', 4.2, L - 4.2, 0.3, base + 3.3, CEIL, inward)
    block(-0.2, axis - 0.95, -0.25, 0.25)
    block(axis + 0.95, L + 0.2, -0.25, 0.25)
    block(-0.2, 0.25, 0, door_lo)
    block(-0.2, 0.25, HALL - 0.05, depth)
    block(L - 0.25, L + 0.2, 0, e_lo)
    block(L - 0.25, L + 0.2, e_hi, depth)
    block(0, axis - half, HALL - 0.15, HALL + 0.15)
    block(axis + half, L, HALL - 0.15, HALL + 0.15)
    block(0, axis - half, depth - 0.25, depth + 0.2)
    block(axis + half, L, depth - 0.25, depth + 0.2)
    # проход к парадной лестнице и сама лестница — отдельной функцией
    meta['_annex'] = stairs(raw, a, u, n, axis, half, base, HALL, depth, CEIL, meta)
    # ориентиры холла (условно): круглые часы над проходом к лестнице и экран расписания на задней стене
    q = O(axis, HALL - 0.02)
    ring_ = [I(axis + 0.38 * math.cos(k / 16 * math.tau), HALL - 0.04, CEIL - 0.48 + 0.38 * math.sin(k / 16 * math.tau)) for k in range(16)]
    b.face('lm_dark', ring_, outward)
    ring_ = [I(axis + 0.33 * math.cos(k / 16 * math.tau), HALL - 0.05, CEIL - 0.48 + 0.33 * math.sin(k / 16 * math.tau)) for k in range(16)]
    b.face('cor_plate', ring_, outward)
    b.face('lm_dark', [I(axis - 0.015, HALL - 0.06, CEIL - 0.48), I(axis + 0.015, HALL - 0.06, CEIL - 0.48), I(axis + 0.015, HALL - 0.06, CEIL - 0.22), I(axis - 0.015, HALL - 0.06, CEIL - 0.22)], outward)
    b.face('lm_dark', [I(axis, HALL - 0.06, CEIL - 0.495), I(axis + 0.2, HALL - 0.06, CEIL - 0.495), I(axis + 0.2, HALL - 0.06, CEIL - 0.465), I(axis, HALL - 0.06, CEIL - 0.465)], outward)
    scr = axis + 13.0
    if scr + 1.2 < L - 1.0:
        wall_s('lm_dark', scr - 0.95, scr + 0.95, HALL - 0.03, base + 1.45, base + 2.6, outward)
        wall_s('lm_screen', scr - 0.88, scr + 0.88, HALL - 0.04, base + 1.52, base + 2.53, outward)
        for row in range(5):
            wall_s('lm_blue', scr - 0.8, scr + 0.8 - (row % 3) * 0.3, HALL - 0.05, base + 1.62 + row * 0.17, base + 1.72 + row * 0.17, outward)
        for poly in text_faces('РАСПИСАНИЕ', 0.16):
            b.add_mesh('lm_dark', [tuple(I(scr + q_[0], HALL - 0.04, base + 2.78 + q_[1])) for q_ in poly], [tuple(range(len(poly)))])
    # колонны: две у оси входа облицованы бежевым камнем, остальные белые
    for c_ in columns:
        mat = 'hall_stone' if abs(abs(c_ - axis) - 2.9) < 0.1 else 'hall_wall'
        box(mat, c_ - 0.35, c_ + 0.35, 6.95, 7.65, base, CEIL)
        block(c_ - 0.35, c_ + 0.35, 6.95, 7.65)
    # тамбур: стеклянные стенки с белыми рамами, проход в зал по оси
    T_HALF, T_DEEP, T_TOP = 3.6, 4.6, base + 2.7
    for s0, s1, d0, d1 in ((axis - T_HALF, axis - T_HALF + 0.08, 0.3, T_DEEP), (axis + T_HALF - 0.08, axis + T_HALF, 0.3, T_DEEP),
                           (axis - T_HALF, axis - 1.0, T_DEEP - 0.08, T_DEEP), (axis + 1.0, axis + T_HALF, T_DEEP - 0.08, T_DEEP)):
        box('kiosk_glass', s0, s1, d0, d1, base, T_TOP)
        box('hall_wall', s0 - 0.02, s1 + 0.02, d0 - 0.02, d1 + 0.02, T_TOP, T_TOP + 0.14)
        block(s0 - 0.06, s1 + 0.06, d0, d1 + 0.06)
    for s_ in (axis - T_HALF, axis - 1.0, axis + 1.0, axis + T_HALF):
        box('hall_wall', s_ - 0.06, s_ + 0.06, T_DEEP - 0.1, T_DEEP + 0.02, base, T_TOP)
    flat('hall_ceiling', axis - T_HALF, axis + T_HALF, 0.3, T_DEEP, T_TOP + 0.14, False, 0.6)
    # турникеты за тамбуром (фото Яндекс Карт 2025 года): ряд тумб с проходами между ними и будка охраны сбоку
    gates_s = [axis - 3.3, axis - 2.0, axis - 0.65, axis + 0.65, axis + 2.0, axis + 3.3]
    for g_ in gates_s:
        box('desk', g_ - 0.13, g_ + 0.13, 5.6, 6.8, base, base + 1.0)
        box('desk_top', g_ - 0.15, g_ + 0.15, 5.58, 6.82, base + 1.0, base + 1.04)
        block(g_ - 0.13, g_ + 0.13, 5.6, 6.8)
    for g0, g1 in zip(gates_s, gates_s[1:]):                  # створки-планки в проходах, кроме среднего (он открыт)
        if abs((g0 + g1) / 2 - axis) > 0.1:
            box('kiosk_glass', g0 + 0.15, g1 - 0.15, 6.15, 6.2, base + 0.25, base + 0.95)
            block(g0, g1, 6.1, 6.25)
    box('desk', axis + 3.9, axis + 5.4, 5.6, 6.8, base, base + 1.1)
    box('desk_top', axis + 3.86, axis + 5.44, 5.56, 6.84, base + 1.1, base + 1.15)
    block(axis + 3.9, axis + 5.4, 5.6, 6.8)
    # стеклянные киоски по сторонам от прохода к лестнице
    for s0, s1 in ((axis - half - 6.2, axis - half - 0.1), (axis + half + 0.1, axis + half + 6.2)):
        box('kiosk_glass', s0, s1, 9.6, HALL - 0.05, base, base + 2.8)
        box('hall_wall', s0 - 0.04, s1 + 0.04, 9.56, HALL, base + 2.8, base + 3.0)
        for k in range(5):
            sx = s0 + (s1 - s0) * k / 4
            box('hall_wall', sx - 0.04, sx + 0.04, 9.55, 9.63, base, base + 2.8)
        block(s0, s1, 9.6, HALL)
    # что видно за стеклом киосков: слева — вешалки с одеждой, справа — стенды с фотографиями (панорама тура)
    k0 = axis - half - 6.2
    for i, mat in enumerate(('flag_red', 'flag_blue', 'gold', 'flag_white', 'church_green', 'flag_red', 'sign_blue')):
        box(mat, k0 + 0.7 + i * 0.7, k0 + 1.15 + i * 0.7, HALL - 0.9, HALL - 0.55, base + 0.9, base + 1.9)
    box('desk_top', k0 + 0.5, k0 + 5.7, HALL - 0.75, HALL - 0.7, base + 1.9, base + 1.95)
    k1 = axis + half + 0.1
    for i in range(4):
        box('panel_white', k1 + 0.5 + i * 1.4, k1 + 1.6 + i * 1.4, HALL - 0.45, HALL - 0.4, base + 0.7, base + 2.3)
        for j, mat in enumerate(('sign_blue', 'gold', 'flag_red', 'church_green')):
            box(mat, k1 + 0.6 + i * 1.4 + (j % 2) * 0.48, k1 + 1.0 + i * 1.4 + (j % 2) * 0.48, HALL - 0.48, HALL - 0.45, base + 0.85 + (j // 2) * 0.72, base + 1.45 + (j // 2) * 0.72)
    # витрины с наградами в западном конце зала (панорама тура «Холл корпуса А, западная часть»):
    # белые тумбы, над ними стеклянные шкафы с полками, сверху синяя вывеска. На полках — кубки, медали, грамоты.
    # Сами награды условные: какие именно кубки и грамоты стоят в витринах, по панораме не разобрать.
    case_rnd = random.Random(41)
    def trophy_cup(s_, d_, y, size):
        q = O(s_, d_)
        cone(b, 'gold', q[0], q[1], y, y + 0.04 * size, 0.07 * size, 0.07 * size, 8)
        cone(b, 'gold', q[0], q[1], y + 0.04 * size, y + 0.16 * size, 0.02 * size, 0.02 * size, 6)
        cone(b, 'gold', q[0], q[1], y + 0.16 * size, y + 0.34 * size, 0.03 * size, 0.09 * size, 10)
    def medal(s_, d_, y):
        box('flag_red' if case_rnd.random() < 0.5 else 'flag_blue', s_, s_ + 0.02, d_ - 0.03, d_ + 0.03, y + 0.1, y + 0.3)
        q = O(s_ + 0.03, d_)
        cone(b, 'gold', q[0], q[1], y + 0.02, y + 0.12, 0.055, 0.055, 10)
    def diploma(s_, d_, y):
        box('gold', s_, s_ + 0.02, d_ - 0.13, d_ + 0.13, y, y + 0.34)
        box('panel_white', s_ + 0.02, s_ + 0.03, d_ - 0.11, d_ + 0.11, y + 0.02, y + 0.32)
    def showcase(d0, d1, title):
        s0, s1 = 0.3, 0.95
        box('panel_white', s0, s1, d0, d1, base, base + 0.8)
        box('case_glass', s0, s1, d0, d1, base + 0.8, base + 2.3)
        box('sign_blue', s0, s1 + 0.02, d0, d1, base + 2.3, base + 2.65)
        mid = (d0 + d1) / 2
        for poly in text_faces(title, 0.15):
            b.add_mesh('panel_white', [tuple(I(s1 + 0.035, mid + q[0], base + 2.475 + q[1])) for q in poly], [tuple(range(len(poly)))])
        for k, y in enumerate((base + 0.82, base + 1.3, base + 1.8)):
            if k:
                box('panel_white', s0, s1, d0 + 0.03, d1 - 0.03, y - 0.03, y)
            d_ = d0 + 0.25
            while d_ < d1 - 0.2:
                kind = case_rnd.random()
                if kind < 0.45:
                    trophy_cup(s0 + 0.35, d_, y, 0.8 + case_rnd.random() * 0.5)
                elif kind < 0.7:
                    medal(s0 + 0.45, d_, y)
                else:
                    diploma(s0 + 0.12, d_, y)
                d_ += 0.3 + case_rnd.random() * 0.12
        block(s0, s1, d0, d1)
    showcase(1.2, 5.6, 'СПОРТИВНЫЕ ДОСТИЖЕНИЯ')      # обе вывески читаются на панораме
    showcase(5.8, 10.2, 'УСПЕХИ ВОЛОНТЁРОВ')
    # большие напольные шахматы справа от входа (место указал заказчик; вид — обычный набор, фотографий не нашлось)
    cs0, cd0, cell = axis + 8.2, 1.6, 0.45
    for i in range(8):
        for j in range(8):
            flat('chess_dark' if (i + j) % 2 == 0 else 'chess_light', cs0 + i * cell, cs0 + (i + 1) * cell, cd0 + j * cell, cd0 + (j + 1) * cell, base + 0.045)
    def piece(i, j, kind, mat):
        q = O(cs0 + (i + 0.5) * cell, cd0 + (j + 0.5) * cell)
        y = base + 0.045
        h = {'p': 0.42, 'r': 0.52, 'n': 0.58, 'b': 0.64, 'q': 0.74, 'k': 0.82}[kind]
        cone(b, mat, q[0], q[1], y, y + 0.06, 0.15, 0.15, 10)
        cone(b, mat, q[0], q[1], y + 0.06, y + h * 0.7, 0.12, 0.06, 10)
        if kind == 'r':
            cone(b, mat, q[0], q[1], y + h * 0.7, y + h, 0.1, 0.1, 8)
        elif kind == 'n':
            b.box(mat, (q[0] - 0.06, q[1] - 0.1), (1, 0), (0, 1), 0.12, 0.2, y + h * 0.6, y + h)
        else:
            verts, faces = ico(0.09 if kind == 'p' else 0.08, tuple(W(q[0], q[1], y + h * 0.78)), (1, 1, 1 if kind == 'p' else 1.5), 0.0, sub=1)
            b.add_mesh(mat, verts, faces)
            if kind in ('q', 'k'):
                cone(b, mat, q[0], q[1], y + h * 0.86, y + h, 0.05, 0.02 if kind == 'k' else 0.07, 8)
    back = 'rnbqkbnr'
    for i in range(8):
        piece(i, 0, back[i], 'chess_white')
        piece(i, 1, 'p', 'chess_white')
        piece(i, 6, 'p', 'chess_black')
        piece(i, 7, back[i], 'chess_black')
    block(cs0, cs0 + 8 * cell, cd0, cd0 + 8 * cell)
    # растения в кадках у колонн
    for c_ in columns[::2]:
        q = O(c_ + 1.0, 8.2)
        cone(b, 'pot', q[0], q[1], base, base + 0.5, 0.26, 0.32, 8)
        verts, faces = ico(0.55, tuple(W(q[0], q[1], base + 1.15)), (1, 1, 1.3), 0.12, sub=1)
        b.add_mesh('hedge', verts, faces)
        block(c_ + 0.7, c_ + 1.3, 7.9, 8.5)
    meta['raised'].append({'points': [round(v_, 2) for q in (O(0, 0), O(L, 0), O(L, depth), O(0, depth)) for v_ in q], 'height': base})
    yard_random = rnd.getstate()        # предметы в коридорах не должны сдвигать случайную расстановку деревьев и машин во дворе
    corridors(raw, a, u, n, base, HALL, meta)
    rects2 = corridors(raw, a, u, n, base, HALL, meta, floor=2, level=meta['_annex']['F2'], rect_px=COR2_RECTS, door_list=COR2_DOORS,
                       ghosts={'lobby2': meta['_annex']['lobby']}, unsure=COR2_UNSURE)
    corridors(raw, a, u, n, base, HALL, meta, floor=3, level=meta['_annex']['FL'][2], rect_px=COR3_RECTS, door_list=COR3_DOORS,
              ghosts={'lobby3': meta['_annex']['lobby']}, unsure=COR3_UNSURE, known=COR3_KNOWN)
    corridors(raw, a, u, n, base, HALL, meta, floor=4, level=meta['_annex']['FL'][3], rect_px=COR4_RECTS, door_list=COR4_DOORS,
              ghosts={'lobby4': meta['_annex']['lobby']}, unsure=COR4_UNSURE)
    east_part(raw, meta, base, meta['_annex']['FL'])
    north_a(raw, meta, base, meta['_annex']['FL'], rects2['wingA'])
    north_n(raw, meta, base, rects2['wingW'])
    north_l(raw, meta, base)
    korp_l(raw, meta, base)
    rnd.setstate(yard_random)
    meta.setdefault('places', []).append({'floor': 1, 'title': 'Холл', 'level': round(base, 3), 'color': [0.90, 0.84, 0.70],
                                          'points': [round(v_, 2) for q in (O(0, 0), O(L, 0), O(L, HALL), O(0, HALL)) for v_ in q]})
    spot = O(axis, 8.2)
    meta['hall'] = {'x': round(spot[0], 1), 'z': round(spot[1], 1), 'yaw': round(math.atan2(-n[0], n[1]), 3)}


# ---------------------------------------------------------------- парадная лестница на второй этаж
# Источник — схемы «Главный корпус, 1 этаж» и «2 этаж» виртуального тура. Лестница стоит в пристройке,
# выступающей за заднюю стену центрального блока (в OpenStreetMap её нет). Внутри пристройки шириной 8 м:
# посередине марш вверх (3,6 м), на север до промежуточной площадки; оттуда два боковых марша (по 1,8 м)
# возвращаются на юг и выходят на площадку второго этажа. Размеры сняты со схемы (4,9 точки на метр);
# число ступеней и высота этажа — типовые, точных в источниках нет.
STAIR = dict(inner=4.0, wall=0.4, land_s=2.1, run=4.2, land_n=2.0, steps=13, centre=1.8, side_in=2.2, rise=0.155, lobby=8.8, top=4)      # top — до какого этажа построена лестница


def stairs(b, a, u, n, axis, half, base, HALL, depth, CEIL, meta):
    T = STAIR
    b = Part(b, 'indoor_stairs', whole=True)
    AH, steps, rise = T['inner'], T['steps'], T['rise']
    tread = T['run'] / steps
    F2 = base + 2 * steps * rise
    dS0, dS1 = depth, depth + T['land_s']
    dN0 = dS1 + T['run']
    dN1 = dN0 + T['land_n']
    def I(s_, d_, y):
        return W(a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_, y)
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    inward, outward = (-n[0], n[1], 0), (n[0], -n[1], 0)
    along, against = (u[0], -u[1], 0), (-u[0], u[1], 0)
    def flat(mat, s0, s1, d0, d1, y, up=True, scale=0.6):
        b.face(mat, [I(s0, d0, y), I(s1, d0, y), I(s1, d1, y), I(s0, d1, y)], (0, 0, 1 if up else -1), scale)
    def wall_s(mat, s0, s1, d_, y0, y1, hint):
        b.face(mat, [I(s0, d_, y0), I(s1, d_, y0), I(s1, d_, y1), I(s0, d_, y1)], hint, 3.0)
    def wall_d(mat, s_, d0, d1, y0, y1, hint):
        b.face(mat, [I(s_, d0, y0), I(s_, d1, y0), I(s_, d1, y1), I(s_, d0, y1)], hint, 3.0)
    def box(mat, s0, s1, d0, d1, y0, y1, bottom=False):
        b.box(mat, O(s0, d1), u, n, s1 - s0, d1 - d0, y0, y1, bottom=bottom)
    def block(s0, s1, d0, d1):
        meta['blocks'].append([round(v_, 2) for q in (O(s0, d0), O(s1, d0), O(s1, d1), O(s0, d1)) for v_ in q])
    def zone(s0, s1, d0, d1, height, to=None, d_from=None, d_to=None):
        e = 0.04            # соседние площадки перекрываются на несколько сантиметров: иначе между ними остаётся щель от округления
        z = {'points': [round(v_, 3) for q in (O(s0 - e, d0 - e), O(s1 + e, d0 - e), O(s1 + e, d1 + e), O(s0 - e, d1 + e)) for v_ in q], 'height': round(height, 3)}
        if to is not None:
            z['to'] = round(to, 3)
            z['along'] = [round(v_, 2) for q in (O(axis, d_from), O(axis, d_to)) for v_ in q]
        meta['raised'].append(z)
    def rail(s_, d0, y0, d1, y1):
        for hint in (along, against):
            b.face('metal', [I(s_, d0, y0 + 0.92), I(s_, d1, y1 + 0.92), I(s_, d1, y1 + 0.86), I(s_, d0, y0 + 0.86)], hint)
        count = max(1, int(abs(d1 - d0) / 0.9))
        for k in range(count + 1):
            t = k / count
            q = O(s_, d0 + (d1 - d0) * t)
            y = y0 + (y1 - y0) * t
            cone(b, 'metal', q[0], q[1], y, y + 0.9, 0.018, 0.018, 5)
    L_, R_ = axis - AH, axis + AH
    c, si, LB = T['centre'], T['side_in'], T['lobby']
    FL = [base + 2 * steps * rise * k for k in range(T['top'])]       # высоты полов: первого, второго, третьего… этажа
    TOP = FL[-1] + 3.3
    # первый этаж: проход от холла до пристройки
    wall_d('hall_wall', axis - half, HALL, depth, base, CEIL, along)
    wall_d('hall_wall', axis + half, HALL, depth, base, CEIL, against)
    block(axis - half - 0.3, axis - half, HALL, depth)
    block(axis + half, axis + half + 0.3, HALL, depth)
    # пристройка: пол, стены на всю высоту лестницы, потолок
    flat('hall_floor', L_, R_, dS0, dN1, base + 0.005)
    wall_d('hall_wall', L_, dS0, dN1, base, TOP, along)
    wall_d('hall_wall', R_, dS0, dN1, base, TOP, against)
    wall_s('hall_wall', L_, R_, dN1, base, TOP, outward)
    wall_s('hall_wall', L_, axis - half, dS0, base, CEIL, inward)
    wall_s('hall_wall', axis + half, R_, dS0, base, CEIL, inward)
    flat('hall_ceiling', L_, R_, dS0, dN1, TOP, False)
    for s_ in (axis - 2.0, axis + 2.0):
        flat('hall_light', s_ - 0.3, s_ + 0.3, dN0 - 0.3, dN0 + 0.3, TOP - 0.02, False)
        flat('hall_light', s_ - 0.3, s_ + 0.3, dS1 - 0.3, dS1 + 0.3, TOP - 0.02, False)
    block(L_ - 0.4, L_, dS0, dN1 + 0.4)
    block(R_, R_ + 0.4, dS0, dN1 + 0.4)
    block(L_, R_, dN1, dN1 + 0.4)
    zone(L_, R_, dS0, dS1, base)
    pl = lambda s0, s1, d0, d1: [round(v_, 2) for q in (O(s0, d0), O(s1, d0), O(s1, d1), O(s0, d1)) for v_ in q]
    places = meta.setdefault('places', [])
    yaw = round(math.atan2(-n[0], n[1]), 3)
    meta['floors'] = {}
    # Марши повторяются от этажа к этажу: средний марш на север до промежуточной площадки, от неё два боковых
    # обратно на юг, на следующий этаж. На схемах 2–4 этажей пристройка с лестницей нарисована одинаково.
    for k in range(1, len(FL)):
        lo, up = FL[k - 1], FL[k]
        mid = lo + steps * rise
        last = k == len(FL) - 1
        # окно на промежуточной площадке (на схеме в северной стене пристройки — оконные проёмы)
        wall_s('stair_window', axis - 2.6, axis + 2.6, dN1 - 0.03, mid + 1.0, up + 2.4, outward)
        for s_ in (axis - 2.6, axis - 0.9, axis + 0.9, axis + 2.6):
            box('door_frame', s_ - 0.04, s_ + 0.04, dN1 - 0.1, dN1 - 0.03, mid + 1.0, up + 2.4)
        # средний марш: на север до промежуточной площадки. С первого этажа — сплошной, выше — плитой (под ним пусто)
        for i in range(steps):
            top_ = lo + (i + 1) * rise
            box('stair_step', axis - c, axis + c, dS1 + i * tread, dS1 + (i + 1) * tread, lo if k == 1 else top_ - 0.22, top_, bottom=k > 1)
        for side in (-1, 1):
            rail(axis + side * c, dS1, lo, dN0, mid)
            if k == 1:
                b.face('hall_wall', [I(axis + side * c, dS1, base), I(axis + side * c, dN0, base), I(axis + side * c, dN0, mid)], along if side > 0 else against)
        # промежуточная площадка
        box('stair_step', L_, R_, dN0, dN1, mid - 0.2, mid, bottom=True)
        # боковые марши: с площадки на юг, на следующий этаж
        for side in (-1, 1):
            s0, s1 = (axis - AH, axis - si) if side < 0 else (axis + si, axis + AH)
            for j in range(steps):
                box('stair_step', s0, s1, dN0 - (j + 1) * tread, dN0 - j * tread, mid + (j + 1) * rise - 0.22, mid + (j + 1) * rise, bottom=True)
            rail(axis + side * si, dN0, mid, dS1, up)
            if k == 1:
                block(min(axis + side * c, axis + side * AH), max(axis + side * c, axis + side * AH), dS1, dN1)      # под боковым маршем на первом этаже не пройти
        # площадка этажа над подходом к лестнице; торец перекрытия между потолком нижнего холла и этой площадкой
        box('stair_step', L_, R_, dS0, dS1, up - 0.25, up, bottom=True)
        if k > 1:
            wall_s('hall_wall', L_, R_, dS0, lo + 3.3, up - 0.25, inward)
        # ограждение площадки: на верхнем этаже — над средним маршем целиком, ниже — только по бокам от следующего марша
        for e0, e1 in ([(-si, si)] if last else [(-si, -c), (c, si)]):
            for hint in (inward, outward):
                b.face('metal', [I(axis + e0, dS1, up + 0.92), I(axis + e1, dS1, up + 0.92), I(axis + e1, dS1, up + 0.86), I(axis + e0, dS1, up + 0.86)], hint)
            posts = max(1, round((e1 - e0) / 0.88))
            for q_ in range(posts + 1):
                q = O(axis + e0 + (e1 - e0) * q_ / posts, dS1)
                cone(b, 'metal', q[0], q[1], up, up + 0.9, 0.018, 0.018, 5)
        # холл этажа перед лестницей (на схемах 2 и 3 этажей — 17,6 × 6 м, открыт в коридор)
        flat('hall_floor', axis - LB, axis + LB, HALL, depth, up)
        flat('hall_ceiling', axis - LB, axis + LB, HALL, depth, up + 3.3, False)
        in_hall = k + 1 == 4        # на четвёртом этаже лестница выходит прямо в актовый зал: боковых стен и колонн у холла нет
        if not in_hall:
            wall_d('hall_wall', axis - LB, HALL, depth, up, up + 3.3, along)
            wall_d('hall_wall', axis + LB, HALL, depth, up, up + 3.3, against)
            for s_ in (axis - 2.9, axis + 2.9):             # две колонны холла — на схемах второго и третьего этажей
                box('hall_wall', s_ - 0.3, s_ + 0.3, HALL + 0.5, HALL + 1.1, up, up + 3.3)
        wall_s('hall_wall', axis - LB, L_, depth, up, up + 3.3, outward)
        wall_s('hall_wall', R_, axis + LB, depth, up, up + 3.3, outward)
        for s_ in range(-6, 7, 4):
            flat('hall_light', axis + s_ - 0.3, axis + s_ + 0.3, (HALL + depth) / 2 - 0.3, (HALL + depth) / 2 + 0.3, up + 3.3 - 0.02, False)
        # где можно стоять и на какой высоте
        zone(axis - c, axis + c, dS1, dN0, lo, mid, dS1, dN0)
        zone(L_, R_, dN0, dN1, mid)
        zone(L_, axis - si, dS1, dN0, up, mid, dS1, dN0)
        zone(axis + si, R_, dS1, dN0, up, mid, dS1, dN0)
        zone(L_, R_, dS0, dS1, up)
        zone(axis - LB, axis + LB, HALL + 0.05, depth, up)
        places.append({'floor': k + 1, 'title': 'Холл у актового зала' if in_hall else 'Холл у лестницы', 'level': round(up, 3), 'points': pl(axis - LB, axis + LB, HALL, depth), 'color': list(ACCENT[(k + 1, 'main')])})
        spot = O(axis, (HALL + depth) / 2)
        meta['floors'][str(k + 1)] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': yaw, 'height': round(up, 3)}
    meta['floor2'] = meta['floors']['2']
    # большие цифры этажей на обеих боковых стенах: «1» у подхода к лестнице, остальные — на площадках этажей
    for k, level in enumerate(FL):
        for poly in text_faces(str(k + 1), 1.3):
            y = level + (2.0 if k == 0 else 1.9)
            b.add_mesh('band_%d_main' % (k + 1), [tuple(I(L_ + 0.03, (dS0 + dS1) / 2 + q[0], y + q[1])) for q in poly], [tuple(range(len(poly)))])
            b.add_mesh('band_%d_main' % (k + 1), [tuple(I(R_ - 0.03, (dS0 + dS1) / 2 - q[0], y + q[1])) for q in poly], [tuple(range(len(poly)))])
    places.append({'floor': None, 'title': 'Парадная лестница', 'level': None, 'points': pl(L_, R_, dS0, dN1), 'color': [0.62, 0.62, 0.62]})
    places.append({'floor': 1, 'title': 'Проход к лестнице', 'level': round(base, 3), 'points': pl(axis - half, axis + half, HALL, depth), 'color': [0.86, 0.80, 0.68]})
    spot = O(axis, HALL + 2.0)
    meta['stairs'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': yaw}
    # снаружи: объём пристройки высотой с центральный блок
    return dict(outer=AH + T['wall'], d0=depth, d1=dN1 + T['wall'], F2=F2, FL=FL, lobby=(axis - LB, axis + LB, HALL + 0.05, depth))


# ---------------------------------------------------------------- корпус С (восточная часть главного корпуса)
# Источник — схемы «Корпус С, 1–4 этаж» виртуального тура. Масштаб 8,48 точки на метр: длина корпуса на схеме (792 точки)
# равна длине его южного фасада в OpenStreetMap (93,4 м). s — вдоль южного фасада от стыка с центральным блоком, d — вглубь.
# Схемы этажей нарисованы со сдвигом друг относительно друга: привязка каждого этажа — по коридору северного крыла и
# по южной стене главного коридора. Двери сняты упрощённо (по штриху двери, выступающему в коридор) — все помечены «не уточнено»
# и «неточно»: на этих схемах знак двери читается хуже, чем на схемах главного корпуса.
EAST_K = 8.48
EAST_ORIGIN = {1: (5.0, 567.5), 2: (-1.5, 560.0), 3: (0.5, 559.0), 4: (0.0, 559.0)}      # точка схемы, где s = 0 и d = 0
EAST_DOOR = (6.84, 9.02)                         # проём из холла: где на схеме 1 этажа коридор подходит к главному корпусу
EAST_STAIR = dict(s0=22.8, s1=28.5, d_top=6.19, d_run=2.1, d_bot=0.65, steps=13, spine=0.3)      # лестница у холла (схема: x 198–247, y 512–562)
EAST_RECTS = {
    1: {'cw': (2.7, 136.0, 491.0, 509.5),       # «Коридор из холла главного корпуса»
        'c1': (136.0, 290.0, 488.0, 507.5),     # «Коридор у читального зала»
        'lw': (247.0, 290.0, 472.0, 488.0),     # «Холл у ауд. №117С»
        'cn': (290.0, 512.0, 472.0, 482.0),     # коридор вдоль северной стены (на схеме 1,2 м)
        'le': (512.0, 555.0, 472.0, 501.0),     # «Холл у ауд. №123С»
        'c2': (555.0, 668.0, 491.0, 507.0),     # «Коридор у типографии»
        'exit': (621.0, 639.0, 507.0, 562.0),   # проход к южному выходу
        'w2': (648.0, 668.0, 36.0, 491.0)},     # коридор северо-восточного крыла
    2: {'cor': (132.0, 661.0, 481.0, 500.0), 'lbW': (132.0, 179.0, 500.0, 554.0), 'lbE': (614.0, 661.0, 500.0, 555.0),
        'w1': (132.0, 150.0, 32.0, 481.0), 'w2': (642.0, 661.0, 31.0, 481.0)},
    3: {'cor': (141.0, 663.0, 480.0, 499.0), 'lbW': (141.0, 187.0, 499.0, 550.0), 'lbE': (617.0, 663.0, 499.0, 553.0),
        'w1': (141.0, 159.0, 315.0, 480.0), 'w2': (644.0, 663.0, 37.0, 480.0)},
    4: {'cor': (139.0, 663.0, 479.0, 499.0), 'lbW': (167.0, 185.0, 499.0, 549.0), 'lbE': (616.0, 663.0, 499.0, 553.0),
        'w1': (139.0, 157.0, 315.0, 479.0), 'w2': (644.0, 662.0, 34.0, 479.0)},
}
EAST_DOORS = {
    1: [('cw', 'S', [34, 88]), ('c1', 'N', [207, 226]), ('c1', 'S', [146]), ('le', 'N', [518]), ('c2', 'N', [604]), ('c2', 'S', [652]),
        ('exit', 'W', [528, 545]), ('w2', 'W', [75, 203, 340, 416, 456]), ('w2', 'E', [72, 96, 202, 232, 308, 337, 365, 423])],
    2: [('cor', 'N', [203, 380, 461, 539, 569, 592]), ('cor', 'S', [256, 346, 458, 490, 539, 555]),
        ('w2', 'W', [302, 335, 388]), ('w2', 'E', [42, 118, 146, 331, 358, 416])],
    3: [('cor', 'N', [440, 490, 542, 576, 590, 607, 634]), ('cor', 'S', [415, 441]), ('w1', 'N', [149]), ('w1', 'E', [358, 414]),
        ('w2', 'E', [48, 252, 333, 359])],
    4: [('cor', 'N', [413, 439, 496, 542, 571, 598, 629]), ('cor', 'S', [261, 358, 542]), ('w1', 'W', [344, 416]), ('w1', 'E', [344]),
        ('w2', 'W', [71, 116, 143, 275, 354, 409]), ('w2', 'E', [45, 210, 250, 331, 358])],
}
EAST_TITLES = {       # названия — из подписей панорам тура на схемах корпуса С
    1: {'cw': 'Коридор из главного холла', 'c1': 'Коридор у читального зала', 'lw': 'Холл у ауд. 117С', 'cn': 'Коридор корпуса С', 'le': 'Холл у ауд. 123С',
        'c2': 'Коридор у типографии', 'exit': 'Проход к южному выходу', 'w2': 'Северо-восточное крыло', 'st': 'Лестница корпуса С'},
    2: {'cor': 'Коридор у ауд. 219С', 'lbW': 'Холл ФТФ', 'lbE': 'Холл у ауд. 230С', 'w1': 'Коридор у ауд. 206С', 'w2': 'Коридор ФХиВТ', 'st': 'Лестница корпуса С'},
    3: {'cor': 'Коридор у ауд. 321С', 'lbW': 'Холл у ауд. 300С', 'lbE': 'Холл у ауд. 322С', 'w1': 'Северо-западное крыло', 'w2': 'Северо-восточное крыло', 'st': 'Лестница корпуса С'},
    4: {'cor': 'Коридор у ауд. 406С', 'lbW': 'Холл у ауд. 400С', 'lbE': 'Коридор у ауд. 429С', 'w1': 'Северо-западное крыло', 'w2': 'Северо-восточное крыло', 'st': 'Лестница корпуса С'},
}


def east_frame():
    """Оси корпуса С: начало — угол, общий с центральным блоком на южном фасаде; u — вдоль южного фасада, n — наружу (на юг)"""
    poly = pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'east')['points'])
    centre = [q for bd in DATA['buildings'] if bd.get('part') == 'center' for q in pts(bd['points'])]
    shared = [q for q in poly if any(math.hypot(q[0] - c_[0], q[1] - c_[1]) < 0.3 for c_ in centre)]
    a = max(shared, key=lambda q: q[1])
    k = poly.index(a)
    c = next(q for q in (poly[(k + 1) % len(poly)], poly[k - 1]) if q not in shared)
    L = math.hypot(c[0] - a[0], c[1] - a[1])
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    n = (-u[1], u[0])
    return a, u, n


def east_part(b, meta, base, FL):
    a, u, n = east_frame()
    T = EAST_STAIR
    levels = FL[:4]
    for floor, level in enumerate(levels, start=1):
        x0, y0 = EAST_ORIGIN[floor]
        S = (lambda x0_: (lambda x: (x - x0_) / EAST_K))(x0)
        D = (lambda y0_: (lambda y: (y0_ - y) / EAST_K))(y0)
        rects = EAST_RECTS[floor]
        main = 'c1' if floor == 1 else 'cor'
        south = D(rects[main][3])                      # южная стена главного коридора этого этажа
        east = dict(S=S, D=D, titles=EAST_TITLES[floor], metres={'st': (T['s0'], T['s1'], T['d_top'], south)},
                    signs=[], names=[], plants=[])
        if floor == 1:
            east['signs'] = [('c1', 150.0, [('ЧИТАЛЬНЫЙ ЗАЛ', 'right'), ('ТИПОГРАФИЯ', 'up')], 'W'), ('c1', 240.0, [('ЛЕСТНИЦА', 'right'), ('ГЛАВНЫЙ ХОЛЛ', 'up')], 'E'),
                             ('c2', 600.0, [('ТИПОГРАФИЯ', 'up'), ('ВЫХОД', 'right')], 'W'), ('c2', 610.0, [('ГЛАВНЫЙ ХОЛЛ', 'up')], 'E')]
            east['names'] = [('cw', 70.0, 'КОРПУС С')]
            east['plants'] = [('lw', 'N', 255.0), ('le', 'N', 545.0)]
        else:
            east['signs'] = [('cor', 300.0, [('ЛЕСТНИЦА', 'up')], 'E'), ('cor', 500.0, [('ЛЕСТНИЦА', 'up')], 'E')]
            east['names'] = [('cor', 400.0, {2: 'АУД. 219С', 3: 'АУД. 321С', 4: 'АУД. 406С'}[floor])]
            east['plants'] = [('lbW', 'W', rects['lbW'][3] - 20.0), ('lbE', 'E', rects['lbE'][3] - 20.0)]
        corridors(b, a, u, n, base, 0.0, meta, floor=floor, level=level, rect_px=rects, door_list=EAST_DOORS[floor],
                  ghosts={'shaft': (T['s0'], T['s1'], T['d_bot'], T['d_top'])}, east=east)
    dogleg(b, a, u, n, T, levels, meta)
    spot = (a[0] + u[0] * 12.0 - n[0] * 8.0, a[1] + u[1] * 12.0 - n[1] * 8.0)
    yaw = round(math.atan2(u[0], -u[1]), 3)                 # лицом вдоль коридора, на восток
    meta['east'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': yaw}
    spot = (a[0] + u[0] * (T['s0'] + T['s1']) / 2 - n[0] * (T['d_top'] + 0.45), a[1] + u[1] * (T['s0'] + T['s1']) / 2 - n[1] * (T['d_top'] + 0.45))
    meta['eastStairs'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(n[0], -n[1]), 3)}


def dogleg(b, a, u, n, T, levels, meta):
    """Двухмаршевая лестница корпуса С в прямоугольной шахте: западный марш идёт от коридора на юг до промежуточной
    площадки, восточный — обратно на север, на следующий этаж. Место и размер шахты — по схеме; сами марши условные."""
    b = Part(b, T.get('part', 'indoor_estairs'), whole=True)
    s0, s1, d_top, d_run, d_bot, steps = T['s0'], T['s1'], T['d_top'], T['d_run'], T['d_bot'], T['steps']
    mid_s = (s0 + s1) / 2
    wa, wb = (s0, mid_s - T['spine'] / 2), (mid_s + T['spine'] / 2, s1)        # западный и восточный марши
    tread = (d_top - d_run) / steps
    top = levels[-1] + 3.3
    def I(s_, d_, y):
        return W(a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_, y)
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    def box(mat, sa, sb, da, db, y0, y1, bottom=False):
        b.box(mat, O(sa, db), u, n, sb - sa, db - da, y0, y1, bottom=bottom)
    def block(sa, sb, da, db):
        meta['blocks'].append([round(v_, 2) for q in (O(sa, da), O(sb, da), O(sb, db), O(sa, db)) for v_ in q])
    def zone(sa, sb, da, db, height, to=None, d_from=None, d_to=None):
        e = 0.04
        z = {'points': [round(v_, 3) for q in (O(sa - e, da - e), O(sb + e, da - e), O(sb + e, db + e), O(sa - e, db + e)) for v_ in q], 'height': round(height, 3)}
        if to is not None:
            z['to'] = round(to, 3)
            z['along'] = [round(v_, 2) for q in (O(mid_s, d_from), O(mid_s, d_to)) for v_ in q]
        meta['raised'].append(z)
    along, against = (u[0], -u[1], 0), (-u[0], u[1], 0)
    inward = (-n[0], n[1], 0)
    # шахта: пол, три стены на всю высоту, потолок
    b.face('hall_floor', [I(s0, d_bot, levels[0] + 0.005), I(s1, d_bot, levels[0] + 0.005), I(s1, d_top, levels[0] + 0.005), I(s0, d_top, levels[0] + 0.005)], (0, 0, 1), 0.6)
    b.face('hall_wall', [I(s0, d_bot, levels[0]), I(s0, d_top, levels[0]), I(s0, d_top, top), I(s0, d_bot, top)], along, 3.0)
    b.face('hall_wall', [I(s1, d_bot, levels[0]), I(s1, d_top, levels[0]), I(s1, d_top, top), I(s1, d_bot, top)], against, 3.0)
    gate = T.get('door')                              # дверь в дальней стене шахты (вход с улицы под промежуточной площадкой): (s0, s1, верх)
    if gate:
        for sa_, sb_, ya_ in ((s0, gate[0], levels[0]), (gate[1], s1, levels[0]), (gate[0], gate[1], gate[2])):
            b.face('hall_wall', [I(sa_, d_bot, ya_), I(sb_, d_bot, ya_), I(sb_, d_bot, top), I(sa_, d_bot, top)], inward, 3.0)
    else:
        b.face('hall_wall', [I(s0, d_bot, levels[0]), I(s1, d_bot, levels[0]), I(s1, d_bot, top), I(s0, d_bot, top)], inward, 3.0)
    b.face('hall_ceiling', [I(s0, d_bot, top), I(s1, d_bot, top), I(s1, d_top, top), I(s0, d_top, top)], (0, 0, -1), 0.6)
    b.face('hall_light', [I(mid_s - 0.3, d_run - 0.3, top - 0.02), I(mid_s + 0.3, d_run - 0.3, top - 0.02), I(mid_s + 0.3, d_run + 0.3, top - 0.02), I(mid_s - 0.3, d_run + 0.3, top - 0.02)], (0, 0, -1))
    block(s0 - 0.3, s0, d_bot - 0.3, d_top)
    block(s1, s1 + 0.3, d_bot - 0.3, d_top)
    if gate:
        block(s0, gate[0], d_bot - 0.3, d_bot)
        block(gate[1], s1, d_bot - 0.3, d_bot)
    else:
        block(s0, s1, d_bot - 0.3, d_bot)
    # на первом этаже: под восточным маршем не пройти, между маршами — ограждение
    block(wb[0], wb[1], d_bot, d_top)
    if not T.get('open_spine'):                       # с открытым проходом между маршами его стены ставит сам проход (см. north_n)
        block(wa[1], wb[0], d_bot, d_top)
    for k in range(1, len(levels)):
        lo, up = levels[k - 1], levels[k]
        mid = lo + steps * (up - lo) / (2 * steps)
        rise = (up - lo) / (2 * steps)
        for i in range(steps):                     # западный марш: от коридора на юг, вверх
            y1 = lo + (i + 1) * rise
            box('stair_step', wa[0], wa[1], d_top - (i + 1) * tread, d_top - i * tread, lo if k == 1 else y1 - 0.22, y1, bottom=k > 1)
        box('stair_step', s0, s1, d_bot, d_run, mid - 0.2, mid, bottom=True)          # промежуточная площадка
        for j in range(steps):                     # восточный марш: обратно на север, на следующий этаж
            y1 = mid + (j + 1) * rise
            box('stair_step', wb[0], wb[1], d_run + j * tread, d_run + (j + 1) * tread, y1 - 0.22, y1, bottom=True)
        # ограждение между маршами
        for sa, y_a, y_b in ((wa[1], lo, mid), (wb[0], up, mid)):
            for hint in (along, against):
                b.face('metal', [I(sa, d_top, y_a + 0.92), I(sa, d_run, y_b + 0.92), I(sa, d_run, y_b + 0.86), I(sa, d_top, y_a + 0.86)], hint)
            for q_ in range(6):
                t = q_ / 5
                q = O(sa, d_top + (d_run - d_top) * t)
                cone(b, 'metal', q[0], q[1], y_a + (y_b - y_a) * t, y_a + (y_b - y_a) * t + 0.9, 0.018, 0.018, 5)
        # торец перекрытия между потолком площадки нижнего этажа и полом площадки верхнего
        b.face('hall_wall', [I(s0, d_top, lo + (2.9 if k == 1 else 3.3)), I(s1, d_top, lo + (2.9 if k == 1 else 3.3)), I(s1, d_top, up), I(s0, d_top, up)], (n[0], -n[1], 0), 3.0)
        zone(wa[0], wa[1], d_run, d_top, lo, mid, d_top, d_run)
        zone(s0, s1, d_bot, d_run, mid)
        zone(wb[0], wb[1], d_run, d_top, mid, up, d_run, d_top)
        # большая цифра этажа на западной стене шахты у площадки
        for poly in text_faces(str(k + 1), 0.9):
            b.add_mesh(T.get('band', 'band_%d_e') % (k + 1), [tuple(I(s0 + 0.03, d_top - 1.2 + q[0], up + 1.9 + q[1])) for q in poly], [tuple(range(len(poly)))])
    # на верхнем этаже над западным маршем — ограждение вдоль края площадки
    for hint in (inward, (n[0], -n[1], 0)):
        b.face('metal', [I(wa[0], d_top, levels[-1] + 0.92), I(wa[1], d_top, levels[-1] + 0.92), I(wa[1], d_top, levels[-1] + 0.86), I(wa[0], d_top, levels[-1] + 0.86)], hint)
    if T.get('open_spine'):                           # между маршами — широкий колодец: на каждом этаже вдоль его края ограждение
        for level_ in levels[1:]:
            for hint in (inward, (n[0], -n[1], 0)):
                b.face('metal', [I(wa[1], d_top, level_ + 0.92), I(wb[0], d_top, level_ + 0.92), I(wb[0], d_top, level_ + 0.86), I(wa[1], d_top, level_ + 0.86)], hint)
            for q_ in range(7):
                q = O(wa[1] + (wb[0] - wa[1]) * q_ / 6, d_top)
                cone(b, 'metal', q[0], q[1], level_, level_ + 0.9, 0.018, 0.018, 5)
    meta.setdefault('places', []).append({'floor': None, 'title': T.get('title', 'Лестница корпуса С'), 'level': None,
                                          'points': [round(v_, 2) for q in (O(s0, d_bot), O(s1, d_bot), O(s1, d_top), O(s0, d_top)) for v_ in q], 'color': [0.62, 0.62, 0.62]})


# ---------------------------------------------------------------- корпус А (северная часть главного корпуса)
# Источник — схемы «Корпус А, 1–5 этаж» виртуального тура. Корпус А — длинный брусок 43 × 18,5 м в середине северной части
# (привязка — docs/map3d_north_overlay.png): по длине и глубине схема совпадает с контуром OpenStreetMap, а проход на юг
# из середины корпуса выходит точно к торцу крыла главного корпуса. Схемы этажей нарисованы в разном масштабе и со сдвигом,
# поэтому у каждого этажа своя привязка: x — наружные грани западной и восточной стен, y — северной и южной (в точках схемы).
# На 2–5 этажах коридор на схеме продолжается на 5 м за торцы корпуса — к корпусу Н и к библиотеке (они пока не построены).
# С главным корпусом корпус А связан на втором этаже: на схеме «Главный корпус, 2 этаж» в северном торце крыла стоит знак
# двери, на схеме «Корпус А, 2 этаж» к ней ведёт переход. На 1 этаже проход на юг нарисован без двери и обрывается на краю
# схемы, а в торце крыла там окно — куда он ведёт, не уточнено, поэтому стена холла на 1 этаже глухая.
# Двери — по знаку двери (штрих поперёк стены). Двери лестничных клеток не показаны: западная лестница построена и открыта
# в коридор целиком, восточная не построена. Номеров кабинетов на схемах нет.
NA_FLOORS = {
    1: dict(x=(2.5, 796.0), y=(75.0, 417.5), cor=(9.0, 790.0, 190.0, 281.0), hall=(327.0, 435.0, 281.0, 410.0), title='Коридор у ауд. А105',
            doors=[('cor', 'N', [58, 191, 267, 318, 519.5, 609.5, 732.5]), ('cor', 'S', [41, 61, 149.5, 199.5, 566, 627.5, 680.5, 767]), ('hall', 'E', [380])],
            unsure={('cor', 'S', 41), ('cor', 'S', 199.5), ('cor', 'S', 566), ('cor', 'S', 627.5)},        # дверь стоит в глубине ниши, а не в стене коридора
            known={('hall', 'E', 380): 'Лифты', ('cor', 'S', 767): 'Лестница (восточная)'}),
    2: dict(x=(79.0, 722.0), y=(117.5, 394.0), cor=(4.0, 794.0, 210.0, 299.5), hall=(342.0, 430.0, 299.5, 394.0), title='Коридор у ауд. А205',
            doors=[('cor', 'N', [123, 231, 293, 335, 499, 572, 672.5]), ('cor', 'S', [40.5, 111, 147.5, 199, 237.5, 540, 575, 629, 669.5, 749.5]), ('hall', 'E', [365])],
            unsure={('cor', 'S', 237.5), ('cor', 'S', 629)}, known={('hall', 'E', 365): 'Лифты'}),
    3: dict(x=(72.5, 722.5), y=(151.0, 427.5), cor=(3.0, 794.5, 244.0, 334.0), hall=(384.0, 427.0, 334.0, 427.5), title='Коридор у ауд. А305',
            doors=[('cor', 'N', [118, 227, 290, 332, 497.5, 571, 672]), ('cor', 'S', [34.5, 106, 142.5, 194.5, 233, 536, 572, 629, 667.5, 749]),
                   ('hall', 'W', [344]), ('hall', 'E', [400])],
            unsure={('cor', 'S', 233), ('cor', 'S', 629)}, known={('hall', 'E', 400): 'Лифты'}),
    4: dict(x=(86.25, 725.5), y=(155.5, 426.0), cor=(11.0, 794.5, 246.75, 335.0), hall=(391.0, 435.0, 335.0, 426.0), title='Коридор у ауд. А405',
            doors=[('cor', 'N', [130.5, 237.5, 299.5, 341, 504, 576, 674.5]), ('cor', 'S', [49, 119.5, 154.5, 205.5, 244, 541, 577, 632.5, 669.5, 750]), ('hall', 'E', [400])],
            unsure={('cor', 'S', 244), ('cor', 'S', 632.5)}, known={('hall', 'E', 400): 'Лифты'}),
    5: dict(x=(72.5, 724.0), y=(151.0, 431.0), cor=(3.0, 794.5, 244.5, 335.0), hall=(382.5, 427.0, 335.0, 431.0), title='Коридор у ауд. А505',
            doors=[('cor', 'N', [117.5, 226, 289.5, 332, 497, 571, 672]), ('cor', 'S', [34, 105, 142, 194, 232.5, 536, 572, 628, 667, 749.5]), ('hall', 'E', [402])],
            unsure={('cor', 'S', 232.5), ('cor', 'S', 628)}, known={('hall', 'E', 402): 'Лифты'}),
}


def north_a(b, meta, base, FL, wing2):
    """Корпус А: коридоры и холлы пяти этажей, лестница, переход в главный корпус на втором этаже.
    wing2 — «Коридор ФИСМО» второго этажа главного корпуса (s0, s1, d0, d1): к его северному концу подходит переход."""
    F = north_a_frame()
    a, u, n, T, levels = F['a'], F['u'], F['n'], F['stair'], F['levels']
    assert all(abs(levels[k] - FL[k]) < 0.01 for k in range(len(FL))), 'этажи корпуса А должны совпадать с этажами главного корпуса'
    def I(s_, d_, y):
        return W(a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_, y)
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    l0, l1 = F['link']
    for floor, level in enumerate(levels, start=1):
        cfg = NA_FLOORS[floor]
        (xw, xe), (yn, ys) = cfg['x'], cfg['y']
        S = (lambda xw_, xe_: (lambda x: F['sW'] + (x - xw_) * (F['sE'] - F['sW']) / (xe_ - xw_)))(xw, xe)
        D = (lambda yn_, ys_: (lambda y: F['dN'] - (y - yn_) * (F['dN'] - F['dS']) / (ys_ - yn_)))(yn, ys)
        px = (lambda xw_, xe_: (lambda s_: xw_ + (s_ - F['sW']) * (xe_ - xw_) / (F['sE'] - F['sW'])))(xw, xe)
        south = D(cfg['cor'][3])
        metres = {'st': (T['s0'], T['s1'], T['d_top'], south)}
        titles = {'cor': cfg['title'], 'hall': 'Холл у лифтов', 'st': 'Лестница корпуса А', 'bridge': 'Переход в главный корпус'}
        opened = {}
        hall_mid = S((cfg['hall'][0] + cfg['hall'][1]) / 2)
        if floor in NN_JOINED:       # на схемах корпуса Н в торце его коридора на этих этажах стоят знаки дверей: коридоры соединены
            opened[('cor', 'W')] = [(D(cfg['cor'][3]), D(cfg['cor'][2]))]
        rect_px = {'cor': cfg['cor'], 'hall': cfg['hall']}
        door_list = cfg['doors']
        if cfg['cor'][1] > xe + 1.0:
            # Восточное продолжение коридора лежит уже в стыке с библиотекой, где наружная северная стена стоит вплотную
            # к коридору. Оно выделено в отдельный участок с отступом 0,4 м — иначе окна фасада оказались бы внутри коридора.
            c0, c1, cy0, cy1 = cfg['cor']
            inset = 0.4 * (ys - yn) / (F['dN'] - F['dS'])
            rect_px = {'cor': (c0, xe, cy0, cy1), 'corE': (xe, c1, cy0 + inset, cy1), 'hall': cfg['hall']}
            titles['corE'] = cfg['title']
            door_list = [(name, side, [q for q in items if not (name == 'cor' and side in 'NS' and q > xe)]) for name, side, items in cfg['doors']]
            door_list += [('corE', side, [q for q in items if q > xe]) for name, side, items in cfg['doors'] if name == 'cor' and side in 'NS']
            if floor in NL_JOINED:   # то же с библиотекой: знаки дверей в торце её холла есть только на четвёртом этаже
                opened[('corE', 'E')] = [(D(cy1), D(cy0 + inset))]
        signs = [('cor', (lambda allr, t_=T['s0'] - 4.0: t_), [('ЛЕСТНИЦА', 'right'), ('ЛИФТЫ', 'up')], 'W'),
                 ('cor', (lambda allr, t_=hall_mid + 9.0: t_), [('ЛИФТЫ', 'left'), ('ЛЕСТНИЦА', 'up')], 'E')]
        if floor == 2:
            metres['bridge'] = (l0, l1, wing2[3], F['dS'])
            opened[('bridge', 'S')] = [F['door']]
            signs = [('cor', (lambda allr, t_=T['s0'] - 4.0: t_), [('ЛЕСТНИЦА', 'right'), ('ГЛАВНЫЙ КОРПУС', 'right')], 'W'),
                     ('cor', (lambda allr, t_=hall_mid + 9.0: t_), [('ГЛАВНЫЙ КОРПУС', 'left'), ('ЛЕСТНИЦА', 'up')], 'E'),
                     ('bridge', (lambda allr: wing2[3] + 1.2), [('КОРПУС А', 'up')], 'E')]       # «E» — надпись смотрит на +s; в переходе её видно сбоку, поэтому дублируется табличкой ниже
        east = dict(S=S, D=D, titles=titles, metres=metres, part='indoor_a%d', wing='na', prefix='А', doors='a', unsure=cfg['unsure'], open=opened,
                    signs=signs[:2], names=[('cor', px(F['sW'] + 9.0), 'КОРПУС А · %d ЭТАЖ' % floor), ('cor', px(F['sE'] - 9.0), 'КОРПУС А · %d ЭТАЖ' % floor)],
                    plants=[('hall', 'E', cfg['hall'][3] - 12.0), ('cor', 'N', px(hall_mid))])
        corridors(b, a, u, n, base, 0.0, meta, floor=floor, level=level, rect_px=rect_px, door_list=door_list,
                  ghosts={'shaft': (T['s0'], T['s1'], T['d_bot'], T['d_top'])}, known=cfg.get('known'), east=east)
    dogleg(b, a, u, n, T, levels, meta)
    f2 = levels[1]
    under = bridge_shell(b, meta, bridges()[0], f2)
    mid = (F['door'][0] + F['door'][1]) / 2
    spot = O(mid, wing2[3] - 3.0)                    # в «Коридоре ФИСМО» у двери в переход, лицом на север
    meta['northA'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-n[0], n[1]), 3), 'height': round(f2, 3),
                      'levels': [round(v_, 3) for v_ in levels], 'under': under}
    spot = O((T['s0'] + T['s1']) / 2, T['d_top'] + 0.45)        # площадка лестницы на первом этаже, лицом к маршам (на юг)
    meta['northAStairs'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(n[0], -n[1]), 3)}


# ---------------------------------------------------------------- корпус Н (западный конец северной части)
# Источник — схемы «Корпус Н, 1–5 этаж» виртуального тура; названия мест — из подписей панорам на этих схемах.
# Привязка — см. north_n_frame и docs/map3d_north_overlay.png. Что снято со схем:
#   1 этаж: вход с улицы на западном торце (Центр Интернет), коридор на восток, в восточном блоке — коридор поперёк
#           и узкий коридор на юг. В узком коридоре на схеме нарисованы три ступени — перепад не построен (пол ровный).
#   2–5 этажи: коридор западного блока (с юга на север), коридор вдоль перемычки, коридор восточного блока и продолжение
#           на восток, к корпусу А. В торце этого продолжения на 2–4 этажах стоят знаки дверей — коридоры корпусов Н и А
#           соединены; на 5 этаже знаков нет — там стена.
#   2 этаж: из коридора западного блока — переход на юг, в дальнее западное крыло главного корпуса (на обеих схемах дверь).
# Лестница (над входом, в стеклянной вставке фасада) построена; вторая лестница — в восточном блоке — не построена.
# Упрощения: лестничная площадка открыта в коридор целиком (на схеме — стена с двумя дверями); вход на первом этаже идёт
# между маршами под промежуточной площадкой (на схеме там тамбур и лестница, как именно они совмещены — не разобрать).
NN_JOINED = (2, 3, 4)         # этажи, на которых коридор корпуса Н соединён с коридором корпуса А
NN_FLOORS = {
    1: dict(x=(35.0, 768.6), y=(216.0, 386.5),
            rects={'cor': (150.0, 602.5, 216.0, 298.0), 'east': (602.5, 682.0, 138.0, 298.0), 'south': (629.5, 655.0, 298.0, 543.0)},
            titles={'vest': 'Вход в Центр Интернет', 'cor': 'Коридор Центра Интернет', 'east': 'Коридор Центра Интернет, восточная часть', 'south': 'Коридор корпуса Н'},
            doors=[('cor', 'N', [170, 228, 336, 574]), ('cor', 'S', [189, 224, 248, 300, 344, 422, 489.6, 544.5, 569.6]),
                   ('east', 'W', [156, 197.4]), ('east', 'E', [165]), ('east', 'N', [625.5, 662.4]),
                   ('south', 'W', [318, 356.7, 418.8, 477]), ('south', 'E', [445.8, 472.8])],
            unsure={('cor', 'N', 574)}, known={('cor', 'S', 344): 'Дисплейный класс академии Cisco'}),
    2: dict(x=(20.0, 728.0), y=(207.5, 370.0),
            rects={'cw': (127.0, 180.5, 207.5, 450.0), 'cor': (180.5, 568.5, 207.5, 288.0), 'ce': (568.5, 643.0, 132.5, 443.0), 'ext': (643.0, 791.5, 207.5, 288.0)},
            titles={'cw': 'Холл экономического факультета', 'cor': 'Коридор корпуса Н', 'ce': 'Коридор у ауд. Н219', 'ext': 'Коридор к корпусу А', 'pass': 'Переход в западное крыло'},
            doors=[('cw', 'W', [315.5, 393]), ('cw', 'E', [344, 424]), ('cw', 'N', [151]), ('cor', 'N', [205, 308, 541]), ('cor', 'S', [200, 222, 277, 318.6, 456, 515]),
                   ('ce', 'W', [147.5, 191, 307.6, 350, 386.4]), ('ce', 'E', [154.7, 343.7, 405.8]), ('ce', 'N', [585.5, 621.4]), ('ce', 'S', [591, 621.4]),
                   ('ext', 'S', [699, 751.5])],
            unsure={('cor', 'N', 541), ('cw', 'N', 151)}),
    3: dict(x=(25.6, 726.7), y=(219.0, 380.5),
            rects={'cw': (132.3, 184.0, 219.0, 412.0), 'cor': (184.0, 568.75, 219.0, 297.3), 'ce': (568.75, 643.0, 146.6, 451.0), 'ext': (643.0, 788.8, 219.0, 297.3)},
            titles={'cw': 'Коридор у ауд. Н301', 'cor': 'Коридор корпуса Н', 'ce': 'Коридор у ауд. Н307', 'ext': 'Коридор к корпусу А'},
            doors=[('cw', 'W', [324, 401]), ('cw', 'E', [352.6]), ('cw', 'S', [174]), ('cw', 'N', [156]), ('cor', 'N', [209, 310.5, 541.75]),
                   ('cor', 'S', [204.4, 225.5, 279.5, 321.3, 457, 515.6]), ('ce', 'W', [159.6, 202.8, 318, 350, 396.4]), ('ce', 'E', [167, 353.5, 423.7]),
                   ('ce', 'N', [585.5, 622.75]), ('ce', 'S', [591, 620.9]), ('ext', 'S', [697, 749])],
            unsure={('cor', 'N', 541.75), ('cw', 'N', 156), ('ce', 'N', 585.5)}),
    4: dict(x=(22.0, 728.0), y=(220.4, 379.6),
            rects={'cw': (130.0, 181.4, 220.4, 410.0), 'cor': (181.4, 569.6, 220.4, 298.6), 'ce': (569.6, 644.4, 146.6, 453.4), 'ext': (644.4, 790.0, 220.4, 298.6)},
            titles={'cw': 'Коридор у ауд. Н402', 'cor': 'Коридор корпуса Н', 'ce': 'Коридор у ауд. Н418', 'ext': 'Коридор к корпусу А'},
            doors=[('cw', 'W', [325.6, 394.5]), ('cw', 'E', [353.5]), ('cw', 'S', [155]), ('cw', 'N', [153.4]), ('cor', 'N', [207.4, 309.7, 541.75]),
                   ('cor', 'S', [202.5, 224, 278, 320.5, 456.7, 515.6]), ('ce', 'W', [159, 203.3, 319.4, 358.6, 398.5]), ('ce', 'E', [167.7, 356, 425.5]),
                   ('ce', 'N', [587.6, 626.3]), ('ce', 'S', [591, 620.9]), ('ext', 'S', [752.3])],
            unsure={('cor', 'N', 541.75), ('cw', 'N', 153.4)}),
    5: dict(x=(23.0, 728.0), y=(223.0, 381.5),
            rects={'cw': (129.6, 181.4, 223.0, 412.0), 'cor': (181.4, 568.75, 223.0, 301.4), 'ce': (568.75, 643.8, 148.8, 457.0), 'ext': (643.8, 790.0, 223.0, 301.4)},
            titles={'cw': 'Коридор у ауд. Н502', 'cor': 'Коридор корпуса Н', 'ce': 'Коридор у ауд. Н511', 'ext': 'Коридор корпуса Н, восточный конец'},
            doors=[('cw', 'W', [328.4, 394]), ('cw', 'E', [356.7, 400]), ('cw', 'S', [156]), ('cw', 'N', [154]), ('cor', 'N', [207.4, 309.7, 541]),
                   ('cor', 'S', [202.5, 224, 279, 320.5, 456, 515.6]), ('ce', 'W', [161.8, 206, 322, 360.8, 400.4]), ('ce', 'E', [169.9, 358, 428]),
                   ('ce', 'N', [586.3, 626]), ('ce', 'S', [590.4, 620.9]), ('ext', 'S', [699, 752.4])],
            unsure={('cor', 'N', 541), ('cw', 'N', 154)}),
}


def north_n(b, meta, base, wing2):
    """Корпус Н: коридоры пяти этажей, вход с улицы, лестница, переход в дальнее западное крыло главного корпуса (2 этаж)
    и стык с коридором корпуса А (2–4 этажи). wing2 — коридор дальнего западного крыла на втором этаже (s0, s1, d0, d1)."""
    F, G = north_a_frame(), north_n_frame()
    a, u, n, T, levels, dc = G['a'], G['u'], G['n'], G['stair'], G['levels'], G['dc']
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    for floor, level in enumerate(levels, start=1):
        cfg = NN_FLOORS[floor]
        (xw, xe), (yn, ys) = cfg['x'], cfg['y']
        S = (lambda xw_, xe_: (lambda x: G['sW'] + (x - xw_) * (G['sE'] - G['sW']) / (xe_ - xw_)))(xw, xe)
        D = (lambda yn_, ys_: (lambda y: G['dN'] - (y - yn_) * (G['dN'] - G['dS']) / (ys_ - yn_)))(yn, ys)
        px = (lambda xw_, xe_: (lambda s_: xw_ + (s_ - G['sW']) * (xe_ - xw_) / (G['sE'] - G['sW'])))(xw, xe)
        rects = dict(cfg['rects'])
        titles = dict(cfg['titles'], st='Лестница Центра Интернет')
        first = 'cor' if floor == 1 else 'cw'                 # куда выходит лестничная площадка
        metres = {'st': (T['d_top'], S(rects[first][0]), dc - 3.0, dc + 3.0)}
        opened = {}
        if floor == 1:                                        # проход от двери между маршами, под промежуточной площадкой
            metres['vest'] = (T['d_bot'], T['d_top'], dc - 1.4, dc + 1.4)
            opened[('vest', 'W')] = [(T['door'][0], T['door'][1])]
        if floor == 2:
            metres['pass'] = (G['link'][0], G['link'][1], wing2[3], D(rects['cw'][3]))
            opened[('pass', 'S')] = [G['door']]
        if floor in NN_JOINED:                                # коридор доходит до западного торца коридора корпуса А
            ca = NA_FLOORS[floor]
            s_a = F['sW'] + (ca['cor'][0] - ca['x'][0]) * (F['sE'] - F['sW']) / (ca['x'][1] - ca['x'][0])
            ext = rects['ext']
            rects['ext'] = (ext[0], px(s_a), ext[2], ext[3])
            opened[('ext', 'E')] = [(D(ext[3]), D(ext[2]))]
        mid_px = (rects['cor'][0] + rects['cor'][1]) / 2
        signs = [('cor', (lambda allr, t_=S(rects['cor'][0]) + 4.0: t_), [('ЛЕСТНИЦА', 'up'), ('ВЫХОД', 'up')] if floor == 1 else [('ЛЕСТНИЦА', 'up')], 'E')]
        if floor in NN_JOINED:
            signs.append(('cor', (lambda allr, t_=S(rects['cor'][1]) - 4.0: t_), [('КОРПУС А', 'up')], 'W'))
        east = dict(S=S, D=D, titles=titles, metres=metres, part='indoor_n%d', wing='nn', prefix='Н', doors='n', unsure=cfg['unsure'], open=opened,
                    signs=signs, names=[('cor', mid_px, 'КОРПУС Н · %d ЭТАЖ' % floor)],
                    plants=[('cor', 'N', mid_px + 40.0), ('cor', 'S', mid_px - 60.0)])
        corridors(b, a, u, n, base, 0.0, meta, floor=floor, level=level, rect_px=rects, door_list=cfg['doors'],
                  ghosts={'shaft': (T['d_bot'], T['d_top'], dc - 3.0, dc + 3.0)}, known=cfg.get('known'), east=east)
    # Лестница повёрнута: марши идут с востока на запад (от площадки к наружной стене), поэтому оси для неё другие —
    # «вдоль» у лестницы направлено на север, «вглубь» — на восток.
    dogleg(b, a, (-n[0], -n[1]), (-u[0], -u[1]), T, levels, meta)
    f2 = levels[1]
    under = bridge_shell(b, meta, bridges()[1], f2)
    # порог двери: площадка на высоте пола первого этажа от ступеней крыльца до прохода. Без неё в толще стены под ногами
    # оказалась бы только промежуточная площадка лестницы, и человека на пороге «подняло» бы на неё.
    meta['raised'].append({'points': [round(v_, 2) for q in (O(G['sW'] - 0.7, T['door'][0]), O(T['d_bot'] + 0.2, T['door'][0]), O(T['d_bot'] + 0.2, T['door'][1]),
                                                             O(G['sW'] - 0.7, T['door'][1])) for v_ in q], 'height': round(levels[0], 3)})
    spot = O(G['sW'] - 6.0, dc)                      # на улице перед дверью Центра Интернет, лицом к ней (на восток)
    meta['northN'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(u[0], -u[1]), 3), 'under': under}
    spot = O(T['d_top'] + 1.2, dc)                   # площадка лестницы на первом этаже, лицом к маршам (на запад)
    meta['northNStairs'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-u[0], u[1]), 3)}
    spot = O((G['door'][0] + G['door'][1]) / 2, wing2[3] - 3.0)       # в коридоре дальнего западного крыла у двери в переход, лицом на север
    meta['northNBridge'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-n[0], n[1]), 3), 'height': round(f2, 3)}


# ---------------------------------------------------------------- библиотека, корпус А3 (восточный блок северной части)
# Источник — схемы «Библиотечный корпус, 1–5 этаж» виртуального тура; названия — из подписей панорам на этих схемах.
# На контуре OpenStreetMap библиотека — восточный блок 25 × 30 м (вершины 0–2, 30–31), привязка каждой схемы — по наружным
# стенам блока. Вход с улицы — на восточном торце (тамбур на схеме 1 этажа, панорама «У входа в корпус А3»).
#   1 этаж: от входа — парадная лестница, за ней холл, из холла дверь в коридор вдоль южной стороны.
#   2–5 этажи: холл с продолжением на запад (к корпусу А). На 2 этаже из холла — дверь в коридор южной стороны;
#           на 3 этаже связь холла с южным коридором по схеме не разобрать — коридор там не построен;
#           на 4–5 этажах — короткий боковой коридор у юго-западного угла холла (большую часть этажа занимают два зала-амфитеатра).
#   С корпусом А: знаки дверей в западной стене продолжения холла есть только на 4 этаже — там коридоры соединены.
#           На 2, 3 и 5 этажах на схемах сплошная стена — не соединено (не уточнено, есть ли там двери на самом деле).
# Лестница: на схеме — парадная (средний марш и два боковых); построена двухмаршевая в той же клетке, вход с улицы идёт
# между маршами под промежуточной площадкой. Две другие лестницы (западная и южная) не построены.
# Упрощения: лестничная площадка открыта в холл целиком (на схеме — стена с двумя дверями); на 1 этаже холл открыт
# в коридор на ширину своей нижней части (на схеме — стена с одной дверью).
NL_JOINED = (4,)              # этажи, на которых холл библиотеки соединён с коридором корпуса А
NL_FLOORS = {
    1: dict(x=(165.6, 615.4), y=(8.4, 571.5), hall_e=497.0,
            rects={'hall': (224.4, 497.0, 253.5, 325.0), 'hall2': (288.0, 378.0, 325.0, 412.0), 'cor': (224.4, 497.5, 412.0, 453.0)},
            titles={'hall': 'Холл корпуса А3', 'hall2': 'Холл корпуса А3', 'cor': 'Коридор библиотеки', 'vest': 'Вход в библиотеку'},
            doors=[('hall', 'N', [258, 337.5, 442.6]), ('hall', 'W', [261.6]), ('hall2', 'E', [355.5]), ('cor', 'N', [235.5, 268.5, 421]),
                   ('cor', 'S', [256.5, 366.6, 469.6]), ('cor', 'E', [429]), ('cor', 'W', [434])],
            unsure=set(), known={('cor', 'S', 469.6): 'Электронный и атомный силовой микроскопы', ('cor', 'S', 256.5): 'ЯМР- и ЭПР-комплексы',
                                 ('cor', 'W', 434): 'Лестница (западная)'}),
    2: dict(x=(207.0, 679.0), y=(8.4, 594.0), hall_e=551.5,
            rects={'ext': (95.0, 207.0, 240.0, 355.5), 'hall': (207.0, 551.5, 261.0, 336.0), 'lob': (461.5, 500.5, 336.0, 469.5), 'cor': (219.0, 461.5, 427.5, 469.5)},
            titles={'ext': 'Холл корпуса А3', 'hall': 'Холл корпуса А3', 'lob': 'Коридор библиотеки', 'cor': 'Коридор библиотеки'},
            doors=[('hall', 'N', [299, 385.5, 495.4]), ('hall', 'S', [240]), ('ext', 'S', [172.5]), ('cor', 'N', [280.5, 315]), ('cor', 'S', [298, 360, 416.5]), ('lob', 'E', [449])],
            unsure={('hall', 'S', 240), ('lob', 'E', 449)},
            known={('hall', 'N', 299): 'Зал доступа к электронным ресурсам, ауд. А213', ('hall', 'N', 495.4): 'Отдел художественной литературы, ауд. А217',
                   ('lob', 'E', 449): 'Зал каталога библиотеки, ауд. А219'}),
    3: dict(x=(207.6, 679.0), y=(7.5, 594.0), hall_e=556.0,
            rects={'ext': (102.0, 207.6, 240.0, 357.0), 'hall': (207.6, 556.0, 262.5, 338.4)},
            titles={'ext': 'Холл корпуса А3', 'hall': 'Холл корпуса А3'},
            doors=[('hall', 'N', [305.4, 387.6, 500.5]), ('ext', 'S', [171])],
            unsure=set(), known={('hall', 'N', 305.4): 'Конференц-зал, ауд. А313'}),
    4: dict(x=(206.0, 676.0), y=(9.0, 594.0), hall_e=551.0,
            rects={'ext': (96.6, 206.0, 240.0, 354.6), 'hall': (206.0, 551.0, 262.5, 338.4), 'side': (216.0, 252.0, 338.4, 470.0)},
            titles={'ext': 'Холл корпуса А3', 'hall': 'Холл корпуса А3', 'side': 'Коридор библиотеки'},
            doors=[('hall', 'N', [386, 488.5]), ('hall', 'S', [475]), ('ext', 'S', [165]), ('side', 'E', [383]), ('side', 'S', [238.5])],
            unsure=set(), known={('hall', 'N', 488.5): 'Зал заседаний совета университета', ('hall', 'S', 475): 'Аудитория А423'}),
    5: dict(x=(207.0, 681.0), y=(2.4, 597.0), hall_e=555.0,
            rects={'ext': (91.5, 207.0, 244.5, 353.4), 'hall': (207.0, 555.0, 258.0, 337.5), 'side': (216.0, 252.0, 337.5, 471.0)},
            titles={'ext': 'Холл корпуса А3', 'hall': 'Холл корпуса А3', 'side': 'Коридор библиотеки'},
            doors=[('hall', 'N', [351, 478.6]), ('hall', 'S', [347]), ('ext', 'S', [166.5]), ('side', 'E', [381]), ('side', 'S', [240])],
            unsure={('hall', 'N', 351)}),
}
NL_FRAME = {}


def north_l_frame():
    """Привязка библиотеки к осям главного корпуса и её лестница (у входа, в восточной части блока)"""
    if NL_FRAME:
        return NL_FRAME
    F = north_a_frame()
    a, u, n = F['a'], F['u'], F['n']
    sd = lambda q: ((q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], -((q[0] - a[0]) * n[0] + (q[1] - a[1]) * n[1]))
    north = [sd(q) for q in pts(next(bd for bd in DATA['buildings'] if bd.get('part') == 'north')['points'])]
    sW, sE = sum(north[k][0] for k in (2, 3, 30, 31)) / 4, (north[0][0] + north[1][0]) / 2
    dN, dS = (north[0][1] + north[31][1]) / 2, (north[1][1] + north[2][1]) / 2
    e = library_door()
    dc = sd((e['a'][0] + e['u'][0] * e['centre'], e['a'][1] + e['u'][1] * e['centre']))[1]   # ось входа
    # лестница повёрнута: «вглубь» у неё направлено на запад (от наружной стены к холлу), поэтому глубины — с минусом
    d_bot = -(sE - 0.4)
    NL_FRAME.update(a=a, u=u, n=n, sW=sW, sE=sE, dN=dN, dS=dS, dc=dc, levels=F['levels'], half=2.6, st_e=sE - 4.85,
                    stair=dict(s0=dc - 2.6, s1=dc + 2.6, d_bot=d_bot, d_run=d_bot + 1.2, d_top=d_bot + 4.45, steps=13, spine=2.4, open_spine=True,
                               door=(dc - e['half'], dc + e['half'], 0.45 + 2.3),
                               part='indoor_lstairs', title='Лестница библиотеки', band='band_%d_nl'))
    return NL_FRAME


def north_l(b, meta, base):
    """Библиотека (корпус А3): холлы и коридоры пяти этажей, вход с улицы, лестница, стык с корпусом А на четвёртом этаже"""
    F, G = north_a_frame(), north_l_frame()
    a, u, n, T, levels, dc, half = G['a'], G['u'], G['n'], G['stair'], G['levels'], G['dc'], G['half']
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    shaft = (G['st_e'], G['sE'] - 0.4, dc - half, dc + half)                 # клетка лестницы в осях главного корпуса
    for floor, level in enumerate(levels, start=1):
        cfg = NL_FLOORS[floor]
        (xw, xe), (yn, ys) = cfg['x'], cfg['y']
        S = (lambda xw_, xe_: (lambda x: G['sW'] + (x - xw_) * (G['sE'] - G['sW']) / (xe_ - xw_)))(xw, xe)
        D = (lambda yn_, ys_: (lambda y: G['dN'] - (y - yn_) * (G['dN'] - G['dS']) / (ys_ - yn_)))(yn, ys)
        px = (lambda xw_, xe_: (lambda s_: xw_ + (s_ - G['sW']) * (xe_ - xw_) / (G['sE'] - G['sW'])))(xw, xe)
        rects = dict(cfg['rects'])
        titles = dict(cfg['titles'], st='Лестница библиотеки')
        metres = {'st': (S(cfg['hall_e']), G['st_e'], dc - half, dc + half)}
        opened = {}
        if floor == 1:                                        # проход от двери между маршами, под промежуточной площадкой
            metres['vest'] = (G['st_e'], G['sE'] - 0.4, dc - 1.2, dc + 1.2)
            opened[('vest', 'E')] = [(T['door'][0], T['door'][1])]
        if 'ext' in rects:
            e0, e1, ey0, ey1 = rects['ext']                   # северная стена — с отступом 0,4 м от наружной (см. north_a)
            rects['ext'] = (e0, e1, ey0 + 0.4 * (ys - yn) / (G['dN'] - G['dS']), ey1)
            ca = NA_FLOORS[floor]
            s_a = F['sW'] + (ca['cor'][1] - ca['x'][0]) * (F['sE'] - F['sW']) / (ca['x'][1] - ca['x'][0])       # восточный торец коридора корпуса А
            ext = rects['ext']
            if floor in NL_JOINED:                            # холл доходит до торца коридора корпуса А, стена между ними открыта
                rects['ext'] = (px(s_a), ext[1], ext[2], ext[3])
                opened[('ext', 'W')] = [(D(ext[3]), D(ext[2]))]
            else:                                             # между холлом и коридором корпуса А — стена: полы не должны смыкаться
                rects['ext'] = (px(max(S(ext[0]), s_a + 0.5)), ext[1], ext[2], ext[3])
        hall = rects['hall']
        mid_px = (hall[0] + hall[1]) / 2
        signs = [('hall', (lambda allr, t_=S(hall[1]) - 3.0: t_), [('ЛЕСТНИЦА', 'up'), ('ВЫХОД', 'up')] if floor == 1 else [('ЛЕСТНИЦА', 'up')], 'W')]
        if floor in NL_JOINED:
            signs.append(('hall', (lambda allr, t_=S(hall[0]) + 3.0: t_), [('КОРПУС А', 'up')], 'E'))
        east = dict(S=S, D=D, titles=titles, metres=metres, part='indoor_l%d', wing='nl', prefix='Б', doors='l', unsure=cfg['unsure'], open=opened,
                    signs=signs, names=[('hall', mid_px, 'БИБЛИОТЕКА · %d ЭТАЖ' % floor)],
                    plants=[('hall', 'N', mid_px + 60.0), ('hall', 'S', mid_px + 90.0)])
        corridors(b, a, u, n, base, 0.0, meta, floor=floor, level=level, rect_px=rects, door_list=cfg['doors'],
                  ghosts={'shaft': shaft}, known=cfg.get('known'), east=east)
    dogleg(b, a, (-n[0], -n[1]), (u[0], u[1]), T, levels, meta)
    # порог двери (см. north_n): площадка на высоте пола первого этажа в толще наружной стены
    meta['raised'].append({'points': [round(v_, 2) for q in (O(G['sE'] - 0.6, T['door'][0]), O(G['sE'] + 0.7, T['door'][0]), O(G['sE'] + 0.7, T['door'][1]),
                                                             O(G['sE'] - 0.6, T['door'][1])) for v_ in q], 'height': round(levels[0], 3)})
    spot = O(G['sE'] + 6.0, dc)                      # на улице перед дверью библиотеки, лицом к ней (на запад)
    meta['northL'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-u[0], u[1]), 3)}
    spot = O(G['st_e'] - 0.9, dc)                    # площадка лестницы на первом этаже, лицом к маршам (на восток)
    meta['northLStairs'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(u[0], -u[1]), 3)}


# ---------------------------------------------------------------- корпус Л (он же А4)
# Источник — схемы «Корпус Л, 1–5 этаж» виртуального тура. Корпус Л — отдельное здание 22 × 34 м во дворе за центральным
# блоком (привязка — docs/map3d_north_overlay.png). Север на схемах сверху: выступ с дверью в сторону главного корпуса
# (на схемах 2–4 этажей) смотрит на юг, а панорама «У входа в корпус А4» стоит у северо-западного угла — там на схеме
# двери с улицы в северной стене. Схемы этажей нарисованы в разном масштабе, поэтому у каждого этажа своя привязка:
# x — наружные грани западной и восточной стен, y — северной и южной (в точках схемы).
# Построено: центральный коридор и его расширения, двери по знакам (штрих поперёк стены), юго-западная лестница.
# Упрощения: южного выступа (тамбур на 1 этаже, эркер выше) в контуре OpenStreetMap нет — он не построен, вход сделан
# прямо в южной стене; прямая лестница с 1 на 2 этаж посреди коридора не построена (её место на 1 этаже — глухая выгородка,
# на 2 этаже — огороженный проём); на 1 этаже между коридором и юго-западной лестницей на схеме комната с дверью —
# здесь это открытая площадка; северо-западная лестница не построена (её двери подписаны).
KL_FLOORS = {
    1: dict(x=(232.0, 570.0), y=(40.0, 526.0),
            rects={'cor': (372.0, 405.0, 47.0, 349.0), 'corN': (405.0, 430.0, 47.0, 195.0), 'hall': (430.0, 462.0, 100.0, 183.0),
                   'ent': (372.0, 432.0, 349.0, 516.0), 'side': (240.0, 372.0, 437.0, 468.0)},
            titles={'cor': 'Коридор корпуса Л', 'corN': 'Коридор корпуса Л', 'hall': 'Коридор корпуса Л', 'ent': 'Холл ИППК', 'side': 'Холл ИППК'},
            doors=[('cor', 'W', [151, 245]), ('corN', 'E', [82]), ('corN', 'S', [417]), ('hall', 'E', [113, 168]), ('hall', 'S', [446]),
                   ('ent', 'W', [392]), ('ent', 'E', [380, 447.5, 485.5])],
            unsure={('cor', 'W', 245)},
            known={('cor', 'W', 151): 'Компьютерный класс 1013Л', ('ent', 'W', 392): 'Компьютерный класс 1015Л',
                   ('corN', 'S', 417): 'Лестница на 2 этаж (не построена)'}),
    2: dict(x=(222.0, 578.0), y=(10.0, 531.0),
            rects={'cor': (371.0, 407.0, 22.0, 519.0), 'corN': (407.0, 430.5, 22.0, 162.0), 'east': (430.5, 465.0, 135.0, 519.0),
                   'corS': (407.0, 430.5, 340.0, 519.0), 'sw': (340.0, 371.0, 432.0, 519.0), 'nook': (340.0, 371.0, 22.0, 55.0)},
            titles={'cor': 'Холл корпуса А4', 'corN': 'Холл корпуса А4', 'east': 'Холл корпуса А4', 'corS': 'Холл корпуса А4', 'sw': 'Холл корпуса А4',
                    'nook': 'Холл корпуса А4'},
            doors=[('cor', 'W', [147.5, 224, 314, 402]), ('corN', 'E', [36, 59, 87, 124]), ('east', 'E', [147, 213, 380, 437.5]), ('sw', 'W', [443]),
                   ('nook', 'W', [37])],
            unsure=set(),
            known={('cor', 'W', 314): 'Аудитория', ('east', 'E', 380): 'Буфет', ('nook', 'W', 37): 'Лестница (северная)'}),
    3: dict(x=(217.5, 579.0), y=(14.0, 534.0),
            rects={'cor': (371.0, 429.5, 22.0, 521.0), 'sw': (340.0, 371.0, 471.0, 521.0), 'nook': (338.0, 371.0, 22.0, 55.0)},
            titles={'cor': 'Холл ректората', 'sw': 'Холл ректората', 'nook': 'Холл ректората'},
            doors=[('cor', 'W', [132, 297.5, 376]), ('cor', 'E', [36, 60, 191, 380]), ('nook', 'W', [37])],
            unsure=set(),
            known={('cor', 'W', 132): 'Большой конференц-зал', ('cor', 'W', 297.5): 'Большой конференц-зал', ('cor', 'W', 376): 'Малый конференц-зал',
                   ('nook', 'W', 37): 'Лестница (северная)'}),
    4: dict(x=(222.0, 577.5), y=(14.0, 530.0),
            rects={'cor': (370.5, 431.0, 22.0, 519.0), 'sw': (339.0, 370.5, 470.0, 519.0), 'nook': (341.0, 370.5, 22.0, 55.0)},
            titles={'cor': 'Холл корпуса А4', 'sw': 'Холл корпуса А4', 'nook': 'Холл корпуса А4'},
            doors=[('cor', 'W', [136, 231, 297.5, 370]), ('cor', 'E', [38, 61, 89, 127, 149.5, 193, 295, 364, 473]), ('nook', 'W', [38])],
            unsure=set(), known={('nook', 'W', 38): 'Лестница (северная)'}),
    5: dict(x=(222.0, 581.0), y=(11.0, 531.0),
            rects={'cor': (371.0, 432.5, 20.0, 520.0), 'sw': (341.0, 371.0, 469.5, 520.0), 'nook': (339.0, 371.0, 20.0, 55.0)},
            titles={'cor': 'Холл корпуса А4', 'sw': 'Холл корпуса А4', 'nook': 'Холл корпуса А4'},
            doors=[('cor', 'W', [104.5, 223, 309, 371]), ('cor', 'E', [35, 59, 87, 123, 147.5, 191, 295, 363, 477]), ('nook', 'W', [36])],
            unsure=set(), known={('nook', 'W', 36): 'Лестница (северная)'}),
}
KL_FRAME = {}


def korp_l_frame():
    """Привязка корпуса Л к осям главного корпуса и его юго-западная лестница"""
    if KL_FRAME:
        return KL_FRAME
    F = north_a_frame()
    a, u, n = F['a'], F['u'], F['n']
    sd = lambda q: ((q[0] - a[0]) * u[0] + (q[1] - a[1]) * u[1], -((q[0] - a[0]) * n[0] + (q[1] - a[1]) * n[1]))
    p = [sd(q) for q in pts(korp_l_building()['points'])]              # углы: юго-западный, северо-западный, северо-восточный, юго-восточный
    sW, sE = (p[0][0] + p[1][0]) / 2, (p[2][0] + p[3][0]) / 2
    dS, dN = (p[0][1] + p[3][1]) / 2, (p[1][1] + p[2][1]) / 2
    e = korp_l_door()
    door_s = sd((e['a'][0] + e['u'][0] * e['centre'], e['a'][1] + e['u'][1] * e['centre']))[0]      # ось входа
    # лестница повёрнута: марши идут вдоль южной стены с востока на запад и обратно; «вглубь» у неё — на запад
    d_top = sW + 0.4 + 1.3 + 3.25
    KL_FRAME.update(a=a, u=u, n=n, sW=sW, sE=sE, dS=dS, dN=dN, levels=F['levels'], door_s=door_s, st_w=d_top, st_d=(dS + 0.8, dS + 3.8),
                    stair=dict(s0=-(dS + 3.8), s1=-(dS + 0.8), d_bot=sW + 0.4, d_run=sW + 1.7, d_top=d_top, steps=13, spine=0.2,
                               part='indoor_kstairs', title='Лестница корпуса Л', band='band_%d_nk'))
    return KL_FRAME


def korp_l(b, meta, base):
    """Корпус Л: коридоры пяти этажей, вход с юга, юго-западная лестница"""
    G = korp_l_frame()
    a, u, n, T, levels = G['a'], G['u'], G['n'], G['stair'], G['levels']
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    shaft = (G['sW'] + 0.4, G['st_w'], G['st_d'][0], G['st_d'][1])           # клетка лестницы в осях главного корпуса
    half = korp_l_door()['half']
    for floor, level in enumerate(levels, start=1):
        cfg = KL_FLOORS[floor]
        (xw, xe), (yn, ys) = cfg['x'], cfg['y']
        S = (lambda xw_, xe_: (lambda x: G['sW'] + (x - xw_) * (G['sE'] - G['sW']) / (xe_ - xw_)))(xw, xe)
        D = (lambda yn_, ys_: (lambda y: G['dN'] - (y - yn_) * (G['dN'] - G['dS']) / (ys_ - yn_)))(yn, ys)
        rects = cfg['rects']
        # площадка лестницы: от маршей до холла (на 1 этаже — до коридора: на схеме там комната с дверью в коридор)
        reach = S(rects['ent'][0]) if floor == 1 else S(rects['sw'][0])
        metres = {'st': (G['st_w'], reach, G['st_d'][0], G['st_d'][1])}
        opened = {('ent', 'S'): [(G['door_s'] - half, G['door_s'] + half)]} if floor == 1 else {}
        east = dict(S=S, D=D, titles=dict(cfg['titles'], st='Лестница корпуса Л'), metres=metres, part='indoor_k%d', wing='nk', prefix='Л', doors='k',
                    unsure=cfg['unsure'], open=opened)
        corridors(b, a, u, n, base, 0.0, meta, floor=floor, level=level, rect_px=rects, door_list=cfg['doors'],
                  ghosts={'shaft': shaft}, known=cfg.get('known'), east=east)
    dogleg(b, a, (n[0], n[1]), (-u[0], -u[1]), T, levels, meta)
    # порог двери (см. north_n): площадка на высоте пола первого этажа в толще наружной стены и чуть снаружи
    meta['raised'].append({'points': [round(v_, 2) for q in (O(G['door_s'] - half, G['dS'] + 0.8), O(G['door_s'] + half, G['dS'] + 0.8),
                                                             O(G['door_s'] + half, G['dS'] - 0.7), O(G['door_s'] - half, G['dS'] - 0.7)) for v_ in q],
                           'height': round(levels[0], 3)})
    # на улице перед дверью корпуса Л, лицом к ней (на север); чуть западнее оси двери — чтобы прямой путь вёл в коридор,
    # а не в выгородку лестницы посреди него
    spot = O(G['door_s'] - 0.5, G['dS'] - 5.0)
    meta['korpL'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-n[0], n[1]), 3),
                     'outline': korp_l_building()['points']}
    spot = O(G['st_w'] + 1.0, (G['st_d'][0] + G['st_d'][1]) / 2)        # площадка лестницы на первом этаже, лицом к маршам (на запад)
    meta['korpLStairs'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-u[0], u[1]), 3)}


# ---------------------------------------------------------------- коридоры первого этажа (западная часть)
# Источник — схема «Главный корпус, 1 этаж» виртуального тура (800×600 точек). Со схемы сняты автоматически:
# границы коридоров и холлов и условные знаки дверей (три штриха поперёк стены). Масштаб 4,9 точки на метр
# (сходится с контуром здания в OpenStreetMap по длине всех трёх крыльев). Номеров кабинетов на схеме нет.
PLAN_K = 4.9
PLAN_X0 = 521.0        # точка схемы, где внутренняя грань западной стены холла
PLAN_Y0 = 429.0        # северная стена главного коридора — она же линия задней стены холла
COR_RECTS = {          # x0, x1, y0, y1 в точках схемы
    'bar': (78.0, PLAN_X0 + 0.25 * PLAN_K, 429.0, 439.5),      # главный коридор от холла на запад («коридор бухгалтерии»)
    'lobbyA': (378.0, 428.0, 398.0, 429.0),                    # «Холл ФКТиПМ у деканата»
    'wingA': (418.0, 429.5, 78.0, 398.0),                      # «Коридор ФКТиПМ» — крыло на север
    'alcove': (203.0, 216.5, 439.5, 460.5),                    # карман к южной двери
    'lobbyW': (37.0, 78.0, 429.0, 456.5),                      # «Холл перед музеем КубГУ»
    'wingW': (37.0, 47.5, 120.0, 429.0),                       # коридор дальнего западного крыла
}
COR_DOORS = [          # (участок, сторона, положение в точках схемы); порядок — как идёшь от холла
    ('bar', 'N', [507, 459, 438, 352, 314.5, 278, 243, 226, 211, 177, 136, 118, 101]),
    ('bar', 'S', [490, 456.5, 403.5, 369, 295.5, 278.5, 242, 174.5, 159, 107, 86.5]),
    ('alcove', 'S', [211]),
    ('lobbyA', 'N', [402]),
    ('wingA', 'W', [338, 321, 272, 252.5, 217, 182, 140, 111, 92]),
    ('wingA', 'E', [339, 306, 293, 253, 235, 201, 184, 125, 109]),
    ('lobbyW', 'S', [54, 40]),
    ('lobbyW', 'W', [450]),
    ('wingW', 'W', [383, 360, 342, 270.5, 198, 150]),
    ('wingW', 'E', [382, 360, 343, 327, 259, 213, 198, 182, 150]),
]
COR_KNOWN = {('lobbyW', 'S', 40): 'Музей КубГУ'}     # панорамы музея стоят на схеме именно в этом помещении
COR_UNSURE = {('bar', 'N', 352), ('bar', 'N', 459), ('wingA', 'W', 252.5), ('wingA', 'E', 306)}   # знак двери на схеме неполный


# Второй этаж — схема «Главный корпус, 2 этаж». Она нарисована чуть в другом масштабе и сдвинута относительно
# схемы первого этажа; привязка — по двум общим местам: лестничная пристройка и коридор дальнего западного крыла.
PLAN2_REF = (649.25, 643.4, 607.0 / 602.9)      # точка схемы 1, та же точка на схеме 2, отношение масштабов
PLAN2_K = PLAN_K * 602.9 / 607.0
PLAN2_Y0 = 395.5                                # линия задней стены центрального блока на схеме 2
PLAN2_D0 = 18.8                                 # ...и её расстояние от фасада в метрах
COR2_RECTS = {
    'centre': (513.0, 772.0, 426.0, 449.0),     # широкий коридор через центральный блок
    'bar': (75.0, 513.0, 424.0, 436.0),         # коридор на запад
    'lobbyA': (391.0, 423.0, 393.0, 424.0),     # «Холл факультета ФИСМО»
    'wingA': (413.0, 426.0, 75.0, 393.0),       # «Коридор ФИСМО»
    'lobbyW': (13.0, 75.0, 424.0, 452.0),       # «Холл у аудитории №219» (на схеме шире на 1,5 м — не помещается в контур здания)
    'wingW': (35.0, 46.0, 118.0, 424.0),        # «Коридор у ауд. №211»
}
COR2_DOORS = [
    ('centre', 'N', [732, 555]),
    ('centre', 'S', [759, 730, 700, 668, 640, 612, 554, 525]),
    ('centre', 'E', [432.5]),
    ('bar', 'N', [504, 469, 452, 381, 347, 331, 311, 296, 239, 222, 207, 172, 156, 135.5, 104]),
    ('bar', 'S', [485, 452, 429, 410, 363, 330, 312, 292, 274, 224, 187, 171, 136, 121, 104, 83]),
    ('lobbyA', 'N', [397]),
    ('wingA', 'W', [334, 316, 302, 285, 249, 213, 179, 160, 141.5, 89]),
    ('wingA', 'E', [335, 289, 266, 249, 211, 174, 156, 122, 106]),
    ('lobbyW', 'S', [52, 38, 17]),
    ('lobbyW', 'W', [437]),
    ('wingW', 'W', [302, 235, 180.5, 163, 147]),
    ('wingW', 'E', [377, 351, 309, 294, 251, 236, 162, 147]),
]
COR2_UNSURE = {('lobbyW', 'S', 17), ('bar', 'N', 311), ('bar', 'S', 410), ('lobbyA', 'N', 397), ('lobbyW', 'W', 437)}

# Третий этаж — схема «Главный корпус, 3 этаж». Масштаб тот же, что у схемы второго этажа, рисунок сдвинут на 8 точек вправо.
# Отличия от второго этажа: между центральным блоком и западным коридором — узкий переход с дверями на обоих концах;
# дальнее западное крыло занято спортзалом (панорама тура «Спортзал»), к нему ведёт короткий проход.
PLAN3_REF = (649.25, 651.4, 607.0 / 602.9)
COR3_RECTS = {
    'centre': (518.0, 780.0, 424.0, 448.0),     # «Коридор РГФ» через центральный блок
    'link': (434.0, 518.0, 424.0, 434.0),       # переход между центральным блоком и западным коридором
    'bar': (42.0, 434.0, 423.0, 433.5),         # коридор на запад
    'lobbyA': (399.0, 433.0, 393.0, 423.0),     # «Холл филологического факультета и РГФ»
    'wingA': (422.0, 433.0, 73.0, 393.0),       # «Коридор у кафедры зарубежной литературы»
    'lobbyW': (13.0, 81.0, 433.5, 449.0),       # холл над лекционной аудиторией-амфитеатром
    'wingW': (42.0, 52.0, 331.0, 423.0),        # проход к спортзалу
}
COR3_DOORS = [
    ('centre', 'N', [768, 740.5, 711, 594, 563, 538]),
    ('centre', 'S', [767.5, 739, 709, 676, 648, 620, 590, 562, 534]),
    ('centre', 'E', [429]),
    ('link', 'N', [510, 499, 460]),
    ('link', 'S', [493, 460, 441]),
    ('bar', 'N', [389, 339, 319, 285, 265, 247, 209, 162, 141, 112]),
    ('bar', 'S', [372, 329, 228, 179, 164.5, 129, 112, 95]),
    ('wingA', 'W', [332, 300, 283, 247, 211, 177, 139, 87]),
    ('wingA', 'E', [333, 299.5, 264, 229, 209, 172, 154, 104, 80]),
    ('lobbyW', 'S', [76.5, 18]),
    ('wingW', 'E', [375, 347]),
    ('wingW', 'W', [348]),
    ('wingW', 'N', [47]),
]
COR3_KNOWN = {('wingW', 'N', 47): 'Спортзал'}       # панорама «Спортзал» стоит на схеме в зале за этой дверью
COR3_UNSURE = {('centre', 'N', 563), ('bar', 'S', 372), ('bar', 'S', 329), ('wingW', 'W', 348), ('link', 'N', 499), ('link', 'N', 510)}   # знак двери на схеме неполный

# Четвёртый этаж — схема «Главный корпус, 4 этаж». Масштаб — как у схемы первого этажа. Центральный блок целиком занят
# актовым залом (панорамы тура «Актовый зал», «Холл у актового зала»): фойе, перегородка с дверью, зал, сцена у восточной стены.
# На запад — коридор биологического факультета. Дальнее западное крыло — большой зал, вход в него на схеме не обозначен.
PLAN4_REF = (649.25, 650.0, 607.0 / 609.0)
COR4_RECTS = {
    'centre': (576.5, 752.0, 400.0, 483.0),     # актовый зал (до сцены)
    'gate': (573.0, 576.5, 438.0, 446.0),       # дверь в перегородке между фойе и залом
    'foyer': (519.0, 573.0, 400.0, 483.0),      # фойе актового зала
    'link': (480.0, 519.0, 429.0, 438.5),       # переход к западному коридору
    'bar': (36.0, 480.0, 428.5, 438.5),         # «Коридор у ауд. №414»
    'lobbyA': (395.0, 430.0, 398.0, 428.5),     # «Холл биологического факультета»
    'wingA': (418.0, 430.0, 76.0, 398.0),       # «Коридор у ауд. №433»
    'wingW': (36.0, 46.0, 336.0, 428.5),        # коридор дальнего западного крыла
}
COR4_DOORS = [
    ('link', 'N', [493]),
    ('link', 'S', [509, 491]),
    ('bar', 'N', [387, 335, 314, 264, 210, 158, 99]),
    ('bar', 'S', [368, 334, 284, 247, 177, 138, 85]),
    ('wingA', 'W', [336, 319, 305, 287, 232, 199, 152, 125, 89]),
    ('wingA', 'E', [304, 248, 199, 148, 126, 107]),
    ('wingW', 'W', [420, 381]),
    ('wingW', 'E', [380, 352]),
]
COR4_UNSURE = {('link', 'N', 493), ('bar', 'N', 99), ('wingA', 'W', 232), ('wingA', 'W', 125), ('wingW', 'W', 420)}   # знак двери на схеме неполный
# Привязка схем верхних этажей: (точка схемы 1, та же точка на этой схеме, отношение масштабов), точек на метр, линия задней стены
PLAN_UP = {
    2: (PLAN2_REF, PLAN2_K, PLAN2_Y0),
    3: (PLAN3_REF, PLAN2_K, PLAN2_Y0),
    4: (PLAN4_REF, PLAN_K * 609.0 / 607.0, 398.65),     # линия подобрана так, чтобы западный коридор встал над коридорами нижних этажей
}


# Цвет-акцент: у каждого этажа свой тон, у каждого крыла — свой оттенок. Им окрашена полоса на стене и зона на мини-карте.
ACCENT = {
    (1, 'main'): (0.80, 0.68, 0.48), (1, 'a'): (0.82, 0.58, 0.44), (1, 'w'): (0.72, 0.70, 0.44),      # 1 этаж — тёплый бежевый
    (2, 'main'): (0.46, 0.60, 0.80), (2, 'a'): (0.40, 0.68, 0.74), (2, 'w'): (0.58, 0.56, 0.82),      # 2 этаж — мягкий синий
    (1, 'e'): (0.86, 0.74, 0.40), (2, 'e'): (0.36, 0.52, 0.78), (3, 'e'): (0.36, 0.64, 0.42), (4, 'e'): (0.80, 0.46, 0.52),      # корпус С — тон этажа, но гуще
    (4, 'main'): (0.84, 0.58, 0.60), (4, 'a'): (0.84, 0.66, 0.48), (4, 'w'): (0.72, 0.56, 0.78),      # 4 этаж — мягкий розовый
    (3, 'main'): (0.48, 0.72, 0.54), (3, 'a'): (0.42, 0.70, 0.66), (3, 'w'): (0.64, 0.74, 0.44),      # 3 этаж — мягкий зелёный
    # корпус А (северная часть): тон этажа, но светлее; пятый этаж есть только в северной части — сиреневый
    (1, 'nn'): (0.84, 0.74, 0.60), (2, 'nn'): (0.44, 0.64, 0.84), (3, 'nn'): (0.46, 0.74, 0.58), (4, 'nn'): (0.86, 0.56, 0.62), (5, 'nn'): (0.60, 0.52, 0.80),      # корпус Н
    (1, 'nl'): (0.90, 0.76, 0.50), (2, 'nl'): (0.48, 0.74, 0.82), (3, 'nl'): (0.60, 0.78, 0.50), (4, 'nl'): (0.88, 0.60, 0.54), (5, 'nl'): (0.72, 0.56, 0.80),      # библиотека
    (1, 'nk'): (0.86, 0.72, 0.52), (2, 'nk'): (0.52, 0.72, 0.84), (3, 'nk'): (0.64, 0.80, 0.54), (4, 'nk'): (0.86, 0.62, 0.58), (5, 'nk'): (0.70, 0.58, 0.82),      # корпус Л
    (1, 'na'): (0.88, 0.80, 0.56), (2, 'na'): (0.52, 0.70, 0.86), (3, 'na'): (0.54, 0.78, 0.62), (4, 'na'): (0.88, 0.62, 0.68), (5, 'na'): (0.66, 0.58, 0.84),
}
WING_OF = {'bar': 'main', 'centre': 'main', 'link': 'main', 'gate': 'main', 'foyer': 'main', 'hallNW': 'main', 'hallNE': 'main', 'alcove': 'main', 'lobbyA': 'a', 'wingA': 'a', 'lobbyW': 'w', 'wingW': 'w'}
PLACE_TITLES = {
    1: {'bar': 'Главный коридор', 'alcove': 'Главный коридор', 'lobbyA': 'Холл ФКТиПМ', 'wingA': 'Коридор ФКТиПМ', 'lobbyW': 'Холл перед музеем', 'wingW': 'Западное крыло'},
    2: {'centre': 'Центральный коридор', 'bar': 'Коридор на запад', 'lobbyA': 'Холл ФИСМО', 'wingA': 'Коридор ФИСМО', 'lobbyW': 'Холл у ауд. 219', 'wingW': 'Западное крыло'},
    4: {'centre': 'Актовый зал', 'hallNW': 'Актовый зал', 'hallNE': 'Актовый зал', 'gate': 'Актовый зал', 'foyer': 'Фойе актового зала', 'link': 'Переход',
        'bar': 'Коридор у ауд. 414', 'lobbyA': 'Холл биофака', 'wingA': 'Коридор у ауд. 433', 'wingW': 'Западное крыло'},
    3: {'centre': 'Коридор РГФ', 'link': 'Переход', 'bar': 'Коридор на запад', 'lobbyA': 'Холл филфака и РГФ', 'wingA': 'Коридор филфака', 'lobbyW': 'Западный холл', 'wingW': 'Проход к спортзалу'},
}


def corridors(b, a, u, n, base, HALL, meta, floor=1, level=None, rect_px=None, door_list=None, ghosts=None, unsure=(), known=None, east=None):
    """Коридоры одного этажа. floor=1 — первый (стены ещё и преграды для пешехода); выше — человека держат края площадок"""
    b = Part(b, ((east.get('part') or 'indoor_e%d') if east else 'indoor_f%d') % floor, whole=True)
    code = (east or {}).get('wing', 'e')         # 'e' — корпус С, 'na' — корпус А
    level = base if level is None else level
    hall_base, base = base, level
    CEIL = base + (2.9 if floor == 1 else 3.3)      # на втором этаже потолок на одной высоте с холлом у лестницы
    def I(s_, d_, y):
        return W(a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_, y)
    def O(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    def block(s0, s1, d0, d1):
        pts_ = [round(v_, 2) for q in (O(s0, d0), O(s1, d0), O(s1, d1), O(s0, d1)) for v_ in q]
        if floor == 1:
            meta['blocks'].append(pts_)
        else:                                   # наверху преграды привязаны к высоте этажа
            meta.setdefault('blocksUp', []).append({'points': pts_, 'level': round(base, 3)})
    def box(mat, s0, s1, d0, d1, y0, y1):
        b.box(mat, O(min(s0, s1), max(d0, d1)), u, n, abs(s1 - s0), abs(d1 - d0), y0, y1)
    if east:
        S, D = east['S'], east['D']
    elif floor == 1:
        S = lambda x: (x - PLAN_X0) / PLAN_K
        D = lambda y: HALL - 0.05 - (y - PLAN_Y0) / PLAN_K
    else:
        ref, plan_k, plan_y0 = PLAN_UP[floor]
        S = lambda x: (ref[0] + (x - ref[1]) * ref[2] - PLAN_X0) / PLAN_K
        D = lambda y: PLAN2_D0 + (plan_y0 - y) / plan_k
    rects = {k: (S(x0), S(x1), D(y1), D(y0)) for k, (x0, x1, y0, y1) in (rect_px or COR_RECTS).items()}
    rects.update((east or {}).get('metres', {}))
    if floor != 1 and not east:
        s0_, s1_, d0_, d1_ = rects['centre']
        rects['centre'] = (s0_, s1_, d0_, HALL + 0.05)          # северная граница — ровно по холлу у лестницы
        if 'link' not in rects:
            rects['bar'] = rects['bar'][:1] + (s0_,) + rects['bar'][2:]
    ghosts = ghosts or {}
    if floor == 4 and not east:      # актовый зал занимает блок во всю глубину: по бокам от холла у лестницы — тоже зал
        lb, c_ = ghosts['lobby4'], rects['centre']
        rects['hallNW'] = (c_[0], lb[0], lb[2], lb[3])
        rects['hallNE'] = (lb[1], c_[1], lb[2], lb[3])
    allr = dict(rects)
    allr.update(ghosts)
    # сторона: (ось вдоль стены, знак нормали внутрь). Точка стены: at(t, off) — t вдоль стены, off — внутрь помещения
    def side_frame(r, side):
        s0, s1, d0, d1 = r
        if side == 'W':
            return (d0, d1), (lambda t, off: (s0 + off, t)), (u[0], -u[1], 0), +1     # надпись читается в сторону +d
        if side == 'E':
            return (d0, d1), (lambda t, off: (s1 - off, t)), (-u[0], u[1], 0), -1
        if side == 'S':
            return (s0, s1), (lambda t, off: (t, d0 + off)), (-n[0], n[1], 0), -1
        return (s0, s1), (lambda t, off: (t, d1 - off)), (n[0], -n[1], 0), +1
    def touching(name, side):
        s0, s1, d0, d1 = allr[name]
        out = []
        for other, (q0, q1, e0, e1) in list(rects.items()) + list(ghosts.items()):
            if other == name:
                continue
            if side == 'W' and abs(q1 - s0) < 0.03 or side == 'E' and abs(q0 - s1) < 0.03:
                lo, hi = max(d0, e0), min(d1, e1)
            elif side == 'S' and abs(e1 - d0) < 0.03 or side == 'N' and abs(e0 - d1) < 0.03:
                lo, hi = max(s0, q0), min(s1, q1)
            else:
                continue
            if hi - lo > 0.3:
                out.append((lo, hi))
        if floor == 1 and name == 'bar' and side == 'E' and not east:
            out.append((d0, d1))                                   # проём в холл
        if east and code == 'e' and floor == 1 and name == 'cw' and side == 'W':
            out.append((d0, d1))                                   # проём в холл главного корпуса
        if east:
            out += east.get('open', {}).get((name, side), [])      # проёмы в соседние части, построенные отдельно
        if not east and floor == 2 and name == 'wingA' and side == 'N':
            out.append(north_a_frame()['door'])                    # дверь в переход к корпусу А (знак двери на схеме 2 этажа)
        if not east and floor == 2 and name == 'wingW' and side == 'N':
            out.append(north_n_frame()['door'])                    # дверь в переход к корпусу Н (знак двери на схемах обоих корпусов)
        return sorted(out)
    def portal(at, hint, lo, hi):
        """Проём между помещениями: перемычка над проходом и два косяка"""
        if hi - lo > 3.2:
            return
        for off in (-0.06, 0.06):
            h_ = hint if off > 0 else tuple(-v for v in hint)
            b.face('cor_wall', [I(*at(lo, off), base + 2.3), I(*at(hi, off), base + 2.3), I(*at(hi, off), CEIL), I(*at(lo, off), CEIL)], h_, 3.0)
        b.face('cor_wall', [I(*at(lo, -0.06), base + 2.3), I(*at(hi, -0.06), base + 2.3), I(*at(hi, 0.06), base + 2.3), I(*at(lo, 0.06), base + 2.3)], (0, 0, -1))
        for t in (lo, hi):
            q0, q1 = at(t - 0.05, -0.08), at(t + 0.05, 0.08)
            box('door_frame', q0[0], q1[0], q0[1], q1[1], base, base + 2.3)
    rnd = random.Random(7)
    doors = {}
    for name, side, items in (door_list or COR_DOORS):
        for pos in items:
            doors.setdefault((name, side), []).append(pos)
    meta.setdefault('doors', [])
    meta.setdefault('indoor', [])
    number = 0
    for name, r in rects.items():
        s0, s1, d0, d1 = r
        check = floor == 1 and name == 'wingA' and not east          # в коридоре ФКТиПМ пол в клетку (панорама тура)
        b.face('cor_floor_check' if check else 'cor_floor', [I(s0, d0, base + 0.005), I(s1, d0, base + 0.005), I(s1, d1, base + 0.005), I(s0, d1, base + 0.005)], (0, 0, 1), 1.2 if check else 0.6)
        b.face('hall_ceiling', [I(s0, d0, CEIL), I(s1, d0, CEIL), I(s1, d1, CEIL), I(s0, d1, CEIL)], (0, 0, -1), 0.6)
        zone = [round(v_, 2) for q in (O(s0, d0), O(s1, d0), O(s1, d1), O(s0, d1)) for v_ in q]
        wing_ = code if east else WING_OF[name]
        band = 'band_%d_%s' % (floor, wing_)
        meta.setdefault('places', []).append({'floor': floor, 'title': (east['titles'] if east else PLACE_TITLES[floor])[name], 'level': round(base, 3), 'points': zone,
                                              'color': list(ACCENT[(floor, wing_)])})
        e = 0.0 if floor == 1 else 0.04      # наверху человека держат края площадок, поэтому они слегка перекрываются
        meta['raised'].append({'points': [round(v_, 3) for q in (O(s0 - e, d0 - e), O(s1 + e, d0 - e), O(s1 + e, d1 + e), O(s0 - e, d1 + e)) for v_ in q], 'height': round(base, 3)})
        if floor == 1:
            meta['indoor'].append(zone)
        # светильники вдоль длинной стороны
        long_s = (s1 - s0) >= (d1 - d0)
        length = (s1 - s0) if long_s else (d1 - d0)
        count = max(1, int(length / 3.6))
        for k in range(count):
            t = (k + 0.5) * length / count
            cs, cd = (s0 + t, (d0 + d1) / 2) if long_s else ((s0 + s1) / 2, d0 + t)
            b.face('hall_light', [I(cs - 0.3, cd - 0.3, CEIL - 0.02), I(cs + 0.3, cd - 0.3, CEIL - 0.02), I(cs + 0.3, cd + 0.3, CEIL - 0.02), I(cs - 0.3, cd + 0.3, CEIL - 0.02)], (0, 0, -1))
        for side in 'NSWE':
            (t0, t1), at, hint, reading = side_frame(r, side)
            cuts = touching(name, side)
            if side in 'WS' or (name == 'bar' and side == 'E' and floor < 3):
                for lo, hi in cuts:
                    portal(at, hint, lo, hi)
            pieces, t = [], t0
            for lo, hi in cuts:
                if lo - t > 0.02:
                    pieces.append((t, lo))
                t = max(t, hi)
            if t1 - t > 0.02:
                pieces.append((t, t1))
            for lo, hi in pieces:
                b.face('cor_wall', [I(*at(lo, 0), base), I(*at(hi, 0), base), I(*at(hi, 0), CEIL), I(*at(lo, 0), CEIL)], hint, 3.0)
                b.face(band, [I(*at(lo, 0.012), base + 0.95), I(*at(hi, 0.012), base + 0.95), I(*at(hi, 0.012), base + 1.25), I(*at(lo, 0.012), base + 1.25)], hint)
                b.face('cor_band', [I(*at(lo, 0.012), base), I(*at(hi, 0.012), base), I(*at(hi, 0.012), base + (0.95 if check else 0.1)), I(*at(lo, 0.012), base + (0.95 if check else 0.1))], hint)
                q0, q1 = at(lo, -0.3), at(hi, 0)
                if floor == 1:
                    block(min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]))
            # двери кабинетов на этой стене
            for pos in doors.get((name, side), []):
                number += 1
                t = D(pos) if side in 'WE' else S(pos)
                mat = 'door_wood' if rnd.random() < 0.45 else 'door_grey'
                q0, q1 = at(t - 0.52, 0.0), at(t + 0.52, 0.03)
                box('door_frame', q0[0], q1[0], q0[1], q1[1], base, base + 2.16)
                q0, q1 = at(t - 0.45, 0.0), at(t + 0.45, 0.05)
                box(mat, q0[0], q1[0], q0[1], q1[1], base + 0.02, base + 2.1)
                q0, q1 = at(t + 0.3, 0.05), at(t + 0.34, 0.11)
                box('metal', q0[0], q1[0], q0[1], q1[1], base + 1.0, base + 1.04)
                q0, q1 = at(t - 0.14, 0.05), at(t + 0.14, 0.06)
                box('gold', q0[0], q1[0], q0[1], q1[1], base + 1.5, base + 1.7)
                # табличка над дверью с номером двери по моей схеме (настоящие номера кабинетов не уточнены)
                q0, q1 = at(t - 0.3, 0.0), at(t + 0.3, 0.02)
                box('cor_plate', q0[0], q1[0], q0[1], q1[1], base + 2.2, base + 2.52)
                label = (COR_KNOWN if floor == 1 and not east else known or {}).get((name, side, pos))
                shown = ('%s%d-%d' % (east.get('prefix', 'С'), floor, number)) if east else str(number) if floor == 1 else '%d-%d' % (floor, number)
                for poly in text_faces(shown, 0.24 if floor == 1 and not east else 0.18):
                    b.add_mesh('frame_dark', [tuple(I(*at(t + reading * q[0], 0.035), base + 2.36 + q[1])) for q in poly], [tuple(range(len(poly)))])
                spot = O(*at(t, 0.7))
                doubt = ((east.get('unsure') is None or (name, side, pos) in east['unsure']) if east else (name, side, pos) in (COR_UNSURE if floor == 1 else unsure))
                meta['doors'].append({'n': number, 'floor': floor, 'wing': east.get('doors', 'c') if east else 'main', 'part': name, 'side': side, 'x': round(spot[0], 2), 'z': round(spot[1], 2),
                                      'label': label or 'не уточнено', 'unsure': doubt})
    # ------------------------------------------------------------ ориентиры: общие помощники
    # «тур» — предмет виден на панораме виртуального тура; «условно» — в источниках его нет, поставлен для узнаваемости места.
    used = {}                                   # занятые отрезки стен: (участок, сторона) -> [(t0, t1)]
    def wall(name, side):
        (t0, t1), at, hint, reading = side_frame(allr[name], side)
        return t0, t1, at, hint, reading
    def door_ts(name, side):
        return [D(pos) if side in 'WE' else S(pos) for pos in doors.get((name, side), [])]
    def free_spot(name, side, length, prefer):
        """Ближайшее к prefer место на стене длиной length, где нет дверей, проёмов и других ориентиров"""
        t0, t1, at, hint, reading = wall(name, side)
        busy = [(t - 0.9, t + 0.9) for t in door_ts(name, side)] + [(lo - 0.3, hi + 0.3) for lo, hi in touching(name, side)] + used.get((name, side), [])
        for k in range(0, 400):
            for sign in (1, -1):
                t = prefer + sign * k * 0.25
                lo, hi = t - length / 2, t + length / 2
                if lo < t0 + 0.3 or hi > t1 - 0.3:
                    continue
                if all(hi <= b0 or lo >= b1 for b0, b1 in busy):
                    used.setdefault((name, side), []).append((lo - 0.2, hi + 0.2))
                    return t
        return None
    def on_wall(name, side, t):
        """Рисование на стене: P(x, y, off) — x вдоль стены (для смотрящего слева направо), y — высота, off — от стены"""
        t0, t1, at, hint, reading = wall(name, side)
        return (lambda x, y, off=0.03: I(*at(t + reading * x, off), y)), hint, at, reading
    def quad(P, x0, x1, y0, y1, mat, hint, off=0.03):
        b.face(mat, [P(x0, y0, off), P(x1, y0, off), P(x1, y1, off), P(x0, y1, off)], hint)
    def label(P, text, size, mat, x=0.0, y=0.0, off=0.045):
        for poly in text_faces(text, size):
            b.add_mesh(mat, [tuple(P(x + q[0], y + q[1], off)) for q in poly], [tuple(range(len(poly)))])
    def arrow(P, x, y, size, direction, mat, hint, off=0.045):
        """Стрелка из треугольника и ножки: 'up' — прямо, 'left', 'right'"""
        h = size / 2
        if direction == 'up':
            tri, stem = [(x - h, y), (x + h, y), (x, y + h)], (x - h * 0.3, x + h * 0.3, y - h, y)
        elif direction == 'left':
            tri, stem = [(x, y - h), (x, y + h), (x - h, y)], (x, x + h, y - h * 0.3, y + h * 0.3)
        else:
            tri, stem = [(x, y - h), (x, y + h), (x + h, y)], (x - h, x, y - h * 0.3, y + h * 0.3)
        b.face(mat, [P(q[0], q[1], off) for q in tri], hint)
        b.face(mat, [P(stem[0], stem[2], off), P(stem[1], stem[2], off), P(stem[1], stem[3], off), P(stem[0], stem[3], off)], hint)
    def hanging(name, t, lines, face, color='lm_blue'):
        """Указатель под потолком поперёк коридора. face: 'E' — читают идущие на запад, 'W' — идущие на восток.
        lines: [(текст, стрелка или None)]"""
        s0, s1, d0, d1 = allr[name]
        mid = (d0 + d1) / 2
        half_w = min(0.95, (d1 - d0) / 2 - 0.1)
        top, low = CEIL - 0.12, CEIL - 0.12 - 0.3 * len(lines) - 0.1
        box(color, t - 0.02, t + 0.02, mid - half_w, mid + half_w, low, top)
        sign = 1 if face == 'E' else -1
        P = lambda x, y, off=0.03: I(t + sign * off, mid + sign * x, y)
        hint = (sign * u[0], -sign * u[1], 0)
        for row, (text, direction) in enumerate(lines):
            y = top - 0.22 - row * 0.3
            size_ = min(0.15, (2 * half_w - (0.55 if direction else 0.15)) / (len(text) * 0.72))      # длинные надписи мельче, чтобы влезли
            label(P, text, size_, 'cor_plate', -0.12 if direction else 0.0, y)
            if direction:
                arrow(P, half_w - 0.2, y, 0.2, direction, 'cor_plate', hint)
        for dd in (mid - half_w + 0.1, mid + half_w - 0.1):
            q = O(t, dd)
            cone(b, 'metal', q[0], q[1], top, CEIL, 0.01, 0.01, 4)
    def bench(name, side, t, length=1.6):
        t0, t1, at, hint, reading = wall(name, side)
        q0, q1 = at(t - length / 2, 0.05), at(t + length / 2, 0.45)
        box('lm_wood', min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]), base + 0.4, base + 0.46)
        for tt in (t - length / 2 + 0.1, t + length / 2 - 0.16):
            q0, q1 = at(tt, 0.08), at(tt + 0.06, 0.42)
            box('lm_dark', min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]), base, base + 0.4)
        q0, q1 = at(t - length / 2, 0.0), at(t + length / 2, 0.45)
        block(min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]))
    def plant(name, side, t):
        t0, t1, at, hint, reading = wall(name, side)
        c_ = at(t, 0.3)
        q = O(*c_)
        cone(b, 'pot', q[0], q[1], base, base + 0.45, 0.2, 0.25, 8)
        verts, faces = ico(0.42, tuple(W(q[0], q[1], base + 0.95)), (1, 1, 1.4), 0.12, sub=1)
        b.add_mesh('lm_green', verts, faces)
        block(c_[0] - 0.28, c_[0] + 0.28, c_[1] - 0.28, c_[1] + 0.28)
    def board(name, side, t, width, title, frame='cor_band', title_mat='lm_blue', papers=('cor_plate', 'lm_yellow', 'cor_plate', 'door_frame')):
        """Доска объявлений: рама, заголовок, листки"""
        P, hint, at, reading = on_wall(name, side, t)
        quad(P, -width / 2, width / 2, base + 1.0, base + 2.2, frame, hint, 0.03)
        quad(P, -width / 2 + 0.06, width / 2 - 0.06, base + 1.06, base + 1.88, 'cor_plate', hint, 0.036)
        label(P, title, 0.085, title_mat, 0, base + 2.04)
        n_ = max(2, int(width / 0.42))
        for k in range(n_):
            x0 = -width / 2 + 0.14 + k * (width - 0.28) / n_
            quad(P, x0, x0 + 0.26, base + 1.25 + (k % 2) * 0.12, base + 1.62 + (k % 2) * 0.12, papers[k % len(papers)], hint, 0.042)

    def sofa(name, side, t, length=1.8, mat='band_2_main'):
        t0, t1, at, hint, reading = wall(name, side)
        for (o0, o1, y0, y1) in ((0.05, 0.75, 0.0, 0.42), (0.05, 0.25, 0.42, 0.85)):
            q0, q1 = at(t - length / 2, o0), at(t + length / 2, o1)
            box(mat, min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]), base + y0, base + y1)
        q0, q1 = at(t - length / 2, 0.0), at(t + length / 2, 0.75)
        block(min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]))
    def cooler(name, side, t):
        t0, t1, at, hint, reading = wall(name, side)
        q0, q1 = at(t - 0.17, 0.04), at(t + 0.17, 0.38)
        lo_s, hi_s, lo_d, hi_d = min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1])
        box('cor_plate', lo_s, hi_s, lo_d, hi_d, base, base + 1.0)
        q = O((lo_s + hi_s) / 2, (lo_d + hi_d) / 2)
        cone(b, 'lm_screen', q[0], q[1], base + 1.0, base + 1.42, 0.13, 0.11, 10)
        block(lo_s - 0.03, hi_s + 0.03, lo_d - 0.04, hi_d + 0.03)
    def name_sign(name, t, text, color):
        """Табличка-название под потолком, читается с обеих сторон коридора"""
        hanging(name, t, [(text, None)], 'E', color)
        hanging(name, t, [(text, None)], 'W', color)

    if east:
        # ---------------------------------------------------------- корпус С: указатели и названия из тура
        for name, t, lines, face in east.get('signs', []):
            hanging(name, S(t) if isinstance(t, (int, float)) else t(allr), lines, face, band)
        for name, x_, text in east.get('names', []):
            name_sign(name, S(x_), text, 'band_%d_%s' % (floor, code))
        for name, side, x_ in east.get('plants', []):
            t = free_spot(name, side, 0.8, S(x_) if side in 'NS' else D(x_))
            if t is not None:
                plant(name, side, t)
        return rects
    if floor == 4:
        # ---------------------------------------------------------- ориентиры четвёртого этажа
        # Сцена и две колонны зала — по схеме (место), вид условный. Названия — из подписей панорам тура.
        c_ = allr['centre']
        st0, st1 = D(470.0), D(412.0)
        box('lm_wood', c_[1] - 1.6, c_[1], st0, st1, base, base + 0.8)
        block(c_[1] - 1.6, c_[1], st0, st1)
        b.face('lm_red', [I(c_[1] - 0.03, st0, base + 0.8), I(c_[1] - 0.03, st1, base + 0.8), I(c_[1] - 0.03, st1, CEIL - 0.15), I(c_[1] - 0.03, st0, CEIL - 0.15)], (-u[0], u[1], 0))
        for y_ in (432.0, 450.0):
            cs, cd = S(603.0), D(y_)
            box('hall_wall', cs - 0.25, cs + 0.25, cd - 0.25, cd + 0.25, base, CEIL)
            block(cs - 0.25, cs + 0.25, cd - 0.25, cd + 0.25)
        fo = allr['foyer']
        t = free_spot('foyer', 'E', 3.2, D(425.0))
        if t is not None:
            P, hint, at, reading = on_wall('foyer', 'E', t)
            quad(P, -1.5, 1.5, base + 2.45, base + 2.95, 'band_4_main', hint)
            label(P, 'АКТОВЫЙ ЗАЛ', 0.22, 'cor_plate', 0, base + 2.7)
        for side, prefer in (('N', fo[0] + 2.0), ('S', fo[0] + 2.0), ('N', fo[1] - 2.0)):
            t = free_spot('foyer', side, 0.8, prefer)
            if t is not None:
                plant('foyer', side, t)
        t = free_spot('foyer', 'W', 2.0, D(460.0))
        if t is not None:
            bench('foyer', 'W', t)
        bs0, bs1 = allr['bar'][0], allr['bar'][1]
        la = allr['lobbyA']
        hanging('bar', bs1 - 2.0, [('БИОФАК', 'up'), ('АУД. 414, 433', 'up')], 'E', 'band_4_main')
        hanging('bar', la[1] + 1.2, [('БИОФАК', 'right'), ('АУД. 414', 'up')], 'E', 'band_4_a')
        hanging('bar', la[0] - 1.2, [('АУД. 433', 'left'), ('АКТОВЫЙ ЗАЛ', 'up')], 'W', 'band_4_a')
        hanging('bar', bs0 + 6.0, [('АКТОВЫЙ ЗАЛ', 'up'), ('ЛЕСТНИЦА', 'up')], 'W', 'band_4_w')
        name_sign('bar', S(407.0), 'МУЗЕЙ БИОФАКА', 'band_4_main')
        t = free_spot('lobbyA', 'W', 2.4, (la[2] + la[3]) / 2)
        if t is not None:
            board('lobbyA', 'W', t, 2.4, 'БИОФАК', frame='band_4_a', title_mat='cor_plate')
        for name, side, prefer in (('lobbyA', 'N', la[0] + 1.0), ('bar', 'S', bs0 + 3.0)):
            t = free_spot(name, side, 0.8, prefer)
            if t is not None:
                plant(name, side, t)
        t = free_spot('bar', 'S', 2.0, (bs0 + la[0]) / 2)
        if t is not None:
            bench('bar', 'S', t)
    if floor == 3:
        # ---------------------------------------------------------- ориентиры третьего этажа
        # Названия — из подписей панорам тура; скамейки, растения и стенды условные.
        cs0, cs1 = allr['centre'][0], allr['centre'][1]
        bs0, bs1 = allr['bar'][0], allr['bar'][1]
        la = allr['lobbyA']
        name_sign('centre', S(650), 'РГФ', 'band_3_main')
        hanging('centre', cs0 + 3.0, [('ФИЛФАК', 'up'), ('СПОРТЗАЛ', 'up')], 'E', 'band_3_main')
        hanging('bar', la[1] - 1.0, [('ФИЛФАК', 'right'), ('СПОРТЗАЛ', 'up')], 'E', 'band_3_a')
        hanging('bar', la[0] - 1.2, [('ФИЛФАК', 'left'), ('ЛЕСТНИЦА', 'up')], 'W', 'band_3_a')
        hanging('bar', bs0 + 6.0, [('ЛЕСТНИЦА', 'up'), ('РГФ', 'up')], 'W', 'band_3_w')
        hanging('bar', (la[0] + bs0) / 2, [('СПОРТЗАЛ', 'up')], 'E', 'band_3_w')
        t = free_spot('lobbyA', 'W', 2.4, (la[2] + la[3]) / 2)
        if t is not None:
            board('lobbyA', 'W', t, 2.4, 'ФИЛФАК И РГФ', frame='band_3_a', title_mat='cor_plate')
        for name, side, prefer in (('lobbyA', 'N', la[0] + 1.0), ('centre', 'N', cs1 - 6.0), ('lobbyW', 'N', allr['lobbyW'][0] + 2.0)):
            t = free_spot(name, side, 0.8, prefer)
            if t is not None:
                plant(name, side, t)
        for name, side, prefer in (('bar', 'S', (bs0 + la[0]) / 2 + 6.0), ('lobbyW', 'N', allr['lobbyW'][0] + 6.0)):
            t = free_spot(name, side, 2.0, prefer)
            if t is not None:
                bench(name, side, t)
        lb = allr['lobby3']
        for side in 'WE':
            t = free_spot('lobby3', side, 2.2, (lb[2] + lb[3]) / 2)
            if t is not None:
                bench('lobby3', side, t)
    if floor == 2:
        # ---------------------------------------------------------- ориентиры второго этажа
        # Названия мест — из подписей панорам тура (где стоит панорама, там и табличка); мебель, кулер и доска почёта — условно.
        lb = allr['lobby2']
        for side in 'WE':
            t = free_spot('lobby2', side, 2.2, (lb[2] + lb[3]) / 2)
            if t is not None:
                sofa('lobby2', side, t)
        t = free_spot('lobby2', 'N', 2.6, lb[0] + 2.3)
        if t is not None:
            board('lobby2', 'N', t, 2.6, 'ДОСКА ПОЧЁТА', frame='band_2_main', title_mat='cor_plate', papers=('lm_yellow', 'cor_plate', 'lm_yellow', 'cor_plate'))
        for x_, text in ((560, 'ПРИЁМНАЯ ПРОРЕКТОРА'), (730, 'НИЧ')):
            name_sign('centre', S(x_), text, 'band_2_main')
        name_sign('centre', S(600) - 0.6, 'УМУ', 'band_2_main')
        bs0, bs1, bd0, bd1 = rects['bar']
        la = rects['lobbyA']
        hanging('bar', bs1 - 2.0, [('ФИСМО', 'up'), ('АУД. 211, 219', 'up')], 'E', 'band_2_main')
        hanging('bar', la[1] + 1.2, [('ФИСМО', 'right'), ('АУД. 211, 219', 'up')], 'E', 'band_2_a')
        hanging('bar', la[0] - 1.2, [('ФИСМО', 'left'), ('ЛЕСТНИЦА', 'up')], 'W', 'band_2_a')
        hanging('bar', bs0 + 4.0, [('ЛЕСТНИЦА', 'up'), ('ВЫХОД', 'up')], 'W', 'band_2_w')
        hanging('bar', (la[0] + bs0) / 2, [('АУД. 211, 219', 'up')], 'E', 'band_2_w')
        name_sign('bar', S(483), 'ПРОФКОМ СТУДЕНТОВ', 'band_2_main')
        name_sign('bar', S(279), 'ЗАЛ ДИССОВЕТА', 'band_2_main')
        t = free_spot('bar', 'S', 0.8, bs0 + 45.0)
        if t is not None:
            cooler('bar', 'S', t)
        for prefer, side in ((bs0 + 22.0, 'N'), (bs0 + 62.0, 'S')):
            t = free_spot('bar', side, 2.0, prefer)
            if t is not None:
                bench('bar', side, t)
        t = free_spot('lobbyA', 'W', 2.4, (la[2] + la[3]) / 2)
        if t is not None:
            board('lobbyA', 'W', t, 2.4, 'ФИСМО', frame='band_2_a', title_mat='cor_plate')
        wa = rects['wingA']
        t = free_spot('wingA', 'E', 2.0, wa[2] + 12.0)
        if t is not None:
            board('wingA', 'E', t, 2.0, 'ОБЪЯВЛЕНИЯ', frame='band_2_a', title_mat='cor_plate')
        for k, side in enumerate('WE'):
            t = free_spot('wingA', side, 0.8, wa[2] + (wa[3] - wa[2]) * (0.35 + 0.35 * k))
            if t is not None:
                plant('wingA', side, t)
        lw = rects['lobbyW']
        t = free_spot('lobbyW', 'N', 2.0, lw[0] + 2.5)
        if t is not None:
            bench('lobbyW', 'N', t)
        ww = rects['wingW']
        for k, side in enumerate('EWE'):
            t = free_spot('wingW', side, 0.8, ww[2] + (ww[3] - ww[2]) * (k + 1) / 4)
            if t is not None:
                plant('wingW', side, t)
    if floor != 1:
        return rects
    # двери поперёк главного коридора (на схеме — перегородки с дверным знаком): рамы, створки открыты
    s0, s1, d0, d1 = rects['bar']
    for x in (434.0, 514.0):
        at = (lambda s_: (lambda t, off: (s_ + off, t)))(S(x))
        portal(at, (u[0], -u[1], 0), d0, d1)
    # стенд факультета в холле ФКТиПМ (панорама «Холл ФКТиПМ у деканата»). На какой именно стене он висит,
    # по панораме и схеме однозначно не определить — повешен на западной.
    s0, s1, d0, d1 = rects['lobbyA']
    mid = (d0 + d1) / 2
    b.face('cor_plate', [I(s0 + 0.03, mid - 2.4, base + 1.25), I(s0 + 0.03, mid + 2.4, base + 1.25), I(s0 + 0.03, mid + 2.4, base + 2.35), I(s0 + 0.03, mid - 2.4, base + 2.35)], (u[0], -u[1], 0))
    for row, line in enumerate(('ФАКУЛЬТЕТ КОМПЬЮТЕРНЫХ ТЕХНОЛОГИЙ', 'И ПРИКЛАДНОЙ МАТЕМАТИКИ')):
        for poly in text_faces(line, 0.12):
            b.add_mesh('sign_blue', [tuple(I(s0 + 0.045, mid + q[0], base + 2.2 - row * 0.17 + q[1])) for q in poly], [tuple(range(len(poly)))])
    for k in range(9):
        b.face('door_frame', [I(s0 + 0.045, mid - 2.2 + k * 0.5, base + 1.35), I(s0 + 0.045, mid - 1.85 + k * 0.5, base + 1.35),
                            I(s0 + 0.045, mid - 1.85 + k * 0.5, base + 1.85), I(s0 + 0.045, mid - 2.2 + k * 0.5, base + 1.85)], (u[0], -u[1], 0))
    # ------------------------------------------------------------ ориентиры первого этажа (сами предметы)
    # холл ФКТиПМ (тур): две колонны и красные стенды у входа; расстановка колонн условная — на схеме их нет
    s0, s1, d0, d1 = rects['lobbyA']
    for k in (1, 2):
        cs = s0 + (s1 - s0) * k / 3
        box('hall_wall', cs - 0.25, cs + 0.25, d0 + 0.6, d0 + 1.1, base, CEIL)
        block(cs - 0.25, cs + 0.25, d0 + 0.6, d0 + 1.1)
    t = free_spot('lobbyA', 'E', 2.4, (d0 + d1) / 2)
    if t is not None:
        board('lobbyA', 'E', t, 2.4, 'ИНФОРМАЦИЯ', frame='lm_red', title_mat='cor_plate', papers=('cor_plate', 'lm_yellow', 'lm_blue', 'cor_plate'))
    t = free_spot('lobbyA', 'N', 1.6, s0 + 2.0)
    if t is not None:                                   # фотопанно (тур): цветной прямоугольник, само изображение не воспроизводится
        P, hint, at, reading = on_wall('lobbyA', 'N', t)
        quad(P, -0.7, 0.7, base + 0.9, base + 2.5, 'lm_blue', hint)
        quad(P, -0.7, 0.7, base + 0.9, base + 1.3, 'lm_yellow', hint, 0.036)
    # коридор ФКТиПМ (тур): стенд «Информация приёмной комиссии» и информационный киоск рядом
    t = free_spot('wingA', 'W', 2.4, D(236))
    if t is not None:
        board('wingA', 'W', t, 2.4, 'ИНФОРМАЦИЯ ПРИЁМНОЙ КОМИССИИ')
        tk = free_spot('wingA', 'W', 0.7, t - 2.0)
        if tk is not None:
            t0, t1, at, hint, reading = wall('wingA', 'W')
            q0, q1 = at(tk - 0.25, 0.05), at(tk + 0.25, 0.4)
            box('lm_red', min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]), base, base + 1.25)
            q0, q1 = at(tk - 0.2, 0.3), at(tk + 0.2, 0.42)
            box('lm_screen', min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]), base + 0.85, base + 1.2)
            q0, q1 = at(tk - 0.3, 0.0), at(tk + 0.3, 0.45)
            block(min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1]))
    # холл перед музеем: вывеска над дверью музея (вид вывески условный) и витрина у стены (условно)
    P, hint, at, reading = on_wall('lobbyW', 'S', S(40))
    quad(P, -1.1, 1.1, base + 2.5, base + 2.85, 'lm_blue', hint, 0.05)
    label(P, 'МУЗЕЙ', 0.2, 'cor_plate', 0, base + 2.675, 0.065)
    t = free_spot('lobbyW', 'N', 1.8, (rects['lobbyW'][0] + rects['lobbyW'][1]) / 2 + 2.0)
    if t is not None:
        t0, t1, at, hint, reading = wall('lobbyW', 'N')
        q0, q1 = at(t - 0.8, 0.05), at(t + 0.8, 0.5)
        lo_s, hi_s, lo_d, hi_d = min(q0[0], q1[0]), max(q0[0], q1[0]), min(q0[1], q1[1]), max(q0[1], q1[1])
        box('cor_plate', lo_s, hi_s, lo_d, hi_d, base, base + 0.8)
        box('case_glass', lo_s, hi_s, lo_d, hi_d, base + 0.8, base + 2.0)
        box('lm_wood', lo_s, hi_s, lo_d, hi_d, base + 2.0, base + 2.08)
        for k in range(4):
            q = O(lo_s + 0.25 + k * 0.38, (lo_d + hi_d) / 2)
            cone(b, 'gold', q[0], q[1], base + 0.82, base + 1.1 + (k % 2) * 0.1, 0.07, 0.04, 8)
        block(lo_s, hi_s, lo_d - 0.05, hi_d + 0.05)
    # главный коридор: скамейки у стен (тур) и указатели под потолком (условно)
    bs0, bs1, bd0, bd1 = rects['bar']
    for prefer, side in ((bs1 - 14.0, 'S'), (bs0 + 30.0, 'N'), (bs0 + 9.0, 'S')):
        t = free_spot('bar', side, 2.0, prefer)
        if t is not None:
            bench('bar', side, t)
    la = rects['lobbyA']
    hanging('bar', bs1 - 2.5, [('ФКТиПМ', 'up'), ('МУЗЕЙ', 'up')], 'E', 'band_1_main')
    hanging('bar', la[1] + 1.2, [('ФКТиПМ', 'right'), ('МУЗЕЙ', 'up')], 'E', 'band_1_a')
    hanging('bar', la[0] - 1.2, [('ФКТиПМ', 'left'), ('ВЫХОД', 'up')], 'W', 'band_1_a')
    hanging('bar', bs0 + 4.0, [('ВЫХОД', 'up'), ('ХОЛЛ', 'up')], 'W', 'band_1_w')
    hanging('bar', (la[0] + bs0) / 2, [('МУЗЕЙ', 'up')], 'E', 'band_1_w')
    # дальнее западное крыло: растения в кадках (условно)
    ws0, ws1, wd0, wd1 = rects['wingW']
    for k, side in enumerate('WEW'):
        t = free_spot('wingW', side, 0.8, wd0 + (wd1 - wd0) * (k + 1) / 4)
        if t is not None:
            plant('wingW', side, t)
    for k, side in enumerate('EW'):
        t = free_spot('wingA', side, 0.8, rects['wingA'][2] + (rects['wingA'][3] - rects['wingA'][2]) * (0.3 + 0.4 * k))
        if t is not None:
            plant('wingA', side, t)
    spot = O(-5.0, (rects['bar'][2] + rects['bar'][3]) / 2)
    meta['corridor'] = {'x': round(spot[0], 2), 'z': round(spot[1], 2), 'yaw': round(math.atan2(-u[0], u[1]), 3)}
    return rects['bar']


def center_block(b, building, meta):
    """Центральный блок с главным входом — по панораме: белый объём, высокие остеклённые пролёты между
    белыми рёбрами, глухой пояс сверху, остеклённый первый этаж с козырьком, ступени."""
    poly = pts(building['points'])
    H = 18.6
    edges = list(outward_edges(poly))
    front = max(edges, key=lambda e: e[2][1])        # край, смотрящий на юг (к улице)
    for a, c, n, L in edges:
        if (a, c) == (front[0], front[1]):
            continue
        if n[0] < -0.5:
            continue        # западная боковая стена: ниже крыши крыла её не видно, а в ней проём в коридор — рисуется ниже
        if n[1] < -0.5:
            back = (a, c, n, L)
            continue        # задняя стена: в ней разрыв под лестничную пристройку — рисуется после холла
        style_wall['whitewall'] = 'white'
        STYLES['_white'] = dict(STYLES['punched'], wall='white', bay=3.4, win_w=2.0, win_h=1.9)
        if n[0] > 0.5:      # восточная боковая стена: ниже крыши корпуса С её не видно, а в ней проём из холла
            b.face('white', [W(a[0], a[1], 4.0), W(c[0], c[1], 4.0), W(c[0], c[1], H), W(a[0], a[1], H)], (n[0], -n[1], 0), 3.0)
            facade(Builder('_void'), a, c, n, 0, 5, H / 5, 'whitewall', 0.0)      # вхолостую: чтобы случайная расстановка двора не сдвинулась
            continue
        # боковые стены примыкают к крыльям — глухие; задняя — с окнами
        facade(b, a, c, n, 0, 5, H / 5, '_white' if n[1] < -0.5 else 'whitewall', 0.0)
    a, c, n, L = front
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    out = (n[0], -n[1], 0)
    def P(s, d, y):
        return W(a[0] + u[0] * s + n[0] * d, a[1] + u[1] * s + n[1] * d, y)
    def Q(s0, s1, y0, y1, mat, d=0.0, scale=3.0):
        b.face(mat, [P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1)], out, scale)

    side_depth = min(e[3] for e in edges)
    b.face('white', [W(a[0], a[1], 4.0), W(a[0] - n[0] * side_depth, a[1] - n[1] * side_depth, 4.0),
                     W(a[0] - n[0] * side_depth, a[1] - n[1] * side_depth, H), W(a[0], a[1], H)], (-u[0], u[1], 0), 3.0)
    pier = 4.2            # глухие белые простенки по краям
    base = 0.45           # пол первого этажа — над тремя ступенями
    g_top = 4.4           # верх остеклённого первого этажа
    band = 15.4           # низ верхнего глухого пояса
    Q(0, pier, 0, H, 'white')
    Q(L - pier, L, 0, H, 'white')
    Q(pier, L - pier, band, H, 'white')
    Q(pier, L - pier, 0, base, 'step')
    # первый этаж: витражи, в середине двери
    span = L - 2 * pier
    cells = round(span / 1.65)
    cw = span / cells
    # вход — в пролёте слева от оси (на плане этажа тамбур смещён на полпролёта к западу)
    door_c = L / 2 - (span / 10) / 2
    Q(pier, door_c - 0.95, base, g_top, 'glass', -0.25)
    Q(door_c + 0.95, L - pier, base, g_top, 'glass', -0.25)
    Q(door_c - 0.95, door_c + 0.95, base + 2.3, g_top, 'glass', -0.25)
    b.face('white', [P(pier, 0, g_top), P(L - pier, 0, g_top), P(L - pier, -0.25, g_top), P(pier, -0.25, g_top)], (0, 0, -1))
    for k in range(cells + 1):
        s = pier + k * cw
        door = abs(k - cells / 2) <= 3
        b.box('frame_dark' if door else 'frame', (a[0] + u[0] * (s - 0.04) + n[0] * -0.25, a[1] + u[1] * (s - 0.04) + n[1] * -0.25), u, n, 0.08, 0.1, base, g_top)
    for y in (base + 2.25, g_top - 0.08):
        b.box('frame', (a[0] + u[0] * pier + n[0] * -0.25, a[1] + u[1] * pier + n[1] * -0.25), u, n, span, 0.1, y, y + 0.08)
    # дверные ручки-поручни: тёмная горизонталь на высоте руки у средних створок
    mid = pier + span / 2
    b.box('frame_dark', (a[0] + u[0] * (mid - 3 * cw) + n[0] * -0.2, a[1] + u[1] * (mid - 3 * cw) + n[1] * -0.2), u, n, 6 * cw, 0.06, base + 1.0, base + 1.06)
    # нижняя тёмная панель дверей
    b.face('frame_dark', [P(mid - 3 * cw, -0.23, base), P(mid + 3 * cw, -0.23, base), P(mid + 3 * cw, -0.23, base + 0.3), P(mid - 3 * cw, -0.23, base + 0.3)], out)
    # перила по краям крыльца
    for s in (pier - 1.0, L - pier + 1.0):
        for d in (0.3, 2.3, 4.3):
            cone(b, 'metal', a[0] + u[0] * s + n[0] * d, a[1] + u[1] * s + n[1] * d, base, base + 0.95, 0.025, 0.025, 6)
        b.box('metal', (a[0] + u[0] * (s - 0.03) + n[0] * 0.3, a[1] + u[1] * (s - 0.03) + n[1] * 0.3), u, n, 0.06, 4.0, base + 0.92, base + 0.98, bottom=True)
    # козырёк над входом
    b.box('white', (a[0] + u[0] * (pier - 0.6), a[1] + u[1] * (pier - 0.6)), u, n, span + 1.2, 2.6, g_top, g_top + 0.4, bottom=True)
    # высокие пролёты: стекло в глубине, между ними белые рёбра
    bays = 10
    bw = span / bays
    y0, y1 = g_top + 0.4, band
    Q(pier, L - pier, y0, y1, 'glass_tall', -0.45)
    for k in range(bays + 1):
        s = pier + k * bw - 0.25
        b.box('white', (a[0] + u[0] * s + n[0] * -0.45, a[1] + u[1] * s + n[1] * -0.45), u, n, 0.5, 1.0, y0, y1)
    for k in range(bays):
        s0 = pier + k * bw + 0.25
        w = bw - 0.5
        for m in range(1, 4):       # вертикальные переплёты
            s = s0 + w * m / 4
            Q(s - 0.03, s + 0.03, y0, y1, 'frame', -0.42)
        rows = 8
        for m in range(1, rows):    # горизонтальные переплёты
            y = y0 + (y1 - y0) * m / rows
            Q(s0, s0 + w, y - 0.03, y + 0.03, 'frame', -0.42)
        # непрозрачные пояса между этажами — на панораме они светлее стекла
        for m in (3, 6):
            y = y0 + (y1 - y0) * m / rows
            Q(s0, s0 + w, y - 0.45, y, 'frame', -0.43)
    # название на верхнем поясе — отдельными объёмными буквами во всю ширину остекления, как на панораме
    # (заказчик разрешил название и эмблему 23.11.2026)
    letters = text_faces('КУБАНСКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ', 1.0, 'Arial Bold', 1.55)
    xs_ = [q[0] for poly_ in letters for q in poly_]
    fit = (span * 0.92) / (max(xs_) - min(xs_))
    shift = (max(xs_) + min(xs_)) / 2
    for poly_ in letters:
        # для зрителя перед фасадом «право» — это -u (фасад смотрит на юг, u идёт с запада... проверяется снимком)
        b.add_mesh('sign_gold', [tuple(P(L / 2 + SIGN_DIR * (q[0] - shift) * fit, 0.05, band + 1.55 + q[1] * fit)) for q in poly_],
                   [tuple(range(len(poly_))) if SIGN_DIR > 0 else tuple(reversed(range(len(poly_))))])
    # простенки первого этажа под каждым ребром — на фотографиях витражи разделены белыми столбами
    for k in range(1, bays):
        s = pier + k * bw - 0.3
        b.box('white', (a[0] + u[0] * s + n[0] * -0.25, a[1] + u[1] * s + n[1] * -0.25), u, n, 0.6, 0.4, base, g_top)
    # три двустворчатые двери в средних пролётах: тёмные рамы, светлая фрамуга, ручки
    for k in (bays // 2,):
        c0 = pier + k * bw + bw / 2
        for side in (-1, 1):
            s0 = c0 + (side - 1) * 0.5 * 0.95
            b.box('frame_dark', (a[0] + u[0] * s0 + n[0] * -0.2, a[1] + u[1] * s0 + n[1] * -0.2), u, n, 0.95, 0.07, base, base + 2.3)
            b.box('door_glass', (a[0] + u[0] * (s0 + 0.1) + n[0] * -0.13, a[1] + u[1] * (s0 + 0.1) + n[1] * -0.13), u, n, 0.75, 0.02, base + 0.35, base + 2.15)
            hx = c0 + side * 0.12 - 0.02
            b.box('metal', (a[0] + u[0] * hx + n[0] * -0.11, a[1] + u[1] * hx + n[1] * -0.11), u, n, 0.04, 0.06, base + 0.9, base + 1.4)
    # табличка над средней дверью — золотистая доска (текст на ней не воспроизводится: слишком мелкий)
    c0 = door_c
    for side in (-1, 1):                                  # рама открытого входа
        b.box('frame_dark', (a[0] + u[0] * (c0 + side * 0.95 - 0.04) + n[0] * -0.25, a[1] + u[1] * (c0 + side * 0.95 - 0.04) + n[1] * -0.25), u, n, 0.08, 0.1, base, base + 2.3)
    b.box('gold', (a[0] + u[0] * (c0 - 0.9) + n[0] * -0.19, a[1] + u[1] * (c0 - 0.9) + n[1] * -0.19), u, n, 1.8, 0.05, base + 2.5, base + 3.6)
    # флагшток с флагом на крыше над входом
    fx, fz = a[0] + u[0] * L / 2 + n[0] * -1.5, a[1] + u[1] * L / 2 + n[1] * -1.5
    cone(b, 'lamp', fx, fz, H, H + 6.5, 0.06, 0.04, 8)
    for i, mat in enumerate(('flag_red', 'flag_blue', 'flag_white')):
        b.box(mat, (fx + u[0] * 0.05, fz + u[1] * 0.05), u, n, 2.4, 0.03, H + 4.7 + i * 0.55, H + 5.25 + i * 0.55, bottom=True)
    roof(b, poly, H, 'white', 0.5)
    roof_units(b, poly, H, 5)
    # крыльцо: три ступени во всю ширину остекления
    for i in range(3):
        depth = 4.5 + (2 - i) * 0.35
        b.box('step', (a[0] + u[0] * (pier - 1.0 - (2 - i) * 0.35), a[1] + u[1] * (pier - 1.0 - (2 - i) * 0.35)), u, n,
              span + 2.0 + (2 - i) * 0.7, depth, i * 0.15, (i + 1) * 0.15)
    porch = [(a[0] + u[0] * s + n[0] * d, a[1] + u[1] * s + n[1] * d) for s, d in ((pier - 1.0, 0), (L - pier + 1.0, 0), (L - pier + 1.0, 4.5), (pier - 1.0, 4.5))]
    meta['raised'].append({'points': [round(v, 2) for p in porch for v in p], 'height': 0.45})
    meta['entrance'] = {'x': round(a[0] + u[0] * door_c + n[0] * 8, 1), 'z': round(a[1] + u[1] * door_c + n[1] * 8, 1)}
    hall(b, a, u, n, L, min(e[3] for e in edges), door_c, base, meta)
    annex = meta.pop('_annex')
    depth_ = min(e[3] for e in edges)
    ba, bc, bn, bL = back
    be = ((bc[0] - ba[0]) / bL, (bc[1] - ba[1]) / bL)
    mid_ = (a[0] + u[0] * door_c - n[0] * depth_, a[1] + u[1] * door_c - n[1] * depth_)
    t0 = (mid_[0] - ba[0]) * be[0] + (mid_[1] - ba[1]) * be[1]
    for t_a, t_b in ((0.0, t0 - annex['outer']), (t0 + annex['outer'], bL)):
        facade(b, (ba[0] + be[0] * t_a, ba[1] + be[1] * t_a), (ba[0] + be[0] * t_b, ba[1] + be[1] * t_b), bn, 0, 5, H / 5, '_white', 0.0)
    def AO(s_, d_):
        return (a[0] + u[0] * s_ - n[0] * d_, a[1] + u[1] * s_ - n[1] * d_)
    ring = [AO(door_c - annex['outer'], annex['d0']), AO(door_c - annex['outer'], annex['d1']), AO(door_c + annex['outer'], annex['d1']), AO(door_c + annex['outer'], annex['d0'])]
    for (p_, q_), nrm in zip(zip(ring, ring[1:]), ((-u[0], -u[1]), (-n[0], -n[1]), (u[0], u[1]))):
        facade(b, p_, q_, nrm, 0, 5, H / 5, '_white', 0.0)
    roof(b, ring, H, 'white', 0.5)
    meta['annex'] = [round(v_, 2) for q in ring for v_ in q]
    return dict(a=a, u=u, n=n, L=L)

# ---------------------------------------------------------------- зелень и мелкие предметы

def ico(radius, center, squash=(1, 1, 1), jitter=0.0, sub=1):
    """Шар из треугольников (икосфера) — вершины и грани"""
    t = (1 + 5 ** 0.5) / 2
    v = [Vector(p).normalized() for p in [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(sub):
        cache, nf = {}, []
        def midpoint(i, j):
            key = (min(i, j), max(i, j))
            if key not in cache:
                v.append(((v[i] + v[j]) / 2).normalized())
                cache[key] = len(v) - 1
            return cache[key]
        for a, b_, c in f:
            ab, bc, ca = midpoint(a, b_), midpoint(b_, c), midpoint(c, a)
            nf += [(a, ab, ca), (b_, bc, ab), (c, ca, bc), (ab, bc, ca)]
        f = nf
    out = []
    for p in v:
        k = 1 + (rnd.random() - 0.5) * jitter
        out.append((center[0] + p.x * radius * squash[0] * k, center[1] + p.y * radius * squash[1] * k, center[2] + p.z * radius * squash[2] * k))
    return out, f

def cone(b, mat, x, z, h0, h1, r0, r1, sides=8):
    ring0 = [W(x + math.cos(i / sides * math.tau) * r0, z + math.sin(i / sides * math.tau) * r0, h0) for i in range(sides)]
    ring1 = [W(x + math.cos(i / sides * math.tau) * r1, z + math.sin(i / sides * math.tau) * r1, h1) for i in range(sides)]
    for i in range(sides):
        j = (i + 1) % sides
        mid = (ring0[i] + ring0[j]) / 2 - W(x, z, h0)
        b.face(mat, [ring0[i], ring0[j], ring1[j], ring1[i]] if r1 > 0.01 else [ring0[i], ring0[j], ring1[i]], (mid.x, mid.y, 0.3))

def tree(b, x, z, size=1.0):
    AUDIT['items'].append(dict(kind='tree', x=x, z=z, r=0.25 * size, crown=3.4 * size))
    h = 2.6 * size
    cone(b, 'trunk', x, z, 0, h, 0.22 * size, 0.14 * size, 6)
    leaf = rnd.choice(['leaf_a', 'leaf_b', 'leaf_c'])
    for i in range(rnd.randint(3, 4)):
        r = (1.5 + rnd.random() * 0.9) * size
        cx, cz = x + (rnd.random() - 0.5) * 2.0 * size, z + (rnd.random() - 0.5) * 2.0 * size
        verts, faces = ico(r, tuple(W(cx, cz, h + 0.6 * size + rnd.random() * 1.8 * size)), (1, 1, 0.82), 0.28)
        b.add_mesh(leaf, verts, faces)

def spruce(b, x, z, size=1.0):
    AUDIT['items'].append(dict(kind='spruce', x=x, z=z, r=0.2 * size, crown=2.2 * size))
    cone(b, 'trunk', x, z, 0, 1.2 * size, 0.16 * size, 0.12 * size, 6)
    tiers = 5
    for i in range(tiers):
        y0 = (0.9 + i * 1.45) * size
        r = (2.2 - i * 0.38) * size
        cone(b, 'spruce', x, z, y0, y0 + 2.3 * size, r, 0.0, 9)

def bush(b, x, z, r=0.9):
    AUDIT['items'].append(dict(kind='bush', x=x, z=z, r=r, crown=r))
    verts, faces = ico(r, tuple(W(x, z, r * 0.8)), (1, 1, 0.95), 0.06, sub=2)
    b.add_mesh('hedge', verts, faces)

def lamp(b, x, z, u):
    """Фонарь с двумя рожками, как на площади у входа"""
    AUDIT['items'].append(dict(kind='lamp', x=x, z=z, r=0.2, crown=0.2))
    cone(b, 'lamp', x, z, 0, 9.0, 0.11, 0.07, 8)
    for s in (-1, 1):
        o = (x + u[0] * (0.0 if s > 0 else -1.6) - u[1] * 0.04, z + u[1] * (0.0 if s > 0 else -1.6) + u[0] * 0.04)
        b.box('lamp', o, u, (-u[1], u[0]), 1.6, 0.08, 8.9, 9.0, bottom=True)
        h = (x + u[0] * s * 1.6 - u[0] * 0.3, z + u[1] * s * 1.6 - u[1] * 0.3)
        b.box('lamp_glass', (h[0] + u[1] * 0.12, h[1] - u[0] * 0.12), u, (-u[1], u[0]), 0.6, 0.24, 8.78, 8.9, bottom=True)

def fence(b, line, gates):
    """Чёрная металлическая ограда: столбы, две перекладины и прутья. gates — точки, где проход (там пропуск)"""
    closing = line[1:] + line[:1] if len(line) > 2 else line[1:]
    for a, c in zip(line, closing):
        L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 0.3:
            continue
        u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
        n = (-u[1], u[0])
        posts = max(1, round(L / 3.0))
        step = L / posts
        for k in range(posts):
            s0 = k * step
            mx, mz = a[0] + u[0] * (s0 + step / 2), a[1] + u[1] * (s0 + step / 2)
            if any(math.hypot(mx - g[0], mz - g[1]) < g[2] for g in gates):
                continue
            o = (a[0] + u[0] * s0, a[1] + u[1] * s0)
            b.box('metal', (o[0] - n[0] * 0.05, o[1] - n[1] * 0.05), u, n, 0.1, 0.1, 0, 2.1)
            cone(b, 'metal', o[0] + u[0] * 0.05, o[1] + u[1] * 0.05, 2.1, 2.28, 0.08, 0.0, 4)
            b.box('stone', (o[0] - n[0] * 0.12, o[1] - n[1] * 0.12), u, n, step, 0.24, 0, 0.3)
            for y in (0.35, 1.75):
                b.box('metal', (o[0] - n[0] * 0.02, o[1] - n[1] * 0.02), u, n, step, 0.04, y, y + 0.05, bottom=True)
            bars = int(step / 0.16)
            for m in range(1, bars):
                s = s0 + m * step / bars
                p0 = (a[0] + u[0] * (s - 0.012), a[1] + u[1] * (s - 0.012))
                p1 = (a[0] + u[0] * (s + 0.012), a[1] + u[1] * (s + 0.012))
                for sign in (1, -1):   # прут — плоская полоска, видна с обеих сторон
                    b.face('metal', [W(*p0, 0.35), W(*p1, 0.35), W(*p1, 1.95), W(*p0, 1.95)], (n[0] * sign, -n[1] * sign, 0))

def lamp_single(b, x, z, u, height=7.0):
    """Фонарь с одним рожком — вдоль проездов"""
    AUDIT['items'].append(dict(kind='lamp', x=x, z=z, r=0.2, crown=0.2))
    cone(b, 'lamp', x, z, 0, 0.5, 0.16, 0.12, 8)
    cone(b, 'lamp', x, z, 0.5, height, 0.1, 0.06, 8)
    n = (-u[1], u[0])
    b.box('lamp', (x - n[0] * 0.04, z - n[1] * 0.04), u, n, 1.6, 0.08, height - 0.1, height, bottom=True)
    hx, hz = x + u[0] * 1.25, z + u[1] * 1.25
    b.box('lamp_glass', (hx - n[0] * 0.12, hz - n[1] * 0.12), u, n, 0.6, 0.24, height - 0.22, height - 0.1, bottom=True)

def bench(b, x, z, u):
    """Скамейка: металлические ножки, деревянные рейки сиденья и спинки. u — вдоль скамейки"""
    AUDIT['items'].append(dict(kind='bench', x=x, z=z, r=0.95, crown=0.95))
    n = (-u[1], u[0])
    L = 1.8
    o = (x - u[0] * L / 2, z - u[1] * L / 2)
    for s in (0.12, L - 0.18):
        b.box('metal', (o[0] + u[0] * s, o[1] + u[1] * s), u, n, 0.06, 0.5, 0, 0.42)
        b.box('metal', (o[0] + u[0] * s + n[0] * 0.44, o[1] + u[1] * s + n[1] * 0.44), u, n, 0.06, 0.06, 0.42, 0.9)
    for k in range(4):
        b.box('wood', (o[0] + n[0] * (0.02 + k * 0.12), o[1] + n[1] * (0.02 + k * 0.12)), u, n, L, 0.1, 0.42, 0.46, bottom=True)
    for k in range(3):
        b.box('wood', (o[0] + n[0] * 0.46, o[1] + n[1] * 0.46), u, n, L, 0.04, 0.55 + k * 0.13, 0.65 + k * 0.13, bottom=True)

def tex_emblem_panel():
    """Эмблема для стелы: тёмная бронза на белом. Силуэт — тот же, что на кубе (вырезан из фотографии заказчика)"""
    src = bpy.data.images.load(os.path.join(ROOT, 'public', 'map3d', 'cube_emblem.png'))
    w, h = src.size
    mask = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)[..., :1]
    white, bronze = np.array([0.95, 0.95, 0.94]), np.array([0.20, 0.14, 0.06])
    return save_image('emblem_panel', white * (1 - mask) + bronze * mask)


def signpost(b, x, z, targets, meta):
    """Столб-указатель: лопасти смотрят туда, где на самом деле находится место (условный ориентир — в источниках его нет)"""
    AUDIT['items'].append(dict(kind='sign', x=x, z=z, r=0.3, crown=0.3))
    cone(b, 'lamp', x, z, 0, 3.1, 0.06, 0.05, 8)
    for k, (text, tx, tz) in enumerate(targets):
        L = math.hypot(tx - x, tz - z)
        e = ((tx - x) / L, (tz - z) / L)
        pn = (-e[1], e[0])
        y0 = 2.75 - k * 0.34
        b.box('sign_blue', (x + e[0] * 0.08 - pn[0] * 0.02, z + e[1] * 0.08 - pn[1] * 0.02), e, pn, 1.7, 0.04, y0, y0 + 0.28, bottom=True)
        for side in (1, -1):
            for poly in text_faces(text, 0.15):
                b.add_mesh('panel_white', [tuple(W(x + e[0] * (0.93 + side * q[0]) + pn[0] * side * 0.035, z + e[1] * (0.93 + side * q[0]) + pn[1] * side * 0.035, y0 + 0.14 + q[1]))
                                           for q in poly], [tuple(range(len(poly)))])
    meta['blocks'].append([round(v_, 2) for q in ((x - 0.15, z - 0.15), (x + 0.15, z - 0.15), (x + 0.15, z + 0.15), (x - 0.15, z + 0.15)) for v_ in q])


def stele(b, x, z, u, n, meta):
    """Юбилейная стела у главного входа (по фотографии заказчика): белая панель на золотистом основании,
    эмблема, «100 лет, 1920–2020» и название вуза в три строки (заказчик разрешил 23.11.2026), прожектор сверху.
    u — вдоль панели, n — куда смотрит лицевая сторона."""
    W_, T_, H0, H1 = 2.7, 0.36, 0.34, 3.1
    def Q(a, d):
        return (x + u[0] * a + n[0] * d, z + u[1] * a + n[1] * d)
    b.box('gold', Q(-W_ / 2 - 0.3, -T_ / 2 - 0.3), u, n, W_ + 0.6, T_ + 0.6, 0, H0)
    b.box('panel_white', Q(-W_ / 2, -T_ / 2), u, n, W_, T_, H0, H1)
    end = Q(W_ / 2, 0)
    cone(b, 'panel_white', end[0], end[1], H0, H1, T_ / 2, T_ / 2, 10)          # скруглённый торец
    # эмблема — картинкой на лицевой стороне
    size, top = 1.25, H1 - 0.25
    corners = [(-size / 2, top - size), (size / 2, top - size), (size / 2, top), (-size / 2, top)]
    points = [W(*Q(a_, T_ / 2 + 0.012), h_) for a_, h_ in corners]      # для зрителя перед панелью «право» — это +u
    b.face('emblem_panel', points, (n[0], -n[1], 0))
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    if (b.verts[-4] - points[0]).length > 1e-6:
        uvs.reverse()
    b.uvs[-4:] = uvs
    # надписи
    base = top - size
    lines = (('100 лет', 0.3, 0.0, base - 0.2, 'Arial Bold'), ('1920', 0.13, -0.8, base - 0.26, 'Arial Bold'), ('2020', 0.13, 0.8, base - 0.26, 'Arial Bold'),
             ('КУБАНСКИЙ', 0.13, 0.0, base - 0.5, 'Arial Bold'), ('ГОСУДАРСТВЕННЫЙ', 0.13, 0.0, base - 0.69, 'Arial Bold'),
             ('УНИВЕРСИТЕТ', 0.13, 0.0, base - 0.88, 'Arial Bold'))
    for text, size_, a_, h_, font in lines:
        for poly in text_faces(text, size_, font):
            b.add_mesh('ink', [tuple(W(*Q(a_ + q[0], T_ / 2 + 0.014), h_ + q[1])) for q in poly], [tuple(range(len(poly)))])
    # прожектор сверху
    lamp_at = Q(0.25, 0)
    b.box('metal', (lamp_at[0] - 0.11, lamp_at[1] - 0.11), (1, 0), (0, 1), 0.22, 0.22, H1, H1 + 0.26)
    meta['blocks'].append([round(v_, 2) for q in (Q(-W_ / 2 - 0.4, -0.5), Q(W_ / 2 + 0.4, -0.5), Q(W_ / 2 + 0.4, 0.5), Q(-W_ / 2 - 0.4, 0.5)) for v_ in q])


def seg_distance(p, a, c):
    dx, dz = c[0] - a[0], c[1] - a[1]
    l2 = dx * dx + dz * dz
    t = 0 if l2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
    return math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t)


def lawn_overlay(lawns, cutters):
    """Газоны минус всё, что на них лежит. Возвращает треугольники [(x, z) * 3].
    Все контуры режут плоскость на куски; кусок остаётся газоном, если лежит в контуре газона и ни в одном вырезе."""
    from mathutils import geometry
    def boxed(poly):
        xs, zs = [q[0] for q in poly], [q[1] for q in poly]
        return poly, min(xs), max(xs), min(zs), max(zs)
    lawn_boxes, cut_boxes = [boxed(q) for q in lawns], [boxed(q) for q in cutters]
    # вырезы, которые не касаются ни одного газона, в расчёт не идут
    def touches(c):
        return any(c[1] <= l[2] and c[2] >= l[1] and c[3] <= l[4] and c[4] >= l[3] for l in lawn_boxes)
    cut_boxes = [c for c in cut_boxes if touches(c)]
    coords, faces = [], []
    for poly, *_ in lawn_boxes + cut_boxes:
        ring = poly if area2(poly) > 0 else poly[::-1]
        faces.append(list(range(len(coords), len(coords) + len(ring))))
        coords.extend(Vector(q) for q in ring)
    out_coords, _, out_faces, *_ = geometry.delaunay_2d_cdt(coords, [], faces, 0, 1e-3)
    def within(p, boxes):
        return any(x0 <= p[0] <= x1 and z0 <= p[1] <= z1 and inside(p, poly) for poly, x0, x1, z0, z1 in boxes)
    tris = []
    for face in out_faces:
        a, b, c = (out_coords[i] for i in face[:3])
        if abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) < 1e-4:
            continue
        mid = ((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)
        if within(mid, lawn_boxes) and not within(mid, cut_boxes):
            tris.append(((a.x, a.y), (b.x, b.y), (c.x, c.y)))
    return tris


def lawn_curbs(b, tris):
    """Бордюр по краю газона: рёбра, у которых газон только с одной стороны"""
    edges = {}
    for tri in tris:
        for i in range(3):
            a, c, other = tri[i], tri[(i + 1) % 3], tri[(i + 2) % 3]
            key = tuple(sorted(((round(a[0], 3), round(a[1], 3)), (round(c[0], 3), round(c[1], 3)))))
            edges.setdefault(key, []).append((a, c, other))
    top = H_GRASS + 0.05
    for owners in edges.values():
        if len(owners) != 1:
            continue
        a, c, other = owners[0]
        L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 0.05:
            continue
        n = (-(c[1] - a[1]) / L, (c[0] - a[0]) / L)
        if (other[0] - a[0]) * n[0] + (other[1] - a[1]) * n[1] > 0:
            n = (-n[0], -n[1])                       # наружу от газона
        o0, o1 = (a[0] + n[0] * 0.14, a[1] + n[1] * 0.14), (c[0] + n[0] * 0.14, c[1] + n[1] * 0.14)
        b.face('curb', [W(*a, top), W(*c, top), W(*o1, top), W(*o0, top)], (0, 0, 1))
        b.face('curb', [W(*o0, 0), W(*o1, 0), W(*o1, top), W(*o0, top)], (n[0], -n[1], 0))


def lawn_tester(tris):
    """Быстрая проверка «точка на газоне» (с запасом margin метров от края)"""
    cell, grid = 6.0, {}
    for tri in tris:
        xs, zs = [q[0] for q in tri], [q[1] for q in tri]
        for i in range(int(min(xs) // cell), int(max(xs) // cell) + 1):
            for j in range(int(min(zs) // cell), int(max(zs) // cell) + 1):
                grid.setdefault((i, j), []).append(tri)
    def one(p):
        for a, b_, c in grid.get((int(p[0] // cell), int(p[1] // cell)), ()):
            d1 = (p[0] - b_[0]) * (a[1] - b_[1]) - (a[0] - b_[0]) * (p[1] - b_[1])
            d2 = (p[0] - c[0]) * (b_[1] - c[1]) - (b_[0] - c[0]) * (p[1] - c[1])
            d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1])
            if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)):
                return True
        return False
    def test(p, margin=0.0):
        if not one(p):
            return False
        if margin <= 0:
            return True
        return all(one((p[0] + math.cos(k / 8 * math.tau) * margin, p[1] + math.sin(k / 8 * math.tau) * margin)) for k in range(8))
    return test


def bench_plain(b, x, z, u):
    """Скамейка без спинки: металлическая рама и деревянные рейки сиденья. u — вдоль скамейки"""
    AUDIT['items'].append(dict(kind='bench', x=x, z=z, r=1.0, crown=1.0))
    n = (-u[1], u[0])
    L = 2.0
    o = (x - u[0] * L / 2 - n[0] * 0.24, z - u[1] * L / 2 - n[1] * 0.24)
    for s_ in (0.1, L - 0.16):
        b.box('metal', (o[0] + u[0] * s_, o[1] + u[1] * s_), u, n, 0.06, 0.48, 0, 0.42)
    b.box('metal', (o[0] + n[0] * 0.21, o[1] + n[1] * 0.21), u, n, L, 0.05, 0.36, 0.42, bottom=True)
    for k in range(4):
        b.box('wood', (o[0] + n[0] * (0.01 + k * 0.12), o[1] + n[1] * (0.01 + k * 0.12)), u, n, L, 0.1, 0.42, 0.47, bottom=True)


def urn(b, x, z):
    AUDIT['items'].append(dict(kind='urn', x=x, z=z, r=0.25, crown=0.25))
    cone(b, 'metal', x, z, 0, 0.08, 0.2, 0.2, 10)
    cone(b, 'grille', x, z, 0.08, 0.7, 0.17, 0.22, 10)
    cone(b, 'metal', x, z, 0.7, 0.74, 0.24, 0.24, 10)

def pier(b, x, z, size=0.6, height=2.6):
    """Каменный столб ворот с плитой сверху"""
    b.box('stone', (x - size / 2, z - size / 2), (1, 0), (0, 1), size, size, 0, height)
    b.box('curb', (x - size / 2 - 0.06, z - size / 2 - 0.06), (1, 0), (0, 1), size + 0.12, size + 0.12, height, height + 0.12, bottom=True)

def hedge(b, a, c, height=0.75, width=0.8):
    """Стриженая живая изгородь вдоль отрезка — зелёный брусок"""
    L = math.hypot(c[0] - a[0], c[1] - a[1])
    if L < 1.0:
        return
    u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
    n = (-u[1], u[0])
    b.box('hedge', (a[0] - n[0] * width / 2, a[1] - n[1] * width / 2), u, n, L, width, 0.08, height)

def roof_units(b, poly, top, count):
    """Вентиляционные короба на крыше (расставлены примерно — точного плана крыши в источниках нет)"""
    xs, zs = [p[0] for p in poly], [p[1] for p in poly]
    placed, tries = [], 0
    while len(placed) < count and tries < count * 40:
        tries += 1
        p = (rnd.uniform(min(xs), max(xs)), rnd.uniform(min(zs), max(zs)))
        ok = inside(p, poly) and all(inside((p[0] + dx, p[1] + dz), poly) for dx, dz in ((2.5, 0), (-2.5, 0), (0, 2.5), (0, -2.5)))
        if not ok or any(math.hypot(p[0] - q[0], p[1] - q[1]) < 9 for q in placed):
            continue
        placed.append(p)
        w, d, h = rnd.uniform(1.0, 1.8), rnd.uniform(1.0, 1.6), rnd.uniform(0.7, 1.3)
        b.box('roof_unit', (p[0] - w / 2, p[1] - d / 2), (1, 0), (0, 1), w, d, top, top + h)
        b.box('grille', (p[0] - w / 2 - 0.05, p[1] - d / 2 - 0.05), (1, 0), (0, 1), w + 0.1, d + 0.1, top + h, top + h + 0.08, bottom=True)

def stadium(ground, props, poly, meta):
    """Стадион по спутниковому снимку и панорамам тура: поле с разметкой, вокруг него замкнутая красная
    беговая дорожка-овал, в полукруглых торцах за воротами — серо-голубые площадки (в северной — малое поле),
    ворота с сеткой, мячеуловители, трибуны с цветными сиденьями, навесы для команд, мачты света.
    Контур поля — из OpenStreetMap. Число полос дорожки, рядов трибун и точные места мачт — на глаз по снимку."""
    edges = [(poly[i], poly[(i + 1) % 4]) for i in range(4)]
    lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in edges]
    k = min(range(4), key=lambda i: lengths[i])
    p0, p1, p3 = poly[k], poly[(k + 1) % 4], poly[(k + 3) % 4]
    if p1[0] < p0[0]:        # ось «поперёк» всегда смотрит на восток: тогда трибуны окажутся с западной стороны
        p0, p1, p3 = poly[(k + 1) % 4], poly[k], poly[(k + 2) % 4]
    width, length = lengths[k], math.hypot(p3[0] - p0[0], p3[1] - p0[1])
    u = ((p1[0] - p0[0]) / width, (p1[1] - p0[1]) / width)
    v = ((p3[0] - p0[0]) / length, (p3[1] - p0[1]) / length)
    def P(s, t):
        return (p0[0] + u[0] * s + v[0] * t, p0[1] + u[1] * s + v[1] * t)
    north_far = v[1] < 0      # дальний торец (t = length) — северный?

    # овал: две прямые и два полукруга. hs — половина длины прямых (по снимку прямые ~76 м)
    cx, cy, hs = width / 2, length / 2, 38.0
    lanes, lane_w = 5, 1.22
    r_in = width / 2 + 0.8
    r_out = r_in + lanes * lane_w
    def oval(r, steps=22):
        pts_ = []
        for i in range(steps + 1):                       # дальний полукруг
            a = math.pi * i / steps
            pts_.append(P(cx + r * math.cos(a), cy + hs + r * math.sin(a)))
        for i in range(steps + 1):                       # ближний полукруг
            a = math.pi + math.pi * i / steps
            pts_.append(P(cx + r * math.cos(a), cy - hs + r * math.sin(a)))
        return pts_

    # слои выше газона (0,10), чтобы соседний газон не перекрыл дорожку
    # между слоями по 4 см: издалека слои, лежащие вплотную, начинают мерцать
    H_TRACK, H_COURT, H_TURF, H_LINE = 0.20, 0.24, 0.28, 0.32
    ground.flat('track', oval(r_out), H_TRACK, 3.0)
    for i in range(lanes + 1):
        ring = oval(r_in + i * lane_w)
        ground.ribbon('line', ring + [ring[0]], 0.05, H_TRACK + H_MARK)
    ground.flat('court', oval(r_in - 0.08), H_COURT, 3.0)

    # поле: покрытие полосами
    m = 0.6
    FW, FL = width - 2 * m, length - 2 * m
    def T(a, b):
        return P(m + a, m + b)
    stripes = 17
    for i in range(stripes):
        ground.flat('pitch' if i % 2 else 'pitch2', [T(-m, FL * i / stripes - (m if i == 0 else 0)), T(FW + m, FL * i / stripes - (m if i == 0 else 0)),
                                                    T(FW + m, FL * (i + 1) / stripes + (m if i == stripes - 1 else 0)), T(-m, FL * (i + 1) / stripes + (m if i == stripes - 1 else 0))], H_TURF, 3.0)

    LW = 0.12
    def line(points, w=LW):
        ground.ribbon('line', points, w, H_LINE)
    def arc(center, r, a0, a1, steps=24):
        return [(center[0] + (u[0] * math.cos(a) + v[0] * math.sin(a)) * r, center[1] + (u[1] * math.cos(a) + v[1] * math.sin(a)) * r) for a in [a0 + (a1 - a0) * i / steps for i in range(steps + 1)]]
    line([T(0, 0), T(FW, 0), T(FW, FL), T(0, FL), T(0, 0)])
    line([T(0, FL / 2), T(FW, FL / 2)])
    line(arc(T(FW / 2, FL / 2), 9.15, 0, math.tau, 40))
    ground.flat('line', arc(T(FW / 2, FL / 2), 0.2, 0, math.tau, 10)[:-1], H_LINE)
    for end in (0, 1):
        d = 1 if end == 0 else -1
        b0 = 0 if end == 0 else FL
        for half, depth in ((20.16, 16.5), (9.16, 5.5)):       # штрафная и вратарская
            line([T(FW / 2 - half, b0), T(FW / 2 - half, b0 + d * depth), T(FW / 2 + half, b0 + d * depth), T(FW / 2 + half, b0)])
        spot = T(FW / 2, b0 + d * 11)
        ground.flat('line', arc(spot, 0.18, 0, math.tau, 10)[:-1], H_LINE)
        reach = math.acos(5.5 / 9.15)
        mid = math.pi / 2 if end == 0 else -math.pi / 2
        line(arc(spot, 9.15, mid - reach, mid + reach, 16))
        for corner, start in ((T(0, b0), 0 if end == 0 else -math.pi / 2), (T(FW, b0), math.pi / 2 if end == 0 else math.pi)):
            line(arc(corner, 1.0, start, start + math.pi / 2, 8))

    # малое поле в северной площадке (видно на снимке): зелёный прямоугольник с разметкой
    far = north_far
    t_a = (length + 3.0) if far else -16.0
    mini = [P(cx - 13, t_a), P(cx + 13, t_a), P(cx + 13, t_a + 13), P(cx - 13, t_a + 13)]
    ground.flat('pitch2', mini, H_TURF, 3.0)
    line(mini + [mini[0]], 0.08)
    line([P(cx, t_a), P(cx, t_a + 13)], 0.08)
    line(arc(P(cx, t_a + 6.5), 2.5, 0, math.tau, 20), 0.08)

    def strip(mat, a, c, h0, h1, w=0.03):
        """Тонкая нить сетки между двумя точками (x, z) на высотах h0 и h1"""
        A, C = W(a[0], a[1], h0), W(c[0], c[1], h1)
        d = C - A
        if abs(d.z) > 1e-4:
            off = Vector((u[0], -u[1], 0)) * w / 2 if abs(d.x) + abs(d.y) < 1e-4 else d.cross(Vector((0, 0, 1))).normalized() * w / 2
        else:
            off = Vector((0, 0, w / 2))
        for sign in (1, -1):
            props.face(mat, [A - off, A + off, C + off, C - off], tuple(d.cross(off) * sign))

    def goal(b0, d):
        gw, gh, gd = 7.32, 2.44, 2.0
        left, right = T(FW / 2 - gw / 2, b0), T(FW / 2 + gw / 2, b0)
        back_l, back_r = T(FW / 2 - gw / 2, b0 - d * gd), T(FW / 2 + gw / 2, b0 - d * gd)
        for q in (left, right):
            cone(props, 'frame', q[0], q[1], 0, gh, 0.06, 0.06, 8)
        props.box('frame', (left[0] - v[0] * 0.06, left[1] - v[1] * 0.06), u, v, gw, 0.12, gh - 0.06, gh + 0.06, bottom=True)
        for q in (back_l, back_r):
            cone(props, 'frame', q[0], q[1], 0, 1.4, 0.03, 0.03, 6)
        n = int(gw / 0.5)
        for i in range(n + 1):
            a = FW / 2 - gw / 2 + gw * i / n
            strip('net', T(a, b0 - d * gd), T(a, b0 - d * gd), 0, 1.4)
            A, C = W(*T(a, b0), gh), W(*T(a, b0 - d * gd), 1.4)
            o = Vector((u[0], -u[1], 0)) * 0.015
            for sign in (1, -1):
                props.face('net', [A - o, A + o, C + o, C - o], (0, 0, sign))
        for hgt in (0.35, 0.7, 1.05, 1.4):
            strip('net', back_l, back_r, hgt, hgt)
        for q0, q1 in ((left, back_l), (right, back_r)):
            for i in range(1, 4):
                f = i / 4
                mm = (q0[0] + (q1[0] - q0[0]) * f, q0[1] + (q1[1] - q0[1]) * f)
                strip('net', mm, mm, 0, gh + (1.4 - gh) * f)

    goal(0, 1)
    goal(FL, -1)

    # мячеуловители: зелёные столбы 8 м и сетка в 4 метрах за линией ворот
    for end in (0, 1):
        t = -4.0 if end == 0 else length + (2.2 if far else 4.0)
        if end == 0 and not far:
            t = -2.2
        span = 18.0
        posts = 7
        for i in range(posts):
            q = P(cx - span + 2 * span * i / (posts - 1), t)
            cone(props, 'net', q[0], q[1], 0, 8.0, 0.07, 0.05, 6)
        a, c = P(cx - span, t), P(cx + span, t)
        for i in range(1, 9):
            strip('net', a, c, float(i), float(i), 0.035)
        cols = int(2 * span)
        for i in range(cols + 1):
            q = P(cx - span + 2 * span * i / cols, t)
            strip('net', q, q, 0, 8.0, 0.035)

    # трибуны вдоль западной прямой, сразу за дорожкой: пять рядов, сиденья секциями красные, белые, синие
    rows, row_d, row_h = 5, 0.8, 0.38
    t_a, t_b = cy - hs + 4, cy + hs - 4
    first = cx - r_out - 1.2
    for r in range(rows):
        o = P(first - (r + 1) * row_d, t_a)
        props.box('stone', o, u, v, row_d, t_b - t_a, 0, 0.3 + r * row_h)
        seats = int((t_b - t_a) / 0.55)
        for i in range(seats):
            mat = ('seat_r', 'frame', 'seat_b')[int(i / seats * 9) % 3]
            q = P(first - (r + 1) * row_d + 0.18, t_a + 0.05 + i * 0.55)
            props.box(mat, q, u, v, 0.44, 0.45, 0.3 + r * row_h, 0.3 + r * row_h + 0.07)
            props.box(mat, q, u, v, 0.07, 0.45, 0.3 + r * row_h + 0.07, 0.3 + r * row_h + 0.42)
    stand = [P(first - rows * row_d, t_a), P(first, t_a), P(first, t_b), P(first - rows * row_d, t_b)]
    meta['blocks'].append([round(c, 2) for q in stand for c in q])

    # навесы для команд за восточной прямой
    east = cx + r_out + 0.2
    for t in (cy - 16, cy + 8):
        base = P(east, t)
        props.box('seat_b', (base[0] + u[0] * 1.5, base[1] + u[1] * 1.5), u, v, 0.08, 8.0, 0, 2.1)
        for tt in (0.0, 7.92):
            props.box('seat_b', (base[0] + v[0] * tt, base[1] + v[1] * tt), u, v, 1.58, 0.08, 0, 2.1)
        props.box('seat_b', (base[0] - u[0] * 0.2, base[1] - u[1] * 0.2), u, v, 1.8, 8.0, 2.1, 2.18, bottom=True)
        props.box('stone', (base[0] + u[0] * 0.9, base[1] + u[1] * 0.9), u, v, 0.4, 7.6, 0.4, 0.46, bottom=True)
        shelter = [P(east, t), P(east + 1.7, t), P(east + 1.7, t + 8), P(east, t + 8)]
        meta['blocks'].append([round(c, 2) for q in shelter for c in q])

    # мачты освещения: четыре, за поворотами дорожки
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        q = P(cx + sx * (r_out + 2.5) * 0.72, cy + sy * (hs + (r_out + 2.5) * 0.72))
        cone(props, 'lamp', q[0], q[1], 0, 18.0, 0.22, 0.12, 8)
        props.box('lamp', (q[0] - 1.0, q[1] - 0.15), (1, 0), (0, 1), 2.0, 0.3, 17.6, 18.6, bottom=True)
        props.box('lamp_glass', (q[0] - 0.9, q[1] - 0.22), (1, 0), (0, 1), 1.8, 0.44, 17.75, 18.45, bottom=True)

    # откуда смотреть на поле в «Прогулке»: с дорожки у юго-западного угла, лицом к центру
    t_view = 6.0 if far else length - 6.0
    spot, centre = P(cx - r_in - 3.0, t_view), P(cx, cy)
    meta['pitch'] = {'x': round(spot[0], 1), 'z': round(spot[1], 1), 'yaw': round(math.atan2(centre[0] - spot[0], -(centre[1] - spot[1])), 3)}
    return P


# ---------------------------------------------------------------- сборка мира

def offset_polygon(poly, d):
    """Грубо раздвигает контур наружу на d метров (для газонной каймы вокруг территории)"""
    sign = 1 if area2(poly) > 0 else -1
    out = []
    m = len(poly)
    for i in range(m):
        p0, p1, p2 = poly[i - 1], poly[i], poly[(i + 1) % m]
        e1 = (p1[0] - p0[0], p1[1] - p0[1])
        e2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*e1) or 1, math.hypot(*e2) or 1
        n1 = (sign * e1[1] / l1, -sign * e1[0] / l1)
        n2 = (sign * e2[1] / l2, -sign * e2[0] / l2)
        nx, nz = n1[0] + n2[0], n1[1] + n2[1]
        ln = math.hypot(nx, nz) or 1
        k = min(3.0, 1 / max(0.3, (nx / ln) * n1[0] + (nz / ln) * n1[1]))
        out.append((p1[0] + nx / ln * d * k, p1[1] + nz / ln * d * k))
    return out


# Объекты, найденные на спутниковом снимке Яндекс Карт (в OpenStreetMap их нет). Координаты сняты со снимка
# с точностью 2–3 метра; облик церкви и беседки — приблизительный, до фотографий с места.
GRID_U = (0.957, 0.290)          # направление «вдоль фасада» главного корпуса
GRID_V = (-0.290, 0.957)         # «от фасада наружу», к улице
CHURCH = (-166.0, -31.0)
CHURCH_SCALE = 1.25              # храм крупнее, чем я оценил сначала: по спутнику 2025 года он около 21 м в длину
GAZEBO = (-81.5, -27.6)
PARKING = dict(origin=(-129.1, 15.3), start=24.0, end=66.5, rows=(17.3, 25.0), near=14.9, far=27.4)
# Арт-объект «Куб мудрости» (2020): зеркальный куб на золотистом постаменте в приподнятой клумбе с каменной
# стенкой — перед входом в Центр Интернет (западный торец северного корпуса), в клумбе слева от дорожки ко входу.
# Место указал заказчик; сверено с панорамой тура «У входа в Центр Интернет», фотографией с Яндекс Карт
# (за кубом — тот же корпус со стеклянной вставкой) и снимками с открытия (за кубом — сосны и общежитие).
# На гранях настоящего куба — эмблема вуза; её не воспроизводим до разрешения.
INDOOR = ('hall_floor', 'hall_ceiling', 'hall_carpet', 'hall_wall', 'hall_stone', 'kiosk_glass', 'case_glass', 'desk', 'desk_top', 'pot',
          'chess_dark', 'chess_light', 'chess_white', 'chess_black', 'cor_floor', 'cor_wall', 'cor_band', 'door_wood', 'door_grey', 'door_frame', 'cor_plate', 'stair_step', 'stair_window',
          'band_1_main', 'band_1_a', 'band_1_w', 'band_2_main', 'band_2_a', 'band_2_w', 'band_3_main', 'band_3_a', 'band_3_w', 'band_4_main', 'band_4_a', 'band_4_w', 'band_1_e', 'band_2_e', 'band_3_e', 'band_4_e',
          'lm_red', 'lm_blue', 'lm_green', 'lm_yellow', 'lm_dark', 'lm_wood', 'lm_screen', 'cor_floor_check')
SIGN_DIR = 1          # в какую сторону идут буквы на фасаде (+1: вдоль u); подобрано по снимку
CUBE = (-134.3, -95.0)
CUBE_BED = (6.3, 2.9)        # клумба — овал: полуоси вдоль и поперёк, метры
CUBE_TURN = math.atan2(-4.0, 14.0)   # овал вытянут так же, как газон в OpenStreetMap, который он заменяет


def grid_point(o, a, b):
    return (o[0] + GRID_U[0] * a + GRID_V[0] * b, o[1] + GRID_U[1] * a + GRID_V[1] * b)


def dome(b, mat, x, z, base, radius, sides=10):
    """Луковичная глава: расширяется над барабаном и сходится в остриё"""
    profile = [(0.0, 0.62), (0.18, 0.95), (0.42, 1.0), (0.7, 0.72), (0.95, 0.3), (1.25, 0.08), (1.45, 0.0)]
    for (h0, r0), (h1, r1) in zip(profile, profile[1:]):
        cone(b, mat, x, z, base + h0 * radius * 1.6, base + h1 * radius * 1.6, r0 * radius, r1 * radius, sides)
    top = base + 1.45 * radius * 1.6
    b.box(mat, (x - 0.04, z - 0.04), (1, 0), (0, 1), 0.08, 0.08, top, top + 1.1)
    b.box(mat, (x - 0.3, z - 0.04), (1, 0), (0, 1), 0.6, 0.08, top + 0.65, top + 0.75, bottom=True)


def church(b, ground, meta):
    """Церковь Кирилла и Мефодия — по фотографиям с Яндекс Карт: высокий белый храм на тёмно-зелёном цоколе
    (в цоколе — нижний придел), каждая стена в три прясла с килевидными закомарами (средняя выше), узкие окна,
    один барабан с золотой шлемовидной главой, три апсиды с востока, западное крыльцо с широкой лестницей,
    открытые галереи с балюстрадой с севера и юга, малые золотые главки, поклонный крест перед входом.
    Размеры в плане — со спутника (±2 м), высоты — по пропорциям на фотографиях."""
    c = CHURCH
    K = CHURCH_SCALE
    first_vertex = len(b.verts)
    H, BASE, WALL = 4.5, 2.0, 11.0
    def G(a, d):
        return grid_point(c, a, d)
    def vec(a, d):                         # направление в сетке храма -> подсказка «наружу» для грани
        return (GRID_U[0] * a + GRID_V[0] * d, -(GRID_U[1] * a + GRID_V[1] * d), 0)
    def rect(mat, a0, d0, a1, d1, h0, h1, bottom=False):
        b.box(mat, G(a0, d0), GRID_U, GRID_V, a1 - a0, d1 - d0, h0, h1, bottom=bottom)
    # Вокруг храма — по спутнику и фотографиям 2025 года: мощёная площадка, дорожка от лестницы на запад
    # к поклонному кресту, дорожка вдоль западного края сквера (с севера на юг) и выход к проезду у корпуса.
    def GK(a, d):
        return grid_point(c, a, d)             # в настоящих метрах (без масштаба храма)
    platform = [GK(-14.5, -11.5), GK(12.5, -11.5), GK(12.5, 11.5), GK(-14.5, 11.5)]
    ground.flat('paving', platform, H_ON_GRASS, 2.0)
    # Площадка отдыха в сквере южнее храма (фото и панорама Яндекса 2026 года, место указал заказчик):
    # мощёная площадка со скамейками без спинок и урнами, на её краю — поклонный крест.
    # От калитки в ограде к площадке ведёт дорожка, от площадки — дорожки к храму и на юг.
    rest = [GK(-10.5, 21.5), GK(4.5, 20.5), GK(8.0, 26.0), GK(4.0, 33.5), GK(-9.5, 34.5)]
    ground.flat('paving', rest, H_ON_GRASS, 2.0)
    gate_at = GK(-15.4, 27.0)
    paths = [([GK(12, 2), GK(24, 2)], 3.5), ([gate_at, GK(-9.5, 27.5)], 3.0), ([GK(-1.0, 21.5), GK(-1.0, 11.0)], 3.0), ([GK(-2.0, 34.0), GK(0.0, 52.0)], 2.6)]
    meta['church_gate'] = gate_at
    fence_poly = pts(DATA['fence'])
    for line, width in paths:
        ground.ribbon('paving', line, width, H_ON_GRASS, 2.0)
    meta['church_keep_clear'] = {'platform': [GK(-17.5, -14.5), GK(15.5, -14.5), GK(15.5, 14.5), GK(-17.5, 14.5)], 'paths': paths,
                                 'rest': [GK(-12.5, 19.5), GK(6.0, 18.5), GK(10.5, 26.0), GK(5.5, 35.5), GK(-11.5, 36.5)]}

    # цоколь и основной объём
    rect('church_green', -H - 0.35, -H - 0.35, H + 0.35, H + 0.35, 0, BASE)
    rect('stone', -H - 0.42, -H - 0.42, H + 0.42, H + 0.42, BASE, BASE + 0.14)
    rect('church_white', -H, -H, H, H, BASE + 0.14, WALL)
    rect('church_white', -H - 0.2, -H - 0.2, H + 0.2, H + 0.2, WALL - 0.12, WALL + 0.1, bottom=True)   # карниз
    # четыре стены: лопатки, окна, закомары
    sides = [  # (точка стены по s и выносу out, направление наружу)
        (lambda s_, out: G(-H - out, s_), (-1, 0)), (lambda s_, out: G(H + out, -s_), (1, 0)),
        (lambda s_, out: G(s_, H + out), (0, 1)), (lambda s_, out: G(-s_, -H - out), (0, -1))]
    third = 2 * H / 3
    for index, (P, out_dir) in enumerate(sides):
        hint = vec(*out_dir)
        back = (-hint[0], -hint[1], 0)
        def quad(mat, s0, s1, h0, h1, out):
            b.face(mat, [W(*P(s0, out), h0), W(*P(s1, out), h0), W(*P(s1, out), h1), W(*P(s0, out), h1)], hint)
        def block(mat, s0, s1, h0, h1, out):
            """Выступ на стене: лицевая грань и две боковые"""
            quad(mat, s0, s1, h0, h1, out)
            for s_ in (s0, s1):
                side_hint = tuple(v_ * (1 if s_ == s1 else -1) for v_ in vec(*(( -out_dir[1], out_dir[0]) if index in (0, 3) else (out_dir[1], -out_dir[0]))))
                b.face(mat, [W(*P(s_, 0), h0), W(*P(s_, out), h0), W(*P(s_, out), h1), W(*P(s_, 0), h1)], side_hint)
            b.face(mat, [W(*P(s0, 0), h1), W(*P(s1, 0), h1), W(*P(s1, out), h1), W(*P(s0, out), h1)], (0, 0, 1))
        for k in range(4):                                   # лопатки между пряслами
            s_ = -H + k * third
            block('church_white', max(-H, s_ - 0.22), min(H, s_ + 0.22), BASE + 0.14, WALL, 0.16)
        for bay in range(3):
            s0, s1 = -H + bay * third, -H + (bay + 1) * third
            mid = (s0 + s1) / 2
            peak = WALL + (3.0 if bay == 1 else 2.1)
            # закомара: килевидная арка — фасадная грань, оборот и тёмная «кровля» сверху по кромке
            n_arc = 10
            arc = []
            for k in range(n_arc + 1):
                u_ = k / n_arc
                f = 0.72 * math.sqrt(max(0.0, 1 - (2 * u_ - 1) ** 2)) + 0.28 * (1 - abs(2 * u_ - 1))
                arc.append((s0 + (s1 - s0) * u_, WALL + (peak - WALL) * f))
            b.face('church_white', [W(*P(q[0], 0.02), q[1]) for q in arc], hint)
            b.face('church_white', [W(*P(q[0], -0.3), q[1]) for q in arc], back)
            for q0, q1 in zip(arc, arc[1:]):
                b.face('church_roof', [W(*P(q0[0], 0.1), q0[1] + 0.05), W(*P(q1[0], 0.1), q1[1] + 0.05), W(*P(q1[0], -0.38), q1[1] + 0.05), W(*P(q0[0], -0.38), q0[1] + 0.05)], (0, 0, 1))
            # узкое окно с полукруглым верхом в каждом прясле; в среднем — ещё одно выше
            windows = [(5.4, 8.2)] + ([(9.0, 10.4)] if bay == 1 else [])
            if index == 0 and bay == 1:
                windows = [(7.2, 9.6)]                       # над западным крыльцом
            for h0, h1 in windows:
                block('church_white', mid - 0.42, mid + 0.42, h0 - 0.12, h1 + 0.45, 0.05)      # наличник
                quad('glass', mid - 0.24, mid + 0.24, h0, h1, 0.07)
                b.face('glass', [W(*P(mid - 0.24, 0.07), h1), W(*P(mid + 0.24, 0.07), h1), W(*P(mid + 0.17, 0.07), h1 + 0.2), W(*P(mid, 0.07), h1 + 0.28), W(*P(mid - 0.17, 0.07), h1 + 0.2)], hint)
    # кровля под барабаном: от стен к барабану
    top, drum_r, drum0, drum1 = WALL + 0.1, 1.85, WALL + 2.6, WALL + 6.6
    low = [G(-H, -H), G(H, -H), G(H, H), G(-H, H)]
    high = [G(-drum_r, -drum_r), G(drum_r, -drum_r), G(drum_r, drum_r), G(-drum_r, drum_r)]
    for i in range(4):
        j = (i + 1) % 4
        mx, mz = (low[i][0] + low[j][0]) / 2 - c[0], (low[i][1] + low[j][1]) / 2 - c[1]
        b.face('church_roof', [W(*low[i], top), W(*low[j], top), W(*high[j], drum0), W(*high[i], drum0)], (mx, -mz, 6))
    # барабан с узкими окнами, поясок, золотой шлем, крест
    cone(b, 'church_white', c[0], c[1], drum0 - 0.4, drum1, drum_r, drum_r, 16)
    cone(b, 'church_white', c[0], c[1], drum1, drum1 + 0.3, drum_r + 0.22, drum_r + 0.22, 16)
    cone(b, 'church_white', c[0], c[1], drum1 - 0.02, drum1, drum_r, drum_r + 0.22, 16)
    for k in range(8):
        t = k / 8 * math.tau + math.atan2(GRID_U[1], GRID_U[0])
        wx, wz = c[0] + math.cos(t) * (drum_r - 0.02), c[1] + math.sin(t) * (drum_r - 0.02)
        u_ = (-math.sin(t), math.cos(t))
        b.box('glass', (wx - u_[0] * 0.2, wz - u_[1] * 0.2), u_, (math.cos(t), math.sin(t)), 0.4, 0.08, drum0 + 0.9, drum1 - 0.6)
    dome(b, 'gold', c[0], c[1], drum1 + 0.3, drum_r * 1.18, 16)
    # три апсиды с востока на зелёном цоколе
    for d_off, r, h in ((0.0, 2.3, 9.6), (-2.9, 1.5, 8.4), (2.9, 1.5, 8.4)):
        q = G(H, d_off)
        cone(b, 'church_green', q[0], q[1], 0, BASE, r + 0.3, r + 0.3, 14)
        cone(b, 'stone', q[0], q[1], BASE, BASE + 0.14, r + 0.36, r + 0.36, 14)
        cone(b, 'church_white', q[0], q[1], BASE + 0.14, h, r, r, 14)
        cone(b, 'church_white', q[0], q[1], h - 0.1, h + 0.12, r + 0.16, r + 0.16, 14)
        cone(b, 'church_roof', q[0], q[1], h + 0.12, h + 0.7, r + 0.16, r * 0.75, 14)
        cone(b, 'church_roof', q[0], q[1], h + 0.7, h + 1.25, r * 0.75, 0.05, 14)
        east = G(H + r + 0.01, d_off)
        b.box('glass', (east[0] - GRID_V[0] * 0.2, east[1] - GRID_V[1] * 0.2), GRID_U, GRID_V, 0.08, 0.4, 5.4, 7.4)
    # западное крыльцо: площадка на цоколе, четыре столба, свод с килевидным щипцом и главкой, дверь
    PW, PD = 2.7, 2.6                                      # полуширина и вынос крыльца
    rect('church_green', -H - PD, -PW, -H, PW, 0, BASE)
    rect('stone', -H - PD - 0.06, -PW - 0.06, -H, PW + 0.06, BASE, BASE + 0.14)
    for a_, d_ in ((-H - PD + 0.3, -PW + 0.3), (-H - PD + 0.3, PW - 0.3), (-H - 0.3, -PW + 0.3), (-H - 0.3, PW - 0.3)):
        q = G(a_, d_)
        b.box('church_white', (q[0] - GRID_U[0] * 0.28 - GRID_V[0] * 0.28, q[1] - GRID_U[1] * 0.28 - GRID_V[1] * 0.28), GRID_U, GRID_V, 0.56, 0.56, BASE + 0.14, 5.0)
    rect('church_white', -H - PD - 0.15, -PW - 0.15, -H, PW + 0.15, 5.0, 5.5, bottom=True)
    gable = [(-PW, 5.5), (-PW * 0.7, 6.2), (-PW * 0.35, 6.75), (0, 7.2), (PW * 0.35, 6.75), (PW * 0.7, 6.2), (PW, 5.5)]
    b.face('church_white', [W(*G(-H - PD - 0.1, q[0]), q[1]) for q in gable], vec(-1, 0))
    for q0, q1 in zip(gable, gable[1:]):
        b.face('church_roof', [W(*G(-H - PD - 0.2, q0[0]), q0[1] + 0.04), W(*G(-H - PD - 0.2, q1[0]), q1[1] + 0.04), W(*G(-H, q1[0]), q1[1] + 0.04), W(*G(-H, q0[0]), q0[1] + 0.04)], (0, 0, 1))
    q = G(-H - PD / 2, 0)
    cone(b, 'church_white', q[0], q[1], 6.6, 7.8, 0.42, 0.42, 10)
    dome(b, 'gold', q[0], q[1], 7.8, 0.5, 10)
    door = G(-H - 0.06, -0.8)
    b.box('wood', door, GRID_U, GRID_V, 0.08, 1.6, BASE + 0.14, 4.3)
    b.box('church_white', G(-H - 0.1, -1.05), GRID_U, GRID_V, 0.06, 2.1, 4.3, 4.6)
    # лестница: десять ступеней и зелёные боковые стенки
    steps, tread = 10, 0.34
    for i in range(steps):
        rect('step', -H - PD - tread * (i + 1), -2.1, -H - PD - tread * i, 2.1, 0, BASE + 0.14 - (BASE + 0.14) / steps * (i + 1))
    for d0, d1 in ((-PW, -2.1), (2.1, PW)):
        rect('church_green', -H - PD - tread * steps, d0, -H - PD, d1, 0, 1.3)
        rect('stone', -H - PD - tread * steps - 0.05, d0 - 0.05, -H - PD, d1 + 0.05, 1.3, 1.42)
    # северная и южная галереи: площадка на цоколе, балюстрада, столбы, навес и две малые главки
    for sign in (-1, 1):
        GW, GD = 2.6, 2.0
        d_in, d_out = sign * H, sign * (H + GD)
        rect('church_green', -GW, min(d_in, d_out), GW, max(d_in, d_out), 0, BASE)
        rect('stone', -GW - 0.06, min(d_in, d_out + sign * 0.06), GW + 0.06, max(d_in, d_out + sign * 0.06), BASE, BASE + 0.14)
        rect('church_white', -GW, min(d_out, d_out - sign * 0.16), GW, max(d_out, d_out - sign * 0.16), BASE + 0.14, BASE + 1.05)      # балюстрада
        for a_ in (-GW, GW - 0.16):
            rect('church_white', a_, min(d_in, d_out), a_ + 0.16, max(d_in, d_out), BASE + 0.14, BASE + 1.05)
        for a_ in (-GW + 0.25, 0.0, GW - 0.25):
            q = G(a_, d_out - sign * 0.25)
            cone(b, 'church_white', q[0], q[1], BASE + 1.05, 4.8, 0.17, 0.17, 8)
        rect('church_white', -GW - 0.12, min(d_in, d_out + sign * 0.12), GW + 0.12, max(d_in, d_out + sign * 0.12), 4.8, 5.15, bottom=True)
        rect('church_roof', -GW - 0.12, min(d_in, d_out + sign * 0.12), GW + 0.12, max(d_in, d_out + sign * 0.12), 5.15, 5.22)
        for a_ in (-GW + 0.45, GW - 0.45):
            q = G(a_, d_out - sign * 0.45)
            cone(b, 'church_white', q[0], q[1], 5.2, 6.0, 0.3, 0.3, 8)
            dome(b, 'gold', q[0], q[1], 6.0, 0.36, 8)
    # храм построен в «малых» единицах — увеличиваем готовую фигуру до настоящего размера (со спутника)
    origin = W(c[0], c[1], 0)
    for i in range(first_vertex, len(b.verts)):
        b.verts[i] = origin + (b.verts[i] - origin) * K
    # поклонный крест на белом ступенчатом постаменте — на краю площадки отдыха
    ka, kd = 4.5, 25.5
    for half, h0, h1 in ((1.0, 0, 0.3), (0.78, 0.3, 0.6), (0.56, 0.6, 1.7)):
        b.box('church_white', GK(ka - half, kd - half), GRID_U, GRID_V, 2 * half, 2 * half, h0, h1)
    b.box('sandstone', GK(ka - 0.18, kd - 0.26), GRID_U, GRID_V, 0.36, 0.52, 1.7, 4.3)
    b.box('sandstone', GK(ka - 0.18, kd - 1.05), GRID_U, GRID_V, 0.36, 2.1, 3.0, 3.55, bottom=True)
    meta['blocks'].append([round(v_, 2) for q in (GK(ka - 1.05, kd - 1.05), GK(ka + 1.05, kd - 1.05), GK(ka + 1.05, kd + 1.05), GK(ka - 1.05, kd + 1.05)) for v_ in q])
    # скамейки без спинок рядами у западного края площадки, между ними урны — как на фотографии
    seats = []
    for row, a_ in enumerate((-9.6, -6.8)):
        for k in range(3):
            seats.append((GK(a_, 23.5 + k * 3.3 + row * 0.6), GRID_V))
    for k in range(2):
        seats.append((GK(-3.5 + k * 3.4, 22.2), GRID_U))
    meta['church_seats'] = seats
    meta['church_urns'] = [GK(-8.2, 25.4), GK(-8.2, 28.9), GK(-1.8, 22.2)]
    # ели вокруг и два фонаря у лестницы — видны на фотографиях
    meta['church_spruces'] = [GK(-12.0, -14.5), GK(-12.5, 16.0), GK(5.0, -16.5), GK(16.0, 13.0), GK(9.5, 31.0), GK(-3.0, 38.5), GK(8.5, 19.0)]
    for d_ in (-6.0, 6.0):
        q = GK(-14.0, d_)
        lamp_single(b, q[0], q[1], (-GRID_U[0], -GRID_U[1]), 5.5)
    west_end = -(H + PD + tread * steps) * K
    footprint = [GK(west_end, -(H + 2.1) * K), GK((H + 2.7) * K, -(H + 2.1) * K), GK((H + 2.7) * K, (H + 2.1) * K), GK(west_end, (H + 2.1) * K)]
    spot = GK(-11.5, 24.5)                 # с площадки отдыха: видны крыльцо, южная галерея и глава
    meta['church'] = {'x': round(spot[0], 1), 'z': round(spot[1], 1), 'yaw': round(math.atan2(c[0] - spot[0], -(c[1] - spot[1])), 3)}
    meta['blocks'].append([round(v_, 2) for q in footprint for v_ in q])


def helmet(b, mat, x, z, base, radius, sides=12):
    """Шлемовидная глава с крестом: чуть шире барабана, плавно сходится в остриё"""
    profile = [(0.0, 1.0), (0.22, 1.03), (0.5, 0.94), (0.8, 0.74), (1.05, 0.48), (1.25, 0.24), (1.42, 0.08), (1.6, 0.0)]
    for (h0, r0), (h1, r1) in zip(profile, profile[1:]):
        cone(b, mat, x, z, base + h0 * radius, base + h1 * radius, r0 * radius, r1 * radius, sides)
    top = base + 1.6 * radius
    size = max(0.5, radius * 0.7)
    b.box(mat, (x - 0.04, z - 0.04), (1, 0), (0, 1), 0.08, 0.08, top - 0.1, top + size * 1.5)
    b.box(mat, (x - size * 0.35, z - 0.04), (1, 0), (0, 1), size * 0.7, 0.08, top + size * 0.9, top + size * 0.9 + 0.09, bottom=True)


def gazebo(b):
    """Белая шестигранная беседка во внутреннем дворе (видна на снимке)"""
    x, z, r = GAZEBO[0], GAZEBO[1], 3.6
    cone(b, 'step', x, z, 0, 0.3, r + 0.4, r + 0.4, 6)
    for i in range(6):
        a = i / 6 * math.tau
        cone(b, 'frame', x + math.cos(a) * r, z + math.sin(a) * r, 0.3, 3.0, 0.14, 0.14, 8)
    cone(b, 'frame', x, z, 3.0, 3.25, r + 0.5, r + 0.5, 6)
    cone(b, 'frame', x, z, 3.25, 4.6, r + 0.5, 0.2, 6)


def text_faces(text, size, font='Arial Bold', spacing=1.0):
    """Буквы как плоская сетка: список многоугольников в координатах (вправо, вверх), по центру"""
    curve = bpy.data.curves.new('label', 'FONT')
    curve.body = text
    curve.size = size
    curve.space_character = spacing
    curve.align_x, curve.align_y = 'CENTER', 'CENTER'
    font_path = '/System/Library/Fonts/Supplemental/%s.ttf' % font
    if os.path.exists(font_path):
        curve.font = bpy.data.fonts.load(font_path)
    obj = bpy.data.objects.new('label', curve)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    polys = [[(mesh.vertices[i].co.x, mesh.vertices[i].co.y) for i in poly.vertices] for poly in mesh.polygons]
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    return polys


def wisdom_cube(b, green, ground, meta):
    """Клумба с «Кубом мудрости». Сам куб в модель не входит: в приложении он отдельный, зеркальный и вращается.
    Здесь — приподнятая клумба с каменной стенкой, золотистый постамент с надписью, изгородь, кусты, цветы,
    прожекторы подсветки и отбойник со стороны проезда (всё это видно на фотографиях)."""
    x, z = CUBE
    bed_h = 0.5
    ca, sa = math.cos(CUBE_TURN), math.sin(CUBE_TURN)
    def E(t, k=1.0, grow=0.0):
        """Точка на овале клумбы: t — угол, k — доля от края, grow — на сколько метров шире"""
        lx, lz = math.cos(t) * (CUBE_BED[0] * k + grow), math.sin(t) * (CUBE_BED[1] * k + grow)
        return (x + lx * ca - lz * sa, z + lx * sa + lz * ca)
    N = 32
    ring = [E(i / N * math.tau) for i in range(N)]
    outer = [E(i / N * math.tau, 1.0, 0.3) for i in range(N)]
    # каменная стенка в три ряда кладки и светлая плита-крышка
    for i in range(N):
        p0, p1 = outer[i], outer[(i + 1) % N]
        mid = ((p0[0] + p1[0]) / 2 - x, (p0[1] + p1[1]) / 2 - z)
        for row in range(3):
            h0, h1 = row * bed_h / 3, (row + 1) * bed_h / 3
            b.face('bedstone' if (i + row) % 2 else 'bedstone2', [W(*p0, h0), W(*p1, h0), W(*p1, h1), W(*p0, h1)], (mid[0], -mid[1], 0))
    cap = [E(i / N * math.tau, 1.0, 0.38) for i in range(N)]
    b.flat('stone', cap, bed_h + 0.04)
    for i in range(N):
        p0, p1 = cap[i], cap[(i + 1) % N]
        mid = ((p0[0] + p1[0]) / 2 - x, (p0[1] + p1[1]) / 2 - z)
        b.face('stone', [W(*p0, bed_h - 0.02), W(*p1, bed_h - 0.02), W(*p1, bed_h + 0.04), W(*p0, bed_h + 0.04)], (mid[0], -mid[1], 0))
    ground.flat('grass', ring, bed_h + 0.08, 3.0)
    top = bed_h + 0.08
    # постамент: золотистая плита на тёмном основании, надпись с двух сторон
    ped, ph = 1.1, 0.6
    b.box('plinth', (x - ped - 0.08, z - ped - 0.08), (1, 0), (0, 1), 2 * ped + 0.16, 2 * ped + 0.16, top, top + 0.08)
    b.box('gold', (x - ped, z - ped), (1, 0), (0, 1), 2 * ped, 2 * ped, top + 0.08, top + 0.08 + ph)
    centre = W(x, z, top + 0.08 + ph / 2)
    for side in (-1, 1):                       # -1: грань к проезду (запад), +1: к корпусу (восток)
        for poly in text_faces('КУБ МУДРОСТИ', 0.21):
            b.add_mesh('ink', [(centre.x + side * (ped + 0.012), centre.y + side * q[0], centre.z + q[1]) for q in poly], [tuple(range(len(poly)))])
    # стриженая изгородь дугой за кубом (со стороны корпуса) и шары-кусты по её концам
    arc = [E(math.radians(d), 0.8) for d in range(-70, 71, 20)]
    for p0, p1 in zip(arc, arc[1:]):
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        u = ((p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L)
        n = (-u[1], u[0])
        green.box('hedge', (p0[0] - n[0] * 0.25 - u[0] * 0.1, p0[1] - n[1] * 0.25 - u[1] * 0.1), u, n, L + 0.2, 0.5, top, top + 0.6)
    for d in (-88, 88):
        q = E(math.radians(d), 0.78)
        verts, faces = ico(0.5, tuple(W(q[0], q[1], top + 0.4)), (1, 1, 0.9), 0.06, sub=2)
        green.add_mesh('hedge', verts, faces)
    # цветы: низкие подушки двух цветов перед постаментом, со стороны проезда
    for i, d in enumerate(range(115, 246, 13)):
        q = E(math.radians(d), 0.62 + 0.16 * (i % 2))
        verts, faces = ico(0.28, tuple(W(q[0], q[1], top + 0.1)), (1, 1, 0.55), 0.08, sub=1)
        green.add_mesh('flower_r' if i % 2 else 'flower_y', verts, faces)
    # прожекторы подсветки по углам постамента
    for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        q = (x + dx * (ped + 0.75), z + dz * (ped + 0.75))
        b.box('metal', (q[0] - 0.09, q[1] - 0.09), (1, 0), (0, 1), 0.18, 0.18, top, top + 0.16)
        b.box('lamp_glass', (q[0] - 0.07, q[1] - 0.07), (1, 0), (0, 1), 0.14, 0.14, top + 0.16, top + 0.18)
    # отбойник на стороне проезда: стойки и гнутая труба
    rail = [E(math.radians(d), 1.0, 1.1) for d in range(130, 231, 10)]
    for q in rail[::2]:
        cone(b, 'lamp', q[0], q[1], 0, 0.45, 0.04, 0.04, 6)
    for p0, p1 in zip(rail, rail[1:]):
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        u = ((p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L)
        b.box('lamp', (p0[0] + u[1] * 0.04, p0[1] - u[0] * 0.04), u, (-u[1], u[0]), L + 0.02, 0.08, 0.4, 0.48, bottom=True)
    a = 2.0
    spot = (x - 9.0, z - 6.0)                 # с проезда, с северо-запада: за кубом виден корпус, как на фотографии
    meta['cube'] = {'x': round(spot[0], 1), 'z': round(spot[1], 1), 'yaw': round(math.atan2(x - spot[0], -(z - spot[1])), 3),
                    'body': {'x': x, 'z': z, 'base': round(top + 0.08 + ph - 0.22, 3), 'edge': a}}
    meta['blocks'].append([round(v_, 2) for q in outer[::2] for v_ in q])


CAR_COLORS = ['car_white', 'car_silver', 'car_black', 'car_blue', 'car_red']


def car(b, x, z, u, color):
    """Простая машина: кузов, кабина с тёмными стёклами, колёса. u — направление «вперёд»"""
    AUDIT['items'].append(dict(kind='car', x=x, z=z, r=2.2, crown=2.2, u=list(u)))
    n = (-u[1], u[0])
    def Q(a, d):
        return (x + u[0] * a + n[0] * d, z + u[1] * a + n[1] * d)
    b.box(color, Q(-2.1, -0.87), u, n, 4.2, 1.74, 0.28, 0.82)
    b.box('glass', Q(-1.2, -0.8), u, n, 2.2, 1.6, 0.82, 1.36)
    b.box(color, Q(-1.1, -0.78), u, n, 2.0, 1.56, 1.36, 1.42, bottom=True)
    for a in (-1.35, 1.35):
        for d in (-0.92, 0.72):
            b.box('tyre', Q(a - 0.32, d), u, n, 0.64, 0.2, 0.0, 0.64)


def parking(b, ground, meta, keep_free):
    """Парковка перед западным крылом: два ряда мест с белой разметкой и машинами (сколько и каких машин — случайно)"""
    o = PARKING['origin']
    for row in PARKING['rows']:
        ground.ribbon('line', [grid_point(o, PARKING['start'], row - 2.3), grid_point(o, PARKING['end'], row - 2.3)], 0.1, H_ASPHALT + H_MARK)
        count = int((PARKING['end'] - PARKING['start']) / 2.7)
        for i in range(count + 1):
            a = PARKING['start'] + i * 2.7
            ground.ribbon('line', [grid_point(o, a, row - 2.3), grid_point(o, a, row + 2.3)], 0.1, H_ASPHALT + H_MARK)
            if i < count and rnd.random() < 0.62:
                p = grid_point(o, a + 1.35, row)
                car(b, p[0], p[1], GRID_V if rnd.random() < 0.5 else (-GRID_V[0], -GRID_V[1]), rnd.choice(CAR_COLORS))
                box = [grid_point(o, a + 0.4, row - 2.2), grid_point(o, a + 2.3, row - 2.2), grid_point(o, a + 2.3, row + 2.2), grid_point(o, a + 0.4, row + 2.2)]
                meta['blocks'].append([round(v_, 2) for q in box for v_ in q])
    lot = [grid_point(o, PARKING['start'] - 3, PARKING['near']), grid_point(o, PARKING['end'] + 3, PARKING['near']), grid_point(o, PARKING['end'] + 3, PARKING['far']), grid_point(o, PARKING['start'] - 3, PARKING['far'])]
    ground.flat('asphalt', lot, H_ASPHALT, 4.0)
    keep_free.append(lot)


# Дорожка от проезда у корпуса к стадиону: вдоль западной стороны, за трибунами, до пешеходной дорожки у столовой
# (в OpenStreetMap её нет — проложена по прямой)
PITCH_PATH = [(36.0, -4.2), (34.5, -54.5), (63.5, -150.5), (75.5, -148.9)]


def build():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    make_materials()
    meta = {'raised': [], 'trees': 0, 'blocks': []}
    def road_length(r):
        q = pts(r['points'])
        return sum(math.hypot(c[0] - a[0], c[1] - a[1]) for a, c in zip(q, q[1:]))
    # обрубки проездов короче 10 м в OpenStreetMap — заезды в карманы; на карте они выглядят заплатами асфальта
    DATA['roads'] = [r for r in DATA['roads'] if r['walk'] or road_length(r) >= 10]
    DATA['roads'].append({'width': 3.0, 'walk': True, 'points': [c for q in PITCH_PATH for c in q]})
    DATA['greens'] = [g for g in DATA['greens'] if not inside(CUBE, pts(g['points']))]   # этот газон заменяет клумба куба
    fence_poly = pts(DATA['fence'])
    buildings = DATA['buildings']
    footprints = [pts(bd['points']) for bd in buildings]

    ground, solid, green, props = Builder('ground'), Builder('buildings'), Builder('greenery'), Builder('props')

    # --- земля
    # Кайма — простой прямоугольник со срезанными углами вокруг всей территории.
    # (Раздвигать сам контур ограды нельзя: во вогнутых местах он выворачивается и даёт чёрные заплаты.)
    bb, m, cut = DATA['bounds'], 2600, 900
    x0, x1, z0, z1 = bb['minX'] - m, bb['maxX'] + m, bb['minZ'] - m, bb['maxZ'] + m
    apron = [(x0 + cut, z0), (x1 - cut, z0), (x1, z0 + cut), (x1, z1 - cut), (x1 - cut, z1), (x0 + cut, z1), (x0, z1 - cut), (x0, z0 + cut)]
    ground.flat('apron', apron, -0.12, 3.0)                 # газонная кайма за оградой
    ground.flat('paving', fence_poly, H_PAVING, 2.0)             # вся территория — серая плитка
    for road in DATA['roads']:
        if not road['walk']:
            ground.ribbon('asphalt', pts(road['points']), road['width'], H_ASPHALT, 4.0)

    center = next(bd for bd in buildings if bd.get('part') == 'center')
    cpoly = pts(center['points'])
    cedges = list(outward_edges(cpoly))
    fa, fc, fn, fL = max(cedges, key=lambda e: e[2][1])
    fu = ((fc[0] - fa[0]) / fL, (fc[1] - fa[1]) / fL)
    # площадь перед входом: цветная плитка от фасада до ограды
    def F(s, d):
        return (fa[0] + fu[0] * s + fn[0] * d, fa[1] + fu[1] * s + fn[1] * d)
    plaza = [F(2, 0), F(fL - 2, 0), F(fL + 6, 46), F(-6, 46)]
    plaza = [p for p in plaza]
    # Цветная плитка лежит шире самой площади: между площадью и газонами не остаётся полос серой плитки.
    # Газоны её перекрывают; из газонов она ничего не вырезает (вырезает только сама площадь).
    plaza_wide = [F(-16, 0), F(fL + 16, 0), F(fL + 16, 46), F(-16, 46)]
    ground.flat('plaza', plaza_wide, H_PLAZA, 2.4)
    ground.flat('plaza', plaza, H_PLAZA, 2.4)
    for road in DATA['roads']:
        if road['walk']:
            ground.ribbon('paving', pts(road['points']), max(road['width'], 2.4), H_WALK, 2.0)

    # большое футбольное поле — подробный стадион; мелкие площадки — зелёное покрытие с белым контуром
    for p in DATA['pitches']:
        poly = pts(p['points'])
        if len(poly) == 4 and abs(area2(poly)) / 2 > 4000:
            stadium(ground, props, poly, meta)
        else:
            ground.flat('pitch', poly, H_ON_GRASS, 3.0)
            ground.ribbon('line', poly + [poly[0]], 0.12, H_ON_GRASS + H_MARK)
    # дорожка к полю поверх газона (в OpenStreetMap её нет; проложена от проезда вдоль трибун до входа на стадион)
    ground.ribbon('paving', PITCH_PATH, 3.0, H_ON_GRASS, 2.0)

    # --- здания
    for index, bd in enumerate(buildings):
        if bd.get('part') == 'center':
            center_block(solid, bd, meta)
        elif bd['kind'] == 'main':
            wing(solid, bd, meta if bd.get('part') in ('west', 'east', 'north') else None)
        elif bd is korp_l_building():
            korp_l_shell(solid, bd, index, meta)
        else:
            generic_building(solid, bd, index)

    internet_center(solid, footprints)
    library_entrance(solid)
    library_entrance(solid, korp_l_door())

    # --- зелень
    def free(p, margin=0.0):
        return inside(p, fence_poly) and not any(inside(p, fp) for fp in footprints)
    road_lines = [(pts(r['points']), max(r['width'], 2.4)) for r in DATA['roads']]
    def on_path(p, extra):
        """Точка на дороге или дорожке (с запасом extra метров)"""
        for line, width in road_lines:
            for a, c in zip(line, line[1:]):
                dx, dz = c[0] - a[0], c[1] - a[1]
                l2 = dx * dx + dz * dz
                t = 0 if l2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
                if math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t) < width / 2 + extra:
                    return True
        return False
    # найденное на спутнике: парковка, церковь, беседка — там деревьев быть не должно
    keep_free = []
    parking(props, ground, meta, keep_free)
    church(solid, ground, meta)
    gazebo(props)
    wisdom_cube(props, green, ground, meta)

    # --- газоны. Правило зон: где лежит асфальт, плитка, покрытие стадиона или стоит здание — газона нет.
    # Все контуры накладываются друг на друга, и от газонов остаётся только то, что ничем не занято.
    lawn_polys = [pts(g['points']) for g in DATA['greens']]
    cutters = [poly for mat, h, poly in AUDIT['ground']
               if mat not in ('grass', 'apron', 'line', 'plaza') and not (mat == 'paving' and h == H_PAVING) and abs(area2(poly)) > 0.02
               # на самой площади газоны главнее: это клумбы посреди плитки, дорожки из данных их не режут
               and not (mat == 'paving' and h == H_WALK and inside(centroid(poly), plaza_wide))]
    cutters += footprints
    lawn_tris = lawn_overlay(lawn_polys, cutters)
    for tri in lawn_tris:
        ground.face('grass', [W(*q, H_GRASS) for q in tri], (0, 0, 1), 3.0)
    lawn_curbs(ground, lawn_tris)
    in_lawn = lawn_tester(lawn_tris)
    AUDIT['in_lawn'] = in_lawn
    def wall_gap(p):
        return min(seg_distance(p, a, c) for fp in footprints for a, c in zip(fp, fp[1:] + fp[:1]))
    def on_drive(p, extra):
        """Точка на проезжей части (с запасом extra метров)"""
        for r in DATA['roads']:
            if r['walk']:
                continue
            line = pts(r['points'])
            if any(seg_distance(p, a, c) < r['width'] / 2 + extra for a, c in zip(line, line[1:])):
                return True
        return False
    def nearest_lawn(p, margin, reach=7.0):
        """Ближайшая к p точка газона с запасом margin от края (ищем кругами до reach метров); None — рядом газона нет"""
        if in_lawn(p, margin):
            return p
        step = 0.75
        for ring in range(1, int(reach / step) + 1):
            for k in range(16):
                q = (p[0] + math.cos(k / 16 * math.tau) * ring * step, p[1] + math.sin(k / 16 * math.tau) * ring * step)
                if in_lawn(q, margin):
                    return q
        return None
    def clear_of_extras(p):
        if math.hypot(p[0] - CUBE[0], p[1] - CUBE[1]) < CUBE_BED[0] + 3.5:
            return False
        keep = meta['church_keep_clear']
        if inside(p, keep['platform']) or inside(p, keep['rest']):
            return False
        for line, width in keep['paths']:
            for q0, q1 in zip(line, line[1:]):
                dx, dz = q1[0] - q0[0], q1[1] - q0[1]
                t = max(0, min(1, ((p[0] - q0[0]) * dx + (p[1] - q0[1]) * dz) / (dx * dx + dz * dz)))
                if math.hypot(p[0] - q0[0] - dx * t, p[1] - q0[1] - dz * t) < width / 2 + 3.0:
                    return False
        # просвет от точки обзора до храма: иначе кроны закрывают его целиком
        vx, vz = meta['church']['x'], meta['church']['z']
        dx, dz = CHURCH[0] - vx, CHURCH[1] - vz
        t = max(0, min(1, ((p[0] - vx) * dx + (p[1] - vz) * dz) / (dx * dx + dz * dz)))
        if math.hypot(p[0] - vx - dx * t, p[1] - vz - dz * t) < 6.0:
            return False
        if math.hypot(p[0] - GAZEBO[0], p[1] - GAZEBO[1]) < 6.5:
            return False
        return not any(inside(p, zone) for zone in keep_free)
    trees = 0
    planted = []                      # всё уже посаженное: новое дерево не ближе 4 м к любому из них
    def roomy(p, gap=4.0):
        return all(math.hypot(p[0] - q[0], p[1] - q[1]) >= gap for q in planted)
    for q in meta.pop('church_spruces'):
        q = nearest_lawn(q, 1.6)
        if q and free(q) and wall_gap(q) > 3.2 and roomy(q):
            planted.append(q)
            spruce(green, q[0], q[1], 1.25)
            trees += 1
    for g in DATA['greens']:
        poly = pts(g['points'])
        xs, zs = [p[0] for p in poly], [p[1] for p in poly]
        size = abs(area2(poly)) / 2
        if inside(CHURCH, poly):
            g = dict(g, trees=True)          # сквер вокруг церкви на снимке густой
        # в рощах деревья гуще; на обычных газонах — редкие (точного положения деревьев в источниках нет)
        count = int(size / (70 if g['trees'] else 260))
        placed, tries = [], 0
        while len(placed) < count and tries < count * 30:
            tries += 1
            p = (rnd.uniform(min(xs), max(xs)), rnd.uniform(min(zs), max(zs)))
            if not inside(p, poly) or not free(p):
                continue
            if any(math.hypot(p[0] - q[0], p[1] - q[1]) < 5.5 for q in placed):
                continue
            # не ближе 4 м к стенам главного корпуса и не на площади
            # не на площади и не на дорожках: ствол не ближе 3 м к краю плитки или асфальта (крона широкая)
            if inside(p, plaza) or on_path(p, 3.0) or not clear_of_extras(p):
                continue
            size_ = 0.9 + rnd.random() * 0.7
            # ствол — на газоне, не ближе 2 м к его краю (дороге, плитке); крона не достаёт до стен
            if not in_lawn(p, 2.0) or wall_gap(p) < 3.4 * size_ + 0.3 or not roomy(p):
                continue
            placed.append(p)
            planted.append(p)
            tree(green, p[0], p[1], size_)
            trees += 1
    # ели по сторонам от входа и шары-кусты вдоль площади — по панораме у главного входа
    planted.extend([F(-1.5, 9), F(fL + 1.5, 9)])          # здесь встанут фонари у входа — зелень их обходит
    for side in (-1, 1):
        s_edge = -9 if side < 0 else fL + 9
        for k in range(5):
            p = F(s_edge + side * (k % 2) * 4.5, 7 + k * 5.5)
            p = nearest_lawn(p, 1.8)
            if p and free(p) and wall_gap(p) > 3.0 and roomy(p):
                planted.append(p)
                spruce(green, p[0], p[1], 1.0 + (k % 3) * 0.15)
                trees += 1
        for k in range(6):
            p = F((-2.5 if side < 0 else fL + 2.5) + side * k * 0.6, 12 + k * 6)
            p = nearest_lawn(p, 1.3, 4.0)
            if p and free(p) and wall_gap(p) > 1.5 and roomy(p, 3.3):
                planted.append(p)
                bush(green, p[0], p[1], 1.0 + (k % 2) * 0.2)
    meta['trees'] = trees

    # стриженые изгороди по краям газонов перед входом — на панораме газоны обрамлены низкой изгородью
    for g in DATA['greens']:
        poly = pts(g['points'])
        cx, cz = centroid(poly)
        ahead = (cx - fa[0]) * fn[0] + (cz - fa[1]) * fn[1]
        along = (cx - fa[0]) * fu[0] + (cz - fa[1]) * fu[1]
        if not (2 < ahead < 60 and -70 < along < fL + 70):
            continue
        sign = 1 if area2(poly) > 0 else -1
        for a, c in zip(poly, poly[1:] + poly[:1]):
            L = math.hypot(c[0] - a[0], c[1] - a[1])
            if L < 6:
                continue
            u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
            n = (sign * u[1], -sign * u[0])       # наружу от газона
            a2 = (a[0] + u[0] * 1.2 - n[0] * 0.9, a[1] + u[1] * 1.2 - n[1] * 0.9)
            c2 = (c[0] - u[0] * 1.2 - n[0] * 0.9, c[1] - u[1] * 1.2 - n[1] * 0.9)
            if free(a2) and free(c2):
                hedge(green, a2, c2)

    # --- предметы
    # фонари: два двухрожковых у входа (видны на панораме) и однорожковые вдоль проездов через каждые ~28 м
    for side in (0, 1):
        p = F(-1.5 if side == 0 else fL + 1.5, 9)
        lamp(props, p[0], p[1], fu)
    lamps = []
    for road in DATA['roads']:
        if road['walk']:
            continue
        line = pts(road['points'])
        travelled = 14.0
        for a, c in zip(line, line[1:]):
            L = math.hypot(c[0] - a[0], c[1] - a[1])
            if L < 0.1:
                continue
            u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L)
            while travelled < L:
                p = (a[0] + u[0] * travelled - u[1] * (road['width'] / 2 + 0.7), a[1] + u[1] * travelled + u[0] * (road['width'] / 2 + 0.7))
                if (free(p) and not inside(p, plaza) and not on_drive(p, 0.3) and wall_gap(p) > 0.8
                        and not any(inside(p, zone) for zone in keep_free)        # не на парковке
                        and all(math.hypot(p[0] - q[0], p[1] - q[1]) > 20 for q in lamps)):
                    lamps.append(p)
                    lamp_single(props, p[0], p[1], (u[1], -u[0]))
                travelled += 28.0
            travelled -= L
    # скамейки и урны на плитке у краёв площади (места примерные — на панорамах у входа их не видно)
    lawns = [pts(g['points']) for g in DATA['greens']]
    def paved(p):
        return inside(p, plaza) and not in_lawn(p, 0.0) and not on_drive(p, 0.6)
    for side in (-1, 1):
        for k in range(3):
            d = 13 + k * 9
            for i in range(2, 40):
                s_pos = i * 0.5 if side < 0 else fL - i * 0.5
                p, inner = F(s_pos, d), F(s_pos + (1.4 if side < 0 else -1.4), d)
                if paved(p) and paved(inner) and paved(F(s_pos, d + 2.2)):
                    bench(props, p[0], p[1], fn)
                    q = F(s_pos, d + 1.6)
                    urn(props, q[0], q[1])
                    break
    # юбилейная стела перед главным входом, лицом к площади
    st = F(fL / 2, 14.0)
    stele(props, st[0], st[1], fu, fn, meta)
    sp = F(fL / 2 - 9.0, 13.0)
    signpost(props, sp[0], sp[1], [('СТАДИОН', meta['pitch']['x'], meta['pitch']['z']), ('ХРАМ', meta['church']['x'], meta['church']['z']),
                                    ('ЦЕНТР ИНТЕРНЕТ', meta['cube']['x'], meta['cube']['z']), ('ПАРКОВКА', *grid_point(PARKING['origin'], (PARKING['start'] + PARKING['end']) / 2, PARKING['rows'][0]))], meta)
    for q, u_ in meta.pop('church_seats'):
        bench_plain(props, q[0], q[1], u_)
    for q in meta.pop('church_urns'):
        urn(props, q[0], q[1])
    # ворота: каменные столбы по краям прохода и распахнутые створки
    gate = F(fL / 2, 46)
    gate_half = 9.0
    for side in (-1, 1):
        g = F(fL / 2 + side * gate_half, 46.5)
        pier(props, g[0], g[1])
        fence(props, [g, F(fL / 2 + side * gate_half, 46.5 - 4.2)], [])
    church_gate = meta.pop('church_gate')
    gates = [(gate[0], gate[1], gate_half + 1.0), (church_gate[0], church_gate[1], 2.2)]
    # где проезд доходит до ограды — въезд: в ограде проём (иначе дорога упирается в забор)
    for r in DATA['roads']:
        if r['walk']:
            continue
        line = pts(r['points'])
        for end in (line[0], line[-1]):
            gap = min(seg_distance(end, a, c) for a, c in zip(fence_poly, fence_poly[1:] + fence_poly[:1]))
            if gap < 3.0:
                gates.append((end[0], end[1], r['width'] / 2 + 1.5))
    fence(props, fence_poly, gates)

    # --- окружение за оградой: соседние дома серыми объёмами и улицы; в приложении всё это тонет в дымке
    around = Builder('context')
    for road in DATA['context']['roads']:
        pieces, current = [], []
        for q in pts(road['points']):          # внутри территории свои дороги — там окружение не рисуем
            if inside(q, fence_poly):
                if len(current) > 1:
                    pieces.append(current)
                current = []
            else:
                current.append(q)
        if len(current) > 1:
            pieces.append(current)
        for piece in pieces:
            around.ribbon('ctx_road', piece, road['width'], 0.08, 4.0)
    for bd in DATA['context']['buildings']:
        poly = pts(bd['points'])
        top = bd['levels'] * LEVEL
        for a, c, n, L in outward_edges(poly):
            around.face('ctx_wall', [W(*a, 0), W(*c, 0), W(*c, top), W(*a, top)], (n[0], -n[1], 0), 3.0)
        around.flat('ctx_roof', poly, top, 3.0)

    objs = [ground.build(), solid.build(), green.build(smooth=True), props.build(), around.build()] + [part.build() for part in PARTS.values()]
    meta['parts'] = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    meta.pop('church_keep_clear', None)
    meta['start'] = {'x': round(F(fL / 2, 30)[0], 1), 'z': round(F(fL / 2, 30)[1], 1), 'yaw': round(math.atan2(-fn[0], fn[1]), 3)}
    meta['tris'] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    return objs, meta


def preview(name, eye, target, lens=28):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.clip_end = 3000
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = W(*eye)
    direction = W(*target) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene = bpy.context.scene
    scene.camera = cam
    scene.render.filepath = os.path.join(OUT_DIR, name + '.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


def light_setup(scene):
    """Солнце с юго-запада, невысокое — длинные мягкие тени, как в эталоне; небо даёт мягкую подсветку теней"""
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 2.3
    sun_data.angle = math.radians(5)
    sun = bpy.data.objects.new('sun', sun_data)
    sun.location = W(-170, 260, 230)
    sun.rotation_euler = (W(0, 0, 0) - sun.location).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('sky')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.80, 0.88, 1.0, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.42
    scene.world = world
    scene.view_settings.view_transform = 'Standard'
    return sun


def bake(objs, meta):
    """Запекает свет: в цвет вершин — для зданий, зелени и предметов; в картинку — для земли.
    В приложении после этого не нужны ни источники света, ни расчёт теней."""
    import addon_utils
    addon_utils.enable('cycles')
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.cycles.max_bounces = 3
    scene.cycles.use_denoising = True
    light_setup(scene)
    ground = objs[0]

    # 1. Здания, зелень, предметы: свет считаем сами, лучами, и пишем в цвет вершин.
    #    (Встроенное запекание в вершины даёт чёрные пятна: вершины стен лежат ровно в углах и считаются закрытыми.)
    #    Для каждого угла каждой грани: точка чуть сдвинута к середине грани и приподнята над ней;
    #    один луч к солнцу (есть ли тень) и несколько коротких лучей вокруг (затенение в углах и нишах).
    from mathutils.bvhtree import BVHTree
    verts, polys = [], []
    for obj in objs:
        base = len(verts)
        verts.extend([v.co.copy() for v in obj.data.vertices])
        polys.extend([[base + i for i in p.vertices] for p in obj.data.polygons])
    tree = BVHTree.FromPolygons(verts, polys)
    to_sun = W(-170, 260, 230).normalized()
    rays = []
    rng = random.Random(7)
    for _ in range(7):                      # направления в полусфере вокруг нормали
        z = 0.25 + rng.random() * 0.7
        t = rng.random() * math.tau
        r = math.sqrt(1 - z * z)
        rays.append((r * math.cos(t), r * math.sin(t), z))
    for obj in objs[1:]:
        mesh = obj.data
        attr = mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        mesh.color_attributes.active_color = attr
        colors = np.ones((len(mesh.loops), 4), dtype=np.float32)
        soft = obj.name == 'greenery'
        flat_lit = {i for i, m in enumerate(mesh.materials) if m.name.split('.')[0] in ('roof', 'ctx_roof')}
        # Белёный храм на фотографиях светлый со всех сторон: он сам отражает много света. Тени на нём оставляем мягкими
        bright = {i for i, m in enumerate(mesh.materials) if m.name.split('.')[0] == 'church_white'}
        indoor = {i for i, m in enumerate(mesh.materials) if m.name.split('.')[0] in INDOOR}
        for poly in mesh.polygons:
            n = poly.normal
            c = poly.center
            if poly.material_index in flat_lit:
                # Крыши — большие треугольники: тень от короба на одном углу расползалась бы пятном на полкрыши
                for li in poly.loop_indices:
                    colors[li, :3] = min(1.0, 0.85 * max(0.0, n.dot(to_sun)) + 0.5 * (0.62 + 0.38 * n.z) + 0.1)
                continue
            # оси в плоскости грани — для лучей затенения
            t1 = n.cross(Vector((0, 0, 1)))
            if t1.length < 1e-3:
                t1 = Vector((1, 0, 0))
            t1.normalize()
            t2 = n.cross(t1)
            lambert = max(0.0, n.dot(to_sun))
            sky = 0.5 * (0.62 + 0.38 * n.z)
            for li in poly.loop_indices:
                co = mesh.vertices[mesh.loops[li].vertex_index].co
                p = co + (c - co) * 0.22 + n * 0.03
                sun = 0.0
                if lambert > 0 and tree.ray_cast(p, to_sun, 600)[0] is None:
                    sun = lambert
                hits = 0.0
                for rx, ry, rz in rays:
                    d = t1 * rx + t2 * ry + n * rz
                    hit = tree.ray_cast(p, d, 3.5)
                    if hit[0] is not None:
                        hits += 1 - hit[3] / 3.5
                ao = 1 - 0.75 * hits / len(rays)
                if soft:                    # листва: мягче, без резких чёрных граней
                    sun = 0.35 + 0.65 * sun
                    ao = 0.5 + 0.5 * ao
                v = min(1.0, 0.85 * sun + sky * ao + 0.1)
                if poly.material_index in bright:
                    v = 0.66 + 0.34 * v
                if poly.material_index in indoor:      # в зале свет от потолочных панелей: ровный, с мягкими тенями в углах
                    v = 0.62 + 0.38 * ao
                if mesh.materials[poly.material_index].name.split('.')[0] in ('hall_light', 'stair_window', 'lm_screen'):
                    v = 1.0                              # светящаяся панель
                colors[li, :3] = v
        attr.data.foreach_set('color', colors.reshape(-1))
        print('BAKED', obj.name)

    # 2. Земля: снимок света строго сверху. Здания и деревья камера не видит, но тени от них остаются
    b = DATA['bounds']
    size = max(b['maxX'] - b['minX'], b['maxZ'] - b['minZ']) + 110
    cx, cz = (b['minX'] + b['maxX']) / 2, (b['minZ'] + b['maxZ']) / 2
    for obj in objs[1:]:
        obj.visible_camera = False
    # Земля сама на себя теней не бросает: слои плитки лежат в миллиметрах друг над другом,
    # и из-за погрешности расчёта нижний слой давал на верхнем чёрные пятна
    ground.visible_shadow = False
    ground.visible_diffuse = False
    ground.visible_glossy = False
    white = bpy.data.materials.new('bake_white')
    white.use_nodes = True
    next(n for n in white.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (1, 1, 1, 1)
    bpy.context.view_layer.material_override = white
    cam_data = bpy.data.cameras.new('top')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = size
    cam_data.clip_end = 2000
    cam = bpy.data.objects.new('top', cam_data)
    cam.location = W(cx, cz, 500)
    cam.rotation_euler = (0, 0, 0)       # смотрит вниз, верх кадра — север
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x = scene.render.resolution_y = 2048
    scene.render.resolution_percentage = 100
    scene.cycles.samples = 64
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 88
    scene.render.filepath = os.path.join(ROOT, 'public', 'map3d', 'ground_light.jpg')
    bpy.ops.render.render(write_still=True)
    # Под кустами и стволами земля совсем закрыта от света и выходит чёрной; на краях это видно пятнами.
    # Поднимаем самые тёмные места до обычной густой тени.
    image = bpy.data.images.load(scene.render.filepath)
    px = np.empty(len(image.pixels), dtype=np.float32)
    image.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    px[:, :3] = np.maximum(px[:, :3], 0.2)
    # Кайма картинки — всегда «на солнце»: за её пределами приложение тянет крайние точки,
    # и тень, попавшая на самый край, расползалась бы полосой до горизонта
    side = int(round(math.sqrt(len(px))))
    grid = px.reshape(side, side, 4)
    lit = float(np.percentile(grid[:, :, 0], 90))
    for edge in (grid[:6, :, :3], grid[-6:, :, :3], grid[:, :6, :3], grid[:, -6:, :3]):
        edge[:] = lit
    px = grid.reshape(-1, 4)
    image.pixels.foreach_set(px.reshape(-1))
    image.save()
    bpy.context.view_layer.material_override = None
    for obj in objs[1:]:
        obj.visible_camera = True
    bpy.data.objects.remove(cam, do_unlink=True)
    meta['groundLight'] = {'x': round(cx, 2), 'z': round(cz, 2), 'size': round(size, 2)}
    print('BAKED ground')


def audit():
    """Проверка расстановки: что стоит не в своей зоне, что входит друг в друга, какие слои земли лежат почти на одной высоте"""
    fence_poly = pts(DATA['fence'])
    footprints = [pts(bd['points']) for bd in DATA['buildings']]
    lawns = [pts(g['points']) for g in DATA['greens']]
    roads = [(pts(r['points']), r['width'], r['walk']) for r in DATA['roads']]
    def seg_dist(p, a, c):
        dx, dz = c[0] - a[0], c[1] - a[1]
        l2 = dx * dx + dz * dz
        t = 0 if l2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
        return math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t)
    def wall_dist(p):
        return min(seg_dist(p, a, c) for fp in footprints for a, c in zip(fp, fp[1:] + fp[:1]))
    def road_gap(p, walk):
        best = 1e9
        for line, width, is_walk in roads:
            if is_walk != walk:
                continue
            for a, c in zip(line, line[1:]):
                best = min(best, seg_dist(p, a, c) - width / 2)
        return best
    items = AUDIT['items']
    out = {k: [] for k in ('tree_in_building', 'crown_in_wall', 'tree_on_road', 'tree_on_walk', 'tree_not_on_lawn', 'car_on_lawn', 'car_in_building',
                           'prop_on_road', 'prop_in_building', 'overlap', 'outside_fence')}
    for it in items:
        p, kind = (it['x'], it['z']), it['kind']
        spot = [kind, round(p[0], 1), round(p[1], 1)]
        if not inside(p, fence_poly):
            out['outside_fence'].append(spot)
        in_building = any(inside(p, fp) for fp in footprints)
        on_lawn = AUDIT['in_lawn'](p)
        if kind in ('tree', 'spruce', 'bush'):
            if in_building:
                out['tree_in_building'].append(spot)
            elif wall_dist(p) < it['crown']:
                out['crown_in_wall'].append(spot + [round(wall_dist(p), 1)])
            if road_gap(p, False) < it['r'] + 0.3:
                out['tree_on_road'].append(spot)
            elif road_gap(p, True) < it['r'] + 0.3 and not on_lawn:      # под клумбами площади дорожек не видно — там газон
                out['tree_on_walk'].append(spot)
            if not on_lawn:
                out['tree_not_on_lawn'].append(spot)
        elif kind == 'car':
            u_ = it['u']
            n_ = (-u_[1], u_[0])
            body = [(p[0] + u_[0] * a_ + n_[0] * d_, p[1] + u_[1] * a_ + n_[1] * d_) for a_ in (-2.1, 0, 2.1) for d_ in (-0.87, 0, 0.87)]
            if any(AUDIT['in_lawn'](q) for q in body):
                out['car_on_lawn'].append(spot)
            if in_building or wall_dist(p) < 1.2:
                out['car_in_building'].append(spot)
        else:
            if in_building or wall_dist(p) < it['r']:
                out['prop_in_building'].append(spot)
            if road_gap(p, False) < it['r']:
                out['prop_on_road'].append(spot)
    for i, a in enumerate(items):
        for b in items[i + 1:]:
            d = math.hypot(a['x'] - b['x'], a['z'] - b['z'])
            trees = a['kind'] in ('tree', 'spruce', 'bush') and b['kind'] in ('tree', 'spruce', 'bush')
            limit = (a['r'] + b['r'] + 1.5) if trees else (a['r'] + b['r'] if 'tree' not in (a['kind'], b['kind']) and 'spruce' not in (a['kind'], b['kind']) else max(a['crown'], b['crown']) * 0.6)
            if a['kind'] == 'car' and b['kind'] == 'car':
                limit = 1.9
            if d < limit:
                out['overlap'].append([a['kind'], b['kind'], round(a['x'], 1), round(a['z'], 1), round(d, 1)])
    # слои земли: сетка 2 м; в каждой точке — два верхних слоя разного материала; если между ними меньше 3 см — будет мигать
    layers = []
    for mat, h, poly in AUDIT['ground']:
        xs, zs = [q[0] for q in poly], [q[1] for q in poly]
        layers.append((mat, h, poly, min(xs), max(xs), min(zs), max(zs)))
    bb = DATA['bounds']
    close, cells = {}, 0
    x = bb['minX']
    while x < bb['maxX']:
        z = bb['minZ']
        while z < bb['maxZ']:
            p = (x + 0.37, z + 0.53)
            if inside(p, fence_poly):
                cells += 1
                here = {}
                for mat, h, poly, x0, x1, z0, z1 in layers:
                    if x0 <= p[0] <= x1 and z0 <= p[1] <= z1 and inside(p, poly):
                        here[mat] = max(here.get(mat, -9), h)
                top = sorted(here.items(), key=lambda kv: -kv[1])[:2]
                if len(top) == 2 and top[0][1] - top[1][1] < 0.035:
                    key = top[0][0] + ' над ' + top[1][0] + ' (%.1f см)' % ((top[0][1] - top[1][1]) * 100)
                    close[key] = close.get(key, 0) + 4
            z += 2
        x += 2
    report = {'items': len(items), 'kinds': {k: sum(1 for it in items if it['kind'] == k) for k in sorted({it['kind'] for it in items})},
              'violations': {k: len(v) for k, v in out.items()}, 'details': out, 'thin_layers_m2': dict(sorted(close.items(), key=lambda kv: -kv[1])), 'territory_m2': cells * 4}
    json.dump(report, open(os.path.join(OUT_DIR, 'audit.json'), 'w'), ensure_ascii=False, indent=1)
    print('AUDIT', json.dumps({k: report[k] for k in ('items', 'kinds', 'violations', 'thin_layers_m2', 'territory_m2')}, ensure_ascii=False))


def minimap(name, box, layers, size=360):
    """Схема сверху для мини-карты: box = (minX, maxX, minZ, maxZ) в метрах, layers = [(многоугольники, цвет)]"""
    x0, x1, z0, z1 = box
    w = size
    h = max(1, int(round(size * (z1 - z0) / (x1 - x0))))
    xs = x0 + (np.arange(w) + 0.5) / w * (x1 - x0)
    zs = z0 + (np.arange(h) + 0.5) / h * (z1 - z0)
    X, Z = np.meshgrid(xs, zs)
    img = np.ones((h, w, 3), dtype=np.float32) * np.array(layers[0][1], dtype=np.float32)
    for polys, color in layers[1:]:
        for poly in polys:
            inside_ = np.zeros((h, w), dtype=bool)
            for (ax_, az_), (bx_, bz_) in zip(poly, poly[1:] + poly[:1]):
                if abs(bz_ - az_) < 1e-9:
                    continue
                cross = ((az_ > Z) != (bz_ > Z)) & (X < (bx_ - ax_) * (Z - az_) / (bz_ - az_) + ax_)
                inside_ ^= cross
            img[inside_] = color
    rgba = np.concatenate([img[::-1], np.ones((h, w, 1), dtype=np.float32)], axis=2)
    image = bpy.data.images.new(name, w, h, alpha=False)
    image.pixels.foreach_set(rgba.reshape(-1))
    image.filepath_raw = os.path.join(ROOT, 'public', 'map3d', name + '.png')
    image.file_format = 'PNG'
    image.save()
    return {'file': name + '.png', 'box': [round(v, 2) for v in box], 'width': w, 'height': h}


def minimaps(meta):
    """Три схемы: вся территория и по одной на каждый построенный этаж главного корпуса"""
    main_parts = [pts(bd['points']) for bd in DATA['buildings'] if bd['kind'] == 'main'] + [pts(meta['annex'])]
    others = [pts(bd['points']) for bd in DATA['buildings'] if bd['kind'] != 'main']
    bd_ = DATA['bounds']
    fence_ = pts(DATA['fence'])
    fx, fz = [q[0] for q in fence_], [q[1] for q in fence_]
    out_box = (min(fx) - 10, max(fx) + 10, min(fz) - 10, max(fz) + 10)
    result = {'out': minimap('minimap_out', out_box, [
        ([], (0.86, 0.87, 0.88)), ([fence_], (0.96, 0.96, 0.95)),
        ([pts(pt['points']) for pt in DATA['pitches']], (0.62, 0.80, 0.60)),
        (others, (0.76, 0.77, 0.78)), (main_parts, (0.52, 0.60, 0.74))])}
    inner = [q for bd in DATA['buildings'] if bd.get('part') in ('west', 'center', 'east', 'north') for q in pts(bd['points'])] + pts(meta['annex'])
    in_box = (min(q[0] for q in inner) - 6, max(q[0] for q in inner) + 6, min(q[1] for q in inner) - 6, max(q[1] for q in inner) + 6)
    for floor in (1, 2, 3, 4, 5):
        layers = [([], (0.93, 0.93, 0.93)), (main_parts + [pts(korp_l_building()['points'])], (0.80, 0.81, 0.83))]      # корпус Л — тоже открытое здание
        for place in meta['places']:
            if place['floor'] in (floor, None):
                layers.append(([pts(place['points'])], tuple(place['color'])))
        result['f%d' % floor] = minimap('minimap_f%d' % floor, in_box, layers)
    meta['minimap'] = result


def main():
    objs, meta = build()
    minimaps(meta)
    print('MODEL', json.dumps(meta, ensure_ascii=False))
    if '--audit' in sys.argv:
        audit()
        return
    scene = bpy.context.scene
    if '--no-bake' not in sys.argv:
        bake(objs, meta)

    glb = os.path.join(ROOT, 'public', 'map3d', 'campus.glb')
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_draco_color_quantization=8,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_image_format='JPEG', export_cameras=False, export_lights=False)
    meta['bytes'] = os.path.getsize(glb)
    import time
    meta['version'] = int(time.time())
    json.dump(meta, open(os.path.join(ROOT, 'src', 'features', 'map3d', 'data', 'model.json'), 'w'), ensure_ascii=False, indent=1)
    print('GLB', meta['bytes'])

    if '--preview' not in sys.argv:
        return
    # превью: проверить модель глазами до приложения
    scene.render.engine = 'BLENDER_EEVEE'
    if scene.world is None:
        light_setup(scene)
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x, scene.render.resolution_y = 1400, 900
    s = meta['start']
    e = meta['entrance']
    preview('front', (s['x'] - 6, s['z'] + 14, 1.7), (e['x'], e['z'], 7), 22)
    preview('aerial', (s['x'] + 60, s['z'] + 170, 150), (e['x'], e['z'] - 60, 0), 30)
    preview('window', (e['x'] + 30, e['z'] + 6, 6), (e['x'] + 34, e['z'] - 12, 7), 35)

main()
