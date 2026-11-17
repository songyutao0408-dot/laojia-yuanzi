/**
 * 手机操作（仅“走进去”模式显示）：
 * - 左下角虚拟摇杆：拖动小圆钮走动
 * - 屏幕其它地方滑动：转头（主要用右半屏）；轻点（没怎么移动）：当作点击，交给交互模块（压水、摘果子）
 */
export function createTouchControls(root, canvas, fp, onTap) {
  root.innerHTML = '<div class="stick"><div class="knob"></div></div>';
  const stick = root.querySelector('.stick');
  const knob = root.querySelector('.knob');
  const R = 48;
  let stickId = null;
  let center = null;

  const setKnob = (dx, dy) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  stick.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    stickId = t.identifier;
    const r = stick.getBoundingClientRect();
    center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    e.preventDefault();
  }, { passive: false });

  const looks = new Map();
  canvas.addEventListener('touchstart', (e) => {
    if (!fp.state.enabled) return;
    for (const t of e.changedTouches) {
      looks.set(t.identifier, { x: t.clientX, y: t.clientY, moved: 0, t0: performance.now() });
    }
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId && center) {
        let dx = t.clientX - center.x;
        let dy = t.clientY - center.y;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          dx = (dx / d) * R;
          dy = (dy / d) * R;
        }
        setKnob(dx, dy);
        fp.setMove(dx / R, -dy / R);
      }
      const l = looks.get(t.identifier);
      if (l) {
        const dx = t.clientX - l.x;
        const dy = t.clientY - l.y;
        l.moved += Math.abs(dx) + Math.abs(dy);
        l.x = t.clientX;
        l.y = t.clientY;
        fp.look(dx, dy, 0.006);
      }
    }
  }, { passive: true });

  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null;
        setKnob(0, 0);
        fp.setMove(0, 0);
      }
      const l = looks.get(t.identifier);
      if (l) {
        if (l.moved < 10 && performance.now() - l.t0 < 400) onTap(t.clientX, t.clientY);
        looks.delete(t.identifier);
      }
    }
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);

  return {
    show(on) {
      root.style.display = on ? 'block' : 'none';
    },
  };
}
