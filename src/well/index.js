import * as THREE from 'three';

/**
 * 压水井（第 4 步建模，第 6 步交互）：铸铁泵身 + 长压杆 + 出水嘴（朝南）+ 井台 + 铁桶 + 水瓢 + 湿地面。
 * 按 E 或点击压杆：压杆上下、出水嘴流水到桶里。
 */
export function createWell() {
  const group = new THREE.Group();
  group.name = 'well';
  return group;
}
