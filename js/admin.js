// v56: trang quản trị — người dùng, mở / gia hạn lộ trình N3–N1, quét mã QR tài khoản, mã kích hoạt, nhật ký, kênh liên hệ.
// Quyền thật nằm ở máy chủ (firestore.rules): người không phải admin có mở được trang này cũng không đọc / ghi được gì.
import { esc, icon, toast, DAY } from './util.js';
import { openSheet, confirmBox, emptyState, chips, bindChips, readChip } from './ui.js';
import qrcode from './vendor/qrcode.js';
import { cloudEnabled, bootCloud, cloudUser, isAdmin, admin_ as A, grantInfo, LOCKED, FOREVER, uidFromScan, fmtCode } from './cloud.js';
import { avatarHTML, grantLine } from './account.js';

const dmy = t => { if (!t) return '—'; const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };
const ago = t => { if (!t) return '—'; const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'hôm nay' : d === 1 ? 'hôm qua' : `${d} ngày trước`; };
const ms = v => (v == null ? null : typeof v === 'number' ? v : v?.toMillis ? v.toMillis() : null);
const PLUS = [[30, '+1 tháng'], [90, '+3 tháng'], [180, '+6 tháng'], [365, '+12 tháng']];
const TABS = [['', 'Người dùng'], ['ma', 'Mã'], ['noidung', 'Nội dung'], ['baosai', 'Báo sai'], ['thongbao', 'Thông báo'], ['thongke', 'Thống kê'], ['nhatky', 'Nhật ký'], ['caidat', 'Liên hệ']];
const tabsHTML = cur => `<div class="tabs adm-tabs" role="tablist">${TABS.map(([k, t]) => `<a role="tab" href="#/quantri${k ? '/' + k : ''}" aria-selected="${cur === k}">${t}</a>`).join('')}</div>`;

async function guard(view) {
  view.innerHTML = `<h1 class="h1">Quản trị</h1><div class="adm"><p class="muted loading">Đang tải…</p></div>`;
  const box = view.querySelector('.adm');
  if (!cloudEnabled()) { box.innerHTML = emptyState('Bản app này chưa bật tài khoản.'); return null; }
  try { await bootCloud(); } catch (e) { box.innerHTML = emptyState('Không mở được: ' + (e?.message || e)); return null; }
  const u = cloudUser();
  if (!u) { box.innerHTML = emptyState('Đăng nhập tài khoản quản trị trước.', '<a class="btn btn-primary" href="#/taikhoan">Đăng nhập</a>'); return null; }
  if (!(await isAdmin())) {
    box.innerHTML = emptyState('Tài khoản này không phải quản trị viên.', '') + `<p class="small muted">Mã tài khoản: <span class="mono">${esc(u.uid)}</span> — muốn đặt làm quản trị viên thì tạo mục <span class="mono">admins/${esc(u.uid)}</span> trong Firestore (xem Hướng dẫn).</p>`;
    return null;
  }
  return box;
}
const userName = u => u?.name || u?.email || '(chưa có tên)';
const pills = g => LOCKED.filter(L => g?.[L]).map(L => { const s = grantLine(g[L]); const i = grantInfo(g[L]); return `<span class="gs ${s.cls}">${L} · ${i.state === 'on' ? (i.forever ? '∞' : dmy(i.until - 1)) : i.state === 'grace' ? 'ân hạn' : 'hết hạn'}</span>`; }).join('');

// ---------- Người dùng ----------
export async function renderAdmin(view, ctx) {
  const box = await guard(view); if (!box) return;
  box.innerHTML = tabsHTML('') + '<p class="muted loading">Đang tải danh sách…</p>';
  let users, grants;
  try { [users, grants] = await Promise.all([A.users(), A.grants()]); }
  catch (e) { box.innerHTML = tabsHTML('') + emptyState('Không tải được: ' + e.message); return; }
  const byId = new Map(users.map(u => [u.id, u]));
  for (const id of Object.keys(grants)) if (!byId.has(id)) byId.set(id, { id, name: '(tài khoản đã xoá)', email: id });
  const all = [...byId.values()];
  const now = Date.now(), soon = [], expired = [];
  for (const u of all) for (const L of LOCKED) {
    const i = grantInfo(grants[u.id]?.[L]);
    if (i.state === 'on' && !i.forever && i.until - now <= 7 * DAY) soon.push([u, L, i]);
    else if (i.state === 'grace' || (i.state === 'off' && now - i.until <= 60 * DAY)) expired.push([u, L, i]);
  }
  soon.sort((a, b) => a[2].until - b[2].until); expired.sort((a, b) => b[2].until - a[2].until);
  const row = u => `<li class="adm-u"><label class="adm-ck"><input type="checkbox" value="${esc(u.id)}" aria-label="Chọn ${esc(userName(u))}"></label>
      <a href="#/quantri/u/${esc(u.id)}">${avatarHTML(u, 'adm-av')}<span class="adm-ut"><b>${esc(userName(u))}</b><small class="muted">${esc(u.email || '')}</small>
      <small>${u.stats?.cur ? `Đang học ${esc(u.stats.cur === 'kana' ? 'bảng chữ' : u.stats.cur)} · ` : ''}${ms(u.lastSeen) ? 'vào ' + ago(ms(u.lastSeen)) : ''}</small>
      <span class="adm-pills">${pills(grants[u.id])}</span></span></a></li>`;
  const exRow = ([u, L, i]) => `<li class="adm-x"><a href="#/quantri/u/${esc(u.id)}"><b>${esc(userName(u))}</b> <span class="muted small">${L} · ${i.state === 'on' ? `hết hạn ${dmy(i.until - 1)} (còn ${i.left} ngày)` : `hết hạn ${dmy(i.until - 1)}`}</span></a>
      <button type="button" class="btn btn-ghost btn-sm" data-ext="${esc(u.id)}|${L}|30">+1 tháng</button></li>`;
  box.innerHTML = tabsHTML('') + `
    <div class="adm-top"><button type="button" class="btn btn-primary" data-act="scan">${icon('camera')} Quét mã QR</button>
      <input class="input" type="search" name="q" placeholder="Tìm tên hoặc email" aria-label="Tìm người dùng"></div>
    ${soon.length ? `<section class="card"><h2 class="h2">Sắp hết hạn · 7 ngày tới</h2><ul class="adm-xl">${soon.map(exRow).join('')}</ul></section>` : ''}
    ${expired.length ? `<section class="card"><h2 class="h2">Đã hết hạn</h2><ul class="adm-xl">${expired.map(exRow).join('')}</ul></section>` : ''}
    <section class="card"><h2 class="h2">Người dùng <small class="muted">(${all.length})</small></h2>
      <ul class="adm-ul">${all.map(row).join('')}</ul>
      ${all.length ? '' : '<p class="muted">Chưa có ai đăng nhập.</p>'}
    </section>
    <div class="adm-bulk" hidden><span class="adm-bn"></span>
      ${chips('bl', LOCKED.map(L => [L, L]), 'N3', false)}
      <div class="chips">${PLUS.map(([d, t]) => `<button type="button" class="chip" data-bulk="${d}">${t}</button>`).join('')}</div></div>`;
  bindChips(box);
  const q = box.querySelector('[name=q]');
  q.oninput = () => { const s = q.value.trim().toLowerCase(); box.querySelectorAll('.adm-u').forEach(li => { li.hidden = !!s && !li.textContent.toLowerCase().includes(s); }); };
  box.querySelector('[data-act=scan]').onclick = () => openScanner(ctx);
  const bulk = box.querySelector('.adm-bulk');
  const picked = () => [...box.querySelectorAll('.adm-ck input:checked')].map(x => x.value);
  box.addEventListener('change', e => { if (e.target.closest('.adm-ck')) { const n = picked().length; bulk.hidden = !n; bulk.querySelector('.adm-bn').textContent = `Gia hạn ${n} người:`; } });
  box.addEventListener('click', async e => {
    const x = e.target.closest('[data-ext]');
    if (x) {
      const [uid, L, d] = x.dataset.ext.split('|'); x.disabled = true;
      try { await A.extend(uid, L, +d); toast(`Đã gia hạn ${L} thêm 30 ngày.`); renderAdmin(view, ctx); } catch (er) { toast(er.message); x.disabled = false; }
      return;
    }
    const b = e.target.closest('[data-bulk]');
    if (b) {
      const ids = picked(), L = readChip(box, 'bl'), d = +b.dataset.bulk;
      if (!ids.length || !(await confirmBox(`Gia hạn lộ trình ${L} thêm ${d} ngày cho ${ids.length} người?`, 'Gia hạn'))) return;
      let ok = 0;
      for (const id of ids) { try { await A.extend(id, L, d, 'gia hạn hàng loạt'); ok++; } catch (er) { toast(er.message); } }
      toast(`Đã gia hạn ${ok}/${ids.length} người.`); renderAdmin(view, ctx);
    }
  });
}

// ---------- Một người dùng ----------
export async function renderAdminUser(view, ctx, uid) {
  const box = await guard(view); if (!box) return;
  ctx.backTo = '#/quantri';
  let u, g, logs;
  try { [u, g, logs] = await Promise.all([A.user(uid), A.grant(uid), A.logs(uid)]); }
  catch (e) { box.innerHTML = emptyState('Không tải được: ' + e.message, '<a class="btn btn-ghost" href="#/quantri">‹ Người dùng</a>'); return; }
  if (!u && !Object.keys(g).length) { box.innerHTML = emptyState('Không thấy tài khoản này. Người đó cần đăng nhập app một lần trước.', '<a class="btn btn-ghost" href="#/quantri">‹ Người dùng</a>'); return; }
  u = u || { name: '(chưa có hồ sơ)', email: '' };
  const devs = Object.values(u.dev || {}).filter(t => Date.now() - t < 30 * DAY).length;
  const st = u.stats || {};
  const lv = st.lessons ? ['N5', 'N4', 'N3', 'N2', 'N1'].map(L => `${L}: ${st.lessons[L] || 0}`).join(' · ') : '';
  const lvCard = L => {
    const s = grantLine(g[L]), cur = g[L];
    return `<section class="card adm-lv" data-l="${L}"><h2 class="h2">${L} <span class="gs ${s.cls}">${esc(s.t)}</span></h2>
      ${cur?.by === 'code' && cur.code ? `<p class="small muted">Mở bằng mã ${esc(fmtCode(cur.code))}</p>` : ''}
      <div class="chips">${PLUS.map(([d, t]) => `<button type="button" class="chip" data-plus="${d}">${t}</button>`).join('')}
        <button type="button" class="chip" data-a="forever">Không thời hạn</button></div>
      <div class="adm-until"><label class="field"><span class="field-l">Hoặc mở đến ngày</span><input class="input" type="date" name="d"></label>
        <button type="button" class="btn btn-ghost btn-sm" data-a="until">Lưu ngày</button></div>
      <label class="field"><span class="field-l">Ghi chú</span><input class="input" name="note" value="${esc(cur?.note || '')}" maxlength="200"></label>
      <div class="row-btns">${cur ? '<button type="button" class="btn btn-ghost btn-sm" data-a="note">Lưu ghi chú</button><button type="button" class="btn btn-ghost btn-sm btn-danger" data-a="lock">Khóa lại</button>' : ''}</div>
    </section>`;
  };
  box.innerHTML = `<p><a href="#/quantri">‹ Người dùng</a></p>
    <section class="card acct-me"><div class="acct-head">${avatarHTML(u)}<div><b>${esc(userName(u))}</b><span class="small muted">${esc(u.email || '')}</span></div></div>
      <ul class="adm-facts small">
        <li>Tham gia: ${dmy(ms(u.created))} · vào lần cuối ${ago(ms(u.lastSeen))}</li>
        <li>Số máy dùng trong 30 ngày: ${devs}</li>
        ${st.cur ? `<li>Đang học: ${esc(st.cur === 'kana' ? 'bảng chữ' : st.cur)} · đã thuộc ${st.known || 0} mục</li>` : ''}
        ${lv ? `<li>Bài đã xong: ${lv}</li>` : ''}
        <li>Mã tài khoản: <span class="mono">${esc(uid)}</span></li>
      </ul></section>
    <section class="card adm-pub"><h2 class="h2">Hồ sơ công khai</h2><p class="muted small">Đang tải…</p></section>
    ${LOCKED.map(lvCard).join('')}
    <section class="card"><h2 class="h2">Nhật ký</h2>${logsHTML(logs, new Map([[uid, u]]))}</section>`;
  // v58: biệt danh, ảnh, bảng xếp hạng — đặt lại / gỡ
  (async () => {
    const sec = box.querySelector('.adm-pub');
    try {
      const { rank, ban } = await A.publicOf(uid), { frameHTML } = await import('./profile.js');
      sec.innerHTML = `<h2 class="h2">Hồ sơ công khai</h2>
        <div class="acct-head">${frameHTML({ ...(rank || {}), av: rank?.av || u.av || 'g', photo: u.photo, frame: rank?.frame || u.frame }, 64)}<div><b lang="ja">${esc(u.nick || '(chưa đặt biệt danh)')}</b>
          <span class="small muted">${ban ? 'Đã gỡ khỏi bảng xếp hạng' : rank ? `Trên bảng xếp hạng · ${rank.tot || 0} bài` : u.hideRank ? 'Tự ẩn khỏi bảng xếp hạng' : 'Chưa có trên bảng xếp hạng'}</span></div></div>
        <div class="row-btns wrap">${u.nick ? '<button type="button" class="btn btn-ghost btn-sm" data-m="nick">Đặt lại biệt danh</button>' : ''}${u.av && u.av !== 'g' && !u.av.startsWith('p:') ? '<button type="button" class="btn btn-ghost btn-sm" data-m="av">Gỡ ảnh</button>' : ''}
          ${ban ? '<button type="button" class="btn btn-ghost btn-sm" data-m="unban">Cho lên bảng lại</button>' : '<button type="button" class="btn btn-ghost btn-sm btn-danger" data-m="ban">Gỡ khỏi bảng xếp hạng</button>'}</div>`;
      sec.onclick = async e => {
        const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
        const msg = { nick: 'Xoá biệt danh của người này (cũng gỡ khỏi bảng xếp hạng tới khi họ đặt biệt danh mới)?', av: 'Gỡ ảnh đại diện tự tải lên của người này?', ban: 'Gỡ người này khỏi bảng xếp hạng (họ không tự lên lại được)?', unban: 'Cho người này lên bảng xếp hạng lại?' }[m];
        if (!(await confirmBox(msg, 'Đồng ý'))) return;
        try { await { nick: A.resetNick, av: A.resetAvatar, ban: A.ban, unban: A.unban }[m].call(A, uid); toast('Đã làm.'); reload(); } catch (er) { toast(er.message); }
      };
    } catch (e) { sec.innerHTML = `<h2 class="h2">Hồ sơ công khai</h2><p class="small err">Không tải được: ${esc(e.message)}</p>`; }
  })();
  const reload = () => renderAdminUser(view, ctx, uid);
  box.querySelectorAll('.adm-lv').forEach(card => {
    const L = card.dataset.l, note = () => card.querySelector('[name=note]').value.trim();
    card.addEventListener('click', async e => {
      const p = e.target.closest('[data-plus]'), a = e.target.closest('[data-a]')?.dataset.a;
      if (!p && !a) return;
      const btn = e.target.closest('button'); btn.disabled = true;
      try {
        if (p) { await A.extend(uid, L, +p.dataset.plus, note()); toast(`Đã gia hạn ${L}.`); }
        else if (a === 'forever') { if (!(await confirmBox(`Mở ${L} không thời hạn cho người này?`, 'Mở'))) { btn.disabled = false; return; } await A.forever(uid, L, note()); toast(`Đã mở ${L} không thời hạn.`); }
        else if (a === 'until') {
          const v = card.querySelector('[name=d]').value;
          if (!v) { toast('Chọn ngày trước.'); btn.disabled = false; return; }
          const [y, m, d] = v.split('-').map(Number), end = new Date(y, m - 1, d + 1).getTime();
          if (end <= Date.now()) { toast('Ngày phải sau hôm nay.'); btn.disabled = false; return; }
          await A.until(uid, L, end, note()); toast(`Đã mở ${L} đến ${dmy(end - 1)}.`);
        }
        else if (a === 'note') { await A.setNote(uid, L, note()); toast('Đã lưu ghi chú.'); btn.disabled = false; return; }
        else if (a === 'lock') { if (!(await confirmBox(`Khóa lộ trình ${L} của người này ngay bây giờ?`, 'Khóa'))) { btn.disabled = false; return; } await A.lock(uid, L, note()); toast(`Đã khóa ${L}.`); }
        reload();
      } catch (er) { toast(er.message); btn.disabled = false; }
    });
  });
}

function logsHTML(logs, names) {
  if (!logs.length) return '<p class="muted small">Chưa có.</p>';
  const end = x => (!x ? 'khóa' : x.days >= FOREVER ? 'không thời hạn' : x.start ? `đến ${dmy(x.start + x.days * DAY - 1)}` : `${x.days} ngày`);
  return `<ul class="adm-log small">${logs.map(r => `<li><span class="muted">${dmy(r.at)}</span> <b>${esc(userName(names.get(r.uid)) || r.uid)}</b> · ${esc(r.L)} · ${esc(r.kind || '')}: ${esc(r.before ? end(r.before) : 'chưa mở')} → ${esc(end(r.after))}${r.note ? ` · <i>${esc(r.note)}</i>` : ''}</li>`).join('')}</ul>`;
}

// ---------- Nhật ký ----------
export async function renderAdminLogs(view) {
  const box = await guard(view); if (!box) return;
  box.innerHTML = tabsHTML('nhatky') + '<p class="muted loading">Đang tải…</p>';
  try {
    const [logs, users] = await Promise.all([A.logs(), A.users()]);
    box.innerHTML = tabsHTML('nhatky') + `<section class="card"><h2 class="h2">300 thay đổi gần nhất</h2>${logsHTML(logs, new Map(users.map(u => [u.id, u])))}</section>`;
  } catch (e) { box.innerHTML = tabsHTML('nhatky') + emptyState('Không tải được: ' + e.message); }
}

// ---------- Kênh liên hệ ----------
export async function renderAdminSettings(view) {
  const box = await guard(view); if (!box) return;
  let s = {};
  try { s = await A.settings(); } catch { }
  box.innerHTML = tabsHTML('caidat') + `<section class="card"><h2 class="h2">Kênh liên hệ</h2>
    <p class="small muted">Hiện ở trang Tài khoản của mọi người, chỗ "Lộ trình N3 trở lên". Ví dụ: Zalo, Facebook, LINE, số điện thoại.</p>
    <textarea class="input" name="contact" rows="4" maxlength="500">${esc(s.contact || '')}</textarea>
    <div class="row-btns"><button type="button" class="btn btn-primary" data-act="save">Lưu</button></div></section>`;
  box.querySelector('[data-act=save]').onclick = async () => {
    try { await A.saveSettings({ contact: box.querySelector('[name=contact]').value.trim() }); toast('Đã lưu.'); } catch (e) { toast(e.message); }
  };
}

// ---------- Mã kích hoạt ----------
const DAYS = [['30', '1 tháng'], ['90', '3 tháng'], ['180', '6 tháng'], ['365', '12 tháng'], [String(FOREVER), 'Không thời hạn']];
const daysName = d => (DAYS.find(x => +x[0] === d)?.[1] || `${d} ngày`);
const codeLink = C => `${location.origin}${location.pathname}#/taikhoan?ma=${C}`;
function codesSheet(list, title) {
  const cards = list.map(c => {
    const qr = qrcode(0, 'M'); qr.addData(codeLink(c.id)); qr.make();
    return `<li class="code-card"><div class="qr">${qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true, alt: 'Mã QR ' + fmtCode(c.id) })}</div>
      <div><b class="mono">${esc(fmtCode(c.id))}</b><small>Lộ trình ${esc(c.level)} · ${esc(daysName(c.days))}</small></div></li>`;
  }).join('');
  const s = openSheet(`<h2 class="h2">${esc(title)}</h2>
    <p class="small muted">Người học quét mã QR bằng camera (mở app, mã được điền sẵn), hoặc tự nhập mã ở trang Tài khoản.</p>
    <ul class="code-cards">${cards}</ul>
    <div class="row-btns"><button class="btn btn-ghost" data-a="copy">Chép tất cả mã</button><button class="btn btn-ghost" data-a="print">In</button></div>`, { label: title });
  s.body.querySelector('[data-a=copy]').onclick = async () => {
    const t = list.map(c => `${fmtCode(c.id)} (${c.level}, ${daysName(c.days)})`).join('\n');
    try { await navigator.clipboard.writeText(t); toast('Đã chép.'); } catch { window.prompt('Chép các mã:', t); }
  };
  s.body.querySelector('[data-a=print]').onclick = () => { document.documentElement.classList.add('print-codes'); window.print(); setTimeout(() => document.documentElement.classList.remove('print-codes'), 500); };
}
export async function renderAdminCodes(view) {
  const box = await guard(view); if (!box) return;
  let filter = 'unused';
  const draw = async () => {
    box.innerHTML = tabsHTML('ma') + `<section class="card"><h2 class="h2">Tạo mã</h2>
        <p class="sub-label">Lộ trình</p>${chips('cl', LOCKED.map(L => [L, L]), 'N3', false)}
        <p class="sub-label">Thời hạn (tính từ lúc nhập mã)</p>${chips('cd', DAYS, '90', false)}
        <div class="adm-gen"><label class="field"><span class="field-l">Số mã</span><input class="input" type="number" name="n" min="1" max="50" value="1"></label>
          <label class="field"><span class="field-l">Ghi chú</span><input class="input" name="note" maxlength="200"></label></div>
        <button type="button" class="btn btn-primary" data-act="gen">Tạo mã</button></section>
      <section class="card"><h2 class="h2">Danh sách mã</h2>
        ${chips('cf', [['unused', 'Chưa dùng'], ['used', 'Đã dùng'], ['revoked', 'Đã thu hồi'], ['all', 'Tất cả']], filter, false)}
        <div class="codes"><p class="muted loading">Đang tải…</p></div></section>`;
    bindChips(box, () => { const f = readChip(box, 'cf'); if (f && f !== filter) { filter = f; list(); } });
    box.querySelector('[data-act=gen]').onclick = async e => {
      const n = Math.max(1, Math.min(50, +box.querySelector('[name=n]').value || 1)), L = readChip(box, 'cl'), d = +readChip(box, 'cd');
      e.currentTarget.disabled = true;
      try {
        const ids = await A.createCodes(L, d, n, box.querySelector('[name=note]').value.trim());
        codesSheet(ids.map(id => ({ id, level: L, days: d })), `Đã tạo ${ids.length} mã`);
        list();
      } catch (er) { toast(er.message); }
      e.currentTarget.disabled = false;
    };
    list();
  };
  let users = null;
  const list = async () => {
    const el = box.querySelector('.codes');
    try {
      const [codes, us] = await Promise.all([A.codes(), users || A.users()]);
      users = us; const names = new Map(us.map(u => [u.id, u]));
      const rows = codes.filter(c => filter === 'all' || (filter === 'revoked' ? c.revoked : filter === 'used' ? c.usedBy && !c.revoked : !c.usedBy && !c.revoked));
      el.innerHTML = rows.length ? `<ul class="adm-codes">${rows.map(c => `<li data-c="${esc(c.id)}"><b class="mono">${esc(fmtCode(c.id))}</b>
          <span class="small">${esc(c.level)} · ${esc(daysName(c.days))} · tạo ${dmy(c.created)}${c.note ? ' · ' + esc(c.note) : ''}</span>
          ${c.usedBy ? `<span class="small muted">Đã dùng: ${esc(userName(names.get(c.usedBy)) || c.usedBy)} · ${dmy(c.usedAt)}</span>` : ''}
          ${c.revoked ? '<span class="small err">Đã thu hồi</span>' : ''}
          <span class="adm-cb">${!c.usedBy && !c.revoked ? '<button type="button" class="btn btn-ghost btn-sm" data-a="show">QR</button><button type="button" class="btn btn-ghost btn-sm btn-danger" data-a="rev">Thu hồi</button>' : ''}</span></li>`).join('')}</ul>`
        : '<p class="muted small">Không có mã nào.</p>';
      el.onclick = async e => {
        const a = e.target.closest('[data-a]')?.dataset.a, id = e.target.closest('[data-c]')?.dataset.c; if (!a || !id) return;
        const c = codes.find(x => x.id === id);
        if (a === 'show') codesSheet([c], `Mã ${fmtCode(id)}`);
        if (a === 'rev' && await confirmBox(`Thu hồi mã ${fmtCode(id)}? Mã sẽ không dùng được nữa.`, 'Thu hồi')) { try { await A.revoke(id); toast('Đã thu hồi.'); list(); } catch (er) { toast(er.message); } }
      };
    } catch (e) { el.innerHTML = emptyState('Không tải được: ' + e.message); }
  };
  draw();
}

// ---------- Quét mã QR tài khoản ----------
export function openScanner(ctx) {
  let stream = null, stop = false;
  const s = openSheet(`<h2 class="h2">Quét mã QR tài khoản</h2>
    <p class="small muted">Người học mở app → Tài khoản → "Hiện mã QR cho quản trị viên".</p>
    <div class="scan"><video playsinline muted></video><canvas hidden></canvas></div>
    <p class="small scan-st">Đang mở camera…</p>
    <form class="scan-f"><label class="field"><span class="field-l">Hoặc dán mã tài khoản</span><input class="input mono" name="uid" autocomplete="off" spellcheck="false"></label>
      <button class="btn btn-ghost" type="submit">Mở</button></form>`, { label: 'Quét mã QR', onClose: () => { stop = true; stream?.getTracks().forEach(t => t.stop()); } });
  const st = s.body.querySelector('.scan-st'), video = s.body.querySelector('video'), cv = s.body.querySelector('canvas');
  const found = raw => {
    const uid = uidFromScan(raw);
    if (!uid) { st.textContent = 'Mã này không phải mã tài khoản của app.'; return false; }
    stop = true; s.close(); ctx.go('#/quantri/u/' + uid);
    return true;
  };
  s.body.querySelector('.scan-f').onsubmit = e => { e.preventDefault(); found(e.currentTarget.uid.value); };
  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (stop) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream; await video.play();
      st.textContent = 'Đưa mã QR vào khung hình.';
      let detect;
      if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats?.())?.includes('qr_code')) {
        const bd = new BarcodeDetector({ formats: ['qr_code'] });
        detect = async () => (await bd.detect(video))[0]?.rawValue;
      } else {
        const jsQR = (await import('./vendor/jsqr.js')).default, c2 = cv.getContext('2d', { willReadFrequently: true });
        detect = async () => {
          const w = video.videoWidth, h = video.videoHeight; if (!w) return null;
          const k = Math.min(1, 640 / w); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          c2.drawImage(video, 0, 0, cv.width, cv.height);
          return jsQR(c2.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height)?.data;
        };
      }
      const loop = async () => {
        if (stop) return;
        try { const v = await detect(); if (v && found(v)) return; } catch { }
        setTimeout(loop, 250);
      };
      loop();
    } catch (e) {
      st.textContent = e?.name === 'NotAllowedError' ? 'Chưa cho phép dùng camera. Cho phép trong cài đặt trình duyệt, hoặc dán mã tài khoản ở dưới.' : 'Không mở được camera. Dán mã tài khoản ở dưới.';
    }
  })();
}

// ---------- v57: nội dung lộ trình khóa (đẩy bó N3 / N2 / N1 lên máy chủ) ----------
// Đọc tệp .zip (nén deflate hoặc không nén) ngay trong trình duyệt — không cần thư viện.
async function readZip(file) {
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer);
  let e = buf.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Tệp .zip hỏng.');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  const out = [];
  for (let i = 0; i < n; i++) {
    const meth = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = buf.subarray(ds, ds + csize);
    let data;
    if (meth === 0) data = raw;
    else if (meth === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else throw new Error(`${name}: kiểu nén chưa hỗ trợ.`);
    if (/\.json$/i.test(name)) out.push({ name, text: new TextDecoder().decode(data) });
  }
  return out;
}
export async function renderAdminContent(view) {
  const box = await guard(view); if (!box) return;
  const draw = async () => {
    box.innerHTML = tabsHTML('noidung') + '<p class="muted loading">Đang tải…</p>';
    let metas = {};
    try { for (const L of LOCKED) metas[L] = await A.contentMeta(L); } catch (e) { box.innerHTML = tabsHTML('noidung') + emptyState('Không tải được: ' + e.message); return; }
    box.innerHTML = tabsHTML('noidung') + `<section class="card"><h2 class="h2">Nội dung lộ trình khóa</h2>
        <p class="small muted">Nội dung N3, N2, N1 nằm trên máy chủ; người được mở lộ trình mới tải về được. Mỗi khi có bản dữ liệu mới, chọn tệp <b>noidung-khoa-vNN.zip</b> gửi kèm bản cập nhật. Bản trùng bản đang có thì tự bỏ qua.</p>
        <ul class="grant-l">${LOCKED.map(L => { const m = metas[L]; return `<li><b>${L}</b><span class="gs ${m ? 'gs-on' : 'gs-none'}">${m ? `Bản ${esc(m.ver)} · ${(m.size / 1e6).toFixed(1)} MB nén · đẩy lên ${dmy(m.t)}` : 'Chưa có'}</span></li>`; }).join('')}</ul>
        <label class="field"><span class="field-l">Chọn tệp nội dung (.zip hoặc N3.json, N2.json, N1.json)</span><input class="input" type="file" accept=".zip,.json,application/zip,application/json" multiple data-in="up"></label>
        <ul class="adm-up small"></ul></section>
      <section class="card"><h2 class="h2">Gửi cho skill</h2>
        <p class="small muted">Một file cho skill <b>jp-v01-data</b>: các báo sai <b>Mới</b> trong hộp chung và báo sai trên máy này, từ tự thêm / sửa trên máy này, ${(await import('./kanji.js')).missingKanji().length} chữ Hán chưa có thẻ, và danh sách mã đang có để skill không làm trùng. Gửi file cho Claude kèm yêu cầu (ví dụ "sửa các mục báo sai").</p>
        <button type="button" class="btn btn-ghost" data-act="skillall">Tải file gửi skill</button></section>`;
    box.querySelector('[data-act=skillall]').onclick = async e => {
      const b = e.currentTarget; b.disabled = true;
      try {
        const reps = (await A.reports()).filter(r => r.st === 'moi');
        const { out, missing } = await skillFile(reps);
        saveSkillFile(out);
        toast(`Đã tải: ${out.reports.length} báo sai, ${out.kanjiMissing.length} chữ Hán thiếu thẻ.${missing.length ? ` Máy này chưa có nội dung ${missing.join(', ')} nên danh sách mã thiếu phần đó.` : ''}`);
      } catch (er) { toast(er.message); }
      b.disabled = false;
    };
    const log = t => { const li = document.createElement('li'); li.textContent = t; box.querySelector('.adm-up').appendChild(li); return li; };
    box.querySelector('[data-in=up]').onchange = async e => {
      const files = [...e.target.files]; e.target.disabled = true;
      try {
        const docs = [];
        for (const f of files) { if (/\.zip$/i.test(f.name)) docs.push(...await readZip(f)); else docs.push({ name: f.name, text: await f.text() }); }
        if (!docs.length) throw new Error('Không thấy tệp .json nào.');
        for (const d of docs) {
          let b; try { b = JSON.parse(d.text); } catch { log(`${d.name}: không đọc được.`); continue; }
          const li = log(`${d.name}: đang đẩy…`);
          try {
            const r = await A.uploadContent(b, (i, n) => { li.textContent = `${d.name} (${b.level}): đẩy phần ${i}/${n}…`; });
            li.textContent = r.same ? `${b.level}: trùng bản đang có (${b.ver}) — bỏ qua.` : `${b.level}: xong · ${r.n} phần · ${(r.size / 1e6).toFixed(1)} MB nén.`;
          } catch (er) { li.textContent = `${d.name}: lỗi — ${er.message}`; }
        }
        toast('Xong.');
        setTimeout(draw, 1200);
      } catch (er) { toast(er.message); e.target.disabled = false; }
    };
  };
  draw();
}

// ---------- v62: file gửi skill (chuyển từ trang Dữ liệu vào đây) ----------
// reports: báo sai từ hộp chung (máy chủ); local: thêm báo sai, từ tự thêm / sửa trên máy này.
async function skillFile(reports, { local = true } = {}) {
  const [{ D, activeReports, lockLevels, hasLockContent }, { missingKanji }] = await Promise.all([import('./data.js'), import('./kanji.js')]);
  const rep = reports.map(r => ({ id: r.item, note: r.note, item: D.items.get(r.item) || null, t: r.t, from: r.nick || 'nguoi-hoc' }));
  if (local) for (const [id, r] of activeReports()) if (!rep.some(x => x.id === id)) rep.push({ id, note: r.note, item: D.items.get(id) || null, t: r.t, from: 'may-nay' });
  const out = { app: 'tiengnhat', kind: 'gui-skill', created: new Date().toISOString(), from: 'quan-tri', reports: rep,
    userItems: local ? [...D.user.values()].filter(x => !x._del) : [],
    packs: [...D.packs, ...D.shadow].map(p => ({ id: p.id, title: p.title, type: p.type, version: p.version, src: p.src })),
    items: [...D.items.keys()].map(id => ({ id })), kanjiMissing: missingKanji() };
  return { out, missing: lockLevels().filter(L => !hasLockContent(L)) };
}
const saveSkillFile = async (out, tag) => (await import('./util.js')).download(`gui-skill${tag ? '-' + tag : ''}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 1));

// ---------- v59: hộp báo sai chung ----------
export async function renderAdminReports(view) {
  const box = await guard(view); if (!box) return;
  let filter = 'moi';
  const draw = async () => {
    box.innerHTML = tabsHTML('baosai') + '<p class="muted loading">Đang tải…</p>';
    let rs, users;
    try { [rs, users] = await Promise.all([A.reports(), A.users()]); } catch (e) { box.innerHTML = tabsHTML('baosai') + emptyState('Không tải được: ' + e.message); return; }
    const { D } = await import('./data.js'), { plain } = await import('./util.js');
    const names = new Map(users.map(u => [u.id, u])), list = rs.filter(r => filter === 'all' || (filter === 'moi' ? r.st === 'moi' : r.st !== 'moi'));
    const what = id => { const it = D.items.get(id); return it ? plain(it.kanji || it.kana || it.pattern || it.char || it.title || it.jp || id) : id; };
    box.innerHTML = tabsHTML('baosai') + `<section class="card"><h2 class="h2">Báo sai từ người học</h2>
      <p class="small muted">Khi người học bấm "Báo sai" (đã đăng nhập), báo sai về đây. Tải "file gửi skill" để sửa dữ liệu, rồi đánh dấu Đã sửa.</p>
      ${chips('rf', [['moi', `Mới (${rs.filter(r => r.st === 'moi').length})`], ['xong', 'Đã xử lý'], ['all', 'Tất cả']], filter, false)}
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="skill" ${list.length ? '' : 'disabled'}>Tải file gửi skill (${list.length})</button></div>
      <ul class="adm-log adm-rep">${list.map(r => `<li data-r="${esc(r.id)}"><b lang="ja">${esc(what(r.item))}</b> <span class="muted small mono">${esc(r.item)}</span>
        <p>${esc(r.note || '(không ghi chú)')}</p><span class="small muted">${esc(r.nick || userName(names.get(r.uid)))} · ${dmy(r.t)} · ${esc(r.ver || '')}${r.st !== 'moi' ? ` · ${r.st === 'xong' ? 'đã sửa' : 'bỏ qua'}` : ''}</span>
        <span class="adm-cb">${r.st === 'moi' ? '<button type="button" class="btn btn-ghost btn-sm" data-st="xong">Đã sửa</button><button type="button" class="btn btn-ghost btn-sm" data-st="bo">Bỏ qua</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-st="moi">Đưa về Mới</button>'}</span></li>`).join('') || '<li class="muted">Không có.</li>'}</ul></section>`;
    box.querySelector('[data-act=skill]').onclick = async () => { const { out } = await skillFile(list, { local: false }); saveSkillFile(out, 'baosai'); };
    box.querySelector('.adm-rep').onclick = async e => {
      const b = e.target.closest('[data-st]'), id = e.target.closest('[data-r]')?.dataset.r; if (!b || !id) return;
      b.disabled = true;
      try { await A.markReport(id, b.dataset.st); draw(); } catch (er) { toast(er.message); b.disabled = false; }
    };
  };
  bindChips(box, () => { const f = readChip(box, 'rf'); if (f && f !== filter) { filter = f; draw(); } }); // gắn một lần (box giữ nguyên qua các lần vẽ)
  draw();
}

// ---------- v59: thông báo chung ----------
export async function renderAdminNotice(view) {
  const box = await guard(view); if (!box) return;
  let n = null; try { n = await A.notice(); } catch { }
  box.innerHTML = tabsHTML('thongbao') + `<section class="card"><h2 class="h2">Thông báo chung</h2>
    <p class="small muted">Hiện ở đầu Trang chủ của mọi người (cả người chưa đăng nhập) khi mở app có mạng. Mỗi người bấm "Đã đọc" thì thôi hiện thông báo đó.</p>
    ${n ? `<div class="note small"><b>Đang hiện</b> (đăng ${dmy(n.t)})<br>${esc(n.text).replace(/\n/g, '<br>')}</div>` : '<p class="small">Đang không có thông báo.</p>'}
    <textarea class="input" name="text" rows="4" maxlength="600" placeholder="Ví dụ: Bản mới có thêm bài N2. Mở app khi có mạng để tải.">${esc(n?.text || '')}</textarea>
    <div class="row-btns"><button type="button" class="btn btn-primary" data-act="post">Đăng thông báo</button>${n ? '<button type="button" class="btn btn-ghost btn-danger" data-act="del">Gỡ thông báo</button>' : ''}</div></section>`;
  box.querySelector('[data-act=post]').onclick = async () => {
    const t = box.querySelector('[name=text]').value.trim(); if (!t) return toast('Gõ nội dung trước.');
    try { await A.setNotice(t); toast('Đã đăng.'); renderAdminNotice(view); } catch (e) { toast(e.message); }
  };
  const d = box.querySelector('[data-act=del]');
  if (d) d.onclick = async () => { try { await A.setNotice(''); toast('Đã gỡ.'); renderAdminNotice(view); } catch (e) { toast(e.message); } };
}

// ---------- v59: thống kê ----------
export async function renderAdminStats(view) {
  const box = await guard(view); if (!box) return;
  box.innerHTML = tabsHTML('thongke') + '<p class="muted loading">Đang tính…</p>';
  let users, grants, codes;
  try { [users, grants, codes] = await Promise.all([A.users(), A.grants(), A.codes()]); } catch (e) { box.innerHTML = tabsHTML('thongke') + emptyState('Không tải được: ' + e.message); return; }
  const now = Date.now(), seen = u => ms(u.lastSeen) || 0;
  const act7 = users.filter(u => now - seen(u) < 7 * DAY).length, act30 = users.filter(u => now - seen(u) < 30 * DAY).length;
  const cur = {}; for (const u of users) { const k = u.stats?.cur || '—'; cur[k] = (cur[k] || 0) + 1; }
  const open = {}, soon = {}; for (const L of LOCKED) { open[L] = 0; soon[L] = 0; }
  for (const g of Object.values(grants)) for (const L of LOCKED) { const i = grantInfo(g[L]); if (i.state === 'on' || i.state === 'grace') { open[L]++; if (!i.forever && i.left <= 7) soon[L]++; } }
  const bar = (n, t) => `<span class="mini"><i style="width:${t ? (n / t) * 100 : 0}%"></i></span>`;
  const order = ['kana', 'N5', 'N4', 'N3', 'N2', 'N1', '—'];
  box.innerHTML = tabsHTML('thongke') + `<section class="card"><h2 class="h2">Người dùng</h2>
      <table class="topics adm-st"><tbody>
        <tr><th scope="row">Tổng số tài khoản</th><td></td><td class="num">${users.length}</td></tr>
        <tr><th scope="row">Vào app trong 7 ngày</th><td>${bar(act7, users.length)}</td><td class="num">${act7}</td></tr>
        <tr><th scope="row">Vào app trong 30 ngày</th><td>${bar(act30, users.length)}</td><td class="num">${act30}</td></tr></tbody></table></section>
    <section class="card"><h2 class="h2">Đang học cấp nào</h2><table class="topics adm-st"><tbody>
      ${order.filter(k => cur[k]).map(k => `<tr><th scope="row">${k === 'kana' ? 'Bảng chữ cái' : k === '—' ? 'Chưa rõ' : k}</th><td>${bar(cur[k], users.length)}</td><td class="num">${cur[k]}</td></tr>`).join('')}</tbody></table></section>
    <section class="card"><h2 class="h2">Lộ trình đang mở</h2><table class="topics adm-st"><tbody>
      ${LOCKED.map(L => `<tr><th scope="row">${L}</th><td>${bar(open[L], users.length)}</td><td class="num">${open[L]}${soon[L] ? ` <small class="muted">(${soon[L]} sắp hết hạn)</small>` : ''}</td></tr>`).join('')}</tbody></table></section>
    <section class="card"><h2 class="h2">Mã kích hoạt</h2><table class="topics adm-st"><tbody>
      <tr><th scope="row">Chưa dùng</th><td></td><td class="num">${codes.filter(c => !c.usedBy && !c.revoked).length}</td></tr>
      <tr><th scope="row">Đã dùng</th><td></td><td class="num">${codes.filter(c => c.usedBy).length}</td></tr>
      <tr><th scope="row">Đã thu hồi</th><td></td><td class="num">${codes.filter(c => c.revoked).length}</td></tr></tbody></table></section>`;
}
