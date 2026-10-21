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
  N1: { parts: [['Kiến thức ngôn ngữ (chữ, từ vựng, ngữ pháp) · Đọc hiểu', '110 phút'], ['Nghe hiểu', '55 phút']], pass: 'Đỗ khi tổng từ **100/180** và mỗi phần (Kiến thức ngôn ngữ, Đọc hiểu, Nghe) từ 19/60.' },
};
const exam = L => [['h', `Đề thi ${L}`], ['tb', [['Phần thi', 'Thời gian'], ...JLPT[L].parts]], ['p', JLPT[L].pass],
  ['p', 'Thi mỗi năm 2 lần ở Nhật (tháng 7 và tháng 12). Hạn đăng ký thường trước ngày thi khoảng 3–4 tháng — xem lịch chính thức trên trang jlpt.jp. Số liệu đề thi và điểm đỗ lấy theo jlpt.jp (tra ngày 12/10/2026).']];

export const GUIDES = [
  // ---------- cho người mới ----------
  { id: 'srs', g: 'Cho người mới', t: 'Học bằng lặp lại ngắt quãng', b: [
    ['p', 'App không bắt bạn ôn mọi từ mỗi ngày. Mỗi từ nằm trong một **hộp** từ 1 đến 7. Trả lời đúng thì từ lên hộp trên và lần ôn sau xa hơn.'],
    ['tb', [['Hộp', 'Ôn lại sau'], ['1', '1 ngày'], ['2', '2 ngày'], ['3', '4 ngày'], ['4', '8 ngày'], ['5 — đã thuộc', '16 ngày'], ['6', '35 ngày'], ['7', '90 ngày']]],
    ['p', '**Trả lời sai:** từ ở hộp 1–3 về hộp 1 (ôn lại ngày mai); từ ở hộp 4 trở lên **lùi 2 hộp** — đã nhớ khá lâu mà quên một lần thì không phải học lại từ đầu.'],
    ['p', '**Đúng mà chậm:** ở câu chọn đáp án của từ vựng và chữ Hán, trả lời đúng nhưng nghĩ lâu hơn 8 giây thì từ giữ nguyên hộp (phải nghĩ lâu là dấu hiệu sắp quên). Chỉnh số giây hoặc tắt ở Cài đặt → Học.'],
    ['p', 'Não nhớ lâu nhất khi được hỏi lại đúng lúc sắp quên. Vì vậy mỗi ngày chỉ cần làm phần **đến hạn** — thường 10–20 phút.'],
    ['p', 'Từ vựng có 3 chiều học riêng: Nhật → Việt, Việt → Nhật và đọc chữ Hán. Từ chỉ tính "đã thuộc" khi cả chiều Nhật → Việt và Việt → Nhật lên hộp 5.'],
    ['p', '**Thuộc nhuần nhuyễn:** đã ở hộp 7 mà đến lần ôn sau 90 ngày vẫn trả lời đúng thì chiều đó không bao giờ đến hạn ôn nữa. Từ bấm "Biết rồi" lúc học (vào thẳng hộp 5) thì chỉ cần đúng ở lần ôn 16 ngày là thuộc hẳn. Nếu sau này tự luyện mà làm sai, mục đó lùi hộp như thường.'],
    ['p', '**Từ cứng đầu:** từ hoặc chữ Hán sai từ 4 lần trở lên mà chưa thuộc. Lần ôn sau, app hiện thẻ đầy đủ (âm Hán Việt, thơ nhớ chữ, câu ví dụ, từ dễ nhầm) trước khi hỏi — mỗi mục một lần mỗi ngày. Luyện riêng ở Luyện tập → **Đánh từ cứng đầu**; lọc ở Kho từ → Bộ lọc → Cứng đầu.'],
    ['p', '**Nhắc lại cuối ngày:** từ học mới hôm nay, sau ít nhất 4 giờ, có dòng "Nhắc lại … từ mới hôm nay" trong Kế hoạch hôm nay. Đây chỉ là lượt nhắc, không đổi lịch ôn — giúp từ mới không rơi mất qua đêm đầu tiên.'],
    ['p', '**Luyện từ đã tim** (trong bài học): câu đúng làm mới lịch ôn của từ — từ mới hoặc đã đến hạn thì lên một hộp (mỗi chiều một lần mỗi lượt), còn lại dời hạn ôn tính từ hôm nay. Câu sai không làm tụt hộp.'],
    ['a', 'Ôn phần đến hạn hôm nay', '#/onhon']] },
  { id: 'nut', g: 'Cho người mới', t: 'Nút Đã học, Biết rồi, Để sau', b: [
    ['p', 'Ở **Học từ mới**, mỗi thẻ có 3 nút:'],
    ['ul', ['**Đã học**: từ vào hộp 1, ngày mai app hỏi lại lần đầu.', '**Biết rồi**: từ bạn đã biết chắc — vào thẳng hộp 5, 16 ngày sau hỏi lại một lần để kiểm.', '**Để sau**: bỏ qua, lần sau từ này vẫn nằm trong hàng từ mới.']],
    ['p', 'Bấm nhầm thì vuốt sang phải (hoặc nút ←) để lật lại thẻ trước và chọn lại.'],
    ['p', '**Nút Đã thuộc** (hiện sau khi trả lời ở các lượt ôn, trắc nghiệm, ôn chữ Hán, luyện ngữ pháp, câu dịch): bấm thì mục đó thuộc hẳn — **không bao giờ đến hạn ôn nữa**. Nút đổi thành "✓ Đã thuộc"; bấm lần nữa (trước khi bấm Tiếp) để bỏ. Mục đã thuộc không còn nằm trong phần đến hạn ôn; chỉ gặp lại khi bạn tự chọn luyện (luyện cả bài, chọn nguồn "Đã thuộc" hoặc "Tất cả"). Lúc tự luyện mà làm sai thì mục đó lùi hộp như thường.'],
    ['p', 'Biết sẵn nhiều từ thì đừng bấm "Biết rồi" từng từ — làm **Xếp lớp nhanh** để app tự đánh dấu cả cấp.'],
    ['a', 'Kiểm tra trình độ', '#/trinhdo']] },
  { id: 'furi', g: 'Cho người mới', t: 'Furigana, chữ Hán và âm Hán Việt', b: [
    ['p', 'Chữ Hán trong app luôn có furigana (chữ nhỏ ghi cách đọc phía trên), trừ kiểu bài "Kanji → cách đọc" và bài thi — vì đó là lúc kiểm tra bạn có đọc được chữ hay không.'],
    ['p', 'Mỗi từ có **âm Hán Việt**: 冷凍[れいとう] = LÃNH ĐÔNG, 確認[かくにん] = XÁC NHẬN. Người Việt đoán nghĩa từ Hán rất nhanh nhờ âm này — hãy đọc nó mỗi lần học từ mới.'],
    ['p', 'Chạm vào một chữ Hán bất kỳ để mở **thẻ chữ**: âm Hán Việt, cách đọc, bộ phận, câu lục bát giúp nhớ mặt chữ và các từ có chữ đó.']] },
  { id: 'nhanh', g: 'Cho người mới', t: 'Học nhanh, nhớ lâu: các chế độ mới', b: [
    ['ul', ['**Ôn nhanh 3 phút** (Trang chủ): ôn đúng 3 phút phần đến hạn, mục quá hạn lâu nhất hỏi trước. Hết giờ thì làm nốt câu đang dở rồi dừng; bấm "Thêm 3 phút" để làm tiếp. Mỗi câu được ghi vào lịch ôn ngay, nên phải bỏ dở cũng không mất gì. Hợp với giờ nghỉ giữa ca.',
      '**Học từ mới — đoán nghĩa trước**: với từ Hán, app hiện âm Hán Việt (冷凍[れいとう] = LÃNH ĐÔNG) để bạn đoán nghĩa, rồi mới hiện thẻ. Đoán trước (kể cả đoán sai) giúp nhớ lâu hơn; rèn thói quen này thì gặp từ lạ trên giấy tờ cũng đoán được.',
      '**Đoán nghĩa từ Hán Việt** (Luyện tập): luyện riêng kỹ năng trên với từ chưa học hoặc đã học. Không đổi lịch ôn.',
      '**Phân biệt từ dễ nhầm** (Luyện tập): các từ dễ nhầm (冷凍[れいとう] / 冷蔵[れいぞう] / 解凍[かいとう]) hoặc mẫu ngữ pháp gần nghĩa đặt cạnh nhau, rồi chọn đúng theo câu. Ở các bài ôn thường, chọn nhầm sang từ dễ nhầm thì app hiện bảng so sánh hai từ.',
      '**Chữ Hán trông giống** (Luyện tập): một từ bị che một chữ, chọn đúng chữ giữa các chữ trông giống. Ở Ôn chữ Hán, chọn nhầm sang chữ trông giống thì app hiện bảng so sánh.',
      '**Gia đình chữ**: thẻ chữ có mục "Gia đình chữ" — các chữ có chung bộ phận (青[あお] → 清[せい], 晴[は]れる, 精[せい], 請[せい], 静[しず]か). Danh sách Chữ Hán có nút "Theo gia đình chữ".']],
    ['a', 'Mở Luyện tập', '#/luyen']] },
  { id: 'mua', g: 'Cho người mới', t: 'Giao diện mùa và hiệu ứng', b: [
    ['p', 'Mỗi tháng app có một họa tiết riêng theo mùa ở Nhật: tháng 4 hoa anh đào, tháng 6 mưa và cẩm tú cầu, tháng 8 pháo hoa và đom đóm, tháng 11 lá phong, tháng 12 tuyết… Trời đổi theo giờ của máy (bình minh, ngày, hoàng hôn, đêm có sao và trăng đúng ngày âm lịch). Ngày lễ Nhật và Việt Nam (Tết Nguyên Đán, Trung thu…) có trang trí riêng; đêm có mưa sao băng thì sao băng rơi nhiều.'],
    ['p', 'Thỉnh thoảng có máy bay bay qua để lại vệt khói, và hiếm hơn nữa là một hố đen hút các cánh hoa, chiếc lá ở gần.'],
    ['p', 'Vào **Cài đặt → Giao diện mùa & hiệu ứng** để chọn tháng, tắt giao diện mùa, chỉnh mật độ và tốc độ rơi, bật / tắt riêng từng hiệu ứng, cho mưa theo thời tiết thật ở thành phố của bạn, và bấm "Thử ngay" để xem từng hiệu ứng. Máy bật "giảm chuyển động" thì app tự tắt hiệu ứng.'],
    ['p', 'Mọi chỉnh sửa hiệu ứng nằm ở một chỗ: **Cài đặt → Giao diện mùa & hiệu ứng** (trên điện thoại: nút hình mặt trời ở góc trên bên phải, cạnh nút đồng bộ). Ở đó còn giữ cố định được **buổi** (bình minh, ngày, hoàng hôn, đêm), **ngày lễ** và **mưa** (cả mưa to có giông) — app **nhớ lại** mỗi lần mở; bấm "Về như thật" để trời và ngày lễ đổi theo thực tế.'],
    ['p', 'Nút tròn **‹** ở góc dưới bên trái (mọi trang trừ Trang chủ) để quay lại màn hình trước, giống nút Back của điện thoại: đang làm bài thì app hỏi "Dừng lượt này?". Nút che chữ thì **giữ ngón tay 0,7 giây** (máy rung nhẹ) rồi kéo sang chỗ khác; app nhớ chỗ đó.'],
    ['p', '**Cài đặt → Giao diện → Phông chữ Nhật / Phông chữ Việt**: chọn kiểu chữ thường, viết tay, thư pháp, mềm mại. Phông ngoài tải lần đầu khi có mạng, sau đó dùng được khi không có mạng. Mới học chữ Hán thì nên để Gothic hoặc Viết tay chuẩn cho dễ nhận mặt chữ.'],
    ['a', 'Mở Cài đặt', '#/caidat']] },
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
    ['p', 'Kho N2 của app có đủ 40 bài học: mỗi bài gồm từ mới, chữ Hán, 3 mẫu ngữ pháp, luyện tập, bài mở đầu (hội thoại hoặc bài đọc) và kiểm tra cuối bài.'],
    ['h', 'Lỗi người Việt hay mắc'],
    ['ul', ['Lẫn các mẫu cứng của văn viết: 〜わけではない, 〜ものの, 〜に際して.', 'Từ Hán đồng âm: 機会[きかい] (cơ hội) / 機械[きかい] (máy móc).', 'Thiếu thời gian phần Đọc — tập chia giờ: đọc câu hỏi trước rồi mới đọc bài.']],
    ...exam('N2'), ['a', 'Thi vượt cấp N2', '#/trinhdo']] },
  { id: 'n1', g: 'Theo cấp', t: 'Học N1 thế nào', b: [
    ['p', 'N1 là tiếng Nhật của người đã đi làm lâu năm: đọc xã luận, báo cáo, văn bản quy định; nghe cuộc họp, bài phát biểu với tốc độ tự nhiên. Nhiều mẫu ngữ pháp N1 chỉ gặp trong văn viết và lời phát biểu trang trọng.'],
    ['tb', [['Cần biết (thêm so với N2)', 'Khoảng'], ['Từ vựng', '3.000 từ'], ['Chữ Hán', '1.000 chữ'], ['Mẫu ngữ pháp', '150 mẫu (theo kho app)'], ['Thời gian', '12 tháng trở lên']]],
    ['p', 'Kho N1 của app gồm 50 bài học theo một mạch truyện: anh Nguyễn lên 主任[しゅにん], lo việc ở xưởng và ôn thi N1. Các bài đang được làm dần và có thêm trong các bản cập nhật tới.'],
    ['p', 'Ở N1, **âm Hán Việt** càng có ích: từ khó như 踏襲[とうしゅう] (ĐẠP TẬP — noi theo cách làm của người trước) hay 拙速[せっそく] (CHUYẾT TỐC — nhanh mà ẩu) đoán được nghĩa từ từng chữ.'],
    ['h', 'Lỗi người Việt hay mắc'],
    ['ul', ['Lẫn các mẫu gần nghĩa: 〜といえども / 〜とはいえ; 〜をもって / 〜によって; 〜ならでは / 〜らしい.', 'Từ Hán gần âm, gần nghĩa: 保証[ほしょう] (bảo đảm chất lượng, bảo lãnh) / 保障[ほしょう] (bảo vệ quyền lợi, an toàn) / 補償[ほしょう] (bồi thường thiệt hại).', 'Dùng mẫu văn viết trong lời nói thân mật — nghe rất cứng.', 'Phần Nghe: người nói đi vòng, ý thật nằm ở cuối câu hoặc sau 〜けど / 〜が — nghe hết câu rồi mới chọn.']],
    ...exam('N1'), ['a', 'Thi vượt cấp N1', '#/trinhdo'], ['a', 'Đề thi thử JLPT', '#/thithu']] },
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
