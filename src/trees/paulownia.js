import * as THREE from 'three';
import { Q } from '../core/quality.js';
import { mat } from '../textures/index.js';
import { paulowniaLeaves, leafMaterial } from '../textures/leaves.js';
import { rng } from '../textures/canvas.js';
import { growSkeleton, fitSkeleton, branchGeometry, leafCards, fruitPoints, trunkCollider } from './treeBuilder.js';
import { applyWind } from './wind.js';

/**
 * 泡桐（当地叫“梧桐”）：成年大树，约 10 m 高，树冠半径约 5 m。
 * 主干粗直、灰褐色较光滑带皮孔，约 4 m 处分出 3~4 根粗大主枝向四周斜伸，树冠宽圆。
 * 叶子特别大（30~40 cm）、心形；初秋挂着一串串尖卵形蒴果（花在春天，不画）。
 */
const PARAMS = {
  trunk: { length: 4, radius: 0.3, segments: 5, bend: 0.035, endRadiusK: 0.75 },
  levels: [
    { count: [4, 5], angle: [52, 70], lengthK: 0.95, radiusK: 0.72, along: [0.85, 1], upBias: 0.08, bend: 0.12, endRadiusK: 0.55 },
    { count: [3, 4], angle: [35, 60], lengthK: 0.65, radiusK: 0.62, along: [0.3, 1], upBias: 0.05, bend: 0.2, droop: 0.15 },
    { count: [3, 5], angle: [35, 65], lengthK: 0.55, radiusK: 0.55, along: [0.25, 1], bend: 0.25, droop: 0.35 },
  ],
};

let leafMat;
export function createPaulownia(t) {
  const g = new THREE.Group();
  g.name = t.id;
  g.position.set(t.x, 0, t.z);
  const seed = Math.round((t.x + 10) * 100 + (t.z + 10) * 7);
  const sk = fitSkeleton(growSkeleton(PARAMS, seed), { height: t.height, crown: t.crown, crownPad: 0.9, trunkRadius: t.trunkRadius });

  const wood = new THREE.Mesh(branchGeometry(sk.segs, { radial: 10 }), mat('barkPaulownia'));
  wood.castShadow = wood.receiveShadow = true;
  g.add(wood);

  leafMat ??= applyWind(leafMaterial(paulowniaLeaves(), { roughness: 0.75 }), { amp: 0.05, freq: 1.3 });
  g.add(leafCards(sk, leafMat, { count: Math.round(700 * Q.leaf), size: [1.0, 1.6], seed, spread: 0.9, droop: 0.25 }));

  // 蒴果：一串串挂在枝梢，青褐色尖卵形
  const pts = fruitPoints(sk, 22, seed + 5, { minLevel: 2, hang: 0.25 });
  const capGeo = new THREE.SphereGeometry(1, 8, 6).scale(0.018, 0.034, 0.018);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x8a7f52, roughness: 0.8 });
  const r = rng(seed + 9);
  const per = 7;
  const caps = new THREE.InstancedMesh(capGeo, capMat, pts.length * per);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (const p of pts) {
    for (let i = 0; i < per; i++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8));
      m4.compose(new THREE.Vector3(p.x + (r() - 0.5) * 0.15, p.y - r() * 0.2, p.z + (r() - 0.5) * 0.15), q, new THREE.Vector3(1, 1, 1));
      caps.setMatrixAt(k++, m4);
    }
  }
  caps.castShadow = true;
  g.add(caps);

  g.add(trunkCollider(t.trunkRadius + 0.05));
  return g;
}
