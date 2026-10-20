// v40: luồng riêng vẽ hiệu ứng nền (OffscreenCanvas). Nhận lệnh từ season.js; luồng chính bận dựng trang thì nền vẫn trôi.
import { createFx } from './fxcore.js';

let eng = null;
self.onmessage = e => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      if (typeof self.requestAnimationFrame !== 'function' || typeof OffscreenCanvas !== 'function') { self.postMessage({ type: 'fail', why: 'no-raf' }); return; }
      eng = createFx({
        makeCanvas: (w, h) => new OffscreenCanvas(w, h),
        raf: f => self.requestAnimationFrame(f),
        onStats: s => self.postMessage({ type: 'stats', ...s }),
      });
      eng.setHz(m.hz || 60);
      eng.resize(m.w, m.h, m.dpr);
      eng.setCanvas(m.canvas);
      eng.config(m.S, m.env);
      self.postMessage({ type: 'ready' });
      return;
    }
    if (!eng) return;
    if (m.type === 'config') eng.config(m.S, m.env, m.o || {});
    else if (m.type === 'resize') eng.resize(m.w, m.h, m.dpr);
    else if (m.type === 'hz') eng.setHz(m.v);
    else if (m.type === 'burst') eng.burst(m.x, m.y, m.n);
    else if (m.type === 'try') eng.tryFx(m.name);
  } catch (err) {
    self.postMessage({ type: 'fail', why: String(err && err.message || err) });
  }
};
