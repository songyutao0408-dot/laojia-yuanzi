import * as THREE from 'three';
import { createDog } from './dog.js';
import { createFather } from './father.js';

/**
 * 院子里的人和动物（西边梧桐树下）：
 *   father.js  父亲（正面照抠出来的“照片人”，转向观看的人），右手搭在大黄头上
 *   dog.js     大黄（中华田园犬），坐着、摇尾巴，被摸时往父亲腿上蹭
 *   rig.js     肢体、椭球等小工具（狗用）
 */
export function createCharacters() {
  const group = new THREE.Group();
  group.name = 'characters';
  const dog = createDog();
  const father = createFather();
  group.add(dog.object, father.object);
  return {
    group,
    dog,
    father,
    /** 大黄头的世界坐标（交互用） */
    dogHeadPosition: () => dog.head.getWorldPosition(new THREE.Vector3()),
    /** 按时间给照片人调色 */
    setLight: (p) => father.setLight(p),
    update(dt, t, camera) {
      dog.update(dt, t);
      father.update(dt, t, camera);
    },
  };
}
