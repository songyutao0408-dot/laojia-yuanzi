import * as THREE from 'three';
import { GATE } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';

/**
 * 西南角朝西开的破旧双开铁门，直接装在土墙门洞里（无门垛）。
 * 每扇：方管门框 + 下部铁皮门板（加强筋）+ 上部竖铁栏杆（尖头）+ 门环；漆面褪色、大片锈。
 * 两扇向院内（+X）半开，铰链在门洞两端。
 */
export const GATE_OPEN_ANGLE = (65 * Math.PI) / 180;

export function createGate() {
  const group = new THREE.Group();
  group.name = 'gate';
  const leafW = (GATE.z1 - GATE.z0) / 2 - 0.01;
  const iron = mat('gateIron');
  const H = GATE.height;
  const tube = 0.045;
  const sheetTop = 1.45;

  const makeLeaf = (hingeZ, dir) => {
    const pivot = new THREE.Group();
    pivot.position.set(GATE.x, 0, hingeZ);
    const leaf = new THREE.Group();
    // 局部：门板沿 z ∈ [0, leafW]（dir=-1 时整体翻到 [-leafW, 0]）
    const z = (a, b) => (dir > 0 ? [a, b] : [-b, -a]);
    const B = (y0, y1, za, zb, t = tube, m = iron, opts) => {
      const [a, b] = z(za, zb);
      leaf.add(box(-t / 2, t / 2, y0, y1, a, b, m, opts));
    };
    // 门框
    B(0.05, H, 0, tube);
    B(0.05, H, leafW - tube, leafW);
    B(0.05, 0.05 + tube, 0, leafW);
    B(H - tube, H, 0, leafW);
    B(sheetTop, sheetTop + tube, 0, leafW);
    // 下部铁皮门板 + 两道加强筋
    B(0.05 + tube, sheetTop, tube, leafW - tube, 0.012);
    B(0.55, 0.59, tube, leafW - tube, 0.03, iron, { solid: false });
    B(1.0, 1.04, tube, leafW - tube, 0.03, iron, { solid: false });
    // 上部竖栏杆 + 尖头
    const bars = 6;
    for (let i = 1; i < bars; i++) {
      const zc = (leafW * i) / bars;
      B(sheetTop + tube, H + 0.12, zc - 0.009, zc + 0.009, 0.018, iron, { solid: false });
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 4), iron);
      tip.position.set(0, H + 0.155, dir > 0 ? zc : -zc);
      tip.castShadow = true;
      leaf.add(tip);
    }
    // 门环（靠门缝一侧，朝外）
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16), iron);
    ring.position.set(-0.03, 1.05, dir > 0 ? leafW - 0.15 : -(leafW - 0.15));
    ring.rotation.y = Math.PI / 2;
    leaf.add(ring);
    // 合页
    for (const y of [0.3, H - 0.3]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), iron);
      hinge.position.set(0, y, 0);
      leaf.add(hinge);
    }
    pivot.add(leaf);
    // 向院内（+X）转开：北扇绕 Y 轴正转，南扇负转
    pivot.rotation.y = dir > 0 ? GATE_OPEN_ANGLE : -GATE_OPEN_ANGLE;
    return pivot;
  };
  group.add(makeLeaf(GATE.z0, +1));
  group.add(makeLeaf(GATE.z1, -1));
  // 门洞地面就是黄土，不加门槛石
  return group;
}
