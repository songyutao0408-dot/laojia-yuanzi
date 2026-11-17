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
 * 矩形一律用 { x0, x1, z0, z1 } 表示（x0 < x1，z0 < z1，即 z0 是北边、z1 是南边）。
 * 这个文件只放纯数据，不 import three，因此 Node 脚本（scripts/gen-plan.mjs）也能直接读取。
 * 修改尺寸：先改 docs/scene-spec.md，再改这里，然后 `npm run plan` 重新生成平面图。
 */

/** 宅院外边界：东西 10 m，南北 14 m（包含北屋） */
export const LOT = { x0: -5, x1: 5, z0: -7, z1: 7 };

/** 通用墙厚 */
export const WALL = {
  brick: 0.24, // 二四砖墙
  earth: 0.4, // 夯土墙
};

/** 北屋：一排两间平顶房，坐北朝南 */
export const NORTH_HOUSE = {
  rect: { x0: -5, x1: 5, z0: -7, z1: -2 }, // 外轮廓，进深 5 m
  height: 3.5, // 地面到屋顶面
  parapet: 0.35, // 屋顶边沿砖砌檐口（女儿墙）高度
  wall: WALL.brick,
  floor: 0.45, // 室内地坪 = 3 级台阶 × 0.15
  partitionX: 0, // 两间之间的隔墙中心线
  steps: { count: 3, rise: 0.15, run: 0.3, width: 1.4 },
  rooms: [
    {
      id: 'west',
      name: '西北屋',
      x0: -5,
      x1: 0,
      // 门、窗都开在南墙（z = -2）上；x 为洞口中心，sill 从室内地坪算起
      door: { x: -1.9, width: 0.9, height: 2.0 },
      // 西半边被厨房挡住，只在门东侧开一扇窗
      windows: [{ x: -0.75, width: 1.0, height: 1.2, sill: 0.8 }],
    },
    {
      id: 'east',
      name: '东北屋',
      x0: 0,
      x1: 5,
      door: { x: 2.2, width: 0.9, height: 2.0 },
      windows: [
        { x: 0.9, width: 1.0, height: 1.2, sill: 0.8 },
        { x: 3.8, width: 1.2, height: 1.2, sill: 0.8 },
      ],
    },
  ],
};

/** 厨房：院子西侧北段，紧贴北屋前墙 */
export const KITCHEN = {
  name: '厨房',
  rect: { x0: -5, x1: -2.6, z0: -2, z1: 1.8 },
  height: 2.3, // ≈ 北屋的 2/3
  parapet: 0.2,
  wall: WALL.brick,
  floor: 0.05,
  // 门、窗开在东墙（x = -2.6）上，朝院子；z 为洞口中心
  door: { z: -0.9, width: 0.9, height: 1.8 },
  windows: [{ z: 0.85, width: 0.8, height: 0.7, sill: 1.0 }],
  chimney: { x: -4.55, z: -1.55, size: 0.5, top: 3.4 }, // 西北角，烟囱顶高 3.4 m
  stove: { x0: -4.76, x1: -3.6, z0: -1.76, z1: -0.6, height: 0.8 }, // 室内西北角灶台
};

/** 院墙（夯土） */
export const EARTH_WALLS = [
  // 西侧：厨房南边约 2 m 的土墙，尽头接大门
  { id: 'west', rect: { x0: -5, x1: -4.6, z0: 1.8, z1: 3.8 }, height: 2.2 },
  // 西侧：大门南边的一小段，接南墙
  { id: 'west-south', rect: { x0: -5, x1: -4.6, z0: 6.8, z1: 7 }, height: 2.2 },
  // 南墙（原描述未提及，暂按土墙处理，待确认）
  { id: 'south', rect: { x0: -5, x1: 5, z0: 6.6, z1: 7 }, height: 2.2 },
  // 东墙：从东南角一直连到北屋东头
  { id: 'east', rect: { x0: 4.6, x1: 5, z0: -2, z1: 7 }, height: 2.2 },
];

/** 大门：院子西南角，朝西开的双开铁门 */
export const GATE = {
  name: '大门',
  x: -4.8, // 门扇所在平面（西墙中线）
  z0: 4.2,
  z1: 6.4, // 门洞宽 2.2 m
  height: 2.0,
  posts: [
    { x0: -5, x1: -4.6, z0: 3.8, z1: 4.2, height: 2.4 },
    { x0: -5, x1: -4.6, z0: 6.4, z1: 6.8, height: 2.4 },
  ],
};

/** 影背墙（照壁）：进门迎面，墙面朝西贴瓷砖画 */
export const SCREEN_WALL = {
  name: '影背墙',
  rect: { x0: -1.55, x1: -1.25, z0: 3.9, z1: 6.5 }, // 厚 0.3 m、宽 2.6 m
  height: 2.4,
  muralFace: 'west', // 瓷砖画朝向大门
};

/** 茅厕：东南角，紧贴东土墙，无顶，门朝西 */
export const TOILET = {
  name: '茅厕',
  rect: { x0: 2.4, x1: 4.6, z0: 4.2, z1: 6.6 },
  height: 1.3, // 半人多高
  wall: WALL.brick,
  door: { side: 'west', z: 4.85, width: 0.7 },
};

/** 树：trunk 为树干中心，height 为总高，crown 为树冠半径（俯视） */
export const TREES = [
  { id: 'wutong-west', name: '梧桐（西）', kind: 'wutong', x: -1.5, z: 0.5, height: 4.6, crown: 3.2, trunkRadius: 0.22 },
  { id: 'wutong-east', name: '梧桐（东）', kind: 'wutong', x: 2.7, z: 0.3, height: 4.6, crown: 3.2, trunkRadius: 0.22 },
  { id: 'pomegranate', name: '石榴', kind: 'pomegranate', x: 1.0, z: 0.2, height: 3.0, crown: 1.4, trunkRadius: 0.08 },
  { id: 'jujube', name: '枣树', kind: 'jujube', x: 2.0, z: 3.4, height: 4.6, crown: 2.0, trunkRadius: 0.12 },
];

/** 压水井：石榴树下，出水嘴朝南（+Z） */
export const WELL = {
  name: '压水井',
  x: 1.0,
  z: 1.15,
  platform: { width: 1.0, depth: 0.9, height: 0.2 }, // 水泥/砖井台
  spoutDir: 'south',
  bucket: { x: 1.0, z: 1.75 },
  wetRadius: 1.3,
};

/** 菜地：东土墙下、茅厕北边到北屋之间 */
export const GARDEN = {
  name: '菜地',
  rect: { x0: 3.3, x1: 4.6, z0: -1.4, z1: 3.9 },
  // 菜畦（南北向分畦），trellis = 竹竿架子
  beds: [
    { crop: '黄瓜', z0: -1.4, z1: 0.6, trellis: true },
    { crop: '豆角', z0: 0.8, z1: 2.4, trellis: true },
    { crop: '时令菜（茄子/辣椒/小白菜）', z0: 2.6, z1: 3.9, trellis: false },
  ],
};

/** 红砖小路：中心线折线 + 宽度 */
export const BRICK_PATHS = [
  {
    id: 'main',
    width: 0.8,
    points: [
      [-4.6, 5.3], // 大门内
      [-2.2, 5.3], // 影背墙前左转
      [-2.2, 2.4],
      [0.0, 2.4],
      [0.0, -0.8], // 到北屋台阶前
    ],
  },
  {
    id: 'steps',
    width: 0.8,
    points: [
      [-1.9, -0.8],
      [2.2, -0.8],
    ],
  },
];

/** 默认视角 */
export const VIEWS = {
  eyeHeight: 1.2, // 七八岁小孩视线高度
  walkStart: { x: -4.2, z: 5.3, look: [1, 0] }, // 站在大门口；look 为水平朝向 [dx, dz]，[1,0] = 面朝东（影背墙）
  orbitStart: { position: [10, 9.5, 12], target: [0, 0.5, 0] }, // 东南方斜上方
};
