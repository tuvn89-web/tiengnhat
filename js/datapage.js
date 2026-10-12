import { esc, toast, download, readFile, fmtDate, icon, rich, APP_VERSION } from './util.js';
import qrcode from './vendor/qrcode.js';
import { missingKanji } from './kanji.js';
import { TYPE_NAME, D, TOPICS, setPackEnabled, checkPack, importPack, removeImported, activeReports } from './data.js';
import { field, confirmBox, openSheet } from './ui.js';
import { getSyncCfg, setSyncCfg, syncNow, lastSync, lastSyncError, backupJSON, restoreJSON, normalizeCfg, formProblem, diagnose, ownerFromSite, maskToken, transferLink, readTransferCode } from './sync.js';

const TYPE = TYPE_NAME;

// Máy này đang lưu gì — để Cậu Cả tự soát (token che phần giữa)
function savedHTML(c) {
  if (!c.token) return '<p class="note small">Máy này <b>chưa lưu token</b> nên chưa đồng bộ. Dán token vào ô Token rồi bấm <b>Đồng bộ ngay</b>, hoặc quét mã QR từ máy đã cài xong.</p>';
  return `<p class="saved-ok small">Máy này đang lưu: tài khoản <b>${esc(c.owner)}</b>, kho <b>${esc(c.repo)}</b>, token <code>${esc(maskToken(c.token))}</code>.</p>`;
}

// Mở từ mã QR / đường link của máy kia: #/nhan?c=…
export async function receiveSetup(view, ctx, code) {
  history.replaceState(null, '', location.pathname + location.search + '#/dulieu'); // xoá token khỏi thanh địa chỉ
  const c = readTransferCode(code);
  if (!c) { toast('Mã cài đặt không đọc được — tạo lại mã trên máy kia.'); return renderData(view, ctx); }
  const old = await getSyncCfg();
  if (old.token && old.token !== c.token && !(await confirmBox('Máy này đã lưu một token khác. Thay bằng cài đặt vừa nhận?', 'Thay'))) return renderData(view, ctx);
  await setSyncCfg(c);
  return renderData(view, ctx, { received: true });
}

function shareSheet(cfg) {
  const link = transferLink(cfg);
  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true, alt: 'Mã QR cài đặt đồng bộ' });
  const s = openSheet(`<h2 class="h2">Chuyển cài đặt sang máy khác</h2>
    <ol class="steps small">
      <li>Trên điện thoại, mở <b>Camera</b> (hoặc Google Lens) và hướng vào mã này.</li>
      <li>Bấm vào đường link hiện ra. App mở lên, tự điền cài đặt và đồng bộ.</li>
    </ol>
    <div class="qr">${svg}</div>
    <p class="small muted">Không quét được thì gửi đường link cho chính mình (ví dụ Zalo "Cloud của tôi") rồi mở trên máy kia.</p>
    <div class="row-btns"><button class="btn btn-ghost" data-a="copy">Sao chép đường link</button></div>
    <p class="warn small">Mã và đường link có chứa token. Chỉ dùng cho máy của Cậu Cả, không gửi cho người khác.</p>`, { label: 'Chuyển cài đặt sang máy khác' });
  s.body.querySelector('[data-a=copy]').onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast('Đã sao chép đường link.'); }
    catch { window.prompt('Sao chép đường link này:', link); }
  };
}

export async function renderData(view, ctx, opts = {}) {
  const cfg = await getSyncCfg();
  const site = ownerFromSite();
  const ls = await lastSync(), le = await lastSyncError();
  const off = new Set(D.disabled.list);
  const reps = activeReports();
  const mine = [...D.user.values()].filter(u => !u._del);
  const builtinIds = new Set(D.builtin.map(p => p.id));
  const dupImp = D.imported.filter(p => builtinIds.has(p.id));
  const packRow = p => `<li class="pack">
      <label class="switch"><input type="checkbox" data-pack="${esc(p.id)}" ${off.has(p.id) ? '' : 'checked'}><span></span></label>
      <div class="pack-t"><b>${rich(p.title)}</b><span class="muted small">${TYPE[p.type] || p.type}, ${p.count} mục, ${esc(p.level)}${p.src === 'imported' ? ', nhập tay' : ''}</span></div>
      ${p.src === 'imported' ? `<button class="btn btn-ghost btn-sm btn-danger" data-rm="${esc(p.id)}">Xoá</button>` : ''}
    </li>`;
  view.innerHTML = `
    <h1 class="h1">Dữ liệu & đồng bộ</h1>

    <section class="card" id="dongbo">
      <h2 class="h2">Đồng bộ qua GitHub</h2>
      <p class="muted small">Tiến độ lưu vào một kho riêng tư trên GitHub của Cậu Cả. App tự đồng bộ khi mở, sau mỗi lượt học và khi có mạng trở lại. Cài đặt lưu riêng từng máy: máy đã cài xong thì dùng nút <b>Chuyển sang máy khác</b> để đưa sang máy kia bằng mã QR.</p>
      <div class="saved" aria-live="polite">${savedHTML(cfg)}</div>
      <form class="syncf" novalidate>
        <div class="grid2">
          ${field('Tên tài khoản GitHub', `<input class="input" name="owner" value="${esc(cfg.owner)}" autocomplete="off" autocapitalize="off" spellcheck="false">`,
            site ? `Là phần đứng trước .github.io trong địa chỉ app — với app này là <b>${esc(site)}</b>.` : 'Là phần đứng trước .github.io trong địa chỉ app.')}
          ${field('Tên kho riêng tư', `<input class="input" name="repo" value="${esc(cfg.repo)}" placeholder="tiengnhat-tiendo" autocomplete="off" autocapitalize="off" spellcheck="false">`,
            'Chỉ ghi tên kho. Dán cả đường link của kho cũng được.')}
        </div>
        ${field('Token', `<input class="input mono" name="token" type="password" value="${esc(cfg.token)}" autocomplete="off" autocapitalize="off" spellcheck="false">`, 'Token bắt đầu bằng github_pat_. Lưu trong máy, chỉ gửi tới GitHub.')}
        <label class="check small"><input type="checkbox" data-act="showtok"> Hiện token để soát</label>
        <details><summary class="small">Tuỳ chọn thêm</summary>
          <div class="grid2">
            ${field('Nhánh', `<input class="input" name="branch" value="${esc(cfg.branch)}">`)}
            ${field('Tên file', `<input class="input" name="path" value="${esc(cfg.path)}">`)}
          </div>
        </details>
        <div class="row-btns wrap">
          <button class="btn btn-ghost" type="submit">Lưu cài đặt</button>
          <button class="btn btn-ghost" type="button" data-act="synccheck">Kiểm tra kết nối</button>
          <button class="btn btn-primary" type="button" data-act="sync">${icon('sync')} Đồng bộ ngay</button>
          <button class="btn btn-ghost" type="button" data-act="share">${icon('qr')} Chuyển sang máy khác</button>
        </div>
        <ul class="diag" aria-live="polite"></ul>
        <p class="small sync-st">Lần đồng bộ cuối: ${fmtDate(ls)}${le ? `<br><span class="err">Lỗi lần trước: ${esc(le)}</span>` : ''}</p>
        <p class="muted small">Phiên bản app: ${esc(APP_VERSION)}</p>
      </form>
    </section>

    <section class="card">
      <h2 class="h2">Gói dữ liệu</h2>
      <p class="muted small">Tắt gói nào thì gói đó không xuất hiện khi học. Tiến độ vẫn giữ.</p>
      <ul class="packs">${D.packs.map(packRow).join('') || '<li class="muted">Chưa có gói nào.</li>'}</ul>
      ${D.shadow.length ? `<h3 class="h3">Gói trùng tên đang được bỏ qua</h3>
        <p class="muted small">Cùng một gói vừa có trên kho vừa được nhập tay: app dùng bản có số phiên bản cao hơn (bằng nhau thì dùng bản nhập tay).</p>
        <ul class="packs shadow">${D.shadow.map(p => `<li class="pack"><div class="pack-t"><b>${rich(p.title)}</b><span class="muted small">${p.src === 'imported' ? 'bản nhập tay' : 'bản trên kho'} v${p.version} — đang dùng ${p.by.src === 'imported' ? 'bản nhập tay' : 'bản trên kho'} v${p.by.version}</span></div>${p.src === 'imported' ? `<button class="btn btn-ghost btn-sm btn-danger" data-rm="${esc(p.id)}">Xoá</button>` : ''}</li>`).join('')}</ul>` : ''}
      ${dupImp.length ? `<div class="row-btns"><button class="btn btn-ghost btn-sm" data-act="rmdup">Xoá ${dupImp.length} gói nhập tay đã có trên kho</button></div>` : ''}
      ${D.errors.length ? `<div class="warn">${D.errors.map(esc).join('<br>')}</div>` : ''}
    </section>

    <section class="card">
      <h2 class="h2">Nhập gói từ skill</h2>
      <p class="muted small">Cách nhanh để thử gói mới trên máy này. Muốn mọi máy đều có, tải gói lên thư mục <code>data/packs</code> trong kho app trên GitHub.</p>
      ${field('Chọn file .json (chọn được nhiều file)', '<input class="input" type="file" accept=".json,application/json" multiple data-in="file">')}
      ${field('Hoặc dán nội dung JSON', '<textarea class="input mono" rows="4" data-in="paste" placeholder="{ &quot;schema&quot;: 1, &quot;pack&quot;: … }"></textarea>')}
      <div class="row-btns"><button class="btn btn-ghost" data-act="check">Kiểm tra</button></div>
      <div class="import-prev"></div>
    </section>

    <section class="card">
      <h2 class="h2">Gửi cho skill</h2>
      <p class="muted small">File gồm ${reps.length} mục Cậu Cả đã báo sai, ${mine.length} từ tự thêm/sửa, ${missingKanji().length} chữ Hán chưa có thẻ, và danh sách mã đang có để skill không làm trùng.</p>
      <button class="btn btn-ghost" data-act="forskill">Tải file gửi skill</button>
    </section>

    <section class="card">
      <h2 class="h2">Sao lưu</h2>
      <p class="muted small">Một file chứa toàn bộ tiến độ, từ tự thêm và gói nhập tay. Dùng khi đổi máy hoặc chưa cài đồng bộ.</p>
      <div class="row-btns wrap">
        <button class="btn btn-ghost" data-act="backup">Tải file sao lưu</button>
        <label class="btn btn-ghost">Khôi phục từ file<input type="file" accept=".json" hidden data-in="restore"></label>
      </div>
    </section>

`;

  // gói: bật/tắt, xoá
  view.querySelector('.packs').addEventListener('change', async e => {
    const c = e.target.closest('[data-pack]'); if (!c) return;
    await setPackEnabled(c.dataset.pack, c.checked);
    toast(c.checked ? 'Đã bật gói.' : 'Đã tắt gói.');
  });
  view.querySelector('[data-act=rmdup]')?.addEventListener('click', async () => {
    if (!(await confirmBox(`Xoá ${dupImp.length} gói nhập tay đã có trên kho? App sẽ dùng bản trên kho. Tiến độ học giữ nguyên.`, 'Xoá'))) return;
    for (const p of dupImp) await removeImported(p.id);
    toast('Đã xoá.'); ctx.sessionDone?.(); renderData(view, ctx);
  });
  view.querySelector('.card .packs')?.parentElement.addEventListener('click', async e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    if (!(await confirmBox('Xoá gói nhập tay này khỏi máy? Tiến độ học các từ vẫn giữ.', 'Xoá gói'))) return;
    await removeImported(b.dataset.rm); toast('Đã xoá gói.'); renderData(view, ctx);
  });

  // nhập gói
  let staged = [];
  view.querySelector('[data-act=check]').onclick = async () => {
    staged = [];
    const files = [...view.querySelector('[data-in=file]').files];
    const texts = await Promise.all(files.map(f => readFile(f).then(t => [f.name, t])));
    const paste = view.querySelector('[data-in=paste]').value.trim();
    if (paste) texts.push(['nội dung dán', paste]);
    if (!texts.length) { toast('Chưa chọn file hoặc dán nội dung.'); return; }
    for (const [name, t] of texts) {
      let j, errs;
      try { j = JSON.parse(t); errs = checkPack(j); } catch { errs = ['Không đọc được JSON — kiểm tra đã dán đủ chưa.']; }
      staged.push({ name, j, errs });
    }
    const ok = staged.filter(s => !s.errs.length);
    view.querySelector('.import-prev').innerHTML = `<ul class="rows">${staged.map(s => `<li class="imp ${s.errs.length ? 'bad' : ''}">
        <b>${rich(s.j?.pack?.title || s.name)}</b>
        <span class="small">${s.errs.length ? esc(s.errs.slice(0, 6).join('; ')) + (s.errs.length > 6 ? ` … (+${s.errs.length - 6} lỗi)` : '') : `${s.j.items.length} mục, ${TYPE[s.j.pack.type]}${D.packs.some(p => p.id === s.j.pack.id) ? ' — đã có gói cùng tên' : ''}`}</span></li>`).join('')}</ul>
      ${ok.length ? `<fieldset class="radios"><legend class="small">Nếu đã có gói cùng tên</legend>
        <label><input type="radio" name="mode" value="replace" checked> Thay thế gói cũ</label>
        <label><input type="radio" name="mode" value="merge"> Gộp thêm vào gói cũ</label></fieldset>
        <button class="btn btn-primary" data-act="doimport">Nhập ${ok.length} gói</button>` : ''}`;
    const b = view.querySelector('[data-act=doimport]');
    if (b) b.onclick = async () => {
      const mode = view.querySelector('input[name=mode]:checked').value;
      let n = 0;
      for (const s of ok) n += await importPack(s.j, mode);
      toast(`Đã nhập ${ok.length} gói, ${n} mục.`);
      ctx.sessionDone?.();
      renderData(view, ctx);
    };
  };

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

  // sao lưu
  view.querySelector('[data-act=backup]').onclick = async () => download(`saoluu-tiengnhat-${new Date().toISOString().slice(0, 10)}.json`, await backupJSON());
  view.querySelector('[data-in=restore]').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const merge = await confirmBox('Gộp bản sao lưu với dữ liệu hiện có? Chọn "Thay hết" để xoá dữ liệu trên máy này và dùng đúng bản sao lưu.', 'Gộp', 'Thay hết');
    try { await restoreJSON(await readFile(f), merge ? 'merge' : 'replace'); toast('Đã khôi phục.'); ctx.sessionDone?.(); renderData(view, ctx); }
    catch (err) { toast(err.message || 'Không khôi phục được.'); }
  };

  // đồng bộ
  const sf = view.querySelector('.syncf');
  const el = n => sf.querySelector(`[name="${n}"]`);
  const diagBox = sf.querySelector('.diag');
  const MARK = { true: ['ok', 'Đạt'], warn: ['warn', 'Lưu ý'], false: ['bad', 'Lỗi'] };
  const showDiag = steps => {
    diagBox.innerHTML = (steps || []).map(s => {
      const [cls, label] = MARK[String(s.ok)];
      return `<li class="diag-${cls}"><span class="diag-m" aria-label="${label}"></span><span>${esc(s.text)}</span></li>`;
    }).join('');
  };
  // đọc form → chuẩn hoá → ghi ngược lại vào ô để Cậu Cả thấy app hiểu thế nào
  const readCfg = () => {
    const c = normalizeCfg({ owner: el('owner').value, repo: el('repo').value, token: el('token').value, branch: el('branch').value, path: el('path').value });
    for (const k of Object.keys(c)) el(k).value = c[k];
    return c;
  };
  const busyBtns = on => sf.querySelectorAll('button').forEach(x => { x.disabled = on; });
  const savedBox = view.querySelector('.saved');
  const refreshSaved = async () => { savedBox.innerHTML = savedHTML(await getSyncCfg()); };
  const status = async (r) => {
    sf.querySelector('.sync-st').innerHTML = `Lần đồng bộ cuối: ${fmtDate(await lastSync())}${r?.error ? `<br><span class="err">Lỗi: ${esc(r.error)}</span>` : ''}`;
  };

  sf.querySelector('[data-act=showtok]').onchange = e => { el('token').type = e.target.checked ? 'text' : 'password'; };
  sf.onsubmit = async e => {
    e.preventDefault();
    const c = readCfg();
    await setSyncCfg(c);
    const prob = formProblem(c);
    toast(prob ? `Đã lưu. ${prob}` : 'Đã lưu cài đặt đồng bộ.');
    refreshSaved();
    ctx.refreshSync?.();
  };
  sf.querySelector('[data-act=synccheck]').onclick = async () => {
    busyBtns(true);
    diagBox.innerHTML = '<li class="muted">Đang kiểm tra…</li>';
    const c = readCfg();
    await setSyncCfg(c);
    const d = await diagnose(c);
    if (d.fix.owner || d.fix.branch) { await setSyncCfg(d.cfg); for (const k of Object.keys(d.cfg)) el(k).value = d.cfg[k]; }
    showDiag(d.steps);
    busyBtns(false);
    refreshSaved();
    toast(d.ok ? 'Kết nối ổn. Bấm Đồng bộ ngay.' : 'Có chỗ cần sửa — xem danh sách bên dưới.');
  };
  sf.querySelector('[data-act=sync]').onclick = async () => {
    busyBtns(true);
    diagBox.innerHTML = '';
    await setSyncCfg(readCfg());
    const r = await syncNow();
    busyBtns(false);
    if (r.ok) {
      const c = await getSyncCfg();
      for (const k of Object.keys(c)) el(k).value = c[k];
      toast(r.fixed ? 'Đã đồng bộ. ' + r.fixed : 'Đã đồng bộ.');
    } else {
      toast(r.error || r.skipped);
      if (r.diag) showDiag(r.diag.steps);
      else if (r.problem) showDiag([{ ok: false, text: r.problem }]);
    }
    ctx.refreshSync?.();
    status(r);
    refreshSaved();
  };
  sf.querySelector('[data-act=share]').onclick = async () => {
    const c = readCfg();
    const prob = formProblem(c);
    if (prob) { toast(prob); return; }
    await setSyncCfg(c);
    refreshSaved();
    shareSheet(c);
  };
  if (opts.received) {
    view.querySelector('#dongbo').scrollIntoView({ block: 'start' });
    toast('Đã nhận cài đặt đồng bộ từ máy kia. Đang đồng bộ…');
    setTimeout(() => sf.querySelector('[data-act=sync]').click(), 400);
  }
}
