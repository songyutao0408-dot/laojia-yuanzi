import * as THREE from 'three';
import { TOILET as T } from '../layout.js';
import { box } from '../core/box.js';
import { mat, stainMat } from '../textures/index.js';
import { wallWithOpenings, baseStain } from './wall.js';

/** 东南角茅厕：红砖矮墙围合（顶上一皮压顶砖）、无顶，门洞朝西；东、南两面借用土墙 */
export function createToilet() {
  const group = new THREE.Group();
  group.name = 'toilet';
  const r = T.rect;
  const w = T.wall;
  const h = w / 2;
  const m = { wall: mat('brick') };
  group.add(wallWithOpenings({ axis: 'x', from: r.x0, to: r.x1, at: r.z0 + h, thickness: w, y0: 0, y1: T.height, openings: [] }, m));
  group.add(
    wallWithOpenings(
      { axis: 'z', from: r.z0 + w, to: r.z1, at: r.x0 + h, thickness: w, y0: 0, y1: T.height, openings: [{ center: T.door.z, width: T.door.width, bottom: 0, top: T.height + 1 }] },
      m,
    ),
  );
  // 压顶砖
  const cap = (x0, x1, z0, z1) => group.add(box(x0, x1, T.height, T.height + 0.06, z0, z1, mat('brick'), { solid: false }));
  cap(r.x0 - 0.02, r.x1, r.z0 - 0.02, r.z0 + w + 0.02);
  cap(r.x0 - 0.02, r.x0 + w + 0.02, r.z0, T.door.z - T.door.width / 2);
  cap(r.x0 - 0.02, r.x0 + w + 0.02, T.door.z + T.door.width / 2, r.z1);
  // 墙根污渍
  const stain = stainMat();
  group.add(baseStain(stain, { axis: 'x', from: r.x0, to: r.x1, at: r.z0, face: 'n', height: 0.6 }));
  group.add(baseStain(stain, { axis: 'z', from: r.z0, to: T.door.z - T.door.width / 2, at: r.x0, face: 'w', height: 0.6 }));
  group.add(baseStain(stain, { axis: 'z', from: T.door.z + T.door.width / 2, to: r.z1, at: r.x0, face: 'w', height: 0.6 }));
  // 茅坑：地面一道黑缝（蹲坑）+ 两块垫脚砖
  group.add(box(r.x0 + 1.0, r.x0 + 1.25, 0.0, 0.01, r.z0 + 1.2, r.z0 + 1.8, new THREE.MeshBasicMaterial({ color: 0x14100c }), { solid: false, shadow: false }));
  group.add(box(r.x0 + 0.8, r.x0 + 0.98, 0, 0.06, r.z0 + 1.3, r.z0 + 1.7, mat('brick'), { solid: false }));
  group.add(box(r.x0 + 1.27, r.x0 + 1.45, 0, 0.06, r.z0 + 1.3, r.z0 + 1.7, mat('brick'), { solid: false }));
  return group;
}
