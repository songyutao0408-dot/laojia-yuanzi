import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { box } from '../core/box.js';
import { rng } from '../textures/canvas.js';
import { mat, stainMat } from '../textures/index.js';
import { canvasTex, seamlessBlob } from '../interiors/common.js';
import { brickBox, baseStain } from './wall.js';
import { woodDoor, woodWindow } from './doorsWindows.js';

/**
 * 厨房：西侧北段的低矮平顶房，门窗开在东墙。第 15 轮按用户照片：外墙抹黄泥，到处是裂缝，
 * 几处泥皮掉了露出土坯；屋顶一圈往外挑的泥顶边，檐上压着碎砖；本色旧木门（开着）、田字格木窗蒙塑料布；
 * 墙上挂圆筛子、一串红辣椒，窗下靠一把扫帚，东北角一堆玉米秸。烟囱从西北角伸出屋顶，顶部熏黑；西南墙角堆着柴火。
 * 灶台、风箱、黄泥内墙在 src/interiors/kitchen.js，挂在 interior-anchor-kitchen 上。
 */
export function createKitchen() {
  const group = new THREE.Group();
  group.name = 'kitchen';
  const mudWall = new THREE.MeshStandardMaterial({ map: mudOutsideTex(), roughness: 1 });
  const mats = {
    wall: mudWall,
    floor: mat('kitchenFloor'),
    roof: mudWall,
    ceiling: mat('brickOldSoot'),
    trim: mudWall,
    coping: mudWall,
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

  // 屋顶：一圈往外挑的泥顶边，厚薄不匀；檐上压着几块碎砖
  {
    const r = rng(83);
    const e = 0.07;
    const segs = [
      [x0 - e, x1 + e, z0 - e, z0 + 0.25],
      [x0 - e, x1 + e, z1 - 0.25, z1 + e],
      [x0 - e, x0 + 0.25, z0, z1],
      [x1 - 0.25, x1 + e, z0, z1],
    ];
    for (const [a, b2, c2, d] of segs) {
      const n = 6;
      const alongX = b2 - a > d - c2;
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const y1 = K.height + 0.09 + (r() - 0.5) * 0.04;
        if (alongX) group.add(box(a + (b2 - a) * t0, a + (b2 - a) * t1, K.height - 0.02, y1, c2, d, mudWall, off));
        else group.add(box(a, b2, K.height - 0.02, y1, c2 + (d - c2) * t0, c2 + (d - c2) * t1, mudWall, off));
      }
    }
    const brick = mat('brickOld');
    for (const [bx, bz, ry] of [[x1 - 0.2, -1.2, 0.2], [x1 - 0.15, 1.9, -0.1], [x0 + 0.4, z1 - 0.12, 1.4]]) {
      const b3 = box(-0.12, 0.12, 0, 0.055, -0.06, 0.06, brick, off);
      b3.position.set(bx, K.height + 0.12, bz);
      b3.rotation.y = ry;
      group.add(b3);
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
    // 窗台：抹泥的一道小台
    group.add(box(x1 - 0.02, x1 + 0.06, K.floor + w.sill - 0.05, K.floor + w.sill, w.z - w.width / 2 - 0.06, w.z + w.width / 2 + 0.06, mudWall, off));
  }

  // 掉了泥皮、露出土坯的几块
  const adobe = new THREE.MeshStandardMaterial({ map: adobeTex(), transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const pt of K.outside.patches) {
    const w = pt.a1 - pt.a0;
    const h = pt.y1 - pt.y0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), adobe.clone());
    m.material.map = adobeTex(Math.round(pt.a0 * 100));
    if (pt.face === 'e') {
      m.rotation.y = Math.PI / 2;
      m.position.set(x1 + 0.004, pt.y0 + h / 2, (pt.a0 + pt.a1) / 2);
    } else {
      m.position.set((pt.a0 + pt.a1) / 2, pt.y0 + h / 2, z1 + 0.004);
    }
    m.receiveShadow = true;
    m.userData.noAO = true;
    group.add(m);
  }

  // 墙根污渍：东立面、南立面
  const stain = stainMat();
  group.add(baseStain(stain, { axis: 'z', from: z0, to: z1, at: x1, face: 'e', height: 0.7 }));
  group.add(baseStain(stain, { axis: 'x', from: x0, to: x1, at: z1, face: 's', height: 0.7 }));

  // 墙上挂的、靠的：圆筛子、一串红辣椒、扫帚、墙角一堆玉米秸
  group.add(outsideThings());

  group.add(createWoodpile(inner)); // 灶台、风箱、黄泥内墙在 src/interiors/kitchen.js

  // 烟囱：西北角从屋顶伸出去，外面也抹泥，顶上一截熏黑
  const c = K.chimney;
  const half = c.size / 2;
  group.add(box(c.x - half, c.x + half, K.floor, c.top - 0.5, c.z - half, c.z + half, mudWall));
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
/** 外墙抹的黄泥：土黄偏灰，一块块抹出来的接缝，弯弯曲曲的大裂缝，夹着麦秸；1 张 = 2 m */
function mudOutsideTex() {
  return canvasTex(
    512,
    512,
    (g, w, h) => {
      const r = rng(331);
      g.fillStyle = '#a48a6a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const c = ['136,114,88', '184,160,128', '120,100,78', '196,176,146'][Math.floor(r() * 4)];
        seamlessBlob(g, w, h, r() * w, r() * h, 20 + r() * 80, c, 0.12 + r() * 0.2);
      }
      for (let i = 0; i < 300; i++) {
        const x = r() * w;
        const y = r() * h;
        const a = r() * Math.PI;
        const l = 4 + r() * 10;
        g.strokeStyle = `rgba(${r() > 0.5 ? '214,192,140' : '150,124,84'},0.55)`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
      // 大裂缝：发暗、边上一道亮边（泥皮翘起来）
      const crack = (x, y, a, len, wd) => {
        let px = x;
        let py = y;
        const pts = [[px, py]];
        for (let k = 0; k < len; k++) {
          a += (r() - 0.5) * 0.8;
          px += Math.cos(a) * 7;
          py += Math.sin(a) * 7;
          pts.push([px, py]);
          if (r() < 0.07 && wd > 1) crack(px, py, a + (r() - 0.5) * 2.2, len / 2, wd * 0.6);
        }
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(230,214,186,0.5)';
        g.lineWidth = wd + 1.5;
        g.beginPath();
        pts.forEach(([qx, qy], i) => (i ? g.lineTo(qx + 1, qy + 1) : g.moveTo(qx + 1, qy + 1)));
        g.stroke();
        g.strokeStyle = 'rgba(46,32,20,0.8)';
        g.lineWidth = wd;
        g.beginPath();
        pts.forEach(([qx, qy], i) => (i ? g.lineTo(qx, qy) : g.moveTo(qx, qy)));
        g.stroke();
      };
      for (let i = 0; i < 9; i++) crack(30 + r() * (w - 60), 30 + r() * (h - 60), r() * Math.PI * 2, 12 + r() * 22, 2.2);
      for (let i = 0; i < 3000; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(70,54,36,0.2)' : 'rgba(236,220,190,0.15)';
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    },
    { repeat: [1 / 2, 1 / 2] },
  );
}

/** 泥皮掉了露出来的土坯：浅灰黄的大土坯块、泥缝，四周一圈不规则的泥皮断口（透明边） */
function adobeTex(seed = 1) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(337 + seed);
    // 不规则的轮廓
    g.save();
    g.beginPath();
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rx = w * (0.42 + r() * 0.08);
      const ry = h * (0.42 + r() * 0.08);
      const x = w / 2 + Math.cos(a) * rx;
      const y = h / 2 + Math.sin(a) * ry;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    g.clip();
    g.fillStyle = '#8a745a'; // 泥缝
    g.fillRect(0, 0, w, h);
    const bw = 76;
    const bh = 34;
    for (let row = 0; row * bh < h; row++) {
      for (let col = -1; col * bw < w; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0);
        const k = 0.88 + r() * 0.2;
        g.fillStyle = `rgb(${178 * k},${158 * k},${126 * k})`;
        g.fillRect(x + 3, row * bh + 3, bw - 6, bh - 6);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = 'rgba(120,98,70,0.35)';
          g.fillRect(x + 3 + r() * (bw - 10), row * bh + 3 + r() * (bh - 10), 3 + r() * 6, 2 + r() * 3);
        }
      }
    }
    g.restore();
    // 断口一圈发暗（显得泥皮有厚度）
    g.strokeStyle = 'rgba(60,44,28,0.6)';
    g.lineWidth = 5;
    g.globalCompositeOperation = 'source-atop';
    g.strokeRect(-2, -2, w + 4, h + 4);
  });
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
