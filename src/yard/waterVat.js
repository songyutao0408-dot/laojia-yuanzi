import * as THREE from 'three';
import { WATER_VAT } from '../layout.js';
import { canvas, makeFbm, fillPixels, clamp01, mixRGB } from '../textures/canvas.js';

/**
 * 大水缸（华北农村老式粗陶缸）：大肚、小底、口沿外卷；上大半截挂黑褐色釉（酱釉），
 * 釉往下流、边缘不齐，下面一截露出土黄色的陶胎；缸里是水，缸口半盖着两块半圆木板。
 */
let glazeTex = null;
function vatTexture() {
  // u 绕一圈，v 从缸底（0）到口沿（1）
  const c = canvas(512, 256);
  const drip = makeFbm(301, 16, 3);
  const fine = makeFbm(302, 64, 2);
  const blot = makeFbm(303, 6, 4);
  fillPixels(c, (u, v) => {
    const edge = 0.2 + (drip(u * 2, 0.3) - 0.5) * 0.12; // 釉的下沿，波浪状往下流
    const f = fine(u, v);
    const b = blot(u, v);
    if (v < edge) {
      // 露胎：土黄、粗糙、带泥
      const k = 0.85 + f * 0.25;
      return [176 * k, 140 * k, 100 * k];
    }
    // 酱釉：深褐到近黑，釉厚处发亮的红褐，釉薄处（口沿）露出黄褐
    let col = mixRGB([44, 30, 22], [92, 52, 30], clamp01((b - 0.4) * 1.6));
    col = mixRGB(col, [120, 80, 48], clamp01((v - 0.93) * 12) * 0.6);
    col = mixRGB(col, [24, 18, 14], clamp01((v - edge) < 0.03 ? 0.6 : 0)); // 釉下沿积釉一道深色
    return [col[0] * (0.92 + f * 0.16), col[1] * (0.92 + f * 0.16), col[2] * (0.92 + f * 0.16)];
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * V：尺寸（height、rimRadius、bellyRadius、baseRadius，可选 x、z 位置），默认是院子里那口；
 * leanLid：另一块缸盖斜靠在缸身西侧（屋里墙角那口不靠）
 */
export function createWaterVat(V = WATER_VAT, { leanLid = true } = {}) {
  const g = new THREE.Group();
  g.name = 'water-vat';
  g.position.set(V.x ?? 0, 0, V.z ?? 0);
  const H = V.height;
  // 外轮廓（从缸底中心往上到口沿外卷，再翻进缸里往下）
  const outer = [
    [0, 0], [V.baseRadius * 0.92, 0], [V.baseRadius, 0.02], [V.baseRadius * 1.25, 0.12], [V.bellyRadius * 0.93, 0.3],
    [V.bellyRadius, 0.48], [V.bellyRadius * 0.97, 0.62], [V.rimRadius * 1.12, 0.76], [V.rimRadius * 1.03, 0.83],
    [V.rimRadius * 1.1, 0.85], [V.rimRadius * 1.12, 0.875], [V.rimRadius * 1.06, 0.9], [V.rimRadius * 0.98, 0.895],
  ].map(([r, y]) => [r, (y / 0.9) * H]);
  const inner = [
    [V.rimRadius * 0.96, H * 0.96], [V.bellyRadius * 0.93, H * 0.55], [V.baseRadius * 1.05, H * 0.1], [0, H * 0.08],
  ];
  const pts = [...outer, ...inner].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 48);
  // UV.v：外壁按高度，缸里一律用最上面的深色釉
  const uv = geo.attributes.uv;
  const np = pts.length;
  for (let k = 0; k < uv.count; k++) {
    const j = k % np;
    uv.setY(k, j < outer.length ? pts[j].y / H : 0.97);
  }
  glazeTex ??= vatTexture();
  const vat = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: glazeTex, roughness: 0.28, metalness: 0.05 }));
  vat.castShadow = vat.receiveShadow = true;
  vat.userData.solid = true;
  g.add(vat);

  // 缸里的水
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(V.bellyRadius * 0.9, 40).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2c3a3a, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.92 }),
  );
  water.position.y = H * 0.8;
  water.userData.noAO = true;
  g.add(water);

  // 缸盖：两块半圆木板，盖了一块，另一块斜靠在缸边
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.85 });
  const half = new THREE.CylinderGeometry(V.rimRadius * 1.12, V.rimRadius * 1.12, 0.03, 32, 1, false, 0, Math.PI);
  const lid = new THREE.Mesh(half, woodMat);
  lid.position.y = H + 0.012;
  lid.rotation.y = 0.4;
  lid.castShadow = true;
  g.add(lid);
  // 盖子上的提手（一根木条）
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, V.rimRadius * 1.4), woodMat);
  handle.position.set(Math.sin(0.4 + Math.PI / 2) * 0.18, H + 0.04, Math.cos(0.4 + Math.PI / 2) * 0.18);
  handle.rotation.y = 0.4;
  g.add(handle);
  if (!leanLid) return g;
  const lid2 = new THREE.Mesh(half, woodMat);
  // 靠在缸身西侧
  lid2.position.set(-V.bellyRadius - 0.03, H * 0.42, 0.05);
  lid2.rotation.set(0, Math.PI / 2, 0);
  lid2.rotateX(-Math.PI / 2 + 0.25);
  lid2.castShadow = true;
  g.add(lid2);
  return g;
}
