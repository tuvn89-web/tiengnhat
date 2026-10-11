import { all, put, del, kvGet, kvSet } from './db.js';

export const TOPICS = { doisong: 'Đời sống', xuong: 'Công xưởng', thuysan: 'Thủy sản', thuevisa: 'Thuế & visa', kansai: 'Kansai-ben', jlpt: 'JLPT chung' };
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const POS = { n: 'danh từ', 'n-suru': 'danh từ + する', v1: 'động từ nhóm 2', v5: 'động từ nhóm 1', v3: 'động từ nhóm 3', 'adj-i': 'tính từ い', 'adj-na': 'tính từ な', adv: 'phó từ', expr: 'cụm từ', ctr: 'trợ số từ', other: 'khác' };
export const REG = { trangtrong: 'văn bản, giấy tờ', lichsu: 'lịch sự', thuong: 'trung tính', khaungu: 'khẩu ngữ', kansai: 'Kansai-ben' };
export const CTX = { doisong: 'Đời sống', xuong: 'Xưởng', thutuc: 'Thủ tục', hoithoai: 'Hội thoại' };
const TYPES = ['vocab', 'grammar', 'phrase', 'kanji'];
// Nhóm chữ Hán theo nơi hay gặp (K11)
export const KGROUPS = { coban: 'Chữ nền tảng', nhan: 'Nhãn sản phẩm', giayto: 'Giấy tờ & thuế', xuong: 'Công xưởng', antoan: 'Biển an toàn', thuysan: 'Thủy sản' };

// D = toàn bộ dữ liệu đang dùng
export const D = {
  manifest: { packs: [] },
  packs: [],          // {id, title, type, level, topics, count, version, src:'builtin'|'imported', items}
  user: new Map(),    // id -> mục tự thêm/sửa (có _t, có thể _del)
  disabled: { list: [], t: 0 },
  reports: {},        // id -> {note, t, _del?}
  items: new Map(),
  vocab: [], grammar: [], phrase: [], kanji: [],
  kanjiByChar: new Map(),
  errors: [],
};
export const typeOfId = id => id.startsWith('g:') ? 'grammar' : id.startsWith('p:') ? 'phrase' : id.startsWith('k:') ? 'kanji' : 'vocab';

export async function loadAll() {
  D.errors = [];
  D.disabled = await kvGet('disabled', { list: [], t: 0 });
  D.reports = await kvGet('reports', {});
  try {
    const r = await fetch('data/manifest.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    D.manifest = await r.json();
    kvSet('manifestCache', D.manifest);
  } catch {
    D.manifest = await kvGet('manifestCache', { packs: [] });
    if (!D.manifest.packs.length) D.errors.push('Không tải được danh mục gói. Mở app khi có mạng một lần để tải dữ liệu.');
  }
  const builtin = await Promise.all((D.manifest.packs || []).map(async m => {
    try {
      const r = await fetch(`data/packs/${m.file}?v=${m.version || 1}`);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      return { ...m, src: 'builtin', items: j.items || [] };
    } catch {
      D.errors.push(`Không tải được gói "${m.title}" — cần mở app khi có mạng.`);
      return null;
    }
  }));
  const imported = (await all('imported')).filter(x => !x._del).map(x => packEntry(x.pack, x.items, 'imported', x._t));
  D.packs = [...builtin.filter(Boolean), ...imported];
  D.user = new Map((await all('user')).map(x => [x.id, x]));
  rebuild();
}

function packEntry(p, items, src, t) {
  return { id: p.id, title: p.title, type: p.type, level: p.level, topics: p.topics || [], count: items.length, version: p.version || 1, src, items, _t: t };
}

export function rebuild() {
  const off = new Set(D.disabled.list || []);
  const m = new Map();
  for (const p of D.packs) {
    if (off.has(p.id)) continue;
    for (const it of p.items) m.set(it.id, norm({ ...it, _pack: p.id, _type: p.type }));
  }
  for (const u of D.user.values()) {
    if (u._del) { if (u._hide) m.delete(u.id); continue; }
    m.set(u.id, norm({ ...u, _user: true, _type: typeOfId(u.id), _pack: u._pack || 'tu-them' }));
  }
  D.items = m;
  D.vocab = []; D.grammar = []; D.phrase = []; D.kanji = [];
  for (const it of m.values()) ({ grammar: D.grammar, phrase: D.phrase, kanji: D.kanji }[it._type] || D.vocab).push(it);
  D.kanjiByChar = new Map(D.kanji.map(k => [k.char, k]));
}
function norm(it) {
  it.topics = it.topics || [];
  if (it._type === 'vocab') { it.kanji = it.kanji || ''; it.hv = it.hv || ''; it.ex = it.ex || []; }
  return it;
}

export async function setPackEnabled(id, on) {
  const s = new Set(D.disabled.list);
  on ? s.delete(id) : s.add(id);
  D.disabled = { list: [...s], t: Date.now() };
  await kvSet('disabled', D.disabled);
  rebuild();
}

// ---- mục tự thêm / sửa ----
export async function saveUserItem(it) {
  const rec = { ...it, _t: Date.now() };
  for (const k of Object.keys(rec)) if (k.startsWith('_') && !['_t', '_pack'].includes(k)) delete rec[k];
  D.user.set(rec.id, rec);
  await put('user', rec);
  rebuild();
}
export async function deleteUserItem(id) {
  // Mục gốc từ gói: xoá bản sửa (trở về bản gốc). Mục tự thêm: ẩn hẳn.
  const inPack = D.packs.some(p => p.items.some(x => x.id === id));
  const rec = { id, _del: true, _hide: !inPack, _t: Date.now() };
  D.user.set(id, rec);
  await put('user', rec);
  rebuild();
}

// ---- báo sai ----
export async function report(id, note) {
  D.reports[id] = { note: note || '', t: Date.now() };
  await kvSet('reports', D.reports);
}
export async function unreport(id) {
  D.reports[id] = { _del: true, t: Date.now() };
  await kvSet('reports', D.reports);
}
export const activeReports = () => Object.entries(D.reports).filter(([, r]) => !r._del);

// ---- nhập gói ----
export function checkPack(j) {
  const errs = [];
  if (!j || typeof j !== 'object') return ['Không phải JSON hợp lệ'];
  if (j.schema !== 1) errs.push('schema phải là 1');
  const p = j.pack || {};
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errs.push('pack.id thiếu hoặc sai dạng');
  if (!TYPES.includes(p.type)) errs.push('pack.type phải là vocab/grammar/phrase/kanji');
  if (!p.title) errs.push('thiếu pack.title');
  if (!Array.isArray(j.items) || !j.items.length) errs.push('không có mục nào');
  const pre = { vocab: 'v:', grammar: 'g:', phrase: 'p:', kanji: 'k:' }[p.type];
  (j.items || []).forEach((it, i) => {
    const w = `mục ${i + 1}`;
    if (!it.id) errs.push(`${w}: thiếu id`);
    else if (pre && !it.id.startsWith(pre)) errs.push(`${w}: id phải bắt đầu bằng ${pre}`);
    if (p.type === 'vocab' && (!it.kana || !it.vi)) errs.push(`${w}: thiếu kana hoặc vi`);
    if (p.type === 'grammar' && (!it.pattern || !Array.isArray(it.ex))) errs.push(`${w}: thiếu pattern hoặc ex`);
    if (p.type === 'phrase' && (!it.jp || !it.vi)) errs.push(`${w}: thiếu jp hoặc vi`);
    if (p.type === 'kanji' && (!it.char || !it.hv)) errs.push(`${w}: thiếu char hoặc hv`);
  });
  return errs;
}
export async function importPack(j, mode = 'replace') {
  const id = j.pack.id;
  let items = j.items;
  const old = D.packs.find(p => p.id === id && p.src === 'imported');
  if (mode === 'merge' && old) {
    const m = new Map(old.items.map(x => [x.id, x]));
    for (const it of j.items) m.set(it.id, it);
    items = [...m.values()];
  }
  const rec = { id, pack: j.pack, items, _t: Date.now() };
  await put('imported', rec);
  D.packs = D.packs.filter(p => !(p.id === id && p.src === 'imported'));
  D.packs.push(packEntry(j.pack, items, 'imported', rec._t));
  rebuild();
  return items.length;
}
export async function removeImported(id) {
  await put('imported', { id, _del: true, _t: Date.now() });
  D.packs = D.packs.filter(p => !(p.id === id && p.src === 'imported'));
  rebuild();
}
