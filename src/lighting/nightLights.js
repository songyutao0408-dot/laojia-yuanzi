import * as THREE from 'three';
import { NORTH_HOUSE as NH, KITCHEN as K } from '../layout.js';

/**
 * 夜里的灯：
 * - 北屋每间屋顶正中吊一只白炽灯泡（昏黄、2700K 左右），点光源照亮屋里，从门窗透出去
 * - 窗户玻璃后面一层暖黄光（像隔着旧窗帘/报纸透出来的光）
 * - 门洞、窗洞各有一盏向外斜照的聚光，把门口地面照出一片暖光
 * - 厨房也有一盏更暗的灯
 * 白天全部关闭（visible=false，避免多余的光源计算）。
 */
const WARM = 0xffb468;

export function createNightLights() {
  const group = new THREE.Group();
  group.name = 'night-lights';
  const lights = [];
  const glows = [];
  const bulbs = [];
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
  const bulbOff = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.2 });
  const glowMat = new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0, depthWrite: false, fog: false });

  const addBulb = (x, y, z, intensity, distance) => {
    const light = new THREE.PointLight(WARM, intensity, distance, 1.6);
    light.position.set(x, y, z);
    light.userData.base = intensity;
    lights.push(light);
    group.add(light);
    // 灯泡 + 一截花线
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), bulbOff);
    bulb.position.set(x, y, z);
    bulbs.push(bulb);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 4), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    wire.position.set(x, y + 0.22, z);
    group.add(bulb, wire);
  };
  const addSpill = (x, y, z, tx, tz, intensity) => {
    const s = new THREE.SpotLight(WARM, intensity, 8, 0.75, 0.9, 1.4);
    s.position.set(x, y, z);
    s.target.position.set(tx, 0, tz);
    s.userData.base = intensity;
    lights.push(s);
    group.add(s, s.target);
  };

  const ceiling = NH.height - 0.15;
  const midZ = (NH.rect.z0 + NH.rect.z1) / 2;
  const zIn = NH.rect.z1 - NH.wall - 0.03; // 南墙内侧
  for (const room of NH.rooms) {
    addBulb((room.x0 + room.x1) / 2, ceiling - 0.45, midZ, 5, 7);
    const d = room.door;
    addSpill(d.x, NH.floor + 1.9, zIn, d.x, NH.rect.z1 + 2.2, 7);
    for (const w of room.windows) {
      const y0 = NH.floor + w.sill;
      // 窗玻璃后面的暖光面
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(w.width - 0.08, w.height - 0.08), glowMat);
      glow.position.set(w.x, y0 + w.height / 2, zIn);
      glows.push(glow);
      group.add(glow);
      addSpill(w.x, y0 + w.height, zIn, w.x, NH.rect.z1 + 1.8, 3);
    }
  }
  // 厨房：一盏暗一点的灯，窗户也透光
  const kx = (K.rect.x0 + K.rect.x1) / 2 + 0.3;
  const kz = (K.rect.z0 + K.rect.z1) / 2;
  addBulb(kx, K.height - 0.55, kz, 2.2, 5);
  for (const w of K.windows) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w.width - 0.08, w.height - 0.08), glowMat);
    glow.position.set(K.rect.x1 - K.wall - 0.03, K.floor + w.sill + w.height / 2, w.z);
    glow.rotation.y = Math.PI / 2;
    glows.push(glow);
    group.add(glow);
  }

  let on = null;
  return {
    group,
    /** night ∈ [0,1] */
    update(night) {
      const lit = night > 0.02;
      if (lit !== on) {
        on = lit;
        for (const l of lights) l.visible = lit;
        for (const b of bulbs) b.material = lit ? bulbMat : bulbOff;
        for (const g of glows) g.visible = lit;
      }
      for (const l of lights) l.intensity = l.userData.base * night;
      glowMat.opacity = 0.75 * night;
    },
  };
}
