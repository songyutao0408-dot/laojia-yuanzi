import { TIME_NAMES } from '../lighting/timeOfDay.js';

/**
 * 时间滑块：清晨 / 正午 / 傍晚 / 夜晚。可以拖到中间（平滑过渡），松手后吸附到最近的时刻。
 */
export function createTimeSlider(root, value, onChange) {
  root.innerHTML = `
    <input type="range" min="0" max="3" step="0.01" value="${value}" aria-label="时间">
    <div class="ticks">${TIME_NAMES.map((n, i) => `<button data-v="${i}">${n}</button>`).join('')}</div>`;
  const input = root.querySelector('input');
  const ticks = [...root.querySelectorAll('.ticks button')];
  const mark = (v) => ticks.forEach((b, i) => b.classList.toggle('active', Math.abs(v - i) < 0.5));
  let raf = 0;
  const set = (v) => {
    mark(v);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => onChange(v));
  };
  input.addEventListener('input', () => set(+input.value));
  input.addEventListener('change', () => {
    // 松手吸附，并用 0.6 s 平滑过渡
    animateTo(Math.round(+input.value));
  });
  ticks.forEach((b) => b.addEventListener('click', () => animateTo(+b.dataset.v)));

  let anim = 0;
  function animateTo(target) {
    cancelAnimationFrame(anim);
    const from = +input.value;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 600);
      const v = from + (target - from) * (1 - (1 - k) ** 3);
      input.value = v;
      set(v);
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  mark(value);
}
