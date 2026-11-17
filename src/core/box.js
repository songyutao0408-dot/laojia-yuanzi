import * as THREE from 'three';

/**
 * 按世界坐标（米）重写几何体 UV：每个面按其法线主轴投影。
 * 配合 textureSet(meters) 里的 repeat，贴图在所有墙段之间连续、比例真实（砖不会被拉伸）。
 * offset 为几何体局部原点在世界中的位置。
 */
export function worldUV(geometry, offset = new THREE.Vector3()) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset.x;
    const y = pos.getY(i) + offset.y;
    const z = pos.getZ(i) + offset.z;
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x, -z);
    else if (ax >= az) uv.setXY(i, nor.getX(i) > 0 ? -z : z, y);
    else uv.setXY(i, nor.getZ(i) > 0 ? x : -x, y);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** 盒子工具：按 [x0,x1] [y0,y1] [z0,z1] 生成 Mesh，UV 为世界米数；solid=true 表示参与第一人称碰撞 */
export function box(x0, x1, y0, y1, z0, z1, material, { solid = true, shadow = true } = {}) {
  const center = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const geo = worldUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), center);
  const m = new THREE.Mesh(geo, material);
  m.position.copy(center);
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.userData.solid = solid;
  return m;
}
