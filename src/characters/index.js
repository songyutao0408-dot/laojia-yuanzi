import * as THREE from 'three';
import { createDog } from './dog.js';
import { createFather } from './father.js';

/**
 * 院子里的人和动物（西边梧桐树下）：
 *   father.js  父亲（约 70 岁，按照片还原的程序化人物），右手搭在大黄头上
 *   dog.js     大黄（中华田园犬），坐着、摇尾巴，被摸时往父亲腿上蹭
 *   rig.js     肢体、两段骨骼 IK、椭球等小工具
 */
export function createCharacters() {
  const group = new THREE.Group();
  group.name = 'characters';
  const dog = createDog();
  const father = createFather();
  group.add(dog.object, father.object);
  const target = new THREE.Vector3();
  return {
    group,
    dog,
    father,
    /** 大黄头的世界坐标（交互用） */
    dogHeadPosition: () => dog.head.getWorldPosition(new THREE.Vector3()),
    update(dt, t) {
      dog.update(dt, t);
      dog.headTop.getWorldPosition(target);
      father.update(dt, t, target, dog.nuzzling);
    },
  };
}
