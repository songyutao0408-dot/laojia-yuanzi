import * as THREE from 'three';
import { SCREEN_WALL as S } from '../layout.js';
import { box } from '../core/box.js';
import { mat } from '../textures/index.js';
import { tileMural } from '../textures/mural.js';

/**
 * 影背墙（照壁）：红砖砌墙身 + 墙座 + 水泥压顶；朝西（正对大门）的一面镶一幅瓷砖画
 * （11 × 8 块 20 cm 方瓷砖拼成：公园、湖面、荷花），白色瓷砖缝，釉面有光泽。
 */
export function createScreenWall() {
  const group = new THREE.Group();
  group.name = 'screen-wall';
  const r = S.rect;
  const brick = mat('brick');
  // 墙座（略宽）
  group.add(box(r.x0 - 0.06, r.x1 + 0.06, 0, 0.36, r.z0 - 0.06, r.z1 + 0.06, brick));
  // 墙身
  group.add(box(r.x0, r.x1, 0.36, S.height, r.z0, r.z1, brick));
  // 压顶：一皮挑砖 + 水泥帽
  group.add(box(r.x0 - 0.05, r.x1 + 0.05, S.height, S.height + 0.07, r.z0 - 0.05, r.z1 + 0.05, brick, { solid: false }));
  group.add(box(r.x0 - 0.08, r.x1 + 0.08, S.height + 0.07, S.height + 0.13, r.z0 - 0.08, r.z1 + 0.08, mat('concrete'), { solid: false }));

  // 瓷砖画
  const { set, tilesX, tilesY, tile } = tileMural();
  const w = tilesX * tile;
  const h = tilesY * tile;
  const muralMat = new THREE.MeshStandardMaterial({ ...set, roughness: 1, metalness: 0 });
  muralMat.name = 'tile-mural';
  muralMat.envMapIntensity = 0.2; // 釉面反光但不要把画面冲白
  const mural = new THREE.Mesh(new THREE.BoxGeometry(0.012, h, w), [muralMat, muralMat, mat('concrete'), mat('concrete'), mat('concrete'), mat('concrete')]);
  // BoxGeometry 的 -X 面（朝西）是第 2 个材质槽，这里两个都用瓷砖画；+X 面贴在墙里看不见
  mural.position.set(r.x0 - 0.006, 0.36 + (S.height - 0.36) / 2, (r.z0 + r.z1) / 2);
  mural.receiveShadow = true;
  mural.castShadow = false;
  group.add(mural);
  // 瓷砖画四周一圈水泥收边
  const bx0 = r.x0 - 0.016;
  const yc = mural.position.y;
  const zc = mural.position.z;
  const e = 0.035;
  group.add(box(bx0, r.x0, yc - h / 2 - e, yc - h / 2, zc - w / 2 - e, zc + w / 2 + e, mat('concrete'), { solid: false }));
  group.add(box(bx0, r.x0, yc + h / 2, yc + h / 2 + e, zc - w / 2 - e, zc + w / 2 + e, mat('concrete'), { solid: false }));
  group.add(box(bx0, r.x0, yc - h / 2, yc + h / 2, zc - w / 2 - e, zc - w / 2, mat('concrete'), { solid: false }));
  group.add(box(bx0, r.x0, yc - h / 2, yc + h / 2, zc + w / 2, zc + w / 2 + e, mat('concrete'), { solid: false }));
  return group;
}
