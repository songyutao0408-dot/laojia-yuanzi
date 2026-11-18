/**
 * 屏幕提示：toast（一句话，几秒后消失）、hint（走近物体时的常驻提示）、basket（摘了几个）、
 * 操作说明（“走进去”模式下显示一会儿）、准星（锁定鼠标时）。
 */
export function createHUD(root, { touch }) {
  root.innerHTML = `
    <div class="toast"></div>
    <div class="hint"></div>
    <div class="basket"></div>
    <div class="help"></div>
    <div class="crosshair"></div>
    <div class="actions"></div>`;
  const $ = (s) => root.querySelector(s);
  let toastTimer = 0;
  let helpTimer = 0;
  const help = touch
    ? '左下角摇杆走动 · 屏幕上滑动转头 · 走到压水井、石榴树、枣树旁边，点下面出现的按钮'
    : 'W A S D 走动（Shift 跑）· 按住鼠标拖动转头 · 走到压水井、果树旁边按 E 或点下面出现的按钮';
  return {
    touch,
    toast(msg) {
      const el = $('.toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
    },
    hint(msg) {
      const el = $('.hint');
      el.textContent = msg || '';
      el.classList.toggle('show', !!msg);
    },
    basket(b) {
      const parts = Object.entries(b).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`);
      $('.basket').textContent = parts.length ? `兜里：${parts.join('，')}` : '';
    },
    walkMode(on) {
      const el = $('.help');
      el.textContent = help;
      el.classList.toggle('show', on);
      clearTimeout(helpTimer);
      if (on) helpTimer = setTimeout(() => el.classList.remove('show'), 7000);
      root.classList.toggle('walking', on);
    },
    /** acts：[{label, run}]；同样的按钮不重复重建 */
    actions(acts) {
      const el = $('.actions');
      const key = acts.map((a) => a.label).join('|');
      if (el.dataset.key === key) {
        el._acts = acts;
        return;
      }
      el.dataset.key = key;
      el._acts = acts;
      el.innerHTML = acts.map((a, i) => `<button data-i="${i}">${a.label}${!touch && i === 0 ? '<small>E</small>' : ''}</button>`).join('');
      el.querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          el._acts[+b.dataset.i]?.run();
        }),
      );
    },
    setLocked(on) {
      $('.crosshair').classList.toggle('show', on);
    },
  };
}
