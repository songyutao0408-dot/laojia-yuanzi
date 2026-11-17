// 与 src/layout.js 中 { x0, x1, z0, z1 } 矩形配套的小工具
export const rectSize = (r) => ({ w: r.x1 - r.x0, d: r.z1 - r.z0 });
export const rectCenter = (r) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
