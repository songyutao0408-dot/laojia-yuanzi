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

/**
 * 八九十年代的女明星海报（画的，不对应任何真人）：影楼布景色的底子，大波浪烫发、红嘴唇、垫肩衣服，
 * 角上印着几个字；纸已经发黄，四角压着透明胶条。
 */
export function posterTex({ bg1, bg2, dress, hair, tilt, text, seed }) {
  return canvasTex(256, 370, (g, w, h) => {
    const r = rng(seed);
    g.filter = 'blur(0.7px)'; // 印刷品的柔和感
    const lin = g.createLinearGradient(0, 0, 0, h);
    lin.addColorStop(0, bg1);
    lin.addColorStop(1, bg2);
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.1})`;
      g.beginPath();
      g.arc(r() * w, r() * h * 0.6, 10 + r() * 30, 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.translate(w / 2, h * 0.42);
    g.rotate(tilt);
    // 头发：后面一大团蓬松卷发
    g.fillStyle = hair;
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const rad = 50 + r() * 40;
      g.beginPath();
      g.arc(Math.cos(a) * rad * 0.8, Math.sin(a) * rad * 0.9 + 25, 18 + r() * 14, 0, Math.PI * 2);
      g.fill();
    }
    // 肩膀、垫肩衣服
    g.fillStyle = dress;
    g.beginPath();
    g.moveTo(-110, 200);
    g.quadraticCurveTo(-100, 95, -40, 85);
    g.lineTo(40, 85);
    g.quadraticCurveTo(100, 95, 110, 200);
    g.closePath();
    g.fill();
    // 脖子、V 领
    const skin = '#f0c8a6';
    g.fillStyle = skin;
    g.fillRect(-16, 40, 32, 50);
    g.beginPath();
    g.moveTo(-26, 86);
    g.lineTo(0, 130);
    g.lineTo(26, 86);
    g.fill();
    // 脸
    const fg = g.createRadialGradient(-8, -6, 4, 0, 0, 52);
    fg.addColorStop(0, '#f8dcc0');
    fg.addColorStop(1, '#e2ae8c');
    g.fillStyle = fg;
    g.beginPath();
    g.ellipse(0, 0, 38, 50, 0, 0, Math.PI * 2);
    g.fill();
    // 腮红
    for (const sx of [-1, 1]) {
      const bg = g.createRadialGradient(sx * 20, 14, 0, sx * 20, 14, 16);
      bg.addColorStop(0, 'rgba(230,120,120,0.35)');
      bg.addColorStop(1, 'rgba(230,120,120,0)');
      g.fillStyle = bg;
      g.fillRect(-40, -10, 80, 50);
    }
    // 刘海
    g.fillStyle = hair;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(-34 + i * 8.5, -42 + Math.sin(i) * 4, 13, 0, Math.PI * 2);
      g.fill();
    }
    // 眉、眼、鼻、嘴
    g.strokeStyle = '#3a2620';
    g.lineWidth = 2.2;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * 7, -14);
      g.quadraticCurveTo(sx * 17, -21, sx * 28, -15);
      g.stroke();
      g.fillStyle = '#fff8f0';
      g.beginPath();
      g.ellipse(sx * 16, -6, 8, 3.6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a1a14';
      g.beginPath();
      g.arc(sx * 15, -6, 3.4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#1e1410';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(sx * 7, -7);
      g.quadraticCurveTo(sx * 16, -12, sx * 25, -6);
      g.stroke();
    }
    g.strokeStyle = 'rgba(170,110,90,0.6)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-2, 0);
    g.quadraticCurveTo(-5, 14, 0, 16);
    g.stroke();
    g.fillStyle = '#c4283a';
    g.beginPath();
    g.moveTo(-12, 28);
    g.quadraticCurveTo(0, 22, 12, 28);
    g.quadraticCurveTo(0, 37, -12, 28);
    g.fill();
    // 耳环
    g.fillStyle = '#f4ecd8';
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * 37, 14, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    // 头发上的光泽
    g.strokeStyle = 'rgba(255,240,220,0.18)';
    g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.arc(-30 + r() * 60, -30 + r() * 40, 30 + r() * 30, -2.4 + r(), -1.4 + r());
      g.stroke();
    }
    g.restore();
    g.filter = 'none';
    // 印的字
    g.fillStyle = 'rgba(255,240,120,0.95)';
    g.strokeStyle = 'rgba(160,20,30,0.9)';
    g.lineWidth = 3;
    g.font = 'bold 34px "KaiTi", "STKaiti", serif';
    g.textAlign = 'center';
    for (let i = 0; i < text.length; i++) {
      g.strokeText(text[i], w - 28, 46 + i * 38);
      g.fillText(text[i], w - 28, 46 + i * 38);
    }
    // 纸发黄、边上磨毛
    g.fillStyle = 'rgba(210,180,110,0.22)';
    g.fillRect(0, 0, w, h);
    const edge = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
    edge.addColorStop(0, 'rgba(120,90,40,0)');
    edge.addColorStop(1, 'rgba(120,90,40,0.35)');
    g.fillStyle = edge;
    g.fillRect(0, 0, w, h);
    // 四角的透明胶条
    g.fillStyle = 'rgba(240,220,160,0.55)';
    for (const [x, y, a] of [[0, 0, 0.7], [w, 0, -0.7], [0, h, -0.7], [w, h, 0.7]]) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillRect(-26, -7, 52, 14);
      g.restore();
    }
  });
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
