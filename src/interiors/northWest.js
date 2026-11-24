import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { NORTH_HOUSE as NH, WEST_ROOM as R } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';
import { Q } from '../core/quality.js';
import { wallWithOpenings } from '../buildings/wall.js';

/**
 * 西北屋室内（挂在 interior-anchor-west 上；坐标原点 = 室内西北角、地坪面，+x 东、+z 南）：
 * - 四壁抹白灰；一道隔墙把屋子分成西边的外屋（约 2/3）和东边的里屋，隔墙上一个小门洞
 * - 门洞挂半截白布门帘（织着小红花），人走过去会被撩开
 * - 里屋北边一铺炕，铺炕席，炕沿一根木头；东头靠墙叠着几床八九十年代的棉花被（大红、枣红、绿、粉的缎子被面）
 * - 炕头（隔墙这边）墙上一个拉线开关，拉一下屋顶的灯泡亮（15 瓦上下的白炽灯，昏黄），再拉一下灭
 * - 南墙下一排做蜡烛的器具：铁皮水槽里排着蜡烛模子，上面插着做好的白蜡烛；边上一个煤球炉、一锅化开的蜡
 * - 南墙和那一片顶棚被烟火熏得发黑
 */
const ROOM = { w: R.size.w, d: R.size.d, h: R.size.h };
const PX = R.partition.x;
const PT = R.partition.thickness;
const IX0 = PX + PT / 2; // 里屋西墙面（隔墙东面）
const IX1 = ROOM.w; // 里屋东墙面
const SOUTH = ROOM.d;

/* ---------- 小贴图（canvas 现画） ---------- */
function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** 白灰墙：刷过好几遍的石灰水，发黄、有些水渍和蹭脏的地方（低对比，看着是白墙） */
function plasterTex() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(17);
      g.fillStyle = '#ebe6da';
      g.fillRect(0, 0, w, h);
      // 斑驳（四方连续：每块在上下左右各画一遍，贴图拼接处看不出缝）
      for (let i = 0; i < 60; i++) {
        const x0 = r() * w;
        const y0 = r() * h;
        const rad = 20 + r() * 70;
        const c = r() > 0.5 ? '200,186,150' : '150,146,140';
        const a = 0.08 + r() * 0.08;
        for (const ox of [-w, 0, w]) {
          for (const oy of [-h, 0, h]) {
            const gr = g.createRadialGradient(x0 + ox, y0 + oy, 0, x0 + ox, y0 + oy, rad);
            gr.addColorStop(0, `rgba(${c},${a})`);
            gr.addColorStop(1, `rgba(${c},0)`);
            g.fillStyle = gr;
            g.fillRect(0, 0, w, h);
          }
        }
      }
      // 刷子的道道
      for (let y = 0; y < h; y += 3) {
        g.fillStyle = `rgba(255,255,250,${r() * 0.06})`;
        g.fillRect(0, y, w, 2);
      }
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(120,110,95,${0.05 + r() * 0.08})`;
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    },
    { repeat: [1 / 1.6, 1 / 1.6] },
  );
}

/** 炕席：高粱秆/苇子篾编的人字纹，发黄发旧 */
function reedMat() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(11);
      g.fillStyle = '#c4a466';
      g.fillRect(0, 0, w, h);
      const s = 16; // 一根篾子宽
      for (let y = 0; y < h; y += s / 2) {
        for (let x = 0; x < w; x += s) {
          const dir = (Math.floor(x / s) + Math.floor(y / (s / 2))) % 4 < 2;
          const k = 0.85 + r() * 0.25;
          g.fillStyle = `rgb(${206 * k},${170 * k},${104 * k})`;
          g.save();
          g.translate(x + s / 2, y + s / 4);
          g.rotate(dir ? Math.PI / 4 : -Math.PI / 4);
          g.fillRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.4);
          g.strokeStyle = 'rgba(80,60,30,0.35)';
          g.strokeRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.4);
          g.restore();
        }
      }
      // 睡出来的油亮、发暗的地方
      for (let i = 0; i < 30; i++) {
        const gr = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 20 + r() * 60);
        gr.addColorStop(0, 'rgba(90,60,30,0.18)');
        gr.addColorStop(1, 'rgba(90,60,30,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
    },
    { repeat: [2.6, 2.2] },
  );
}

/** 缎子被面：底色 + 大朵牡丹 + 叶子，四边一圈白被里 */
function quiltTex(base, flower, flower2, seed) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = '#ece6da';
    g.fillRect(0, 0, w, h);
    g.fillStyle = base;
    g.fillRect(14, 14, w - 28, h - 28);
    g.save();
    g.beginPath();
    g.rect(14, 14, w - 28, h - 28);
    g.clip();
    for (let i = 0; i < 9; i++) {
      const x = 20 + r() * (w - 40);
      const y = 20 + r() * (h - 40);
      const R0 = 16 + r() * 16;
      // 叶子
      g.fillStyle = 'rgba(40,110,60,0.85)';
      for (let k = 0; k < 4; k++) {
        const a = r() * Math.PI * 2;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * R0 * 1.1, y + Math.sin(a) * R0 * 1.1, R0 * 0.6, R0 * 0.25, a, 0, Math.PI * 2);
        g.fill();
      }
      // 一层层花瓣
      for (let ring = 3; ring >= 1; ring--) {
        const rr = (R0 * ring) / 3;
        g.fillStyle = ring % 2 ? flower : flower2;
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + ring;
          g.beginPath();
          g.arc(x + Math.cos(a) * rr * 0.45, y + Math.sin(a) * rr * 0.45, rr * 0.55, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = '#f2d36a';
      g.beginPath();
      g.arc(x, y, R0 * 0.15, 0, Math.PI * 2);
      g.fill();
    }
    // 缎子的光泽纹
    for (let y = 14; y < h - 14; y += 3) {
      g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.03})`;
      g.fillRect(14, y, w - 28, 1);
    }
    g.restore();
  });
}

/** 门帘：白棉布，织着一朵朵小红花 */
function curtainTex() {
  return canvasTex(
    256,
    256,
    (g) => {
      g.scale(2, 2); // 按 128 的设计尺寸画，实际 256（近看不糊）
      const w = 128;
      const h = 128;
      const r = rng(23);
      g.fillStyle = '#ece8de';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = `rgba(150,140,120,${0.05 + r() * 0.05})`;
        g.fillRect(0, y, w, 1);
      }
      for (let x = 0; x < w; x += 2) {
        g.fillStyle = `rgba(150,140,120,${0.03 + r() * 0.04})`;
        g.fillRect(x, 0, 1, h);
      }
      const flower = (x, y) => {
        g.fillStyle = '#3f8a4a';
        g.fillRect(x - 6, y + 2, 4, 2);
        g.fillRect(x + 3, y + 3, 4, 2);
        g.fillStyle = '#c42a30';
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          g.beginPath();
          g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#f0d070';
        g.fillRect(x - 1, y - 1, 2, 2);
      };
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) flower(i * 32 + 16 + (j % 2) * 16, j * 32 + 16);
    },
    { repeat: [2.2, 1.8] },
  );
}

/** 熏黑的墙：下面淡、上面浓，煤炉和蜡烛器具上方各一大片，往上散开 */
function sootTex(plumes, { top = 0.6, seed = 31 } = {}) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    // 越往上越黑（烟往上走，贴着顶棚散开）
    const lin = g.createLinearGradient(0, h, 0, 0);
    lin.addColorStop(0, 'rgba(30,24,20,0)');
    lin.addColorStop(0.45, 'rgba(30,24,20,0.12)');
    lin.addColorStop(1, `rgba(24,19,16,${top})`);
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    for (const [u, strength] of plumes) {
      for (let k = 0; k < 6; k++) {
        const y = h * (0.75 - k * 0.14);
        const rad = w * (0.08 + k * 0.05);
        const gr = g.createRadialGradient(u * w, y, 0, u * w, y, rad);
        gr.addColorStop(0, `rgba(20,16,13,${strength * (0.35 + k * 0.06)})`);
        gr.addColorStop(1, 'rgba(20,16,13,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
    }
    // 一道道往上的烟痕和斑驳
    for (let i = 0; i < 260; i++) {
      const x = r() * w;
      const y = r() * h * 0.9;
      g.fillStyle = `rgba(18,14,12,${0.05 + r() * 0.08})`;
      g.fillRect(x, y, 1 + r() * 2, 8 + r() * 30);
    }
    for (let i = 0; i < 400; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,250,240,0.04)' : 'rgba(10,8,6,0.06)';
      g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 6);
    }
  });
}

/* ---------- 拉线开关的“咔哒”声 ---------- */
let audioCtx = null;
function clickSound() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    for (const [dt, f] of [[0, 2600], [0.07, 1800]]) {
      const len = 0.03;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 3;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(bp).connect(gain).connect(ctx.destination);
      src.start(t + dt);
    }
  } catch {
    /* 没有声音也不影响 */
  }
}

/* ---------- 做蜡烛的器具 ---------- */
/** 蜡烛机外壳：黄铜色的旧铁皮，糊满了一道道往下流的蜡泪，还有发黑发绿的锈迹 */
function waxyMetalTex(seed) {
  return canvasTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    const lin = g.createLinearGradient(0, 0, 0, h);
    lin.addColorStop(0, '#8e7a36');
    lin.addColorStop(0.6, '#7a6a30');
    lin.addColorStop(1, '#4e4524');
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    // 锈迹、手摸的黑印子
    for (let i = 0; i < 40; i++) {
      const x = r() * w;
      const y = r() * h;
      const gr = g.createRadialGradient(x, y, 0, x, y, 10 + r() * 40);
      gr.addColorStop(0, r() > 0.5 ? 'rgba(40,50,30,0.45)' : 'rgba(30,24,16,0.4)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
    // 从上沿流下来的蜡泪：一道一道，奶白、淡黄
    for (let i = 0; i < 160; i++) {
      const x = r() * w;
      const len = h * (0.1 + r() * r() * 0.9);
      const wd = 2 + r() * 7;
      const yellow = r() > 0.55;
      g.fillStyle = yellow ? `rgba(226,200,120,${0.55 + r() * 0.35})` : `rgba(238,230,205,${0.5 + r() * 0.4})`;
      g.beginPath();
      g.moveTo(x - wd / 2, 0);
      g.lineTo(x + wd / 2, 0);
      g.lineTo(x + wd * 0.35, len - wd);
      g.arc(x, len - wd, wd * 0.45, 0, Math.PI);
      g.closePath();
      g.fill();
    }
    // 上沿一圈厚厚的蜡
    g.fillStyle = 'rgba(232,218,170,0.85)';
    g.fillRect(0, 0, w, 10);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,250,230,0.08)' : 'rgba(20,16,8,0.1)';
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 3 + r() * 10);
    }
  });
}

/**
 * 做蜡烛的器具（照用户发的照片）：一个长条形、上宽下窄的铁皮槽子，里面竖着一排排蜡烛模子（槽里灌凉水），
 * 顶上一块浇蜡的铁板，模子口一排排露着刚顶上来的蜡烛头；外壳糊满蜡泪。
 * 底下一个矮铁架子。几台挨着摆一排。
 * 局部坐标：x 沿墙，y 从地面起，z 前后（对称）。
 */
function candleMachine(L, mats, { seed = 1, topWax = 0xe8dfc2 } = {}) {
  const g = new THREE.Group();
  const standH = 0.3;
  const H = 0.5; // 槽身高
  const W = 0.26; // 上口宽
  // 矮铁架子
  const hx = L / 2 - 0.04;
  const hz = 0.07;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(sx * hx - 0.015, sx * hx + 0.015, 0, standH, sz * hz - 0.015, sz * hz + 0.015, mats.iron, { solid: false }));
  for (const sz of [-1, 1]) g.add(box(-hx, hx, standH - 0.03, standH, sz * hz - 0.02, sz * hz + 0.02, mats.iron, { solid: false }));
  for (const sz of [-1, 1]) g.add(box(-hx, hx, 0.04, 0.07, sz * hz - 0.012, sz * hz + 0.012, mats.iron, { solid: false }));
  // 上宽下窄的槽身
  const geo = new THREE.BoxGeometry(L, H, W);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setZ(i, p.getZ(i) * 0.6);
  geo.computeVertexNormals();
  const tex = waxyMetalTex(seed);
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.25 });
  const endTex = tex.clone();
  endTex.repeat.set(0.35, 1);
  endTex.needsUpdate = true;
  const end = new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.55, metalness: 0.25 });
  const body = new THREE.Mesh(geo, [end, end, side, side, side, side]);
  body.position.y = standH + H / 2;
  body.castShadow = body.receiveShadow = true;
  body.userData.solid = true;
  g.add(body);
  // 顶上浇蜡的铁板，两边一道翻起来的沿
  const top = standH + H;
  const plate = new THREE.MeshStandardMaterial({ color: 0x6e6232, roughness: 0.6, metalness: 0.3 });
  g.add(box(-L / 2 - 0.02, L / 2 + 0.02, top, top + 0.015, -W / 2 - 0.02, W / 2 + 0.02, plate, { solid: false }));
  for (const sz of [-1, 1]) {
    const lip = box(-L / 2 - 0.02, L / 2 + 0.02, top, top + 0.05, -0.004, 0.004, plate, { solid: false });
    lip.position.z = sz * (W / 2 + 0.02);
    lip.rotation.x = sz * 0.35;
    g.add(lip);
  }
  // 板上凝着的一层蜡
  g.add(box(-L / 2, L / 2, top + 0.015, top + 0.026, -W / 2 - 0.005, W / 2 + 0.005, new THREE.MeshStandardMaterial({ color: topWax, roughness: 0.45 }), { solid: false }));
  // 模子口露出来的蜡烛头：三排
  const r = rng(seed * 7 + 3);
  const n = Math.floor((L - 0.06) / 0.04);
  const tip = new THREE.CylinderGeometry(0.006, 0.0065, 1, 8).translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(tip, mats.candle, n * 3);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let k = 0;
  for (const row of [-0.07, 0, 0.07]) {
    for (let i = 0; i < n; i++) {
      const x = -((n - 1) * 0.04) / 2 + i * 0.04 + (r() - 0.5) * 0.006;
      const len = 0.045 + r() * 0.05;
      q.setFromEuler(e.set((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12));
      m4.compose(new THREE.Vector3(x, top + 0.02, row), q, new THREE.Vector3(1, len, 1));
      inst.setMatrixAt(k++, m4);
    }
  }
  inst.castShadow = inst.receiveShadow = true;
  g.add(inst);
  // 沿上挂着的几坨蜡
  const blob = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0; i < 10; i++) {
    const d = new THREE.Mesh(blob, mats.waxOld);
    const sz = r() > 0.5 ? 1 : -1;
    d.scale.set(0.01 + r() * 0.015, 0.02 + r() * 0.04, 0.008);
    d.position.set(-L / 2 + r() * L, top - 0.02, sz * (W / 2 + 0.002));
    g.add(d);
  }
  return g;
}

/** 煤球炉 + 一锅化开的蜡 + 浇蜡的小壶 */
function stoveWithPot(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.42, 20), mats.stoveIron);
  body.position.y = 0.21;
  body.castShadow = body.receiveShadow = true;
  body.userData.solid = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.012, 6, 20).rotateX(Math.PI / 2), mats.stoveIron);
  rim.position.y = 0.42;
  // 炉门
  const door = box(-0.05, 0.05, 0.05, 0.13, -0.165, -0.15, mats.iron, { solid: false });
  // 铝锅 + 蜡
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.15, 24, 1, true), mats.alu);
  pot.material.side = THREE.DoubleSide;
  pot.position.y = 0.5;
  pot.castShadow = true;
  const wax = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24).rotateX(-Math.PI / 2), mats.waxMelt);
  wax.position.y = 0.55;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.125, 24).rotateX(Math.PI / 2), mats.alu);
  bottom.position.y = 0.425;
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 4, 10, Math.PI), mats.alu);
    ear.position.set(s * 0.14, 0.56, 0);
    ear.rotation.set(0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
    g.add(ear);
  }
  g.add(body, rim, door, pot, wax, bottom);
  // 地上一只浇蜡的铁皮小壶
  const kettle = new THREE.Group();
  const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 14), mats.tin);
  kb.position.y = 0.05;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.1, 6), mats.tin);
  spout.position.set(0.07, 0.08, 0);
  spout.rotation.z = -0.9;
  kettle.add(kb, spout);
  kettle.position.set(-0.08, 0, -0.27);
  kettle.rotation.y = 0.6;
  for (const o of [kb, spout]) o.castShadow = true;
  g.add(kettle);
  return g;
}

export function createNorthWestInterior() {
  const group = new THREE.Group();
  group.name = 'interior-west';
  const plasterMap = plasterTex();
  const plaster = new THREE.MeshStandardMaterial({ map: plasterMap, roughness: 1 });
  const mats = {
    wood: mat('oldWood'),
    tin: mat('galvanized'),
    iron: new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.7, metalness: 0.5 }),
    stoveIron: mat('wok'),
    alu: new THREE.MeshStandardMaterial({ color: 0xb8b8b4, roughness: 0.45, metalness: 0.7 }),
    wick: new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 1 }),
    waxOld: new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.6 }),
    waxMelt: new THREE.MeshStandardMaterial({ color: 0xefe2bc, roughness: 0.25 }),
  };

  // —— 四壁抹白灰（贴在砖墙内侧的一层） ——
  const t = 0.012;
  const coat = (o) => group.add(wallWithOpenings({ ...o, thickness: t, y0: 0, y1: ROOM.h, solid: false }, { wall: plaster }));
  const doorX = NH.rooms[0].door.x - R.origin.x;
  const win = NH.rooms[0].windows[0];
  coat({ axis: 'x', from: 0, to: ROOM.w, at: t / 2 });
  coat({
    axis: 'x',
    from: 0,
    to: ROOM.w,
    at: SOUTH - t / 2,
    openings: [
      { center: doorX, width: NH.rooms[0].door.width, bottom: 0, top: NH.rooms[0].door.height },
      { center: win.x - R.origin.x, width: win.width, bottom: win.sill, top: win.sill + win.height },
    ],
  });
  coat({ axis: 'z', from: t, to: SOUTH - t, at: t / 2 });
  coat({ axis: 'z', from: t, to: SOUTH - t, at: ROOM.w - t / 2 });

  // —— 隔墙（抹白灰），上面一个小门洞 ——
  const dz = R.innerDoor.z;
  const dw = R.innerDoor.width;
  const dh = R.innerDoor.height;
  group.add(
    wallWithOpenings(
      { axis: 'z', from: t, to: SOUTH - t, at: PX, thickness: PT, y0: 0, y1: ROOM.h, openings: [{ center: dz, width: dw, bottom: 0, top: dh }] },
      { wall: plaster },
    ),
  );
  // 门洞上的过木
  group.add(box(PX - PT / 2 - 0.004, PX + PT / 2 + 0.004, dh, dh + 0.08, dz - dw / 2 - 0.1, dz + dw / 2 + 0.1, mats.wood, { solid: false }));

  // —— 门帘：外屋这边，一根细竹竿挑着 ——
  const cw = dw + 0.14;
  const ch = R.curtain.drop;
  const cx = PX - PT / 2 - 0.025;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, cw + 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x9a8058, roughness: 0.8 }));
  rod.rotation.x = Math.PI / 2;
  rod.position.set(cx, dh + 0.03, dz);
  group.add(rod);
  const cGeo = new THREE.PlaneGeometry(cw, ch, 16, 10);
  cGeo.translate(0, -ch / 2, 0);
  const cBase = cGeo.attributes.position.array.slice();
  const curtain = new THREE.Mesh(
    cGeo,
    new THREE.MeshStandardMaterial({ map: curtainTex(), side: THREE.DoubleSide, roughness: 0.95, transparent: true, opacity: 0.93 }),
  );
  curtain.rotation.y = Math.PI / 2; // 平面局部 x → 室内 -z，平面法线 → 室内 +x（里屋）
  curtain.position.set(cx, dh + 0.03, dz);
  curtain.castShadow = true;
  curtain.userData.noAO = true;
  group.add(curtain);
  // 布上缝的一圈布套挂在竹竿上
  const hemTop = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, cw, 8), curtain.material);
  hemTop.rotation.x = Math.PI / 2;
  hemTop.position.set(cx, dh + 0.03, dz);
  group.add(hemTop);

  // —— 炕 ——
  const K = R.kang;
  const kang = box(IX0, IX1, 0, K.height, 0, K.depth, new THREE.MeshStandardMaterial({ map: plasterMap, color: 0xd2c6b2, roughness: 1 }));
  kang.name = 'kang';
  group.add(kang);
  // 炕席
  const reed = new THREE.MeshStandardMaterial({ map: reedMat(), roughness: 0.85 });
  const mt = new THREE.Mesh(new THREE.BoxGeometry(IX1 - IX0 - 0.02, 0.006, K.depth - 0.06), reed);
  mt.position.set((IX0 + IX1) / 2, K.height + 0.003, K.depth / 2 - 0.02);
  mt.receiveShadow = true;
  group.add(mt);
  // 炕沿：一根磨得发亮的木头
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.45 });
  group.add(box(IX0, IX1, K.height - 0.07, K.height + 0.02, K.depth - 0.1, K.depth + 0.01, edgeMat, { solid: false }));
  // 炕脸下沿踢脚的一道泥灰（脏）
  group.add(box(IX0, IX1, 0, 0.12, K.depth, K.depth + 0.006, new THREE.MeshStandardMaterial({ color: 0x6e655a, roughness: 1 }), { solid: false }));

  // —— 被子：东头靠后墙叠着 ——
  {
    const covers = [
      ['#b3192a', '#e86a86', '#f3a6b4', 3],
      ['#2f7a52', '#e4505a', '#f6c0c0', 5],
      ['#8e1c2a', '#f08a3a', '#f6c870', 7],
      ['#d1547a', '#ffffff', '#f5b8c8', 9],
      ['#1f4f8a', '#e8506a', '#f4d27a', 13],
    ];
    const qw = 1.15;
    const qd = 0.55;
    let y = K.height + 0.006;
    const cx0 = IX1 - qw / 2 - 0.08;
    covers.forEach(([base, f1, f2, seed], i) => {
      const th = 0.12 - i * 0.008;
      const geo = new RoundedBoxGeometry(qw - i * 0.02, th, qd - i * 0.01, 3, 0.035);
      const q = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: quiltTex(base, f1, f2, seed), roughness: 0.6 }));
      q.position.set(cx0 + (i % 2 ? 0.012 : -0.01), y + th / 2, qd / 2 + 0.06 + (i % 2) * 0.01);
      q.rotation.y = (i % 2 ? 1 : -1) * 0.012;
      q.castShadow = q.receiveShadow = true;
      group.add(q);
      y += th - 0.004;
    });
    // 两个枕头摞在被子上
    const pillowTex = canvasTex(128, 64, (g, w, h) => {
      g.fillStyle = '#f0ebe0';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c0303a';
      g.lineWidth = 2;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#c0303a';
      g.font = 'bold 22px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('喜', w / 2, h / 2);
    });
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.1, 0.32, 3, 0.045), new THREE.MeshStandardMaterial({ map: pillowTex, roughness: 0.8 }));
      p.position.set(cx0 - 0.15 + i * 0.32, y + 0.05, 0.25);
      p.castShadow = p.receiveShadow = true;
      group.add(p);
    }
  }

  // —— 拉线开关 + 灯泡 ——
  const S = R.pullSwitch;
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.7 });
  const sw = new THREE.Group();
  sw.position.set(IX0, S.y, S.z);
  const swBox = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.035, 18), new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.4 }));
  swBox.rotation.z = -Math.PI / 2;
  swBox.position.x = 0.018;
  sw.add(swBox);
  // 灯绳：白棉绳，下头一个小木坠
  const cord = new THREE.Group();
  const cordLen = S.y - S.cordEnd;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, cordLen, 4), new THREE.MeshStandardMaterial({ color: 0xe2dccd, roughness: 1 }));
  string.position.y = -cordLen / 2;
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8).scale(1, 1.6, 1), new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.5 }));
  bead.position.y = -cordLen;
  cord.add(string, bead);
  cord.position.set(0.035, -0.02, 0);
  sw.add(cord);
  group.add(sw);
  // 明线：开关往上到顶棚，再沿顶棚走到灯头；隔一段一个小卡子
  const B = R.bulb;
  const line = (a, b) => {
    const v = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, v.length(), 4), wireMat);
    m.position.copy(a).addScaledVector(v, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    group.add(m);
  };
  const ceil = ROOM.h - 0.004;
  const p0 = new THREE.Vector3(IX0 + 0.006, S.y + 0.03, S.z);
  const p1 = new THREE.Vector3(IX0 + 0.006, ceil, S.z);
  const p2 = new THREE.Vector3(B.x, ceil, S.z);
  const p3 = new THREE.Vector3(B.x, ceil, B.z);
  line(p0, p1);
  line(p1, p2);
  line(p2, p3);
  const clipMat = new THREE.MeshStandardMaterial({ color: 0xdcd6c8, roughness: 0.6 });
  for (const [a, b, n] of [[p0, p1, 2], [p1, p2, 3], [p2, p3, 2]]) {
    for (let i = 1; i <= n; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), clipMat);
      c.position.lerpVectors(a, b, i / (n + 1));
      group.add(c);
    }
  }
  // 灯：顶棚上的木圆盘、花线、胶木灯头、梨形灯泡
  const lamp = new THREE.Group();
  lamp.position.set(B.x, ROOM.h, B.z);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0xd8d0be, roughness: 0.6 }));
  rose.position.y = -0.01;
  const flex = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, B.drop, 5), wireMat);
  flex.position.y = -B.drop / 2;
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.055, 12), new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.4 }));
  holder.position.y = -B.drop - 0.027;
  const brass = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.022, 12), new THREE.MeshStandardMaterial({ color: 0xb08a48, roughness: 0.35, metalness: 0.8 }));
  brass.position.y = -B.drop - 0.064;
  const prof = [
    [0, -0.105], [0.012, -0.103], [0.022, -0.095], [0.029, -0.08], [0.03, -0.065], [0.026, -0.045], [0.018, -0.025], [0.014, -0.01], [0.013, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const glassOff = new THREE.MeshStandardMaterial({ color: 0xf2eee2, roughness: 0.12, transparent: true, opacity: 0.55 });
  const glassOn = new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffb45a, emissiveIntensity: 2.4, roughness: 0.3 });
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), glassOff);
  bulb.position.y = -B.drop - 0.075;
  bulb.userData.noAO = true;
  const filament = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0012, 4, 10, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5a4a3a }));
  filament.position.y = -B.drop - 0.13;
  lamp.add(rose, flex, holder, brass, bulb, filament);
  group.add(lamp);
  // 15 瓦左右的白炽灯：昏黄（约 2400 K），照不远
  const light = new THREE.PointLight(0xffa24e, 3.2, 6, 1.7);
  light.position.set(B.x, ROOM.h - B.drop - 0.12, B.z);
  light.visible = false;
  if (Q.tier === 'high') {
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.05;
    light.shadow.camera.far = 6;
    light.shadow.bias = -0.003;
  }
  group.add(light);

  // —— 南墙下做蜡烛的器具：两台挨着摆，一根胶皮水管从墙上挂下来接到槽子上 ——
  mats.candle = new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.5, emissive: 0x2a2418, emissiveIntensity: 0.15 });
  const zc = SOUTH - 0.05 - R.candles.depth / 2;
  const machines = [];
  const Lm = 0.85;
  const tops = [0xe8dfc2, 0xe2bc52]; // 一台刚浇了蜡（发黄）
  for (let i = 0; i < 2; i++) {
    const m = candleMachine(Lm, mats, { seed: 5 + i * 4, topWax: tops[i] });
    m.position.set(IX0 + 0.05 + Lm / 2 + i * (Lm + 0.04), 0, zc);
    group.add(m);
    machines.push(m);
  }
  {
    // 槽子东头一截铜管，接胶皮水管（往槽里灌凉水）；水管从墙上的钉子上搭下来
    const px = machines[0].position.x + Lm / 2 - 0.05;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a34, roughness: 0.4, metalness: 0.7 }));
    pipe.position.set(px, 0.8 + 0.07, zc - 0.08);
    pipe.rotation.z = 0.3;
    group.add(pipe);
    const nailX = px - 0.3;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px - 0.02, 0.94, zc - 0.08),
      new THREE.Vector3(px - 0.07, 1.18, zc - 0.03),
      new THREE.Vector3(nailX + 0.07, 1.4, SOUTH - 0.05),
      new THREE.Vector3(nailX, 1.45, SOUTH - 0.025),
      new THREE.Vector3(nailX - 0.08, 1.36, SOUTH - 0.03),
      new THREE.Vector3(nailX - 0.1, 1.12, SOUTH - 0.045),
      new THREE.Vector3(nailX - 0.04, 0.98, SOUTH - 0.06),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.011, 8), new THREE.MeshStandardMaterial({ color: 0x5a3222, roughness: 0.55 }));
    group.add(hose);
    const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 5).rotateX(Math.PI / 2), mats.iron);
    nail.position.set(nailX, 1.46, SOUTH - 0.03);
    group.add(nail);
  }
  const stove = stoveWithPot(mats);
  stove.position.set(IX1 - 0.2, 0, SOUTH - 0.24);
  group.add(stove);
  // 地上几滩踩扁的蜡
  {
    const r = rng(41);
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.02 + r() * 0.04, 10).rotateX(-Math.PI / 2), mats.waxOld);
      s.position.set(IX0 + 0.2 + r() * (IX1 - IX0 - 0.4), 0.002, SOUTH - 0.45 - r() * 0.5);
      s.scale.set(1, 1, 0.6 + r() * 0.6);
      s.receiveShadow = true;
      group.add(s);
    }
  }

  // —— 熏黑的南墙和顶棚 ——
  const wallW = IX1 - IX0;
  const u = (x) => (IX1 - x) / wallW; // 从屋里朝南看：贴图 u=0 在东头
  const sootWall = new THREE.Mesh(
    new THREE.PlaneGeometry(wallW, ROOM.h),
    new THREE.MeshStandardMaterial({
      map: sootTex([[u(stove.position.x), 1], [u(machines[0].position.x), 0.75], [u(machines[1].position.x), 0.8]], { top: 0.75 }),
      transparent: true,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  sootWall.rotation.y = Math.PI;
  sootWall.position.set((IX0 + IX1) / 2, ROOM.h / 2, SOUTH - t - 0.002);
  sootWall.userData.noAO = true;
  group.add(sootWall);
  const sootCeil = new THREE.Mesh(
    new THREE.PlaneGeometry(wallW, 1.8),
    new THREE.MeshStandardMaterial({
      map: canvasTex(128, 128, (g, w, h) => {
        const lin = g.createLinearGradient(0, 0, 0, h);
        lin.addColorStop(0, 'rgba(24,19,16,0.7)');
        lin.addColorStop(0.5, 'rgba(24,19,16,0.25)');
        lin.addColorStop(1, 'rgba(24,19,16,0)');
        g.fillStyle = lin;
        g.fillRect(0, 0, w, h);
      }),
      transparent: true,
      depthWrite: false,
      roughness: 1,
    }),
  );
  sootCeil.rotation.x = Math.PI / 2; // 朝下；贴图上沿（最黑）在南边
  sootCeil.position.set((IX0 + IX1) / 2, ROOM.h - 0.002, SOUTH - 0.9);
  sootCeil.userData.noAO = true;
  group.add(sootCeil);

  /* ---------- 交互和动画 ---------- */
  let on = false;
  let pull = 0; // 灯绳拉下去的动画进度
  const set = (v) => {
    on = v;
    light.visible = v;
    bulb.material = v ? glassOn : glassOff;
    filament.visible = !v;
  };
  const local = new THREE.Vector3();
  let curtainPush = 0;
  return {
    group,
    lamp: {
      get on() {
        return on;
      },
      set,
      /** 拉一下灯绳：咔哒，亮 / 灭 */
      pull() {
        pull = 1;
        clickSound();
        set(!on);
        return on;
      },
      /** 灯绳下头小木坠的世界坐标 */
      cordPosition: (target = new THREE.Vector3()) => bead.getWorldPosition(target),
    },
    /** 世界坐标 (x, z) 是否在里屋里 */
    inInnerRoom(x, z) {
      const lx = x - R.origin.x;
      const lz = z - R.origin.z;
      return lx > IX0 && lx < IX1 && lz > 0 && lz < SOUTH;
    },
    /** player：玩家脚下的世界坐标（走进去模式），没有则 null */
    update(dt, t, player) {
      // 灯绳一拽一弹
      if (pull > 0) {
        pull = Math.max(0, pull - dt * 4);
        const k = Math.sin((1 - pull) * Math.PI);
        cord.position.y = -0.02 - 0.05 * k;
      }
      // 门帘：平时轻轻晃，人走过来就被撩开
      const pos = cGeo.attributes.position;
      let push = 0;
      let pz = 0;
      let side = 1;
      if (player) {
        group.worldToLocal(local.copy(player));
        const dx = local.x - cx;
        const dzc = local.z - dz;
        if (Math.abs(dx) < 0.75 && Math.abs(dzc) < cw / 2 + 0.2) {
          push = Math.min(1, (0.75 - Math.abs(dx)) / 0.45);
          pz = dzc;
          side = dx < 0 ? 1 : -1; // 从外屋过来往里屋那边撩
        }
      }
      curtainPush += (push - curtainPush) * Math.min(1, dt * 6);
      for (let i = 0; i < pos.count; i++) {
        const bx = cBase[i * 3];
        const by = cBase[i * 3 + 1];
        const down = -by / ch; // 0 = 上沿，1 = 下沿
        const sway = Math.sin(t * 1.3 + bx * 3) * 0.008 * down;
        // 平面局部 x 对应室内 -z（旋转了 90°），平面法线 +z 对应室内 -x
        const near = Math.exp(-((-bx - pz) ** 2) / 0.12);
        const lift = curtainPush * near * down * down;
        pos.setZ(i, sway + side * lift * 0.45);
        pos.setY(i, by + lift * 0.18);
      }
      pos.needsUpdate = true;
      cGeo.computeVertexNormals();
    },
  };
}
