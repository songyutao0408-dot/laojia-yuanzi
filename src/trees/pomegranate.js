import * as THREE from 'three';
import { Q } from '../core/quality.js';
import { mat } from '../textures/index.js';
import { pomegranateLeaves, leafMaterial } from '../textures/leaves.js';
import { rng } from '../textures/canvas.js';
import { growSkeleton, fitSkeleton, branchGeometry, leafCards, fruitPoints, trunkCollider } from './treeBuilder.js';
import { applyWind } from './wind.js';

/**
 * 石榴：约 3 m，从基部分出几根扭曲的枝干，小叶狭长发亮，枝叶密。
 * 挂满红石榴（直径约 8~9 cm，顶上一圈萼冠），有几个已经咧开口露出红籽。
 * 每个果子是独立 Mesh（userData.fruit = 'pomegranate'），第 6 步点击采摘。
 */
const PARAMS = {
  stems: 3,
  trunk: { length: 1.0, radius: 0.08, segments: 4, bend: 0.2, lean: 0.35, endRadiusK: 0.7 },
  levels: [
    { count: [3, 4], angle: [20, 40], lengthK: 0.95, radiusK: 0.65, along: [0.4, 1], upBias: 0.2, bend: 0.25 },
    { count: [3, 5], angle: [30, 60], lengthK: 0.6, radiusK: 0.55, along: [0.25, 1], bend: 0.3, droop: 0.35 },
  ],
};

let leafMat;
export function createPomegranate(t) {
  const g = new THREE.Group();
  g.name = t.id;
  g.position.set(t.x, 0, t.z);
  const seed = 4242;
  const sk = fitSkeleton(growSkeleton(PARAMS, seed), { height: t.height, crown: t.crown, crownPad: 0.35, trunkRadius: t.trunkRadius });
  const wood = new THREE.Mesh(branchGeometry(sk.segs, { radial: 7 }), mat('barkPomegranate'));
  wood.castShadow = wood.receiveShadow = true;
  g.add(wood);

  leafMat ??= applyWind(leafMaterial(pomegranateLeaves(), { roughness: 0.55 }), { amp: 0.03, freq: 1.9 });
  g.add(leafCards(sk, leafMat, { count: Math.round(420 * Q.leaf), size: [0.32, 0.5], seed, spread: 0.2, droop: 0.1 }));

  g.add(createFruits(sk, seed));
  g.add(trunkCollider(0.28, 1.2));
  return g;
}

function createFruits(sk, seed) {
  const fruits = new THREE.Group();
  fruits.name = 'pomegranate-fruits';
  const r = rng(seed + 3);
  const skin = new THREE.MeshStandardMaterial({ color: 0xb0302a, roughness: 0.45 });
  const skin2 = new THREE.MeshStandardMaterial({ color: 0xc85a34, roughness: 0.5 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.8, side: THREE.DoubleSide });
  const seedsMat = new THREE.MeshStandardMaterial({ color: 0xa8102a, roughness: 0.15, metalness: 0 });
  const crownGeo = new THREE.CylinderGeometry(0.018, 0.012, 0.03, 6, 1, true);
  const pts = fruitPoints(sk, 28, seed + 7, { minLevel: 1, hang: 0.07 });
  pts.forEach((p, i) => {
    const R = 0.04 + r() * 0.012;
    const split = i % 7 === 3; // 约 4 个咧开口
    const fruit = new THREE.Group();
    fruit.position.copy(p);
    fruit.rotation.set((r() - 0.5) * 0.8, r() * 6.28, Math.PI + (r() - 0.5) * 0.8); // 萼冠大多朝下
    const m = r() < 0.6 ? skin : skin2;
    const body = new THREE.Mesh(
      split ? new THREE.SphereGeometry(R, 18, 14, 0.4, Math.PI * 2 - 1.0) : new THREE.SphereGeometry(R, 18, 14),
      m,
    );
    body.scale.set(1, 0.92, 1);
    if (split) {
      body.material = m.clone();
      body.material.side = THREE.DoubleSide;
      // 裂口里一团红籽 + 白色隔膜
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.86, 2), seedsMat);
      const pos = s.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, k);
        v.multiplyScalar(1 + (r() - 0.5) * 0.12);
        pos.setXYZ(k, v.x, v.y, v.z);
      }
      s.geometry.computeVertexNormals();
      fruit.add(s);
      const pith = new THREE.Mesh(new THREE.SphereGeometry(R * 0.97, 12, 10, 0.4, Math.PI * 2 - 1.0), inner);
      fruit.add(pith);
    }
    body.castShadow = true;
    fruit.add(body);
    const crown = new THREE.Mesh(crownGeo, m);
    crown.position.y = R * 0.95;
    fruit.add(crown);
    fruit.userData = { fruit: 'pomegranate', split };
    fruit.name = `pomegranate-${i}`;
    fruits.add(fruit);
  });
  return fruits;
}
