/**
 * 右上角音乐按钮（指北针左边）。
 * 浏览器不允许网页自己出声，所以：默认“开”，等用户第一次点击/按键/触摸页面时开始播放；
 * 点按钮可以关掉，选择会记住（下次打开保持关闭）。
 */
const KEY = 'laojia-bgm';

export function createMusicButton(root, player) {
  let want = true;
  try {
    want = localStorage.getItem(KEY) !== 'off';
  } catch {
    /* 隐私模式等读不了就默认开 */
  }
  root.innerHTML = '<button type="button" aria-label="背景音乐"><span class="note">♪</span><span class="slash"></span></button>';
  const btn = root.querySelector('button');
  const render = () => {
    btn.classList.toggle('on', player.playing);
    btn.classList.toggle('loading', player.playing && !player.ready);
    btn.title = player.playing ? '关掉背景音乐' : '打开背景音乐';
  };
  const save = () => {
    try {
      localStorage.setItem(KEY, want ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  };
  async function play() {
    const p = player.start();
    render();
    await p;
    render();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    want = !player.playing;
    save();
    if (want) play();
    else {
      player.stop();
      render();
    }
  });

  // 第一次和页面互动时自动开始（只要没被关掉）
  const first = (e) => {
    if (e.target === btn || btn.contains(e.target)) return; // 点的就是按钮，交给按钮处理
    ['pointerdown', 'keydown', 'touchstart'].forEach((t) => window.removeEventListener(t, first, true));
    if (want) play();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => window.addEventListener(t, first, true));
  render();
  return { render };
}
