import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { box } from '../core/box.js';
import { rng } from '../textures/canvas.js';
import { mat, stainMat } from '../textures/index.js';
import { canvasTex, seamlessBlob } from '../interiors/common.js';
import { remnantPlasterTex } from './peel.js';
import { createWaterVat } from '../yard/waterVat.js';
import { brickBox, baseStain } from './wall.js';
import { woodDoor, woodWindow } from './doorsWindows.js';

/**
 * 厨房：西侧北段的低矮平顶房，门窗开在东墙。第 16 轮按用户照片：旧砖墙，原先抹的泥灰皮大半掉了，
 * 只剩一块块（檐下一长条、墙角几块），檐下被雨水和烟熏黑；屋顶一块往外挑的水泥顶板，上面压着几块砖；
 * 本色旧木门（开着）、田字格木窗蒙塑料布；墙上挂圆筛子、一串红辣椒，窗下靠扫帚、坛子、大瓦缸，
 * 东南角码着劈柴、靠着木梯子，门北边一筐玉米、一堆玉米秸。烟囱从西北角伸出屋顶，顶部熏黑；屋里西南墙角堆着柴火。
 * 灶台、风箱、洋灰内墙在 src/interiors/kitchen.js，挂在 interior-anchor-kitchen 上。
 */
export function createKitchen() {
  const group = new THREE.Group();
  group.name = 'kitchen';
  const brick = mat('brickOld');
  const slab = mat('roof');
  const mats = {
    wall: brick,
    floor: mat('kitchenFloor'),
    roof: slab,
    ceiling: mat('brickOldSoot'),
    trim: brick,
    coping: brick,
  };
  const xe = K.rect.x1 - K.wall / 2; // 东墙中线
  const east = [
    { center: K.door.z, width: K.door.width, bottom: K.floor, top: K.floor + K.door.height },
    ...K.windows.map((w) => ({ center: w.z, width: w.width, bottom: K.floor + w.sill, top: K.floor + w.sill + w.height })),
  ];
  const { group: shell, inner } = brickBox(
    { rect: K.rect, wall: K.wall, height: K.height, floor: K.floor, parapet: K.parapet, openings: { e: east } },
    mats,
  );
  group.add(shell);
  const { x0, x1, z0, z1 } = K.rect;
  const off = { solid: false };

  // 屋顶：一块往外挑的水泥顶板（边上发黑、长了点青苔），上面压着几块砖
  {
    const e = 0.14;
    group.add(box(x0 - e, x1 + e, K.height - 0.01, K.height + 0.1, z0 - e, z1 + e, slab, off));
    const moss = new THREE.MeshStandardMaterial({ map: slabEdgeTex(), transparent: true, roughness: 1, depthWrite: false });
    const mk = (w, rotY, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.11), moss);
      m.rotation.y = rotY;
      m.position.set(x, K.height + 0.045, z);
      m.userData.noAO = true;
      group.add(m);
    };
    mk(x1 - x0 + 2 * e, 0, (x0 + x1) / 2, z1 + e + 0.002);
    mk(z1 - z0 + 2 * e, Math.PI / 2, x1 + e + 0.002, (z0 + z1) / 2);
    mk(x1 - x0 + 2 * e, Math.PI, (x0 + x1) / 2, z0 - e - 0.002);
    for (const [bx, bz, ry, n] of [[x1 - 0.25, -1.2, 0.2, 1], [x1 - 0.2, 1.9, -0.1, 2], [x0 + 0.45, z1 - 0.15, 1.4, 1]]) {
      for (let i = 0; i < n; i++) {
        const b3 = box(-0.12, 0.12, 0, 0.055, -0.06, 0.06, brick, off);
        b3.position.set(bx + i * 0.02, K.height + 0.1 + i * 0.055, bz + i * 0.03);
        b3.rotation.y = ry + i * 0.3;
        group.add(b3);
      }
    }
  }

  // 门：本色旧木板门，开着；门外一块水泥台阶
  group.add(woodDoor({ axis: 'z', at: xe, center: K.door.z, width: K.door.width, bottom: K.floor, height: K.door.height, thickness: K.wall, out: +1, leaves: 1, openDeg: 100, style: 'plank' }));
  group.add(box(x1, x1 + 0.32, 0, 0.06, K.door.z - 0.55, K.door.z + 0.55, mat('concrete'), off));
  // 窗：本色旧木框田字格，蒙着一层发黄起皱的塑料布
  for (const w of K.windows) {
    group.add(woodWindow({ axis: 'z', at: xe, center: w.z, width: w.width, bottom: K.floor + w.sill, height: w.height, style: 'plain' }));
    const film = new THREE.Mesh(new THREE.PlaneGeometry(w.width - 0.08, w.height - 0.08), new THREE.MeshStandardMaterial({ map: filmTex(), transparent: true, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    film.rotation.y = Math.PI / 2;
    film.position.set(xe + 0.02, K.floor + w.sill + w.height / 2, w.z);
    film.userData.noAO = true;
    group.add(film);
    // 窗台：一皮砖挑出来
    group.add(box(x1 - 0.02, x1 + 0.06, K.floor + w.sill - 0.06, K.floor + w.sill, w.z - w.width / 2 - 0.06, w.z + w.width / 2 + 0.06, brick, off));
  }

  // 墙上剩下的一块块泥灰皮 + 檐下熏黑：每个立面一整张透明贴花（门窗洞挖空）
  {
    const P = K.outside.plaster;
    const Hh = K.height;
    const deco = (tex, w, rotY, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, Hh), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.y = rotY;
      m.position.set(x, Hh / 2, z);
      m.receiveShadow = true;
      m.userData.noAO = true;
      group.add(m);
    };
    // 东立面：从外面看左边是南（z1），a = z1 - z
    const eHoles = east.map((o) => ({ a0: z1 - (o.center + o.width / 2), a1: z1 - (o.center - o.width / 2), y0: o.bottom, y1: o.top }));
    deco(remnantPlasterTex(z1 - z0, Hh, P.e.map((q) => ({ a0: z1 - q.z1, a1: z1 - q.z0, y0: q.y0, y1: q.y1 })), eHoles, 1), z1 - z0, Math.PI / 2, x1 + 0.004, (z0 + z1) / 2);
    // 南立面：左边是西，a = x - x0
    deco(remnantPlasterTex(x1 - x0, Hh, P.s.map((q) => ({ a0: q.x0 - x0, a1: q.x1 - x0, y0: q.y0, y1: q.y1 })), [], 2), x1 - x0, 0, (x0 + x1) / 2, z1 + 0.004);
    // 北立面：左边是东，a = x1 - x
    deco(remnantPlasterTex(x1 - x0, Hh, P.n.map((q) => ({ a0: x1 - q.x1, a1: x1 - q.x0, y0: q.y0, y1: q.y1 })), [], 3), x1 - x0, Math.PI, (x0 + x1) / 2, z0 - 0.004);
  }

  // 墙根污渍：东立面、南立面
  const stain = stainMat();
  group.add(baseStain(stain, { axis: 'z', from: z0, to: z1, at: x1, face: 'e', height: 0.7 }));
  group.add(baseStain(stain, { axis: 'x', from: x0, to: x1, at: z1, face: 's', height: 0.7 }));

  // 墙上挂的、靠的：圆筛子、一串红辣椒、扫帚、墙角一堆玉米秸
  group.add(outsideThings());

  group.add(createWoodpile(inner)); // 灶台、风箱、黄泥内墙在 src/interiors/kitchen.js

  // 烟囱：西北角从屋顶伸出去，旧砖砌的，顶上一截熏黑
  const c = K.chimney;
  const half = c.size / 2;
  group.add(box(c.x - half, c.x + half, K.floor, c.top - 0.5, c.z - half, c.z + half, brick));
  group.add(box(c.x - half, c.x + half, c.top - 0.5, c.top, c.z - half, c.z + half, mat('brickOldSoot')));
  group.add(box(c.x - half - 0.04, c.x + half + 0.04, c.top - 0.12, c.top - 0.06, c.z - half - 0.04, c.z + half + 0.04, mat('brickOldSoot'), { solid: false }));

  const anchor = new THREE.Object3D();
  anchor.name = 'interior-anchor-kitchen';
  anchor.position.set(inner.x0, K.floor, inner.z0);
  anchor.userData = { room: 'kitchen', size: { w: inner.x1 - inner.x0, d: inner.z1 - inner.z0, h: K.height - 0.15 - K.floor } };
  group.add(anchor);
  return group;
}

/** 柴火堆：西南墙角横七竖八的树枝、劈柴，外加一捆斜靠墙的玉米秸 */
function createWoodpile(inner) {
  const g = new THREE.Group();
  g.name = 'woodpile';
  const r = rng(77);
  const x0 = inner.x0 + 0.05;
  const x1 = inner.x0 + 1.0;
  const z0 = inner.z1 - 0.9;
  const z1 = inner.z1 - 0.05;
  const wood = mat('rawWood');
  const n = 60;
  const geo = new THREE.CylinderGeometry(1, 1, 1, 7);
  const mesh = new THREE.InstancedMesh(geo, wood, n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const rad = 0.015 + r() * 0.04;
    const len = 0.5 + r() * 0.5;
    const layer = Math.floor(i / 12);
    const p = new THREE.Vector3(x0 + 0.1 + r() * (x1 - x0 - 0.2), K.floor + rad + layer * 0.07 + r() * 0.03, z0 + 0.1 + r() * (z1 - z0 - 0.2));
    q.setFromEuler(new THREE.Euler(Math.PI / 2 + (r() - 0.5) * 0.4, (r() - 0.5) * 1.2, (r() - 0.5) * 0.3));
    m4.compose(p, q, new THREE.Vector3(rad, len, rad));
    mesh.setMatrixAt(i, m4);
  }
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  // 玉米秸：一束细长杆，斜靠南墙
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0xb9a26a, roughness: 1 });
  const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 1.7, 5), stalkMat, 40);
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Vector3(x1 + 0.1 + r() * 0.5, K.floor + 0.8, z1 - 0.12 - r() * 0.12);
    q.setFromEuler(new THREE.Euler(-0.35 + (r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.12));
    m4.compose(p, q, new THREE.Vector3(1, 1, 1));
    stalks.setMatrixAt(i, m4);
  }
  stalks.castShadow = true;
  g.add(stalks);
  // 柴火堆整体作为一个碰撞块
  const blocker = box(x0, x1, K.floor, K.floor + 0.6, z0, z1, new THREE.MeshBasicMaterial({ visible: false }), { shadow: false });
  g.add(blocker);
  return g;
}

/* ---------- 外观用的贴图和小物件 ---------- */
/** 水泥顶板的边：发灰发黑、雨水冲出来的道道、一点青苔；透明边（贴在板边外侧） */
function slabEdgeTex() {
  return canvasTex(256, 16, (g, w, h) => {
    const r = rng(331);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r() > 0.6 ? `rgba(70,78,52,${0.2 + r() * 0.25})` : `rgba(38,34,30,${0.15 + r() * 0.25})`;
      g.fillRect(r() * w, r() * h * 0.5, 2 + r() * 14, 2 + r() * h);
    }
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(40,36,30,0)');
    gr.addColorStop(1, 'rgba(40,36,30,0.45)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, { repeat: [3, 1] });
}

/** 玉米棒子上的一粒粒玉米 */
function cobTex() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#a8701a';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      for (let x = 0; x < w; x += 7) {
        g.fillStyle = (x + y) % 3 ? '#e8b440' : '#dca232';
        g.beginPath();
        g.ellipse(x + 3.5 + (y % 12 ? 3 : 0), y + 3, 3, 2.6, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

/** 一筐玉米棒子：柳条筐（原点在筐底中心），不带碰撞体 */
export function cornBasket(seed = 419) {
  const g = new THREE.Group();
  const prof = [[0.2, 0], [0.24, 0.02], [0.27, 0.24], [0.28, 0.26]].map(([a, b]) => new THREE.Vector2(a, b));
  const basket = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshStandardMaterial({ map: weaveTex([168, 136, 90], 3), roughness: 1, side: THREE.DoubleSide }));
  basket.castShadow = true;
  g.add(basket);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20).rotateX(-Math.PI / 2), basket.material);
  bottom.position.y = 0.01;
  g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 5, 28).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a7a4e, roughness: 1 }));
  rim.position.y = 0.26;
  g.add(rim);
  const r = rng(seed);
  const n = 22;
  const cob = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.13, 4, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ map: cobTex(), roughness: 0.6 }), n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 0.17;
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.4));
    m4.compose(new THREE.Vector3(Math.cos(a) * d, 0.2 + Math.floor(i / 8) * 0.05 + r() * 0.03, Math.sin(a) * d), q, new THREE.Vector3(1, 1, 1));
    cob.setMatrixAt(i, m4);
  }
  cob.castShadow = true;
  g.add(cob);
  return g;
}

/** 窗上蒙的塑料布：发黄、半透明、起皱 */
function filmTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(347);
    g.fillStyle = 'rgba(232,226,206,0.72)';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? '255,255,250' : '150,140,120'},${0.15 + r() * 0.2})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      const x = r() * w;
      g.moveTo(x, 0);
      g.quadraticCurveTo(x + (r() - 0.5) * 40, h / 2, x + (r() - 0.5) * 30, h);
      g.stroke();
    }
  });
}

/** 编的东西（筛子、筐）：交叉的篾条 */
export function weaveTex(base = [176, 140, 88], seed = 1) {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(353 + seed);
    g.fillStyle = `rgb(${base[0] * 0.7},${base[1] * 0.7},${base[2] * 0.7})`;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const k = 0.85 + r() * 0.25;
        g.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`;
        if (((x + y) / 8) % 2) g.fillRect(x, y + 1, 8, 6);
        else g.fillRect(x + 1, y, 6, 8);
      }
    }
  });
}

/** 圆筛子：一圈木边 + 编的底，挂在钉子上 */
export function roundSieve(radius = 0.28) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.02, 32).rotateX(Math.PI / 2), [
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: weaveTex([180, 146, 96], 1), roughness: 1 }),
    new THREE.MeshStandardMaterial({ map: weaveTex([160, 128, 84], 2), roughness: 1 }),
  ]);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 6, 32), new THREE.MeshStandardMaterial({ color: 0x9a7a4e, roughness: 0.9 }));
  face.castShadow = rim.castShadow = true;
  g.add(face, rim);
  return g;
}

/** 一串晒干的红辣椒：一根绳上密密地串着，往下变细 */
export function chiliString(len = 0.6) {
  const g = new THREE.Group();
  const r = rng(359);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, len + 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x9a8a6a }));
  rope.position.y = -len / 2 + 0.05;
  g.add(rope);
  const geo = new THREE.ConeGeometry(0.012, 0.1, 6);
  const mats = [0x9a1a14, 0xb0241a, 0x7a1410].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
  const n = 46;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const m = new THREE.Mesh(geo, mats[i % 3]);
    const a = r() * Math.PI * 2;
    const rad = 0.035 * (1 - t * 0.6);
    m.position.set(Math.cos(a) * rad, -t * len, Math.sin(a) * rad);
    m.rotation.set(Math.PI + (r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8 + Math.cos(a) * 0.6);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

/** 外墙上挂的、靠着的东西 */
function outsideThings() {
  const g = new THREE.Group();
  const O = K.outside;
  const xw = K.rect.x1;
  // 圆筛子
  const sieve = roundSieve(0.28);
  sieve.rotation.y = Math.PI / 2;
  sieve.rotation.x = 0.05;
  sieve.position.set(xw + 0.04, O.sieve.y, O.sieve.z);
  g.add(sieve);
  // 一串红辣椒
  const chili = chiliString(0.6);
  chili.position.set(xw + 0.05, O.chili.y, O.chili.z);
  g.add(chili);
  // 扫帚：一把细枝扎的，斜靠墙
  {
    const r = rng(367);
    const broom = new THREE.Group();
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xa88a5a, roughness: 1 });
    const n = 50;
    const twig = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.004, 1, 3), stickMat, n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const spread = r();
      const len = 0.9 + r() * 0.35;
      q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.25 * spread, 0, (r() - 0.5) * 0.25 * spread));
      m4.compose(new THREE.Vector3((r() - 0.5) * 0.04, len / 2, (r() - 0.5) * 0.04), q, new THREE.Vector3(1, len, 1));
      twig.setMatrixAt(i, m4);
    }
    twig.castShadow = true;
    broom.add(twig);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a5a40 }));
    tie.position.y = 0.95;
    broom.add(tie);
    broom.position.set(xw + 0.25, 0, O.broom.z);
    broom.rotation.z = 0.22;
    g.add(broom);
  }
  const hide = new THREE.MeshBasicMaterial({ visible: false });
  // 窗下一个小黑釉坛子、一口盖着布的大瓦缸
  {
    const jar = createWaterVat({ height: 0.42, rimRadius: 0.1, bellyRadius: 0.17, baseRadius: 0.12, x: xw + 0.24, z: O.jar.z }, { leanLid: false });
    jar.children.slice(2).forEach((c) => (c.visible = false));
    g.add(jar);
    const crock = createWaterVat({ height: 0.78, rimRadius: 0.22, bellyRadius: 0.3, baseRadius: 0.2, x: xw + 0.36, z: O.crock.z }, { leanLid: false });
    crock.children.slice(2).forEach((c) => (c.visible = false));
    const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 6, 0, Math.PI * 2, 0, 1.15), new THREE.MeshStandardMaterial({ color: 0xc9bc9c, roughness: 1, side: THREE.DoubleSide }));
    cloth.scale.set(1, 0.3, 1);
    cloth.position.y = 0.74;
    crock.add(cloth);
    g.add(crock);
    g.add(box(xw, xw + 0.66, 0, 0.75, O.crock.z - 0.3, O.crock.z + 0.3, hide));
  }
  // 东南角码起来的劈柴（截面朝外），斜靠一架木梯子
  {
    const W2 = O.woodpile;
    const r = rng(379);
    const wood = mat('rawWood');
    const endMat = new THREE.MeshStandardMaterial({ color: 0xb08a5c, roughness: 1 });
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8).rotateZ(Math.PI / 2);
    const rows = 7;
    const cols = 5;
    const n = rows * cols;
    const logs = new THREE.InstancedMesh(geo, [wood, endMat, endMat], n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let i = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const rad = 0.04 + r() * 0.02;
        const zc = W2.z0 + 0.05 + (col + (row % 2) * 0.5) * ((W2.z1 - W2.z0 - 0.1) / cols);
        q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.1, (r() - 0.5) * 0.15, 0));
        m4.compose(new THREE.Vector3(xw + W2.depth / 2 + (r() - 0.5) * 0.05, 0.05 + row * 0.1, Math.min(zc, W2.z1 - 0.05)), q, new THREE.Vector3(W2.depth / 2 + r() * 0.05, rad, rad));
        logs.setMatrixAt(i++, m4);
      }
    }
    logs.castShadow = logs.receiveShadow = true;
    g.add(logs);
    // 梯子：两根立杆 + 几根横撑，靠在柴火垛和墙上
    const ladder = new THREE.Group();
    const pole = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.9, 6), pole);
      p.position.set(0, 0.95, s * 0.19);
      p.castShadow = true;
      ladder.add(p);
    }
    for (let k = 0; k < 6; k++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 5).rotateX(Math.PI / 2), pole);
      rung.position.y = 0.25 + k * 0.28;
      ladder.add(rung);
    }
    ladder.position.set(xw + W2.depth + 0.45, 0, (W2.z0 + W2.z1) / 2 + 0.05);
    ladder.rotation.z = 0.24;
    g.add(ladder);
    g.add(box(xw, xw + W2.depth + 0.05, 0, W2.height, W2.z0, W2.z1, hide));
  }
  // 门北边一筐玉米棒子
  {
    const basket = cornBasket(431);
    basket.position.set(O.cornBasket.x, 0, O.cornBasket.z);
    g.add(basket);
    g.add(box(O.cornBasket.x - 0.25, O.cornBasket.x + 0.25, 0, 0.3, O.cornBasket.z - 0.25, O.cornBasket.z + 0.25, hide));
  }
  // 东北角一堆玉米秸：横七竖八躺着，带干叶子
  {
    const r = rng(373);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0xc2aa72, roughness: 1 });
    const n = 30;
    const st = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 5), stalkMat, n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const len = 1.0 + r() * 0.8;
      q.setFromEuler(new THREE.Euler(Math.PI / 2 + (r() - 0.5) * 0.3, (r() - 0.5) * 0.9, (r() - 0.5) * 0.3));
      m4.compose(new THREE.Vector3(O.stalks.x + (r() - 0.5) * 0.4, 0.02 + r() * 0.15, O.stalks.z + (r() - 0.5) * 0.3), q, new THREE.Vector3(1, len, 1));
      st.setMatrixAt(i, m4);
    }
    st.castShadow = st.receiveShadow = true;
    g.add(st);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xcdb27a, roughness: 1, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5), leafMat);
      leaf.position.set(O.stalks.x + (r() - 0.5) * 0.6, 0.08 + r() * 0.1, O.stalks.z + (r() - 0.5) * 0.5);
      leaf.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.6, r() * Math.PI, 0);
      g.add(leaf);
    }
  }
  return g;
}
