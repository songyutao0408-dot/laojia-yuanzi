import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { wb, glass, box } from '../core/whitebox.js';
import { brickBox } from './wall.js';

/**
 * 厨房：西侧北段的低矮红砖平顶房，门窗开在东墙；西北角砖砌灶台 + 烟囱。
 * 暴露 interiorAnchor（室内西北角、地坪面），以后 src/interiors/kitchen.js 挂在这里。
 */
export function createKitchen() {
  const group = new THREE.Group();
  group.name = 'kitchen';
  const mats = { wall: wb('brick'), floor: wb('floor'), roof: wb('roof'), trim: wb('brickDark'), glass };

  const east = [
    { center: K.door.z, width: K.door.width, bottom: K.floor, top: K.floor + K.door.height },
    ...K.windows.map((w) => ({ center: w.z, width: w.width, bottom: K.floor + w.sill, top: K.floor + w.sill + w.height, glass: true })),
  ];
  const { group: shell, inner } = brickBox(
    { rect: K.rect, wall: K.wall, height: K.height, floor: K.floor, parapet: K.parapet, openings: { e: east } },
    mats,
  );
  group.add(shell);

  // 灶台（砖砌，大铁锅在第 3 步加）
  const s = K.stove;
  group.add(box(s.x0, s.x1, K.floor, K.floor + s.height, s.z0, s.z1, wb('stove')));

  // 烟囱：从灶台后角一直砌出屋顶，顶部一段熏黑
  const c = K.chimney;
  const half = c.size / 2;
  group.add(box(c.x - half, c.x + half, K.floor, c.top - 0.4, c.z - half, c.z + half, wb('brick')));
  group.add(box(c.x - half, c.x + half, c.top - 0.4, c.top, c.z - half, c.z + half, wb('soot')));

  const anchor = new THREE.Object3D();
  anchor.name = 'interior-anchor-kitchen';
  anchor.position.set(inner.x0, K.floor, inner.z0);
  anchor.userData = { room: 'kitchen', size: { w: inner.x1 - inner.x0, d: inner.z1 - inner.z0, h: K.height - 0.15 - K.floor } };
  group.add(anchor);
  return group;
}
