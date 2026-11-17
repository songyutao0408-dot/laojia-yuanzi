/**
 * 院子布局 —— 全项目唯一的尺寸/位置数据源（Single Source of Truth）
 *
 * 坐标约定（详见 CLAUDE.md）：
 *   1 单位 = 1 米
 *   +X = 东，-X = 西
 *   -Z = 北，+Z = 南
 *   +Y = 上，地面 y = 0
 *   原点 = 整个宅院（院墙围合范围）的中心
 *
 * 院子地面是裸露的黄土，没有砖铺的路。
 * 矩形一律用 { x0, x1, z0, z1 } 表示（x0 < x1，z0 < z1，即 z0 是北边、z1 是南边）。
 * 这个文件只放纯数据，不 import three，因此 Node 脚本（scripts/gen-plan.mjs）也能直接读取。
 * 修改尺寸：先改 docs/scene-spec.md，再改这里，然后 `npm run plan` 重新生成平面图。
 */

/** 宅院外边界：东西 15 m，南北 18 m（包含北屋进深） */
export const LOT = { x0: -7.5, x1: 7.5, z0: -9, z1: 9 };

/** 通用墙厚 */
export const WALL = {
  brick: 0.24, // 二四砖墙
  earth: 0.4, // 夯土墙
};

/** 北屋：一排两间平顶房，坐北朝南；每间东西 7.5 m × 南北 5 m */
export const NORTH_HOUSE = {
  rect: { x0: -7.5, x1: 7.5, z0: -9, z1: -4 }, // 外轮廓，进深 5 m
  height: 3.5, // 地面到屋顶面
  parapet: 0.35, // 屋顶边沿砖砌檐口（女儿墙）高度
  plinth: 0.35, // 外墙根一圈抹水泥的勒脚高度（约三四十厘米）
  wall: WALL.brick,
  floor: 0.45, // 室内地坪 = 3 级台阶 × 0.15
  partitionX: 0, // 两间之间的隔墙中心线
  steps: { count: 3, rise: 0.15, run: 0.3, width: 1.4 },
  rooms: [
    {
      id: 'west',
      name: '西北屋',
      x0: -7.5,
      x1: 0,
      // 门、窗都开在南墙（z = -4）上；x 为洞口中心，sill 从室内地坪算起
      door: { x: -3.75, width: 0.9, height: 2.0 },
      // 只在门西侧有窗，门东侧没有窗
      windows: [{ x: -5.8, width: 1.2, height: 1.2, sill: 0.8 }],
    },
    {
      id: 'east',
      name: '东北屋',
      x0: 0,
      x1: 7.5,
      door: { x: 3.75, width: 0.9, height: 2.0 },
      // 只在门东侧有窗，门西侧没有窗
      windows: [{ x: 5.8, width: 1.2, height: 1.2, sill: 0.8 }],
    },
  ],
};

/** 厨房：院子西侧北段，与西北屋之间隔约 2 m 的空当 */
export const KITCHEN = {
  name: '厨房',
  rect: { x0: -7.5, x1: -4.5, z0: -2, z1: 3 }, // 东西 3 m × 南北 5 m
  height: 2.3, // ≈ 北屋的 2/3
  parapet: 0.2,
  wall: WALL.brick,
  floor: 0.05,
  // 门、窗开在东墙（x = -4.5）上，朝院子；z 为洞口中心
  door: { z: -0.8, width: 0.9, height: 1.8 },
  windows: [{ z: 1.6, width: 0.8, height: 0.7, sill: 1.0 }],
  chimney: { x: -7.05, z: -1.55, size: 0.5, top: 3.4 }, // 西北角，烟囱顶高 3.4 m
  stove: { x0: -7.26, x1: -6.0, z0: -1.76, z1: -0.3, height: 0.8, wokFromSouth: 0.58 }, // 室内西北角灶台；烟囱在灶后，锅在灶前
};

/** 厨房与西北屋之间的空当（露天，约 2 m 宽） */
export const KITCHEN_GAP = { x0: -7.5, x1: -4.5, z0: -4, z1: -2 };

/** 院墙（夯土） */
export const EARTH_WALLS = [
  // 西侧：厨房与北屋之间空当的西端，封住院子
  { id: 'west-north', rect: { x0: -7.5, x1: -7.1, z0: -4, z1: -2 }, height: 2.2 },
  // 西侧：厨房南边约 2 m 的土墙，尽头接大门
  { id: 'west', rect: { x0: -7.5, x1: -7.1, z0: 3, z1: 5.4 }, height: 2.2 },
  // 西侧：大门南边的一小段，接南墙
  { id: 'west-south', rect: { x0: -7.5, x1: -7.1, z0: 7.6, z1: 9 }, height: 2.2 },
  // 南墙（实际是南邻居家的房子，为方便做成土墙）
  { id: 'south', rect: { x0: -7.5, x1: 7.5, z0: 8.6, z1: 9 }, height: 2.2 },
  // 东墙：从东南角一直连到北屋东头
  { id: 'east', rect: { x0: 7.1, x1: 7.5, z0: -4, z1: 9 }, height: 2.2 },
];

/** 大门：院子西南角，朝西开的双开铁门 */
export const GATE = {
  name: '大门',
  x: -7.3, // 门扇所在平面（西墙中线）
  z0: 5.4,
  z1: 7.6, // 门洞宽 2.2 m
  height: 2.0,
  posts: [], // 没有红砖门垛，铁门直接装在土墙门洞里（已确认）
};

/** 影背墙（照壁）：进门迎面，墙面朝西贴瓷砖画 */
export const SCREEN_WALL = {
  name: '影背墙',
  rect: { x0: -3.45, x1: -3.15, z0: 5.2, z1: 7.8 }, // 厚 0.3 m、宽 2.6 m，距大门约 3.7 m
  height: 2.4,
  muralFace: 'west', // 瓷砖画朝向大门
};

/** 茅厕：东南角，紧贴东土墙，无顶，门朝西 */
export const TOILET = {
  name: '茅厕',
  rect: { x0: 5.1, x1: 7.1, z0: 5.6, z1: 8.6 }, // 东西约 2 m
  height: 1.3, // 半人多高
  wall: WALL.brick,
  door: { side: 'west', z: 6.3, width: 0.7 },
};

/** 树：trunk 为树干中心，height 为总高，crown 为树冠半径（俯视） */
export const TREES = [
  { id: 'wutong-west', name: '梧桐（西）', kind: 'wutong', x: -2.9, z: -1.4, height: 10, crown: 5, trunkRadius: 0.3 },
  { id: 'wutong-east', name: '梧桐（东）', kind: 'wutong', x: 4.3, z: -1.4, height: 10, crown: 5, trunkRadius: 0.3 },
  { id: 'pomegranate', name: '石榴', kind: 'pomegranate', x: 1.6, z: -1.7, height: 3.0, crown: 1.4, trunkRadius: 0.08 },
  { id: 'jujube', name: '枣树', kind: 'jujube', x: 4.0, z: 4.6, height: 4.6, crown: 2.0, trunkRadius: 0.12 },
];

/** 压水井：石榴树下，出水嘴朝南（+Z） */
export const WELL = {
  name: '压水井',
  x: 1.6,
  z: -0.8,
  platform: { width: 1.0, depth: 0.9, height: 0.2 }, // 水泥/砖井台
  spoutDir: 'south',
  bucket: { x: 1.6, z: -0.6 }, // 铁桶放在井台上、出水嘴正下方
  wetRadius: 1.3,
};

/** 菜地：东土墙下、茅厕北边到北屋之间 */
export const GARDEN = {
  name: '菜地',
  rect: { x0: 5.0, x1: 7.1, z0: -3.4, z1: 5.2 },
  // 菜畦（南北向分畦），trellis = 竹竿架子
  beds: [
    { crop: '丝瓜', z0: -3.4, z1: 0.8, trellis: true },
    { crop: '豆角', z0: 1.0, z1: 5.2, trellis: true },
  ],
};

/** 默认视角 */
export const VIEWS = {
  eyeHeight: 1.2, // 七八岁小孩视线高度
  walkStart: { x: -6.7, z: 6.5, look: [1, 0] }, // 站在大门口；look 为水平朝向 [dx, dz]，[1,0] = 面朝东（影背墙）
  orbitStart: { position: [17, 15, 21], target: [0, 1.5, 0] }, // 东南方斜上方
};
