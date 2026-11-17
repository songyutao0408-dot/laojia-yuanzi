import * as THREE from 'three';
import { TREES } from '../layout.js';
import { wb, crownGhost } from '../core/whitebox.js';

/**
 * 树木。第 2 步是白模：锥形树干 + 半透明树冠体积，只用来核对高度、冠幅和间距。
 * 第 4 步换成 wutong.js / pomegranate.js / jujube.js：分叉树干、树皮纹理、透明叶片成簇、风摆、果子。
 */
const SHAPE = {
  // trunkFrac：主干到分叉处占树高的比例；crownBottom：树冠下沿占树高比例
  wutong: { trunkFrac: 0.45, crownBottom: 0.35, color: 0x4f7d3a },
  pomegranate: { trunkFrac: 0.3, crownBottom: 0.2, color: 0x5d7f35 },
  jujube: { trunkFrac: 0.4, crownBottom: 0.35, color: 0x6c8a3a },
};

export function createTrees() {
  const group = new THREE.Group();
  group.name = 'trees';
  for (const t of TREES) {
    const s = SHAPE[t.kind];
    const g = new THREE.Group();
    g.name = t.id;
    g.position.set(t.x, 0, t.z);

    const trunkH = t.height * s.trunkFrac;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(t.trunkRadius * 0.7, t.trunkRadius, trunkH, 12), wb('bark'));
    trunk.position.y = trunkH / 2;
    trunk.castShadow = trunk.receiveShadow = true;
    trunk.userData.solid = true; // 第一人称碰撞：只有树干挡人
    g.add(trunk);

    const y0 = t.height * s.crownBottom;
    const ch = t.height - y0;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), crownGhost(s.color));
    crown.scale.set(t.crown, ch / 2, t.crown);
    crown.position.y = y0 + ch / 2;
    crown.castShadow = true;
    g.add(crown);

    group.add(g);
  }
  return group;
}
