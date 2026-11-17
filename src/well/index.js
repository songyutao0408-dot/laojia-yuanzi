import * as THREE from 'three';
import { WELL as W } from '../layout.js';
import { wb, box } from '../core/whitebox.js';

/**
 * 压水井（第 2 步白模：井台、泵身、压杆、出水嘴、铁桶、水瓢的大小和位置）。
 * 第 4 步：铸铁细节和锈迹、湿地面；第 6 步：按 E / 点击压杆 → 压杆上下、出水。
 * 出水嘴朝南（+Z），压杆朝北伸出。
 */
export function createWell() {
  const group = new THREE.Group();
  group.name = 'well';
  const p = W.platform;
  group.add(box(W.x - p.width / 2, W.x + p.width / 2, 0, p.height, W.z - p.depth / 2, W.z + p.depth / 2, wb('concrete')));

  const pump = new THREE.Group();
  pump.name = 'pump';
  pump.position.set(W.x, p.height, W.z - 0.1);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.75, 16), wb('iron'));
  body.position.y = 0.375;
  body.castShadow = true;
  body.userData.solid = true;
  pump.add(body);
  // 出水嘴（朝南）
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.3, 10), wb('iron'));
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, 0.55, 0.2);
  spout.castShadow = true;
  pump.add(spout);
  // 压杆：铰点在泵身顶部，朝北斜向上伸出（第 6 步做动画）
  const handlePivot = new THREE.Group();
  handlePivot.name = 'handle-pivot';
  handlePivot.position.set(0, 0.8, -0.05);
  handlePivot.rotation.x = 0.35;
  const handle = box(-0.02, 0.02, -0.02, 0.02, -1.0, 0.05, wb('iron'), { solid: false });
  handlePivot.add(handle);
  pump.add(handlePivot);
  group.add(pump);

  // 铁桶（出水嘴下）
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 20, 1, true), wb('iron'));
  bucket.position.set(W.bucket.x, 0.16, W.bucket.z);
  bucket.castShadow = true;
  bucket.material.side = THREE.DoubleSide;
  group.add(bucket);
  // 水瓢（放在井台东侧）
  const ladle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wb('concrete'));
  ladle.position.set(W.x + 0.35, p.height + 0.09, W.z + 0.2);
  group.add(ladle);
  return group;
}
