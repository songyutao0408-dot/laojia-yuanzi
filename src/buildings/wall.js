import * as THREE from 'three';
import { box } from '../core/whitebox.js';

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
 * @param {Array<{center:number,width:number,bottom:number,top:number,glass?:boolean}>} o.openings
 *        洞口（bottom/top 为绝对高度）；glass=true 时在洞口中间放一块玻璃
 * @param {THREE.Material} material
 * @param {THREE.Material} [glassMat]
 */
export function wallWithOpenings(o, material, glassMat) {
  const g = new THREE.Group();
  const t2 = o.thickness / 2;
  const seg = (a0, a1, y0, y1) => {
    if (a1 - a0 < 1e-4 || y1 - y0 < 1e-4) return;
    g.add(
      o.axis === 'x'
        ? box(a0, a1, y0, y1, o.at - t2, o.at + t2, material)
        : box(o.at - t2, o.at + t2, y0, y1, a0, a1, material),
    );
  };
  const ops = [...(o.openings || [])].sort((a, b) => a.center - b.center);
  let cur = o.from;
  for (const op of ops) {
    const a0 = op.center - op.width / 2;
    const a1 = op.center + op.width / 2;
    seg(cur, a0, o.y0, o.y1); // 洞口左侧整段
    seg(a0, a1, o.y0, op.bottom); // 洞口下（窗台）
    seg(a0, a1, op.top, o.y1); // 洞口上（过梁以上）
    if (op.glass && glassMat) {
      const pane = o.axis === 'x'
        ? box(a0, a1, op.bottom, op.top, o.at - 0.005, o.at + 0.005, glassMat, { solid: true, shadow: false })
        : box(o.at - 0.005, o.at + 0.005, op.bottom, op.top, a0, a1, glassMat, { solid: true, shadow: false });
      pane.receiveShadow = false;
      g.add(pane);
    }
    cur = a1;
  }
  seg(cur, o.to, o.y0, o.y1);
  return g;
}

/**
 * 矩形房子的四面墙 + 地坪 + 平顶 + 檐口。
 * openings: { n:[], s:[], w:[], e:[] }，每个洞口 { center, width, bottom, top, glass }
 * 返回 { group, inner }，inner 为室内净空矩形（墙内侧）
 */
export function brickBox({ rect, wall, height, floor, parapet, openings = {} }, mats) {
  const group = new THREE.Group();
  const { x0, x1, z0, z1 } = rect;
  const h = wall / 2;
  // 南北墙通长，东西墙夹在中间
  group.add(wallWithOpenings({ axis: 'x', from: x0, to: x1, at: z0 + h, thickness: wall, y0: 0, y1: height, openings: openings.n }, mats.wall, mats.glass));
  group.add(wallWithOpenings({ axis: 'x', from: x0, to: x1, at: z1 - h, thickness: wall, y0: 0, y1: height, openings: openings.s }, mats.wall, mats.glass));
  group.add(wallWithOpenings({ axis: 'z', from: z0 + wall, to: z1 - wall, at: x0 + h, thickness: wall, y0: 0, y1: height, openings: openings.w }, mats.wall, mats.glass));
  group.add(wallWithOpenings({ axis: 'z', from: z0 + wall, to: z1 - wall, at: x1 - h, thickness: wall, y0: 0, y1: height, openings: openings.e }, mats.wall, mats.glass));

  const inner = { x0: x0 + wall, x1: x1 - wall, z0: z0 + wall, z1: z1 - wall };
  // 室内地坪（不参与碰撞，人走在上面由第 6 步的地面高度处理）
  if (floor > 0) group.add(box(inner.x0, inner.x1, 0, floor, inner.z0, inner.z1, mats.floor, { solid: false }));
  // 平顶屋面 0.15 m 厚，压在墙顶
  group.add(box(x0, x1, height - 0.15, height, z0, z1, mats.roof, { solid: false }));
  // 檐口（女儿墙）沿外沿一圈
  if (parapet > 0) {
    const t = wall;
    const y0 = height;
    const y1 = height + parapet;
    group.add(box(x0, x1, y0, y1, z0, z0 + t, mats.trim, { solid: false }));
    group.add(box(x0, x1, y0, y1, z1 - t, z1, mats.trim, { solid: false }));
    group.add(box(x0, x0 + t, y0, y1, z0 + t, z1 - t, mats.trim, { solid: false }));
    group.add(box(x1 - t, x1, y0, y1, z0 + t, z1 - t, mats.trim, { solid: false }));
  }
  return { group, inner };
}
