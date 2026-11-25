import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WEST_ROOM as R } from '../layout.js';
import { box } from '../core/box.js';
import { canvasTex, rng, reedMat, pillowTex, quiltStack, woodTex, seamlessBlob } from './common.js';

/**
 * 西北屋外屋的陈设（第 11 轮，按用户描述和照片）。坐标同 northWest.js：室内原点在西北角、地坪面，+x 东、+z 南。
 * - 西边一铺大木头炕，南北通长；炕沿朝外这一面摆着一排枕头，靠西墙摞着棉被
 * - 进门正对着、靠北墙（第 17 轮按用户的图）：一张翘头长条几，前面一张两开门的柜桌，两边各一把木椅子；柜桌上一台黑白电视（tv.toggle() 开关：亮线 → 雪花 → 黑白测试图），
 *   条几左边一座老座钟（按用户照片：横放木壳、拱顶、两边镶条立柱，指针走的是现在的时间），右边两个暖水壶、一盘茶具、一个茶叶筒
 * - 炕上挂一顶白纱蚊帐（第 17 轮）：四根竹竿撑着，朝外那面中间撩开、两边挂在钩子上
 * - 靠南墙一张折叠圆桌：深色桌面、斑驳，铁管腿生了锈
 * - 进门右手边（隔墙这边）一个洗脸盆架，上面一只搪瓷洋盆，架子上搭着毛巾
 * - 隔墙边、里屋门洞往北一点一台脚踏缝纫机
 */
const OX1 = R.partition.x - R.partition.thickness / 2; // 外屋东墙面（隔墙西面）
const SOUTH = R.size.d;
const O = R.outer;

/* ---------- 贴图 ---------- */
/** 黑白电视的正面：灰色金属框、圆角的灰绿屏幕、右边一条控制面板（红指示灯、四个小按钮、两个大旋钮、喇叭格栅） */
/** 暖水壶的铁壳：一种底色，上面印着花，上下两道细环 */
function flaskTex(col, seed) {
  return canvasTex(128, 128, (g, w, h) => {
    const r = rng(613 + seed);
    g.fillStyle = `rgb(${col.join(',')})`;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x = r() * w;
      const y = 30 + r() * 60;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.fillStyle = 'rgba(250,240,220,0.85)';
        g.beginPath();
        g.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 2.6, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#e8c040';
      g.beginPath();
      g.arc(x, y, 2.2, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(240,230,200,0.7)';
    g.fillRect(0, 10, w, 3);
    g.fillRect(0, h - 14, w, 3);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
  });
}

/** 蚊帐纱：很细的网眼 + 几道竖着的褶子（半透明白） */
function netTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(617);
    g.fillStyle = 'rgba(250,248,240,0.55)';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x, 0, 1, h);
    }
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(0, y, w, 1);
    }
    // 褶子：一道道竖着的亮暗
    for (let i = 0; i < 10; i++) {
      const x = r() * w;
      const gw = 8 + r() * 22;
      const gr = g.createLinearGradient(x - gw, 0, x + gw, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, r() > 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(170,166,156,0.3)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x - gw, 0, gw * 2, h);
    }
  }, { repeat: [1, 1] });
}

function tvFaceTex() {
  return canvasTex(512, 400, (g, w, h) => {
    const lin = g.createLinearGradient(0, 0, 0, h);
    lin.addColorStop(0, '#a08e76');
    lin.addColorStop(1, '#6e5e4c');
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    // 屏幕外圈的黑框
    const rr = (x, y, ww, hh, rad) => {
      g.beginPath();
      g.moveTo(x + rad, y);
      g.arcTo(x + ww, y, x + ww, y + hh, rad);
      g.arcTo(x + ww, y + hh, x, y + hh, rad);
      g.arcTo(x, y + hh, x, y, rad);
      g.arcTo(x, y, x + ww, y, rad);
      g.closePath();
    };
    g.fillStyle = '#1c1d1e';
    rr(24, 22, 352, 356, 40);
    g.fill();
    // 屏幕：灰绿，四周暗，左上一块窗户的反光
    const sg = g.createRadialGradient(200, 190, 20, 200, 200, 230);
    sg.addColorStop(0, '#9fb0aa');
    sg.addColorStop(0.7, '#7d8e8a');
    sg.addColorStop(1, '#3e4846');
    g.fillStyle = sg;
    rr(40, 38, 320, 324, 50);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(150, 90, 18, 40);
    g.fillRect(172, 90, 18, 40);
    // 右边控制面板
    g.fillStyle = '#857460';
    g.fillRect(392, 22, 100, 356);
    g.fillStyle = '#c03028';
    g.fillRect(402, 34, 22, 12); // 指示灯
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#2a2a2a';
      g.beginPath();
      g.arc(413, 72 + i * 30, 8, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#4a4c4e';
    g.fillRect(434, 40, 52, 170); // 旋钮底座
    g.fillStyle = '#9a9c9e';
    g.fillRect(400, 214, 86, 24); // 刻度窗
    g.fillStyle = '#3a3c3e';
    for (let x = 404; x < 482; x += 6) g.fillRect(x, 218, 2, 16);
    // 喇叭格栅
    g.fillStyle = '#4a4c4e';
    g.fillRect(400, 250, 86, 120);
    g.fillStyle = '#8a8c8e';
    for (let y = 256; y < 366; y += 7) g.fillRect(404, y, 78, 3);
    // 金属框上的拉丝和划痕
    const r = rng(91);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      g.fillRect(r() * w, r() * h, 1 + r() * 20, 1);
    }
  });
}

/** 座钟钟面（按用户照片）：外圈银白、黑色阿拉伯数字和分钟点，中间一圈露出木头，两个上弦孔 */
function clockFaceTex() {
  return canvasTex(256, 256, (g, w) => {
    const c = w / 2;
    const r = rng(107);
    // 外圈：银白
    const sg = g.createRadialGradient(c - 30, c - 30, 10, c, c, 128);
    sg.addColorStop(0, '#f2f0ea');
    sg.addColorStop(1, '#c8c6be');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(c, c, 128, 0, Math.PI * 2);
    g.fill();
    // 中间露出的木头
    g.fillStyle = '#c4703a';
    g.beginPath();
    g.arc(c, c, 66, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? '120,56,20' : '230,150,90'},0.25)`;
      g.lineWidth = 1 + r() * 2;
      const y = c - 66 + r() * 132;
      g.beginPath();
      g.moveTo(c - 66, y);
      g.quadraticCurveTo(c, y + (r() - 0.5) * 20, c + 66, y);
      g.stroke();
    }
    g.strokeStyle = '#9a9890';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(c, c, 66, 0, Math.PI * 2);
    g.stroke();
    // 分钟点
    g.fillStyle = '#2a2622';
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * Math.PI * 2;
      g.beginPath();
      g.arc(c + Math.sin(a) * 118, c - Math.cos(a) * 118, 1.8, 0, Math.PI * 2);
      g.fill();
    }
    // 数字
    g.font = 'bold 30px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillText(String(i), c + Math.sin(a) * 96, c - Math.cos(a) * 96);
    }
    // 两个上弦孔（4 点和 8 点方向）
    for (const sx of [-1, 1]) {
      g.fillStyle = '#b8b8b4';
      g.beginPath();
      g.arc(c + sx * 38, c + 28, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#141414';
      g.beginPath();
      g.arc(c + sx * 38, c + 28, 7, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 座钟两边立柱上镶的浅色人字纹木条 */
function inlayTex() {
  return canvasTex(32, 256, (g, w, h) => {
    g.fillStyle = '#c88a4a';
    g.fillRect(0, 0, w, h);
    for (let y = -16; y < h; y += 14) {
      g.fillStyle = '#e8c890';
      g.beginPath();
      g.moveTo(4, y);
      g.lineTo(w / 2, y + 8);
      g.lineTo(w - 4, y);
      g.lineTo(w - 4, y + 5);
      g.lineTo(w / 2, y + 13);
      g.lineTo(4, y + 5);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#7a4420';
    g.fillRect(0, 0, 3, h);
    g.fillRect(w - 3, 0, 3, h);
  });
}

/** 圆桌桌面：深褐色，漆磨掉了好多块，烫痕、碗底的白圈、刀划的道道 */
function tableTopTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(97);
    g.fillStyle = '#5c3a24';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 8 + r() * 40, r() > 0.6 ? '168,118,72' : '36,20,10', 0.25 + r() * 0.3);
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = `rgba(220,200,170,${0.15 + r() * 0.2})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(40 + r() * 176, 40 + r() * 176, 14 + r() * 10, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? '170,130,90' : '20,10,4'},0.3)`;
      g.lineWidth = 1;
      const x = r() * w;
      const y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 50);
      g.stroke();
    }
  });
}

/** 剪纸样的红色小花样（洋盆内外壁上一圈一圈的那种） */
function cutFlower(g, x, y, k, color) {
  g.fillStyle = color;
  // 中间一朵、两边两片斜叶
  g.beginPath();
  g.ellipse(x, y, 5 * k, 9 * k, 0, 0, Math.PI * 2);
  g.fill();
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(x + sx * 12 * k, y + 2 * k, 4 * k, 10 * k, sx * 0.7, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x + sx * 20 * k - 4 * k, y - 1 * k, 8 * k, 3 * k);
  }
}
/** 红色“囍”字（剪纸体，圆圈里） */
function xiChar(g, x, y, size, color) {
  g.save();
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, size * 0.62, 0, Math.PI * 2);
  g.stroke();
  g.font = `bold ${size}px "KaiTi", "STKaiti", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('囍', x, y + 1);
  g.restore();
}

/**
 * 洋瓷脸盆（按用户照片）：白搪瓷，口沿一圈大红边；内壁上沿一圈红色“囍”字和剪纸花样；
 * 外壁一圈红色叶子花样。贴图 u 绕一圈，v 按车床轮廓的点：0..0.4 外壁（下到上）、0.4..0.6 口沿、0.6..1 内壁（上到下）。
 */
function basinWallTex() {
  return canvasTex(1024, 256, (g, w, h) => {
    const RED = '#d42a2e';
    g.fillStyle = '#f6f4ee';
    g.fillRect(0, 0, w, h);
    const Y = (v) => (1 - v) * h;
    // 口沿红边
    g.fillStyle = RED;
    g.fillRect(0, Y(0.62), w, Y(0.4) - Y(0.62));
    // 内壁上沿：一圈“囍”和剪纸花交替
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * w;
      xiChar(g, x, Y(0.71), 30, RED);
      cutFlower(g, x + w / n / 2, Y(0.71), 1.2, RED);
    }
    g.fillStyle = RED;
    g.fillRect(0, Y(0.78), w, 3);
    // 外壁：一圈叶子花样
    for (let i = 0; i < 12; i++) {
      const x = ((i + 0.5) / 12) * w;
      cutFlower(g, x, Y(0.2), 1.5, RED);
      g.fillStyle = RED;
      g.fillRect(x + 28, Y(0.2) - 6, 14, 3);
      g.fillRect(x + 28, Y(0.2) + 2, 14, 3);
    }
  });
}

/** 洋盆盆底：中间一幅彩色的画（一对红金鱼、荷叶），四周一圈红线 */
function basinBottomTex() {
  return canvasTex(256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#f6f4ee';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = '#d42a2e';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(c, c, 110, 0, Math.PI * 2);
    g.stroke();
    // 荷叶
    g.fillStyle = '#3f8a5a';
    g.beginPath();
    g.ellipse(c + 30, c + 30, 46, 30, 0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#5aa0c8';
    g.beginPath();
    g.ellipse(c - 40, c + 40, 30, 14, -0.3, 0, Math.PI * 2);
    g.fill();
    // 两条金鱼
    const fish = (x, y, a, col) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(22, 0);
      g.quadraticCurveTo(50, -26, 46, 0);
      g.quadraticCurveTo(50, 26, 22, 0);
      g.fill();
      g.fillStyle = '#1a1a1a';
      g.beginPath();
      g.arc(-14, -4, 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
    };
    fish(c - 20, c - 30, -0.4, '#e8501e');
    fish(c + 10, c + 2, 2.6, '#d42a2e');
  });
}

/** 缝纫机机头：黑漆上描金色的花纹 */
function machineTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#141414';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8a050';
    g.lineWidth = 2;
    const r = rng(103);
    for (let i = 0; i < 8; i++) {
      const x = 20 + i * 28;
      g.beginPath();
      g.moveTo(x, h / 2);
      g.bezierCurveTo(x + 6, h / 2 - 20, x + 18, h / 2 - 20, x + 24, h / 2);
      g.bezierCurveTo(x + 18, h / 2 + 20, x + 6, h / 2 + 20, x, h / 2);
      g.stroke();
    }
    g.strokeRect(6, 10, w - 12, h - 20);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
      g.fillRect(r() * w, r() * h, 2, 1);
    }
  });
}

/** 毛巾：白底两道蓝条，搭在架子上 */
function towelTex() {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ece8de';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a6ea8';
    g.fillRect(0, 14, w, 6);
    g.fillRect(0, h - 20, w, 6);
  });
}

/* ---------- 电视开机 ---------- */
/** 开/关电视的声音：咔哒一下，开机再带一阵“沙沙”的雪花声 */
let audioCtx = null;
function tvSound(on) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    const len = on ? 1.4 : 0.04;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const k = i / d.length;
      // 开头一声咔哒，后面是越来越小的沙沙声
      d[i] = (Math.random() * 2 - 1) * (i < ctx.sampleRate * 0.02 ? 1 : on ? 0.25 * Math.pow(1 - k, 2) : 0);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3000;
    f.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    src.connect(f).connect(gain).connect(ctx.destination);
    src.start(t);
  } catch {
    /* 没有声音也不影响 */
  }
}

/**
 * 黑白电视的画面（canvas，每秒画 15 次）：开机先一道亮线拉开，然后一阵雪花，再出一幅黑白测试图
 * （灰阶条、圆和格子），一直带着点雪花、偶尔滚过一道暗带、亮度微微闪。
 */
function createTvScreen() {
  const W = 192;
  const H = 192;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const noise = g.createImageData(W, H);
  const card = document.createElement('canvas');
  card.width = W;
  card.height = H;
  {
    const k = card.getContext('2d');
    k.fillStyle = '#7a7a7a';
    k.fillRect(0, 0, W, H);
    // 格子
    k.strokeStyle = '#d8d8d8';
    k.lineWidth = 1;
    for (let x = 0; x <= W; x += 16) {
      k.beginPath();
      k.moveTo(x, 0);
      k.lineTo(x, H);
      k.stroke();
    }
    for (let y = 0; y <= H; y += 16) {
      k.beginPath();
      k.moveTo(0, y);
      k.lineTo(W, y);
      k.stroke();
    }
    // 中间大圆
    k.fillStyle = '#3a3a3a';
    k.beginPath();
    k.arc(W / 2, H / 2, 72, 0, Math.PI * 2);
    k.fill();
    // 圆里的灰阶条
    k.save();
    k.beginPath();
    k.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
    k.clip();
    for (let i = 0; i < 8; i++) {
      const v = Math.round(255 - i * 32);
      k.fillStyle = `rgb(${v},${v},${v})`;
      k.fillRect(W / 2 - 70 + i * 17.5, H / 2 - 30, 17.5, 40);
    }
    k.fillStyle = '#111';
    k.fillRect(W / 2 - 70, H / 2 + 10, 140, 18);
    k.fillStyle = '#eee';
    for (let x = W / 2 - 64; x < W / 2 + 64; x += 8) k.fillRect(x, H / 2 + 13, 3, 12);
    k.restore();
    k.strokeStyle = '#f0f0f0';
    k.lineWidth = 3;
    k.beginPath();
    k.arc(W / 2, H / 2, 72, 0, Math.PI * 2);
    k.stroke();
    k.beginPath();
    k.moveTo(W / 2, H / 2 - 72);
    k.lineTo(W / 2, H / 2 + 72);
    k.moveTo(W / 2 - 72, H / 2);
    k.lineTo(W / 2 + 72, H / 2);
    k.lineWidth = 1.5;
    k.stroke();
  }
  let acc = 0;
  let since = 0;
  let t0 = 0;
  /** t：开机后过了多少秒 */
  function draw(t) {
    const d = noise.data;
    const snow = t < 0.35 ? 0 : t < 1.4 ? 1 : 0.22; // 雪花有多重
    if (t >= 1.4) {
      g.globalAlpha = 1;
      g.drawImage(card, 0, Math.sin(t * 0.7) * 1.5);
    } else {
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
    }
    if (snow > 0) {
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255 * snow;
      }
      // putImageData 不混合：先画到临时画布再叠上去
      tmpCtx.putImageData(noise, 0, 0);
      g.drawImage(tmp, 0, 0);
    }
    if (t < 0.35) {
      // 开机：中间一道亮线往上下拉开
      const hh = (t / 0.35) * H;
      g.fillStyle = '#fff';
      g.fillRect(0, H / 2 - hh / 2, W, Math.max(2, hh));
    }
    // 滚过的暗带
    const by = ((t * 30) % (H * 3)) - H;
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, by, W, 24);
    // 扫描线
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    tex.needsUpdate = true;
  }
  const tmp = document.createElement('canvas');
  tmp.width = W;
  tmp.height = H;
  const tmpCtx = tmp.getContext('2d');
  return {
    tex,
    start() {
      t0 = performance.now();
      acc = 1;
    },
    update(dt) {
      since = (performance.now() - t0) / 1000; // 按真实时间走（帧率低也不拖长雪花）
      acc += dt;
      if (acc < 1 / 15) return;
      acc = 0;
      draw(since);
    },
  };
}

/* ---------- 小工具 ---------- */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/** a、b 之间一根圆管 */
function tube(group, a, b, r, material, radial = 8) {
  const v = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), radial), material);
  m.position.copy(a).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}
const blocker = (x0, x1, y0, y1, z0, z1) => box(x0, x1, y0, y1, z0, z1, new THREE.MeshBasicMaterial({ visible: false }));

export function createOuterRoom({ tc }) {
  const group = new THREE.Group();
  group.name = 'outer-room';
  const off = { solid: false };
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.55, metalness: 0.5 });

  // —— 西边的大木头炕（南北通长）——
  {
    const K = O.kang;
    const x0 = tc;
    const x1 = tc + K.width;
    const z0 = tc;
    const z1 = SOUTH - tc;
    const front = new THREE.MeshStandardMaterial({ map: woodTex([104, 64, 36], { seed: 5, planks: 0.18 }), roughness: 0.6 });
    group.add(box(x0, x1, 0, K.height - 0.04, z0, z1, front)); // 炕身（挡人）
    // 炕面：木板上铺炕席
    group.add(box(x0, x1 + 0.02, K.height - 0.04, K.height - 0.005, z0, z1, new THREE.MeshStandardMaterial({ map: woodTex([120, 78, 44], { seed: 6, planks: 0.25, along: 'u' }), roughness: 0.6 }), off));
    const mt = new THREE.Mesh(new THREE.BoxGeometry(K.width - 0.06, 0.006, z1 - z0 - 0.06), new THREE.MeshStandardMaterial({ map: reedMat(), roughness: 0.85 }));
    mt.position.set((x0 + x1) / 2 - 0.02, K.height - 0.002, (z0 + z1) / 2);
    mt.receiveShadow = true;
    group.add(mt);
    // 炕沿：磨得发亮的一根木头
    group.add(box(x1 - 0.08, x1 + 0.03, K.height - 0.08, K.height + 0.015, z0, z1, new THREE.MeshStandardMaterial({ color: 0x4e3220, roughness: 0.4 }), off));
    // 朝外这一面（炕沿这边）摆着一排枕头
    const pt = new THREE.MeshStandardMaterial({ map: pillowTex(), roughness: 0.8 });
    for (const z of [0.75, 1.55, 2.35, 3.15]) {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.1, 0.32, 3, 0.045), pt);
      p.rotation.y = Math.PI / 2;
      p.position.set(x1 - 0.3, K.height + 0.05, z);
      p.castShadow = p.receiveShadow = true;
      group.add(p);
    }
    // 棉被：靠西墙摞着
    const st = quiltStack(RoundedBoxGeometry, { count: 5, w: 1.2, d: 0.55, offset: 2 });
    st.group.rotation.y = Math.PI / 2; // 长边顺着西墙
    st.group.position.set(x0 + 0.33, K.height, 1.6);
    group.add(st.group);

    // 蚊帐：四根竹竿撑一个架子，白纱从顶上垂到炕面；朝外（东）那面中间撩开，两边各挽成一束挂在钩子上
    {
      const N = O.net;
      const nx0 = x0 + 0.03;
      const nx1 = x1 - 0.05;
      const nz0 = z0 + 0.03;
      const nz1 = z1 - 0.03;
      const yb = K.height;
      const yt = N.top;
      const bamboo = new THREE.MeshStandardMaterial({ color: 0xc8b078, roughness: 0.6 });
      for (const px of [nx0, nx1]) {
        for (const pz of [nz0, nz1]) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, yt - yb + 0.06, 8), bamboo);
          pole.position.set(px, (yb + yt) / 2 + 0.03, pz);
          group.add(pole);
        }
      }
      for (const [a, b] of [[[nx0, nz0], [nx1, nz0]], [[nx0, nz1], [nx1, nz1]], [[nx0, nz0], [nx0, nz1]], [[nx1, nz0], [nx1, nz1]]]) {
        tube(group, V3(a[0], yt, a[1]), V3(b[0], yt, b[1]), 0.01, bamboo, 6);
      }
      const tex = netTex();
      const netMat = (rx, ry) => {
        const t = tex.clone();
        t.repeat.set(rx, ry);
        return new THREE.MeshStandardMaterial({ map: t, color: 0xf6f3ea, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 });
      };
      const H2 = yt - yb;
      const panel = (w, rotY, x, z) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H2), netMat(w / 1.2, 1));
        m.rotation.y = rotY;
        m.position.set(x, yb + H2 / 2, z);
        m.userData.noAO = true;
        group.add(m);
      };
      // 顶、靠墙的三面
      const top = new THREE.Mesh(new THREE.PlaneGeometry(nx1 - nx0, nz1 - nz0), netMat(1, 3));
      top.rotation.x = Math.PI / 2;
      top.position.set((nx0 + nx1) / 2, yt, (nz0 + nz1) / 2);
      top.userData.noAO = true;
      group.add(top);
      panel(nz1 - nz0, Math.PI / 2, nx0, (nz0 + nz1) / 2);
      panel(nx1 - nx0, 0, (nx0 + nx1) / 2, nz0);
      panel(nx1 - nx0, 0, (nx0 + nx1) / 2, nz1);
      // 朝外那面：两头垂着，中间撩开
      const [o0, o1] = N.open;
      panel(o0 - nz0, Math.PI / 2, nx1, (nz0 + o0) / 2);
      panel(nz1 - o1, Math.PI / 2, nx1, (o1 + nz1) / 2);
      // 撩开的两片各挽成一束（上宽、在钩子处收紧、下面散开一点）
      const prof = [[0.09, 0], [0.06, 0.25], [0.025, 0.62], [0.05, 0.85], [0.1, H2]].map(([a, b]) => new THREE.Vector2(a, b));
      for (const zz of [o0, o1]) {
        const bunch = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), netMat(1, 1));
        bunch.material.opacity = 0.8;
        bunch.scale.set(0.45, 1, 1);
        bunch.position.set(nx1, yb, zz);
        bunch.userData.noAO = true;
        group.add(bunch);
        // 挂帐子的铜钩
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 12, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 0.9 }));
        hook.position.set(nx1 + 0.01, yb + 0.62, zz);
        hook.rotation.y = Math.PI / 2;
        group.add(hook);
      }
      // 顶上四边一道白布滚边
      const hemM = new THREE.MeshStandardMaterial({ color: 0xf4f1e6, roughness: 1 });
      group.add(box(nx0, nx1, yt - 0.06, yt, nz0 - 0.004, nz0 + 0.004, hemM, off));
      group.add(box(nx0, nx1, yt - 0.06, yt, nz1 - 0.004, nz1 + 0.004, hemM, off));
      group.add(box(nx1 - 0.004, nx1 + 0.004, yt - 0.06, yt, nz0, nz1, hemM, off));
    }
  }

  // —— 进门正对着、靠北墙：翘头长条几 + 前面的柜桌 + 两把椅子（第 17 轮按用户的图） ——
  const clockParts = {};
  const tvParts = {};
  {
    const D = O.desk;
    const A = D.altar;
    const C = D.cabinet;
    const darkWood = new THREE.MeshStandardMaterial({ map: woodTex([92, 50, 30], { seed: 21 }), roughness: 0.42 });
    const darkWood2 = new THREE.MeshStandardMaterial({ map: woodTex([78, 42, 26], { seed: 22 }), roughness: 0.5 });
    const chairWood = new THREE.MeshStandardMaterial({ map: woodTex([104, 46, 30], { seed: 23 }), roughness: 0.4 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xa88a5a, roughness: 0.35, metalness: 0.8 });

    // 条几：一块长面板，两头往上翘、卷出去；四条方腿，前面一道牙板，两头腿间有雕花的牙子和横枨
    {
      const z0 = tc;
      const z1 = tc + A.d;
      const x0 = D.x - A.w / 2;
      const x1 = D.x + A.w / 2;
      const T = 0.045;
      group.add(box(x0, x1, A.h - T, A.h, z0, z1, darkWood, off));
      for (const s2 of [-1, 1]) {
        const xe = s2 < 0 ? x0 : x1;
        // 翘头：面板两头往上卷
        const curl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, A.d - 0.02, 14, 1, false, 0, Math.PI * 1.3).rotateX(Math.PI / 2), darkWood);
        curl.position.set(xe - s2 * 0.02, A.h + 0.01, (z0 + z1) / 2);
        curl.rotation.z = s2 < 0 ? 0.6 : Math.PI - 1.9;
        curl.castShadow = true;
        group.add(curl);
        group.add(box(Math.min(xe, xe - s2 * 0.1), Math.max(xe, xe - s2 * 0.1), A.h, A.h + 0.02, z0 + 0.01, z1 - 0.01, darkWood, off));
        // 腿（离两头 0.12 m）
        const lx = xe - s2 * 0.15;
        for (const lz of [z0 + 0.03, z1 - 0.03]) group.add(box(lx - 0.025, lx + 0.025, 0, A.h - T, lz - 0.025, lz + 0.025, darkWood));
        // 腿间横枨、侧面的牙子
        group.add(box(lx - 0.015, lx + 0.015, 0.1, 0.14, z0 + 0.03, z1 - 0.03, darkWood2, off));
        group.add(box(lx - 0.012, lx + 0.012, A.h - 0.2, A.h - T, z0 + 0.03, z1 - 0.03, darkWood2, off));
        // 前面腿外侧的云纹牙子（一块挤出的弯板）
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.lineTo(0.12, 0);
        sh.quadraticCurveTo(0.1, -0.03, 0.06, -0.035);
        sh.quadraticCurveTo(0.03, -0.04, 0.02, -0.09);
        sh.quadraticCurveTo(0.01, -0.12, 0, -0.13);
        sh.closePath();
        const bracket = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false }), darkWood2);
        bracket.position.set(lx + s2 * 0.025, A.h - T, z1 - 0.02);
        bracket.scale.x = s2;
        group.add(bracket);
        const bracketIn = bracket.clone();
        bracketIn.position.x = lx - s2 * 0.025;
        bracketIn.scale.x = -s2;
        group.add(bracketIn);
      }
      // 前面的牙板（面板底下一长条）
      group.add(box(x0 + 0.15, x1 - 0.15, A.h - 0.12, A.h - T, z1 - 0.025, z1 - 0.01, darkWood2, off));
      group.add(box(x0 + 0.15, x1 - 0.15, A.h - 0.12, A.h - T, z0 + 0.01, z0 + 0.025, darkWood2, off));
    }

    // 柜桌：前面两扇对开的柜门（芯板），中间两根铜拉手，底下一圈带弯脚的牙板；挡人
    const cz0 = tc + C.z0;
    const cz1 = cz0 + C.d;
    {
      const x0 = D.x - C.w / 2;
      const x1 = D.x + C.w / 2;
      group.add(box(x0 + 0.02, x1 - 0.02, 0.06, C.h - 0.04, cz0, cz1 - 0.02, darkWood2)); // 柜体
      group.add(box(x0 - 0.015, x1 + 0.015, C.h - 0.04, C.h, cz0 - 0.01, cz1 + 0.015, darkWood, off)); // 台面（边上一圈线脚）
      group.add(box(x0 - 0.005, x1 + 0.005, C.h - 0.05, C.h - 0.04, cz0, cz1 + 0.008, darkWood2, off));
      // 四条腿 + 底下的牙板（中间挖出弧）
      for (const lx of [x0 + 0.01, x1 - 0.01]) group.add(box(lx - 0.025, lx + 0.025, 0, C.h - 0.04, cz1 - 0.05, cz1, darkWood, off));
      const apron = new THREE.Shape();
      const aw = C.w - 0.1;
      apron.moveTo(-aw / 2, 0.1);
      apron.lineTo(aw / 2, 0.1);
      apron.lineTo(aw / 2, 0.0);
      apron.quadraticCurveTo(aw / 2 - 0.04, 0.0, aw / 2 - 0.07, 0.045);
      apron.lineTo(-aw / 2 + 0.07, 0.045);
      apron.quadraticCurveTo(-aw / 2 + 0.04, 0.0, -aw / 2, 0.0);
      apron.closePath();
      const ap = new THREE.Mesh(new THREE.ExtrudeGeometry(apron, { depth: 0.02, bevelEnabled: false }), darkWood);
      ap.position.set(D.x, 0, cz1 - 0.02);
      ap.castShadow = true;
      group.add(ap);
      // 两扇柜门 + 芯板 + 拉手
      const fz = cz1 - 0.02;
      for (const s2 of [-1, 1]) {
        const a0 = s2 < 0 ? x0 + 0.04 : D.x + 0.004;
        const a1 = s2 < 0 ? D.x - 0.004 : x1 - 0.04;
        group.add(box(a0, a1, 0.12, C.h - 0.08, fz, fz + 0.018, darkWood, off));
        group.add(box(a0 + 0.045, a1 - 0.045, 0.17, C.h - 0.13, fz + 0.018, fz + 0.026, darkWood2, off));
        const pull = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.07, 3, 8), brass);
        pull.position.set(D.x + s2 * 0.035, C.h * 0.5, fz + 0.034);
        group.add(pull);
      }
    }

    // 两把木椅子：柜桌两边，椅背靠着条几，面朝南
    {
      const H = D.chairs;
      for (const s2 of [-1, 1]) {
        const ch = new THREE.Group();
        ch.position.set(D.x + s2 * H.dx, 0, (cz0 + cz1) / 2 + 0.02);
        const w2 = H.w / 2;
        const d2 = H.d / 2;
        ch.add(box(-w2, w2, H.seat - 0.03, H.seat, -d2, d2, chairWood, off)); // 座面
        ch.add(box(-w2 + 0.01, w2 - 0.01, H.seat - 0.07, H.seat - 0.03, d2 - 0.03, d2 - 0.01, chairWood, off)); // 前面的牙条
        for (const [lx, lz, top] of [[-w2 + 0.025, d2 - 0.025, H.seat - 0.03], [w2 - 0.025, d2 - 0.025, H.seat - 0.03], [-w2 + 0.025, -d2 + 0.025, H.back], [w2 - 0.025, -d2 + 0.025, H.back]]) {
          ch.add(box(lx - 0.02, lx + 0.02, 0, top, lz - 0.02, lz + 0.02, chairWood, off));
        }
        // 横枨
        ch.add(box(-w2 + 0.02, w2 - 0.02, 0.14, 0.17, d2 - 0.035, d2 - 0.015, chairWood, off));
        ch.add(box(-w2 + 0.02, w2 - 0.02, 0.1, 0.13, -d2 + 0.015, -d2 + 0.035, chairWood, off));
        for (const sx of [-1, 1]) ch.add(box(sx * (w2 - 0.035), sx * (w2 - 0.015), 0.2, 0.23, -d2 + 0.02, d2 - 0.02, chairWood, off));
        // 椅背：上面一道搭脑、下面一道横档，中间四根竖棂
        ch.add(box(-w2, w2, H.back - 0.06, H.back, -d2 + 0.005, -d2 + 0.045, chairWood, off));
        ch.add(box(-w2 + 0.02, w2 - 0.02, H.seat + 0.12, H.seat + 0.15, -d2 + 0.01, -d2 + 0.04, chairWood, off));
        for (let k = 0; k < 4; k++) {
          const sx = -0.105 + k * 0.07;
          ch.add(box(sx - 0.011, sx + 0.011, H.seat + 0.15, H.back - 0.06, -d2 + 0.015, -d2 + 0.035, chairWood, off));
        }
        ch.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
        group.add(ch);
        group.add(blocker(D.x + s2 * H.dx - w2, D.x + s2 * H.dx + w2, 0, H.back, ch.position.z - d2, ch.position.z + d2));
      }
    }

    // 条几右边的杂物：两个暖水壶、一个茶盘（几个茶杯、一把茶壶）、一个铁茶叶筒
    {
      const y = A.h;
      const zc = tc + A.d / 2;
      for (const [x, col, seed] of [[D.x + 0.5, [196, 40, 40], 1], [D.x + 0.64, [60, 120, 96], 2]]) {
        const th = new THREE.Group();
        const bodyT = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 20), new THREE.MeshStandardMaterial({ map: flaskTex(col, seed), roughness: 0.4, metalness: 0.3 }));
        bodyT.position.y = 0.17;
        const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.25, metalness: 0.85 }));
        shoulder.position.y = 0.345;
        const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.035, 12), new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 1 }));
        cork.position.y = 0.385;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 20), shoulder.material);
        foot.position.y = 0.01;
        th.add(bodyT, shoulder, cork, foot);
        th.traverse((o) => o.isMesh && (o.castShadow = true));
        th.position.set(x, y, zc - 0.04);
        group.add(th);
      }
      // 茶盘 + 茶壶 + 四个茶杯
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.22), new THREE.MeshStandardMaterial({ color: 0x8a2a22, roughness: 0.35 }));
      tray.position.set(D.x + 0.33, y + 0.006, zc + 0.04);
      group.add(tray);
      const porcelain = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.25 });
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), porcelain);
      pot.scale.y = 0.8;
      pot.position.set(D.x + 0.28, y + 0.056, zc + 0.03);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.06, 8), porcelain);
      spout.position.set(D.x + 0.34, y + 0.07, zc + 0.03);
      spout.rotation.z = -0.9;
      group.add(pot, spout);
      for (const [dx, dz] of [[0.38, -0.03], [0.42, 0.04], [0.36, 0.1], [0.27, 0.11]]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.019, 0.045, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.25, side: THREE.DoubleSide }));
        cup.position.set(D.x + dx, y + 0.035, zc + dz);
        group.add(cup);
      }
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.4, metalness: 0.5 }));
      can.position.set(D.x + 0.72, y + 0.07, zc + 0.1);
      group.add(can);
    }

    // 黑白电视（14 寸左右）：灰色金属壳，后面一个大屁股，顶上拉杆天线
    const tv = new THREE.Group();
    tv.position.set(D.x + 0.12, C.h, (cz0 + cz1) / 2 - 0.02);
    const shell = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.45, metalness: 0.25 });
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.1), [shell, shell, shell, shell, new THREE.MeshStandardMaterial({ map: tvFaceTex(), roughness: 0.35, metalness: 0.2 }), shell]);
    front.position.set(0, 0.21, 0.1);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.24), new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.7 }));
    back.position.set(0, 0.18, -0.07);
    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.012, 0.3), iron);
    feet.position.set(0, 0.006, 0.02);
    for (const m of [front, back]) m.castShadow = m.receiveShadow = true;
    tv.add(front, back, feet);
    // 两个大旋钮
    for (const y of [0.33, 0.25]) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.025, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4 }));
      k.position.set(0.21, y, 0.16);
      tv.add(k);
    }
    // 开着的时候的画面：盖在屏幕上，平时藏起来
    const screen = createTvScreen();
    const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.305, 0.315), new THREE.MeshBasicMaterial({ map: screen.tex, color: 0xd8dcd8 }));
    lit.position.set(-0.055, 0.21, 0.1505);
    lit.visible = false;
    lit.userData.noAO = true;
    tv.add(lit);
    const glow = new THREE.PointLight(0xd8e2ff, 0.9, 3, 2);
    glow.position.set(-0.05, 0.22, 0.45);
    glow.visible = false;
    tv.add(glow);
    Object.assign(tvParts, { tv, lit, glow, screen });
    // 屏幕上一层亮面（玻璃的反光）
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.31), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.25 }));
    glass.position.set(-0.05, 0.21, 0.152);
    glass.userData.noAO = true;
    tv.add(glass);
    tvParts.glass = glass;
    group.add(tv);

    // 电视左边一座老座钟（按用户照片）：横放的木壳，中间一块拱顶，两边两根立柱镶着浅色人字纹木条，
    // 正中一个大圆钟面、镀铬的圈、凸玻璃；钟面中间一圈露出木头，两个上弦孔
    const clock = new THREE.Group();
    clock.position.set(D.x - 0.45, A.h, tc + A.d / 2);
    const cwood = new THREE.MeshStandardMaterial({ map: woodTex([196, 108, 50], { seed: 13 }), roughness: 0.32 });
    const CD = 0.13; // 进深
    // 中间拱顶的壳：沿 z 挤出
    const shape = new THREE.Shape();
    shape.moveTo(-0.13, 0.012);
    shape.lineTo(0.13, 0.012);
    shape.lineTo(0.13, 0.235);
    shape.quadraticCurveTo(0, 0.3, -0.13, 0.235);
    shape.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: CD, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
    bodyGeo.translate(0, 0, -CD / 2);
    // 挤出体的 UV 是按坐标来的（米），正好配世界坐标的木纹
    const body = new THREE.Mesh(bodyGeo, cwood);
    body.castShadow = body.receiveShadow = true;
    clock.add(body);
    // 两边的立柱 + 镶条 + 小脚
    const inlay = new THREE.MeshStandardMaterial({ map: inlayTex(), roughness: 0.35 });
    for (const sx of [-1, 1]) {
      clock.add(box(sx > 0 ? 0.13 : -0.205, sx > 0 ? 0.205 : -0.13, 0.012, 0.215, -CD / 2 + 0.005, CD / 2 + 0.006, cwood, off));
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.19), inlay);
      strip.position.set(sx * 0.155, 0.115, CD / 2 + 0.0075);
      clock.add(strip);
      clock.add(box(sx * 0.17 - 0.025, sx * 0.17 + 0.025, 0, 0.012, -CD / 2 + 0.01, CD / 2 - 0.01, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.7 }), off));
    }
    // 钟面、镀铬圈、凸玻璃
    const fc = new THREE.Vector3(0, 0.135, CD / 2 + 0.006);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.098, 48), new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.45 }));
    face.position.copy(fc);
    clock.add(face);
    const chromeM = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.18, metalness: 0.95 });
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.008, 8, 48), chromeM);
    bezel.position.copy(fc);
    clock.add(bezel);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 8, 0, Math.PI * 2, 0, Math.asin(0.1 / 0.4)),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0.6, transparent: true, opacity: 0.16 }),
    );
    dome.rotation.x = Math.PI / 2;
    dome.position.set(fc.x, fc.y, fc.z - 0.4 * Math.cos(Math.asin(0.1 / 0.4)) + 0.002);
    dome.userData.noAO = true;
    clock.add(dome);
    // 侧面的小把手（开表蒙子的搭扣）
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.01), chromeM);
    latch.position.set(-0.108, fc.y, fc.z + 0.004);
    clock.add(latch);
    // 黑色的尖头指针
    const handMat = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.4, metalness: 0.3 });
    const hand = (len, wd) => {
      const sh = new THREE.Shape();
      sh.moveTo(-wd * 0.3, -0.012);
      sh.lineTo(wd * 0.3, -0.012);
      sh.lineTo(wd * 0.3, len * 0.6);
      sh.lineTo(wd, len * 0.72);
      sh.lineTo(0, len);
      sh.lineTo(-wd, len * 0.72);
      sh.lineTo(-wd * 0.3, len * 0.6);
      sh.closePath();
      const pv = new THREE.Group();
      pv.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), handMat));
      pv.position.set(fc.x, fc.y, fc.z + 0.004);
      clock.add(pv);
      return pv;
    };
    clockParts.hour = hand(0.05, 0.007);
    clockParts.minute = hand(0.078, 0.006);
    clockParts.minute.position.z += 0.001;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 12).rotateX(Math.PI / 2), handMat);
    hub.position.set(fc.x, fc.y, fc.z + 0.007);
    clock.add(hub);
    group.add(clock);
  }

  // —— 靠南墙的折叠圆桌：深色斑驳的桌面，铁管腿生锈 ——
  {
    const T = O.table;
    const tbl = new THREE.Group();
    tbl.position.set(T.x, 0, T.z);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.022, 40), [
      new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.5, metalness: 0.4 }), // 一圈包边
      new THREE.MeshStandardMaterial({ map: tableTopTex(), roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 }),
    ]);
    top.position.y = T.h - 0.011;
    top.castShadow = top.receiveShadow = true;
    tbl.add(top);
    const rust = new THREE.MeshStandardMaterial({ color: 0x7a4a34, roughness: 0.8, metalness: 0.3 });
    // 两个铁管框交叉支着（折叠桌）
    for (const s of [-1, 1]) {
      const a = V3(-0.22, T.h - 0.03, s * 0.18);
      const b = V3(0.22, T.h - 0.03, s * 0.18);
      tube(tbl, a, b, 0.011, rust);
      tube(tbl, a, V3(-0.26, 0, -s * 0.16), 0.011, rust);
      tube(tbl, b, V3(0.26, 0, -s * 0.16), 0.011, rust);
      tube(tbl, V3(-0.25, 0.16, -s * 0.12), V3(0.25, 0.16, -s * 0.12), 0.008, rust);
    }
    group.add(tbl);
    group.add(blocker(T.x - 0.3, T.x + 0.3, 0.2, T.h, T.z - 0.3, T.z + 0.3));
  }

  // —— 进门右手边的洗脸盆架 + 搪瓷洋盆 + 毛巾 ——
  {
    const W = O.washstand;
    const ws = new THREE.Group();
    ws.position.set(W.x, 0, W.z);
    const paint = new THREE.MeshStandardMaterial({ color: 0x6f9a86, roughness: 0.5, metalness: 0.3 });
    const ringY = 0.68;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.007, 6, 28).rotateX(Math.PI / 2), paint);
    ring.position.y = ringY;
    ws.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 24).rotateX(Math.PI / 2), paint);
    ring2.position.y = 0.26;
    ws.add(ring2);
    const legs = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => a + Math.PI / 2);
    for (const a of legs) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      tube(ws, V3(c * 0.16, ringY, s * 0.16), V3(c * 0.22, 0, s * 0.22), 0.008, paint);
    }
    // 靠墙那两根往上伸，顶上一根横杆搭毛巾
    const up = [V3(0.16, ringY, -0.1), V3(0.16, ringY, 0.1)];
    for (const p of up) tube(ws, p, V3(p.x + 0.02, 1.3, p.z), 0.008, paint);
    tube(ws, V3(0.18, 1.3, -0.12), V3(0.18, 1.3, 0.12), 0.008, paint);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.5, 1, 6), new THREE.MeshStandardMaterial({ map: towelTex(), side: THREE.DoubleSide, roughness: 1 }));
    // 对折搭在横杆上：前后两片
    towel.geometry.translate(0, -0.25, 0);
    const tp = towel.geometry.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(-tp.getY(i) * 3) * 0.01);
    for (const [dx, rot] of [[-0.012, 0], [0.012, Math.PI]]) {
      const t2 = towel.clone();
      t2.rotation.y = Math.PI / 2 + rot;
      t2.position.set(0.18 + dx, 1.3, 0);
      t2.castShadow = true;
      ws.add(t2);
    }
    // 洋瓷脸盆（按用户照片）：白搪瓷、大红口沿，内壁一圈“囍”和剪纸花，外壁一圈红叶子，盆底一对金鱼；盛着半盆水
    // 车床轮廓：外壁（下→上，5 个点）→ 口沿 → 内壁（上→下，5 个点），对应 basinWallTex 的 v
    const prof = [
      [0.11, 0], [0.125, 0.006], [0.148, 0.04], [0.168, 0.078], [0.18, 0.098],
      [0.188, 0.106],
      [0.176, 0.1], [0.163, 0.08], [0.143, 0.045], [0.123, 0.016], [0.105, 0.008],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const enamel = new THREE.MeshStandardMaterial({ map: basinWallTex(), roughness: 0.18, side: THREE.DoubleSide });
    const basin = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), enamel);
    basin.position.y = ringY - 0.02;
    basin.castShadow = true;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.106, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: basinBottomTex(), roughness: 0.18 }));
    bottom.position.y = ringY - 0.011;
    // 口沿卷边
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.005, 6, 48).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8282c, roughness: 0.25 }));
    rim.position.y = ringY + 0.085;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9ab0b0, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22 }));
    water.position.y = ringY + 0.03;
    water.userData.noAO = true;
    ws.add(basin, bottom, rim, water);
    group.add(ws);
    group.add(blocker(W.x - 0.2, W.x + 0.2, 0.2, 0.8, W.z - 0.2, W.z + 0.2));
  }

  // —— 隔墙边的脚踏缝纫机（长边顺着隔墙，人坐在西边朝东踩）——
  {
    const S = O.sewing;
    const x1 = OX1 - tc - 0.01;
    const x0 = x1 - S.depth;
    const z0 = S.z - S.len / 2;
    const z1 = S.z + S.len / 2;
    const H = 0.76;
    const teak = new THREE.MeshStandardMaterial({ map: woodTex([170, 96, 44], { seed: 17, along: 'u' }), roughness: 0.4 });
    group.add(box(x0 - 0.01, x1 + 0.005, H - 0.025, H, z0, z1, teak, off)); // 台板
    // 台板下：北头一个抽屉、中间挡板
    group.add(box(x0 + 0.02, x1 - 0.02, H - 0.16, H - 0.025, z0 + 0.03, z0 + 0.26, teak, off));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 0.4 }));
    knob.position.set(x0 + 0.01, H - 0.09, z0 + 0.145);
    group.add(knob);
    group.add(box(x0 + 0.06, x1 - 0.04, H - 0.14, H - 0.025, z0 + 0.3, z1 - 0.06, teak, off));
    // 两头的铸铁架子
    for (const z of [z0 + 0.04, z1 - 0.04]) {
      group.add(box(x0 + 0.02, x0 + 0.05, 0.03, H - 0.03, z - 0.015, z + 0.015, iron, off));
      group.add(box(x1 - 0.05, x1 - 0.02, 0.03, H - 0.03, z - 0.015, z + 0.015, iron, off));
      group.add(box(x0, x1, 0, 0.04, z - 0.025, z + 0.025, iron, off)); // 脚
      group.add(box(x0 + 0.02, x1 - 0.02, H - 0.06, H - 0.03, z - 0.015, z + 0.015, iron, off));
      tube(group, V3(x0 + 0.04, 0.12, z), V3(x1 - 0.04, H - 0.08, z), 0.01, iron); // 斜撑
    }
    group.add(box(x1 - 0.05, x1 - 0.02, 0.2, 0.24, z0 + 0.04, z1 - 0.04, iron, off)); // 后面的拉杆
    // 脚踏板（斜着）
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.42), iron);
    pedal.position.set((x0 + x1) / 2, 0.11, S.z - 0.04);
    pedal.rotation.z = 0.18;
    pedal.castShadow = true;
    group.add(pedal);
    // 南头的大皮带轮
    const wheel = new THREE.Group();
    wheel.position.set((x0 + x1) / 2 + 0.03, 0.34, z1 - 0.1);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 32), iron)); // 轮子在竖直面上，和两头的铁架子平行
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      tube(wheel, V3(0, 0, 0), V3(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0), 0.006, iron);
    }
    group.add(wheel);
    // 机头：黑漆描金，臂顺着隔墙（北头是针、南头是手轮）
    const head = new THREE.Group();
    head.position.set((x0 + x1) / 2 - 0.02, H, S.z);
    const black = new THREE.MeshStandardMaterial({ map: machineTex(), roughness: 0.25, metalness: 0.3 });
    const blk = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.25, metalness: 0.3 });
    const add = (w, h, d, x, y, z, m = black) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      b.castShadow = b.receiveShadow = true;
      head.add(b);
      return b;
    };
    add(0.18, 0.045, 0.37, 0, 0.022, 0, blk); // 底板
    add(0.08, 0.19, 0.075, 0, 0.14, 0.13); // 立柱（南头）
    add(0.075, 0.07, 0.32, 0, 0.255, -0.01); // 横臂
    add(0.075, 0.12, 0.065, 0, 0.21, -0.17); // 机头（北头）
    const steel = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.25, metalness: 0.9 });
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), steel);
    needle.position.set(0, 0.1, -0.17);
    head.add(needle);
    const hw = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24).rotateX(Math.PI / 2), steel);
    hw.position.set(0, 0.22, 0.19);
    head.add(hw);
    // 线轴
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xb02a2a, roughness: 0.8 }));
    spool.position.set(0, 0.31, 0.05);
    head.add(spool);
    group.add(head);
    // 皮带：从大轮子上到手轮
    tube(group, V3(wheel.position.x, wheel.position.y + 0.15, wheel.position.z), V3(head.position.x, H + 0.22, S.z + 0.19), 0.003, new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 }), 4);
    group.add(blocker(x0, x1, 0.15, H, z0, z1));
  }

  const now = new Date();
  let tvOn = false;
  const tvPos = new THREE.Vector3();
  return {
    group,
    tv: {
      get on() {
        return tvOn;
      },
      /** 按一下电视的开关：屏幕亮 / 灭 */
      toggle() {
        tvOn = !tvOn;
        tvParts.lit.visible = tvOn;
        tvParts.glow.visible = tvOn;
        tvParts.glass.visible = !tvOn; // 开着时不要玻璃反光（屏幕前那盏小灯会在玻璃上照出一个亮点）
        if (tvOn) tvParts.screen.start();
        tvSound(tvOn);
        return tvOn;
      },
      /** 屏幕中心的世界坐标 */
      position: (target = tvPos) => tvParts.lit.getWorldPosition(target),
    },
    update(dt, t) {
      if (tvOn) {
        tvParts.screen.update(dt);
        tvParts.glow.intensity = 0.9 * (0.85 + Math.random() * 0.15);
      }
      const { hour, minute } = clockParts;
      now.setTime(Date.now());
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      // 钟面朝 +z：指针绕 z 轴转（顺时针为负）
      hour.rotation.z = -(h / 12) * Math.PI * 2;
      minute.rotation.z = -(m / 60) * Math.PI * 2;
    },
  };
}
