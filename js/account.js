// v56: trang Tài khoản — đăng nhập Google, mã QR / mã kích hoạt để mở lộ trình N3–N1, đồng bộ theo tài khoản, xoá tài khoản.
import { esc, icon, toast, fmtDate } from './util.js';
import { openSheet, confirmBox, emptyState } from './ui.js';
import qrcode from './vendor/qrcode.js';
import {
  cloudEnabled, bootCloud, cloudUser, onCloud, signIn, signOutCloud, deleteAccount, myGrants, refreshGrants, grantInfo,
  redeemCode, publicSettings, cloudSync, cloudSyncInfo, isAdmin, qrLink, LOCKED, normCode, fmtCode, lockState, syncLocked,
} from './cloud.js';
import { lockLevels, hasLockContent } from './data.js';

const dmy = t => { if (!t) return '—'; const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const avatarHTML = (u, cls = 'acct-av') => u?.photo
  ? `<img class="${cls}" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">`
  : `<span class="${cls} acct-av-t" aria-hidden="true">${esc((u?.name || u?.email || '?').trim().charAt(0).toUpperCase())}</span>`;
export function grantLine(g) {
  const i = grantInfo(g);
  if (i.state === 'none') return { cls: 'gs-none', t: 'Chưa mở' };
  if (i.forever && i.state === 'on') return { cls: 'gs-on', t: 'Đã mở · không thời hạn' };
  if (i.state === 'on') return { cls: i.left <= 7 ? 'gs-soon' : 'gs-on', t: `Mở đến ${dmy(i.until - 1)} · còn ${i.left} ngày` };
  if (i.state === 'grace') return { cls: 'gs-soon', t: `Hết hạn ${dmy(i.until - 1)} · còn dùng được tới ${dmy(i.grace - 1)}` };
  return { cls: 'gs-off', t: `Hết hạn ${dmy(i.until - 1)}` };
}
const linkify = s => esc(s).replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`).replace(/\n/g, '<br>');

export function showMyQR(u) {
  const qr = qrcode(0, 'M'); qr.addData(qrLink(u.uid)); qr.make();
  openSheet(`<h2 class="h2">Mã QR tài khoản</h2>
    <p class="small">Đưa mã này cho quản trị viên quét để mở lộ trình cho tài khoản <b>${esc(u.email || u.name)}</b>.</p>
    <div class="qr">${qr.createSvgTag({ cellSize: 5, margin: 4, scalable: true, alt: 'Mã QR tài khoản' })}</div>
    <p class="small muted">Mã tài khoản: <span class="mono">${esc(u.uid)}</span></p>`, { label: 'Mã QR tài khoản' });
}

// v57: tình trạng nội dung của cấp đã mở trên máy này
function contentLine(L, g) {
  if (!lockLevels().includes(L)) return '';
  const st = grantInfo(g).state;
  if (st !== 'on' && st !== 'grace') return '';
  if (lockState[L] === 'tai') return '<small class="gc">Đang tải nội dung…</small>';
  if (lockState[L] === 'loi') return '<small class="gc err">Chưa tải được nội dung — bấm "Cập nhật trạng thái".</small>';
  if (lockState[L] === 'cho') return '<small class="gc">Quản trị viên chưa cập nhật nội dung lộ trình này.</small>';
  return hasLockContent(L) ? '<small class="gc">Đã tải nội dung, học được cả khi không có mạng.</small>' : '';
}
export async function renderAccount(view, ctx, q = '') {
  const qs = new URLSearchParams(q), pre = normCode(qs.get('ma') || ''), toMo = qs.has('mo');
  view.innerHTML = `<h1 class="h1">Tài khoản</h1><div class="acct"><p class="muted loading">Đang tải…</p></div>`;
  const box = view.querySelector('.acct');
  if (!cloudEnabled()) {
    box.innerHTML = emptyState('Bản app này chưa bật tài khoản. Mọi phần học vẫn dùng bình thường; tiến độ lưu trong máy này.', '<a class="btn btn-ghost" href="#/dulieu">Mở Dữ liệu</a>');
    return;
  }
  let off = null, seq = 0, scrolled = false;
  const draw = async () => {
    if (!box.isConnected) { off?.(); return; }
    const my = ++seq, u = cloudUser();
    if (!u) {
      box.innerHTML = `<section class="card">
        <h2 class="h2">Đăng nhập bằng Google</h2>
        <ul class="acct-why small">
          <li>Tiến độ tự lưu lên tài khoản — đổi máy, cài lại app vẫn học tiếp.</li>
          <li>Lộ trình N3 trở lên do quản trị viên mở cho từng tài khoản.</li>
        </ul>
        ${pre ? `<p class="note small">Đăng nhập xong, mã <b class="mono">${esc(fmtCode(pre))}</b> sẽ được điền sẵn.</p>` : ''}
        <button type="button" class="btn btn-primary btn-block" data-act="in">${icon('user')} Đăng nhập bằng Google</button>
        <p class="small muted">Tiến độ đang có trên máy này được giữ nguyên và gộp vào tài khoản. Không đăng nhập vẫn học N5, N4 bình thường.</p>
        <p class="small acct-links"><a href="trang/gioithieu.html">Giới thiệu</a> · <a href="trang/riengtu.html">Quyền riêng tư</a> · <a href="trang/dieukhoan.html">Điều khoản</a></p>
      </section>`;
      box.querySelector('[data-act=in]').onclick = async e => {
        const b = e.currentTarget; b.disabled = true; b.textContent = 'Đang đăng nhập…';
        try {
          const r = await signIn();
          toast(r?.first ? 'Đã đăng nhập. Tiến độ trên máy này đã lưu lên tài khoản.' : r?.error ? `Đã đăng nhập, nhưng chưa đồng bộ được: ${r.error}` : 'Đã đăng nhập và đồng bộ tiến độ.');
          ctx.refreshSync?.();
        } catch (err) { toast(err.message || 'Không đăng nhập được.'); b.disabled = false; b.innerHTML = `${icon('user')} Đăng nhập bằng Google`; }
      };
      return;
    }
    const [g, si, adm] = await Promise.all([myGrants(), cloudSyncInfo(), isAdmin()]);
    const pub = await publicSettings().catch(() => ({}));
    if (!box.isConnected || my !== seq) return;
    const typed = box.querySelector('.acct-code [name=code]'), keep = typed && typed.value, hadFocus = typed && document.activeElement === typed; // giữ mã đang gõ khi trang vẽ lại
    box.innerHTML = `<section class="card acct-me">
        <div class="acct-head">${avatarHTML(u)}<div><b>${esc(u.name || 'Tài khoản Google')}</b><span class="small muted">${esc(u.email)}</span></div></div>
        <p class="small muted acct-uid">Mã tài khoản: <span class="mono">${esc(u.uid.slice(0, 6))}…${esc(u.uid.slice(-4))}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-act="cpuid">Chép mã</button></p>
      </section>
      <a class="mode acct-admin" href="#/hoso">${icon('star')}<span><b>Hồ sơ & bảng xếp hạng</b><small>Biệt danh, ảnh đại diện, khung, huy hiệu</small></span></a>
      ${adm ? `<a class="mode acct-admin" href="#/quantri">${icon('shield')}<span><b>Trang quản trị</b><small>Mở / gia hạn lộ trình, mã kích hoạt, nhật ký</small></span></a>` : ''}
      <section class="card" id="mo">
        <h2 class="h2">Lộ trình N3 trở lên</h2>
        <p class="small muted">Do quản trị viên mở cho từng tài khoản, có thời hạn.</p>
        <ul class="grant-l">${LOCKED.map(L => { const s = grantLine(g[L]); return `<li><b>${L}</b><span class="gs ${s.cls}">${esc(s.t)}</span>${contentLine(L, g[L])}</li>`; }).join('')}</ul>
        <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="qr">${icon('qr')} Hiện mã QR cho quản trị viên</button></div>
        <form class="acct-code" novalidate>
          <label class="field"><span class="field-l">Nhập mã kích hoạt</span>
            <input class="input mono" name="code" value="${esc(pre ? fmtCode(pre) : '')}" placeholder="XXXXX-XXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text"></label>
          <button class="btn btn-primary" type="submit">Mở khóa</button>
        </form>
        ${pub.contact ? `<div class="note small acct-contact"><b>Liên hệ quản trị viên</b><br>${linkify(pub.contact)}</div>` : ''}
        <button type="button" class="btn btn-ghost btn-sm" data-act="regrant">Cập nhật trạng thái</button>
      </section>
      <section class="card">
        <h2 class="h2">Đồng bộ theo tài khoản</h2>
        <p class="small muted">Tiến độ tự lưu khi mở app, sau mỗi lượt học và khi có mạng trở lại.</p>
        <p class="small acct-sync">Lần đồng bộ cuối: ${fmtDate(si.t)}${si.err ? `<br><span class="err">Lỗi lần trước: ${esc(si.err)}</span>` : ''}</p>
        <button type="button" class="btn btn-ghost" data-act="sync">${icon('sync')} Đồng bộ ngay</button>
      </section>
      <section class="card">
        <h2 class="h2">Khác</h2>
        <p class="small acct-links"><a href="trang/gioithieu.html">Giới thiệu</a> · <a href="trang/riengtu.html">Quyền riêng tư</a> · <a href="trang/dieukhoan.html">Điều khoản</a></p>
        <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="out">Đăng xuất</button></div>
        <details class="acct-del"><summary>Xoá tài khoản</summary>
          <p class="small">Xoá hồ sơ và tiến độ đã lưu trên máy chủ, rồi xoá tài khoản đăng nhập. Tiến độ trên máy này vẫn giữ. Quyền đã mở không chuyển sang tài khoản mới.</p>
          <button type="button" class="btn btn-ghost btn-danger" data-act="del">Xoá tài khoản</button>
        </details>
      </section>`;
    if (keep) { const t = box.querySelector('.acct-code [name=code]'); t.value = keep; if (hadFocus) t.focus(); }
    const $a = s => box.querySelector(`[data-act=${s}]`);
    $a('cpuid').onclick = async () => { try { await navigator.clipboard.writeText(u.uid); toast('Đã chép mã tài khoản.'); } catch { window.prompt('Mã tài khoản:', u.uid); } };
    $a('qr').onclick = () => showMyQR(u);
    $a('regrant').onclick = async () => { try { await refreshGrants(); await syncLocked(); toast('Đã cập nhật.'); } catch (e) { toast(e.message); } };
    $a('sync').onclick = async e => {
      const b = e.currentTarget; b.disabled = true;
      const r = await cloudSync(); ctx.refreshSync?.();
      toast(r.ok ? 'Đã đồng bộ.' : r.error ? `Chưa đồng bộ được: ${r.error}` : r.skipped);
      draw();
    };
    $a('out').onclick = async () => {
      if (!(await confirmBox('Đăng xuất khỏi tài khoản trên máy này? Tiến độ trên máy vẫn giữ.', 'Đăng xuất'))) return;
      try { await cloudSync(); await signOutCloud(); toast('Đã đăng xuất.'); ctx.refreshSync?.(); } catch (e) { toast(e.message); }
    };
    $a('del').onclick = () => {
      const s = openSheet(`<h2 class="h2">Xoá tài khoản?</h2>
        <p>Gõ <b>XOÁ</b> vào ô dưới rồi bấm nút. Việc này không hoàn tác được.</p>
        <input class="input" name="cf" autocomplete="off">
        <div class="row-btns"><button class="btn btn-ghost" data-a="no">Huỷ</button><button class="btn btn-primary" data-a="yes">Xoá</button></div>`, { label: 'Xoá tài khoản' });
      s.body.onclick = async e => {
        const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
        if (a === 'no') return s.close();
        if (s.body.querySelector('[name=cf]').value.trim().toUpperCase() !== 'XOÁ') return toast('Gõ đúng chữ XOÁ để xác nhận.');
        try { await deleteAccount(); s.close(); toast('Đã xoá tài khoản.'); ctx.refreshSync?.(); }
        catch (err) { toast(err.message); }
      };
    };
    box.querySelector('.acct-code').onsubmit = async e => {
      e.preventDefault();
      const f = e.currentTarget, b = f.querySelector('button'); b.disabled = true;
      try {
        const r = await redeemCode(f.code.value);
        toast(r.extended ? `Đã cộng thêm ${r.days} ngày cho lộ trình ${r.level}.` : `Đã mở lộ trình ${r.level}.`);
        if (pre) history.replaceState(history.state, '', '#/taikhoan');
        draw();
      } catch (err) { toast(err.message); b.disabled = false; }
    };
    if (!scrolled && ((pre && location.hash.includes('ma=')) || toMo)) { scrolled = true; box.querySelector('#mo')?.scrollIntoView({ block: 'start' }); }
  };
  try { await bootCloud(); } catch (e) { box.innerHTML = emptyState('Không mở được phần tài khoản: ' + (e?.message || e)); return; }
  off = onCloud(() => draw());
  ctx.onLeave(() => off?.());
  draw();
  if (cloudUser()) refreshGrants().then(() => syncLocked()).catch(() => { });
}
