import * as THREE from 'three';
import { YARD_ITEMS } from '../layout.js';
import { box } from '../core/box.js';
import { canvasTex, rng } from '../interiors/common.js';

/**
 * 一盆水仙（第 17 轮，用户要求）：东边梧桐树底下，放在一个小木凳上。
 * 椭圆的青花瓷浅盆，盆里清水、白石子，五六个水仙头（鳞茎），一丛丛扁长的绿叶子，
 * 几根花葶顶着一簇簇白花（六瓣白花、中间黄色的小杯）。
 */
export function createNarcissus() {
  const N = YARD_ITEMS.narcissus;
  const g = new THREE.Group();
  g.name = 'narcissus';
  g.position.set(N.x, 0, N.z);
  g.rotation.y = 0.3;
  const r = rng(701);

  // 小木凳
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.85 });
  g.add(box(-0.2, 0.2, N.stool - 0.03, N.stool, -0.14, 0.14, wood, { solid: false }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(box(sx * 0.16 - 0.02, sx * 0.16 + 0.02, 0, N.stool - 0.03, sz * 0.1 - 0.02, sz * 0.1 + 0.02, wood, { solid: false }));
  }
  g.add(box(-0.2, 0.2, 0, 0.75, -0.15, 0.15, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false })); // 挡人

  // 青花瓷浅盆（椭圆）：外壁一圈青花
  const y0 = N.stool;
  const prof = [[0, 0], [0.11, 0], [0.12, 0.008], [0.14, 0.06], [0.145, 0.064], [0.135, 0.064], [0.125, 0.012], [0, 0.012]].map(([a, b]) => new THREE.Vector2(a, b));
  const dish = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ map: blueWhiteTex(), roughness: 0.2 }));
  dish.scale.set(1.35, 1, 0.85);
  dish.position.y = y0;
  dish.castShadow = true;
  g.add(dish);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fb4b8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7 }));
  water.scale.set(1.35, 1, 0.85);
  water.position.y = y0 + 0.045;
  g.add(water);
  // 白石子
  const pebble = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 7, 5), new THREE.MeshStandardMaterial({ color: 0xeae6dc, roughness: 0.4 }), 70);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.12;
    m4.compose(new THREE.Vector3(Math.cos(a) * d * 1.35, y0 + 0.035 + r() * 0.01, Math.sin(a) * d * 0.85), new THREE.Quaternion(), new THREE.Vector3(1, 0.6, 0.8).multiplyScalar(0.7 + r() * 0.6));
    pebble.setMatrixAt(i, m4);
  }
  g.add(pebble);

  // 水仙头、叶子、花
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4e7a3a, roughness: 0.55, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5e8a44, roughness: 0.6 });
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbf8ee, roughness: 0.5, side: THREE.DoubleSide });
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xf0b830, roughness: 0.5, side: THREE.DoubleSide });
  const bulbs = [[-0.1, 0], [-0.04, 0.04], [0.03, -0.03], [0.09, 0.02], [0.0, 0.05], [0.12, -0.04]];
  for (const [bx, bz] of bulbs) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), bulbMat);
    bulb.scale.set(1, 1.2, 1);
    bulb.position.set(bx, y0 + 0.055, bz);
    g.add(bulb);
    const skin = new THREE.Mesh(new THREE.SphereGeometry(0.031, 14, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), skinMat);
    skin.scale.set(1, 1.2, 1);
    skin.position.copy(bulb.position);
    g.add(skin);
    // 一丛叶子：扁长条，往上长、梢头往外弯
    const nLeaves = 4 + Math.floor(r() * 3);
    for (let k = 0; k < nLeaves; k++) {
      const len = 0.2 + r() * 0.16;
      const geo = new THREE.PlaneGeometry(0.014, len, 1, 6);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) + len / 2) / len;
        pos.setY(i, t * len);
        pos.setZ(i, t * t * 0.05);
        pos.setX(i, pos.getX(i) * (1 - t * 0.6));
      }
      geo.computeVertexNormals();
      const leaf = new THREE.Mesh(geo, leafMat);
      leaf.position.set(bx, y0 + 0.08, bz);
      leaf.rotation.set(0.1 + r() * 0.25, r() * Math.PI * 2, 0, 'YXZ');
      leaf.castShadow = true;
      g.add(leaf);
    }
    // 花葶 + 一簇白花
    if (r() < 0.75) {
      const h = 0.26 + r() * 0.12;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, h, 5), stemMat);
      const lean = (r() - 0.5) * 0.2;
      stem.position.set(bx, y0 + 0.08 + h / 2, bz);
      stem.rotation.z = lean;
      g.add(stem);
      const top = new THREE.Vector3(bx - Math.sin(lean) * h, y0 + 0.08 + h * Math.cos(lean), bz);
      const nf = 3 + Math.floor(r() * 3);
      for (let f = 0; f < nf; f++) {
        const fl = flower(petalMat, cupMat);
        const a = (f / nf) * Math.PI * 2 + r();
        fl.position.copy(top).add(new THREE.Vector3(Math.cos(a) * 0.025, -0.01 - r() * 0.015, Math.sin(a) * 0.025));
        fl.lookAt(fl.position.clone().add(new THREE.Vector3(Math.cos(a), 0.3, Math.sin(a))));
        g.add(fl);
      }
    }
  }
  return g;
}

/** 一朵水仙：六片白瓣、中间一个黄色小杯 */
function flower(petalMat, cupMat) {
  const f = new THREE.Group();
  const petal = new THREE.CircleGeometry(0.011, 8);
  petal.scale(0.6, 1, 1);
  petal.translate(0, 0.011, 0);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(petal, petalMat);
    p.rotation.z = (i / 6) * Math.PI * 2;
    f.add(p);
  }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.006, 10, 1, true).rotateX(Math.PI / 2), cupMat);
  cup.position.z = 0.003;
  f.add(cup);
  return f;
}

/** 青花：白底上一圈蓝色的缠枝花 */
function blueWhiteTex() {
  return canvasTex(256, 64, (g, w, h) => {
    const r = rng(709);
    g.fillStyle = '#f0f0ec';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a4a8a';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h * 0.5 + Math.sin(x * 0.12) * 8);
    g.stroke();
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * w + 6;
      g.fillStyle = 'rgba(40,70,140,0.85)';
      g.beginPath();
      g.arc(x, h * 0.5 + Math.sin(x * 0.12) * 8 + (r() > 0.5 ? 7 : -7), 4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#2a4a8a';
    g.fillRect(0, 4, w, 2);
    g.fillRect(0, h - 8, w, 2);
  });
}
