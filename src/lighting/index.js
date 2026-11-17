import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { sampleTime, dirFromAngles } from './timeOfDay.js';
import { createNightSky } from './stars.js';
import { createNightLights } from './nightLights.js';
import { QUALITY_SETTINGS } from '../core/quality.js';

/**
 * 光照总控：Sky 程序天空（带云）+ 由天空生成的环境光（IBL）+ 太阳/月亮平行光（柔和阴影）
 * + 半球光 + 远雾 + 星空月亮 + 夜间灯光。setTime(v) 切换时间（v ∈ [0,3]：清晨/正午/傍晚/夜晚）。
 * 其他模块可以 onTimeChange(fn) 订阅（fn 收到插值后的参数 p，例如炊烟用 p.smoke）。
 */
export function createLighting(engine) {
  const { scene, renderer } = engine;
  const qs = QUALITY_SETTINGS[engine.quality];

  // —— 天空 ——
  const sky = new Sky();
  sky.scale.setScalar(400);
  sky.frustumCulled = false;
  scene.add(sky);
  const su = sky.material.uniforms;

  // 环境光：把天空单独渲染进 PMREM（不含太阳圆盘），时间变化时重新生成（节流）
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(10);
  envScene.add(envSky);
  envSky.material.uniforms.showSunDisc.value = 0;
  let envRT = null;

  // —— 光源 ——
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(qs.shadowMap, qs.shadowMap);
  const sc = sun.shadow.camera;
  sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  scene.fog = new THREE.Fog(0xffffff, 30, 160);
  scene.background = null;

  const nightSky = createNightSky();
  scene.add(nightSky.group);
  const nightLights = createNightLights();
  scene.add(nightLights.group);

  const listeners = [];
  const tmp = new THREE.Vector3();
  let current = null;
  let envDirty = true;
  let envTimer = 0;

  function apply(v) {
    const p = sampleTime(v);
    current = { v, p };
    const sunDir = dirFromAngles(p.sky.elev, p.sky.az, new THREE.Vector3());
    for (const u of [su, envSky.material.uniforms]) {
      u.sunPosition.value.copy(sunDir);
      u.turbidity.value = p.sky.turbidity;
      u.rayleigh.value = p.sky.rayleigh;
      u.mieCoefficient.value = p.sky.mie;
      u.mieDirectionalG.value = p.sky.mieG;
      u.cloudCoverage.value = p.sky.clouds;
    }
    // 生成环境光用的天空：压低太阳周围的米氏散射光晕，否则朝着太阳的墙面会被环境光“照白”
    envSky.material.uniforms.mieCoefficient.value = p.sky.mie * 0.15;
    envSky.material.uniforms.mieDirectionalG.value = 0.6;
    // 平行光：白天=太阳，夜晚=月亮；从院子中心上方 40 m 处照下来
    dirFromAngles(Math.max(p.light.elev, 3), p.light.az, tmp);
    sun.position.copy(tmp).multiplyScalar(40);
    sun.target.position.set(0, 0, 0);
    sun.color.setHex(p.light.color);
    sun.intensity = p.light.intensity;
    hemi.color.setHex(p.hemi.sky);
    hemi.groundColor.setHex(p.hemi.ground);
    hemi.intensity = p.hemi.intensity;
    scene.environmentIntensity = p.env;
    renderer.toneMappingExposure = p.exposure;
    scene.fog.color.setHex(p.fog.color);
    scene.fog.near = p.fog.near;
    scene.fog.far = p.fog.far;
    nightSky.update(p.night, dirFromAngles(28, 140, new THREE.Vector3()));
    nightLights.update(p.night);
    envDirty = true;
    for (const fn of listeners) fn(p, v);
  }

  function rebuildEnv() {
    envRT?.dispose();
    envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    envDirty = false;
  }

  // 云慢慢飘；环境光在时间停止变化 0.15 s 后再重建
  engine.onUpdate((dt, t) => {
    su.time.value = t;
    if (envDirty) {
      envTimer += dt;
      if (envTimer > 0.15 || !scene.environment) {
        rebuildEnv();
        envTimer = 0;
      }
    }
  });

  return {
    sun,
    hemi,
    sky,
    setTime: (v) => {
      envTimer = 0;
      apply(v);
    },
    get time() {
      return current?.v;
    },
    get params() {
      return current?.p;
    },
    onTimeChange: (fn) => {
      listeners.push(fn);
      if (current) fn(current.p, current.v);
    },
  };
}
