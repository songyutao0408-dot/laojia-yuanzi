import * as THREE from 'three';
import { GATE } from '../layout.js';
import { wb, box } from '../core/whitebox.js';

/**
 * 西南角朝西开的双开铁门，直接装在土墙门洞里（无门垛）。
 * 两扇门向院内（+X）半开，铰链在门洞两端。
 */
export const GATE_OPEN_ANGLE = (65 * Math.PI) / 180;

export function createGate() {
  const group = new THREE.Group();
  group.name = 'gate';
  const leafW = (GATE.z1 - GATE.z0) / 2;
  const t = 0.05;

  // 门洞上方不加过梁（农村土墙大门常见做法），两侧土墙已在 earthWalls 里
  const makeLeaf = (hingeZ, dir) => {
    const pivot = new THREE.Group();
    pivot.position.set(GATE.x, 0, hingeZ);
    // 门扇沿 +dir*Z 方向从铰链伸出
    const leaf = box(-t / 2, t / 2, 0.05, GATE.height, 0, leafW, wb('iron'));
    if (dir < 0) leaf.position.z = -leafW / 2;
    pivot.add(leaf);
    // 向院内（+X）转开：北扇绕 Y 轴正转，南扇负转
    pivot.rotation.y = dir > 0 ? GATE_OPEN_ANGLE : -GATE_OPEN_ANGLE;
    return pivot;
  };
  group.add(makeLeaf(GATE.z0, +1));
  group.add(makeLeaf(GATE.z1, -1));
  return group;
}
