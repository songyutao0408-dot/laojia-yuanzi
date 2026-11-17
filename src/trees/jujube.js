import * as THREE from 'three';
import { mat } from '../textures/index.js';
import { jujubeLeaves, leafMaterial } from '../textures/leaves.js';
import { rng } from '../textures/canvas.js';
import { growSkeleton, fitSkeleton, branchGeometry, leafCards, fruitPoints, trunkCollider } from './treeBuilder.js';
import { applyWind } from './wind.js';

/**
 * 枣树：约十年树龄，4~5 m。树干深褐、纵向深裂、有些歪扭；枝条之字形、梢头下垂。
 * 小卵形叶（三出脉）；挂满红绿相间的枣子（约 2.5 × 3.3 cm）。
 * 枣子用 InstancedMesh（userData.fruit = 'jujube'），第 6 步点击采摘时把对应实例缩成 0。
 */
const PARAMS = {
  trunk: { length: 1.7, radius: 0.12, segments: 5, bend: 0.12, lean: 0.12, endRadiusK: 0.7 },
  levels: [
    { count: [4, 5], angle: [38, 62], lengthK: 1.1, radiusK: 0.6, along: [0.55, 1], upBias: 0.1, bend: 0.3 },
    { count: [4, 6], angle: [40, 70], lengthK: 0.55, radiusK: 0.5, along: [0.2, 1], bend: 0.35, droop: 0.35 },
    { count: [2, 3], angle: [30, 60], lengthK: 0.5, radiusK: 0.5, along: [0.2, 1], bend: 0.4, droop: 0.45 },
  ],
};

let leafMat;
export function createJujube(t) {
  const g = new THREE.Group();
  g.name = t.id;
  g.position.set(t.x, 0, t.z);
  const seed = 777;
  const sk = fitSkeleton(growSkeleton(PARAMS, seed), { height: t.height, crown: t.crown, crownPad: 0.4, trunkRadius: t.trunkRadius });
  const wood = new THREE.Mesh(branchGeometry(sk.segs, { radial: 7 }), mat('barkJujube'));
  wood.castShadow = wood.receiveShadow = true;
  g.add(wood);

  leafMat ??= applyWind(leafMaterial(jujubeLeaves(), { roughness: 0.6 }), { amp: 0.035, freq: 1.7 });
  g.add(leafCards(sk, leafMat, { count: 480, size: [0.32, 0.5], seed, spread: 0.25, droop: 0.3 }));

  // 枣子：红、半红、青绿
  const pts = fruitPoints(sk, 170, seed + 1, { minLevel: 2, hang: 0.05 });
  const geo = new THREE.SphereGeometry(1, 10, 8).scale(0.013, 0.017, 0.013);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const inst = new THREE.InstancedMesh(geo, m, pts.length);
  const r = rng(seed + 2);
  const m4 = new THREE.Matrix4();
  const colors = [0x8e2a1c, 0x9e3a22, 0x7a2418, 0xa8a040, 0x8fa03c, 0xb07a30];
  pts.forEach((p, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6));
    m4.compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.85 + r() * 0.3));
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, new THREE.Color(colors[Math.floor(r() * colors.length)]));
  });
  inst.castShadow = true;
  inst.userData = { fruit: 'jujube' };
  inst.name = 'jujube-fruits';
  g.add(inst);

  g.add(trunkCollider(t.trunkRadius + 0.05, 1.6));
  return g;
}
