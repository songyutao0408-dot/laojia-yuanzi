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
  // 两间屋的台阶连成一长溜：砖砌成台阶，外面抹石灰；x0..x1 为东西范围（西到厨房东墙那条线，东到菜地前）
  steps: { count: 3, rise: 0.15, run: 0.3, x0: -4.5, x1: 4.8 },
  // 台阶正中、两间屋中间的墙根下：天地神位（小神龛 + 香炉），立在最上一级台阶上
  shrine: { x: 0, width: 0.62, depth: 0.32, height: 1.15 },
  rooms: [
    {
      id: 'west',
      name: '西北屋',
      x0: -7.5,
      x1: 0,
      // 门、窗都开在南墙（z = -4）上；x 为洞口中心，sill 从室内地坪算起
      door: { x: -3.75, width: 0.9, height: 2.0, style: 'plank' }, // 老式木板门：竖木板 + 横穿带 + 木门闩（第 11 轮按用户照片）
      // 门西侧一扇窗（外屋）；门东侧里屋南墙上也有一扇（第 10 轮用户更正：当初记错了）
      // inner: true 的窗属于里屋，夜里不自动亮（里屋的灯要拉线开关自己开）
      windows: [
        { x: -5.8, width: 1.2, height: 1.2, sill: 0.8 },
        { x: -1.55, width: 1.0, height: 1.1, sill: 0.95, inner: true },
      ],
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

/**
 * 西北屋室内（第 10 轮）：一道隔墙把西北屋分成两间——西边“外屋”（六成，堂屋）、东边“里屋”（四成）。
 * 坐标是室内坐标：原点 = 西北屋室内西北角（墙内侧）、地坪面；+x 东、+z 南、+y 上（见 src/interiors/README.md）。
 * 室内净空 7.14 m × 4.52 m × 2.9 m。进屋门在外屋南墙；隔墙上一个小门洞通里屋，门洞挂半截白布门帘。
 * 墙：刷大白，年深日久发黄发脏；墙根往上 0.55 m 抹水泥（外屋、里屋都是）。地面铺磨旧的淡红砖。
 * 里屋：北边一铺炕（东西两头都顶着墙），隔墙上拉线开关和几张女明星海报；南墙下西南角一口水缸，往东一排做蜡烛的器具，南墙被熏黑。
 */
export const WEST_ROOM = {
  origin: { x: NORTH_HOUSE.rect.x0 + NORTH_HOUSE.wall, z: NORTH_HOUSE.rect.z0 + NORTH_HOUSE.wall }, // 室内原点的世界坐标
  size: { w: 7.14, d: 4.52, h: NORTH_HOUSE.height - 0.15 - NORTH_HOUSE.floor },
  partition: { x: 4.26, thickness: 0.24 }, // 隔墙中线：外屋净宽 4.14 m、里屋净宽 2.76 m（六四开）
  innerDoor: { z: 2.55, width: 0.8, height: 1.9 }, // 隔墙上的小门洞（z 为中心）
  curtain: { drop: 0.78 }, // 白布门帘长度（门洞高的四成左右）
  dado: 0.55, // 墙根抹水泥的高度
  kang: { depth: 1.85, height: 0.62 }, // 炕：西顶隔墙、东顶东墙、北顶后墙；从北墙往南 1.85 m，高 0.62 m
  pullSwitch: { z: 1.45, y: 2.05, cordEnd: 1.2 }, // 拉线开关：装在隔墙东面（炕头这边），灯绳垂到离地 1.2 m
  bulb: { x: 5.76, z: 2.4, drop: 0.55 }, // 里屋顶上的灯泡（15 W 左右的白炽灯），吊下来 0.55 m
  // 隔墙东面（开关这面墙）贴的海报：z 为中心、y 为中心高度
  posters: [
    { z: 0.42, y: 1.5, w: 0.5, h: 0.72 },
    { z: 1.55, y: 1.42, w: 0.52, h: 0.74 },
    { z: 3.55, y: 1.5, w: 0.5, h: 0.72 },
  ],
  vat: { height: 0.7, rimRadius: 0.27, bellyRadius: 0.33, baseRadius: 0.21 }, // 里屋西南角的水缸
  candles: { depth: 0.32, length: 0.8 }, // 水缸往东一排做蜡烛的器具（两台）
  // —— 外屋（第 11 轮，用户描述）：x 0 .. partition.x - 0.12 ——
  outer: {
    kang: { width: 1.62, height: 0.6 }, // 西边一铺大木头炕，南北通长（顶住南北墙），从西墙往东 1.62 m（第 11 轮用户：比 1.8 m 再窄一点）
    tvDesk: { x: 3.1, w: 1.6, d: 0.48, h: 0.8 }, // 靠北墙的电视桌（x 为中心）；用户：比第一版宽、高，往西挪，和炕之间留出走道
    table: { x: 2.4, z: 3.85, r: 0.4, h: 0.74 }, // 靠南墙的折叠圆桌
    washstand: { x: 3.86, z: 3.72 }, // 进门右手边（隔墙这边）的洗脸盆架
    sewing: { z: 1.4, len: 0.92, depth: 0.46 }, // 隔墙边、里屋门洞往北一点的缝纫机（z 为中心，长边顺着隔墙）
  },
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
  { id: 'jujube', name: '枣树', kind: 'jujube', x: 4.0, z: 4.6, height: 5.8, crown: 3.0, trunkRadius: 0.17 }, // 比较大，主干弯
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

/** 大水缸：西北屋门口、西边那棵梧桐树下（门东侧，不挡进门的路） */
export const WATER_VAT = { x: -2.05, z: -2.35, height: 0.86, rimRadius: 0.36, bellyRadius: 0.43, baseRadius: 0.27 };

/** 影背墙和茅厕之间的空地 */
export const BACK_YARD = {
  // 洋姜（菊芋）：一片 2 米来高的洋姜，初秋开小黄花
  jerusalemArtichoke: { x0: -2.7, x1: 2.4, z0: 6.3, z1: 8.45 },
  // 凌乱放着的老青石板：1.8 m × 0.6 m × 0.12 m；rot 为绕竖轴转角（度，0 = 长边东西向）；y 为板底高度（叠放的那块垫高）
  slabs: [
    { x: -1.9, z: 5.25, rot: 8, y: 0 },
    { x: 0.35, z: 5.45, rot: -6, y: 0 },
    { x: 0.55, z: 5.6, rot: 17, y: 0.12 },
    { x: 3.45, z: 7.55, rot: 78, y: 0 },
  ],
  slabSize: { l: 1.8, w: 0.6, t: 0.12 },
};

/** 枣树弯出来的那根枝干上绑的秋千：枝干从主干约 1.75 m 处朝 dir 方向伸出；秋千挂在离主干 hang 米处 */
export const SWING = { dir: [-0.8, -0.6], branchFrom: 1.75, branchLength: 2.2, hang: 1.35, seatHeight: 0.45, ropeGap: 0.46 };

/**
 * 人和狗：西边梧桐树下（树干在 (-2.9, -1.4)），面朝南。
 * 父亲：按正面照做的 3D 人物，身高约 1.72 m；x/z 为两脚中间，rot 为朝向（度，0 = 朝南，负数 = 往西偏，朝着狗）。
 * 大黄（中华田园犬）：坐在父亲右手边、面朝东（朝着他的腿）；x/z 为狗的身体位置，rot 为朝向（度，0 = 朝南，90 = 朝东），scale 为体型。
 */
export const CHARACTERS = {
  father: { x: -2.55, z: -0.3, rot: -18, height: 1.72 },
  dog: { x: -3.05, z: -0.25, rot: 100, scale: 1.1 },
};

/** 默认视角 */
export const VIEWS = {
  eyeHeight: 1.2, // 七八岁小孩视线高度
  walkStart: { x: -6.7, z: 6.5, look: [1, 0] }, // 站在大门口；look 为水平朝向 [dx, dz]，[1,0] = 面朝东（影背墙）
  orbitStart: { position: [17, 15, 21], target: [0, 1.5, 0] }, // 东南方斜上方
};
