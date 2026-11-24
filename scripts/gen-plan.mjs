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
for (let x = Math.ceil(L.LOT.x0); x <= L.LOT.x1; x++)
  line(x, L.LOT.z0, x, L.LOT.z1, `stroke="#000" stroke-opacity="${x === 0 ? 0.35 : 0.08}" stroke-width="${x === 0 ? 1.2 : 1}"`);
for (let z = Math.ceil(L.LOT.z0); z <= L.LOT.z1; z++)
  line(L.LOT.x0, z, L.LOT.x1, z, `stroke="#000" stroke-opacity="${z === 0 ? 0.35 : 0.08}" stroke-width="${z === 0 ? 1.2 : 1}"`);

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
function brickBox(r, wall, openings, label, sub, labelX = (r.x0 + r.x1) / 2) {
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
  if (label) text(labelX, (r.z0 + r.z1) / 2, label, 'class="b" text-anchor="middle"');
  if (sub) text(labelX, (r.z0 + r.z1) / 2 + 0.5, sub, 'class="s" text-anchor="middle"');
}

const NH = L.NORTH_HOUSE;
for (const room of NH.rooms) {
  const r = { x0: room.x0, x1: room.x1, z0: NH.rect.z0, z1: NH.rect.z1 };
  const ops = [
    { side: 's', kind: 'door', a: room.door.x - room.door.width / 2, b: room.door.x + room.door.width / 2 },
    ...room.windows.map((w) => ({ side: 's', kind: 'window', a: w.x - w.width / 2, b: w.x + w.width / 2 })),
  ];
  // 西北屋隔成外屋/里屋，名字写在外屋中间
  const lx = room.id === 'west' ? L.WEST_ROOM.origin.x + (0.022 + L.WEST_ROOM.outer.kang.width + L.WEST_ROOM.partition.x - 0.12) / 2 : (r.x0 + r.x1) / 2;
  brickBox(r, NH.wall, ops, room.name, `室内 ${(room.x1 - room.x0 - 1.5 * NH.wall).toFixed(1)}×${(NH.rect.z1 - NH.rect.z0 - 2 * NH.wall).toFixed(1)} m · 高 ${NH.height} m`, lx);
}

// 西北屋室内：隔墙（外屋 | 里屋）、小门洞、炕、做蜡烛的器具
{
  const W = L.WEST_ROOM;
  const ox = W.origin.x;
  const oz = W.origin.z;
  const px = ox + W.partition.x;
  const t2 = W.partition.thickness / 2;
  const d = W.innerDoor;
  rect({ x0: px - t2, x1: px + t2, z0: oz, z1: oz + d.z - d.width / 2 }, `fill="${C.brick}" stroke="none"`);
  rect({ x0: px - t2, x1: px + t2, z0: oz + d.z + d.width / 2, z1: oz + W.size.d }, `fill="${C.brick}" stroke="none"`);
  line(px - t2 - 0.06, oz + d.z - d.width / 2 - 0.05, px - t2 - 0.06, oz + d.z + d.width / 2 + 0.05, `stroke="#c42a30" stroke-width="2" stroke-dasharray="2 2"`);
  const ix0 = px + t2;
  const ix1 = ox + W.size.w;
  rect({ x0: ix0, x1: ix1, z0: oz, z1: oz + W.kang.depth }, `fill="#d8c08a" stroke="${C.ink}" stroke-width="0.8"`);
  text((ix0 + ix1) / 2, oz + W.kang.depth / 2 + 0.15, '炕', 'class="s" text-anchor="middle"');
  const vr = W.vat.bellyRadius;
  out.push(`<circle cx="${f(X(ix0 + 0.05 + vr))}" cy="${f(Y(oz + W.size.d - 0.05 - vr))}" r="${f(vr * S)}" fill="#3f4a4a" stroke="${C.ink}" stroke-width="0.8"/>`);
  rect({ x0: ix0 + 0.15 + 2 * vr, x1: ix1 - 0.05, z0: oz + W.size.d - 0.05 - W.candles.depth, z1: oz + W.size.d - 0.05 }, `fill="#b89a48" stroke="${C.ink}" stroke-width="0.6"`);
  text((ix0 + 2 * vr + ix1) / 2, oz + W.size.d - 0.55, '做蜡烛的器具', 'class="xs" text-anchor="middle"');
  // 外屋陈设
  const O = W.outer;
  const tc = 0.022;
  rect({ x0: ox + tc, x1: ox + tc + O.kang.width, z0: oz + tc, z1: oz + W.size.d - tc }, `fill="#a8784a" stroke="${C.ink}" stroke-width="0.8"`);
  text(ox + tc + O.kang.width / 2, oz + W.size.d / 2 + 0.6, '木头炕', 'class="s" text-anchor="middle"');
  rect({ x0: ox + O.tvDesk.x - O.tvDesk.w / 2, x1: ox + O.tvDesk.x + O.tvDesk.w / 2, z0: oz + tc, z1: oz + tc + O.tvDesk.d }, `fill="#d0a060" stroke="${C.ink}" stroke-width="0.6"`);
  text(ox + O.tvDesk.x, oz + tc + O.tvDesk.d + 0.3, '电视桌', 'class="xs" text-anchor="middle"');
  out.push(`<circle cx="${f(X(ox + O.table.x))}" cy="${f(Y(oz + O.table.z))}" r="${f(O.table.r * S)}" fill="#5c3a24" stroke="${C.ink}" stroke-width="0.6"/>`);
  out.push(`<circle cx="${f(X(ox + O.washstand.x))}" cy="${f(Y(oz + O.washstand.z))}" r="${f(0.2 * S)}" fill="#6f9a86" stroke="${C.ink}" stroke-width="0.6"/>`);
  rect({ x0: px - t2 - tc - O.sewing.depth, x1: px - t2 - tc, z0: oz + O.sewing.z - O.sewing.len / 2, z1: oz + O.sewing.z + O.sewing.len / 2 }, `fill="#aa6030" stroke="${C.ink}" stroke-width="0.6"`);
  text(px - t2 - 0.9, oz + O.sewing.z + 0.1, '缝纫机', 'class="xs" text-anchor="end"');
  text((ox + tc + O.kang.width + px - t2) / 2, oz + 3.3, '外屋', 'class="s" text-anchor="middle"');
  text((ix0 + ix1) / 2, oz + 2.35, '里屋', 'class="s" text-anchor="middle"');
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
out.push(`<circle cx="${f(X((K.stove.x0 + K.stove.x1) / 2))}" cy="${f(Y(K.stove.z1 - K.stove.wokFromSouth))}" r="${0.35 * S}" fill="#333"/>`);
text((K.stove.x0 + K.stove.x1) / 2, K.stove.z1 + 0.35, '灶台', 'class="s" text-anchor="middle"');
const ch = K.chimney;
rect({ x0: ch.x - ch.size / 2, x1: ch.x + ch.size / 2, z0: ch.z - ch.size / 2, z1: ch.z + ch.size / 2 }, `fill="none" stroke="#111" stroke-width="2" stroke-dasharray="4 2"`);
text(ch.x + 0.4, ch.z - 0.35, '烟囱', 'class="s"');

// 台阶（两间屋连通）+ 天地神位
{
  const st = NH.steps;
  for (let i = 0; i < st.count; i++) {
    rect({ x0: st.x0, x1: st.x1, z0: NH.rect.z1, z1: NH.rect.z1 + st.run * (st.count - i) }, `fill="#d8d3c4" fill-opacity="${0.5 + i * 0.2}" stroke="${C.ink}" stroke-width="0.6"`);
  }
  text(st.x1 - 1.2, NH.rect.z1 + 0.62, '石灰台阶（连通）', 'class="xs" text-anchor="middle"');
  const sh = NH.shrine;
  rect({ x0: sh.x - sh.width / 2, x1: sh.x + sh.width / 2, z0: NH.rect.z1, z1: NH.rect.z1 + sh.depth }, `fill="#b8322a" stroke="${C.ink}" stroke-width="0.8"`);
  text(sh.x + 0.1, NH.rect.z1 + 1.25, '天地神位', 'class="s" text-anchor="middle" fill="#b8322a"');
}
// 大水缸
{
  const v = L.WATER_VAT;
  out.push(`<circle cx="${f(X(v.x))}" cy="${f(Y(v.z))}" r="${v.bellyRadius * S}" fill="#3a2e24" stroke="${C.ink}" stroke-width="1"/>`);
  out.push(`<circle cx="${f(X(v.x))}" cy="${f(Y(v.z))}" r="${v.rimRadius * 0.8 * S}" fill="#5f7d8a"/>`);
  text(v.x + 0.55, v.z + 0.12, '水缸', 'class="s"');
}
// 洋姜、青石板
{
  const B = L.BACK_YARD;
  const a = B.jerusalemArtichoke;
  rect(a, `fill="#9a9a3a" fill-opacity="0.35" stroke="#7a7a2a" stroke-width="1" stroke-dasharray="4 3"`);
  for (let k = 0; k < 26; k++) {
    const px = a.x0 + 0.2 + ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 * (a.x1 - a.x0 - 0.4);
    const pz = a.z0 + 0.2 + ((Math.sin(k * 78.233) * 12345.678) % 1 + 1) % 1 * (a.z1 - a.z0 - 0.4);
    out.push(`<circle cx="${f(X(px))}" cy="${f(Y(pz))}" r="3" fill="#d8a820"/>`);
  }
  text((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2 + 0.1, '洋姜', 'class="b" text-anchor="middle"');
  const { l, w } = B.slabSize;
  for (const sl of B.slabs) {
    out.push(`<rect x="${f(X(sl.x) - (l * S) / 2)}" y="${f(Y(sl.z) - (w * S) / 2)}" width="${f(l * S)}" height="${f(w * S)}" fill="#7d8c96" fill-opacity="0.85" stroke="${C.ink}" stroke-width="0.8" transform="rotate(${-sl.rot} ${f(X(sl.x))} ${f(Y(sl.z))})"/>`);
  }
  text(B.slabs[0].x, B.slabs[0].z - 0.45, '青石板', 'class="s" text-anchor="middle"');
}
// 秋千（挂在枣树弯出来的枝干上）
{
  const t = L.TREES.find((t) => t.kind === 'jujube');
  const sw = L.SWING;
  const n = Math.hypot(...sw.dir);
  const dx = sw.dir[0] / n;
  const dz = sw.dir[1] / n;
  line(t.x, t.z, t.x + dx * sw.branchLength, t.z + dz * sw.branchLength, `stroke="#5a3e22" stroke-width="3"`);
  const cx = t.x + dx * sw.hang;
  const cz = t.z + dz * sw.hang;
  line(cx - dx * 0.25, cz - dz * 0.25, cx + dx * 0.25, cz + dz * 0.25, `stroke="#8a5a2a" stroke-width="6"`);
  text(cx - 0.3, cz + 0.05, '秋千', 'class="s" text-anchor="end"');
}

// 父亲和大黄
{
  const C2 = L.CHARACTERS;
  const fx = C2.father.x;
  const fz = C2.father.z;
  out.push(`<circle cx="${f(X(fx))}" cy="${f(Y(fz))}" r="${0.2 * S}" fill="#26304c" stroke="${C.ink}" stroke-width="1"/>`);
  out.push(`<ellipse cx="${f(X(C2.dog.x))}" cy="${f(Y(C2.dog.z))}" rx="${0.3 * S}" ry="${0.14 * S}" fill="#c8892f" stroke="${C.ink}" stroke-width="0.8" transform="rotate(${-(C2.dog.rot - 90)} ${f(X(C2.dog.x))} ${f(Y(C2.dog.z))})"/>`);
  text(fx + 0.3, fz + 0.45, '父亲', 'class="s"');
  text(C2.dog.x - 0.35, C2.dog.z + 0.45, '大黄', 'class="s" text-anchor="end"');
}
// 厨房与西北屋之间的空当
{
  const g = L.KITCHEN_GAP;
  rect(g, `fill="none" stroke="#7a5a3a" stroke-width="1" stroke-dasharray="3 3"`);
  text((g.x0 + g.x1) / 2, (g.z0 + g.z1) / 2 + 0.1, `空当 约 ${(g.z1 - g.z0).toFixed(0)} m`, 'class="s" text-anchor="middle"');
}

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
for (let x = Math.ceil(L.LOT.x0); x <= L.LOT.x1; x++) out.push(`<text x="${X(x)}" y="${Y(L.LOT.z1) + 14}" class="xs" text-anchor="middle">${x}</text>`);
for (let z = Math.ceil(L.LOT.z0); z <= L.LOT.z1; z++) out.push(`<text x="${X(L.LOT.x0) - 6}" y="${Y(z) + 3}" class="xs" text-anchor="end">${z}</text>`);

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
