/**
 * 树叶风摆：给材质注入顶点着色器位移（随时间、随实例位置相位变化的轻微摆动）。
 * 用法：applyWind(material, { amp })；主循环里调用 updateWind(elapsed)。
 */
const uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

export function updateWind(t) {
  uniforms.uTime.value = t;
}
export function setWindStrength(s) {
  uniforms.uWind.value = s;
}

export function applyWind(material, { amp = 0.04, freq = 1.6 } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 anchor = vec3(0.0);
          #ifdef USE_INSTANCING
            anchor = instanceMatrix[3].xyz;
          #endif
          float ph = dot(anchor, vec3(1.7, 0.9, 1.3));
          // 离挂点越远摆得越多（卡片底部是挂点）
          float w = clamp(position.y + 0.2, 0.0, 1.5);
          float s = sin(uTime * ${freq.toFixed(2)} + ph) + 0.5 * sin(uTime * ${(freq * 2.3).toFixed(2)} + ph * 1.7);
          transformed.x += s * ${amp.toFixed(3)} * w * uWind;
          transformed.z += cos(uTime * ${(freq * 0.8).toFixed(2)} + ph) * ${(amp * 0.7).toFixed(3)} * w * uWind;
        }`,
      );
  };
  material.customProgramCacheKey = () => `wind-${amp}-${freq}`;
  return material;
}
