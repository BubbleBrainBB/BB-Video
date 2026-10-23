# toy.py: builds soft-vinyl toys in Blender from the parts list (TOY3D_SPECS in toys.js) and exports GLB. Called by promo/scripts/toy3d-model.mjs:
#   blender -b --factory-startup -P toy.py -- spec.json out.glb
# Uses the same parts list as the three.js version (T.toy.build in PROMO.toy3d):
#   { parts: [{ shape: sphere | cylinder | cone | box | capsule, color, p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz], joint, eye }],
#     joints: { name: { pivot: [x,y,z], parent } }, blender: { voxel, faces, smooth } }
# Coordinates are three.js's (y up, same units as the frame); converted back to y-up on export, so positions match on both sides.
# Blender only models (no animation, no lighting): parts with the same joint and colour fuse into one piece (voxel remesh + smooth + decimate),
#   so the soft-vinyl toy has no seams between parts; eyes stay separate, unfused. Each joint exports as an empty node joint_<name>; motion is done in three.js.
import bpy, bmesh, json, sys, math
from mathutils import Matrix, Euler, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
spec = json.load(open(argv[0]))
out = argv[1]
cfg = spec.get('blender', {})

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# three.js (y up) → Blender (z up): (x, y, z) → (x, -z, y)
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
# Blender primitives are z-aligned, three.js cylinders / cones are y-aligned: rotate -90° about x first
TO_Y = Matrix.Rotation(-math.pi / 2, 4, 'X')

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_color(h):
    h = h.lstrip('#')
    return [srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)] + [1.0]

def prim(bm, shape, m):
    if shape == 'cylinder':
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=1, radius2=1, depth=1, matrix=m @ TO_Y)
    elif shape == 'cone':
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=1, radius2=0, depth=1, matrix=m @ TO_Y)
    elif shape == 'box':
        bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    elif shape == 'capsule':   # same as three.js's CapsuleGeometry(0.5, 1): radius 0.5, middle length 1
        bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=32, radius1=0.5, radius2=0.5, depth=1, matrix=m @ TO_Y)
        for sgn in (-1, 1):
            bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.5, matrix=m @ Matrix.Translation((0, sgn * 0.5, 0)))
    else:
        bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1, matrix=m)

def part_matrix(pt):
    p = pt.get('p', [0, 0, 0]); r = pt.get('r', [0, 0, 0]); s = pt.get('s', [1, 1, 1])
    S = Matrix.Diagonal((s[0], s[1], s[2], 1))
    return C @ Matrix.Translation(p) @ Euler(r, 'XYZ').to_matrix().to_4x4() @ S

def material(name, color):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = hex_color(color)
    b.inputs['Roughness'].default_value = 0.15 if name.startswith('eye') else 0.75
    return m

# Joints: empty nodes, chained by parent
joints = {'root': bpy.data.objects.new('joint_root', None)}
scene.collection.objects.link(joints['root'])
J = spec.get('joints', {})
pending = list(J.keys())
while pending:
    for n in list(pending):
        par = J[n].get('parent', 'root')
        if par not in joints:
            continue
        e = bpy.data.objects.new('joint_' + n, None)
        scene.collection.objects.link(e)
        e.location = (C @ Vector(J[n].get('pivot', [0, 0, 0]) + [1])).xyz
        bpy.context.view_layer.update()
        e.parent = joints[par]
        e.matrix_parent_inverse = joints[par].matrix_world.inverted()
        joints[n] = e
        pending.remove(n)

# Group parts by (joint, colour, eye), one mesh per group
groups = {}
for pt in spec['parts']:
    k = (pt.get('joint', 'root'), pt.get('color', '#cccccc').lower(), bool(pt.get('eye')))
    groups.setdefault(k, []).append(pt)

size = 0
for pt in spec['parts']:
    p = pt.get('p', [0, 0, 0]); s = pt.get('s', [1, 1, 1])
    size = max(size, max(abs(p[i]) + abs(s[i]) for i in range(3)))
voxel = cfg.get('voxel', max(0.004, size * 0.012))
target_faces = cfg.get('faces', 9000) / max(1, len(groups))

dg = bpy.context.evaluated_depsgraph_get
for i, ((jn, color, eye), pts) in enumerate(groups.items()):
    bm = bmesh.new()
    for pt in pts:
        prim(bm, pt.get('shape', 'sphere'), part_matrix(pt))
    me = bpy.data.meshes.new(f'{"eye" if eye else "part"}_{jn}_{i}')
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(me.name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(material('eye' if eye else 'vinyl_' + color.lstrip('#'), '#0b0c12' if eye else color))
    if not eye:
        rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel
        sm = ob.modifiers.new('smooth', 'SMOOTH'); sm.factor = cfg.get('smooth', 0.6); sm.iterations = 6
        ev = ob.evaluated_get(dg())
        faces = len(ev.data.polygons)
        if faces > target_faces:
            dc = ob.modifiers.new('decimate', 'DECIMATE'); dc.ratio = max(0.02, target_faces / faces)
        new = bpy.data.meshes.new_from_object(ob.evaluated_get(dg()))
        old = ob.data; ob.modifiers.clear(); ob.data = new; bpy.data.meshes.remove(old)
        ob.data.materials.clear(); ob.data.materials.append(material('vinyl_' + color.lstrip('#'), color))
    for poly in ob.data.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.update()
    ob.parent = joints[jn]
    ob.matrix_parent_inverse = joints[jn].matrix_world.inverted()

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True)
print('TOY3D_OK', out, sum(len(o.data.polygons) for o in scene.objects if o.type == 'MESH'))
