import * as THREE from 'three';
import { createDog } from './dog.js';
import { createFather } from './father.js';
import { createGirl } from './girl.js';

/**
 * 院子里的人和动物（西边梧桐树下）：
 *   father.js  父亲（参考照片衣着做的程序化 3D 人物，脸是建模加手画的），右手搭在大黄头上
 *   girl.js    厨房灶前坐在小板凳上烧火的小女孩（第 16 轮）
 *   dog.js     大黄（中华田园犬），坐着、摇尾巴，被摸时往父亲腿上蹭
 *   rig.js     肢体、两段骨骼 IK、椭球等小工具
 */
export function createCharacters() {
  const group = new THREE.Group();
  group.name = 'characters';
  const dog = createDog();
  const father = createFather();
  const girl = createGirl();
  group.add(dog.object, father.object, girl.object);
  const target = new THREE.Vector3();
  return {
    group,
    dog,
    father,
    girl,
    /** 大黄头的世界坐标（交互用） */
    dogHeadPosition: () => dog.head.getWorldPosition(new THREE.Vector3()),
    update(dt, t) {
      dog.update(dt, t);
      dog.headTop.getWorldPosition(target);
      father.update(dt, t, target, dog.nuzzling);
      girl.update(dt, t);
    },
  };
}
