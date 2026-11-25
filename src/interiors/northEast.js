import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { NORTH_HOUSE as NH, EAST_ROOM as R } from '../layout.js';
import { box } from '../core/box.js';
import { wallWithOpenings } from '../buildings/wall.js';
import { canvasTex, rng, seamlessBlob, plasterTex, cementTex, floorTex, woodTex, pillowTex, quiltStack } from './common.js';

/**
 * 东北屋室内（第 12 轮，挂在 interior-anchor-east 上；坐标原点 = 室内西北角、地坪面，+x 东、+z 南）：当仓库用。
 * - 墙面、地面和西北屋一样：旧大白 + 墙根 0.55 m 水泥墙裙，磨旧的淡红砖地
 * - 进门左手边从西墙一直到北墙，一溜石灰大缸，装着收的粮食（玉米、麦子），有的盖着木盖、有的压着麻袋
 * - 南窗底下一张旧木板床（床头朝西），铺着褥子、老粗布床单，床尾叠着被子
 * - 四个墙角挂着蛛网；墙上几只壁虎，趴一会儿、窜一下
 */
const W = R.size.w;
const D = R.size.d;
const H = R.size.h;
const T = 0.012; // 白灰层
const TC = 0.022; // 水泥墙裙比白灰面凸出一点
const DADO = 0.55;

/* ---------- 贴图 ---------- */
/** 石灰大缸：灰白色、粗糙，抹子印，往下流的水渍，缸底一圈泥 */
function vatTex(seed) {
  return canvasTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#cfcac0';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 30, r() > 0.5 ? '160,152,140' : '230,226,216', 0.15 + r() * 0.2);
    for (let i = 0; i < 18; i++) {
      const x = r() * w;
      g.fillStyle = `rgba(120,108,90,${0.08 + r() * 0.12})`;
      g.fillRect(x, 6, 2 + r() * 3, 20 + r() * 60);
    }
    const lin = g.createLinearGradient(0, h, 0, h * 0.6);
    lin.addColorStop(0, 'rgba(90,76,60,0.5)');
    lin.addColorStop(1, 'rgba(90,76,60,0)');
    g.fillStyle = lin;
    g.fillRect(0, h * 0.6, w, h * 0.4);
    for (let i = 0; i < 800; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(80,72,60,0.15)' : 'rgba(255,255,250,0.15)';
      g.fillRect(r() * w, r() * h, 1, 1);
    }
  });
}

/** 缸里的玉米粒：一粒粒黄澄澄的，夹着几粒发红的 */
function cornTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(211);
    g.fillStyle = '#b8801c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = r() * w;
      const y = r() * h;
      const k = 0.8 + r() * 0.3;
      g.fillStyle = r() > 0.96 ? `rgb(${200 * k},${90 * k},${40 * k})` : `rgb(${236 * k},${176 * k},${48 * k})`;
      g.beginPath();
      g.ellipse(x, y, 4, 5, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,240,200,0.5)';
      g.fillRect(x - 1, y - 2, 2, 2);
    }
  });
}

/** 缸里的麦子：细长的金黄麦粒，带一层浮土 */
function wheatTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(223);
    g.fillStyle = '#9a7442';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3500; i++) {
      const k = 0.8 + r() * 0.3;
      g.fillStyle = `rgb(${200 * k},${152 * k},${86 * k})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 1.6, 3.4, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 20; i++) seamlessBlob(g, w, h, r() * w, r() * h, 20 + r() * 40, '210,196,170', 0.12);
  });
}

/** 一般的豆子、籽：底色 + 一粒粒椭圆（rx × ry 像素），colors 里随机挑 */
function seedTex(bg, colors, rx, ry, n, seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const c = colors[Math.floor(r() * colors.length)];
      const k = 0.85 + r() * 0.25;
      g.fillStyle = `rgb(${c[0] * k},${c[1] * k},${c[2] * k})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, rx, ry, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
      if (rx > 2) {
        g.fillStyle = 'rgba(255,255,240,0.35)';
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    }
  });
}

/** 棉花：一团团白，带点灰影和几片干壳 */
function cottonTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(241);
    g.fillStyle = '#d8d4cc';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 22, r() > 0.25 ? '250,248,244' : '170,164,154', 0.6);
    for (let i = 0; i < 25; i++) {
      g.fillStyle = 'rgba(110,80,50,0.6)';
      g.fillRect(r() * w, r() * h, 2 + r() * 3, 1 + r() * 2);
    }
  });
}

/** 缸上贴的红纸：竖着一条，毛笔字（一个字一行），褪色、边上卷起发白 */
function labelTex(text, seed) {
  return canvasTex(96, 240, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#b8282a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) seamlessBlob(g, w, h, r() * w, r() * h, 10 + r() * 30, r() > 0.5 ? '214,96,86' : '140,20,24', 0.25);
    g.fillStyle = 'rgba(20,12,10,0.92)';
    const n = [...text].length;
    const fs = Math.min(64, (h - 30) / n);
    g.font = `bold ${fs}px "KaiTi","STKaiti","SimSun",serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [...text].forEach((ch, i) => g.fillText(ch, w / 2, 15 + fs * (i + 0.5) + (h - 30 - fs * n) / 2));
    // 边上褪成粉白
    g.strokeStyle = 'rgba(240,200,190,0.5)';
    g.lineWidth = 4;
    g.strokeRect(1, 1, w - 2, h - 2);
  });
}

/** 麻袋：粗麻布经纬纹 */
function sackTex() {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(227);
    g.fillStyle = '#a8916a';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = `rgba(80,62,36,${0.15 + r() * 0.15})`;
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = `rgba(220,200,160,${0.1 + r() * 0.1})`;
      g.fillRect(x, 0, 1, h);
    }
  });
}

/** 老粗布床单：白底，蓝、红细条交织成格子 */
function sheetTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(43);
    g.fillStyle = '#e4ded0';
    g.fillRect(0, 0, w, h);
    const stripes = (vertical) => {
      for (const [pos, wd, col] of [[20, 10, '58,86,140'], [36, 4, '170,50,50'], [46, 10, '58,86,140'], [148, 6, '58,86,140'], [160, 3, '170,50,50']]) {
        g.fillStyle = `rgba(${col},0.5)`;
        if (vertical) g.fillRect(pos, 0, wd, h);
        else g.fillRect(0, pos, w, wd);
      }
    };
    stripes(true);
    stripes(false);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,250,0.12)' : 'rgba(120,110,90,0.1)';
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
  });
}

/** 蛛网：从墙角（贴图上沿正中）放射出去的丝 + 一圈圈横丝，挂着灰 */
function webTex(seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = 0;
    const spokes = [];
    for (let i = 0; i <= 10; i++) spokes.push(Math.PI * 0.05 + (i / 10) * Math.PI * 0.9 + (r() - 0.5) * 0.08);
    g.strokeStyle = 'rgba(235,235,230,0.55)';
    g.lineWidth = 1;
    for (const a of spokes) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 240, cy + Math.sin(a) * 240);
      g.stroke();
    }
    // 一圈圈横丝（往下垂一点）
    for (let rad = 18; rad < 230; rad += 12 + r() * 10) {
      g.strokeStyle = `rgba(230,230,225,${0.25 + r() * 0.25})`;
      g.beginPath();
      spokes.forEach((a, i) => {
        const rr = rad * (0.95 + r() * 0.1);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) g.moveTo(x, y);
        else {
          const pa = spokes[i - 1];
          const mx = cx + Math.cos((a + pa) / 2) * rr * 0.92;
          const my = cy + Math.sin((a + pa) / 2) * rr * 0.92 + 4;
          g.quadraticCurveTo(mx, my, x, y);
        }
      });
      g.stroke();
    }
    // 破了一块、挂着灰
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(cx + (r() - 0.5) * 120, 120 + r() * 60, 30 + r() * 20, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 60; i++) {
      g.fillStyle = 'rgba(160,156,150,0.35)';
      const a = Math.PI * 0.1 + r() * Math.PI * 0.8;
      const d = 20 + r() * 200;
      g.fillRect(cx + Math.cos(a) * d, Math.sin(a) * d, 2 + r() * 3, 2 + r() * 3);
    }
  });
}

/** 壁虎（从上往下看）：灰褐、半透明的肉色，身上细小斑点；头朝贴图上方 */
function geckoTex() {
  return canvasTex(128, 128, (g) => {
    const body = '#b4a68c';
    g.fillStyle = body;
    g.strokeStyle = body;
    g.lineCap = 'round';
    // 四条腿：弯着，脚趾张开
    const leg = (x0, y0, x1, y1, x2, y2) => {
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x1, y1, x2, y2);
      g.stroke();
      g.lineWidth = 1.5;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(x2, y2);
        g.lineTo(x2 + Math.cos(k * 0.5 + Math.atan2(y2 - y1, x2 - x1)) * 6, y2 + Math.sin(k * 0.5 + Math.atan2(y2 - y1, x2 - x1)) * 6);
        g.stroke();
      }
    };
    leg(56, 42, 40, 40, 36, 30);
    leg(72, 42, 88, 40, 92, 30);
    leg(56, 70, 40, 74, 36, 86);
    leg(72, 70, 88, 74, 92, 86);
    // 身子、头
    g.beginPath();
    g.ellipse(64, 56, 10, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(64, 26, 8, 10, 0, 0, Math.PI * 2);
    g.fill();
    // 尾巴：越来越细，有点弯
    g.beginPath();
    g.moveTo(58, 74);
    g.quadraticCurveTo(62, 100, 70, 124);
    g.lineTo(72, 124);
    g.quadraticCurveTo(68, 100, 70, 74);
    g.closePath();
    g.fill();
    // 斑点、眼睛
    g.fillStyle = 'rgba(90,76,60,0.6)';
    for (let i = 0; i < 26; i++) g.fillRect(56 + ((i * 37) % 16), 40 + ((i * 53) % 34), 2, 2);
    g.fillStyle = '#1a1612';
    g.beginPath();
    g.arc(59, 22, 2, 0, Math.PI * 2);
    g.arc(69, 22, 2, 0, Math.PI * 2);
    g.fill();
  });
}

/* ---------- 构件 ---------- */
/** 一口石灰大缸：口沿厚、肚子微鼓、底略收；fill 决定上面是什么 */
function limeVat(mats, fill, seed) {
  const g = new THREE.Group();
  const { r, h } = R.vat;
  const outer = [
    [r * 0.82, 0], [r * 0.9, 0.04], [r * 1.0, h * 0.55], [r * 0.99, h * 0.9], [r * 1.04, h * 0.95], [r * 1.04, h], [r * 0.88, h], [r * 0.86, h * 0.9], [r * 0.84, h * 0.2], [0, h * 0.18],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(outer, 36);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: vatTex(seed), roughness: 0.95 }));
  m.rotation.y = seed;
  m.castShadow = m.receiveShadow = true;
  m.userData.solid = true;
  g.add(m);
  // 缸里的东西
  const level = h * (0.84 + (seed % 3) * 0.03); // 粮食装到离口沿十来厘米
  if (['corn', 'wheat', 'mungbean', 'sesame', 'rapeseed', 'cotton'].includes(fill)) {
    // 一个扁扁的球冠：边缘正好贴着缸的内壁，中间鼓起一个小堆
    const inner = r * 0.86;
    const th = 0.6;
    const rs = inner / Math.sin(th);
    const sy = fill === 'cotton' ? 0.75 : 0.4; // 棉花蓬松，鼓出缸口
    const heap = new THREE.Mesh(new THREE.SphereGeometry(rs, 32, 8, 0, Math.PI * 2, 0, th), mats[fill]);
    heap.scale.set(1, sy, 1);
    heap.position.y = level - rs * Math.cos(th) * sy;
    heap.receiveShadow = true;
    g.add(heap);
    // 插着一只舀粮食的瓢
    if (seed % 2 && fill !== 'cotton') {
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mats.gourd);
      scoop.material.side = THREE.DoubleSide;
      scoop.position.set(0.1, level + 0.07, 0.08);
      scoop.rotation.set(0.6, 0, 0.3);
      g.add(scoop);
    }
  } else if (fill === 'lid') {
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.03, 32), mats.lid);
    lid.position.y = h + 0.015;
    lid.castShadow = lid.receiveShadow = true;
    const handle = box(-0.2, 0.2, h + 0.03, h + 0.06, -0.025, 0.025, mats.lid, { solid: false });
    handle.rotation.y = seed;
    g.add(lid, handle);
  } else if (fill === 'sack') {
    const sack = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.22, 0.5, 4, 0.1), mats.sack);
    sack.position.set(0, h + 0.09, 0);
    sack.rotation.set(0.05, seed, -0.06);
    sack.castShadow = sack.receiveShadow = true;
    g.add(sack);
  }
  return g;
}

/** 墙上爬的壁虎：在一面墙的平面里走（u 沿墙、v 高），趴一会儿、窜一下 */
function makeGecko(spec, tex, seed) {
  const r = rng(seed * 97 + 13);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, roughness: 0.7 }));
  mesh.userData.noAO = true;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  // 墙：n = 北墙（z = 0，朝南），e = 东墙（x = W，朝西），s = 南墙（z = D，朝北）
  const off = T + 0.006;
  const len = spec.wall === 'e' ? D : W;
  const place = (u, v) => {
    if (spec.wall === 'n') pivot.position.set(u, v, off);
    else if (spec.wall === 's') pivot.position.set(W - u, v, D - off);
    else pivot.position.set(W - off, v, u);
  };
  if (spec.wall === 's') pivot.rotation.y = Math.PI;
  if (spec.wall === 'e') pivot.rotation.y = -Math.PI / 2;
  let u = spec.u;
  let v = spec.v;
  let heading = r() * Math.PI * 2; // 0 = 头朝上
  let state = 'rest';
  let timer = 1 + r() * 3;
  place(u, v);
  mesh.rotation.z = -heading;
  return {
    object: pivot,
    update(dt, t) {
      timer -= dt;
      if (state === 'rest') {
        mesh.rotation.z = -heading + Math.sin(t * 3 + seed) * 0.04; // 歪歪头
        if (timer <= 0) {
          state = 'run';
          timer = 0.25 + r() * 0.6;
          heading += (r() - 0.5) * 2.2;
        }
        return;
      }
      // 窜：沿头的方向跑，碰到边就掉头
      const sp = 0.55 * dt;
      let nu = u + Math.sin(heading) * sp;
      let nv = v + Math.cos(heading) * sp;
      if (nu < 0.2 || nu > len - 0.2 || nv < DADO + 0.15 || nv > H - 0.12) {
        heading += Math.PI * (0.6 + r() * 0.8);
        nu = u;
        nv = v;
      }
      u = nu;
      v = nv;
      place(u, v);
      mesh.rotation.z = -heading + Math.sin(t * 40) * 0.12; // 跑的时候身子一扭一扭
      if (timer <= 0) {
        state = 'rest';
        timer = 1.5 + r() * 4;
      }
    },
  };
}

export function createNorthEastInterior() {
  const group = new THREE.Group();
  group.name = 'interior-east';
  const plaster = new THREE.MeshStandardMaterial({ map: plasterTex(), roughness: 1 });
  const cement = new THREE.MeshStandardMaterial({ map: cementTex(), roughness: 0.95 });

  // —— 墙面：旧大白，墙根 0.55 m 水泥墙裙；门窗洞口内侧抹白灰 ——
  const room = NH.rooms[1];
  const southOps = [
    { center: room.door.x - R.origin.x, width: room.door.width, bottom: 0, top: room.door.height },
    ...room.windows.map((w) => ({ center: w.x - R.origin.x, width: w.width, bottom: w.sill, top: w.sill + w.height })),
  ];
  const finish = (axis, from, to, at, dir, ops = []) => {
    const opsUp = ops.filter((o) => o.top > DADO).map((o) => ({ ...o, bottom: Math.max(o.bottom, DADO) }));
    const opsDado = ops.filter((o) => o.bottom < DADO).map((o) => ({ ...o, top: Math.min(o.top, DADO) }));
    group.add(wallWithOpenings({ axis, from, to, at: at + (dir * T) / 2, thickness: T, y0: DADO, y1: H, openings: opsUp, solid: false }, { wall: plaster }));
    group.add(wallWithOpenings({ axis, from, to, at: at + (dir * TC) / 2, thickness: TC, y0: 0, y1: DADO, openings: opsDado, solid: false }, { wall: cement }));
    group.add(wallWithOpenings({ axis, from, to, at: at + (dir * (TC + 0.004)) / 2, thickness: TC + 0.004, y0: DADO - 0.012, y1: DADO, openings: opsDado, solid: false }, { wall: cement }));
  };
  finish('x', 0, W, 0, +1);
  finish('x', 0, W, D, -1, southOps);
  finish('z', TC, D - TC, 0, +1);
  finish('z', TC, D - TC, W, -1);
  for (const o of southOps) {
    const a0 = o.center - o.width / 2;
    const a1 = o.center + o.width / 2;
    for (const a of [a0, a1]) group.add(box(a - (a === a0 ? 0 : T), a + (a === a0 ? T : 0), o.bottom, o.top, D, D + 0.11, plaster, { solid: false }));
    group.add(box(a0, a1, o.top - T, o.top, D, D + 0.11, plaster, { solid: false }));
    if (o.bottom > 0) group.add(box(a0 - 0.02, a1 + 0.02, o.bottom - 0.02, o.bottom, D - 0.03, D + 0.11, cement, { solid: false }));
  }
  // 顶棚：也是刷的大白（盖住屋面板底下那层）
  group.add(box(0, W, H - 0.006, H - 0.001, 0, D, plaster, { solid: false, shadow: false }));
  // 地面：磨旧的淡红砖
  group.add(box(0, W, -0.01, 0.004, 0, D, new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.9 }), { solid: false, shadow: false }));

  // —— 石灰大缸 ——
  const mats = {
    corn: new THREE.MeshStandardMaterial({ map: cornTex(), roughness: 0.6 }),
    wheat: new THREE.MeshStandardMaterial({ map: wheatTex(), roughness: 0.9 }),
    mungbean: new THREE.MeshStandardMaterial({ map: seedTex('#3e5a26', [[96, 140, 60], [80, 120, 50], [110, 150, 70]], 3.4, 2.6, 2600, 251), roughness: 0.5 }),
    sesame: new THREE.MeshStandardMaterial({ map: seedTex('#b8a07a', [[236, 222, 190], [220, 204, 168], [250, 240, 214]], 1.6, 2.4, 6000, 257), roughness: 0.8 }),
    rapeseed: new THREE.MeshStandardMaterial({ map: seedTex('#2a1a14', [[86, 44, 30], [60, 32, 24], [110, 60, 40]], 1.8, 1.8, 5000, 263), roughness: 0.55 }),
    cotton: new THREE.MeshStandardMaterial({ map: cottonTex(), roughness: 1 }),
    lid: new THREE.MeshStandardMaterial({ map: woodTex([130, 98, 64], { seed: 31, planks: 0.12 }), roughness: 0.85 }),
    sack: new THREE.MeshStandardMaterial({ map: sackTex(), roughness: 1 }),
    gourd: new THREE.MeshStandardMaterial({ color: 0xc8a466, roughness: 0.6 }),
  };
  R.vats.forEach((v, i) => {
    const vat = limeVat(mats, v.fill, i + 3);
    vat.position.set(v.x, 0, v.z);
    group.add(vat);
    // 朝屋里贴一张红纸（第 17 轮）：一块贴着缸肚子的弧面
    if (v.label) {
      const rr = R.vat.r * 1.003 + 0.002;
      const lw = 0.15;
      const lh = Math.min(0.36, 0.1 * [...v.label].length + 0.06);
      const face = Math.atan2(R.size.w / 2 - v.x, R.size.d / 2 - v.z); // 朝屋子中间
      const geo = new THREE.CylinderGeometry(rr, rr, lh, 8, 1, true, face - lw / rr / 2, lw / rr);
      const lab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: labelTex(v.label, 271 + i), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
      lab.position.y = R.vat.h * 0.66;
      lab.userData.noAO = true;
      vat.add(lab);
    }
  });
  // 缸边地上撒的几粒玉米、麦子
  {
    const r = rng(239);
    const kernel = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 5, 4).scale(1, 0.6, 1.3), new THREE.MeshStandardMaterial({ color: 0xd8a030, roughness: 0.6 }), 60);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) {
      const along = r();
      const nearWest = r() > 0.5;
      const x = nearWest ? 0.95 + r() * 0.25 : 0.5 + along * 4.6;
      const z = nearWest ? 0.5 + along * 3.8 : 0.95 + r() * 0.25;
      m4.makeRotationY(r() * 6).setPosition(x, 0.008, z);
      kernel.setMatrixAt(i, m4);
    }
    group.add(kernel);
  }

  // —— 南窗底下的床（床头朝西）——
  {
    const B = R.bed;
    const x0 = B.x0;
    const x1 = B.x0 + B.length;
    const z1 = D - TC - 0.01;
    const z0 = z1 - B.width;
    const wood = new THREE.MeshStandardMaterial({ map: woodTex([110, 70, 40], { seed: 37 }), roughness: 0.7 });
    const off = { solid: false };
    const P = 0.06;
    for (const x of [x0, x1 - P]) for (const z of [z0, z1 - P]) group.add(box(x, x + P, 0, B.height - 0.04, z, z + P, wood, off));
    group.add(box(x0, x0 + P, B.height - 0.04, B.height + 0.32, z0, z1, wood, off)); // 床头板（西）
    group.add(box(x0 + P, x1 - P, B.height - 0.16, B.height - 0.04, z0, z0 + 0.04, wood, off)); // 床帮
    group.add(box(x0 + P, x1 - P, B.height - 0.16, B.height - 0.04, z1 - 0.04, z1, wood, off));
    group.add(box(x1 - P, x1, B.height - 0.16, B.height - 0.04, z0, z1, wood, off));
    group.add(box(x0 + P, x1, B.height - 0.04, B.height - 0.01, z0, z1, new THREE.MeshStandardMaterial({ map: woodTex([150, 110, 70], { seed: 38, planks: 0.2, along: 'u' }), roughness: 0.8 }), off)); // 床板
    // 褥子 + 床单
    const sheet = new THREE.MeshStandardMaterial({ map: sheetTex(), roughness: 0.95 });
    sheet.map.wrapS = sheet.map.wrapT = THREE.RepeatWrapping;
    sheet.map.repeat.set(4, 3);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0 - P - 0.02, 0.07, B.width - 0.04, 3, 0.03), sheet);
    pad.position.set((x0 + P + x1) / 2, B.height + 0.025, (z0 + z1) / 2);
    pad.castShadow = pad.receiveShadow = true;
    group.add(pad);
    // 床尾叠着被子、床头一个枕头
    const st = quiltStack(RoundedBoxGeometry, { count: 2, w: 1.1, d: 0.5, offset: 1 });
    st.group.rotation.y = Math.PI / 2;
    st.group.position.set(x1 - 0.35, B.height + 0.06, (z0 + z1) / 2);
    group.add(st.group);
    const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.1, 0.32, 3, 0.045), new THREE.MeshStandardMaterial({ map: pillowTex(), roughness: 0.8 }));
    pillow.rotation.y = Math.PI / 2;
    pillow.position.set(x0 + P + 0.22, B.height + 0.11, (z0 + z1) / 2);
    pillow.castShadow = true;
    group.add(pillow);
    // 挡人
    group.add(box(x0, x1, 0, B.height + 0.06, z0, z1, new THREE.MeshBasicMaterial({ visible: false })));
  }

  // —— 墙角的蛛网 ——
  {
    // 网面朝屋里斜对着墙角，上沿横跨在两面墙之间（离墙角各 0.5 m）
    const corners = [
      [0, 0, Math.PI / 4],
      [W, 0, -Math.PI / 4],
      [W, D, (-3 * Math.PI) / 4],
      [0, D, (3 * Math.PI) / 4],
    ];
    corners.forEach(([x, z, ry], i) => {
      const web = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7).translate(0, -0.35, 0), new THREE.MeshBasicMaterial({ map: webTex(251 + i), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      const d = 0.7 / Math.SQRT2 / 2 + 0.02;
      web.position.set(x + (x === 0 ? d : -d), H - 0.01, z + (z === 0 ? d : -d));
      web.rotation.set(0, ry, 0);
      web.rotateX(-0.35); // 下沿往屋里斜，像挂在两面墙和顶棚之间
      web.userData.noAO = true;
      group.add(web);
    });
    // 缸后面低处也挂一张
    const low = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5).translate(0, -0.25, 0), new THREE.MeshBasicMaterial({ map: webTex(263), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    low.position.set(0.2, 1.25, 0.2);
    low.rotation.y = Math.PI / 4;
    low.userData.noAO = true;
    group.add(low);
  }

  // —— 墙上的壁虎 ——
  const gtex = geckoTex();
  const geckos = R.geckos.map((spec, i) => makeGecko(spec, gtex, i + 1));
  for (const g of geckos) group.add(g.object);

  return {
    group,
    update(dt, t) {
      for (const g of geckos) g.update(Math.min(dt, 0.1), t);
    },
  };
}
