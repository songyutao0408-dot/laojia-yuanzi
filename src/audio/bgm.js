import bgmUrl from './bgm.mp3?url';

/**
 * 背景音乐：src/audio/bgm.mp3（用户提供，2 分 40 秒，已裁掉开头空白、首尾加了淡入淡出，128 kbps）。
 * - 网站版：作为单独文件发布；单文件版：被 vite-plugin-singlefile 以 data: 地址内联进 HTML
 * - 用 <audio> 边下边播（不整首解码，省内存），loop 循环；音量淡入淡出走 Web Audio 的 GainNode
 *   （iOS 上 audio.volume 是只读的，只能这样调音量）
 * - 浏览器要求第一次出声必须在用户点击/按键里：start() 要在手势回调里调用
 * - 页面加载完、空闲时先把文件取成 blob（blob: 地址和页面同源，单文件版用 file:// 打开也能接 Web Audio）
 */
// 通过对象属性引用：避免打包压缩时把（单文件版里 3.4 MB 的）data: 地址在每个用到的地方各复制一份
const SRC = { url: bgmUrl };
const VOL = 0.35; // 背景音乐，压在环境之下

export function createBGMPlayer() {
  let ctx = null;
  let gain = null;
  let audio = null;
  let blobUrl = null;
  let playing = false;
  let ready = false;
  let analyser = null;

  // 空闲时预取（不影响首屏）
  const prefetch = new Promise((resolve) => {
    const go = () =>
      fetch(SRC.url)
        .then((r) => r.blob())
        .then((b) => (blobUrl = URL.createObjectURL(b)))
        .catch(() => null)
        .then(resolve);
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 3000 }) : go()), 3000);
  });

  function ensure() {
    if (audio) return;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS 17+：静音开关打开也能出声
    } catch {
      /* 不支持就算了 */
    }
    audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.src = blobUrl || SRC.url; // 还没预取完就直接用原地址
    audio.addEventListener('playing', () => (ready = true));
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      gain.connect(analyser);
    } catch {
      // Web Audio 不可用：直接用元素自己的音量（没有淡入淡出）
      ctx = null;
      audio.volume = VOL;
    }
  }

  function fade(to, seconds) {
    if (!ctx) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to, now + seconds);
  }

  let fadeTimer = 0;
  document.addEventListener('visibilitychange', () => {
    if (!audio || !playing) return;
    if (document.hidden) audio.pause();
    else {
      ctx?.resume();
      audio.play().catch(() => {});
    }
  });

  return {
    prefetch,
    get playing() {
      return playing;
    },
    get ready() {
      return ready;
    },
    /** 调试/自检用：<audio> 元素 */
    get element() {
      return audio;
    },
    /** 调试/自检用：当前输出电平（0..1 的 RMS）、播放进度 */
    probe() {
      let rms = 0;
      if (analyser) {
        const d = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(d);
        rms = Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length);
      }
      return { rms: +rms.toFixed(4), time: +(audio?.currentTime ?? 0).toFixed(2), duration: +(audio?.duration ?? 0).toFixed(2), src: audio?.src.slice(0, 5) };
    },
    /** 必须在用户手势里调用 */
    async start() {
      if (playing) return;
      playing = true;
      clearTimeout(fadeTimer);
      ensure();
      ctx?.resume();
      try {
        await audio.play();
      } catch (e) {
        playing = false;
        console.warn('背景音乐播放失败', e);
        return;
      }
      fade(VOL, 2.5);
    },
    stop() {
      if (!playing) return;
      playing = false;
      fade(0, 0.6);
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => !playing && audio?.pause(), ctx ? 700 : 0);
    },
  };
}
