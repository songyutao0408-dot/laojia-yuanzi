import * as THREE from 'three';
import { NORTH_HOUSE as NH } from '../layout.js';
import { box } from '../core/box.js';
import { mat, glassMat, stainMat } from '../textures/index.js';
import { brickBox, wallWithOpenings, baseStain } from './wall.js';
import { woodDoor, woodWindow, couplets } from './doorsWindows.js';

/** 每间门上的旧春联（右 = 上联，左 = 下联，站在门外看） */
const COUPLETS = {
  west: { right: '春回大地千山秀', left: '日暖神州万物荣', top: '万象更新' },
  east: { right: '天增岁月人增寿', left: '春满乾坤福满门', top: '四季平安' },
};

/**
 * 北屋：一排两间平顶房（西北屋、东北屋），清水红砖墙。
 * - 墙厚 0.24 m，门洞可走进去，木框玻璃窗，水泥过梁、砖窗台
 * - 外墙根一圈约 0.35 m 高抹水泥的勒脚，上面才是清水砖
 * - 室内地坪高 0.45 m（铺砖），门前 3 级红砖台阶；屋顶一圈砖檐口
 * - 木门两扇向内半开，门上倒贴福字，门两侧褪色春联；墙根泛碱、泥点
 * - 每间房暴露 interiorAnchor（室内西北角、地坪面），以后 src/interiors/ 的室内细节挂在这里
 */
export function createNorthHouse() {
  const group = new THREE.Group();
  group.name = 'north-house';
  const mats = {
    wall: mat('brick'),
    floor: mat('floorBrick'),
    roof: mat('roof'),
    ceiling: mat('limeWash'),
    trim: mat('brick'),
    coping: mat('concrete'),
    glass: glassMat,
    lintel: mat('concrete'),
    sill: mat('brick'),
  };
  const zs = NH.rect.z1 - NH.wall / 2; // 南墙中线

  const south = [];
  for (const room of NH.rooms) {
    south.push({ center: room.door.x, width: room.door.width, bottom: NH.floor, top: NH.floor + room.door.height, lintel: true });
    for (const w of room.windows) {
      const bottom = NH.floor + w.sill;
      south.push({ center: w.x, width: w.width, bottom, top: bottom + w.height, glass: true, lintel: true, sill: true });
    }
  }
  const { group: shell, inner } = brickBox(
    { rect: NH.rect, wall: NH.wall, height: NH.height, floor: NH.floor, parapet: NH.parapet, openings: { s: south } },
    mats,
  );
  group.add(shell);

  // 两间之间的实心隔墙（已确认没有门）
  group.add(
    wallWithOpenings({ axis: 'z', from: inner.z0, to: inner.z1, at: NH.partitionX, thickness: NH.wall, y0: NH.floor, y1: NH.height - 0.15, openings: [] }, mats),
  );

  // 门、窗、春联
  for (const room of NH.rooms) {
    const d = room.door;
    group.add(woodDoor({ axis: 'x', at: zs, center: d.x, width: d.width, bottom: NH.floor, height: d.height, thickness: NH.wall, out: +1 }));
    group.add(couplets({ axis: 'x', at: zs, center: d.x, width: d.width, top: NH.floor + d.height + 0.02, out: +1, wallHalf: NH.wall / 2, texts: COUPLETS[room.id] }));
    for (const w of room.windows) {
      group.add(woodWindow({ axis: 'x', at: zs, center: w.x, width: w.width, bottom: NH.floor + w.sill, height: w.height }));
    }
  }

  // 台阶：3 级红砖台阶，踏面铺砖、侧面砌砖，最上一级与室内地坪齐平
  const st = NH.steps;
  const stepMats = [mat('brick'), mat('brick'), mat('paving'), mat('paving'), mat('brick'), mat('brick')];
  for (const room of NH.rooms) {
    for (let i = 0; i < st.count; i++) {
      const top = st.rise * (i + 1);
      const depth = st.run * (st.count - i);
      group.add(box(room.door.x - st.width / 2, room.door.x + st.width / 2, top - st.rise, top, NH.rect.z1, NH.rect.z1 + depth, stepMats, { solid: false }));
    }
  }

  // 墙根水泥勒脚：四面外墙各一条，比砖面凸出 1.5 cm
  {
    const { x0, x1, z0, z1 } = NH.rect;
    const e = 0.015;
    const H = NH.plinth;
    const c = mat('cementPlinth');
    const o = { solid: false };
    group.add(box(x0 - e, x1 + e, 0, H, z1 - 0.05, z1 + e, c, o));
    group.add(box(x0 - e, x1 + e, 0, H, z0 - e, z0 + 0.05, c, o));
    group.add(box(x0 - e, x0 + 0.05, 0, H, z0, z1, c, o));
    group.add(box(x1 - 0.05, x1 + e, 0, H, z0, z1, c, o));
    // 勒脚上沿一道抹出的小斜坡（压在砖面上的水泥收口）
    group.add(box(x0 - e, x1 + e, H, H + 0.02, z1 - 0.05, z1 + 0.006, c, o));
  }

  // 墙根泛碱 + 泥点（南立面、东西山墙的院内一侧）
  const stain = stainMat();
  group.add(baseStain(stain, { axis: 'x', from: NH.rect.x0, to: NH.rect.x1, at: NH.rect.z1, face: 's', height: 0.9 }));

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
