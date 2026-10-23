// v58: hồ sơ người học — biệt danh, ảnh đại diện, khung (hướng B: tre · anh đào · sóng · hạc · mây vàng),
// lớp ánh kim khi đạt ★★★, huy hiệu theo cấp, bảng xếp hạng lộ trình. Cần đăng nhập (tài khoản Google).
import { LEVELS } from './data.js';
import { kvGet, kvSet } from './db.js';
import { esc, icon, toast } from './util.js';
import { emptyState } from './ui.js';
import { cloudEnabled, bootCloud, cloudUser, myProfile, cachedProfile, saveProfile, rankList, rankPos, myRankDoc } from './cloud.js';

// ---------- ảnh, khung ----------
export const PRESETS = [['魚', '#1f8a6e', '#8fe0c0'], ['桜', '#d24d7a', '#ffb3c9'], ['山', '#3b5f8c', '#a9c6e8'], ['星', '#3d7be0', '#9cc2ff'], ['竹', '#3f7a2a', '#b6dc86'], ['鶴', '#2b3a55', '#7f93b8'], ['雪', '#1f4f8f', '#8fb9ea'], ['侍', '#7a1f2b', '#e8828f']];
export const FRAMES = [['khoidau', 'Khởi đầu'], ['N5', 'N5 · Tre'], ['N4', 'N4 · Anh đào'], ['N3', 'N3 · Sóng'], ['N2', 'N2 · Hạc'], ['N1', 'N1 · Mây vàng']];
const calm = () => document.documentElement.classList.contains('calm');
function avatarInner(p) {
  const av = p?.av || 'g';
  if (av.startsWith('data:image/')) return `<img class="fr-av" src="${av}" alt="">`;
  if (av.startsWith('p:')) {
    const pr = PRESETS.find(x => x[0] === av.slice(2)) || PRESETS[0];
    return `<span class="fr-av fr-pre" style="background:linear-gradient(160deg, ${pr[1]}, ${pr[2]})" lang="ja">${esc(pr[0])}</span>`;
  }
  const url = av.startsWith('https://') ? av : p?.photo;
  if (url) return `<img class="fr-av" src="${esc(url)}" alt="" referrerpolicy="no-referrer">`;
  return `<span class="fr-av fr-pre" style="background:linear-gradient(160deg, #3d7be0, #9cc2ff)">${esc((p?.nick || p?.name || '?').trim().charAt(0).toUpperCase())}</span>`;
}
// p: { av, frame, ak, nick, photo } · size: px · anim: chuyển động (chỉ trang Hồ sơ; chế độ giảm chuyển động thì đứng yên)
export function frameHTML(p, size, { anim = false, label = '' } = {}) {
  const f = FRAMES.some(x => x[0] === p?.frame) ? p.frame : 'khoidau';
  const mv = anim && !calm(), file = f === 'khoidau' ? 'khoidau' : f.toLowerCase() + (mv ? '-dong' : '');
  return `<span class="fr" data-f="${f}" style="--fs:${size}px"${label ? ` role="img" aria-label="${esc(label)}"` : ''}>${avatarInner(p)}<img class="fr-f" src="icons/khung/${file}.svg" alt="">${p?.ak && f !== 'khoidau' ? `<img class="fr-f" src="icons/khung/anhkim${mv ? '-dong' : ''}.svg" alt="">` : ''}${f !== 'khoidau' && size >= 90 ? `<span class="fr-plate">${f}</span>` : ''}</span>`;
}
export function badgeHTML(k, stars, size = 46) {
  const label = k === 'kana' ? 'かな' : k;
  return `<span class="hh${stars ? '' : ' is-off'}" style="--hs:${size}px" title="${k === 'kana' ? 'Bảng chữ cái' : k} · ${stars ? (k === 'kana' ? 'đã đạt' : stars + '/3 sao') : 'chưa đạt'}">
    <img src="icons/khung/huyhieu-${k.toLowerCase()}.svg" alt=""><span class="hh-t" ${k === 'kana' ? 'lang="ja"' : ''}>${label}</span>
    ${k === 'kana' ? `<span class="hh-s">${stars ? '✓' : ''}</span>` : `<span class="hh-s">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></span>`}</span>`;
}

// ---------- biệt danh ----------
const BAD = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/;
const graphemes = s => (typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(s)].map(x => x.segment) : [...s]);
export const cleanNick = s => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
export function nickProblem(s) {
  s = cleanNick(s);
  const g = graphemes(s);
  if (g.length < 2) return 'Biệt danh cần ít nhất 2 ký tự.';
  if (g.length > 20) return 'Biệt danh dài tối đa 20 ký tự.';
  if (BAD.test(s)) return 'Biệt danh có ký tự vô hình hoặc ký tự điều khiển — xoá đi rồi thử lại.';
  if (g.some(x => (x.match(/\p{M}/gu) || []).length > 2)) return 'Biệt danh chồng quá nhiều dấu lên một chữ.';
  return '';
}
export const nickLen = s => graphemes(cleanNick(s)).length;
const SYMS = ['★', '☆', '♪', '♡', '✿', '・', '〆', '∞', 'ツ', '彡'];

// ---------- huy hiệu, tiến độ lộ trình ----------
const EPOCH = Date.UTC(2026, 0, 1), T25 = 33554432;
export async function myStats() {
  const [{ lessonsOf, isDone }, { passedLevels }, { kanaDone }, { stageInfo }, { levelLocked }] = await Promise.all([import('./lesson.js'), import('./level.js'), import('./kana.js'), import('./roadmap.js'), import('./lock.js')]);
  const passed = passedLevels(), { st, cur } = stageInfo(), knC = await kvGet('rankKn', {});
  const o = { cur, badges: { kana: kanaDone() ? 1 : 0 }, ls: {}, kn: {}, tot: {} };
  for (const L of LEVELS) {
    const ls = lessonsOf(L), done = ls.filter(isDone).length;
    o.ls[L] = done; o.tot[L] = ls.length;
    // cấp đang khóa (nội dung không có trong máy) → giữ số đã thuộc lần đo trước
    o.kn[L] = Math.min(8191, levelLocked(L) ? knC[L] || 0 : st.find(x => x.L === L)?.known || 0);
    o.badges[L] = passed.has(L) ? 3 : ls.length && done === ls.length ? 2 : ls.length && isDone(ls[0]) ? 1 : 0;
  }
  await kvSet('rankKn', o.kn);
  return o;
}
export const earnedFrames = st => ['khoidau', ...LEVELS.filter(L => st.badges[L] >= 2)];
// Dòng trên bảng xếp hạng: điểm = (số bài · 8192 + số đã thuộc) · 2^25 + phần "ai đạt trước" (phút từ 2026, đảo chiều)
export async function rankRow(p, user) {
  const st = await myStats(), at = await kvGet('rankAt', {}), prev = await kvGet('rankPrev', {});
  const now = Date.now(), tp = t => T25 - 1 - Math.min(T25 - 1, Math.max(0, Math.floor(((t || now) - EPOCH) / 60000)));
  const tot = LEVELS.reduce((a, L) => a + st.ls[L], 0), knT = Math.min(32767, LEVELS.reduce((a, L) => a + st.kn[L], 0));
  for (const L of LEVELS) if (st.ls[L] !== prev[L] || !at[L]) at[L] = st.ls[L] > (prev[L] || 0) || !at[L] ? now : at[L];
  if (tot !== prev.all || !at.all) at.all = tot > (prev.all || 0) || !at.all ? now : at.all;
  await kvSet('rankAt', at); await kvSet('rankPrev', { ...st.ls, all: tot });
  const frame = earnedFrames(st).includes(p.frame) ? p.frame : 'khoidau';
  const row = {
    nick: cleanNick(p.nick), av: p.av?.startsWith('data:image/') || p.av?.startsWith('p:') ? p.av : (user?.photo || 'g'),
    frame, ak: frame !== 'khoidau' && st.badges[frame] >= 3, badges: st.badges, ls: st.ls, kn: st.kn, tot,
    s_all: (tot * 32768 + knT) * T25 + tp(at.all),
  };
  for (const L of LEVELS) row['s_' + L] = (st.ls[L] * 8192 + st.kn[L]) * T25 + tp(at[L]);
  return row;
}

// ---------- trang Hồ sơ ----------
async function needUser(view, title) {
  view.innerHTML = `<h1 class="h1">${title}</h1><div class="pf"><p class="muted loading">Đang tải…</p></div>`;
  const box = view.querySelector('.pf');
  if (!cloudEnabled()) { box.innerHTML = emptyState('Bản app này chưa bật tài khoản.'); return null; }
  try { await bootCloud(); } catch (e) { box.innerHTML = emptyState('Không mở được: ' + (e?.message || e)); return null; }
  if (!cloudUser()) { box.innerHTML = emptyState('Đăng nhập tài khoản Google để có hồ sơ, huy hiệu và tên trên bảng xếp hạng.', '<a class="btn btn-primary" href="#/taikhoan">Đăng nhập</a>'); return null; }
  return box;
}
export async function renderProfile(view, ctx) {
  const box = await needUser(view, 'Hồ sơ'); if (!box) return;
  const u = cloudUser();
  let p = await cachedProfile();
  try { p = await myProfile(); } catch { }
  p = { ...(p || {}), photo: u.photo, name: u.name };
  const st = await myStats(), L0 = st.cur === 'kana' ? 'N5' : st.cur;
  const earned = earnedFrames(st), frame = earned.includes(p.frame) ? p.frame : earned[earned.length - 1];
  const show = { ...p, frame, ak: frame !== 'khoidau' && st.badges[frame] >= 3 };
  const { levelLocked } = await import('./lock.js');
  box.innerHTML = `<div class="pf-top"><a class="btn btn-ghost btn-sm" href="#/hoso/sua">${icon('pen')} Sửa</a></div>
    <div class="pf-hero">${frameHTML(show, 176, { anim: true, label: `Khung ${frame}` })}
      <p class="pf-nick" lang="ja">${p.nick ? esc(p.nick) : '<span class="muted">Chưa đặt biệt danh</span>'}</p>
      <p class="small muted">${st.cur === 'kana' ? 'Đang học bảng chữ cái' : `Đang học ${esc(L0)} · bài ${Math.min(st.ls[L0] + 1, st.tot[L0])}/${st.tot[L0]}`}</p></div>
    <section class="card"><h2 class="h2">Huy hiệu</h2><div class="hh-row">${['kana', ...LEVELS].map(k => badgeHTML(k, st.badges[k] || 0)).join('')}</div>
      <p class="small muted">★ xong bài 1 · ★★ xong cả lộ trình (mở khung của cấp) · ★★★ vượt bài kiểm tra trình độ (khung có ánh kim).</p></section>
    <section class="card"><h2 class="h2">Lộ trình</h2>
      ${LEVELS.map(L => levelLocked(L) ? `<div class="pf-lv"><b>${L}</b><span class="muted small">Chưa mở · đã xong ${st.ls[L]}/${st.tot[L]} bài</span></div>`
        : `<div class="pf-lv"><b>${L}</b><span class="mini"><i style="width:${st.tot[L] ? (st.ls[L] / st.tot[L]) * 100 : 0}%"></i></span><span class="num small">${st.ls[L]}/${st.tot[L]}</span></div>`).join('')}</section>
    <a class="mode pf-rank" href="#/xephang?l=${esc(L0)}">${icon('star')}<span><b>Bảng xếp hạng</b><small class="pf-pos">${p.nick ? (p.hideRank ? 'Bạn đang ẩn khỏi bảng.' : 'Đang tính hạng…') : 'Đặt biệt danh để có tên trên bảng.'}</small></span></a>
    <label class="check pf-hide"><input type="checkbox" data-o="hide" ${p.hideRank ? '' : 'checked'}> Hiện tôi trên bảng xếp hạng</label>`;
  box.querySelector('[data-o=hide]').onchange = async e => {
    try { await saveProfile({ hideRank: !e.target.checked }); toast(e.target.checked ? 'Đã hiện trên bảng xếp hạng.' : 'Đã ẩn khỏi bảng xếp hạng.'); renderProfile(view, ctx); }
    catch (er) { toast(er.message); e.target.checked = !e.target.checked; }
  };
  if (p.nick && !p.hideRank) {
    try {
      const me = await myRankDoc();
      if (me && box.isConnected) {
        const [a, b] = await Promise.all([rankPos(L0, me['s_' + L0]), rankPos('all', me.s_all)]);
        box.querySelector('.pf-pos').textContent = `${L0}: hạng ${a} · Tất cả: hạng ${b}`;
      }
    } catch { box.querySelector('.pf-pos').textContent = 'Chưa tải được hạng.'; }
  }
}

// ---------- sửa hồ sơ ----------
async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh này.')); i.src = url; });
    for (const [n, q] of [[128, .82], [112, .72], [96, .62], [80, .55]]) {
      const c = document.createElement('canvas'); c.width = c.height = n;
      const s = Math.min(img.naturalWidth, img.naturalHeight), x = (img.naturalWidth - s) / 2, y = (img.naturalHeight - s) / 2;
      c.getContext('2d').drawImage(img, x, y, s, s, 0, 0, n, n);
      let d = c.toDataURL('image/webp', q);
      if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', q);
      if (d.length <= 11500) return d;
    }
    throw new Error('Ảnh quá chi tiết, chọn ảnh khác.');
  } finally { URL.revokeObjectURL(url); }
}
export async function renderProfileEdit(view, ctx) {
  const box = await needUser(view, 'Sửa hồ sơ'); if (!box) return;
  ctx.backTo = '#/hoso';
  const u = cloudUser();
  let p = await cachedProfile();
  try { p = await myProfile(); } catch { }
  const st = await myStats(), earned = earnedFrames(st);
  const cur = { nick: p?.nick || (u.name || '').split(' ').pop() || '', av: p?.av || 'g', frame: earned.includes(p?.frame) ? p.frame : earned[earned.length - 1], photo: u.photo };
  box.innerHTML = `<div class="pf-hero pf-prev"></div>
    <section class="card"><label class="field"><span class="field-l">Biệt danh</span>
      <input class="input pf-nick-in" name="nick" maxlength="60" autocomplete="off" lang="ja" value="${esc(cur.nick)}"></label>
      <div class="pf-syms">${SYMS.map(s => `<button type="button" class="pf-sym" data-sym="${s}" aria-label="Chèn ${s}" lang="ja">${s}</button>`).join('')}</div>
      <p class="small pf-nick-st"></p>
      <p class="small muted">Chữ Việt, chữ Nhật, số và ký hiệu; 2–20 ký tự. Hiện trên bảng xếp hạng (không bao giờ hiện email).</p></section>
    <section class="card"><h2 class="h2">Ảnh đại diện</h2>
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-av="g">Ảnh tài khoản Google</button><button type="button" class="btn btn-ghost" data-act="up">Tải ảnh từ máy</button></div>
      <input type="file" accept="image/*" hidden data-in="img">
      <div class="pf-pres">${PRESETS.map(([k, a, b]) => `<button type="button" class="pf-pre" data-av="p:${k}" aria-label="Ảnh chữ ${k}" style="background:linear-gradient(160deg, ${a}, ${b})" lang="ja">${k}</button>`).join('')}</div></section>
    <section class="card"><h2 class="h2">Khung</h2><div class="pf-frames">${FRAMES.map(([f, n]) => {
      const ok = earned.includes(f);
      return `<button type="button" class="pf-fr" data-fr="${f}" ${ok ? '' : 'disabled'}><img src="icons/khung/${f === 'khoidau' ? 'khoidau' : f.toLowerCase()}.svg" alt="">${ok && f !== 'khoidau' && st.badges[f] >= 3 ? '<img class="pf-ak" src="icons/khung/anhkim.svg" alt="">' : ''}<span>${ok ? n : `Xong lộ trình ${f}`}</span></button>`;
    }).join('')}</div></section>
    <div class="row-btns"><a class="btn btn-ghost" href="#/hoso">Huỷ</a><button type="button" class="btn btn-primary" data-act="save">Lưu</button></div>`;
  const inp = box.querySelector('[name=nick]'), stEl = box.querySelector('.pf-nick-st');
  const draw = () => {
    box.querySelector('.pf-prev').innerHTML = frameHTML({ ...cur, ak: cur.frame !== 'khoidau' && st.badges[cur.frame] >= 3 }, 140, { anim: true }) + `<p class="pf-nick" lang="ja">${esc(cleanNick(inp.value)) || '<span class="muted">…</span>'}</p>`;
    box.querySelectorAll('[data-av]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.av === cur.av)));
    box.querySelectorAll('[data-fr]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fr === cur.frame)));
    const bad = nickProblem(inp.value);
    stEl.innerHTML = `<span class="${bad ? 'err' : 'muted'}">${bad ? esc(bad) : 'Hợp lệ'}</span> <span class="muted">· ${nickLen(inp.value)}/20</span>`;
  };
  inp.oninput = draw;
  box.addEventListener('click', async e => {
    const sym = e.target.closest('[data-sym]')?.dataset.sym;
    if (sym) { const a = inp.selectionStart ?? inp.value.length, b = inp.selectionEnd ?? a; inp.value = inp.value.slice(0, a) + sym + inp.value.slice(b); inp.focus(); inp.setSelectionRange(a + sym.length, a + sym.length); draw(); return; }
    const av = e.target.closest('[data-av]')?.dataset.av;
    if (av) { cur.av = av; draw(); return; }
    const fr = e.target.closest('[data-fr]')?.dataset.fr;
    if (fr) { cur.frame = fr; draw(); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'up') box.querySelector('[data-in=img]').click();
    if (act === 'save') {
      const bad = nickProblem(inp.value); if (bad) { toast(bad); inp.focus(); return; }
      const btn = e.target.closest('button'); btn.disabled = true;
      try { await saveProfile({ nick: cleanNick(inp.value), av: cur.av, frame: cur.frame }); toast('Đã lưu hồ sơ.'); ctx.go('#/hoso'); }
      catch (er) { toast(er.message); btn.disabled = false; }
    }
  });
  box.querySelector('[data-in=img]').onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { cur.av = await shrinkImage(f); draw(); } catch (er) { toast(er.message); }
    e.target.value = '';
  };
  draw();
}

// ---------- bảng xếp hạng ----------
const TABS = [['all', 'Tất cả'], ...LEVELS.map(L => [L, L])];
export async function renderRanks(view, ctx, tab = 'all') {
  if (!TABS.some(t => t[0] === tab)) tab = 'all';
  view.innerHTML = `<h1 class="h1">Bảng xếp hạng lộ trình</h1>
    <div class="chips rk-tabs">${TABS.map(([k, n]) => `<a class="chip" href="#/xephang?l=${k}" aria-pressed="${k === tab}">${n}</a>`).join('')}</div>
    <p class="small muted">${tab === 'all' ? 'Xếp theo tổng số bài đã xong mọi cấp.' : `Xếp theo số bài đã xong trong lộ trình ${tab}; bằng nhau thì theo số mục đã thuộc, rồi ai xong trước.`}</p>
    <div class="rk"><p class="muted loading">Đang tải…</p></div>`;
  const box = view.querySelector('.rk');
  if (!cloudEnabled()) { box.innerHTML = emptyState('Bản app này chưa bật tài khoản.'); return; }
  let rows, me = null;
  try { await bootCloud(); rows = await rankList(tab); if (cloudUser()) me = await myRankDoc(); }
  catch (e) { box.innerHTML = emptyState('Không tải được bảng xếp hạng: ' + e.message); return; }
  if (!box.isConnected) return;
  const { lessonsOf } = await import('./lesson.js');
  const tot = tab === 'all' ? 0 : lessonsOf(tab).length;
  const f = tab === 'all' ? 's_all' : 's_' + tab, uid = cloudUser()?.uid;
  const score = r => (tab === 'all' ? `${r.tot || 0} bài` : `Bài ${r.ls?.[tab] || 0}/${tot}`);
  const mini = r => ['N5', 'N4', 'N3', 'N2', 'N1'].filter(L => r.badges?.[L]).map(L => `<img class="rk-hh" src="icons/khung/huyhieu-${L.toLowerCase()}.svg" alt="${L} ${r.badges[L]} sao" title="${L} · ${r.badges[L]}/3 sao">`).join('');
  const pod = (r, i) => r ? `<div class="rk-pod rk-p${i + 1}${r.id === uid ? ' is-me' : ''}">${frameHTML(r, i === 0 ? 100 : 76)}<b class="rk-n">${i + 1}</b><span class="rk-nick" lang="ja">${esc(r.nick)}</span><small class="muted">${score(r)}</small></div>` : '<div class="rk-pod"></div>';
  const line = (r, i) => `<li class="rk-row${r.id === uid ? ' is-me' : ''}"><b class="rk-n">${i + 1}</b>${frameHTML(r, 52)}<span class="rk-t"><span class="rk-nick" lang="ja">${esc(r.nick)}</span><span class="rk-b">${mini(r)}</span></span><span class="small">${score(r)}</span></li>`;
  const inTop = rows.findIndex(r => r.id === uid);
  let mine = '';
  if (!uid) mine = '<p class="small muted rk-me-note"><a href="#/taikhoan">Đăng nhập</a> và đặt biệt danh để có tên trên bảng.</p>';
  else if (!me) {
    const p = await cachedProfile();
    mine = `<p class="small muted rk-me-note">${p?.hideRank ? 'Bạn đang ẩn khỏi bảng xếp hạng.' : 'Bạn chưa có tên trên bảng.'} <a href="#/hoso">${p?.nick ? 'Mở Hồ sơ' : 'Đặt biệt danh'}</a></p>`;
  } else if (inTop < 0 && (me[f] || 0) > 0) {
    const pos = await rankPos(tab, me[f]).catch(() => '?');
    mine = `<ul class="rk-l rk-mine"><li class="rk-row is-me"><b class="rk-n">${pos}</b>${frameHTML(me, 52)}<span class="rk-t"><span class="rk-nick" lang="ja">${esc(me.nick)}</span><small class="muted">Bạn</small></span><span class="small">${score(me)}</span></li></ul>`;
  }
  box.innerHTML = rows.length ? `<div class="rk-podium">${pod(rows[1], 1)}${pod(rows[0], 0)}${pod(rows[2], 2)}</div>
      <ol class="rk-l">${rows.slice(3).map((r, i) => line(r, i + 3)).join('')}</ol>${mine}`
    : `<p class="muted">Chưa có ai trên bảng ${tab === 'all' ? '' : tab}.</p>${mine}`;
}

// thanh trên: ảnh + khung đang dùng (bản đứng yên, cỡ nhỏ)
export async function topAvatarHTML(user) {
  const p = await cachedProfile();
  if (!p) return null;
  return frameHTML({ ...p, photo: user.photo, name: user.name || user.email }, 40);
}
