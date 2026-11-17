import * as THREE from 'three';
import { TOILET as T } from '../layout.js';
import { wb } from '../core/whitebox.js';
import { wallWithOpenings } from './wall.js';

/** 东南角茅厕：红砖矮墙围合、无顶，门洞朝西；东、南两面借用土墙 */
export function createToilet() {
  const group = new THREE.Group();
  group.name = 'toilet';
  const r = T.rect;
  const w = T.wall;
  const h = w / 2;
  const mat = wb('brick');
  // 北墙
  group.add(wallWithOpenings({ axis: 'x', from: r.x0, to: r.x1, at: r.z0 + h, thickness: w, y0: 0, y1: T.height, openings: [] }, mat));
  // 西墙（门洞）
  group.add(
    wallWithOpenings(
      { axis: 'z', from: r.z0 + w, to: r.z1, at: r.x0 + h, thickness: w, y0: 0, y1: T.height, openings: [{ center: T.door.z, width: T.door.width, bottom: 0, top: T.height + 1 }] },
      mat,
    ),
  );
  // 东、南两面是土墙（earthWalls.js 已包含），这里不重复
  return group;
}
