import * as THREE from 'three';
import { SCREEN_WALL as S } from '../layout.js';
import { wb, box } from '../core/whitebox.js';

/** 影背墙（照壁）：墙身 + 朝西的一面瓷砖画（第 3 步换成程序生成的公园湖面荷花瓷砖画） */
export function createScreenWall() {
  const group = new THREE.Group();
  group.name = 'screen-wall';
  const r = S.rect;
  // 墙座
  group.add(box(r.x0 - 0.05, r.x1 + 0.05, 0, 0.3, r.z0 - 0.05, r.z1 + 0.05, wb('brickDark')));
  // 墙身
  group.add(box(r.x0, r.x1, 0.3, S.height, r.z0, r.z1, wb('plaster')));
  // 墙帽
  group.add(box(r.x0 - 0.08, r.x1 + 0.08, S.height, S.height + 0.12, r.z0 - 0.08, r.z1 + 0.08, wb('brickDark')));
  // 瓷砖画面（朝西）
  group.add(box(r.x0 - 0.01, r.x0, 0.5, S.height - 0.15, r.z0 + 0.15, r.z1 - 0.15, wb('tile'), { solid: false }));
  return group;
}
