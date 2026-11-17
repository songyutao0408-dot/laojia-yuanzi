import * as THREE from 'three';
import { LOT, WELL } from '../layout.js';
import { rectSize, rectCenter } from '../core/geom.js';
import { worldUV } from '../core/box.js';
import { mat, wetMat } from '../textures/index.js';

/**
 * 地面：院内裸露的夯实黄土地（没有砖路）+ 院外地面 + 压水井周围的湿地。
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

  // 压水井周围的湿地
  const wetR = WELL.wetRadius;
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(wetR * 2, wetR * 2).rotateX(-Math.PI / 2), wetMat());
  wet.position.set(WELL.x, 0.003, WELL.z + 0.15);
  wet.receiveShadow = true;
  group.add(wet);
  return group;
}
