import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * 能识别透明叶片的 GTAO：原版在渲染法线/深度时用一个统一的覆盖材质，
 * 会把带 alpha 的叶片卡片当成整块方片，在树下压出方块形的暗影。
 * 这里改成逐个物体换成“同贴图、同 alphaTest”的法线材质；透明物体（玻璃、贴花、烟、星星）不参与。
 */
class AlphaAwareGTAOPass extends GTAOPass {
  constructor(...args) {
    super(...args);
    this._normalMats = new Map();
    this._swap = [];
  }

  _normalFor(m) {
    let n = this._normalMats.get(m);
    if (!n) {
      n = new THREE.MeshNormalMaterial({ side: m.side });
      if (m.alphaTest > 0 && m.map) {
        // MeshNormalMaterial 本身不支持贴图透明度：注入一段按原贴图 alpha 丢弃像素的代码
        const map = m.map;
        const cut = m.alphaTest;
        n.defines = { USE_UV: '' };
        n.onBeforeCompile = (sh) => {
          sh.uniforms.alphaSrc = { value: map };
          sh.fragmentShader = sh.fragmentShader
            .replace('uniform float opacity;', 'uniform float opacity;\nuniform sampler2D alphaSrc;')
            .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n if (texture2D(alphaSrc, vUv).a < ${cut.toFixed(2)}) discard;`);
        };
        n.customProgramCacheKey = () => `normal-alpha-${map.uuid}`;
      }
      n.blending = THREE.NoBlending;
      this._normalMats.set(m, n);
    }
    return n;
  }

  _renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha) {
    if (overrideMaterial !== this.normalMaterial) return super._renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha);
    const swap = this._swap;
    this.scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const skip = o.userData.noAO || mats.every((m) => m.transparent || m.isShaderMaterial || m.visible === false);
      swap.push([o, o.material, o.visible]);
      if (skip) o.visible = false;
      else o.material = Array.isArray(o.material) ? o.material.map((m) => this._normalFor(m)) : this._normalFor(o.material);
    });
    const bg = this.scene.background;
    this.scene.background = null;
    renderer.getClearColor(this._originalClearColor);
    const alpha = renderer.getClearAlpha();
    const auto = renderer.autoClear;
    renderer.setRenderTarget(renderTarget);
    renderer.autoClear = false;
    renderer.setClearColor(clearColor);
    renderer.setClearAlpha(clearAlpha || 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = auto;
    renderer.setClearColor(this._originalClearColor);
    renderer.setClearAlpha(alpha);
    this.scene.background = bg;
    for (const [o, m, v] of swap) {
      o.material = m;
      o.visible = v;
    }
    swap.length = 0;
  }
}

/** 建立后期链：RenderPass → GTAO（仅高画质）→ OutputPass（ACES 色调映射 + sRGB） */
export function createPostFX(engine) {
  const { renderer, scene, camera } = engine;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (engine.quality === 'high') {
    gtao = new AlphaAwareGTAOPass(scene, camera, size.x, size.y);
    gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    gtao.blendIntensity = 0.9;
    composer.addPass(gtao);
  }
  composer.addPass(new OutputPass());
  engine.onResize((w, h) => composer.setSize(w, h));
  engine.setRenderFn(() => composer.render());
  return { composer, gtao };
}
