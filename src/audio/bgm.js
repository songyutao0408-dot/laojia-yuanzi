import { BPM, BEATS_PER_BAR, CHORDS, MELODY_A, MELODY_B } from './score.js';
import { rng } from '../textures/canvas.js';

/**
 * 背景音乐：用 Web Audio 把 score.js 的乐谱离线合成成一段音频（不需要任何音频文件，单文件版也能用），
 * 然后无缝循环播放。音色全部是合成的：
 *   拨弦（像古筝：起音略滑、亮音快速变暗）、竹笛（慢起音、颤音、气声）、温暖垫底和弦、八音盒似的分解和弦、低音；
 *   整体加混响、轻微音高晃动（老磁带的感觉）、削掉高频。
 * 页面加载完后在后台先合成好（普通电脑约 1~3 秒）；浏览器要求必须在用户点击/按键之后才能出声。
 */
const SPB = 60 / BPM; // 每拍秒数
const BAR = SPB * BEATS_PER_BAR;
const LOOP = BAR * CHORDS.length;
const TAIL = 4; // 混响尾巴：合成后折回到开头，循环处不断音
const SR = 22050; // 高频本来就被削到 4 kHz，用 22 kHz 合成足够，计算量减半（播放时浏览器自动重采样）

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

/** 离线合成一整轮，返回可无缝循环的 AudioBuffer */
export async function renderBGM(sampleRate = SR) {
  const ctx = new OfflineAudioContext(2, Math.ceil((LOOP + TAIL) * sampleRate), sampleRate);
  const r = rng(1990);
  const human = (t) => t + (r() - 0.5) * 0.018; // 轻微的手弹误差

  // —— 总线：干声 + 混响 → 低通（旧磁带）→ 输出 ——
  const master = ctx.createGain();
  master.gain.value = 0.55;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4200;
  tone.Q.value = 0.5;
  master.connect(tone).connect(ctx.destination);
  const dry = ctx.createGain();
  dry.gain.value = 0.8;
  dry.connect(master);
  const rev = ctx.createConvolver();
  rev.buffer = impulse(ctx, 2.4, 2.4);
  const wet = ctx.createGain();
  wet.gain.value = 0.42;
  rev.connect(wet).connect(master);
  const send = (node, amount) => {
    node.connect(dry);
    const g = ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(rev);
  };

  // 老磁带的“走音”：所有振荡器共用一个很慢的音高晃动
  const wow = ctx.createOscillator();
  wow.frequency.value = 0.45;
  const wowDepth = ctx.createGain();
  wowDepth.gain.value = 5; // 音分
  wow.connect(wowDepth);
  wow.start(0);
  const osc = (type, f, t0, t1) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    wowDepth.connect(o.detune);
    o.start(t0);
    o.stop(t1);
    return o;
  };

  // —— 拨弦（像古筝）——
  function pluck(m, t, vel = 1, len = 2.2, pan = 0) {
    const f = hz(m);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.22 * vel, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.35);
    out.gain.exponentialRampToValueAtTime(0.0008, t + len);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + 0.8);
    lp.connect(out);
    for (const [type, mult, g] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sine', 3, 0.12]]) {
      const o = osc(type, f * mult, t, t + len + 0.1);
      // 古筝拨弦时音高从略低处滑上来
      o.detune.setValueAtTime(-35, t);
      o.detune.linearRampToValueAtTime(0, t + 0.06);
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg).connect(lp);
    }
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    out.connect(p);
    send(p, 0.55);
  }

  // —— 竹笛 ——
  const noiseBuf = noise(ctx, 2);
  function flute(m, t, dur, vel = 1) {
    const f = hz(m);
    const end = t + dur;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.13 * vel, t + 0.14);
    out.gain.setValueAtTime(0.12 * vel, Math.max(t + 0.15, end - 0.25));
    out.gain.linearRampToValueAtTime(0, end + 0.2);
    const o = osc('sine', f, t, end + 0.3);
    const o2 = osc('triangle', f * 2, t, end + 0.3);
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;
    // 长音才加颤音，晚一点进来
    if (dur >= 1.2) {
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.2;
      const vd = ctx.createGain();
      vd.gain.setValueAtTime(0, t);
      vd.gain.linearRampToValueAtTime(12, t + Math.min(dur, 1.2));
      vib.connect(vd);
      vd.connect(o.detune);
      vd.connect(o2.detune);
      vib.start(t);
      vib.stop(end + 0.3);
    }
    o.connect(out);
    o2.connect(g2).connect(out);
    // 气声
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 1.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.05 * vel, t + 0.05);
    ng.gain.linearRampToValueAtTime(0.012 * vel, t + 0.3);
    ng.gain.linearRampToValueAtTime(0, end + 0.2);
    n.connect(bp).connect(ng).connect(out);
    n.start(t);
    n.stop(end + 0.3);
    const p = ctx.createStereoPanner();
    p.pan.value = 0.12;
    out.connect(p);
    send(p, 0.7);
  }

  // —— 垫底和弦：两个略微走调的锯齿波，过低通，慢起慢收 ——
  function pad(notes, t, dur) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.03, t + 1.1);
    out.gain.setValueAtTime(0.03, t + dur - 0.2);
    out.gain.linearRampToValueAtTime(0, t + dur + 1.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    lp.connect(out);
    for (const m of notes) {
      for (const det of [-7, 7]) {
        const o = osc('sawtooth', hz(m), t, t + dur + 1.5);
        o.detune.value = det;
        o.connect(lp);
      }
    }
    send(out, 0.8);
  }

  // —— 低音 ——
  function bass(m, t, dur) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.16, t + 0.04);
    out.gain.exponentialRampToValueAtTime(0.05, t + dur);
    out.gain.linearRampToValueAtTime(0, t + dur + 0.3);
    osc('sine', hz(m), t, t + dur + 0.4).connect(out);
    const o2 = osc('triangle', hz(m) * 2, t, t + dur + 0.4);
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    o2.connect(g2).connect(out);
    send(out, 0.2);
  }

  // —— 编排 ——
  CHORDS.forEach((c, i) => {
    const t = i * BAR;
    pad(c.pad, t, BAR);
    bass(c.bass, t, BAR * 0.5);
    bass(c.bass + 7 > 50 ? c.bass - 5 : c.bass + 7, t + BAR * 0.5, BAR * 0.45);
    // 八音盒似的分解和弦：每小节 8 个八分音符，高八度、很轻
    const arp = [c.pad[0] + 12, c.pad[2] + 12, c.pad[3] + 12, c.pad[2] + 12, c.pad[1] + 12, c.pad[2] + 12, c.pad[3] + 12, c.pad[2] + 12];
    const inB = i >= 8;
    arp.forEach((m, k) => {
      if (!inB && k % 2 === 1) return; // A 段稀一些，让旋律出来
      pluck(m, human(t + k * SPB * 0.5), inB ? 0.32 : 0.22, 1.4, k % 2 ? -0.35 : 0.3);
    });
  });
  let t = 0;
  for (const [m, beats] of MELODY_A) {
    pluck(m, human(t), 0.85 + r() * 0.15, Math.max(1.6, beats * SPB * 1.6), -0.08);
    t += beats * SPB;
  }
  for (const [m, beats] of MELODY_B) {
    flute(m, t, beats * SPB * 0.97);
    t += beats * SPB;
  }

  const full = await ctx.startRendering();
  return foldLoop(full, sampleRate);
}

/** 把混响尾巴叠回开头，得到恰好一轮长、首尾相接的 buffer；并归一化音量 */
function foldLoop(full, sampleRate) {
  const n = Math.round(LOOP * sampleRate);
  const out = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate });
  let peak = 0;
  for (let ch = 0; ch < 2; ch++) {
    const src = full.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src.subarray(0, n));
    for (let i = n; i < src.length; i++) dst[i - n] += src[i];
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(dst[i]));
  }
  // 归一化到峰值 0.85（播放音量由播放器控制）
  {
    const k = 0.85 / Math.max(peak, 1e-6);
    for (let ch = 0; ch < 2; ch++) {
      const d = out.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] *= k;
    }
  }
  return out;
}

function impulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const r = rng(7);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}
function noise(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(11);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return buf;
}

/**
 * 播放器：start() 必须在用户点击/按键里第一次调用；淡入淡出；页面切到后台自动暂停。
 */
export function createBGMPlayer() {
  let ctx = null;
  let gain = null;
  let src = null;
  let buffer = null;
  let loading = null;
  let playing = false;
  const VOL = 0.35; // 背景音乐，压在环境之下

  async function ensure() {
    if (!ctx) {
      // iOS 17+：按“媒体播放”处理，静音开关打开时也能出声（和视频一样）
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
      } catch {
        /* 不支持就算了 */
      }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') await ctx.resume();
    if (!buffer) buffer = await (loading ??= renderBGM());
  }

  // 离线合成不需要用户手势，在后台音频线程里算，不卡画面：页面加载完稍等一下就先合成好
  // 等着色器编译、首帧上传都过去（5 秒后、页面空闲时）再开始，避免和刚打开时的加载抢 CPU
  setTimeout(() => {
    const go = () => (loading ??= renderBGM().then((b) => (buffer = b)));
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 3000 });
    else go();
  }, 5000);

  document.addEventListener('visibilitychange', () => {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    get playing() {
      return playing;
    },
    get ready() {
      return !!buffer;
    },
    async start() {
      if (playing) return;
      playing = true;
      // 先在用户手势里创建/恢复 AudioContext（iOS 要求），再等合成完成
      const p = ensure();
      await p;
      if (!playing) return;
      if (!src) {
        src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(gain);
        src.start();
      }
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(VOL, now + 2.5);
    },
    stop() {
      if (!playing) return;
      playing = false;
      if (!ctx) return;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
    },
  };
}
