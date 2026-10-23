import { esc, toast, download, fmtDate, icon, rich, APP_VERSION } from './util.js';
import { appendChunks } from './lazy.js';
import { missingKanji } from './kanji.js';
import { TYPE_NAME, D, setPacksEnabled, removeImported, activeReports } from './data.js';
import { confirmBox } from './ui.js';
import { cloudEnabled, cloudUser, cloudSyncInfo } from './cloud.js';

const TYPE = TYPE_NAME;

// v61: gói dữ liệu gom theo nhóm (trước đây một danh sách hơn 600 gói)
const GROUPS = [
  ['baihoc', 'Bài học & bài mở đầu', /^(baihoc|modau|tonghop|caunoi)-/],
  ['jlpt', 'Từ vựng JLPT', /^jlpt-/],
  ['nguphap', 'Ngữ pháp', /^nguphap-/],
  ['chuhan', 'Chữ Hán', /^chuhan-/],
  ['doc', 'Hội thoại & bài đọc', /^(hoithoai|baidoc)-/],
  ['thuysan', 'Xưởng & thủy sản', /^(xuong|thuysan|cau-xuong)-/],
  ['thue', 'Thuế, visa & thủ tục', /^(thuevisa|cau-thutuc)-/],
  ['doisong', 'Đời sống, Kansai & từ tượng thanh', /^(doisong|kansai|tuongthanh|cau)-/],
  ['thu', 'Học thử N3–N1', /^thu-/],
];
const LV = ['N5', 'N4', 'N3', 'N2', 'N1'];
export function groupOf(p) {
  if (p.src === 'imported') return 'nhaptay';
  const base = String(p.id).replace(/[@~].*$/, '');
  return GROUPS.find(g => g[2].test(base))?.[0] || 'khac';
}
const GNAME = Object.fromEntries([...GROUPS.map(g => [g[0], g[1]]), ['nhaptay', 'Gói nhập tay'], ['khac', 'Gói khác']]);
const ORDER = [...GROUPS.map(g => g[0]), 'nhaptay', 'khac'];

export async function renderData(view, ctx) {
  // v61: đồng bộ giữa các máy đi theo tài khoản Google (bỏ đồng bộ qua kho GitHub, sao lưu qua file, nhập gói)
  const u = cloudEnabled() ? cloudUser() : null, ci = u ? await cloudSyncInfo() : null;
  const reps = activeReports();
  const mine = [...D.user.values()].filter(x => !x._del);
  const builtinIds = new Set(D.builtin.map(p => p.id));
  const dupImp = D.imported.filter(p => builtinIds.has(p.id));
  const groups = new Map();
  for (const p of D.packs) { const g = groupOf(p); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(p); }
  const gids = ORDER.filter(g => groups.has(g));
  const offSet = () => new Set(D.disabled.list);
  const packRow = p => `<li class="pack">
      <label class="switch"><input type="checkbox" data-pack="${esc(p.id)}" ${offSet().has(p.id) ? '' : 'checked'}><span></span></label>
      <div class="pack-t"><b>${rich(p.title)}</b><span class="muted small">${TYPE[p.type] || p.type}, ${p.count} mục, ${esc(p.level || '')}${p.src === 'imported' ? ', nhập tay' : ''}</span></div>
      ${p.src === 'imported' ? `<button class="btn btn-ghost btn-sm btn-danger" data-rm="${esc(p.id)}">Xoá</button>` : ''}
    </li>`;
  const sumLine = g => {
    const ps = groups.get(g), off = offSet(), nOff = ps.filter(p => off.has(p.id)).length;
    const lvs = LV.filter(L => ps.some(p => p.level === L));
    return `${ps.length} gói · ${ps.reduce((a, p) => a + p.count, 0).toLocaleString('vi')} mục${lvs.length ? ` · ${lvs.length > 1 ? lvs[0] + '–' + lvs[lvs.length - 1] : lvs[0]}` : ''}${nOff ? ` · <b>${nOff === ps.length ? 'đang tắt cả nhóm' : nOff + ' gói đang tắt'}</b>` : ''}`;
  };
  view.innerHTML = `
    <h1 class="h1">Dữ liệu</h1>

    <section class="card" id="dongbo">
      <h2 class="h2">Học trên nhiều máy</h2>
      ${!cloudEnabled() ? '<p class="muted small">Tiến độ lưu trong máy này.</p>'
        : u ? `<p class="small">Đang đồng bộ theo tài khoản Google <b>${esc(u.name || u.email)}</b>. Lần cuối: ${fmtDate(ci.t)}${ci.err ? `<br><span class="err">Lỗi lần trước: ${esc(ci.err)}</span>` : ''}</p>
          <div class="row-btns"><a class="btn btn-ghost" href="#/taikhoan">${icon('user')} Mở Tài khoản</a></div>`
        : `<p class="small">Đăng nhập bằng Google trên mỗi máy (điện thoại, máy tính) là tiến độ tự gộp và đồng bộ. Không đăng nhập vẫn học bình thường, tiến độ lưu trong máy này.</p>
          <div class="row-btns"><a class="btn btn-primary" href="#/taikhoan">${icon('user')} Đăng nhập</a></div>`}
      <p class="muted small">Phiên bản app: ${esc(APP_VERSION)}</p>
    </section>

    <section class="card pk-card">
      <h2 class="h2">Gói dữ liệu</h2>
      <p class="muted small">Tắt nhóm hoặc gói nào thì phần đó không xuất hiện khi học. Tiến độ vẫn giữ. Bấm tên nhóm để xem từng gói.</p>
      ${gids.length ? `<ul class="pgroups">${gids.map(g => `<li class="pg" data-g="${g}">
        <div class="pg-h">
          <label class="switch"><input type="checkbox" data-grp="${g}" aria-label="Bật / tắt cả nhóm ${esc(GNAME[g])}"><span></span></label>
          <button type="button" class="pg-t" aria-expanded="false"><span><b>${esc(GNAME[g])}</b><span class="muted small pg-n">${sumLine(g)}</span></span><span class="pg-chev" aria-hidden="true"></span></button>
        </div>
        <div class="pg-b" hidden></div></li>`).join('')}</ul>` : '<p class="muted">Chưa có gói nào.</p>'}
      ${D.shadow.length ? `<h3 class="h3">Gói trùng tên đang được bỏ qua</h3>
        <p class="muted small">Cùng một gói vừa có trên kho vừa được nhập tay: app dùng bản có số phiên bản cao hơn (bằng nhau thì dùng bản nhập tay).</p>
        <ul class="packs shadow">${D.shadow.map(p => `<li class="pack"><div class="pack-t"><b>${rich(p.title)}</b><span class="muted small">${p.src === 'imported' ? 'bản nhập tay' : 'bản trên kho'} v${p.version} — đang dùng ${p.by.src === 'imported' ? 'bản nhập tay' : 'bản trên kho'} v${p.by.version}</span></div>${p.src === 'imported' ? `<button class="btn btn-ghost btn-sm btn-danger" data-rm="${esc(p.id)}">Xoá</button>` : ''}</li>`).join('')}</ul>` : ''}
      ${dupImp.length ? `<div class="row-btns"><button class="btn btn-ghost btn-sm" data-act="rmdup">Xoá ${dupImp.length} gói nhập tay đã có trên kho</button></div>` : ''}
      ${D.errors.length ? `<div class="warn">${D.errors.map(esc).join('<br>')}</div>` : ''}
    </section>

    <section class="card">
      <h2 class="h2">Gửi cho skill</h2>
      <p class="muted small">File gồm ${reps.length} mục bạn đã báo sai, ${mine.length} từ tự thêm/sửa, ${missingKanji().length} chữ Hán chưa có thẻ, và danh sách mã đang có để skill không làm trùng.</p>
      <button class="btn btn-ghost" data-act="forskill">Tải file gửi skill</button>
    </section>
`;

  // công tắc nhóm: bật hết / tắt hết; bật một phần thì hiện gạch ngang
  const syncGroup = g => {
    const li = view.querySelector(`.pg[data-g="${g}"]`); if (!li) return;
    const off = offSet(), ps = groups.get(g), nOff = ps.filter(p => off.has(p.id)).length;
    const sw = li.querySelector('[data-grp]');
    sw.checked = nOff === 0; sw.indeterminate = nOff > 0 && nOff < ps.length; // bật một phần: bấm công tắc → bật hết
    li.querySelector('.pg-n').innerHTML = sumLine(g);
  };
  gids.forEach(syncGroup);
  // mở nhóm → dựng danh sách gói theo cấp (dựng một lần, ghép dần từng mẻ)
  const fill = (g, box) => {
    const ps = groups.get(g), byLv = new Map();
    for (const p of ps) { const k = LV.includes(p.level) ? p.level : ''; if (!byLv.has(k)) byLv.set(k, []); byLv.get(k).push(p); }
    const keys = [...LV, ''].filter(k => byLv.has(k));
    box.innerHTML = keys.map(k => `${keys.length > 1 ? `<h3 class="h3 pg-lv">${k || 'Khác'} <small class="muted">· ${byLv.get(k).length} gói</small></h3>` : ''}<ul class="packs" data-lv="${k}"></ul>`).join('');
    for (const k of keys) appendChunks(box.querySelector(`.packs[data-lv="${k}"]`), byLv.get(k), packRow, { first: 8 });
  };
  const list = view.querySelector('.pgroups');
  list?.addEventListener('click', e => {
    const t = e.target.closest('.pg-t'); if (!t) return;
    const li = t.closest('.pg'), box = li.querySelector('.pg-b'), open = t.getAttribute('aria-expanded') !== 'true';
    t.setAttribute('aria-expanded', String(open)); box.hidden = !open;
    if (open && !box.dataset.done) { box.dataset.done = '1'; fill(li.dataset.g, box); }
  });
  list?.addEventListener('change', async e => {
    const gsw = e.target.closest('[data-grp]');
    if (gsw) {
      const g = gsw.dataset.grp, ps = groups.get(g), on = gsw.checked;
      await setPacksEnabled(ps.map(p => p.id), on);
      view.querySelectorAll(`.pg[data-g="${g}"] [data-pack]`).forEach(x => { x.checked = on; });
      syncGroup(g); toast(on ? `Đã bật cả nhóm ${GNAME[g]}.` : `Đã tắt cả nhóm ${GNAME[g]}.`); return;
    }
    const c = e.target.closest('[data-pack]'); if (!c) return;
    await setPacksEnabled([c.dataset.pack], c.checked);
    syncGroup(c.closest('.pg').dataset.g);
    toast(c.checked ? 'Đã bật gói.' : 'Đã tắt gói.');
  });
  view.querySelector('[data-act=rmdup]')?.addEventListener('click', async () => {
    if (!(await confirmBox(`Xoá ${dupImp.length} gói nhập tay đã có trên kho? App sẽ dùng bản trên kho. Tiến độ học giữ nguyên.`, 'Xoá'))) return;
    for (const p of dupImp) await removeImported(p.id);
    toast('Đã xoá.'); ctx.sessionDone?.(); renderData(view, ctx);
  });
  view.querySelector('.pk-card').addEventListener('click', async e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    if (!(await confirmBox('Xoá gói nhập tay này khỏi máy? Tiến độ học các từ vẫn giữ.', 'Xoá gói'))) return;
    await removeImported(b.dataset.rm); toast('Đã xoá gói.'); renderData(view, ctx);
  });

  // gửi skill
  view.querySelector('[data-act=forskill]').onclick = () => {
    const out = {
      app: 'tiengnhat', kind: 'gui-skill', created: new Date().toISOString(),
      reports: reps.map(([id, r]) => ({ id, note: r.note, item: D.items.get(id) || null })),
      userItems: mine,
      packs: [...D.packs, ...D.shadow].map(p => ({ id: p.id, title: p.title, type: p.type, version: p.version, src: p.src })),
      items: [...D.items.keys()].map(id => ({ id })),
      kanjiMissing: missingKanji(),
    };
    download(`gui-skill-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 1));
  };
}
