import * as THREE from 'three';
import { EARTH_WALLS } from '../layout.js';
import { wb, box } from '../core/whitebox.js';

/** 夯土院墙（西、南、东），第 3 步加裂纹、冲沟、墙头杂草 */
export function createEarthWalls() {
  const group = new THREE.Group();
  group.name = 'earth-walls';
  for (const w of EARTH_WALLS) {
    const r = w.rect;
    group.add(box(r.x0, r.x1, 0, w.height, r.z0, r.z1, wb('earth')));
  }
  return group;
}
