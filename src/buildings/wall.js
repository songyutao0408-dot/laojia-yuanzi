import * as THREE from 'three';
import { box } from '../core/box.js';

/**
 * 一段带门窗洞口的直墙，拆成若干个盒子拼出来（墙有真实厚度，洞口可穿过）。
 *
 * @param {object} o
 * @param {'x'|'z'} o.axis    墙沿哪个轴延伸（'x' = 东西向墙，'z' = 南北向墙）
 * @param {number} o.from     沿轴起点
 * @param {number} o.to       沿轴终点
 * @param {number} o.at       墙中线在另一个水平轴上的坐标
 * @param {number} o.thickness
 * @param {number} o.y0       墙底
 * @param {number} o.y1       墙顶
 * @param {Array<{center:number,width:number,bottom:number,top:number,glass?:boolean,lintel?:boolean,sill?:boolean}>} o.openings
 *        洞口（bottom/top 为绝对高度）；glass=true 在洞口中间放玻璃；lintel=true 露出水泥过梁；sill=true 砖砌窗台
 * @param {{wall:THREE.Material, glass?:THREE.Material, lintel?:THREE.Material, sill?:THREE.Material}} m
 */
export function wallWithOpenings(o, m) {
  const g = new THREE.Group();
  const t2 = o.thickness / 2;
  const add = (a0, a1, y0, y1, mat, extra = 0, opts) => {
    if (a1 - a0 < 1e-4 || y1 - y0 < 1e-4) return;
    g.add(
      o.axis === 'x'
        ? box(a0, a1, y0, y1, o.at - t2 - extra, o.at + t2 + extra, mat, opts)
        : box(o.at - t2 - extra, o.at + t2 + extra, y0, y1, a0, a1, mat, opts),
    );
  };
  const ops = [...(o.openings || [])].sort((a, b) => a.center - b.center);
  let cur = o.from;
  for (const op of ops) {
    const a0 = op.center - op.width / 2;
    const a1 = op.center + op.width / 2;
    add(cur, a0, o.y0, o.y1, m.wall);
    add(a0, a1, o.y0, op.bottom, m.wall);
    add(a0, a1, op.top, o.y1, m.wall);
    if (op.glass && m.glass) {
      const pane = o.axis === 'x'
        ? box(a0, a1, op.bottom, op.top, o.at - 0.004, o.at + 0.004, m.glass, { shadow: false })
        : box(o.at - 0.004, o.at + 0.004, op.bottom, op.top, a0, a1, m.glass, { shadow: false });
      pane.receiveShadow = false;
      pane.userData.solid = true;
      g.add(pane);
    }
    // 过梁：洞口上方一条水泥梁，两端各伸进墙 0.24 m，比墙面略凸
    if (op.lintel && m.lintel) add(a0 - 0.24, a1 + 0.24, op.top, Math.min(op.top + 0.18, o.y1), m.lintel, 0.008, { solid: false });
    // 窗台：一皮立砌砖，略宽于洞口、两面各挑出 4 cm
    if (op.sill && m.sill) add(a0 - 0.06, a1 + 0.06, op.bottom - 0.06, op.bottom, m.sill, 0.04, { solid: false });
    cur = a1;
  }
  add(cur, o.to, o.y0, o.y1, m.wall);
  return g;
}

/**
 * 矩形砖房：四面墙 + 室内地坪 + 平顶屋面 + 檐口（女儿墙）。
 * openings: { n:[], s:[], w:[], e:[] }
 * mats: { wall, floor, roof, ceiling, trim, coping, glass, lintel, sill }
 * 返回 { group, inner }，inner 为室内净空矩形（墙内侧）
 */
export function brickBox({ rect, wall, height, floor, parapet, openings = {} }, mats) {
  const group = new THREE.Group();
  const { x0, x1, z0, z1 } = rect;
  const h = wall / 2;
  group.add(wallWithOpenings({ axis: 'x', from: x0, to: x1, at: z0 + h, thickness: wall, y0: 0, y1: height, openings: openings.n }, mats));
  group.add(wallWithOpenings({ axis: 'x', from: x0, to: x1, at: z1 - h, thickness: wall, y0: 0, y1: height, openings: openings.s }, mats));
  group.add(wallWithOpenings({ axis: 'z', from: z0 + wall, to: z1 - wall, at: x0 + h, thickness: wall, y0: 0, y1: height, openings: openings.w }, mats));
  group.add(wallWithOpenings({ axis: 'z', from: z0 + wall, to: z1 - wall, at: x1 - h, thickness: wall, y0: 0, y1: height, openings: openings.e }, mats));

  const inner = { x0: x0 + wall, x1: x1 - wall, z0: z0 + wall, z1: z1 - wall };
  if (floor > 0) group.add(box(inner.x0, inner.x1, 0, floor, inner.z0, inner.z1, mats.floor, { solid: false }));
  // 平顶屋面板夹在墙内侧（避免与外墙面重叠闪烁）：顶面水泥、底面白灰顶棚
  const roofMats = [mats.roof, mats.roof, mats.roof, mats.ceiling ?? mats.roof, mats.roof, mats.roof];
  group.add(box(inner.x0, inner.x1, height - 0.15, height, inner.z0, inner.z1, roofMats, { solid: false }));
  // 屋面上一层水泥抹面，盖住墙顶
  group.add(box(x0, x1, height, height + 0.03, z0, z1, mats.roof, { solid: false }));
  if (parapet > 0) {
    const t = wall;
    const y0 = height + 0.03;
    const y1 = height + parapet;
    const ring = [
      [x0, x1, z0, z0 + t],
      [x0, x1, z1 - t, z1],
      [x0, x0 + t, z0 + t, z1 - t],
      [x1 - t, x1, z0 + t, z1 - t],
    ];
    for (const [a, b, c, d] of ring) {
      group.add(box(a, b, y0, y1 - 0.04, c, d, mats.trim, { solid: false }));
      // 檐口压顶：一皮略挑出的砖 + 水泥抹顶
      group.add(box(a - 0.02, b + 0.02, y1 - 0.04, y1, c - 0.02, d + 0.02, mats.coping ?? mats.trim, { solid: false }));
    }
  }
  return { group, inner };
}

/** 墙根污渍带（泥点 + 泛碱）：贴在外墙面上的透明条带。face: 'n'|'s'|'e'|'w' 为墙面朝向 */
export function baseStain(material, { axis, from, to, at, face, height = 0.8 }) {
  const len = to - from;
  const geo = new THREE.PlaneGeometry(len, height);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * len + from) / 4);
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  const mid = (from + to) / 2;
  const eps = 0.004;
  if (axis === 'x') {
    m.position.set(mid, height / 2, at + (face === 's' ? eps : -eps));
    if (face === 'n') m.rotation.y = Math.PI;
  } else {
    m.position.set(at + (face === 'e' ? eps : -eps), height / 2, mid);
    m.rotation.y = face === 'e' ? Math.PI / 2 : -Math.PI / 2;
  }
  return m;
}
