import { canvasTex, rng } from '../interiors/common.js';

/** 一个径向渐变的斑（只画在自己的范围里，比 seamlessBlob 省） */
function spot(g, x, y, rad, rgb, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/**
 * 墙皮剥落用的小工具（第 16 轮，厨房按用户照片）：
 * - blobPath：在一个矩形范围里画一块边缘参差不齐的“皮”（大小起伏 + 小豁口），贴着画布边的那一侧不往里缩
 * - remnantPlasterTex：外墙——旧砖上剩下的一块块泥灰皮（不透明），其余透明；檐下一溜被雨水和烟熏黑
 * - peeledTex：内墙——洋灰掉了的一块，露出底灰和里面的砖（不透明），其余透明
 */
export function blobPath(g, x0, y0, x1, y1, r, { jag = 0.22, W = Infinity, H = Infinity } = {}) {
  const w = x1 - x0;
  const h = y1 - y0;
  const amp = Math.min(w, h) * jag;
  // 一圈多尺度噪声（首尾接上）
  const N = Math.max(40, Math.round((w + h) / 5));
  const waves = [0, 1, 2].map((k) => ({ f: [2, 5, 13][k] + Math.floor(r() * 3), p: r() * 6.28, a: [0.5, 0.3, 0.2][k] }));
  const noise = (t) => waves.reduce((s, q) => s + Math.sin(t * q.f * Math.PI * 2 + q.p) * q.a, 0);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    // 沿矩形周长走
    const per = 2 * (w + h);
    let d = t * per;
    let x;
    let y;
    let nx;
    let ny;
    if (d < w) [x, y, nx, ny] = [x0 + d, y0, 0, 1];
    else if ((d -= w) < h) [x, y, nx, ny] = [x1, y0 + d, -1, 0];
    else if ((d -= h) < w) [x, y, nx, ny] = [x1 - d, y1, 0, -1];
    else [x, y, nx, ny] = [x0, y1 - (d - w), 1, 0];
    // 贴着画布边（墙顶、墙角）的不缩
    const atEdge = (ny === 1 && y0 <= 0.5) || (ny === -1 && y1 >= H - 0.5) || (nx === 1 && x0 <= 0.5) || (nx === -1 && x1 >= W - 0.5);
    let k = atEdge ? 0 : amp * (0.55 + 0.45 * noise(t)) + (r() < 0.08 ? r() * amp * 0.6 : 0) + r() * amp * 0.08;
    pts.push([x + nx * k, y + ny * k]);
  }
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

/** 画布上随机弯弯曲曲的裂缝 */
function cracks(g, r, x0, y0, x1, y1, n, color, wd) {
  for (let i = 0; i < n; i++) {
    let x = x0 + r() * (x1 - x0);
    let y = y0 + r() * (y1 - y0);
    let a = r() * Math.PI * 2;
    g.strokeStyle = color;
    g.lineWidth = wd;
    g.beginPath();
    g.moveTo(x, y);
    const len = 4 + r() * 10;
    for (let k = 0; k < len; k++) {
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a) * 5;
      y += Math.sin(a) * 5;
      g.lineTo(x, y);
    }
    g.stroke();
  }
}

/**
 * 外墙一整面的“残留泥皮”贴花：length × height（米），regions 为 { a0, a1, y0, y1 }（a 从画布左边量起，米），
 * holes 为门窗洞（同样的单位），画成透明。PX = 每米像素。
 */
export function remnantPlasterTex(length, height, regions, holes = [], seed = 1, PX = 128) {
  const w = Math.round(length * PX);
  const h = Math.round(height * PX);
  return canvasTex(w, h, (g) => {
    const r = rng(701 + seed);
    const Y = (y) => h - y * PX; // 高度（米，从地面量）→ 画布 y
    for (const rg of regions) {
      const x0 = rg.a0 * PX;
      const x1 = rg.a1 * PX;
      const y0 = Y(rg.y1);
      const y1 = Y(rg.y0);
      // 泥皮有厚度：边下面一道暗影
      g.save();
      g.translate(2, 3);
      blobPath(g, x0, y0, x1, y1, rng(900 + seed * 31 + Math.round(x0)), { W: w, H: h });
      g.fillStyle = 'rgba(40,28,20,0.55)';
      g.fill();
      g.restore();
      blobPath(g, x0, y0, x1, y1, rng(900 + seed * 31 + Math.round(x0)), { W: w, H: h });
      g.save();
      g.clip();
      g.fillStyle = '#bfa888';
      g.fillRect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40);
      for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 900; i++) {
        const c = ['170,148,118', '206,190,160', '150,128,100', '214,200,172'][Math.floor(r() * 4)];
        spot(g, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 6 + r() * 30, c, 0.18 + r() * 0.2);
      }
      cracks(g, r, x0, y0, x1, y1, Math.ceil(((x1 - x0) * (y1 - y0)) / 5000), 'rgba(60,44,30,0.6)', 1.2);
      for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 30; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(80,62,44,0.22)' : 'rgba(240,228,206,0.2)';
        g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 1, 1);
      }
      g.restore();
      // 断口一道亮边
      blobPath(g, x0, y0, x1, y1, rng(900 + seed * 31 + Math.round(x0)), { W: w, H: h });
      g.strokeStyle = 'rgba(228,214,190,0.55)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    // 檐下一溜被雨水、烟熏黑（砖上也黑），往下一道道流痕
    const gr = g.createLinearGradient(0, 0, 0, 0.55 * PX);
    gr.addColorStop(0, 'rgba(34,28,24,0.62)');
    gr.addColorStop(1, 'rgba(34,28,24,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, 0.55 * PX);
    for (let i = 0; i < length * 8; i++) {
      const x = r() * w;
      const l = (0.3 + r() * 0.9) * PX;
      const sg = g.createLinearGradient(0, 0, 0, l);
      sg.addColorStop(0, `rgba(30,24,20,${0.15 + r() * 0.2})`);
      sg.addColorStop(1, 'rgba(30,24,20,0)');
      g.fillStyle = sg;
      g.fillRect(x, 0, 2 + r() * 6, l);
    }
    // 门窗洞挖空
    for (const o of holes) g.clearRect(o.a0 * PX - 1, Y(o.y1) - 1, (o.a1 - o.a0) * PX + 2, (o.y1 - o.y0) * PX + 2);
  });
}

/** 内墙洋灰掉了的一块：外圈一层粗糙的底灰，中间露出旧砖；w × h 米 */
export function peeledTex(wm, hm, seed = 1, PX = 128) {
  const w = Math.max(16, Math.round(wm * PX));
  const h = Math.max(16, Math.round(hm * PX));
  return canvasTex(w, h, (g) => {
    const r = rng(733 + seed);
    // 底灰：比面层暗、粗糙
    blobPath(g, 2, 2, w - 2, h - 2, rng(811 + seed));
    g.save();
    g.clip();
    g.fillStyle = '#7f776c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < (w * h) / 600; i++) spot(g, r() * w, r() * h, 4 + r() * 18, r() > 0.5 ? '110,102,92' : '160,150,138', 0.3);
    g.restore();
    // 里面露出的砖（淡红、熏得发暗）
    const ins = Math.min(w, h) * 0.07;
    blobPath(g, ins, ins, w - ins, h - ins, rng(823 + seed), { jag: 0.3 });
    g.save();
    g.clip();
    g.fillStyle = '#6c5a4c'; // 砖缝
    g.fillRect(0, 0, w, h);
    const bw = 0.24 * PX;
    const bh = 0.06 * PX;
    for (let row = 0; row * bh < h; row++) {
      for (let col = -1; col * bw < w; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0);
        const k = 0.8 + r() * 0.3;
        g.fillStyle = `rgb(${150 * k},${100 * k},${82 * k})`;
        g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, bh - 3);
        if (r() < 0.4) {
          g.fillStyle = 'rgba(200,190,176,0.35)'; // 砖面上没刮干净的灰
          g.fillRect(x + r() * bw * 0.6, row * bh + 1.5, bw * (0.2 + r() * 0.4), bh - 3);
        }
      }
    }
    g.restore();
    // 外圈断口：一道细亮边（洋灰层的厚度）
    blobPath(g, 2, 2, w - 2, h - 2, rng(811 + seed));
    g.strokeStyle = 'rgba(196,190,180,0.55)';
    g.lineWidth = 1.2;
    g.stroke();
  });
}
