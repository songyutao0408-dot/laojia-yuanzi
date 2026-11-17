import * as THREE from 'three';
import { NORTH_HOUSE as NH } from '../layout.js';
import { wb, glass, box } from '../core/whitebox.js';
import { brickBox, wallWithOpenings } from './wall.js';

/**
 * 北屋：一排两间平顶房（西北屋、东北屋）。
 * - 墙厚 0.24 m，门洞可走进去，窗洞装透明玻璃
 * - 室内地坪高 0.45 m，门前 3 级台阶
 * - 每间房暴露一个 interiorAnchor（室内西北角、地坪面），以后 src/interiors/ 的室内细节挂在这里
 */
export function createNorthHouse() {
  const group = new THREE.Group();
  group.name = 'north-house';
  const mats = { wall: wb('brick'), floor: wb('floor'), roof: wb('roof'), trim: wb('brickDark'), glass };

  const south = [];
  for (const room of NH.rooms) {
    south.push({ center: room.door.x, width: room.door.width, bottom: NH.floor, top: NH.floor + room.door.height });
    for (const w of room.windows) {
      const bottom = NH.floor + w.sill;
      south.push({ center: w.x, width: w.width, bottom, top: bottom + w.height, glass: true });
    }
  }
  const { group: shell, inner } = brickBox(
    { rect: NH.rect, wall: NH.wall, height: NH.height, floor: NH.floor, parapet: NH.parapet, openings: { s: south } },
    mats,
  );
  group.add(shell);

  // 两间之间的隔墙（目前不开门，待确认）
  group.add(
    wallWithOpenings(
      { axis: 'z', from: inner.z0, to: inner.z1, at: NH.partitionX, thickness: NH.wall, y0: 0, y1: NH.height - 0.15, openings: [] },
      mats.wall,
    ),
  );

  // 台阶：3 级，最上一级与室内地坪齐平
  const st = NH.steps;
  for (const room of NH.rooms) {
    for (let i = 0; i < st.count; i++) {
      const top = st.rise * (i + 1);
      const depth = st.run * (st.count - i); // 下面的台阶更深
      group.add(
        box(room.door.x - st.width / 2, room.door.x + st.width / 2, 0, top, NH.rect.z1, NH.rect.z1 + depth, wb('brickDark'), { solid: false }),
      );
    }
  }

  // 每间房的室内锚点
  const half = NH.wall / 2;
  for (const room of NH.rooms) {
    const anchor = new THREE.Object3D();
    anchor.name = `interior-anchor-${room.id}`;
    const ix0 = room.x0 === NH.rect.x0 ? inner.x0 : room.x0 + half;
    anchor.position.set(ix0, NH.floor, inner.z0);
    anchor.userData = {
      room: room.id,
      size: {
        w: (room.x1 === NH.rect.x1 ? inner.x1 : room.x1 - half) - ix0,
        d: inner.z1 - inner.z0,
        h: NH.height - 0.15 - NH.floor,
      },
    };
    group.add(anchor);
  }
  return group;
}
