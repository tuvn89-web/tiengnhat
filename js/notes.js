// Luyện riêng một danh sách mục của bài học (trang bài học gọi). Bản v18 đã bỏ tính năng Sổ tay;
// dữ liệu sổ cũ (nbooks, nmarks) vẫn được giữ trong bản sao lưu / đồng bộ nhưng app không dùng nữa.
import { toast } from './util.js';
import { status } from './srs.js';

export async function practiceItems(view, ctx, kind, x, { title = 'Luyện riêng', again, onDone } = {}) {
  const { shuffle } = await import('./util.js');
  if (kind === 'quiz') {
    const { runQuiz } = await import('./quiz.js');
    const { ttsReady } = await import('./tts.js');
    const { S } = await import('./settings.js');
    const dirs = ['jv', 'vj', ...(ttsReady() ? ['au'] : [])];
    const qs = shuffle([...x.vocab]).slice(0, 30).map(it => ({ it, dir: (it.kanji && Math.random() < .25) ? 'kr' : dirs[Math.floor(Math.random() * dirs.length)] }));
    return runQuiz(view, qs, { dir: 'mix', script: S.script, source: 'all', onFinish: onDone, again }, ctx);
  }
  if (kind === 'learn') {
    const { runLearn } = await import('./learn.js');
    return runLearn(view, x.vocab.filter(it => status(it) === 'new').slice(0, 30), ctx, { again, onFinish: onDone });
  }
  if (kind === 'match') {
    const { buildRounds, runMatch } = await import('./match.js');
    const rounds = buildRounds(shuffle([...x.vocab]), 'vi-kana', 5);
    if (!rounds.length) { toast('Cần ít nhất 3 từ để ghép cặp.'); return; }
    return runMatch(view, rounds, 'vi-kana', ctx, { onDone, again });
  }
  if (kind === 'kanji') {
    const { buildKanjiQs } = await import('./kanji.js');
    const { runDrill } = await import('./drill.js');
    return runDrill(view, buildKanjiQs({ dir: 'mix', source: 'all', chars: x.kanji.map(k => k.char), count: 30 }), ctx, { title, again, onDone });
  }
  if (kind === 'gram') {
    const { buildGrammarQs } = await import('./gdrill.js');
    const { runDrill } = await import('./drill.js');
    return runDrill(view, buildGrammarQs({ type: 'mix', source: 'all', ids: x.grammar.map(g => g.id), count: 20 }), ctx, { title, again, onDone });
  }
  if (kind === 'dich') {
    const { buildDich } = await import('./dich.js');
    const { runDrill } = await import('./drill.js');
    const ids = new Set([...x.vocab, ...x.grammar].map(it => it.id));
    return runDrill(view, buildDich({ dir: 'mix', how: 'mix', level: 'N1', srcIds: ids, count: 10 }), ctx, { title: title + ' · dịch', again, onDone });
  }
}
