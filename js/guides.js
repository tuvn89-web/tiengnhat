// Bài hướng dẫn trong app (đợt 5a, Đ7 – D4): cho người mới · theo cấp · theo mục tiêu.
// Khối nội dung: ['h', chữ] tiêu đề nhỏ · ['p', chữ] đoạn · ['ul', [chữ…]] danh sách · ['tb', [[ô…]…]] bảng (hàng đầu là tiêu đề)
// · ['a', nhãn, đường dẫn] nút đi tới trang trong app. Chữ Nhật viết 漢字[かんじ] để có furigana; **đậm**.
import { esc, rich } from './util.js';
import { emptyState } from './ui.js';

const T = s => rich(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// Đề thi JLPT (theo jlpt.jp — phần thi, thời gian; điểm đỗ: tổng / tối thiểu từng phần)
const JLPT = {
  N5: { parts: [['Kiến thức ngôn ngữ (chữ, từ vựng)', '20 phút'], ['Kiến thức ngôn ngữ (ngữ pháp) · Đọc hiểu', '40 phút'], ['Nghe hiểu', '30 phút']], pass: 'Đỗ khi tổng từ **80/180**, phần Kiến thức ngôn ngữ + Đọc hiểu từ 38/120 và Nghe từ 19/60.' },
  N4: { parts: [['Kiến thức ngôn ngữ (chữ, từ vựng)', '25 phút'], ['Kiến thức ngôn ngữ (ngữ pháp) · Đọc hiểu', '55 phút'], ['Nghe hiểu', '35 phút']], pass: 'Đỗ khi tổng từ **90/180**, phần Kiến thức ngôn ngữ + Đọc hiểu từ 38/120 và Nghe từ 19/60.' },
  N3: { parts: [['Kiến thức ngôn ngữ (chữ, từ vựng)', '30 phút'], ['Kiến thức ngôn ngữ (ngữ pháp) · Đọc hiểu', '70 phút'], ['Nghe hiểu', '40 phút']], pass: 'Đỗ khi tổng từ **95/180** và mỗi phần (Kiến thức ngôn ngữ, Đọc hiểu, Nghe) từ 19/60.' },
  N2: { parts: [['Kiến thức ngôn ngữ (chữ, từ vựng, ngữ pháp) · Đọc hiểu', '105 phút'], ['Nghe hiểu', '50 phút']], pass: 'Đỗ khi tổng từ **90/180** và mỗi phần (Kiến thức ngôn ngữ, Đọc hiểu, Nghe) từ 19/60.' },
};
const exam = L => [['h', `Đề thi ${L}`], ['tb', [['Phần thi', 'Thời gian'], ...JLPT[L].parts]], ['p', JLPT[L].pass],
  ['p', 'Thi mỗi năm 2 lần ở Nhật (tháng 7 và tháng 12). Hạn đăng ký thường trước ngày thi khoảng 3–4 tháng — xem lịch chính thức trên trang jlpt.jp. Số liệu đề thi và điểm đỗ lấy theo jlpt.jp (tra ngày 12/10/2026).']];

export const GUIDES = [
  // ---------- cho người mới ----------
  { id: 'srs', g: 'Cho người mới', t: 'Học bằng lặp lại ngắt quãng', b: [
    ['p', 'App không bắt bạn ôn mọi từ mỗi ngày. Mỗi từ nằm trong một **hộp** từ 1 đến 5. Trả lời đúng thì từ lên hộp trên và lần ôn sau xa hơn; sai thì về hộp 1 và ôn lại ngày mai.'],
    ['tb', [['Hộp', 'Ôn lại sau'], ['1', '1 ngày'], ['2', '2 ngày'], ['3', '4 ngày'], ['4', '8 ngày'], ['5 — đã thuộc', '16 ngày']]],
    ['p', 'Não nhớ lâu nhất khi được hỏi lại đúng lúc sắp quên. Vì vậy mỗi ngày chỉ cần làm phần **đến hạn** — thường 10–20 phút.'],
    ['p', 'Từ vựng có 3 chiều học riêng: Nhật → Việt, Việt → Nhật và đọc chữ Hán. Từ chỉ tính "đã thuộc" khi cả chiều Nhật → Việt và Việt → Nhật lên hộp 5.'],
    ['p', '**Thuộc nhuần nhuyễn:** đã ở hộp 5 mà đến lần ôn sau 16 ngày vẫn trả lời đúng thì chiều đó không bao giờ đến hạn ôn nữa. Nếu sau này tự luyện mà làm sai, mục đó trở lại hộp 1 như thường.'],
    ['p', '**Luyện từ đã tim** (trong bài học): câu đúng làm mới lịch ôn của từ — từ mới hoặc đã đến hạn thì lên một hộp (mỗi chiều một lần mỗi lượt), còn lại dời hạn ôn tính từ hôm nay. Câu sai không làm tụt hộp.'],
    ['a', 'Ôn phần đến hạn hôm nay', '#/onhon']] },
  { id: 'nut', g: 'Cho người mới', t: 'Nút Đã học, Biết rồi, Để sau', b: [
    ['p', 'Ở **Học từ mới**, mỗi thẻ có 3 nút:'],
    ['ul', ['**Đã học**: từ vào hộp 1, ngày mai app hỏi lại lần đầu.', '**Biết rồi**: từ bạn đã biết chắc — vào thẳng hộp 5, 16 ngày sau hỏi lại một lần để kiểm.', '**Để sau**: bỏ qua, lần sau từ này vẫn nằm trong hàng từ mới.']],
    ['p', 'Bấm nhầm thì vuốt sang phải (hoặc nút ←) để lật lại thẻ trước và chọn lại.'],
    ['p', '**Nút Đã thuộc** (hiện sau khi trả lời ở các lượt ôn, trắc nghiệm, ôn chữ Hán, luyện ngữ pháp, câu dịch): bấm thì mục đó thuộc hẳn — **không bao giờ đến hạn ôn nữa**. Nút đổi thành "✓ Đã thuộc"; bấm lần nữa (trước khi bấm Tiếp) để bỏ. Mục đã thuộc không còn nằm trong phần đến hạn ôn; chỉ gặp lại khi bạn tự chọn luyện (luyện cả bài, chọn nguồn "Đã thuộc" hoặc "Tất cả"). Lúc tự luyện mà làm sai thì mục đó trở lại hộp 1 như thường.'],
    ['p', 'Biết sẵn nhiều từ thì đừng bấm "Biết rồi" từng từ — làm **Xếp lớp nhanh** để app tự đánh dấu cả cấp.'],
    ['a', 'Kiểm tra trình độ', '#/trinhdo']] },
  { id: 'furi', g: 'Cho người mới', t: 'Furigana, chữ Hán và âm Hán Việt', b: [
    ['p', 'Chữ Hán trong app luôn có furigana (chữ nhỏ ghi cách đọc phía trên), trừ kiểu bài "Kanji → cách đọc" và bài thi — vì đó là lúc kiểm tra bạn có đọc được chữ hay không.'],
    ['p', 'Mỗi từ có **âm Hán Việt**: 冷凍[れいとう] = LÃNH ĐÔNG, 確認[かくにん] = XÁC NHẬN. Người Việt đoán nghĩa từ Hán rất nhanh nhờ âm này — hãy đọc nó mỗi lần học từ mới.'],
    ['p', 'Chạm vào một chữ Hán bất kỳ để mở **thẻ chữ**: âm Hán Việt, cách đọc, bộ phận, câu lục bát giúp nhớ mặt chữ và các từ có chữ đó.']] },
  { id: 'ngay', g: 'Cho người mới', t: 'Ôn mỗi ngày thế nào', b: [
    ['ul', ['1. **Ôn hỗn hợp** — làm hết phần đến hạn trước (từ, chữ Hán, ngữ pháp trộn chung).', '2. **Học từ mới** — 5 đến 20 từ tùy thời gian; đừng học quá sức, vì mỗi từ mới sẽ quay lại 5 lần trong 1 tháng.', '3. **Một mẫu ngữ pháp** — đọc bài, rồi bấm Luyện mẫu này.', '4. **Một bài luyện** — ghép câu, thể động từ, đếm số… để dùng được từ đã học.']],
    ['p', 'Nghỉ một ngày thì hôm sau phần đến hạn sẽ dồn lại. Không sao — cứ ôn hết phần dồn rồi mới học từ mới.'],
    ['p', '**Kế hoạch hôm nay** trên Trang chủ tự xếp các việc này theo số phút bạn chọn ở màn Bắt đầu.'],
    ['a', 'Đổi số phút mỗi ngày', '#/batdau']] },
  { id: 'nghe', g: 'Cho người mới', t: 'Luyện nghe', b: [
    ['p', 'App đọc tiếng Nhật bằng giọng đọc có sẵn của máy. Vào **Cài đặt → Giọng đọc** để chọn giọng tiếng Nhật và tốc độ. Máy chưa có giọng tiếng Nhật thì cài thêm trong cài đặt ngôn ngữ của điện thoại.'],
    ['ul', ['Bấm biểu tượng loa ở mọi thẻ từ và câu ví dụ để nghe.', 'Trắc nghiệm có kiểu **Nghe → nghĩa**; ngữ pháp có **Nghe → chọn**.', 'Mẹo "nói đuổi": nghe một câu ví dụ, dừng, nói to lại đúng nhịp — mỗi ngày 5 câu.']],
    ['p', 'Bài **hội thoại, bài đọc** và **bài mở đầu** dài thì mặc định chỉ hiện 5 câu đầu: bấm **Xem cả bài** để đọc tiếp, **Thu gọn** để gấp lại. Ở **Nghe cả bài**, khi giọng đọc tới phần đang ẩn thì bài tự mở ra.'],
    ['a', 'Mở Cài đặt', '#/caidat']] },
  { id: 'dongbo', g: 'Cho người mới', t: 'Học trên nhiều máy', b: [
    ['p', 'Tiến độ lưu trong máy. Muốn dùng cả điện thoại và máy tính, vào **Dữ liệu → Đồng bộ** và điền kho GitHub riêng tư theo hướng dẫn. App tự đồng bộ khi mở, sau mỗi lượt học và khi có mạng trở lại.'],
    ['p', 'Máy thứ hai không cần điền lại: ở máy đã cài, bấm **Chuyển sang máy khác** rồi quét mã QR bằng máy kia.'],
    ['a', 'Mở Dữ liệu', '#/dulieu']] },
  // ---------- theo cấp ----------
  { id: 'n5', g: 'Theo cấp', t: 'Học N5 thế nào', b: [
    ['p', 'N5 là nền móng: hiểu câu ngắn về đời sống hằng ngày viết bằng hiragana, katakana và chữ Hán cơ bản.'],
    ['tb', [['Cần biết', 'Khoảng'], ['Từ vựng', '700 từ'], ['Chữ Hán', '100 chữ'], ['Mẫu ngữ pháp', '44 mẫu (theo kho app)'], ['Thời gian', 'khoảng 3 tháng nếu học 20 phút mỗi ngày']]],
    ['h', 'Lỗi người Việt hay mắc'],
    ['ul', ['Quên trường âm và âm ngắt: おばさん (cô) ≠ おばあさん (bà); きて (đến) ≠ きって (tem).', 'Lẫn trợ từ は và が, に và で (ở đâu "có" thì に, ở đâu "làm" thì で).', 'Chia nhầm nhóm động từ: 帰[かえ]る, 入[はい]る, 切[き]る là nhóm 1 → 帰[かえ]ります, không phải 帰[かえ]ます.', 'Dùng あなた quá nhiều — người Nhật gọi bằng tên + さん.']],
    ...exam('N5'), ['a', 'Thi vượt cấp N5', '#/trinhdo']] },
  { id: 'n4', g: 'Theo cấp', t: 'Học N4 thế nào', b: [
    ['p', 'N4 đủ để nói chuyện đơn giản trong đời sống và nơi làm việc — cũng là mức tiếng Nhật của 特定技能[とくていぎのう]1号[ごう].'],
    ['tb', [['Cần biết (thêm so với N5)', 'Khoảng'], ['Từ vựng', '700 từ'], ['Chữ Hán', '200 chữ'], ['Mẫu ngữ pháp', '67 mẫu'], ['Thời gian', '4–5 tháng, 20 phút mỗi ngày']]],
    ['p', 'Trọng tâm: **các thể động từ** (thể て, thể ない, thể た, khả năng, ý chí, điều kiện, bị động, sai khiến). Mỗi ngày làm một bài **Thể động từ trong câu**.'],
    ['h', 'Lỗi người Việt hay mắc'],
    ['ul', ['Lẫn bốn cách nói "nếu": 〜ば, 〜たら, 〜なら, 〜と.', 'Lẫn động từ tự – tha: ドアが開[あ]く (cửa mở) / ドアを開[あ]ける (mở cửa).', 'Cho – nhận: あげる / くれる / もらう — ai cho ai.', 'Bị động nhầm chủ thể.']],
    ...exam('N4'), ['a', 'Thi vượt cấp N4', '#/trinhdo']] },
  { id: 'n3', g: 'Theo cấp', t: 'Học N3 thế nào', b: [
    ['p', 'N3 là cầu nối từ tiếng Nhật đời sống sang tiếng Nhật công việc: đọc thông báo, hiểu chỉ thị dài, nói lý do và báo cáo. Với ngành thủy sản, đây là mốc của 特定技能[とくていぎのう]2号[ごう] (xem bài 2号 bên dưới).'],
    ['tb', [['Cần biết (thêm so với N4)', 'Khoảng'], ['Từ vựng', '1.500 từ'], ['Chữ Hán', '350 chữ'], ['Mẫu ngữ pháp', '105 mẫu'], ['Thời gian', '6–9 tháng, 20–40 phút mỗi ngày'], ['Để có B1 (2号)', 'đỗ N3 từ 104/180 điểm']]],
    ['p', 'Từ vựng tăng gấp đôi nên **âm Hán Việt** trở thành vũ khí chính: học theo chữ Hán, nhìn 管理[かんり] = QUẢN LÝ là đoán được nghĩa.'],
    ['h', 'Lỗi người Việt hay mắc'],
    ['ul', ['Lẫn 〜ように và 〜ために (mục đích ý chí hay không).', 'Dùng sai kính ngữ với cấp trên, khách: 召[め]し上[あ]がる / いただく.', 'Đọc chậm vì dịch từng chữ — luyện đọc lướt tìm ý chính.', 'Phần Nghe: bỏ sót câu hỏi ở đầu bài — nghe kỹ câu hỏi trước.']],
    ...exam('N3'), ['a', 'Thi vượt cấp N3', '#/trinhdo']] },
  { id: 'n2', g: 'Theo cấp', t: 'Học N2 thế nào', b: [
    ['p', 'N2 là tiếng Nhật của văn bản: thông báo công ty, hợp đồng, giấy tờ hành chính, tin tức. Người có N2 thường được giao việc tổ trưởng, chỉ dẫn người mới.'],
    ['tb', [['Cần biết (thêm so với N3)', 'Khoảng'], ['Từ vựng', '2.500 từ'], ['Chữ Hán', '350 chữ'], ['Mẫu ngữ pháp', '150 mẫu'], ['Thời gian', '9–12 tháng']]],
    ['p', 'Kho dữ liệu N2 của app đang được làm dần sau N3.'],
    ['h', 'Lỗi người Việt hay mắc'],
    ['ul', ['Lẫn các mẫu cứng của văn viết: 〜わけではない, 〜ものの, 〜に際して.', 'Từ Hán đồng âm: 機会[きかい] (cơ hội) / 機械[きかい] (máy móc).', 'Thiếu thời gian phần Đọc — tập chia giờ: đọc câu hỏi trước rồi mới đọc bài.']],
    ...exam('N2')] },
  // ---------- theo mục tiêu ----------
  { id: 'ssw2', g: 'Theo mục tiêu', t: '特定技能[とくていぎのう]2号[ごう] ngành thủy sản', b: [
    ['p', 'Theo trang của 出入国在留管理庁[しゅつにゅうこくざいりゅうかんりちょう] về ngành 飲食料品製造業[いんしょくりょうひんせいぞうぎょう] (nội dung tính đến 4/9/2026):'],
    ['ul', ['2号 cần đỗ **飲食料品製造業特定技能[いんしょくりょうひんせいぞうぎょうとくていぎのう]2号[ごう]評価試験[ひょうかしけん]**.', 'Cần **kinh nghiệm thực tế**: vừa chỉ dẫn nhiều nhân viên vừa làm việc, và quản lý công đoạn.', 'Từ **1/4/2027**: cần tiếng Nhật mức **B1** theo 日本語教育[にほんごきょういく]の参照枠[さんしょうわく] — bài thi nào được chấp nhận sẽ thông báo sau. Theo bảng tham chiếu CEFR của JLPT, đỗ N3 với tổng điểm **từ 104/180** tương ứng B1 (đỗ N3 với 95–103 điểm chỉ tương ứng A2).', 'Cũng từ 1/4/2027, phân ngành tách thành 飲食料品製造業 và **水産加工業[すいさんかこうぎょう]** (chế biến thủy sản).']],
    ['h', 'Chuẩn bị bằng app'],
    ['ul', ['Lộ trình: mục tiêu **N3**, nhắm đỗ N3 với điểm cao (từ 104/180) chứ không chỉ vừa đủ đỗ. Trong app: Thi vượt cấp N3 nên đạt từ 85% trở lên.', 'Học song song gói chủ đề **Công xưởng** và **Thủy sản**: HACCP, vệ sinh, nhiệt độ, đọc nhãn.', 'Từ để **chỉ dẫn và báo cáo**: 指示[しじ], 確認[かくにん], 報告[ほうこく], 工程[こうてい] — sẽ có thêm trong các gói N3.']],
    ['p', 'Điều kiện có thể thay đổi — trước khi nộp hồ sơ luôn đọc lại trang chính thức của 出入国在留管理庁 và hỏi công ty / tổ chức hỗ trợ.'],
    ['a', 'Xem lộ trình', '#/lotrinh']] },
  { id: 'visa', g: 'Theo mục tiêu', t: 'Gia hạn visa và giấy tờ thuế', b: [
    ['p', 'Khi gia hạn tư cách lưu trú, hồ sơ thường cần giấy chứng nhận về **thuế cư trú** do 市役所[しやくしょ] / 区役所[くやくしょ] nơi ở cấp:'],
    ['ul', ['住民税[じゅうみんぜい]の課税証明書[かぜいしょうめいしょ] — giấy chứng nhận mức thuế cư trú (thu nhập năm trước).', '住民税の納税証明書[のうぜいしょうめいしょ] — giấy chứng nhận đã nộp thuế.', '源泉徴収票[げんせんちょうしゅうひょう] — phiếu khấu trừ thuế tại nguồn, công ty phát (thường vào cuối năm).']],
    ['p', 'Danh sách giấy tờ cụ thể thay đổi theo tư cách lưu trú và theo thời gian — luôn tải danh sách mới nhất trên trang 出入国在留管理庁 trước khi đi xin giấy.'],
    ['p', 'Ở quầy, câu hay dùng: 「課税証明書[かぜいしょうめいしょ]と納税証明書[のうぜいしょうめいしょ]を一部[いちぶ]ずつお願[ねが]いします。」 (Cho tôi mỗi loại một bản giấy chứng nhận thuế và giấy chứng nhận đã nộp thuế.)'],
    ['p', 'Học từ của gói **Thuế & visa** và câu thực chiến ở quầy để tự đi xin giấy được.'],
    ['a', 'Mở Kho từ', '#/kho']] },
  { id: 'song', g: 'Theo mục tiêu', t: 'Sống ở Nhật', b: [
    ['p', 'Những tình huống cần tiếng Nhật nhất: phân loại rác, ngân hàng, bệnh viện, thiên tai, nói chuyện với hàng xóm và người Kansai.'],
    ['ul', ['Gói **Đời sống**: rác, ngân hàng, bệnh viện, thiên tai.', 'Gói **Kansai-ben**: ở Hyogo sẽ nghe めっちゃ, あかん, ほんま… — app cho biết cách nói chuẩn tương ứng.', 'Bài **Đổi lối nói** (Ngữ pháp → Luyện tập): chuyển câu nói tắt, Kansai sang câu chuẩn lịch sự.']],
    ['a', 'Luyện đổi lối nói', '#/nguphap/luyen?t=shift']] },
];

export function renderGuides(view) {
  const groups = [...new Set(GUIDES.map(x => x.g))];
  view.innerHTML = `<h1 class="h1">Hướng dẫn học</h1>
    <div class="row-btns wrap"><a class="btn btn-ghost btn-sm" href="#/batdau">Bắt đầu / đổi mục tiêu</a><a class="btn btn-ghost btn-sm" href="#/lotrinh">Lộ trình</a><a class="btn btn-ghost btn-sm" href="#/trinhdo">Kiểm tra trình độ</a></div>
    ${groups.map(g => `<h2 class="h2">${esc(g)}</h2><ul class="rows">${GUIDES.filter(x => x.g === g).map(x => `<li><a class="row" href="#/huongdan/${x.id}"><span class="row-vi">${T(x.t)}</span></a></li>`).join('')}</ul>`).join('')}`;
}
export function renderGuide(view, id) {
  const a = GUIDES.find(x => x.id === id);
  if (!a) { view.innerHTML = emptyState('Không có bài này.', '<a class="btn btn-ghost" href="#/huongdan">Về Hướng dẫn</a>'); return; }
  const block = b => {
    if (b[0] === 'h') return `<h2 class="h2">${T(b[1])}</h2>`;
    if (b[0] === 'p') return `<p>${T(b[1])}</p>`;
    if (b[0] === 'ul') return `<ul class="steps">${b[1].map(x => `<li>${T(x)}</li>`).join('')}</ul>`;
    if (b[0] === 'tb') return `<table class="ctab guide-tb"><thead><tr>${b[1][0].map(c => `<th>${T(c)}</th>`).join('')}</tr></thead><tbody>${b[1].slice(1).map(r => `<tr>${r.map(c => `<td>${T(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    if (b[0] === 'a') return `<p><a class="btn btn-ghost" href="${esc(b[2])}">${esc(b[1])} →</a></p>`;
    return '';
  };
  const i = GUIDES.indexOf(a), next = GUIDES[i + 1];
  view.innerHTML = `<p class="small"><a href="#/huongdan">← Hướng dẫn</a> · ${esc(a.g)}</p>
    <h1 class="h1">${T(a.t)}</h1>
    <article class="prose guide">${a.b.map(block).join('')}</article>
    ${next ? `<p class="guide-next"><a href="#/huongdan/${next.id}">Bài tiếp: ${T(next.t)} →</a></p>` : ''}`;
}
