import * as THREE from 'three';
import { WELL as W } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';

/**
 * 北方农村人力压水井（石榴树下）：
 * - 水泥井台（四边略倒角，台面被水泡得发暗）
 * - 铸铁泵身：底法兰用螺栓压在井台上、圆筒泵体、顶部喇叭口；深绿漆掉得斑驳、到处是锈
 * - 出水嘴朝南（+Z），弯管向下；压杆朝北斜向上伸出，铰在泵顶的叉架上，连着活塞杆
 * - 出水嘴下一只镀锌铁桶（半桶水），井台东侧放一只葫芦瓢（舀引水用）
 *
 * 交互（第 6 步）：节点 'handle-pivot' 绕 X 轴转动即压杆上下；'spout-tip' 为出水口位置。
 */
export function createWell() {
  const group = new THREE.Group();
  group.name = 'well';
  const p = W.platform;
  const concrete = mat('concrete');
  // 井台：下层略大的砖基 + 上层水泥台面
  group.add(box(W.x - p.width / 2 - 0.03, W.x + p.width / 2 + 0.03, 0, 0.08, W.z - p.depth / 2 - 0.03, W.z + p.depth / 2 + 0.03, mat('brick')));
  group.add(box(W.x - p.width / 2, W.x + p.width / 2, 0.08, p.height, W.z - p.depth / 2, W.z + p.depth / 2, concrete));
  // 台面一层水膜（更暗、更光滑）
  const wetTop = new THREE.Mesh(
    new THREE.PlaneGeometry(p.width * 0.8, p.depth * 0.7).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3a3a36, transparent: true, opacity: 0.35, roughness: 0.08, depthWrite: false }),
  );
  wetTop.position.set(W.x, p.height + 0.002, W.z + 0.1);
  group.add(wetTop);

  const iron = mat('pumpIron');
  const pump = new THREE.Group();
  pump.name = 'pump';
  pump.position.set(W.x, p.height, W.z - 0.1);

  // 泵身轮廓（半径, 高度）
  const prof = [
    [0, 0], [0.135, 0], [0.135, 0.03], [0.1, 0.035], [0.088, 0.07], [0.085, 0.12], [0.095, 0.13], [0.095, 0.15],
    [0.085, 0.16], [0.085, 0.56], [0.1, 0.58], [0.105, 0.62], [0.1, 0.64], [0.07, 0.66], [0.04, 0.67], [0, 0.67],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), iron);
  body.castShadow = body.receiveShadow = true;
  body.userData.solid = true;
  pump.add(body);
  // 底法兰螺栓
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 6), iron);
    bolt.position.set(Math.cos(a) * 0.11, 0.04, Math.sin(a) * 0.11);
    pump.add(bolt);
  }
  // 出水嘴：从泵身南侧伸出、向下弯
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.5, 0.06),
    new THREE.Vector3(0, 0.5, 0.17),
    new THREE.Vector3(0, 0.47, 0.25),
    new THREE.Vector3(0, 0.4, 0.28),
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.028, 10, false), iron);
  spout.castShadow = true;
  pump.add(spout);
  const tip = new THREE.Object3D();
  tip.name = 'spout-tip';
  tip.position.set(0, 0.39, 0.28);
  pump.add(tip);

  // 顶部叉架（压杆的支点）
  for (const sx of [-0.035, 0.035]) {
    const ear = box(sx - 0.008, sx + 0.008, 0.62, 0.78, -0.05, 0.02, iron, { solid: false });
    pump.add(ear);
  }
  // 压杆：支点在叉架上，长杆朝北斜向上
  const handlePivot = new THREE.Group();
  handlePivot.name = 'handle-pivot';
  handlePivot.position.set(0, 0.74, -0.015);
  handlePivot.rotation.x = 0.42; // 抬起状态；按下时减小
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.05, 10), iron);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0, 0, -0.47);
  bar.castShadow = true;
  handlePivot.add(bar);
  // 握把端套着一截磨得发亮的铁管
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x5a5a56, roughness: 0.35, metalness: 0.7 }));
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, 0, -0.9);
  handlePivot.add(grip);
  // 短头连活塞杆
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), iron);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, 0.08);
  handlePivot.add(nose);
  pump.add(handlePivot);
  // 活塞杆（第 6 步跟着压杆上下）
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6), mat('galvanized'));
  rod.name = 'piston-rod';
  rod.position.set(0, 0.68, 0.05);
  pump.add(rod);
  group.add(pump);

  group.add(createBucket(), createLadle());
  return group;
}

/** 镀锌铁桶：口大底小，带提梁，半桶水 */
function createBucket() {
  const g = new THREE.Group();
  g.name = 'bucket';
  g.position.set(W.bucket.x, W.platform.height, W.bucket.z);
  const galv = mat('galvanized');
  const prof = [[0.12, 0], [0.13, 0.005], [0.155, 0.3], [0.165, 0.305], [0.165, 0.315], [0.152, 0.31]].map(([r, y]) => new THREE.Vector2(r, y));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), galv);
  shell.material = galv.clone();
  shell.material.side = THREE.DoubleSide;
  shell.castShadow = shell.receiveShadow = true;
  g.add(shell);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.125, 24).rotateX(-Math.PI / 2), galv);
  bottom.position.y = 0.01;
  g.add(bottom);
  // 两道加强箍
  for (const y of [0.1, 0.2]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.135 + y * 0.08, 0.004, 4, 28).rotateX(Math.PI / 2), galv);
    hoop.position.y = y;
    g.add(hoop);
  }
  // 提梁（倒向一侧）
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.004, 4, 24, Math.PI), galv);
  bail.position.y = 0.3;
  bail.rotation.set(-1.2, 0, 0);
  g.add(bail);
  // 水面
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.148, 28).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4a5a58, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.85 }),
  );
  water.name = 'bucket-water';
  water.position.y = 0.17;
  g.add(water);
  g.userData.solid = false;
  return g;
}

/** 葫芦瓢：半个老葫芦，黄褐色，扣着放在井台东边 */
function createLadle() {
  const g = new THREE.Group();
  g.name = 'ladle';
  const gourd = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.6, side: THREE.DoubleSide });
  // 瓢身：半个椭球，开口朝上
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gourd);
  bowl.scale.set(1, 0.6, 1.25);
  bowl.position.y = 0.06;
  bowl.castShadow = true;
  g.add(bowl);
  // 瓢把：葫芦细颈的一半
  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gourd);
  neck.scale.set(1, 0.6, 1.8);
  neck.position.set(0, 0.035, -0.17);
  g.add(neck);
  g.position.set(W.x + 0.36, W.platform.height, W.z - 0.15);
  g.rotation.y = 0.9;
  return g;
}
