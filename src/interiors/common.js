import * as THREE from 'three';

/** 室内几个文件共用的小工具和贴图（canvas 现画） */
export function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
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
export function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** 四方连续地画一个径向渐变斑（拼接处不露缝） */
export function seamlessBlob(g, w, h, x, y, rad, rgb, a) {
  for (const ox of [-w, 0, w]) {
    for (const oy of [-h, 0, h]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(${rgb},${a})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  }
}

/** 炕席：高粱秆/苇子篾编的人字纹，发黄发旧 */
export function reedMat() {
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
export function quiltTex(base, flower, flower2, seed) {
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

/** 枕头：白布枕套，红线绣的边和“喜”字 */
export function pillowTex() {
  return canvasTex(128, 64, (g, w, h) => {
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
}

/** 一摞叠好的被子（缎子被面五种颜色轮着来）；返回 { group, top }，group 原点在最下面那床的底面中心，长边沿 x */
const COVERS = [
  ['#b3192a', '#e86a86', '#f3a6b4', 3],
  ['#2f7a52', '#e4505a', '#f6c0c0', 5],
  ['#8e1c2a', '#f08a3a', '#f6c870', 7],
  ['#d1547a', '#ffffff', '#f5b8c8', 9],
  ['#1f4f8a', '#e8506a', '#f4d27a', 13],
];
export function quiltStack(RoundedBoxGeometry, { count = 5, w = 1.15, d = 0.55, offset = 0 } = {}) {
  const g = new THREE.Group();
  let y = 0;
  for (let i = 0; i < count; i++) {
    const [base, f1, f2, seed] = COVERS[(i + offset) % COVERS.length];
    const th = 0.12 - i * 0.008;
    const q = new THREE.Mesh(new RoundedBoxGeometry(w - i * 0.02, th, d - i * 0.01, 3, 0.035), new THREE.MeshStandardMaterial({ map: quiltTex(base, f1, f2, seed), roughness: 0.6 }));
    q.position.set(i % 2 ? 0.012 : -0.01, y + th / 2, (i % 2) * 0.01);
    q.rotation.y = (i % 2 ? 1 : -1) * 0.012;
    q.castShadow = q.receiveShadow = true;
    g.add(q);
    y += th - 0.004;
  }
  return { group: g, top: y };
}

/**
 * 木纹（世界坐标 UV，1 格 = 1 m）：base 为 [r,g,b]；planks > 0 时每 planks 米一道板缝；varnish 越大越亮（清漆）
 */
export function woodTex(base, { seed = 1, planks = 0, dark = 0.35, along = 'v' } = {}) {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      g.fillRect(0, 0, w, h);
      g.save();
      if (along === 'u') {
        // 纹理横着走：转 90°
        g.translate(w, 0);
        g.rotate(Math.PI / 2);
      }
      for (let n = 0; n < 70; n++) {
        const x0 = r() * w;
        g.strokeStyle = r() > 0.5 ? `rgba(30,16,6,${0.1 + r() * dark * 0.5})` : `rgba(255,230,190,${0.05 + r() * 0.1})`;
        g.lineWidth = 0.5 + r() * 2;
        g.beginPath();
        g.moveTo(x0, 0);
        for (let y = 0; y <= h; y += 16) g.lineTo(x0 + Math.sin(y * 0.03 + n) * (1 + r() * 3), y);
        g.stroke();
      }
      if (planks > 0) {
        const pw = w * planks;
        g.fillStyle = 'rgba(25,14,6,0.7)';
        for (let x = 0; x < w; x += pw) g.fillRect(x, 0, 2, h);
      }
      g.restore();
      for (let n = 0; n < 300; n++) {
        g.fillStyle = r() > 0.5 ? 'rgba(20,10,4,0.12)' : 'rgba(255,240,210,0.06)';
        g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
      }
    },
    { repeat: [1, 1] },
  );
}

/** 刷了大白的墙，十几年下来：发黄发灰、一片片水渍烟渍、蹭脏的印子、苍蝇屎点 */
export function plasterTex() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(17);
      g.fillStyle = '#d9d3c4';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const c = ['196,180,140', '140,136,128', '170,160,136', '232,228,218'][Math.floor(r() * 4)];
        seamlessBlob(g, w, h, r() * w, r() * h, 15 + r() * 70, c, 0.08 + r() * 0.12);
      }
      // 往下流的水渍道道
      for (let i = 0; i < 14; i++) {
        const x = r() * w;
        const len = 40 + r() * 140;
        const y0 = r() * h;
        g.fillStyle = `rgba(160,140,100,${0.06 + r() * 0.08})`;
        for (let k = 0; k < len; k += 2) g.fillRect((x + Math.sin(k * 0.05) * 2 + w) % w, (y0 + k) % h, 2 + r() * 2, 2);
      }
      // 刷子的道道
      for (let y = 0; y < h; y += 3) {
        g.fillStyle = `rgba(255,250,236,${r() * 0.05})`;
        g.fillRect(0, y, w, 2);
      }
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(80,66,50,${0.06 + r() * 0.12})`;
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    },
    { repeat: [1 / 1.6, 1 / 1.6] },
  );
}

/** 墙根的水泥墙裙：灰色、抹子印、踢脏的印子 */
export function cementTex() {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      const r = rng(19);
      g.fillStyle = '#8a8680';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) seamlessBlob(g, w, h, r() * w, r() * h, 10 + r() * 50, r() > 0.5 ? '70,66,62' : '150,146,138', 0.12 + r() * 0.14);
      // 抹子抹出来的弧形印
      for (let i = 0; i < 40; i++) {
        const x = r() * w;
        const y = r() * h;
        g.strokeStyle = `rgba(${r() > 0.5 ? '160,156,148' : '100,96,90'},0.08)`;
        g.lineWidth = 3 + r() * 5;
        g.beginPath();
        g.arc(x, y, 60 + r() * 80, r() * 6, r() * 6 + 0.6);
        g.stroke();
      }
      for (let i = 0; i < 1500; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(40,38,34,0.25)' : 'rgba(200,196,188,0.2)';
        g.fillRect(r() * w, r() * h, 1, 1);
      }
    },
    { repeat: [1 / 1.2, 1 / 1.2] },
  );
}

/** 地面：平铺的旧砖（24 × 11.5 cm，错缝），淡红、磨得发白，砖缝里积着土；贴图 1.2 m 见方 */
export function floorTex() {
  return canvasTex(
    512,
    512,
    (g, w, h) => {
      const r = rng(29);
      const S = w / 1.2; // 像素/米
      g.fillStyle = '#86766a'; // 砖缝（积着土）
      g.fillRect(0, 0, w, h);
      const bw = 0.24 * S;
      const bh = w / 10; // 10 行
      for (let row = 0; row < 10; row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let i = -1; i < 6; i++) {
          const x = i * bw + off;
          const k = 0.88 + r() * 0.2;
          const worn = r();
          const base = [186 * k, 124 * k, 98 * k];
          const draw = (dx) => {
            g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
            g.fillRect(x + dx + 2, row * bh + 2, bw - 4, bh - 4);
            // 磨得发白、发亮的一块
            const gr = g.createRadialGradient(x + dx + bw / 2, row * bh + bh / 2, 0, x + dx + bw / 2, row * bh + bh / 2, bw * 0.6);
            gr.addColorStop(0, `rgba(214,176,150,${0.25 + worn * 0.35})`);
            gr.addColorStop(1, 'rgba(214,176,150,0)');
            g.fillStyle = gr;
            g.fillRect(x + dx + 2, row * bh + 2, bw - 4, bh - 4);
            // 坑坑洼洼、缺角
            for (let n = 0; n < 14; n++) {
              g.fillStyle = r() > 0.5 ? 'rgba(90,60,50,0.25)' : 'rgba(230,210,190,0.2)';
              g.fillRect(x + dx + 2 + r() * (bw - 6), row * bh + 2 + r() * (bh - 6), 1 + r() * 4, 1 + r() * 3);
            }
            if (r() > 0.7) {
              g.fillStyle = '#86766a';
              g.beginPath();
              const cx = x + dx + (r() > 0.5 ? 2 : bw - 2);
              const cy = row * bh + (r() > 0.5 ? 2 : bh - 2);
              g.arc(cx, cy, 3 + r() * 5, 0, Math.PI * 2);
              g.fill();
            }
          };
          draw(0);
          if (x + bw > w) draw(-w);
        }
      }
      // 一层浮土、走出来的发暗的道
      for (let i = 0; i < 40; i++) seamlessBlob(g, w, h, r() * w, r() * h, 30 + r() * 120, r() > 0.5 ? '130,104,84' : '200,170,140', 0.06 + r() * 0.1);
    },
    { repeat: [1 / 1.2, 1 / 1.2] },
  );
}


/**
 * 挂历的一页（用户给的 1993 年挂历照片）：图片画到 canvas 上，再做旧——纸发黄、边上发暗、受潮的斑。
 * 图片异步加载，加载完更新贴图。
 */
export function calendarTex(url, seed = 1) {
  const W = 400;
  const H = 540;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#d8ccb0';
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const img = new Image();
  img.onload = () => {
    g.drawImage(img, 0, 0, W, H);
    const r = rng(seed);
    // 纸发黄、褪色
    g.fillStyle = 'rgba(214,190,130,0.18)';
    g.fillRect(0, 0, W, H);
    const edge = g.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.78);
    edge.addColorStop(0, 'rgba(110,80,30,0)');
    edge.addColorStop(1, 'rgba(110,80,30,0.32)');
    g.fillStyle = edge;
    g.fillRect(0, 0, W, H);
    // 受潮的黄斑、折痕
    for (let i = 0; i < 6; i++) {
      const x = r() * W;
      const y = r() * H;
      const gr = g.createRadialGradient(x, y, 0, x, y, 15 + r() * 35);
      gr.addColorStop(0, 'rgba(170,130,60,0.18)');
      gr.addColorStop(1, 'rgba(170,130,60,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    g.strokeStyle = 'rgba(255,250,235,0.25)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, H * (0.55 + r() * 0.1));
    g.lineTo(W, H * (0.5 + r() * 0.1));
    g.stroke();
    t.needsUpdate = true;
  };
  img.src = url;
  return t;
}
