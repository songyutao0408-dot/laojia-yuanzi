// 由 src/layout.js 生成俯视平面图 docs/plan.svg（上北下南、左西右东）
// 用法：npm run plan
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as L from '../src/layout.js';

const S = 50; // 1 m = 50 px
const PAD = 130; // 左/上留白（大门标注在西侧墙外）
const PADR = 110;
const W = (L.LOT.x1 - L.LOT.x0) * S + PAD + PADR;
const H = (L.LOT.z1 - L.LOT.z0) * S + PAD + 90;
const X = (x) => PAD + (x - L.LOT.x0) * S;
const Y = (z) => PAD + (z - L.LOT.z0) * S; // SVG 的 y 向下 = +Z（南）
const f = (n) => +n.toFixed(1);

const out = [];
const rect = (r, style) =>
  out.push(`<rect x="${f(X(r.x0))}" y="${f(Y(r.z0))}" width="${f((r.x1 - r.x0) * S)}" height="${f((r.z1 - r.z0) * S)}" ${style}/>`);
const text = (x, z, s, style = '') =>
  out.push(`<text x="${f(X(x))}" y="${f(Y(z))}" ${style}>${s}</text>`);
const line = (x0, z0, x1, z1, style) =>
  out.push(`<line x1="${f(X(x0))}" y1="${f(Y(z0))}" x2="${f(X(x1))}" y2="${f(Y(z1))}" ${style}/>`);

const C = {
  ground: '#e3cf9f',
  brick: '#b5523b',
  brickLight: '#d98a6c',
  earth: '#a68a5b',
  path: '#c76a4f',
  iron: '#4a4a4a',
  tile: '#6fa3c7',
  leaf: '#4f7d3a',
  garden: '#7a9a4a',
  water: '#7fb2d6',
  ink: '#2b2b2b',
};

// 地面
rect(L.LOT, `fill="${C.ground}" stroke="${C.ink}" stroke-width="1"`);

// 1 m 网格
for (let x = L.LOT.x0; x <= L.LOT.x1; x++)
  line(x, L.LOT.z0, x, L.LOT.z1, `stroke="#000" stroke-opacity="${x === 0 ? 0.35 : 0.08}" stroke-width="${x === 0 ? 1.2 : 1}"`);
for (let z = L.LOT.z0; z <= L.LOT.z1; z++)
  line(L.LOT.x0, z, L.LOT.x1, z, `stroke="#000" stroke-opacity="${z === 0 ? 0.35 : 0.08}" stroke-width="${z === 0 ? 1.2 : 1}"`);

// 红砖小路
for (const p of L.BRICK_PATHS) {
  const d = p.points.map(([x, z], i) => `${i ? 'L' : 'M'}${f(X(x))},${f(Y(z))}`).join(' ');
  out.push(`<path d="${d}" fill="none" stroke="${C.path}" stroke-opacity="0.55" stroke-width="${p.width * S}" stroke-linejoin="miter" stroke-linecap="square"/>`);
}

// 菜地
rect(L.GARDEN.rect, `fill="${C.garden}" fill-opacity="0.35" stroke="${C.garden}" stroke-width="1.5"`);
for (const b of L.GARDEN.beds) {
  const r = { x0: L.GARDEN.rect.x0 + 0.1, x1: L.GARDEN.rect.x1 - 0.1, z0: b.z0 + 0.05, z1: b.z1 - 0.05 };
  rect(r, `fill="${C.garden}" fill-opacity="0.45" stroke="none"`);
  if (b.trellis) {
    for (let z = b.z0 + 0.25; z < b.z1; z += 0.5) {
      out.push(`<circle cx="${f(X(r.x0 + 0.2))}" cy="${f(Y(z))}" r="2" fill="#6b5a2a"/>`);
      out.push(`<circle cx="${f(X(r.x1 - 0.2))}" cy="${f(Y(z))}" r="2" fill="#6b5a2a"/>`);
    }
  }
  const short = b.crop.replace(/（.*）/, '');
  text((L.GARDEN.rect.x0 + L.GARDEN.rect.x1) / 2, (b.z0 + b.z1) / 2 + 0.1, short, 'class="s" text-anchor="middle"');
}

// 夯土墙
for (const w of L.EARTH_WALLS) rect(w.rect, `fill="${C.earth}" stroke="#6e5a37" stroke-width="1"`);

// 北屋（墙体画成实心带，门窗洞口挖开）
function brickBox(r, wall, openings, label, sub) {
  rect(r, `fill="${C.brickLight}" fill-opacity="0.25" stroke="none"`);
  const segs = [
    // [x0,z0,x1,z1] 四面墙
    { side: 'n', r: { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z0 + wall } },
    { side: 's', r: { x0: r.x0, x1: r.x1, z0: r.z1 - wall, z1: r.z1 } },
    { side: 'w', r: { x0: r.x0, x1: r.x0 + wall, z0: r.z0, z1: r.z1 } },
    { side: 'e', r: { x0: r.x1 - wall, x1: r.x1, z0: r.z0, z1: r.z1 } },
  ];
  for (const s of segs) {
    const ops = openings.filter((o) => o.side === s.side).sort((a, b) => a.a - b.a);
    const horiz = s.side === 'n' || s.side === 's';
    let cur = horiz ? s.r.x0 : s.r.z0;
    const end = horiz ? s.r.x1 : s.r.z1;
    for (const o of [...ops, { a: end, b: end }]) {
      if (o.a > cur)
        rect(horiz ? { ...s.r, x0: cur, x1: o.a } : { ...s.r, z0: cur, z1: o.a }, `fill="${C.brick}" stroke="none"`);
      if (o.kind === 'window')
        rect(horiz ? { ...s.r, x0: o.a, x1: o.b } : { ...s.r, z0: o.a, z1: o.b }, `fill="#cfe6f2" stroke="${C.ink}" stroke-width="0.8"`);
      if (o.kind === 'door') {
        // 门扇开启弧线（向内开）
        const w = o.b - o.a;
        if (horiz) {
          const zi = s.side === 's' ? s.r.z0 : s.r.z1;
          const dir = s.side === 's' ? -1 : 1;
          line(o.a, zi, o.a, zi + dir * w, `stroke="${C.ink}" stroke-width="1"`);
          out.push(`<path d="M${f(X(o.a))},${f(Y(zi + dir * w))} A${f(w * S)},${f(w * S)} 0 0 ${dir < 0 ? 1 : 0} ${f(X(o.b))},${f(Y(zi))}" fill="none" stroke="${C.ink}" stroke-width="0.8" stroke-dasharray="3 2"/>`);
        } else {
          const xi = s.side === 'e' ? s.r.x0 : s.r.x1;
          const dir = s.side === 'e' ? -1 : 1;
          line(xi, o.b, xi + dir * w, o.b, `stroke="${C.ink}" stroke-width="1"`);
          out.push(`<path d="M${f(X(xi + dir * w))},${f(Y(o.b))} A${f(w * S)},${f(w * S)} 0 0 ${dir < 0 ? 1 : 0} ${f(X(xi))},${f(Y(o.a))}" fill="none" stroke="${C.ink}" stroke-width="0.8" stroke-dasharray="3 2"/>`);
        }
      }
      cur = Math.max(cur, o.b);
    }
  }
  if (label) text((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, label, 'class="b" text-anchor="middle"');
  if (sub) text((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2 + 0.5, sub, 'class="s" text-anchor="middle"');
}

const NH = L.NORTH_HOUSE;
for (const room of NH.rooms) {
  const r = { x0: room.x0, x1: room.x1, z0: NH.rect.z0, z1: NH.rect.z1 };
  const ops = [
    { side: 's', kind: 'door', a: room.door.x - room.door.width / 2, b: room.door.x + room.door.width / 2 },
    ...room.windows.map((w) => ({ side: 's', kind: 'window', a: w.x - w.width / 2, b: w.x + w.width / 2 })),
  ];
  brickBox(r, NH.wall, ops, room.name, `室内 ${(room.x1 - room.x0 - NH.wall).toFixed(1)}×${(NH.rect.z1 - NH.rect.z0 - 2 * NH.wall).toFixed(1)} m · 高 ${NH.height} m`);
  // 台阶
  const st = NH.steps;
  for (let i = 0; i < st.count; i++) {
    rect(
      { x0: room.door.x - st.width / 2, x1: room.door.x + st.width / 2, z0: NH.rect.z1, z1: NH.rect.z1 + st.run * (st.count - i) },
      `fill="${C.brick}" fill-opacity="${0.35 + i * 0.2}" stroke="${C.ink}" stroke-width="0.6"`,
    );
  }
}

const K = L.KITCHEN;
brickBox(
  K.rect,
  K.wall,
  [
    { side: 'e', kind: 'door', a: K.door.z - K.door.width / 2, b: K.door.z + K.door.width / 2 },
    ...K.windows.map((w) => ({ side: 'e', kind: 'window', a: w.z - w.width / 2, b: w.z + w.width / 2 })),
  ],
  K.name,
  `高 ${K.height} m`,
);
rect(K.stove, `fill="#8a8a8a" stroke="${C.ink}" stroke-width="0.8"`);
out.push(`<circle cx="${f(X((K.stove.x0 + K.stove.x1) / 2))}" cy="${f(Y((K.stove.z0 + K.stove.z1) / 2))}" r="${0.35 * S}" fill="#333"/>`);
text((K.stove.x0 + K.stove.x1) / 2, K.stove.z1 + 0.35, '灶台', 'class="s" text-anchor="middle"');
const ch = K.chimney;
rect({ x0: ch.x - ch.size / 2, x1: ch.x + ch.size / 2, z0: ch.z - ch.size / 2, z1: ch.z + ch.size / 2 }, `fill="none" stroke="#111" stroke-width="2" stroke-dasharray="4 2"`);
text(ch.x + 0.4, ch.z - 0.35, '烟囱', 'class="s"');

const T = L.TOILET;
brickBox(T.rect, T.wall, [{ side: 'w', kind: 'gap', a: T.door.z - T.door.width / 2, b: T.door.z + T.door.width / 2 }], T.name, `无顶 · 墙高 ${T.height} m`);

// 大门
for (const p of L.GATE.posts) rect(p, `fill="${C.brick}" stroke="${C.ink}" stroke-width="0.8"`);
{
  const g = L.GATE;
  const mid = (g.z0 + g.z1) / 2;
  const leaf = (g.z1 - g.z0) / 2;
  line(g.x, g.z0, g.x + leaf * 0.7, g.z0 + leaf * 0.7, `stroke="${C.iron}" stroke-width="4"`);
  line(g.x, g.z1, g.x + leaf * 0.7, g.z1 - leaf * 0.7, `stroke="${C.iron}" stroke-width="4"`);
  text(g.x - 0.25, mid - 0.15, g.name, 'class="b" text-anchor="end"');
  text(g.x - 0.25, mid + 0.35, '双开铁门 · 朝西', 'class="s" text-anchor="end"');
  // 入口箭头
  out.push(`<path d="M${f(X(g.x - 1.3))},${f(Y(mid + 0.9))} L${f(X(g.x - 0.4))},${f(Y(mid + 0.9))}" stroke="${C.ink}" stroke-width="2" marker-end="url(#arr)"/>`);
}

// 影背墙
{
  const s = L.SCREEN_WALL;
  rect(s.rect, `fill="${C.tile}" stroke="${C.ink}" stroke-width="1"`);
  line(s.rect.x0, s.rect.z0, s.rect.x0, s.rect.z1, `stroke="#fff" stroke-width="2"`);
  text(s.rect.x1 + 0.15, (s.rect.z0 + s.rect.z1) / 2 - 0.1, s.name, 'class="b"');
  text(s.rect.x1 + 0.15, (s.rect.z0 + s.rect.z1) / 2 + 0.35, '西面贴瓷砖画', 'class="s"');
  text(s.rect.x1 + 0.15, (s.rect.z0 + s.rect.z1) / 2 + 0.75, '（公园·湖·荷花）', 'class="s"');
}

// 压水井
{
  const w = L.WELL;
  out.push(`<circle cx="${f(X(w.x))}" cy="${f(Y(w.z + 0.1))}" r="${w.wetRadius * S}" fill="${C.water}" fill-opacity="0.25"/>`);
  rect({ x0: w.x - w.platform.width / 2, x1: w.x + w.platform.width / 2, z0: w.z - w.platform.depth / 2, z1: w.z + w.platform.depth / 2 }, `fill="#b9b4a8" stroke="${C.ink}" stroke-width="0.8"`);
  out.push(`<circle cx="${f(X(w.x))}" cy="${f(Y(w.z - 0.1))}" r="6" fill="#2f4a35"/>`);
  line(w.x, w.z - 0.1, w.x, w.z + 0.25, `stroke="#2f4a35" stroke-width="3"`);
  line(w.x, w.z - 0.1, w.x, w.z - 0.75, `stroke="#2f4a35" stroke-width="2"`);
  out.push(`<circle cx="${f(X(w.bucket.x))}" cy="${f(Y(w.bucket.z))}" r="${0.15 * S}" fill="#9aa3a8" stroke="${C.ink}" stroke-width="0.8"/>`);
  text(w.x + 0.6, w.z + 0.5, w.name, 'class="b"');
}

// 树（虚线圈 = 树冠投影，实心点 = 树干）
for (const t of L.TREES) {
  const col = { wutong: C.leaf, pomegranate: '#a33a2a', jujube: '#7b6a2a' }[t.kind];
  out.push(`<circle cx="${f(X(t.x))}" cy="${f(Y(t.z))}" r="${t.crown * S}" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
  out.push(`<circle cx="${f(X(t.x))}" cy="${f(Y(t.z))}" r="${Math.max(4, t.trunkRadius * S)}" fill="#5a3e22"/>`);
  const dz = t.kind === 'pomegranate' ? -0.75 : 0;
  text(t.x, t.z + 0.55 + dz, t.name, `class="b" text-anchor="middle" fill="${col}"`);
  text(t.x, t.z + 0.95 + dz, `高 ${t.height} m`, 'class="s" text-anchor="middle"');
}

// 默认站位（走进去模式）
{
  const v = L.VIEWS.walkStart;
  out.push(`<circle cx="${f(X(v.x))}" cy="${f(Y(v.z))}" r="5" fill="#d23"/>`);
  out.push(`<path d="M${f(X(v.x))},${f(Y(v.z))} L${f(X(v.x + v.look[0] * 0.8))},${f(Y(v.z + v.look[1] * 0.8))}" stroke="#d23" stroke-width="2" marker-end="url(#arrR)"/>`);
  text(v.x + 0.1, v.z - 0.25, '起点', 'class="s" fill="#d23"');
}

// 原点
out.push(`<circle cx="${f(X(0))}" cy="${f(Y(0))}" r="3" fill="none" stroke="#000"/>`);
text(0.1, -0.12, '原点 (0,0)', 'class="xs"');

// 外尺寸标注
const dimY = Y(L.LOT.z0) - 30;
out.push(`<line x1="${X(L.LOT.x0)}" y1="${dimY}" x2="${X(L.LOT.x1)}" y2="${dimY}" stroke="${C.ink}" marker-start="url(#tick)" marker-end="url(#tick)"/>`);
out.push(`<text x="${X(0)}" y="${dimY - 6}" class="s" text-anchor="middle">东西 ${L.LOT.x1 - L.LOT.x0} m</text>`);
const dimX = X(L.LOT.x1) + 30;
out.push(`<line x1="${dimX}" y1="${Y(L.LOT.z0)}" x2="${dimX}" y2="${Y(L.LOT.z1)}" stroke="${C.ink}" marker-start="url(#tick)" marker-end="url(#tick)"/>`);
out.push(`<text x="${dimX + 8}" y="${Y(0)}" class="s" transform="rotate(90 ${dimX + 8} ${Y(0)})" text-anchor="middle">南北 ${L.LOT.z1 - L.LOT.z0} m（含北屋）</text>`);

// 坐标轴刻度
for (let x = L.LOT.x0; x <= L.LOT.x1; x++) out.push(`<text x="${X(x)}" y="${Y(L.LOT.z1) + 14}" class="xs" text-anchor="middle">${x}</text>`);
for (let z = L.LOT.z0; z <= L.LOT.z1; z++) out.push(`<text x="${X(L.LOT.x0) - 6}" y="${Y(z) + 3}" class="xs" text-anchor="end">${z}</text>`);

// 指北针
{
  const cx = W - 50, cy = 60;
  out.push(`<g transform="translate(${cx},${cy})"><circle r="24" fill="#fff" stroke="${C.ink}"/><path d="M0,-20 L7,3 L0,0 L-7,3 Z" fill="#c22"/><path d="M0,20 L7,3 L0,0 L-7,3 Z" fill="#999"/><text y="-28" text-anchor="middle" class="b">北</text></g>`);
}

// 比例尺 + 图例
{
  const y0 = Y(L.LOT.z1) + 40;
  out.push(`<g transform="translate(${PAD},${y0})">`);
  out.push(`<rect width="${S}" height="6" fill="#000"/><rect x="${S}" width="${S}" height="6" fill="#fff" stroke="#000"/><text y="20" class="xs">0</text><text x="${S}" y="20" class="xs" text-anchor="middle">1</text><text x="${2 * S}" y="20" class="xs" text-anchor="middle">2 m</text>`);
  out.push(`<text x="${2 * S + 30}" y="8" class="xs">坐标：+X 东，-Z 北，1 单位 = 1 m · 网格 1 m · 虚线圈 = 树冠投影 · 红点 = “走进去”起点</text>`);
  out.push('</g>');
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Noto Sans CJK SC','PingFang SC','Microsoft YaHei',sans-serif">
<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker>
  <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#d23"/></marker>
  <marker id="tick" viewBox="0 0 2 10" refX="1" refY="5" markerWidth="2" markerHeight="10"><rect width="2" height="10" fill="${C.ink}"/></marker>
  <style>.b{font-size:13px;font-weight:600;fill:${C.ink}}.s{font-size:11px;fill:#333}.xs{font-size:9px;fill:#555}</style>
</defs>
<rect width="100%" height="100%" fill="#faf7f0"/>
<text x="${PAD}" y="40" font-size="18" font-weight="700" fill="${C.ink}">任县老家院子 · 俯视平面图（约 1990 年代）</text>
${out.join('\n')}
</svg>
`;

const target = fileURLToPath(new URL('../docs/plan.svg', import.meta.url));
writeFileSync(target, svg);
console.log('wrote', target);
