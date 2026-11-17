import * as THREE from 'three';
import { LOT, BRICK_PATHS, WELL } from '../layout.js';
import { rectSize, rectCenter } from '../core/geom.js';
import { worldUV } from '../core/box.js';
import { mat, wetMat } from '../textures/index.js';

/**
 * 地面：院内夯实的黄土地 + 院外地面 + 红砖小路 + 压水井周围的湿地。
 */
export function createGround() {
  const group = new THREE.Group();
  group.name = 'ground';

  // 院外地面（大一圈，第 5 步淡出到雾里）
  const outGeo = new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2);
  worldUV(outGeo);
  const outside = new THREE.Mesh(outGeo, mat('groundOutside'));
  outside.position.y = -0.01;
  outside.receiveShadow = true;
  group.add(outside);

  // 院内黄土地
  const { w, d } = rectSize(LOT);
  const c = rectCenter(LOT);
  const yardGeo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  worldUV(yardGeo, new THREE.Vector3(c.x, 0, c.z));
  const yard = new THREE.Mesh(yardGeo, mat('ground'));
  yard.position.set(c.x, 0, c.z);
  yard.receiveShadow = true;
  group.add(yard);

  // 红砖小路：沿折线逐段铺，砖缝方向顺着路走；路面比土地高 2 cm，两侧露出砖边
  const paving = mat('paving');
  const side = mat('brick');
  for (const p of BRICK_PATHS) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const [ax, az] = p.points[i];
      const [bx, bz] = p.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az) + p.width;
      const geo = new THREE.BoxGeometry(len, 0.04, p.width);
      // 顶面 UV：沿路方向的米数（贴图 1 m 一张，repeat 已是 1）
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * len + i * 0.37, uv.getY(k) * p.width);
      const seg = new THREE.Mesh(geo, [side, side, paving, paving, side, side]);
      seg.rotation.y = -Math.atan2(bz - az, bx - ax);
      seg.position.set((ax + bx) / 2, 0.0 + i * 0.0004, (az + bz) / 2);
      seg.receiveShadow = true;
      group.add(seg);
    }
  }

  // 压水井周围的湿地
  const wetR = WELL.wetRadius;
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(wetR * 2, wetR * 2).rotateX(-Math.PI / 2), wetMat());
  wet.position.set(WELL.x, 0.003, WELL.z + 0.15);
  wet.receiveShadow = true;
  group.add(wet);
  return group;
}
