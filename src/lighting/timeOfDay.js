import * as THREE from 'three';

/**
 * 四个时间预设（初秋，河北邢台，北纬约 37°）。时间滑块的值 v ∈ [0, 3]，在相邻预设之间插值。
 *   0 清晨 6:40   太阳刚出东南偏东，低、偏粉橙，有薄雾
 *   1 正午 12:00  太阳在正南、高度约 48°，白亮
 *   2 傍晚 17:00  太阳在西南偏西、很低，暖黄斜阳（默认）
 *   3 夜晚 21:00  太阳在地平线下，月光从东南来、偏蓝；北屋窗户透出昏黄灯光，满天星星
 *
 * 角度：elev 为仰角（度），az 为方位角（度，从正北顺时针：东 90、南 180、西 270）。
 * sky = Sky 着色器里的太阳位置；light = 平行光（白天=太阳，夜晚=月亮）。
 */
export const TIME_NAMES = ['清晨', '正午', '傍晚', '夜晚'];
export const TIME_KEYS = ['dawn', 'noon', 'dusk', 'night'];

export const PRESETS = [
  {
    // 清晨
    sky: { elev: 7, az: 100, turbidity: 6, rayleigh: 2.6, mie: 0.008, mieG: 0.86, clouds: 0.35 },
    light: { elev: 15, az: 105, color: 0xffc29a, intensity: 2.0 },
    hemi: { sky: 0xb4c4dc, ground: 0x8a7a62, intensity: 0.8 },
    env: 0.9,
    exposure: 0.66,
    fog: { color: 0xd8ccc0, near: 18, far: 120 },
    night: 0,
    smoke: 1,
  },
  {
    // 正午
    sky: { elev: 48, az: 180, turbidity: 2.6, rayleigh: 1.1, mie: 0.004, mieG: 0.8, clouds: 0.3 },
    light: { elev: 48, az: 180, color: 0xfff0d8, intensity: 2.2 },
    hemi: { sky: 0xe0d8cc, ground: 0xb09070, intensity: 0.6 },
    env: 0.3,
    exposure: 0.4,
    fog: { color: 0xc6d2de, near: 30, far: 190 },
    night: 0,
    smoke: 0.35,
  },
  {
    // 傍晚（默认）
    sky: { elev: 8, az: 252, turbidity: 8, rayleigh: 3, mie: 0.01, mieG: 0.9, clouds: 0.38 },
    // 光照用的太阳比天空里的略高（约 16:50），否则 2.2 m 的西土墙会把整个院子罩在阴影里
    light: { elev: 16, az: 248, color: 0xffa868, intensity: 2.4 },
    hemi: { sky: 0xe8c8a8, ground: 0x8a7458, intensity: 0.8 },
    env: 0.8,
    exposure: 0.6,
    fog: { color: 0xdcb894, near: 20, far: 135 },
    night: 0,
    smoke: 1,
  },
  {
    // 夜晚
    sky: { elev: -14, az: 280, turbidity: 2, rayleigh: 0.6, mie: 0.003, mieG: 0.8, clouds: 0.2 },
    light: { elev: 40, az: 140, color: 0x9ab2e0, intensity: 1.3 },
    hemi: { sky: 0x3a4c72, ground: 0x1a1612, intensity: 1.1 },
    env: 0.6,
    exposure: 0.95,
    fog: { color: 0x101a2e, near: 18, far: 110 },
    night: 1,
    smoke: 0.25,
  },
];

const c1 = new THREE.Color();
const c2 = new THREE.Color();
function lerpColor(a, b, t) {
  return c1.set(a).lerp(c2.set(b), t).getHex();
}
function lerpObj(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) {
    const va = a[k];
    const vb = b[k];
    if (typeof va === 'object') out[k] = lerpObj(va, vb, t);
    else if (k === 'color' || k === 'sky' || k === 'ground') out[k] = lerpColor(va, vb, t);
    else if (k === 'az') {
      // 方位角走最短的那一边
      let d = ((vb - va + 540) % 360) - 180;
      out[k] = va + d * t;
    } else out[k] = va + (vb - va) * t;
  }
  return out;
}

/** v ∈ [0,3] → 插值后的参数 */
export function sampleTime(v) {
  const x = Math.max(0, Math.min(3, v));
  const i = Math.min(2, Math.floor(x));
  return lerpObj(PRESETS[i], PRESETS[i + 1], x - i);
}

/** 仰角/方位角 → 单位方向向量（从场景指向太阳） */
export function dirFromAngles(elev, az, out = new THREE.Vector3()) {
  const e = THREE.MathUtils.degToRad(elev);
  const a = THREE.MathUtils.degToRad(az);
  return out.set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}
