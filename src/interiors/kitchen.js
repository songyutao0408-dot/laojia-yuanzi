import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';
import { wallWithOpenings } from '../buildings/wall.js';
import { canvasTex, rng, seamlessBlob } from './common.js';

/**
 * 厨房室内（第 14 轮，按用户照片；挂在 interior-anchor-kitchen 上，原点 = 室内西北角、地坪面，+x 东、+z 南）：
 * - 内墙是黄泥抹的：土黄色、夹着麦秸、一道道裂纹；灶台上方的西墙、北墙被烟熏出一大片黑
 * - 灶台：泥和水泥抹的方墩子，边角磕掉了，顶上嵌一口大铁锅；正面一个烧火的灶膛口（里面烧着几根柴），下面一个掏灰的小口
 * - 风箱：顺着灶台南侧放在地上的木箱子，刷过的红漆掉得斑斑驳驳，铁皮包角；东头两根拉杆连着一个把手
 *   互动：拉一下风箱——往外拉，火小一点；往里推，进风，灶膛里的火呼地旺起来，屋里的火光跟着一明一暗
 * 布局里的坐标是世界坐标（layout.KITCHEN），这里换算成室内坐标。
 */
const S = K.stove;
const B = K.bellows;
const OX = K.rect.x0 + K.wall; // 室内原点（世界）
const OZ = K.rect.z0 + K.wall;
const W = K.rect.x1 - K.rect.x0 - 2 * K.wall;
const D = K.rect.z1 - K.rect.z0 - 2 * K.wall;
const H = K.height - 0.15 - K.floor;
const T = 0.015; // 泥层厚

/* ---------- 贴图 ---------- */
/** 黄泥墙：土黄、深浅不匀，夹着一截截麦秸，有裂纹，抹子印；1 张 = 1.5 m */
function mudTex() {
  return canvasTex(
    512,
    512,
    (g, w, h) => {
      const r = rng(301);
      g.fillStyle = '#b88a58';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        const c = ['150,108,64', '206,164,112', '128,92,58', '190,140,90'][Math.floor(r() * 4)];
        seamlessBlob(g, w, h, r() * w, r() * h, 20 + r() * 90, c, 0.12 + r() * 0.18);
      }
      // 麦秸
      for (let i = 0; i < 260; i++) {
        const x = r() * w;
        const y = r() * h;
        const a = r() * Math.PI;
        const l = 4 + r() * 12;
        g.strokeStyle = `rgba(${r() > 0.5 ? '226,196,130' : '170,134,80'},${0.5 + r() * 0.4})`;
        g.lineWidth = 1 + r();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
      // 裂纹：弯弯曲曲往外分叉
      const crack = (x, y, a, len, wd) => {
        g.strokeStyle = `rgba(60,40,22,${0.55})`;
        g.lineWidth = wd;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < len; k++) {
          a += (r() - 0.5) * 0.7;
          x += Math.cos(a) * 6;
          y += Math.sin(a) * 6;
          g.lineTo(x, y);
          if (r() < 0.08 && wd > 0.8) crack(x, y, a + (r() - 0.5) * 2, len / 2, wd * 0.6);
        }
        g.stroke();
      };
      for (let i = 0; i < 7; i++) crack(40 + r() * (w - 80), 40 + r() * (h - 80), r() * Math.PI * 2, 10 + r() * 20, 1.6);
      // 抹子印、细颗粒
      for (let i = 0; i < 30; i++) {
        g.strokeStyle = `rgba(${r() > 0.5 ? '220,180,130' : '120,86,52'},0.1)`;
        g.lineWidth = 4 + r() * 6;
        g.beginPath();
        g.arc(r() * w, r() * h, 60 + r() * 80, r() * 6, r() * 6 + 0.8);
        g.stroke();
      }
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(80,56,32,0.18)' : 'rgba(240,210,160,0.12)';
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    },
    { repeat: [1 / 1.5, 1 / 1.5] },
  );
}

/** 灶台抹面：灰黄的泥灰，磕得坑坑洼洼，上半截被烟熏黑；1 张 = 1 m */
function stoveTex() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(307);
      g.fillStyle = '#a2958a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 40, r() > 0.5 ? '120,110,100' : '186,176,160', 0.2 + r() * 0.2);
      for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 3 + r() * 8, '90,80,70', 0.45);
      for (let i = 0; i < 1200; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(60,52,46,0.2)' : 'rgba(230,220,206,0.15)';
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    },
    { repeat: [1, 1] },
  );
}

/** 烟熏的一大片黑：下窄上宽，往上越来越黑，边上发散 */
function sootTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(311);
    for (let k = 0; k < 9; k++) {
      const y = h * (1 - k / 9);
      const rad = w * (0.12 + k * 0.05);
      const gr = g.createRadialGradient(w / 2 + (r() - 0.5) * 20, y, 0, w / 2, y, rad);
      gr.addColorStop(0, `rgba(14,10,8,${0.35 + k * 0.05})`);
      gr.addColorStop(1, 'rgba(14,10,8,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(10,8,6,${0.05 + r() * 0.1})`;
      g.fillRect(w * 0.25 + r() * w * 0.5, r() * h * 0.9, 1 + r() * 3, 6 + r() * 20);
    }
  });
}

/** 火苗：下面亮黄发白、往上变橙、尖上透明 */
function flameTex() {
  return canvasTex(64, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.78, 2, w / 2, h * 0.6, h * 0.55);
    gr.addColorStop(0, 'rgba(255,250,220,1)');
    gr.addColorStop(0.25, 'rgba(255,200,90,0.95)');
    gr.addColorStop(0.55, 'rgba(240,110,30,0.6)');
    gr.addColorStop(1, 'rgba(200,50,10,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(w / 2, 4);
    g.quadraticCurveTo(w * 0.95, h * 0.6, w * 0.7, h);
    g.lineTo(w * 0.3, h);
    g.quadraticCurveTo(w * 0.05, h * 0.6, w / 2, 4);
    g.fill();
  });
}

/** 炭火：暗红里透着亮橙的一块块 */
function emberTex() {
  return canvasTex(128, 64, (g, w, h) => {
    const r = rng(313);
    g.fillStyle = '#3a0c04';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = r() > 0.4 ? `rgba(255,${120 + r() * 90},30,${0.5 + r() * 0.5})` : 'rgba(30,20,16,0.8)';
      g.beginPath();
      g.arc(r() * w, r() * h, 2 + r() * 6, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/* ---------- 风箱的声音 ---------- */
let audioCtx = null;
/** push = true：往里推的“呼——”一声；false：往外拉的轻一点的“嗒” */
function bellowsSound(push) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const len = push ? 0.45 : 0.25;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const k = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * k) * (push ? 0.9 : 0.35);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = push ? 520 : 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    src.connect(f).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    /* 没有声音也不影响 */
  }
}

export function createKitchenInterior() {
  const group = new THREE.Group();
  group.name = 'interior-kitchen';
  const L = (x, z) => [x - OX, z - OZ]; // 世界 → 室内
  const mud = new THREE.MeshStandardMaterial({ map: mudTex(), roughness: 1 });
  const off = { solid: false };

  // —— 黄泥内墙 ——
  const doorZ = K.door.z - OZ;
  const ops = [
    { center: doorZ, width: K.door.width, bottom: 0, top: K.door.height },
    ...K.windows.map((w) => ({ center: w.z - OZ, width: w.width, bottom: w.sill, top: w.sill + w.height })),
  ];
  const coat = (o) => group.add(wallWithOpenings({ ...o, thickness: T, y0: 0, y1: H, solid: false }, { wall: mud }));
  coat({ axis: 'x', from: 0, to: W, at: T / 2 });
  coat({ axis: 'x', from: 0, to: W, at: D - T / 2 });
  coat({ axis: 'z', from: T, to: D - T, at: T / 2 });
  coat({ axis: 'z', from: T, to: D - T, at: W - T / 2, openings: ops });
  // 门窗洞口里侧也抹泥
  for (const o of ops) {
    const a0 = o.center - o.width / 2;
    const a1 = o.center + o.width / 2;
    group.add(box(W, W + 0.11, o.bottom, o.top, a0, a0 + T, mud, off));
    group.add(box(W, W + 0.11, o.bottom, o.top, a1 - T, a1, mud, off));
    group.add(box(W, W + 0.11, o.top - T, o.top, a0, a1, mud, off));
  }
  // 烟囱从灶台上去的那一截也抹泥
  {
    const c = K.chimney;
    const [cx, cz] = L(c.x, c.z);
    const h = c.size / 2;
    group.add(box(cx - h - T, cx + h + T, S.height, H, cz - h - T, cz + h + T, mud, off));
  }

  // —— 灶台 ——
  const [sx0, sz0] = L(S.x0, S.z0);
  const [sx1, sz1] = L(S.x1, S.z1);
  const top = S.height;
  const cz = sz1 - S.wokFromSouth; // 锅心、灶膛口的 z
  const wx = (sx0 + sx1) / 2; // 锅心 x
  const plaster = new THREE.MeshStandardMaterial({ map: stoveTex(), roughness: 1 });
  const mouth = { z0: cz - 0.15, z1: cz + 0.15, y0: 0.17, y1: 0.43, depth: 0.42 }; // 灶膛口
  const fx = sx1 - mouth.depth; // 灶膛最里头
  const R = 0.36; // 锅口半径
  // 后半截整块；前半截围着灶膛口砌
  group.add(box(sx0, fx, 0, top - 0.07, sz0, sz1, plaster));
  group.add(box(fx, sx1, 0, top - 0.07, sz0, mouth.z0, plaster));
  group.add(box(fx, sx1, 0, top - 0.07, mouth.z1, sz1, plaster));
  group.add(box(fx, sx1, 0, mouth.y0, mouth.z0, mouth.z1, plaster));
  group.add(box(fx, sx1, mouth.y1, top - 0.07, mouth.z0, mouth.z1, plaster));
  // 灶面：一圈厚边，往外挑一点，中间留锅口
  const t0 = top - 0.07;
  const lip = 0.03;
  group.add(box(sx0, sx1 + lip, t0, top, sz0, cz - R, plaster, off));
  group.add(box(sx0, sx1 + lip, t0, top, cz + R, sz1 + lip, plaster, off));
  group.add(box(sx0, wx - R, t0, top, cz - R, cz + R, plaster, off));
  group.add(box(wx + R, sx1 + lip, t0, top, cz - R, cz + R, plaster, off));
  // 灶膛里面：烧黑的内壁（只看得见里面那几面）
  const inside = new THREE.Mesh(
    new THREE.BoxGeometry(mouth.depth - 0.01, mouth.y1 - mouth.y0 - 0.01, mouth.z1 - mouth.z0 - 0.01), // 比洞口小一圈，免得和灶体的面打架
    new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 1, side: THREE.BackSide }),
  );
  inside.position.set(fx + mouth.depth / 2 + 0.002, (mouth.y0 + mouth.y1) / 2, cz);
  group.add(inside);
  // 灶膛口一圈、掏灰口：熏得发黑
  const soot = new THREE.MeshStandardMaterial({ map: sootTex(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const mouthSoot = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), soot);
  mouthSoot.rotation.y = Math.PI / 2;
  mouthSoot.position.set(sx1 + 0.002, mouth.y1 + 0.12, cz);
  mouthSoot.userData.noAO = true;
  group.add(mouthSoot);
  const ash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.09), new THREE.MeshBasicMaterial({ color: 0x0c0907 }));
  ash.rotation.y = Math.PI / 2;
  ash.position.set(sx1 + 0.003, 0.07, cz);
  group.add(ash);
  // 灶前地上一摊灰
  const ashPile = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 }));
  ashPile.scale.set(1.2, 1, 0.8);
  ashPile.position.set(sx1 + 0.22, 0.004, cz);
  group.add(ashPile);
  // 大铁锅（带两个铁耳）
  {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.sin(a) * R, -Math.cos(a) * 0.22));
    }
    pts.push(new THREE.Vector2(R + 0.025, 0.006));
    const wok = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat('wok'));
    wok.material.side = THREE.DoubleSide;
    wok.position.set(wx, top, cz);
    wok.receiveShadow = true;
    group.add(wok);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 12, Math.PI), mat('wok'));
      ear.position.set(wx, top + 0.01, cz + s * (R + 0.03));
      ear.rotation.y = s > 0 ? 0 : Math.PI;
      group.add(ear);
    }
  }
  // 灶台上方西墙、北墙熏黑的一大片
  {
    const west = new THREE.Mesh(new THREE.PlaneGeometry(sz1 - sz0 + 0.8, H - top + 0.2), soot);
    west.rotation.y = Math.PI / 2;
    west.position.set(T + 0.003, top + (H - top) / 2 - 0.1, (sz0 + sz1) / 2 + 0.2);
    west.userData.noAO = true;
    group.add(west);
    const north = new THREE.Mesh(new THREE.PlaneGeometry(sx1 - sx0 + 0.6, H - top + 0.2), soot);
    north.position.set((sx0 + sx1) / 2, top + (H - top) / 2 - 0.1, T + 0.003);
    north.userData.noAO = true;
    group.add(north);
  }

  // —— 灶膛里的火：几根柴、一层炭火、几簇火苗、一盏橙色的点光 ——
  const fire = new THREE.Group();
  group.add(fire);
  const ember = new THREE.Mesh(new THREE.BoxGeometry(mouth.depth - 0.06, 0.03, mouth.z1 - mouth.z0 - 0.04), new THREE.MeshBasicMaterial({ map: emberTex(), color: 0xffffff }));
  ember.position.set(fx + mouth.depth / 2, mouth.y0 + 0.015, cz);
  fire.add(ember);
  const logMat = mat('rawWood');
  const charMat = new THREE.MeshBasicMaterial({ color: 0xff7a26 });
  const r0 = rng(317);
  for (let i = 0; i < 3; i++) {
    const len = 0.5 + r0() * 0.15;
    const log = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, len, 7).rotateZ(Math.PI / 2), logMat);
    stick.castShadow = true;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 7).rotateZ(Math.PI / 2), charMat);
    tip.position.x = -len / 2 + 0.03;
    log.add(stick, tip);
    log.position.set(sx1 - 0.12 + len / 2 - 0.18, mouth.y0 + 0.04 + i * 0.02, cz + (i - 1) * 0.07);
    log.rotation.set(0, (r0() - 0.5) * 0.3, -0.08 - r0() * 0.1);
    fire.add(log);
  }
  const ftex = flameTex();
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.24).translate(0, 0.12, 0),
      new THREE.MeshBasicMaterial({ map: ftex, color: new THREE.Color(1.8, 1.5, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    m.position.set(fx + 0.1 + (i % 3) * 0.08, mouth.y0 + 0.03, cz + (i - 2) * 0.05);
    m.rotation.y = Math.PI / 2 + (i - 2) * 0.35;
    m.userData.noAO = true;
    m.userData.phase = i * 1.7;
    flames.push(m);
    fire.add(m);
  }
  const fireLight = new THREE.PointLight(0xff8a3a, 1.5, 2.4, 2); // 只照灶前一小片，照不到墙外
  fireLight.position.set(sx1 + 0.08, mouth.y0 + 0.15, cz);
  group.add(fireLight);

  // —— 风箱：顺着灶台南侧放在地上 ——
  const bx0 = B.x0 - OX;
  const bx1 = B.x1 - OX;
  const bz0 = sz1 + 0.02;
  const bz1 = bz0 + B.width;
  const bm = (bz0 + bz1) / 2;
  const red = mat('wood'); // 红漆掉得斑斑驳驳的旧木头
  const raw = mat('oldWood');
  const iron = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.7, metalness: 0.5 });
  group.add(box(bx0, bx1, 0.03, B.height, bz0, bz1, red)); // 箱体（挡人）
  group.add(box(bx0 - 0.01, bx1 + 0.01, 0, 0.03, bz0 - 0.01, bz1 + 0.01, raw, off)); // 底下垫的木条
  // 盖板：两块木板，中间一道压条，两头挑出来
  group.add(box(bx0 - 0.02, bx1 + 0.05, B.height, B.height + 0.025, bz0 - 0.015, bz1 + 0.015, red, off));
  group.add(box((bx0 + bx1) / 2 - 0.02, (bx0 + bx1) / 2 + 0.02, B.height + 0.025, B.height + 0.04, bz0 - 0.015, bz1 + 0.015, raw, off));
  group.add(box(bx1 - 0.04, bx1 + 0.06, B.height + 0.025, B.height + 0.05, bz0 - 0.02, bz1 + 0.02, raw, off));
  // 铁皮包角
  for (const x of [bx0, bx1 - 0.05]) for (const z of [bz0 - 0.004, bz1 - 0.04]) {
    group.add(box(x, x + 0.05, 0.03, 0.09, z, z + 0.044, iron, off));
    group.add(box(x, x + 0.05, B.height - 0.06, B.height, z, z + 0.044, iron, off));
  }
  // 东头：两块竖的导木、下面一个进风口
  for (const s of [-1, 1]) group.add(box(bx1, bx1 + 0.025, 0.22, 0.5, bm + s * 0.06 - 0.02, bm + s * 0.06 + 0.02, raw, off));
  const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.09), new THREE.MeshBasicMaterial({ color: 0x0c0806 }));
  vent.rotation.y = Math.PI / 2;
  vent.position.set(bx1 + 0.002, 0.13, bm);
  group.add(vent);
  // 拉杆 + 把手：整体沿 x 移动（out = 0 推到底，out = stroke 拉到头）
  const handle = new THREE.Group();
  handle.name = 'bellows-handle';
  const rodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.5 });
  for (const y of [0.3, 0.42]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, B.stroke + 0.12, 8).rotateZ(Math.PI / 2), rodMat);
    rod.position.set(bx1 + 0.06 - B.stroke / 2, y, bm);
    rod.castShadow = true;
    handle.add(rod);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 10), rodMat);
  grip.position.set(bx1 + 0.12, 0.36, bm);
  grip.castShadow = true;
  handle.add(grip);
  group.add(handle);

  /* ---------- 风箱、火的动画 ---------- */
  let out = B.stroke * 0.3; // 把手现在拉出来多少
  let strokeT = -1; // 一下风箱的进度（0..1；-1 = 没在拉）
  let queued = 0;
  let boost = 0; // 推风箱攒下的火力，慢慢散掉
  const BASE = 0.35;
  const grab = new THREE.Vector3();
  let lastNow = performance.now();
  return {
    group,
    /** 拉一下风箱：先往外拉（火小一点），再往里推（进风，火旺）；拉的过程中再点会接着拉下一下 */
    pump() {
      if (strokeT >= 0) queued = Math.min(queued + 1, 3);
      else strokeT = 0;
    },
    get busy() {
      return strokeT >= 0;
    },
    /** 现在的火力（0..1.3），给测试和别的模块看 */
    get fire() {
      return Math.min(1.3, BASE + boost);
    },
    /** 把手的世界坐标 */
    handlePosition: (target = grab) => grip.getWorldPosition(target),
    /** 世界坐标 (x, z) 是否在厨房里 */
    inKitchen: (x, z) => x > OX && x < OX + W && z > OZ && z < OZ + D,
    update(dt, t) {
      // 按真实时间走（帧率低的时候，一下风箱也还是一秒多）
      const now = performance.now();
      dt = Math.min((now - lastNow) / 1000, 0.5);
      lastNow = now;
      if (strokeT >= 0) {
        const prev = strokeT;
        strokeT += dt / 1.1;
        const PULL = 0.42; // 前 42% 往外拉，后面往里推
        if (prev < PULL && strokeT >= PULL) bellowsSound(true);
        if (prev === 0) bellowsSound(false);
        if (strokeT < PULL) {
          out = B.stroke * Math.sin((strokeT / PULL) * (Math.PI / 2));
          boost = Math.max(0, boost - dt * 0.5); // 往外拉：火小一点
        } else {
          const k = (strokeT - PULL) / (1 - PULL);
          const prevOut = out;
          out = B.stroke * Math.cos(k * (Math.PI / 2));
          boost = Math.min(1, boost + (prevOut - out) * 4.5); // 往里推：进风，火呼地旺起来
        }
        if (strokeT >= 1) {
          out = 0;
          strokeT = queued > 0 ? 0 : -1;
          if (queued > 0) queued--;
        }
      } else {
        out += (B.stroke * 0.3 - out) * Math.min(1, dt * 0.5); // 松手慢慢回到半截
      }
      boost = Math.max(0, boost - dt * 0.22); // 火力慢慢散掉
      handle.position.x = out;
      // 火：大小、亮度随火力走，加上一点跳动
      const lv = BASE + boost;
      for (const f of flames) {
        const fl = 0.85 + 0.25 * Math.sin(t * 9 + f.userData.phase) + 0.15 * Math.sin(t * 23 + f.userData.phase * 2);
        f.scale.set(0.8 + lv * 0.4, Math.min(1.05, (0.5 + lv * 0.8) * fl), 1); // 高不过灶膛口
        f.material.opacity = Math.min(1, 0.6 + lv * 0.5);
      }
      ember.material.color.setScalar(0.55 + lv * 0.45 + Math.sin(t * 5) * 0.05);
      fireLight.intensity = (0.6 + lv * 2.6) * (0.9 + Math.random() * 0.2);
    },
  };
}
