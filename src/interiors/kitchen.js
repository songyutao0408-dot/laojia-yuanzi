import * as THREE from 'three';
import { KITCHEN as K } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';
import { wallWithOpenings } from '../buildings/wall.js';
import { canvasTex, rng, seamlessBlob, woodTex } from './common.js';
import { createWaterVat } from '../yard/waterVat.js';
import { roundSieve, weaveTex, chiliString } from '../buildings/kitchen.js';

/**
 * 厨房室内（第 14 轮，按用户照片；挂在 interior-anchor-kitchen 上，原点 = 室内西北角、地坪面，+x 东、+z 南）：
 * - 内墙是黄泥抹的：土黄色、夹着麦秸、一道道裂纹；灶台上方的西墙、北墙被烟熏出一大片黑
 * - 灶台：泥和水泥抹的方墩子，边角磕掉了，顶上嵌一口大铁锅；正面一个烧火的灶膛口（里面烧着几根柴），下面一个掏灰的小口
 * - 风箱：顺着灶台南侧放在地上的木箱子，旧旧的土黄色本色木头，铁皮包角；东头两根拉杆连着一个把手
 * - 第 15 轮照用户照片添的东西：窗下木架子（洋瓷盆、红暖水瓶、搪瓷缸子、盖布的咸菜缸、铝锅、碗），一袋面粉、一筐玉米棒子、
 *   一摞蜂窝煤、墙上挂的筛子、漏勺、一串红辣椒，灶前一个小板凳
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
  // 风箱木头：没刷漆的旧木板，土黄色，用得发暗发亮（第 15 轮用户：改成旧旧的土黄色）
  const red = new THREE.MeshStandardMaterial({ map: woodTex([170, 132, 80], { seed: 41, planks: 0.12 }), roughness: 0.75 });
  const raw = new THREE.MeshStandardMaterial({ map: woodTex([150, 116, 72], { seed: 43 }), roughness: 0.8 });
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

  // —— 照用户照片添的东西 ——
  group.add(kitchenThings(L));

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

/* ---------- 照用户照片添的东西 ---------- */
/** 洋瓷：白搪瓷上一簇簇红花绿叶 */
function enamelTex(seed) {
  return canvasTex(256, 128, (g, w, h) => {
    const r = rng(401 + seed);
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x = ((i + 0.5) / 6) * w;
      const y = h * (0.45 + (r() - 0.5) * 0.2);
      g.fillStyle = '#3f8a4a';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(x + s * 12, y + 6, 9, 3.5, s * 0.5, 0, Math.PI * 2);
        g.fill();
      }
      for (let k = 0; k < 3; k++) {
        g.fillStyle = ['#d02a34', '#e8505a', '#c01a28'][k];
        g.beginPath();
        g.arc(x + (k - 1) * 8, y - (k % 2) * 4, 6 - k, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}
/** 暖水瓶外壳：红漆铁皮，压着一圈花纹 */
function thermosTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b8282a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,220,180,0.5)';
    g.lineWidth = 2;
    for (let y = 20; y < h; y += 34) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.2) * 5);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,240,200,0.6)';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(10 + i * 22, 70, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, w, h);
  });
}
/** 面粉袋：白色编织袋，印着红字 */
function sackTex() {
  // 圆柱展开一圈：字印两遍（正反两面），哪个角度看都能看到
  return canvasTex(256, 192, (g, w, h) => {
    const r = rng(409);
    g.fillStyle = '#d6cebd';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = `rgba(150,140,120,${0.1 + r() * 0.08})`;
      g.fillRect(0, y, w, 1);
    }
    g.fillStyle = '#b8282e';
    g.textAlign = 'center';
    for (const cx of [w / 4, (3 * w) / 4]) {
      g.font = 'bold 34px "KaiTi", serif';
      g.fillText('面粉', cx, 88);
      g.font = 'bold 18px serif';
      g.fillText('25公斤', cx, 118);
    }
    for (let i = 0; i < 30; i++) seamlessBlob(g, w, h, r() * w, r() * h, 10 + r() * 24, '170,160,135', 0.25);
  });
}
/** 蜂窝煤：黑灰色，上面一圈圈小眼 */
function coalTopTex() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#2c2a28';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#0c0b0a';
    for (const [x, y] of [[32, 32], [32, 14], [32, 50], [16, 23], [48, 23], [16, 41], [48, 41], [22, 8], [42, 8], [22, 56], [42, 56], [8, 32], [56, 32]]) {
      g.beginPath();
      g.arc(x, y, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  });
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

function kitchenThings(L) {
  const g = new THREE.Group();
  const off = { solid: false };
  const enamelRim = new THREE.MeshStandardMaterial({ color: 0x23406e, roughness: 0.3 });
  const wood = new THREE.MeshStandardMaterial({ map: woodTex([138, 108, 72], { seed: 47 }), roughness: 0.85 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xb4b6b4, roughness: 0.35, metalness: 0.8 });
  const enamelBowl = (r0, r1, h, seed) => {
    const prof = [[r0 * 0.6, 0], [r0, 0.005], [r1 * 0.97, h * 0.92], [r1, h]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshStandardMaterial({ map: enamelTex(seed), roughness: 0.25, side: THREE.DoubleSide }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r1, 0.004, 4, 32).rotateX(Math.PI / 2), enamelRim);
    rim.position.y = h;
    const bot = new THREE.Mesh(new THREE.CircleGeometry(r0 * 0.6, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.25 }));
    bot.position.y = 0.002;
    const b = new THREE.Group();
    b.add(m, rim, bot);
    m.castShadow = true;
    return b;
  };

  // —— 窗下的木架子（两层） ——
  {
    const S = K.shelf;
    const [x1, z0] = L(S.x1, S.z0);
    const [, z1] = L(S.x1, S.z1);
    const x0 = x1 - S.depth;
    const H = S.height;
    for (const x of [x0, x1 - 0.04]) for (const z of [z0, z1 - 0.04]) g.add(box(x, x + 0.04, 0, H, z, z + 0.04, wood, off));
    g.add(box(x0 - 0.01, x1, H - 0.03, H, z0 - 0.02, z1 + 0.02, wood, off));
    g.add(box(x0, x1, 0.36, 0.385, z0, z1, wood, off));
    g.add(box(x0, x1, 0, H, z0, z1, new THREE.MeshBasicMaterial({ visible: false }))); // 挡人
    const xc = (x0 + x1) / 2;
    // 上层：洋瓷盆、红暖水瓶、搪瓷缸子、一口盖着布的小坛子
    const basin = enamelBowl(0.1, 0.17, 0.08, 1);
    basin.position.set(xc, H, z0 + 0.2);
    g.add(basin);
    const th = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.3, 20), new THREE.MeshStandardMaterial({ map: thermosTex(), roughness: 0.45, metalness: 0.3 }));
    body.position.y = 0.15;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.05, 16), alu);
    neck.position.y = 0.325;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.9 }));
    cork.position.y = 0.365;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 12, Math.PI), alu);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.06, 0.2, 0);
    for (const m of [body, neck]) m.castShadow = true;
    th.add(body, neck, cork, handle);
    th.position.set(xc, H, z0 + 0.46);
    g.add(th);
    const mug = new THREE.Group();
    const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.085, 20, 1, true), new THREE.MeshStandardMaterial({ map: enamelTex(3), roughness: 0.25, side: THREE.DoubleSide }));
    mugBody.position.y = 0.0425;
    const mugRim = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.003, 4, 20).rotateX(Math.PI / 2), enamelRim);
    mugRim.position.y = 0.085;
    const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 4, 10, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf4f1ea }));
    mugHandle.rotation.z = -Math.PI / 2;
    mugHandle.position.set(0.045, 0.045, 0);
    mug.add(mugBody, mugRim, mugHandle);
    mug.position.set(xc - 0.05, H, z0 + 0.62);
    mug.rotation.y = 0.8;
    g.add(mug);
    // 小咸菜坛子：酱釉，口上蒙块布、拿绳扎着
    const jar = createWaterVat({ height: 0.3, rimRadius: 0.08, bellyRadius: 0.13, baseRadius: 0.09 }, { leanLid: false });
    jar.children.slice(2).forEach((c) => (c.visible = false)); // 不要木盖
    const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 6, 0, Math.PI * 2, 0, 1.2), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1, side: THREE.DoubleSide }));
    cloth.scale.set(1, 0.35, 1);
    cloth.position.y = 0.28;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 4, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
    tie.position.y = 0.285;
    jar.add(cloth, tie);
    jar.position.set(xc, H, z1 - 0.15);
    g.add(jar);
    // 下层：铝锅、一个碗
    const pot = new THREE.Group();
    const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.125, 0.15, 24), alu);
    pb.position.y = 0.075;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.012, 24), alu);
    lid.position.y = 0.156;
    const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    kn.position.y = 0.172;
    pb.castShadow = true;
    pot.add(pb, lid, kn);
    pot.position.set(xc, 0.385, z0 + 0.25);
    g.add(pot);
    const bowl = enamelBowl(0.05, 0.08, 0.05, 5);
    bowl.position.set(xc, 0.385, z0 + 0.62);
    g.add(bowl);
  }

  // —— 一袋面粉 ——
  {
    const [x, z] = L(K.flourSack.x, K.flourSack.z);
    const sack = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 6, 14), new THREE.MeshStandardMaterial({ map: sackTex(), roughness: 1 }));
    sack.scale.set(1.15, 1, 0.75);
    sack.position.set(x, 0.33, z);
    sack.rotation.set(0.05, -1.2, 0.04);
    sack.castShadow = sack.receiveShadow = true;
    g.add(sack);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 8), sack.material);
    knot.position.set(x, 0.66, z);
    g.add(knot);
    g.add(box(x - 0.2, x + 0.2, 0, 0.6, z - 0.14, z + 0.14, new THREE.MeshBasicMaterial({ visible: false })));
  }

  // —— 一筐玉米棒子 ——
  {
    const [x, z] = L(K.cornBasket.x, K.cornBasket.z);
    const prof = [[0.2, 0], [0.24, 0.02], [0.27, 0.24], [0.28, 0.26]].map(([a, b]) => new THREE.Vector2(a, b));
    const basket = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshStandardMaterial({ map: weaveTex([168, 136, 90], 3), roughness: 1, side: THREE.DoubleSide }));
    basket.position.set(x, 0, z);
    basket.castShadow = true;
    g.add(basket);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20).rotateX(-Math.PI / 2), basket.material);
    bottom.position.set(x, 0.01, z);
    g.add(bottom);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 5, 28).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a7a4e, roughness: 1 }));
    rim.position.set(x, 0.26, z);
    g.add(rim);
    const r = rng(419);
    const n = 22;
    const cob = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.13, 4, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ map: cobTex(), roughness: 0.6 }), n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * 0.17;
      q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.4));
      m4.compose(new THREE.Vector3(x + Math.cos(a) * d, 0.2 + Math.floor(i / 8) * 0.05 + r() * 0.03, z + Math.sin(a) * d), q, new THREE.Vector3(1, 1, 1));
      cob.setMatrixAt(i, m4);
    }
    cob.castShadow = true;
    g.add(cob);
    g.add(box(x - 0.25, x + 0.25, 0, 0.3, z - 0.25, z + 0.25, new THREE.MeshBasicMaterial({ visible: false })));
  }

  // —— 一摞蜂窝煤 ——
  {
    const [x, z] = L(K.coal.x, K.coal.z);
    const coalMats = [new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 1 }), new THREE.MeshStandardMaterial({ map: coalTopTex(), roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 1 })];
    const geo = new THREE.CylinderGeometry(0.063, 0.063, 0.078, 16);
    const r = rng(421);
    const spots = [[0, 0, 5], [0.135, 0, 4], [0.07, 0.12, 3]];
    for (const [dx, dz, n] of spots) {
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(geo, coalMats);
        c.position.set(x + dx + (r() - 0.5) * 0.01, 0.039 + i * 0.079, z + dz + (r() - 0.5) * 0.01);
        c.rotation.y = r() * 3;
        c.castShadow = c.receiveShadow = true;
        g.add(c);
      }
    }
    g.add(box(x - 0.07, x + 0.21, 0, 0.4, z - 0.07, z + 0.19, new THREE.MeshBasicMaterial({ visible: false })));
  }

  // —— 东北角一口盖着布的咸菜缸 ——
  {
    const [x, z] = L(K.crock.x, K.crock.z);
    const crock = createWaterVat({ height: 0.62, rimRadius: 0.2, bellyRadius: 0.26, baseRadius: 0.18, x, z }, { leanLid: false });
    crock.children.slice(2).forEach((c) => (c.visible = false));
    const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 6, 0, Math.PI * 2, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xcfc2a4, roughness: 1, side: THREE.DoubleSide }));
    cloth.scale.set(1, 0.3, 1);
    cloth.position.y = 0.58;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.006, 4, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a5a3a }));
    tie.position.y = 0.6;
    crock.add(cloth, tie);
    g.add(crock);
  }

  // —— 墙上挂的：北墙一个圆筛子、一把漏勺；窗边一串红辣椒 ——
  {
    const [sx] = L(K.coal.x + 0.45, 0);
    const sieve = roundSieve(0.24);
    sieve.position.set(sx, 1.45, 0.04);
    g.add(sieve);
    const ladle = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.006, 20).rotateX(Math.PI / 2), alu);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6), alu);
    stick.position.y = 0.21;
    ladle.add(disc, stick);
    ladle.position.set(sx - 0.38, 1.25, 0.03);
    g.add(ladle);
    const [, cz] = L(0, K.windows[0].z - K.windows[0].width / 2 - 0.15);
    const chili = chiliString(0.45);
    chili.position.set(L(K.rect.x1 - K.wall, 0)[0] - 0.05, 1.7, cz);
    g.add(chili);
  }

  // —— 灶前烧火坐的小板凳（矮，不挡人） ——
  {
    const [x, z] = L(K.stool.x, K.stool.z);
    const st = new THREE.Group();
    st.add(box(-0.16, 0.16, 0.2, 0.23, -0.09, 0.09, wood, off));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.2, 6), wood);
        leg.position.set(sx * 0.12, 0.1, sz * 0.06);
        leg.rotation.set(sz * 0.12, 0, -sx * 0.12);
        leg.castShadow = true;
        st.add(leg);
      }
    }
    st.position.set(x, 0, z);
    st.rotation.y = 0.3;
    g.add(st);
  }
  return g;
}
