import { canvas, rng, textureSet, hash } from './canvas.js';

/**
 * 影背墙瓷砖画：公园、湖面、盛开的荷花与荷叶。
 * 由 cols × rows 块 20 cm 方瓷砖拼成，白色瓷砖缝，釉面光滑（低粗糙度）。
 * 返回 { set, tilesX, tilesY, tile }，set 为 PBR 纹理（UV 0..1 铺满整幅画，不平铺）。
 */
export function tileMural({ cols = 11, rows = 8 } = {}) {
  const T = 128; // 每块瓷砖的像素
  const c = canvas(cols * T, rows * T);
  const W = c.width;
  const H = c.height;
  const k = W / (cols * 160); // 分辨率缩放
  const ctx = c.getContext('2d');
  const r = rng(101);
  const horizon = H * 0.42;
  const shore = H * 0.5;

  // 天空
  let g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#4f8fcf');
  g.addColorStop(1, '#cfe4f2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizon + 2);
  // 云
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 5; i++) {
    const cx = r() * W;
    const cy = H * (0.06 + r() * 0.18);
    for (let j = 0; j < 7; j++) {
      ctx.beginPath();
      ctx.ellipse(cx + (j - 3) * 26 * k, cy + Math.sin(j) * 8 * k, (30 + r() * 30) * k, (14 + r() * 10) * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 远山
  const hills = (y0, amp, color, seed) => {
    const rr = rng(seed);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 2);
    for (let x = 0; x <= W; x += 20 * k) ctx.lineTo(x, y0 - amp * (0.5 + 0.5 * Math.sin(x / (W / 3) + rr() * 0.3) * Math.sin(x / (W / 7) + 1)));
    ctx.lineTo(W, horizon + 2);
    ctx.fill();
  };
  hills(horizon - 10 * k, 90 * k, '#8fb0b8', 3);
  hills(horizon, 55 * k, '#6f9a7c', 4);
  // 远处宝塔剪影
  ctx.fillStyle = '#5d7d70';
  const px = W * 0.78;
  for (let i = 0; i < 7; i++) {
    const w = (34 - i * 4) * k;
    const y = horizon - 20 * k - i * 22 * k;
    ctx.fillRect(px - w / 2, y - 18 * k, w, 18 * k);
    ctx.beginPath();
    ctx.moveTo(px - w / 2 - 10 * k, y - 16 * k);
    ctx.lineTo(px + w / 2 + 10 * k, y - 16 * k);
    ctx.lineTo(px, y - 26 * k);
    ctx.fill();
  }
  // 岸边树丛
  for (let i = 0; i < 40; i++) {
    const x = r() * W;
    ctx.fillStyle = ['#3f6b3c', '#4e7d43', '#35603a'][i % 3];
    ctx.beginPath();
    ctx.ellipse(x, horizon - 4 * k, (24 + r() * 30) * k, (18 + r() * 22) * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 湖面
  g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, '#8fc0d8');
  g.addColorStop(0.4, '#4f95bd');
  g.addColorStop(1, '#2e6f98');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, W, H - horizon);
  // 树影倒影 + 波光
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#2f5a3a';
  ctx.fillRect(0, horizon, W, 18 * k);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2 * k;
  for (let i = 0; i < 120; i++) {
    const x = r() * W;
    const y = horizon + 20 * k + r() * (H - horizon) * 0.6;
    const l = (10 + r() * 40) * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + l, y);
    ctx.stroke();
  }
  // 左侧垂柳
  const willow = (x, y, s) => {
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 12 * s * k;
    ctx.beginPath();
    ctx.moveTo(x, shore + 30 * k);
    ctx.quadraticCurveTo(x + 10 * k, y + 80 * s * k, x - 6 * k, y);
    ctx.stroke();
    for (let i = 0; i < 70; i++) {
      const sx = x + (r() - 0.5) * 220 * s * k;
      const sy = y + (r() - 0.6) * 60 * s * k;
      const len = (80 + r() * 160) * s * k;
      ctx.strokeStyle = ['#6f9a3a', '#8bb24a', '#5e8a34'][i % 3];
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + (r() - 0.5) * 30 * k, sy + len * 0.5, sx + (r() - 0.5) * 20 * k, sy + len);
      ctx.stroke();
    }
  };
  willow(W * 0.08, H * 0.12, 1.1);
  willow(W * 0.2, H * 0.2, 0.8);
  // 亭子（右侧，红柱、黄绿琉璃瓦）
  const pv = (x, y, s) => {
    const sk = s * k;
    ctx.fillStyle = '#c9c0ae';
    ctx.fillRect(x - 110 * sk, y + 120 * sk, 220 * sk, 22 * sk); // 台基
    ctx.fillStyle = '#b8322a';
    for (const dx of [-80, -28, 28, 80]) ctx.fillRect(x + dx * sk - 6 * sk, y + 30 * sk, 12 * sk, 92 * sk);
    ctx.fillStyle = '#2f6b52';
    ctx.beginPath();
    ctx.moveTo(x - 150 * sk, y + 26 * sk);
    ctx.quadraticCurveTo(x - 90 * sk, y + 30 * sk, x - 40 * sk, y - 40 * sk);
    ctx.lineTo(x + 40 * sk, y - 40 * sk);
    ctx.quadraticCurveTo(x + 90 * sk, y + 30 * sk, x + 150 * sk, y + 26 * sk);
    ctx.lineTo(x + 150 * sk, y + 40 * sk);
    ctx.lineTo(x - 150 * sk, y + 40 * sk);
    ctx.fill();
    ctx.fillStyle = '#d8b040';
    ctx.beginPath();
    ctx.arc(x, y - 48 * sk, 10 * sk, 0, Math.PI * 2);
    ctx.fill();
  };
  pv(W * 0.62, shore - 120 * k, 0.9);
  // 前景荷叶
  const leaf = (x, y, rad, tilt) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, tilt);
    const lg = ctx.createRadialGradient(0, 0, rad * 0.1, 0, 0, rad);
    lg.addColorStop(0, '#7fb04a');
    lg.addColorStop(1, '#3e7a32');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0.15, Math.PI * 2 - 0.15);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,230,150,0.6)';
    ctx.lineWidth = 2 * k;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rad * 0.95, Math.sin(a) * rad * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  };
  const flower = (x, y, s) => {
    ctx.strokeStyle = '#4c7a36';
    ctx.lineWidth = 5 * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 * k, y + 140 * s * k);
    ctx.stroke();
    const petals = [-1.1, -0.55, 0, 0.55, 1.1];
    for (const [i, a] of petals.entries()) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const pg = ctx.createLinearGradient(0, 0, 0, -60 * s * k);
      pg.addColorStop(0, '#f8e3ea');
      pg.addColorStop(1, i % 2 ? '#e0577f' : '#ea7096');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, -32 * s * k, 17 * s * k, 36 * s * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#e8c840';
    ctx.beginPath();
    ctx.ellipse(x, y - 12 * s * k, 12 * s * k, 7 * s * k, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const bud = (x, y, s) => {
    ctx.strokeStyle = '#4c7a36';
    ctx.lineWidth = 4 * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4 * k, y + 120 * s * k);
    ctx.stroke();
    ctx.fillStyle = '#e46a90';
    ctx.beginPath();
    ctx.ellipse(x, y - 20 * s * k, 14 * s * k, 26 * s * k, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 26; i++) leaf(r() * W, H * (0.68 + r() * 0.32), (60 + r() * 70) * k, 0.45 + r() * 0.2);
  [[0.3, 0.62, 1.2], [0.5, 0.7, 1], [0.72, 0.64, 1.3], [0.86, 0.76, 0.9], [0.15, 0.74, 0.95]].forEach(([fx, fy, s]) => flower(W * fx, H * fy, s));
  [[0.4, 0.66, 1], [0.62, 0.74, 0.9], [0.95, 0.68, 1]].forEach(([fx, fy, s]) => bud(W * fx, H * fy, s));
  for (let i = 0; i < 8; i++) leaf(r() * W, H * (0.88 + r() * 0.15), (80 + r() * 60) * k, 0.4);
  // 一对白鹅（公园湖面常见）
  ctx.fillStyle = '#ffffff';
  for (const [fx, fy] of [[0.44, 0.55], [0.5, 0.57]]) {
    ctx.beginPath();
    ctx.ellipse(W * fx, H * fy, 26 * k, 11 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(W * fx + 14 * k, H * fy - 30 * k, 6 * k, 26 * k);
    ctx.fillStyle = '#e09030';
    ctx.fillRect(W * fx + 18 * k, H * fy - 30 * k, 10 * k, 5 * k);
    ctx.fillStyle = '#ffffff';
  }

  // —— 瓷砖化：每块砖轻微色差，四周白缝，砖边微倒角 ——
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const tp = W / cols;
  const grout = Math.max(2, Math.round(5 * k));
  const hc = canvas(1, 1);
  const rc = canvas(1, 1);
  hc.width = rc.width = W;
  hc.height = rc.height = H;
  const hctx = hc.getContext('2d');
  const rctx = rc.getContext('2d');
  const hi = hctx.createImageData(W, H);
  const ri = rctx.createImageData(W, H);
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i += 4) {
      const tx = Math.floor(x / tp);
      const ty = Math.floor(y / tp);
      const lx = x - tx * tp;
      const ly = y - ty * tp;
      const e = Math.min(lx, ly, tp - lx, tp - ly);
      let hv;
      let rv;
      if (e < grout / 2) {
        d[i] = 236; d[i + 1] = 232; d[i + 2] = 222;
        hv = 0.1; rv = 0.9;
      } else {
        const v = 0.96 + hash(tx, ty, 9) * 0.08;
        d[i] = Math.min(255, d[i] * v); d[i + 1] = Math.min(255, d[i + 1] * v); d[i + 2] = Math.min(255, d[i + 2] * v);
        hv = 0.6 + Math.min(1, (e - grout / 2) / (4 * k)) * 0.3;
        rv = 0.42 + hash(tx, ty, 3) * 0.08;
      }
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = hv * 255; hi.data[i + 3] = 255;
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = rv * 255; ri.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  hctx.putImageData(hi, 0, 0);
  rctx.putImageData(ri, 0, 0);
  const set = textureSet({ color: c, height: hc, rough: rc, normalStrength: 3 }, 1, { repeat: false });
  return { set, tilesX: cols, tilesY: rows, tile: 0.2 };
}
