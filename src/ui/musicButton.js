/**
 * 右上角音乐按钮（指北针左边）。音乐默认开：
 * 1. 页面加载完先直接试着播放（有的浏览器允许，比如经常访问的网站）
 * 2. 被浏览器拦下时，main.js 显示“进入院子 ♪”遮罩，点一下就开始（这一下就是浏览器要求的用户操作）
 * 3. 兜底：第一次点击/按键/触摸页面任意处也会开始
 * 点按钮可以关掉，选择会记住（下次打开保持关闭）。?music=off 整体关闭（自检脚本用）。
 */
const KEY = 'laojia-bgm-v2'; // v2：换了新名字，之前测试时关掉的记录不再生效，所有人默认重新是“开”

export function createMusicButton(root, player) {
  let want = true;
  try {
    want = localStorage.getItem(KEY) !== 'off';
  } catch {
    /* 隐私模式等读不了就默认开 */
  }
  if (new URLSearchParams(location.search).get('music') === 'off') want = false;
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
  async function play(opts) {
    const p = player.start(opts);
    render();
    const ok = await p;
    render();
    return ok;
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
  return {
    render,
    get wanted() {
      return want;
    },
    /** 不经用户操作直接试播；返回是否成功 */
    tryAutoplay: () => (want ? play({ auto: true }) : Promise.resolve(false)),
    play,
  };
}
