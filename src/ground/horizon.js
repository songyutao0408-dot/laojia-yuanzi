import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvas, rng } from '../textures/canvas.js';

/**
 * 院外远景：华北平原村子外一圈的杨树林、远处的房顶，用剪影卡片围成一圈（半径 45~110 m），
 * 被远雾吞没，让天际线柔和而不空。
 */
function treeLineTexture() {
  const W = 1024;
  const H = 256;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const k = c.width / W;
  ctx.scale(k, k);
  const r = rng(515);
  // 一排高低不齐的树冠：杨树（高瘦）+ 槐树/榆树（圆）
  for (let i = 0; i < 60; i++) {
    const x = r() * W;
    const poplar = r() < 0.55;
    const h = poplar ? 120 + r() * 90 : 70 + r() * 60;
    const w = poplar ? 14 + r() * 10 : 36 + r() * 36;
    const g = 70 + r() * 30;
    ctx.fillStyle = `rgb(${g * 0.7},${g},${g * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(x, H - h / 2 - 10, w, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const dx of [-W, W]) {
      if (x + dx + w > 0 && x + dx - w < W) {
        ctx.beginPath();
        ctx.ellipse(x + dx, H - h / 2 - 10, w, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // 偶尔露出的平房屋顶
  ctx.fillStyle = 'rgb(110,100,96)';
  for (let i = 0; i < 8; i++) ctx.fillRect(r() * W, H - 34, 60 + r() * 60, 34);
  ctx.fillStyle = 'rgb(80,90,70)';
  ctx.fillRect(0, H - 14, W, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function createHorizon() {
  const tex = treeLineTexture();
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, color: 0xb8bca8 });
  const r = rng(616);
  const geos = [];
  for (const [radius, height, n] of [[90, 8, 40], [140, 11, 56]]) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const rr = radius * (0.92 + r() * 0.16);
      const p0 = new THREE.Vector3(Math.cos(a0) * rr, 0, Math.sin(a0) * rr);
      const p1 = new THREE.Vector3(Math.cos(a1) * rr, 0, Math.sin(a1) * rr);
      const len = p0.distanceTo(p1) * 1.08;
      const h = height * (0.7 + r() * 0.5);
      const g = new THREE.PlaneGeometry(len, h);
      const uv = g.attributes.uv;
      const off = r();
      for (let k = 0; k < uv.count; k++) uv.setX(k, off + uv.getX(k) * (len / 45));
      g.translate(0, h / 2 - 0.5, 0);
      g.rotateY(-Math.atan2(p1.z - p0.z, p1.x - p0.x));
      g.translate((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2);
      geos.push(g);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
  mesh.name = 'horizon';
  mesh.userData.noAO = true;
  return mesh;
}
