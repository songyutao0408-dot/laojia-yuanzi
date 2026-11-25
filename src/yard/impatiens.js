import * as THREE from 'three';
import { YARD_ITEMS } from '../layout.js';
import { canvasTex, rng } from '../interiors/common.js';
import { applyWind } from '../trees/wind.js';

/**
 * 指甲桃（凤仙花，第 19 轮，按用户的照片）：东北屋门口台阶东边、窗户底下往西一点，种在地上的一丛。
 * 七棵挤在一起、主茎中段分杈，半米到七十公分高；茎粗、发青发红、有点透亮；叶子披针形、边上细锯齿，一圈圈往上长、梢头挤成一簇；
 * 叶腋里一串串大红的重瓣花（像小山茶花），有几朵粉红的，还有些青绿的花苞。脚下一小片翻过的湿土。
 * 叶子和花用 InstancedMesh；叶子跟着风轻轻摆（和树叶一样用 wind.js）。
 */
export function createImpatiens() {
  const I = YARD_ITEMS.impatiens;
  const g = new THREE.Group();
  g.name = 'impatiens';
  g.position.set(I.x, 0, I.z);
  const r = rng(1103);

  // 脚下一小片湿土
  const soil = new THREE.Mesh(new THREE.CircleGeometry(I.r + 0.12, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: soilTex(), transparent: true, roughness: 1, depthWrite: false }));
  soil.position.y = 0.006;
  soil.userData.noAO = true;
  g.add(soil);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x8aa860, roughness: 0.45, emissive: 0x1a2408 });
  const stemRed = new THREE.MeshStandardMaterial({ color: 0xa8604a, roughness: 0.45 });
  const leafMat = applyWind(
    new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }),
    { amp: 0.012, freq: 1.6 },
  );

  // 先收集每棵的茎、叶子、花的位置，最后一起做 InstancedMesh
  const leaves = [];
  const flowers = [];
  const buds = [];
  const up0 = new THREE.Vector3(0, 1, 0);
  /** 长一根茎（主茎或侧枝）：沿 dir 长 h 米，每节一片叶子（螺旋），上半截叶腋里开花；depth = 0 的主茎再分几个杈 */
  const grow = (base, dir, h, depth) => {
    const rad = depth ? 0.006 : 0.012;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.55, rad, h, 7).translate(0, h / 2, 0), stemMat);
    stem.position.copy(base);
    stem.quaternion.setFromUnitVectors(up0, dir);
    g.add(stem);
    const nodes = Math.round(h * 34);
    for (let k = 0; k < nodes; k++) {
      const t = 0.08 + (k / nodes) * 0.92;
      const at = base.clone().addScaledVector(dir, h * t);
      const yaw = k * 2.4 + r() * 0.5;
      const len = (0.09 + r() * 0.05) * (t > 0.88 ? 0.65 : 1);
      const up = 0.15 + t * 0.55 + r() * 0.25; // 下面的叶子平伸，越往上越翘
      leaves.push({ at, yaw, up, len });
      if (t > 0.3 && r() < 0.8) {
        const m = 1 + Math.floor(r() * 3);
        for (let f = 0; f < m; f++) {
          const fy = yaw + (r() - 0.5) * 1.4;
          const off = 0.025 + r() * 0.035;
          const pos = at.clone().add(new THREE.Vector3(Math.sin(fy) * off, -0.015 - r() * 0.03, Math.cos(fy) * off));
          (r() < 0.12 ? buds : flowers).push({ pos, size: 0.9 + r() * 0.5, pink: r() < 0.15 });
        }
      }
      // 主茎中段分杈
      if (!depth && t > 0.25 && t < 0.65 && r() < 0.28) {
        const b = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(0.75).add(new THREE.Vector3(0, 1, 0)).normalize();
        grow(at, b, h * (0.4 + r() * 0.25), 1);
      }
    }
  };
  const n = 7;
  for (let p = 0; p < n; p++) {
    const a = (p / n) * Math.PI * 2 + r() * 0.6;
    const d = p === 0 ? 0 : I.r * (0.4 + r() * 0.55);
    const base = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    const h = 0.42 + r() * 0.3;
    const lean = new THREE.Vector3(Math.cos(a) * 0.2 * (d / I.r), 1, Math.sin(a) * 0.2 * (d / I.r)).normalize();
    grow(base, lean, h, 0);
    // 根部一小截发红
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.05, 7).translate(0, 0.025, 0), stemRed);
    foot.position.copy(base);
    foot.quaternion.setFromUnitVectors(up0, lean);
    g.add(foot);
  }

  // 叶子：一片披针形的卡片，根部在原点、沿 +y 长，稍微往后弯
  const leafGeo = new THREE.PlaneGeometry(1, 1, 1, 4).translate(0, 0.5, 0);
  {
    const pos = leafGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i);
      pos.setZ(i, -t * t * 0.18);
    }
    leafGeo.computeVertexNormals();
  }
  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, leaves.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  leaves.forEach((L, i) => {
    e.set(Math.PI / 2 - L.up, L.yaw, 0, 'YXZ'); // 先按 yaw 转向，再从水平往上翘
    q.setFromEuler(e);
    m4.compose(L.at, q, new THREE.Vector3(L.len * 0.42, L.len, L.len)); // z 也按叶长缩放，弯度才对
    leafInst.setMatrixAt(i, m4);
  });
  leafInst.castShadow = leafInst.receiveShadow = true;
  g.add(leafInst);

  // 花：一团皱皱的重瓣（变形的二十面体），大红为主、几朵粉红
  const flowerGeo = new THREE.IcosahedronGeometry(0.017, 2);
  {
    const pos = flowerGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const k = 1 + Math.sin(x * 420 + z * 310) * 0.16 + Math.cos(y * 380) * 0.12;
      pos.setXYZ(i, x * k, y * k * 0.8, z * k);
    }
    flowerGeo.computeVertexNormals();
  }
  const flowerInst = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), flowers.length);
  const red = new THREE.Color(0xd0182c);
  const red2 = new THREE.Color(0xb81024);
  const pink = new THREE.Color(0xe8506a);
  flowers.forEach((F, i) => {
    q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    m4.compose(F.pos, q, new THREE.Vector3(F.size, F.size, F.size));
    flowerInst.setMatrixAt(i, m4);
    flowerInst.setColorAt(i, F.pink ? pink : r() > 0.5 ? red : red2);
  });
  flowerInst.castShadow = true;
  g.add(flowerInst);
  // 青绿的花苞
  if (buds.length) {
    const budInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 8, 6).scale(1, 1.4, 1), new THREE.MeshStandardMaterial({ color: 0x7a9a50, roughness: 0.6 }), buds.length);
    buds.forEach((B, i) => {
      m4.compose(B.pos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      budInst.setMatrixAt(i, m4);
    });
    g.add(budInst);
  }
  return g;
}

/** 凤仙花的叶子：披针形、边上细锯齿，中间一道浅色主脉（透明底） */
function leafTex() {
  return canvasTex(64, 256, (g, w, h) => {
    const r = rng(1109);
    const half = (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.8) * (w / 2 - 2); // t：0 根部 → 1 叶尖
    g.beginPath();
    g.moveTo(w / 2, h);
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      g.lineTo(w / 2 + half(t) + (i % 2 ? 1.5 : 0), h - t * h);
    }
    for (let i = 60; i >= 0; i--) {
      const t = i / 60;
      g.lineTo(w / 2 - half(t) - (i % 2 ? 1.5 : 0), h - t * h);
    }
    g.closePath();
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#4e7a2e');
    gr.addColorStop(0.5, '#6e9a40');
    gr.addColorStop(1, '#4a742a');
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = 'rgba(200,226,150,0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w / 2, h);
    g.lineTo(w / 2, 6);
    g.stroke();
    // 侧脉
    g.strokeStyle = 'rgba(170,200,120,0.4)';
    g.lineWidth = 1;
    for (let y = 30; y < h - 10; y += 16) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(w / 2, y + 8);
        g.lineTo(w / 2 + s * (w / 2 - 8), y - 6 + r() * 4);
        g.stroke();
      }
    }
  });
}

/** 翻过的湿土（圆形，边缘渐隐） */
function soilTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(1117);
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(70,52,36,0.95)');
    gr.addColorStop(0.75, 'rgba(84,64,44,0.8)');
    gr.addColorStop(1, 'rgba(84,64,44,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * w * 0.42;
      g.fillStyle = r() > 0.5 ? 'rgba(40,30,20,0.6)' : 'rgba(120,100,76,0.5)';
      g.fillRect(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 1 + r() * 3, 1 + r() * 2);
    }
  });
}
