# Tiếng Nhật Thực Chiến — hướng dẫn cài đặt

App là một trang web cài được như ứng dụng (PWA). Mở một lần khi có mạng, từ đó dùng offline trên điện thoại Android và máy tính. Tất cả miễn phí.

Gồm hai kho trên GitHub:

| Kho | Chế độ | Chứa gì |
|---|---|---|
| `tiengnhat` | **Công khai** (GitHub Pages miễn phí chỉ chạy với kho công khai) | Code app + gói từ vựng, ngữ pháp. Không có thông tin cá nhân. |
| `tiengnhat-tiendo` | **Riêng tư** | Tiến độ học, từ tự thêm. Chỉ bạn xem được. |

---

## 1. Đưa app lên mạng (làm một lần, trên máy tính)

1. Tạo tài khoản ở github.com (nếu chưa có).
2. Bấm **+** góc trên phải → **New repository**.
   - Repository name: `tiengnhat`
   - Chọn **Public**
   - Tích **Add a README file**
   - Bấm **Create repository**.
3. Trong kho vừa tạo: **Add file → Upload files**. Giải nén file zip app, rồi kéo **toàn bộ nội dung bên trong** thư mục (các thư mục `css`, `js`, `data`, `icons` và các file `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll`…) vào trang. Bấm **Commit changes**.
4. Vào **Settings → Pages**. Ở mục *Build and deployment*:
   - Source: **Deploy from a branch**
   - Branch: **main**, thư mục **/ (root)**
   - Bấm **Save**.
5. Đợi 1–2 phút. Địa chỉ app là `https://<tên-tài-khoản>.github.io/tiengnhat/`.

> **Tên tài khoản GitHub** là phần đứng trước `.github.io` trong địa chỉ app, không phải tên email.
> App của bạn ở `https://tuvn89-web.github.io/tiengnhat/`, nên tên tài khoản là **`tuvn89-web`**.
> (Trên GitHub còn có một tài khoản cũ tên `tuvn89`. App, kho tiến độ và token đều phải nằm trong **cùng một tài khoản**: `tuvn89-web`.)

## 2. Cài lên điện thoại và máy tính

- **Android:** mở địa chỉ trên bằng Chrome → menu ⋮ → **Cài đặt ứng dụng** (hoặc **Thêm vào màn hình chính**). Icon chữ 実 đỏ sẽ hiện ngoài màn hình.
- **Máy tính:** mở bằng Chrome hoặc Edge → bấm biểu tượng cài đặt ở cuối thanh địa chỉ.
- Mở app **một lần khi có mạng** để app tải hết dữ liệu. Sau đó dùng được khi không có mạng.

## 3. Đồng bộ tiến độ giữa điện thoại và máy tính

Kiểm tra góc trên phải GitHub đang đăng nhập đúng tài khoản `tuvn89-web` rồi mới làm 3.1 và 3.2.

### 3.1 Tạo kho riêng tư
**+ → New repository**:
- Tên: `tiengnhat-tiendo`
- Chọn **Private**
- **Phải tích Add a README file** (kho trống thì app không ghi được).

### 3.2 Tạo token (chìa khóa chỉ mở được đúng kho này)
1. Ảnh đại diện góc phải → **Settings** → **Developer settings** (cuối menu trái) → **Personal access tokens → Fine-grained tokens** → **Generate new token**.
2. Điền:
   - Token name: `tiengnhat`
   - Expiration: chọn thời hạn dài nhất cho phép. Khi token hết hạn thì tạo token mới và dán lại.
   - Repository access: **Only select repositories** → chọn **tiengnhat-tiendo**.
   - Permissions → Repository permissions → **Contents: Read and write**. Các quyền khác để nguyên.
3. Bấm **Generate token** và **sao chép ngay** (GitHub chỉ hiện một lần).

### 3.3 Dán vào app
App → **Dữ liệu** → **Đồng bộ qua GitHub**:
- Tên tài khoản GitHub: app **tự điền** `tuvn89-web` theo địa chỉ app, để nguyên.
- Tên kho: `tiengnhat-tiendo` (dán cả đường link của kho cũng được).
- Token: dán token vừa sao chép. Tích **Hiện token để soát** để thấy đã dán đủ chưa (token bắt đầu bằng `github_pat_`).

Bấm **Kiểm tra kết nối**. Thấy toàn dấu ✓ xanh thì bấm **Đồng bộ ngay**. Ô xanh lá phía trên sẽ ghi *Máy này đang lưu: tài khoản tuvn89-web, kho tiengnhat-tiendo, token github_pat_…xxxx*. Thấy dòng đó là máy đã lưu đủ.

**Máy thứ hai: không cần chép token, dùng mã QR.**
1. Trên máy đã đồng bộ được (thường là máy tính): **Dữ liệu → Chuyển sang máy khác**. Màn hình hiện một mã QR.
2. Trên điện thoại: mở **Camera** (hoặc Google Lens), hướng vào mã, bấm đường link hiện ra.
3. App mở lên, tự điền cài đặt và tự đồng bộ.

Không quét được thì bấm **Sao chép đường link**, gửi cho chính mình qua Zalo "Cloud của tôi", rồi mở link đó trên điện thoại. Mã QR và đường link có chứa token, nên không gửi cho người khác.

Nếu đã mất token (GitHub chỉ hiện một lần), tạo token mới theo 3.2 rồi dán lại trên một máy, sau đó dùng mã QR cho máy kia.

Từ đó app tự đồng bộ khi mở app, sau mỗi lượt học, khi có mạng trở lại và khi thoát app. Học offline cứ học, có mạng app tự gộp. Hai máy cùng học một từ thì lần học sau cùng được giữ.

**An toàn:** token chỉ có quyền trên kho tiến độ, không đụng được gì khác. Mất điện thoại → vào GitHub xoá token đó đi là xong.

### 3.4 Khi đồng bộ báo lỗi
Bấm **Kiểm tra kết nối**. App kiểm từng bước và hiện danh sách:
- ✓ xanh: bước đó ổn.
- ! vàng: lưu ý, hoặc app đã tự sửa (ví dụ ghi nhầm `tuvn89` → app tự đổi thành `tuvn89-web`).
- ✕ đỏ: chỗ phải sửa, kèm cách sửa.

Trang **Dữ liệu** không có nút **Kiểm tra kết nối**? Máy đang chạy bản app cũ. Xem mục 6 để lên bản mới.

| App báo | Cách sửa |
|---|---|
| Máy này chưa lưu token / Máy này còn thiếu: … | Dán token rồi bấm Đồng bộ ngay, hoặc quét mã QR từ máy đã cài xong. |
| Token đang bị dán vào ô tên kho | Ô tên kho chỉ ghi `tiengnhat-tiendo`; token dán vào ô Token. |
| Token sai hoặc đã hết hạn | Tạo token mới (3.2) rồi dán lại. |
| Token thuộc tài khoản A, còn ô tên tài khoản đang ghi B | Kho tiến độ và token phải cùng một tài khoản. Tạo lại kho hoặc token trong tài khoản `tuvn89-web`. |
| Không thấy kho … | Kiểm tra tên kho đúng từng chữ; sửa token để chọn đúng kho này ở *Only select repositories*. |
| Token chỉ có quyền đọc | Sửa token: Permissions → Contents → **Read and write**. |
| Kho đang trống | Trong kho bấm **Add file → Create new file**, đặt tên `README.md`, bấm Commit. |

## 4. Thêm dữ liệu mới từ skill `jp-v01-data`

Skill giao các file gói `.json` và một file `manifest.json` mới.

- **Cách chính (mọi máy đều có):**
  1. Kho `tiengnhat` → thư mục `data/packs` → **Add file → Upload files** → kéo các file gói vào → **Commit**.
  2. Vào thư mục `data` → **Add file → Upload files** → kéo `manifest.json` mới vào (ghi đè file cũ) → **Commit**.
  3. Đợi 1–2 phút, mở app khi có mạng là có gói mới.
- **Cách nhanh (thử trên một máy):** app → **Dữ liệu → Nhập gói từ skill** → chọn file. Gói nhập kiểu này cũng đi theo đồng bộ sang máy kia.

Muốn skill sửa từ sai, làm tiếp mà không trùng từ cũ, hoặc làm thẻ cho các chữ Hán còn thiếu: app → **Dữ liệu → Tải file gửi skill**, rồi gửi file đó cho Claude kèm yêu cầu (ví dụ "làm thẻ chữ Hán cho 25 chữ còn thiếu").

## 5. Giọng đọc tiếng Nhật (để nghe phát âm, chơi kiểu "Nghe → nghĩa")

- **Android:** Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Dịch vụ của Google → Cài đặt → Cài đặt dữ liệu giọng nói → **Tiếng Nhật**. Tên mục có thể khác chút tùy hãng điện thoại.
- **Windows:** Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → **Tiếng Nhật**.

Xong thì mở lại app. Trong **Cài đặt → Giọng đọc** có nút **Nghe thử**.

## 6. Khi có bản app mới

Tải các file mới lên kho `tiengnhat`, ghi đè file cũ:
- **Trên máy tính:** kho `tiengnhat` → **Add file → Upload files** → kéo cả thư mục (`js`, `css`) và các file lẻ (`sw.js`…) vào → **Commit changes**. GitHub tự đặt file vào đúng thư mục và ghi đè bản cũ.
- **Trên điện thoại** (không kéo được thư mục): bấm vào thư mục `js` → **Add file → Upload files** → chọn các file `.js` → Commit. Làm tương tự với `css`. File ở ngoài cùng (`sw.js`) thì tải lên ở trang chính của kho.

Đợi 1–2 phút rồi mở app khi có mạng. App **tự cập nhật** và tải lại trang, hiện thông báo *Đã cập nhật app lên bản mới*. Nếu đang giữa lượt học, app chờ học xong lượt mới tải lại.

**Kiểm tra máy đang chạy bản nào:** **Cài đặt → Máy này → Phiên bản app** (cũng hiện ở cuối thẻ đồng bộ trong trang Dữ liệu). Chưa thấy số mới thì bấm **Kiểm tra bản mới**. Nếu vẫn chưa lên: trên Android, vuốt tắt hẳn app khỏi danh sách ứng dụng gần đây rồi mở lại.

Người sửa code nhớ tăng `VERSION` trong `sw.js` (ví dụ `tnt-v2` → `tnt-v3`), thì máy mới nhận ra có bản mới.

Chỉ thêm hoặc sửa gói dữ liệu thì **không cần** đổi `VERSION`: tăng `pack.version` trong gói là đủ, và skill tự làm việc này.

## 7. Cấu trúc thư mục

```
index.html, manifest.webmanifest, sw.js   khung app, cài đặt PWA, chạy offline
css/app.css                               giao diện
js/                                       mã app (mỗi màn hình một file)
data/manifest.json                        danh mục gói (sinh bằng build_manifest.py của skill)
data/packs/*.json                         các gói từ vựng / ngữ pháp / chữ Hán
icons/                                    biểu tượng app
```

## 8. Các phần học (bản v8)

Thanh dưới cùng (điện thoại) hoặc cột trái (máy tính): **Trang chủ · Luyện tập · Chữ Hán · Ngữ pháp · Kho từ**. Dữ liệu và Cài đặt ở góc trên.

- **Trang chủ:** nút **Ôn hỗn hợp hôm nay** gom mọi thứ đến hạn ôn (từ, chữ Hán, mẫu ngữ pháp, thể động từ) vào một lượt; từng loại riêng vẫn có nút ở dưới. Nút học từ mới, **Chữ Hán hôm nay** kèm câu lục bát, bảng tiến độ.
- **Học từ mới:** xem thẻ từng từ rồi bấm **Đã học** (sang từ tiếp, ôn lần đầu vào ngày mai), **Biết rồi** (từ đã biết, tính là thuộc) hoặc **Để sau**. Không kiểm tra ngay. Nút ← (hoặc vuốt sang phải) để lật lại thẻ trước. Cuối lượt có nút "Kiểm tra nhanh" nếu muốn — không ảnh hưởng lịch ôn. Không giới hạn số từ mỗi ngày.
- **Thẻ từ:** thể ます đứng cạnh thể từ điển; cụm hay đi kèm; 3–5 ví dụ có nhãn tình huống; đồng nghĩa, trái nghĩa, dễ nhầm, đồng âm, từ cùng gốc (chạm để mở); động từ có bảng chia thể kèm nghĩa (thể chưa học để trong mục thu gọn), cặp tự – tha, kính ngữ, câu theo thể; tính từ có bảng các dạng (không ~, đã ~, ~さ, ~そう, ~すぎる…); danh từ có cách đếm (bảng 1–10); phó từ có thang mức độ; câu chào có cách đáp; từ katakana có từ gốc.
- **Luyện tập** (trang các dạng bài) — mặc định chỉ dùng **từ đã học**, đổi được sang Học hôm nay / 7 ngày qua / Đến hạn ôn / Gắn sao / Hay sai / Tất cả:
  - Trắc nghiệm, Ghép 6 cặp (thêm kiểu: thể từ điển – thể ます, tự – tha, trái nghĩa, chữ Hán – âm Hán Việt).
  - **Ghép câu từ ví dụ:** sắp xếp mảnh thành câu ví dụ của từ đã học.
  - **Ghép câu theo ngữ pháp:** chọn mẫu, app ghép với cụm động từ đã học thành câu mới có câu dịch.
  - **Thể động từ trong câu:** câu ngẫu nhiên ở các thể bạn đánh dấu đã học (bị động, sai khiến, sai khiến bị động, khả năng…). Chạm vào thể để bật / tắt — danh sách "thể đã học" đồng bộ sang mọi máy.
  - **Tính từ trong câu**, **Chia động từ**, **Đếm số** (trợ số từ có âm biến), Bài tập ngữ pháp, Thi thử.
- **Thi thử:** chọn đáp án rồi bấm **Tiếp tục** mới sang câu sau; nút ← để quay lại câu cũ đổi đáp án; **Để sau** để bỏ qua tạm; mục **Danh sách câu** để nhảy tới câu bất kỳ. Câu cuối là nút **Nộp bài** (còn câu chưa làm thì app hỏi lại). Kết quả hiện cả đáp án bạn đã chọn.
- **Chữ Hán:** chạm vào chữ kanji bất kỳ để mở thẻ chữ (câu lục bát, bộ phận, âm On/Kun…); tab Ôn chữ Hán.
- **Furigana:** mọi chữ kanji đều có furigana, trừ phần học và kiểm tra Hán (thẻ chữ, Ôn chữ Hán, câu hỏi đọc kanji, ghép kana – kanji, bài Đếm số).

## 9. Gói nhập tay và gói trên kho trùng tên

Nếu cùng một gói vừa nhập tay trong app (Dữ liệu → Nhập gói) vừa có trên kho GitHub, app dùng bản có **số phiên bản cao hơn**; bằng nhau thì dùng bản nhập tay. Một từ có ở hai gói khác tên thì bản trên kho được dùng. Trang Dữ liệu liệt kê các gói đang bị bỏ qua và có nút **Xoá các gói nhập tay đã có trên kho**.

Khi skill giao gói mới: luôn thay **cả file `data/manifest.json`** bằng file skill giao (file có mã kiểm tra nội dung từng gói, nhờ vậy máy nào cũng tải đúng bản mới). Không dán thêm dòng vào manifest cũ.

## 10. Bản v6 (11/10/2026): gộp 29 gói N5 vào kho

**Cách tải lên:** giải nén `capnhat-v6.zip`, kéo **toàn bộ nội dung** (thư mục `css`, `js`, `data` và file `sw.js`, `HUONG-DAN.md`) vào kho `tiengnhat` → **Commit changes**. Ghi đè hết, kể cả khi chưa tải bản v5 (gói v6 đã gồm mọi thay đổi của v5).

Sau đó, nếu trong `data/packs` trên GitHub còn file **`jlpt-n5-dongtu-01.json`** thì xoá đi (bấm vào file → dấu ⋯ → **Delete file** → Commit). Không xoá cũng không sao: manifest mới không còn gói này nên app bỏ qua.

**Trên máy đã nhập tay 29 gói từ trước:** mở app khi có mạng. Bản trên kho là phiên bản 2, cao hơn bản nhập tay (phiên bản 1), nên app tự dùng bản trên kho. Vào **Dữ liệu** bấm **Xoá 29 gói nhập tay đã có trên kho** cho gọn. Tiến độ học giữ nguyên (mã từ không đổi).

**Kho sau khi gộp:** 36 gói, 877 mục (781 từ, 44 mẫu ngữ pháp, 24 thẻ chữ Hán, 28 câu thực chiến).
- 88 động từ N5 đủ cụm hay đi kèm, 3–5 câu ví dụ có nhãn tình huống, cặp tự – tha, kính ngữ; động từ hay gặp có câu theo thể (bị động, sai khiến, khả năng).
- 71 tính từ N5 có 3 ví dụ, trái nghĩa, từ cùng gốc, danh từ hay đi kèm để app đặt câu luyện tính từ.
- Danh từ đếm được có cách đếm; câu chào có cách đáp; từ katakana có từ gốc.
- Mọi chữ Hán trong phần giải thích, ghi chú, lỗi hay gặp đều đã có furigana.
- Mẫu trùng: 〜てもいいですか, 〜てはいけません về gói `nguphap-n5-08`; 〜なければなりません gộp vào 〜なければならない ở gói `nguphap-n5-12` (giữ nguyên dữ liệu bài tập). Nếu đã học mẫu 〜なければなりません thì mẫu này về lại trạng thái chưa học.
- Sửa lỗi app: tính từ な viết toàn chữ Hán (暇, 簡単, 大丈夫…) nay có furigana trong bảng các dạng và bài Tính từ trong câu.

## 11. Bản v7 (12/10/2026): nút quay lại sau khi học xong / thi xong

**Cách tải lên:** giải nén `capnhat-v7.zip`, kéo toàn bộ nội dung vào kho `tiengnhat` → Commit. Gói này đã gồm cả v5, v6.

- Màn kết quả có nút **← Về [trang trước]** — về đúng chỗ đã vào bài (ví dụ "← Về Thể động từ trong câu", "← Về 〜てください", "← Về Thi thử"). Vào từ Trang chủ thì nút là "← Về Trang chủ". "Về trang chủ" còn lại dạng chữ nhỏ ở cuối.
- Trên đầu màn kết quả có dòng chỉ đường, ví dụ *Luyện tập › Thể động từ trong câu* (chạm được).
- Quay lại trang chọn bài thì các lựa chọn lần trước vẫn giữ (nguồn từ, số câu, dạng bài, cấp độ thi thử).
- Nút ✕ khi chưa làm câu nào: về trang trước.
- **Nút Back của điện thoại:** đang làm bài thì app hỏi "Dừng lượt này?"; ở màn kết quả thì về trang trước khi vào bài.
- Màn kết quả gợi ý một bước tiếp: học xong từ mới → **Ghép câu với từ vừa học**; còn mục đến hạn → **Ôn hỗn hợp hôm nay**; hết thì → **Học từ mới**.
- Thi thử xong có nút **Luyện lại các câu sai (không tính điểm)** — không làm thay đổi lịch ôn.
- Các bài luyện có hàng **Dạng bài khác** để chuyển bài ngay.

## 12. Bản v8 (12/10/2026): mỗi câu trắc nghiệm chỉ một đáp án đúng + ngữ pháp N4

**Cách tải lên:** giải nén `capnhat-v8.zip`, kéo toàn bộ nội dung vào kho `tiengnhat` → Commit. Gói này đã gồm v5–v7. Thay cả `data/manifest.json`.

**Sửa đáp án mơ hồ** (trước đây có câu hai đáp án cùng đúng: 一日 いちにち / ついたち, 半 / 半分, 掃除 / 片付け…):
- Đáp án nhiễu không còn là từ "cũng đúng": bỏ từ cùng chữ viết (bài Kanji → cách đọc), từ có nghĩa con trùng (Việt ↔ Nhật, Ghép cặp, Ôn hỗn hợp, Thi thử), từ đồng âm (Nghe → nghĩa, ví dụ 暑い / 熱い).
- Bài **Kanji → cách đọc**: chữ có nhiều cách đọc thì hiện thêm nghĩa nhỏ dưới chữ, ví dụ 一日 kèm *ngày mùng 1 (trong tháng)*.
- Nghĩa tiếng Việt của 67 từ N5 được viết lại có chú thích phân biệt, ví dụ 半 *rưỡi (giờ rưỡi); nửa (trong từ ghép)* — 半分 *một nửa (chia đôi)*; 掃除 *quét dọn, lau chùi (làm cho sạch)* — 片付け *dọn gọn, cất đồ (về chỗ)*. Từ Kansai và từ chuẩn tương ứng (ええ / いい, おおきに / ありがとうございます…) được đánh dấu đồng nghĩa nên không làm đáp án của nhau. Mã từ giữ nguyên — tiến độ học không mất.

**Ngữ pháp N4 đủ 67 mẫu** (27 gói `nguphap-n4-01` … `nguphap-n4-27`): thể khả năng, ý chí, そうだ, らしい, たら・ば・と・なら, ても・のに, ために・ように, てしまう・ておく・てある・てみる, cho – nhận, sai khiến, bị động, kính ngữ, mệnh lệnh – cấm, すぎる, やすい・にくい, かどうか, はずだ, ところだ, までに, ことにする・ことになる, 場合は, ので, かもしれない, ほうがいい, ばかり, しか〜ない, まま, ていく・てくる, という, ほど〜ない, がする… Mỗi mẫu có giải thích 3–4 đoạn, 10 câu ví dụ (đời sống, xưởng, thủ tục, hội thoại), đủ dữ liệu cho 10 dạng bài luyện.

**Kho sau bản này:** 63 gói, 944 mục (781 từ, 111 mẫu ngữ pháp, 24 thẻ chữ Hán, 28 câu thực chiến).

## 13. Đợt dữ liệu N4 – từ vựng (12/10/2026)

**Cách tải lên:** giải nén `capnhat-dulieu-n4.zip`, kéo thư mục `data` vào kho `tiengnhat` (ghi đè) → Commit. App không đổi (vẫn v8), chỉ thêm dữ liệu.

- **20 gói từ vựng N4** `jlpt-n4-01` … `jlpt-n4-20` (≈ 590 từ mới, cả kho có 661 từ N4): 160 động từ (cặp tự – tha, kính ngữ, cho – nhận; mỗi động từ 3 câu ví dụ ở đời sống / xưởng / thủ tục, cụm hay đi kèm, câu bị động – sai khiến – khả năng), 42 tính từ (trái nghĩa, từ cùng gốc), phó từ – từ nối, danh từ theo chủ đề (con người, công việc, xã hội, học tập, nhà cửa, ăn uống – mua sắm, thiên nhiên – nơi chốn, cơ thể – cảm xúc, thời gian – vị trí).
- Nghĩa tiếng Việt của từ mới đều có chú thích phân biệt; thêm 27 từ N5 được viết rõ nghĩa hơn để không trùng với từ N4 (ví dụ 止まる *dừng, ngừng (tự dừng)* — 止める *dừng lại (máy, xe — làm cho dừng)*; 行く *đi (đến nơi nào đó)* — 乗る *lên, đi (xe, tàu)*). Từ kính ngữ (いらっしゃる, 召し上がる, 参る…) được đánh dấu đồng nghĩa với từ thường nên không làm đáp án của nhau.
- Kho sau đợt này: 83 gói, 1.530 mục (1.367 từ, 111 mẫu ngữ pháp, 24 thẻ chữ Hán, 28 câu thực chiến).

## 14. Đợt dữ liệu N4 – chủ đề, câu thực chiến, chữ Hán (12/10/2026)

**Cách tải lên:** như mục 13 — kéo thư mục `data` vào kho, ghi đè, Commit.

- `xuong-02` (37 từ): đồ bảo hộ, 5S, an toàn (dự đoán nguy hiểm KY, lối thoát hiểm, dừng khẩn cấp, tai nạn lao động), phiếu lương (lương cơ bản, tiền tăng ca, phụ cấp, khấu trừ, lương thực nhận), chấm công.
- `thuysan-03` (32 từ): HACCP, mối nguy (ký sinh trùng, vi khuẩn, Norovirus), hồ sơ – kiểm tra nhiệt độ, chữ trên nhãn (nguyên liệu, xuất xứ, khối lượng tịnh, cách bảo quản, số lô, dị ứng), máy móc.
- `doisong-01` (31 từ): phân loại rác, ngân hàng – chuyển tiền, bệnh viện – hiệu thuốc, phòng chống thiên tai.
- `cau-thutuc-01` (20 câu): quầy tòa thị chính, ngân hàng, bệnh viện — câu cần nói và câu nhân viên hay hỏi.
- `cau-xuong-02` (20 câu): gọi điện xin nghỉ, báo đến muộn, báo xong việc, báo lỗi, báo máy hỏng, xin nghỉ phép; câu tổ trưởng nói giọng Kansai kèm tiếng chuẩn.
- `chuhan-02` (25 thẻ chữ Hán): 25 chữ xuất hiện nhiều nhất trong kho (物 大 会 入 事 一 学 出 場 下 所 業 見 今 度 本 中 上 番 子 年 長 間 分 合), mỗi chữ một câu lục bát nhớ mặt chữ.
- Kho sau đợt này: 89 gói, 1.695 mục.

## 15. Đợt dữ liệu N3 – ngữ pháp (12/10/2026)

**Cách tải lên:** như mục 13 — kéo thư mục `data` vào kho, ghi đè, Commit. Không cần cập nhật mã app.

- 35 gói `nguphap-n3-01` … `nguphap-n3-35`, 105 mẫu ngữ pháp N3. Mỗi mẫu đủ 7 phần giải thích, 10 câu ví dụ (4 đời sống · 3 xưởng · 2 thủ tục · 1 hội thoại) và dữ liệu cho cả 10 dạng bài luyện (sắp xếp câu, câu ★, tìm chỗ sai, chọn cách nói, đổi lối nói Kansai → chuẩn…).
- Nhóm mẫu: thời điểm (うちに, 最中に, たとたん…), xu hướng (ばかりだ, 一方だ, つつある), nguyên nhân (おかげで, せいで, によって), kết luận (わけだ, わけがない, わけにはいかない), giả định (としたら, さえ〜ば, ばよかった), nhượng bộ (くせに, ながらも, としても), đối tượng (にとって, に対して, に関して, として), mức độ (ほど, ば〜ほど), nhấn mạnh (さえ, こそ, まで), hậu tố (っぽい, がち, 気味, だらけ, たて, 向け, 的, っぱなし), kính ngữ nâng cao (させられる, させていただく, お〜いただく, でございます) và khẩu ngữ xưởng (なきゃ, ちゃだめ, とく・てる).
- Sửa cách đọc trong 8 gói cũ (tăng phiên bản lên 2): 一回 → いっかい, 一か月 → いっかげつ, 一日で → いちにち (`jlpt-n4-05/06/09/15`, `nguphap-n4-08/10/12`, `xuong-02`).
- Kho sau đợt này: 124 gói, 1.800 mục.

## 16. Bản v9 (12/10/2026): câu có nhiều thứ tự đúng, từ cùng chữ viết không còn làm đáp án nhiễu

**Lưu ý:** trang web đang chạy **bản v7** — gói mã `capnhat-v8.zip` chưa được tải lên, nên các sửa lỗi đáp án mơ hồ của v8 chưa có tác dụng. Gói `capnhat-v9.zip` đã gồm v8 + v9 + toàn bộ dữ liệu đến hết ngữ pháp N3.

**Cách tải lên:** giải nén `capnhat-v9.zip`, kéo **toàn bộ** nội dung (các thư mục `js`, `css`, `data`, file `sw.js`, `index.html`, `HUONG-DAN.md`…) vào kho `tiengnhat` → ghi đè → Commit. Đợi trang Deployments báo xong (khoảng 1 phút), rồi mở app và tải lại trang một lần (máy tính: Ctrl + Shift + R; điện thoại: đóng hẳn app rồi mở lại).

**Kiểm tra đã lên đúng bản:** Cài đặt → cuối trang ghi **v9 · 12/10/2026**. Vào Kho từ, tìm 一日: nghĩa phải là *một ngày, cả ngày (khoảng thời gian)* và *ngày mùng 1 (trong tháng)*. Nếu vẫn thấy nghĩa cũ (*một ngày; cả ngày*) thì máy đang dùng gói cũ: vào Dữ liệu → bấm **Xoá các gói nhập tay đã có trên kho** (mục 9), rồi tải lại trang.

**Sửa lỗi sắp xếp câu (Ghép câu, Sắp xếp câu, Ghép câu Việt → Nhật):** câu có nhiều thứ tự đúng giờ được chấm đúng. Ví dụ 野菜を 水で よく洗ってください và 水で 野菜を よく洗ってください đều đúng — app nhận ra các cụm "danh từ + を / に / で / へ / が / から / まで / より" đứng liền nhau thì đổi chỗ cho nhau được (trừ cụm có は, cụm thuộc thành ngữ như 気をつける, 間に合う, 〜になる, và cụm nằm trong mệnh đề). Sau khi trả lời, app hiện câu mẫu **và các thứ tự khác cũng đúng** ("Hoặc: …"). Bài **Câu ★** không đặt ô ★ vào những mảnh đổi chỗ được, nên mỗi câu chỉ có một đáp án.

**Sửa lỗi hiển thị:** câu ví dụ ngữ pháp có phần tô đậm kết thúc bằng chữ Hán (〜方[かた], 〜一方[いっぽう], 〜次第[しだい]…) từng hiện thừa dấu "]" sau chỗ trống trong bài Điền chỗ trống — đã sửa (60 câu). Sau khi trả lời, phần giải thích tự cuộn lên để không bị nút **Tiếp** che.

**Sửa lỗi:** câu hỏi *Chọn nghĩa* của 一日 (いちにち) từng có đáp án nhiễu *ngày mùng 1* — đúng là nghĩa của 一日 đọc ついたち, nên nhìn mặt chữ rất dễ chọn nhầm. Từ bản v9, những từ **cùng chữ viết** (一日 いちにち / ついたち, 月 つき / がつ, 人 ひと / じん / にん, 本 sách / 本 đếm đồ dài, 十 じゅう / とお, 君 きみ / くん, 空く すく / あく) không bao giờ làm đáp án nhiễu cho nhau ở **mọi** kiểu câu hỏi: Chọn nghĩa, Chọn từ tiếng Nhật, Nghe → nghĩa, Kanji → cách đọc, Ôn hỗn hợp, Thi thử.

## 17. Bản v10 (12/10/2026): kiểm tra trình độ, lộ trình, kana, hướng dẫn học (đợt 5a)

**Cách tải lên:** giải nén `capnhat-v10.zip`, kéo **toàn bộ** nội dung vào kho `tiengnhat` → ghi đè → Commit (gói đã gồm v8, v9). Có 4 file mã mới: `js/level.js`, `js/roadmap.js`, `js/kana.js`, `js/guides.js` — nhớ tải cả thư mục `js`. Kiểm tra: Cài đặt → cuối trang ghi **v10 · 12/10/2026**.

**Màn Bắt đầu** (`Trang chủ → Bắt đầu`, hiện một lần; đổi lại ở Lộ trình → Đổi): 3 câu — mục tiêu (N5 · N4 · N3 / 特定技能2号 · N2), mỗi ngày học 10 / 20 / 40 phút, đang ở đâu (chưa biết chữ · biết kana · khoảng N5 · khoảng N4). Chọn "khoảng N5/N4" thì app mời làm Xếp lớp nhanh. Các lựa chọn đồng bộ sang mọi máy.

**Kế hoạch hôm nay** (Trang chủ, thay danh sách cũ): ôn đến hạn → X từ mới → 1 mẫu ngữ pháp mới (10 phút: 3 ngày một mẫu; 20 phút: 2 ngày; 40 phút: mỗi ngày) → một bài luyện thể động từ → chữ Hán mới. Việc xong có dấu ✓, việc đầu tiên chưa xong là nút xanh. Dưới cùng là **dự báo**: theo nhịp học 14 ngày qua (chưa có thì theo số phút đã chọn), bao giờ học hết khối lượng cấp mục tiêu (ước tính theo số từ / mẫu / chữ Hán mỗi cấp). "Ôn riêng từng loại" (từ, chữ Hán, mẫu) nằm trong mục thu gọn.

**Kiểm tra trình độ** (`Trang chủ → Kiểm tra trình độ`):
- **Xếp lớp nhanh:** bắt đầu từ N5, mỗi cấp 12 câu (từ vựng, đọc chữ Hán để trần, thẻ chữ Hán, ngữ pháp). Đạt từ 70% thì hỏi có làm tiếp cấp sau không; dưới 70% thì dừng. Không tính giờ. Kết quả: "Trình độ ước lượng N4" + điểm từng cấp.
- **Thi vượt cấp:** một cấp, khoảng 55 câu xếp theo phần như JLPT — đọc chữ Hán (8), từ vựng (10), thẻ chữ Hán (4), ngữ pháp (18), đọc hiểu câu ngắn (10), nghe (5, khi máy có giọng đọc). Đồng hồ 40 giây/câu, tắt được. Đạt từ 70% = qua chặng trong Lộ trình.
- **Kiểm tra theo gói:** gói đã học từ 80% có bài 10 câu riêng (tính vào lịch ôn như bài thường). Gói chưa kiểm tra lần nào đứng trước.
- **Màn kết quả:** điểm theo kỹ năng và theo chủ đề (đời sống, xưởng & thủy sản, thủ tục, hội thoại), nút **Học ngay các từ làm sai**, **Luyện các mẫu làm sai**, danh sách câu sai.
- **Đổi tiến độ** (chỉ khi bấm **Áp dụng**; có bảng tóm tắt số mục trước):

| Điểm của cấp | Câu đúng | Câu sai | Mục không có trong đề |
|---|---|---|---|
| từ 85% | đã thuộc | đang học (ôn ngày mai) | đã thuộc (ôn kiểm lại sau 16 ngày) |
| 70–84% | đã thuộc | đang học | đã gặp — cần kiểm (hộp 3, ôn sau 4 ngày; đúng 2 lần liền là đã thuộc) |
| dưới 70% | đang học | từ chưa học: xếp đầu hàng Học từ mới | **giữ nguyên** |

  Mục đã thuộc mà làm sai chỉ về "đang học", không bao giờ về "chưa học". Câu bỏ trống không tính là sai khi đổi tiến độ. Mặc định **không** tự đánh dấu từ chuyên ngành (xưởng, thủy sản, thủ tục, Kansai) chưa có trong đề — bật ô này trên màn kết quả nếu muốn. Ngưỡng 85% / 70% đổi được ở mục **Cách xử lý kết quả** (80/85/90 và 60/70/75).
- **Hoàn tác** trong 7 ngày (banner trên đầu trang Kiểm tra trình độ, trên máy đã áp dụng). **Lịch sử kiểm tra** đồng bộ giữa các máy, có đường tiến bộ. Nhắc kiểm tra lại sau 2 tuần (tắt được).

**Lộ trình** (`Trang chủ → Lộ trình`): Chặng 0 Kana → N5 → N4 → N3 → N2. Mỗi chặng có thanh tiến độ, **4 gói học tiếp** (từ vựng JLPT và ngữ pháp đan xen theo số gói, rồi gói chủ đề, chữ Hán) với nút Học, và nút Thi vượt cấp. Chặng đã qua: Thi vượt cấp đạt từ 70%, hoặc Xếp lớp đạt từ 85% ở cấp đó. Chặng sau mờ đi nhưng vẫn mở được.

**Chặng 0 — Kana** (`Lộ trình → Mở bảng kana`): bảng hiragana / katakana (âm cơ bản, thêm dấu ゛゜, âm ghép ゃゅょ) — chạm chữ để nghe, màu cho biết chữ đã thuộc. Luyện 3 kiểu: nhìn chữ → cách đọc, cách đọc → chữ, nghe → chữ; đáp án nhiễu ưu tiên chữ trông giống (ぬ/め, シ/ツ, ソ/ン…), không đặt hai chữ đọc giống nhau (じ/ぢ, お/を) cạnh nhau. Đúng 3 lần liền = thuộc; qua chặng khi thuộc 90% chữ cơ bản (hoặc đánh dấu "đã đọc thông kana"; ai đã học từ 20 từ trở lên được tính là biết kana).

**Hướng dẫn học** (`Trang chủ → Hướng dẫn học`): 6 bài cho người mới (lặp lại ngắt quãng, nút Đã học / Biết rồi, furigana & Hán Việt, ôn mỗi ngày, luyện nghe, nhiều máy), 4 bài theo cấp N5–N2 (khối lượng, thời gian, lỗi người Việt hay mắc, cấu trúc đề và điểm đỗ JLPT theo jlpt.jp), 3 bài theo mục tiêu (特定技能2号 ngành thủy sản theo trang 出入国在留管理庁 ngày 4/9/2026, gia hạn visa & giấy tờ thuế, sống ở Nhật).

## 18. Bản v11 (12/10/2026): luyện thể mở rộng, ô gõ tiếng Nhật (đợt 5b) + sửa đáp án nghĩa trùng

**Cách tải lên:** giải nén `capnhat-v11.zip`, kéo **toàn bộ** nội dung vào kho `tiengnhat` → ghi đè → Commit (gói đã gồm v8, v9, v10). File mã mới: `js/forms.js`, `js/romaji.js`, `js/fstat.js`. Thay cả `data/manifest.json` (gói `kansai-01` lên phiên bản 4). Kiểm tra: Cài đặt → cuối trang ghi **v11 · 12/10/2026**.

**Sửa lỗi "hai đáp án nghĩa giống nhau"** (ví dụ ほかす: *vứt đi* và 捨てる: *vứt, bỏ đi* cùng hiện): từ Kansai và từ chuẩn tương ứng (ほかす = 捨てる, あかん = だめ, なんぼ = いくら, なおす = 片付ける…) không còn làm đáp án nhiễu của nhau ở mọi bài, kể cả Ghép cặp; nghĩa chỉ khác nhau chữ "đi" / "lên" ở cuối (*vứt đi* = *vứt*, *nhanh lên* = *nhanh*) được coi là trùng. Gói `kansai-01` thêm liên kết đồng nghĩa nên sửa được cả trên máy chưa cập nhật mã app.

**Luyện thể** (`Luyện tập → Luyện thể`, hoặc nút **Luyện thể này với động từ của tôi** trên trang mẫu ngữ pháp gắn với thể: 〜てしまう, 受身形, 〜させられる, 〜なきゃ, 〜ておく, 〜ながら… — 101 mẫu có nút này):
- **Lấy từ** chọn được nhiều: Đang học · Đã thuộc · Hay sai · Tất cả.
- **Động từ**, 9 dạng: Gõ thể (書く → bị động → gõ かかれる) · Chọn thể · Chuỗi biến đổi (書く → 書きます → 書いて → 書かない → 書いた → …, sai bước nào hiện luật bước đó) · Nhận diện ngược (thấy 書かされた → chọn "sai khiến bị động · quá khứ"; mặt chữ trùng như 食べられる thì đáp án ghi cả "khả năng / bị động") · Nghe → chọn thể (khi máy có giọng đọc) · Đổi câu (thường ↔ lịch sự; khẩu ngữ ↔ chuẩn: ちゃう ↔ てしまう, とく ↔ ておく, てる ↔ ている, なきゃ ↔ なければならない, ちゃだめ ↔ てはいけない; câu thường → câu sai khiến "tổ trưởng bắt tôi…" → câu sai khiến bị động) · Thể trong câu (chọn hoặc gõ động từ đã chia trong khung câu; mẫu ngữ pháp có khuôn riêng thì ghép thêm câu theo khuôn đó) · Cặp tự – tha (お湯＿＿ → が沸く / を沸かす) · Kính ngữ (行く → いらっしゃる / 参る; khuôn お〜になる / お〜する; bẫy お行きになる, お見になる).
- **Thể mới** thêm vào máy chia (37 thể, trước là 18): 〜そう, 〜すぎる, 〜やすい / 〜にくい, 〜ながら, 〜方, 〜たり, 〜ずに, 〜てしまう / 〜ちゃう, 〜ておく / 〜とく, 〜てる, 〜なければ / 〜なきゃ, 〜てはいけない / 〜ちゃだめ, 〜させてください, sai khiến rút gọn (書かす). Thẻ từ của động từ hiện đủ các thể này; bài Chia động từ và Thể động từ trong câu chọn được các thể mới.
- **Tính từ**: gõ / chọn 14 dạng (thêm 〜くする / 〜にする và 〜み như 重み, 痛み, 甘み), có bẫy cho người Việt: きれい, 嫌い là tính từ な (không phải きれかった), いい → よかった (không phải いかった), 高いだった / 高いでした là sai.
- **Danh từ + だ**: だ, です, じゃない, だった, じゃなかった, でした, で, なら, なので, なのに, の (gõ じゃない hay ではない đều được).
- **Phó từ, katakana**: phó từ và từ tượng thanh điền vào câu ví dụ (theo nghĩa câu); gõ katakana từ gốc tiếng Anh (bier → ビール).
- **60 giây tốc độ**: đúng được bao nhiêu thể trong 60 giây, lưu kỷ lục (đồng bộ). **Bảng chia tự kiểm**: bảng các thể của một động từ bị che, chạm để lật rồi tự chấm Biết / Chưa.
- **Điểm theo thể** (bảng nhiệt thể × nhóm 1 / 2 / 3): mọi bài chia thể đều ghi đúng / sai. Thể nào làm từ 5 lần mà đúng dưới 70% thì **tự vào Ôn hỗn hợp hôm nay** ("Thể hay sai — …"). Điểm đồng bộ giữa các máy.

**Ô gõ tiếng Nhật** (dùng ở Gõ thể, Đếm số, Kana, katakana): gõ bằng bàn phím tiếng Nhật của máy, hoặc bật **gõ romaji tự đổi sang kana** (mặc định bật; Cài đặt → Ô gõ tiếng Nhật): kakareru → かかれる, kitte → きって, shinbun / shimbun → しんぶん, onna → おんな, chữ IN HOA → katakana (KO-HI- → コーヒー). Bàn phím tiếng Việt kiểu Telex sẽ tự đổi chữ (aa → â) — khi gõ romaji hãy chuyển sang bàn phím tiếng Anh. Chấm đúng nếu khớp kana hoặc chữ Hán; app chấm sai mà bạn chắc mình đúng thì bấm **Tôi gõ đúng — tính là đúng**.
- **Đếm số** có thêm cách trả lời **Tự gõ** (7個 → ななこ). **Kana** có thêm kiểu **Nhìn chữ → gõ romaji** (chấp nhận cả kiểu si, ti, tu).

## 19. Bản v12 (12/10/2026): luyện dịch theo câu (đợt 5c)

**Cách tải lên:** giải nén `capnhat-v12.zip`, kéo **toàn bộ** nội dung vào kho `tiengnhat` → ghi đè → Commit (đã gồm v8–v11). File mã mới: `js/dich.js`. Kiểm tra: Cài đặt → cuối trang ghi **v12 · 12/10/2026**.

**Luyện dịch** (`Luyện tập → Luyện dịch theo câu`): dùng 4.854 câu ví dụ có sẵn trong kho (câu của từ vựng và câu của mẫu ngữ pháp).
- **Chiều**: Nhật → Việt, Việt → Nhật, trộn.
- **Cách làm**:
  - **Chọn câu đúng** — Nhật → Việt: câu nhiễu là các câu khác của cùng từ / cùng mẫu (phải hiểu cả câu mới chọn đúng); Việt → Nhật: câu nhiễu sai đúng chỗ dễ sai — phần ngữ pháp chia sai (lấy từ dữ liệu lỗi hay gặp) hoặc từ chính bị thay bằng từ dễ nhầm cùng loại (冷凍 ↔ 冷蔵, 喫茶店 ↔ 大学).
  - **Tự gõ** — app chấm ngay, không cần mạng.
  - **Nghe** — khi máy có giọng đọc.
  - **Ghép mảnh** — nhận mọi thứ tự đúng.
- **Lọc câu**: đến cấp (N5 / N4 / N3 — chỉ câu từ cấp đó trở xuống); chỉ câu của từ / mẫu đã học; câu chưa dịch / đến hạn ôn / hay sai. Câu ngữ pháp dịch Việt → Nhật có thể hiện "Dùng mẫu: 〜…" làm điều kiện.
- **Cách chấm khi tự gõ:**
  - **Nhật → Việt:** so các từ chính với bản mẫu (gõ thiếu dấu vẫn nhận), đạt khi khớp từ 70% và đúng khẳng định / phủ định. Bản mẫu hiện kèm: từ khớp tô xanh, từ còn thiếu gạch đỏ.
  - **Việt → Nhật:** so cả câu sau khi bỏ dấu câu, khoảng trắng; kana thay chữ Hán được; trợ từ は / へ / を gõ "wa" / "e" / "o" cũng nhận; câu có mảnh đổi chỗ được thì mọi thứ tự đúng đều nhận.
  - Luôn có nút **Tôi dịch đúng — tính là đúng** khi app chấm quá chặt (khác cách nói, dùng từ đồng nghĩa).
- **Câu dịch sai vào lịch ôn** như từ vựng (mỗi câu 2 chiều Nhật → Việt / Việt → Nhật), đồng bộ giữa các máy. Câu đến hạn tự vào **Ôn hỗn hợp hôm nay** và có dòng riêng "Câu dịch đến hạn ôn" ở Trang chủ.
- Kế hoạch hôm nay (từ 20 phút / ngày) xen kẽ: ngày chẵn một bài **Luyện thể**, ngày lẻ một bài **Luyện dịch**.

## 20. Bản v13 (12/10/2026): lộ trình trên Trang chủ, nút "Đã thuộc" khi ôn

**Cách tải lên:** giải nén `capnhat-v13.zip`, kéo **toàn bộ** nội dung vào kho `tiengnhat` → ghi đè → Commit (đã gồm v8–v12). Kiểm tra: Cài đặt → cuối trang ghi **v13 · 12/10/2026**.

- **Lộ trình**: chặng đang học ở trên cùng, rồi các chặng tiếp theo; chặng đã qua (kể cả Chặng 0 — Kana) dồn xuống cuối trang, dưới tiêu đề "Chặng đã qua".
- **Trang chủ** có thẻ **Lộ trình · Chặng …** ngay dưới Kế hoạch hôm nay: tiến độ chặng, 3 gói học tiếp với nút Học, nút Xem cả lộ trình và Thi vượt cấp.
- **Nút "Đã thuộc"** khi ôn: ở Trắc nghiệm, Ôn từ đến hạn, Ôn hỗn hợp, ôn chữ Hán, luyện ngữ pháp, câu dịch — sau khi trả lời, bấm **Đã thuộc** thì mục đó chuyển sang đã thuộc (16 ngày sau hỏi lại một lần) và không bị hỏi lại trong lượt này. Bấm nhầm thì bấm **Hoàn tác** trên thông báo.
- Tên gói có chữ Hán (ví dụ "Ngữ pháp N4 02 – 予定") hiện furigana thay vì dấu ngoặc vuông.

## 21. Bản v14 (12/10/2026): lộ trình theo bài học, Sổ tay, hội thoại & bài đọc (Đ9–Đ12)

**Cách tải lên:** giải nén `capnhat-v14.zip`, kéo **toàn bộ** nội dung vào kho `tiengnhat` → ghi đè → Commit (đã gồm v8–v13 và 3 gói dữ liệu mới). Kiểm tra: Cài đặt → cuối trang ghi **v14 · 12/10/2026**.

**Lộ trình chia thành bài học**
- Mỗi chặng là một dãy **bài học**. Chặng N5 có 21 bài soạn theo chủ đề (gói `baihoc-n5`). Chặng N4, N3 chưa có gói bài học thì app tự chia bài từ các gói đang có (ghi "app tự chia"); khi skill soạn xong `baihoc-n4`, `baihoc-n3` thì app dùng gói đó.
- **Trang bài** (bấm vào bài ở Lộ trình hoặc thẻ "Bài đang học" ở Trang chủ) có mục tiêu "Sau bài này…" và 8 bước, bước xong có ✓:
  1. Từ mới — danh sách từ, nút Học, nút đánh dấu cạnh từng từ.
  2. Từ liên quan — cặp tự – tha, trái nghĩa, đồng nghĩa, dễ nhầm, từ chung chữ Hán.
  3. Chữ Hán của bài.
  4. Ngữ pháp — bấm vào mẫu để học; nút luyện các mẫu của bài.
  5. Luyện từ — trắc nghiệm, ghép cặp, gõ từ; có ô "Chỉ từ đã đánh dấu".
  6. Luyện câu — ghép câu, thể động từ, dịch Việt ↔ Nhật bằng câu của bài.
  7. Đọc & hội thoại — bài hội thoại / bài đọc của bài. Bài chưa có thì đọc câu ví dụ và làm "Nghe – hiểu 10 câu".
  8. Kiểm tra cuối bài — 15 câu, đạt từ 80% là bài có ✓.
- **Viết 3 câu** ở cuối trang bài: tự viết câu theo mẫu của bài, mở câu mẫu để so, bấm Lưu (đồng bộ sang máy khác).
- **Ôn bài cũ**: bài đã xong sẽ hiện trong Kế hoạch hôm nay sau 1, 3, 7, 14 ngày — mỗi lần 10 câu trộn cả bài.
- **Tình huống thật**: sau mỗi 5 bài có một mục ôn tổng hợp (khi có bài hội thoại tổng hợp thì mở bài đó).
- **Nói được gì** (nút ở Lộ trình, Trang chủ): danh sách mục tiêu các bài, bài đã xong có ✓.
- **Kế hoạch hôm nay** có dòng "Bài N: …" dẫn thẳng tới bước tiếp theo; "Học 10 từ mới", "1 mẫu ngữ pháp mới", "3 chữ Hán" ưu tiên của bài đang học.

**Sổ tay** — *đã bỏ ở bản v18 (xem mục 27)*. Phần dưới chỉ để tham khảo bản cũ.
- Nút 🔖 **Sổ tay** có ở trang bài học, thẻ từ, Kho từ, thẻ chữ Hán, và giữa lượt ôn (cạnh nút Tiếp). Bấm vào để chọn sổ hoặc tạo sổ mới ("Từ khó", "Từ xưởng"…). "Gắn sao" cũ là sổ mặc định.
- Mỗi sổ luyện riêng được: trắc nghiệm, ghép cặp, học từ chưa học, dịch câu, ôn chữ Hán, luyện mẫu. Các trang luyện (Trắc nghiệm, Ghép cặp, Ghép câu, Luyện thể, Luyện dịch, Bài tập ngữ pháp, Ôn chữ Hán) có thêm nguồn **"Sổ: …"**.

**Hội thoại & bài đọc** (Luyện tập → Hội thoại & bài đọc, hoặc bước 7 của bài)
- 6 chế độ: **Đọc** (chạm câu để xem nghĩa, từ, ghi chú; câu Kansai có "Nói chuẩn"), **Dịch** từng câu, **Đóng vai** (app hiện câu người kia, bạn chọn hoặc gõ câu của mình), **Từ khóa**, **Câu hỏi** (đúng từ một nửa là bài có ✓), **Nghe cả bài** (chỉnh tốc độ, mỗi vai một giọng nếu máy có nhiều giọng).
- Câu hội thoại dịch sai vào lịch ôn như Luyện dịch; trang Luyện dịch có thêm nguồn "Câu hội thoại, bài đọc".
- Không có phần luyện nói / ghi âm (theo yêu cầu).

## 22. Dữ liệu đi kèm v14

| Gói | Nội dung |
|---|---|
| `baihoc-n5` | 21 bài N5: chia hết 606 từ N5 và 44 mẫu ngữ pháp N5 theo chủ đề (chào hỏi, mua sắm, giờ làm, đi lại, ăn uống, chỉ thị ở xưởng, xin phép & điều cấm, sức khỏe & xin nghỉ, quy định & thủ tục…) |
| `hoithoai-01` | 4 bài hội thoại **mẫu** để bạn duyệt giọng văn: ngày đầu ở xưởng · nhận chỉ thị · gọi điện xin nghỉ vì sốt · đồng nghiệp nói Kansai rủ đi ăn |
| `baidoc-01` | 2 bài đọc mẫu: tin nhắn LINE giờ làm · biển báo phòng thay đồ |

Thẻ chữ Hán cho các chữ của 21 bài N5 sẽ làm ở đợt chữ Hán tới (chữ chưa có thẻ thì bước 3 bỏ qua chữ đó).

## 23. Bản v15 (17/10/2026): bài mở đầu, giải thích câu, sửa dấu ✓ ở Kế hoạch hôm nay

**Cách tải lên:** giải nén `capnhat-v15.zip`, kéo **toàn bộ** nội dung vào kho `tiengnhat` → ghi đè → Commit (đã gồm v8–v14 và 21 gói bài mở đầu). Kiểm tra: Cài đặt → cuối trang ghi **v15 · 17/10/2026**.

**Bài mở đầu ở đầu mỗi bài học**
- Mỗi bài N5 mở bằng một đoạn hội thoại hoặc bài đọc dài 41–62 câu, dùng chủ yếu từ mới và ngữ pháp của chính bài đó. Dưới mỗi câu có nghĩa tiếng Việt (nút **Ẩn nghĩa** để tự đọc trước).
- **Chạm vào câu** → bảng "Giải thích câu": cụm từ, từng từ (nghĩa, loại từ, cấp, nút 🔖 Sổ tay), ngữ pháp dùng trong câu, ghi chú văn hóa.
- **Chạm vào mẫu ngữ pháp** trong bảng → mở bài học của mẫu đó ngay tại chỗ (có nút "Luyện mẫu này" và "Đã học xong bài này").
- Các nút dưới bài: Câu hỏi · Nghe cả bài · Dịch. Đọc xong bấm **Đã đọc xong** để đánh dấu.
- Bài mở đầu cũng có ở Luyện tập → Hội thoại & bài đọc.
- Bài N4, N3: bài mở đầu sẽ có cùng lúc với gói bài học N4, N3.

**Giải thích khi hiện đáp án**
- Ở các bài tập và luyện tập có câu tiếng Nhật (bài tập ngữ pháp, luyện dịch, câu hội thoại, ôn bài…), khi hiện đáp án có ô **"Giải thích từ & ngữ pháp trong câu"**. Mỗi mẫu ngữ pháp trong ô đó bấm được để mở bài học.
- Bài kiểm tra cuối bài và thi thử: không hiện đáp án giữa chừng; giải thích nằm ở danh sách câu sai sau khi nộp bài.

**Kế hoạch hôm nay đánh dấu ✓ đúng việc đã làm**
- App ghi lại việc đã làm trong ngày: luyện kana, học bài (mọi bước, đọc bài mở đầu, kiểm tra, ôn bài cũ), luyện dịch, luyện thể, ôn hỗn hợp, đọc. Thoát giữa chừng mà đã làm ít nhất 1 câu cũng tính.
- **Ôn đến hạn:** đã ôn một lượt trong ngày là có ✓; nếu còn mục đến hạn thì vẫn có nút Ôn để ôn thêm.
- **Luyện dịch / luyện thể** (xen kẽ theo ngày): làm bài nào trong hai bài cũng tính.
- **Mẫu ngữ pháp mới:** bấm "Đã học xong bài này" ở cuối trang mẫu.
- **Kana:** đủ 20 câu trong ngày.

## 24. Dữ liệu đi kèm v15

| Gói | Nội dung |
|---|---|
| `modau-n5-01` … `modau-n5-21` | 21 bài mở đầu cho 21 bài N5 (19 hội thoại, 2 bài đọc), mỗi bài 41–62 câu, có nghĩa tiếng Việt, cụm từ, ngữ pháp, ghi chú từng câu; phủ 66–100% từ mới của bài, mỗi mẫu của bài xuất hiện ít nhất 2 câu |
| `baihoc-n5` v2 | mỗi bài có bài mở đầu đứng đầu phần Đọc & hội thoại |

Các nhân vật quen thuộc: tổ trưởng 田中[たなか], tiền bối 佐藤[さとう], đồng nghiệp 鈴木[すずき], chị Maria, chị 山田[やまだ] ở văn phòng, bạn cùng phòng Minh, thực tập sinh mới Hoa.

## 25. Bản v16 (17/10/2026): giáo trình N4 theo bài

- **27 bài học N4** (`baihoc-n4`): mỗi bài gắn một gói ngữ pháp `nguphap-n4-NN`, đủ 671 từ N4 chia vào các bài, kèm chữ Hán của bài (ưu tiên chữ N4). Mở ở Trang chủ → Lộ trình, hoặc trang Bài học.
- **27 bài mở đầu N4** (`modau-n4-01` … `27`): 25 hội thoại + 2 bài đọc (bài văn của Hoa ở bài 8, bài thuyết trình "Thị trấn nơi tôi sống" ở bài 24), mỗi bài 40–46 câu, tổng 1.102 câu. Mỗi câu có nghĩa tiếng Việt; ấn vào câu để xem nghĩa từng từ/cụm từ, mẫu ngữ pháp (ấn mẫu → mở bài ngữ pháp) và ghi chú. Mỗi bài có 5 câu hỏi đọc hiểu.
- Bộ nhận diện từ trong câu nhận thêm động từ viết toàn kana (ある, いる, できる…) mà không nhầm với 〜てください, 〜てはいけません.

| Gói | Nội dung |
|---|---|
| `baihoc-n4` v1 | 27 bài N4, mỗi bài: từ mới, ngữ pháp, chữ Hán, bài mở đầu |
| `modau-n4-01` … `modau-n4-27` | bài mở đầu cho từng bài N4; phủ ≥50% từ mới của bài, mỗi mẫu của bài xuất hiện ít nhất 2 câu |

Nhân vật dùng lại từ N5; thêm bà chủ nhà (大家[おおや]さん) ở bài 25 và y tá ở bài 23.

## 26. Bản v17 (17/10/2026): bỏ biệt danh trong app, giáo trình N3 bài 1–15

- **App không còn gọi "Cậu Cả".** Giao diện xưng "bạn". Trong hội thoại, vai của người học là グエン (ghi chú "Bạn"); lời kể và câu hỏi đọc hiểu gọi là "anh Nguyễn".
- **Giáo trình N3** (`baihoc-n3`): đủ 35 bài, bài NN ứng với gói ngữ pháp `nguphap-n3-NN`.
  - Bài 1–15 đã đủ: 613 từ mới (`jlpt-n3-10` … `24`) cộng động từ N3, và bài mở đầu (`modau-n3-01` … `15`: 12 hội thoại, 3 bài đọc, tổng 655 câu, mỗi câu có nghĩa và giải thích từng từ, mẫu ngữ pháp).
  - Bài 16–35 tạm có ngữ pháp và động từ N3; từ mới và bài mở đầu sẽ có ở bản sau. Khi bổ sung, tiến độ các từ đã học vẫn giữ nguyên.
- 292 động từ N3 (`jlpt-n3-01` … `09`) nay có trong danh mục.
- Chạm vào chữ Hán trong một câu của bài mở đầu / bài đọc giờ chỉ mở bảng giải thích câu (trước đây mở thêm thẻ chữ Hán chồng lên).
- Sửa cách đọc: 数 (かず) trong "数を数える, 箱の数"; ngày mùng 1 (一日[ついたち]) sau "…月の"; 一年間 (いちねんかん); phân số 四分の一 (よんぶんのいち).

## 27. Bản v18 (17/10/2026): nút tim ở bài học, bỏ Sổ tay, lịch ôn "thuộc nhuần nhuyễn", giáo trình N3 bài 16–27

- **Thông báo không che nút nữa.** Thông báo "Đã đánh dấu thuộc… / Hoàn tác" nổi lên **phía trên** thanh nút ghim ở đáy (Đã thuộc · Tiếp). Thông báo có nút Hoàn tác tự tắt sau 6 giây.
- **Bỏ hẳn Sổ tay:** không còn nút 🔖, trang Sổ tay, ô Sổ tay ở Trang chủ / Luyện tập / Lộ trình, nguồn "Sổ: …" và "Gắn sao" trong các bài luyện, ô "Chỉ N từ đã đánh dấu". Câu sai ở bài kiểm tra cuối bài không còn tự vào sổ. Dữ liệu sổ cũ vẫn nằm trong bản sao lưu / đồng bộ (không mất), chỉ là app không dùng nữa.
- **Nút tim ♡ ở bước 1 "Từ mới" của bài học:**
  - Bấm ♡ ở từ muốn luyện thêm (♥ đỏ). Thanh nút dính đáy màn hình: **Luyện từ đã tim (N)** (cần từ 2 từ) và **Bỏ tim tất cả**.
  - Màn luyện có 2 cách: **Ghép 8 cặp Việt – Nhật** (ít hơn 8 từ tim thì dùng hết) và **Trắc nghiệm** (Việt → Nhật, Nhật → Việt hoặc Trộn; 4 phương án, nhiễu lấy từ các từ tim khác trước rồi tới từ của bài; câu sai hỏi lại sau 2 câu, có giải thích từ).
  - **Không có hồi kết**: hết màn thì sang màn mới; bộ đếm "Màn N · đúng X/Y". **Chỉ nút ✕** mới thoát — vuốt / nút Quay lại của điện thoại bị chặn (hiện nhắc "Bấm nút ✕…").
  - **Tim giữ khi**: bấm ✕ về bài, mở thẻ từ / chữ Hán / bảng giải thích trong trang bài. **Tim mất khi**: sang trang khác (Lộ trình, bài khác, tab dưới đáy…), bắt đầu bài luyện khác của bài, tải lại hay đóng app. Tim không lưu vào máy, không đồng bộ.
  - **Lịch ôn**: câu đúng làm mới lịch ôn của từ — từ mới hoặc đã đến hạn thì lên một hộp (mỗi chiều một lần mỗi lượt), từ chưa đến hạn thì dời hạn ôn tính lại từ hôm nay. Câu sai không làm tụt hộp. Làm đúng ít nhất một câu là tính **xong bước "Luyện từ"** của bài.
- **Thuộc nhuần nhuyễn — thôi ôn (toàn app):** chiều nào đã ở hộp 5 mà đến lần ôn (sau 16 ngày) vẫn đúng thì không bao giờ đến hạn ôn nữa. Nếu sau này tự luyện mà làm sai mục đó thì nó về hộp 1 như thường. Nút "Đã thuộc" giờ đúng như lời nhắc: 16 ngày sau hỏi lại **một lần**.
- **Giáo trình N3:** từ mới bài 1–28 (`jlpt-n3-10` … `37`, 1.085 từ) và bài mở đầu bài 1–27 (`modau-n3-01` … `27`: 23 hội thoại, 4 bài đọc, 1.183 câu). Bài 28–35 còn lại sẽ có ở bản sau.
- **Sửa cách đọc số đếm** trong khoảng 50 gói cũ (công cụ soát tự động): 一週間 (いっしゅうかん), 一階 (いっかい), 二箱 / 一箱 / 百箱 (ふたはこ, ひとはこ, ひゃっぱこ), 十匹 (じゅっぴき), 三百円 (さんびゃくえん), 三十歳 (さんじゅっさい), 八十点 (はちじゅってん), 十分 khi là "10 phút" (じゅっぷん), 十日 (とおか), 十四日 (じゅうよっか), 四月 (しがつ), 九月 (くがつ), 四時半 / 六時半 (… はん), 一日中 (いちにちじゅう), 一トン (いっトン), 五十パーセント (ごじゅっパーセント). Cùng với: 富士山 (ふじさん), 塩水 (しおみず), この前 (まえ). Từ 生食用 ghi thêm: cũng đọc なましょくよう (hay nghe ở xưởng).


## 28. Bản v19 (17/10/2026): xong giáo trình N3 (bài 28–35)

- **Giáo trình N3 đủ 35 bài.** Bản này thêm từ mới bài 29–35 (`jlpt-n3-38` … `44`, 217 từ) và bài mở đầu bài 28–35 (`modau-n3-28` … `35`: 8 hội thoại, 357 câu).
  - Bài 32 *Thông báo, quy định & giấy tờ*: 〜こと（指示）, 〜ように言う・頼む, 〜とおり（に）・〜どおり（に）. Hội thoại: nội quy ký túc xá, đổi địa chỉ ở tòa thị chính, gửi bưu kiện. Không nêu số tiền thuế, lệ phí — thủ tục thật hãy hỏi ở quầy.
  - Bài 33 *Nói chuyện thân mật*: 〜なきゃ・〜なくちゃ, 〜ちゃいけない・〜ちゃだめ, 〜とく・〜てる. Từ khẩu ngữ (マジ, やばい, 超, めちゃくちゃ, 飯, 食う…) có ghi chú chỉ dùng với bạn thân; câu khẩu ngữ có kèm câu chuẩn lịch sự.
  - Bài 34 *Tiền bạc & chi tiêu*: 〜だけでなく, 〜かのように, めったに〜ない.
  - Bài 35 *Trở thành tổ trưởng*: 〜こともある, 〜につき, 〜きり・〜っきり.
- **Tổng N3:** 35 bài, 1.594 từ mới, 35 bài mở đầu (1.540 câu), mỗi câu có nghĩa tiếng Việt và bấm để xem giải thích.
- Sửa cách đọc: いつの間[ま]にか (trước đây công cụ dễ đọc nhầm 間 thành あいだ).

## 29. Bản v20 (17/10/2026): bản đầy đủ, cập nhật bằng GitHub Desktop, báo lỗi tải gói rõ hơn

- **Bản đầy đủ.** `capnhat-v20.zip` chứa toàn bộ app và toàn bộ dữ liệu từ trước tới nay (256 gói: giáo trình N5, N4, N3; từ theo chủ đề xưởng, thủy sản, thuế – visa, Kansai, đời sống; thẻ chữ Hán; câu thực chiến). Một mình bản này dựng được app hoàn chỉnh, kể cả trên kho trống. Đã đối chiếu với mọi bản phát hành từ v5: không mất gói, không mất mục nào. Gói cũ `jlpt-n5-dongtu-01` không còn dùng, vì 25 động từ của nó đã nằm trong các gói khác.
- **Lần đầu dùng GitHub Desktop:**
  1. Cài GitHub Desktop, đăng nhập tài khoản đang giữ kho `tiengnhat`.
  2. **File → Clone repository** → chọn kho `tiengnhat` → chọn thư mục trên máy → **Clone**.
  3. Giải nén `capnhat-v20.zip`, chép **toàn bộ nội dung bên trong** (các thư mục `css`, `data`, `icons`, `js` và các file `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `HUONG-DAN.md`) vào thư mục kho vừa tải về, chọn **ghi đè** khi được hỏi.
  4. Xoá tệp thừa `data/packs/jlpt-n5-dongtu-01.json` trong thư mục kho.
  5. Mở GitHub Desktop: cột bên trái liệt kê các tệp đã đổi. Ô *Summary* ghi `v20` → **Commit to main** → **Push origin**.
  6. Chờ khoảng 1–2 phút để GitHub Pages cập nhật, rồi mở app khi có mạng.
- **Các lần cập nhật sau** chỉ gửi những tệp mới hoặc đã sửa (so với đúng những gì đang có trên kho), kèm danh sách tệp cần xoá nếu có. Cách làm: giải nén, chép đè vào thư mục kho, xoá các tệp trong danh sách, rồi Commit → Push như bước 5.
- **Báo lỗi tải gói rõ hơn.** Khi một gói không tải được, app nói rõ lý do:
  - *chưa có trên GitHub: thiếu tệp …* → tệp đó chưa được tải lên kho;
  - *máy đang mất mạng* → mở app lại khi có mạng;
  - *máy chủ báo lỗi …* → GitHub tạm trục trặc, thử lại sau ít phút;
  - *bị hỏng* → tệp trên kho không đọc được, tải lại tệp đó.

## 30. Cập nhật dữ liệu 18/10/2026: từ vựng công xưởng & thủy sản

- 4 gói từ mới (145 từ), toàn bộ là từ hay nghe ở xưởng chế biến thủy sản:
  - `xuong-03` *Đồ đựng, xe đẩy, dụng cụ vệ sinh & dao* (36 từ): かご, トレー, 台車, カゴ台車, ハンドリフト (gọi tắt ハンド), 鉄砲, 水切り, 次亜 (次亜塩素酸), ローラー (粘着ローラー), 出刃包丁, 砥石…
  - `xuong-04` *Bảo hộ, đồ dùng chung, điện & thao tác dọn dẹp* (36 từ): マスク, ヘアネット, 前掛け, 布巾, ガムテープ (gọi tắt テープ), ゴムマット (gọi tắt マット), 錆びる, 詰まる, 漏れる, 絞る, 干す…
  - `xuong-05` *Động từ, tính từ & từ tượng thanh khi làm việc* (43 từ): すすぐ, 積み重ねる, 崩れる, 剥がす, 傷む, 薄い / 厚い, 生臭い, ぬるい, びしょびしょ, がたがた, ぐらぐら…
  - `thuysan-04` *Cách cắt, phần cá, cân & kiểm tra hàng* (30 từ): 斜め切り, そぎ切り, 押し切り / 引き切り, アラ, アラ桶, ばらす, 目方, 誤差, 異物, 毛髪, 身割れ, 変色, 雑…
- Bổ sung nghĩa và câu ví dụ ở xưởng cho 8 từ đã có (giữ nguyên tiến độ học): エプロン (tạp dề cao su), 入る (まだ入る / もう入らない / 入った！), ちょうだい, オーバー (dư cân), 割る (bổ đôi cá), 三枚おろし, ぎりぎり, 丁寧.

## 31. Bản v22 (18/10/2026): thông báo không che nút, tự đặt nhịp học, thêm thẻ chữ Hán

- **Thông báo không che bất kỳ nút nào** (nút đáp án, thanh nút Tiếp / Đã thuộc, thanh điều hướng, nút ✕ trên đầu…). App tự tìm chỗ trống để đặt thông báo; chật quá thì thu gọn thành một dòng nhỏ; màn hình kín nút thì thông báo nằm vào cuối trang (vẫn cuộn tới mọi nút được). Câu hỏi mới hiện ra, cuộn hay xoay máy thì thông báo tự dời chỗ.
- Mỗi thông báo hiện **4 giây** và có **nút ✕** để đóng ngay.
- **Tự đặt nhịp học mỗi ngày** — ở màn *Bắt đầu* (Lộ trình → Đổi) và ở **Cài đặt → Nhịp học mỗi ngày**:
  - **Số phút mỗi ngày**: gõ từ 5 đến 180 phút, hoặc bấm nhanh 10 / 20 / 40 / 60 phút.
  - **Số từ mới mỗi ngày** (0–100) và **số chữ Hán mới mỗi ngày** (0–30): để "Tự động theo số phút" hoặc bỏ dấu chọn rồi gõ số mình muốn. Đặt 0 thì Kế hoạch hôm nay không nhắc mục đó.
  - Đây là **mục tiêu** để Kế hoạch hôm nay đánh dấu ✓, không phải giới hạn — học thêm lúc nào cũng được. Dự báo ngày học xong cũng tính theo các số này. Phần này đồng bộ giữa các máy.
- **Thẻ chữ Hán**: thêm 60 thẻ (`chuhan-03`, `chuhan-04`) cho các chữ N5 hay gặp nhất (気, 行, 金, 時, 水, 国, 電, 話…). Mỗi thẻ có âm Hán Việt, nghĩa, âm On/Kun, số nét, bộ phận, câu lục bát nhớ mặt chữ, từ Hán Việt quen thuộc, chữ dễ nhầm và ghi chú. Các thẻ còn lại (khoảng 1.230 chữ) sẽ có ở các bản sau.

## 32. Cập nhật dữ liệu v23 (18/10/2026): thêm 150 thẻ chữ Hán

- Thêm 5 gói thẻ chữ Hán `chuhan-05` … `chuhan-09` (150 chữ): xong phần N5 còn thiếu và đi tiếp phần N4 — 鍵, 切, 重, 品, 急, 意, 料, 止, 安, 台, 運, 住, 注, 特, 質, 研, 帰, 試, 験, 使, 開, 濡, 挨拶, 味噌…
- Kho hiện có **259 thẻ chữ Hán**; còn khoảng **1.080 chữ** sẽ làm tiếp theo thứ tự N4 → N3 → N2 → N1, mỗi đợt khoảng 150 chữ.
- Ghi chú trong thẻ ưu tiên từ gặp ở xưởng, nhãn hàng và giấy tờ: 注意[ちゅうい], 立入禁止[たちいりきんし], 飲食禁止[いんしょくきんし], 品質管理[ひんしつかんり], 開封後[かいふうご], 収入印紙[しゅうにゅういんし], 住民票[じゅうみんひょう]の写[うつ]し…
- Bản này **chỉ có dữ liệu**, không đổi mã app. Nếu chưa cập nhật v21, v22 thì gói cập nhật này đã gồm luôn các tệp của hai bản đó.

## 33. Cập nhật dữ liệu v24 (18/10/2026): thêm 210 thẻ chữ Hán (xong N4, đi tiếp N3)

- Thêm 7 gói `chuhan-10` … `chuhan-16` (210 chữ): xong phần N4 và đi tiếp N3 — 付, 当, 身, 全, 引, 予, 常, 記, 要, 産, 定, 申, 険, 指, 差, 給, 勤, 連, 機, 残, 込, 交, 回, 退, 便, 在, 役, 倒, 割, 欠, 速, 危, 靴, 押, 更, 次, 除, 号, 存, 容, 費, 積, 原, 束, 返, 疲, 働, 剥, 腹, 抜, 掛, 済…
- Kho hiện có **469 thẻ chữ Hán**; còn khoảng **870 chữ** (phần còn lại của N3, rồi N2, N1).
- Ghi chú ưu tiên chữ gặp ở xưởng và giấy tờ: 安全靴[あんぜんぐつ], 危険予知[きけんよち], 指差[ゆびさ]し確認[かくにん], 転倒[てんとう]注意[ちゅうい], 急速冷凍[きゅうそくれいとう], 骨抜[ほねぬ]き, 内容量[ないようりょう], 原材料[げんざいりょう], 消費期限[しょうひきげん], 在留[ざいりゅう]カード, 更新[こうしん], 控除[こうじょ], 確定申告[かくていしんこく]…
- Bản này **chỉ có dữ liệu**, không đổi mã app.

## 34. Cập nhật dữ liệu v25 (18/10/2026): thêm 210 thẻ chữ Hán (N3 và chữ hay gặp)

- Thêm 7 gói `chuhan-17` … `chuhan-23` (210 chữ): tiếp phần N3 — 的, 置, 落, 資, 勝, 反, 払, 程, 迎, 際, 判, 完, 求, 種, 職, 責, 類, 窓, 箱, 説, 守, 寒, 規, 談, 薬, 与, 忘, 打, 探, 背, 殺, 港, 髪, 念, 慣, 戻, 配, 処, 揃, 溜, 破, 突, 逃, 途, 到, 和, 権, 路…
- Có thêm các chữ **không thuộc danh sách JLPT nhưng hay gặp** ở xưởng và đời sống, người Nhật thường viết bằng kana: 蓋[ふた], 貼[は]る, 整頓[せいとん], 石鹸[せっけん], 牡蠣[かき], 叩[たた]く, 掴[つか]む, 撒[ま]く, 茹[ゆ]でる, 炒[いた]める, 紐[ひも], 袖[そで]… Các thẻ này ghi cấp N1 (chữ khó), học để đọc được khi gặp.
- Kho hiện có **679 thẻ chữ Hán**; còn khoảng **660 chữ**.
- Bản này **chỉ có dữ liệu**. Gói cập nhật tính theo kho GitHub hiện tại, nên **đã gồm luôn v24**; nếu chưa đưa v24 lên thì chỉ cần dùng gói v25.

## 35. Cập nhật dữ liệu v26 (18/10/2026): thêm 210 thẻ chữ Hán (xong N3, vào N2)

- Thêm 7 gói `chuhan-24` … `chuhan-30` (210 chữ): xong phần N3 và đi tiếp N2 — 温, 包, 量, 汚, 防, 混, 骨, 管, 毒, 燃, 印, 減, 細, 塩, 袋, 掃, 禁, 血, 油, 乾, 替, 湿, 清, 蔵, 録, 停, 触, 巻, 庫, 材, 板, 氷, 腰, 詰, 床, 個, 沸, 泉, 焼, 臓, 補, 輸, 造, 預, 届, 換, 震, 含, 底, 損, 改, 査, 測, 溶, 療, 硬, 脂, 針, 額, 厚, 帽, 薄, 械, 皮, 挟, 乳, 卵, 巾, 湯, 甘, 線, 荷, 軍, 軽, 瓶, 缶, 塗, 専…
- Có vài chữ **ngoài danh sách JLPT nhưng gặp ở xưởng**, thường viết bằng kana: 秤[はかり], 錆[さび], 吊[つ]るす, 溢[あふ]れる. Các thẻ này ghi cấp N1.
- Ghi chú ưu tiên từ gặp ở xưởng và giấy tờ: 要冷蔵[ようれいぞう], 非常停止[ひじょうていし], 巻[ま]き込[こ]まれ, 挟[はさ]まれ注意[ちゅうい], 手袋[てぶくろ]を交換[こうかん], 内臓[ないぞう]を取[と]る, 軍手[ぐんて], 布巾[ふきん]と雑巾[ぞうきん], 熱湯注意[ねっとうちゅうい], 源泉徴収票[げんせんちょうしゅうひょう], 医療費控除[いりょうひこうじょ], 委任状[いにんじょう], 欠勤届[けっきんとどけ]…
- Gói `chuhan-23` được sửa nhẹ phần ghi chú (bỏ các chữ Hán để trần trong ngoặc, thay bằng từ có furigana).
- Kho hiện có **889 thẻ chữ Hán**; còn khoảng **450 chữ**.
- Bản này **chỉ có dữ liệu**, không đổi mã app.

## 36. Bản v27 (18/10/2026): nút "Đã thuộc" mới, khay nút và thông báo đứng chỗ cố định

- **Nút "Đã thuộc"** (hiện sau khi trả lời ở các lượt ôn, trắc nghiệm, ôn chữ Hán, luyện ngữ pháp, câu dịch):
  - Bấm thì mục đó **thuộc hẳn — không bao giờ đến hạn ôn nữa** (trước đây: 16 ngày sau hỏi lại một lần).
  - Không còn hiện thông báo nổi. Nút đổi ngay tại chỗ thành **"✓ Đã thuộc"** (tô xanh). **Bấm lần nữa** (trước khi bấm Tiếp) để bỏ, tiến độ trở về như trước.
  - Nút rộng hơn và rộng cố định, nên đổi chữ không bị xuống dòng, nút Tiếp cũng không co giãn — ở mọi cỡ chữ, cỡ nút trong Cài đặt.
  - Mục đã thuộc chỉ gặp lại khi tự chọn luyện (luyện cả bài, nguồn "Đã thuộc" hoặc "Tất cả"). Tự luyện mà làm sai thì mục đó trở lại hộp 1 như thường.
  - Nút "Biết rồi" ở Học từ mới giữ như cũ (16 ngày sau hỏi lại một lần để kiểm).
- **Thứ tự xếp từ dưới lên**: thanh công cụ (đáy màn hình điện thoại / thanh bên trên PC) → **khay nút** (Đã thuộc, Tiếp; Để sau, Biết rồi, Đã học…) ghim ngay trên thanh công cụ → **thông báo** ngay trên khay nút.
- **Thông báo đứng một chỗ cố định**, không chạy theo khi nội dung trên màn hình thay đổi (bỏ cách "tự tìm chỗ trống" của v22):
  - Màn có khay nút: thông báo đứng trên chỗ của khay, kể cả lúc chưa trả lời (khay chưa hiện) — khay hiện ra thông báo không nhảy.
  - Màn không có khay: thông báo ngay trên thanh công cụ.
  - Khi đang có thông báo, cuối trang chừa thêm chỗ để kéo được phần nội dung bị che lên.
  - Tối đa 2 thông báo cùng lúc, cái mới nằm sát khay. Mỗi cái hiện 4 giây, có nút ✕ đóng ngay.
- Gói cập nhật gồm các tệp mã đã đổi (`index` không đổi): `sw.js`, `css/app.css`, `js/util.js`, `js/app.js`, `js/srs.js`, `js/quiz.js`, `js/drill.js`, `js/guides.js`, `HUONG-DAN.md`. Mở app khi có mạng, app báo có bản mới thì bấm cập nhật; Cài đặt → Phiên bản app phải hiện **v27**.

## 37. Cập nhật dữ liệu v28 (18/10/2026): thêm 210 thẻ chữ Hán (xong N2, vào chữ N1 hay gặp)

- Thêm 7 gói `chuhan-31` … `chuhan-37` (210 chữ):
  - Xong phần N2: 律, 拾, 捨, 曇, 浅, 珍, 祈, 競, 複, 貿, 門, 雲, 丸, 了, 令, 依, 券, 劇, 勢, 占, 各, 型, 域, 境, 央, 姓, 導, 層, 希, 幅, 府, 患, 担, 暴, 札, 栄, 極, 永, 汗, 沈, 況, 液, 濃, 燥, 爆, 略, 県, 秒, 籍, 粉, 署, 肌, 肩, 胃, 胸, 航, 般, 訓…
  - Bắt đầu các chữ **ghi cấp N1 nhưng gặp hằng ngày** ở xưởng và giấy tờ: 保, 器, 素, 結, 訳, 納, 異, 価, 丁, 刃, 検, 製, 崩, 整, 票, 故, 暇, 菌, 救, 請, 護, 酸, 養, 源, 災, 避, 傷, 応, 滞, 衛, 控, 滑, 班, 輩, 障, 振, 健, 康, 徴, 暑, 染, 泡, 炎, 督, 端, 臭, 鮮, 診, 致, 免, 就, 従, 提…
- `箋` (処方箋[しょほうせん] — đơn thuốc) không thuộc danh sách JLPT nhưng hay gặp ở bệnh viện, hiệu thuốc; ghi cấp N2.
- Ghi chú ưu tiên từ gặp ở xưởng và giấy tờ: 衛生管理[えいせいかんり], 交差汚染[こうさおせん], 異物混入[いぶつこんにゅう], 金属探知機[きんぞくたんちき], 荷崩[にくず]れ, 酸性洗剤[さんせいせんざい]と塩素系[えんそけい]を混[ま]ぜない, 刃[は]こぼれ, 鮮度[せんど], 避難経路[ひなんけいろ], 納税証明書[のうぜいしょうめいしょ], 源泉徴収票[げんせんちょうしゅうひょう], 督促状[とくそくじょう], 扶養控除[ふようこうじょ], 令和[れいわ]…
- Kho hiện có **1.099 thẻ chữ Hán**; còn khoảng **240 chữ**.
- Bản này **chỉ có dữ liệu**. Nếu chưa đưa bản v27 (nút Đã thuộc mới, vị trí thông báo) lên GitHub thì gói cập nhật v28 đã **gồm luôn các tệp mã của v27**.

## 38. Cập nhật dữ liệu v29 (19/10/2026): thêm 242 thẻ chữ Hán — đủ thẻ cho mọi chữ trong kho từ

- Thêm 8 gói `chuhan-38` … `chuhan-45` (242 chữ, gói cuối 32 chữ để gom hết), toàn các chữ **ghi cấp N1 nhưng gặp hằng ngày**:
  - Ở xưởng, kho lạnh: 栓, 漏, 絞, 網, 棚, 削, 柵, 桶, 浸, 溝, 爪, 砥, 粘, 鱗, 脱, 漬, 剤, 卸, 殻, 沿, 炊, 湧, 稼, 穴, 継, 緊, 繰, 裂, 覆, 衝, 腐, 肪, 霜, 酢, 隔…
  - Ở giấy tờ, thủ tục: 遣, 項, 扶, 履, 弁, 携, 契, 寮, 控, 扱, 抵, 掲, 条, 株, 氏, 派, 益, 監, 該, 詳, 賃, 訴, 罰, 裁, 統, 範…
  - Đời sống: 銭, 傘, 豚, 鶏, 糖, 隣, 嬉, 泣, 嵐, 桜, 猿, 睡, 蚊, 豆, 雷, 霧, 酔, 飼, 飽, 鹿, 黙…
- Ghi chú ưu tiên từ gặp ở xưởng và giấy tờ: 派遣[はけん], 消火栓[しょうかせん], 引[ひ]き継[つ]ぎ, 緊急停止[きんきゅうていし]ボタン, 異物混入[いぶつこんにゅう]の対策[たいさく], 霜取[しもと]り, 間隔[かんかく]を空[あ]けて並[なら]べる, 該当[がいとう]するものに丸[まる]をつける, 最低賃金[さいていちんぎん], 家賃[やちん]…
- Kho hiện có **1.341 thẻ chữ Hán** — **mọi chữ Hán có trong từ vựng đều đã có thẻ**. Ở trang Chữ Hán, dòng "… chữ trong kho từ chưa có thẻ" sẽ không còn hiện.
- Còn 79 chữ chỉ xuất hiện trong câu ví dụ, bài học (phần lớn là tên người, tên đất như 佐藤[さとう], 鈴木[すずき], 大阪[おおさか], 京都[きょうと]; vài tên cá như 鮭[さけ], 鯖[さば]). Các chữ này chưa có từ vựng riêng nên app chưa đòi thẻ; khi làm thêm từ vựng có chúng thì làm thẻ sau.
- Bản này **chỉ có dữ liệu** (8 gói mới, `data/manifest.json`, tệp hướng dẫn này). Mã app giữ nguyên bản v27.

## 39. Bản v30 (19/10/2026): bài đọc, hội thoại dài có nút Xem cả bài / Thu gọn

- Bài hội thoại, bài đọc **dài từ 9 câu trở lên** mặc định chỉ hiện **5 câu đầu** (hội thoại: 5 lượt nói). Bài đọc nếu hết đoạn ở câu thứ 4–6 thì cắt đúng chỗ hết đoạn. Bài ngắn (thông báo, biển báo…) vẫn hiện đủ, không có nút.
- Câu cuối của phần rút gọn mờ dần; ngay dưới là nút **"Xem cả bài · còn N câu ▾"**. Mở ra rồi thì nút nằm ở cuối bài thành **"Thu gọn ▴"**; bấm Thu gọn thì trang đưa đầu bài về lại màn hình.
- Áp dụng ở: tab **Đọc** của từng bài, **Bài mở đầu** trong trang bài học, và **Nghe cả bài** (giọng đọc tới phần đang ẩn thì bài tự mở ra để chữ chạy theo tiếng).
- Mỗi lần mở bài đều rút gọn lại như mặc định. Ô "Hiện nghĩa tiếng Việt", chạm câu để xem giải thích, loa từng câu vẫn dùng bình thường với cả phần vừa mở.
- Tệp mã thay đổi: `js/reader.js`, `css/app.css`, `js/guides.js`, `js/util.js`, `sw.js` (lên bản v30). Nếu chưa đưa bản v29 (8 gói chữ Hán) lên GitHub thì gói cập nhật v30 đã **gồm luôn các tệp của v29**.

## 40. Bản v31 (19/10/2026): học nhanh nhớ lâu (đợt 6), giao diện bốn mùa, 60 thẻ chữ Hán mới

**Lịch ôn mới (nhớ lâu hơn)**
- 7 hộp: 1 → 2 → 4 → 8 → 16 → **35 → 90 ngày**. Đúng ở lần ôn 90 ngày mới thuộc hẳn. Tiến độ cũ giữ nguyên (mục đang ở hộp 5 vẫn ở hộp 5).
- "Biết rồi" giữ như cũ: đúng ở lần ôn 16 ngày là thuộc hẳn. Nút "Đã thuộc" giữ như cũ: không hỏi lại.
- Sai: hộp 1–3 về hộp 1; **hộp 4 trở lên lùi 2 hộp**.
- **Đúng mà chậm** (câu chọn đáp án của từ vựng, chữ Hán; mặc định quá 8 giây, chỉnh hoặc tắt ở Cài đặt → Học): giữ nguyên hộp. Thời gian tắt màn hình không tính.
- **Nhắc lại cuối ngày**: từ học mới hôm nay, sau ít nhất 4 giờ, có dòng "Nhắc lại … từ mới hôm nay" trong Kế hoạch hôm nay (không đổi lịch ôn).
- **Từ cứng đầu** (sai từ 4 lần, chưa thuộc): lần ôn sau hiện thẻ đầy đủ trước khi hỏi; dạng bài "Đánh từ cứng đầu"; Kho từ → Bộ lọc → Cứng đầu.

**Chế độ học và dạng luyện mới** (các chế độ cũ giữ nguyên)
- **Ôn nhanh 3 phút** (nút trên Trang chủ): đồng hồ 3 phút, mục quá hạn lâu nhất hỏi trước, đáp án dồn nửa dưới màn hình để bấm một tay, "Thêm 3 phút".
- **Học từ mới — đoán nghĩa trước**: nhìn âm Hán Việt đoán nghĩa rồi mới xem thẻ. Luyện riêng: **Đoán nghĩa từ Hán Việt**.
- **Phân biệt từ dễ nhầm** (từ vựng và mẫu ngữ pháp gần nghĩa). Thẻ từ có bảng so sánh từ dễ nhầm; chọn nhầm sang từ dễ nhầm thì hiện bảng so sánh.
- **Chữ Hán trông giống**. Ôn chữ Hán chọn nhầm sang chữ trông giống thì hiện bảng so sánh.
- **Gia đình chữ**: mục mới trong thẻ chữ; danh sách Chữ Hán có nút "Theo gia đình chữ".

**Giao diện bốn mùa** (giống bản thử `giaodien-mua-demo.html`)
- 12 tháng mỗi tháng một họa tiết; trời đổi theo giờ (trăng đúng ngày âm lịch); mưa (theo mùa mưa / thời tiết thật / luôn / tắt) có chớp; gió; ngày lễ Nhật và Việt Nam (Tết, Trung thu, 2/9…); mưa sao băng theo lịch; máy bay có vệt khói; hố đen; pháo hoa; đom đóm; đèn lồng; chùm hạt khi trả lời đúng.
- Hiệu ứng nằm phía sau thẻ, chạy ở mọi trang, cả nền sáng lẫn nền tối. Bảng, màn kết quả hiện ra mượt từ nhỏ thành to; điểm đếm lên.
- Dấu chấm bài: **○ đúng luôn màu xanh lá, × sai luôn màu đỏ** (không đổi theo mùa).
- **Cài đặt → Giao diện mùa & hiệu ứng**: chọn tháng hoặc tắt; mật độ hạt; tốc độ rơi; bật / tắt riêng từng hiệu ứng; thành phố cho thời tiết thật; nút "Thử ngay". Máy bật "giảm chuyển động" thì app tự tắt hiệu ứng.

**Dữ liệu**
- Thêm 2 gói `chuhan-46`, `chuhan-47` (60 chữ hay gặp trong câu ví dụ, bài học: 誰, 京, 大阪, 倉庫, 印鑑, 詐欺, 鮭, 鯖, 封筒, 欄…). Kho có **1.401 thẻ**. Còn 85 chữ chỉ gặp trong câu (sẽ làm tiếp).
- Sửa cách đọc sai trong ghi chú ngữ pháp `nguphap-n3-07`: 御蔭 đọc おかげ.

**Tệp mã thay đổi**: `js/srs.js`, `js/quiz.js`, `js/drill.js`, `js/learn.js`, `js/practice.js`, `js/kanji.js`, `js/words.js`, `js/wordx.js`, `js/app.js`, `js/roadmap.js`, `js/settings.js`, `js/settingspage.js`, `js/guides.js`, `js/util.js`, `css/app.css`, `sw.js`; tệp mới `js/leech.js`, `js/dot6.js`, `js/season.js`.

## 41. Bản v32 (19/10/2026): nút ‹ quay lại, nút tắt hiệu ứng nền, thanh trên trong suốt, chọn phông chữ, bảng hiện mượt hơn

**Nút ‹ quay lại (nổi)**
- Nút tròn ‹ ở góc dưới bên trái, có ở **mọi trang trừ Trang chủ**. Bấm = quay lại màn hình trước, giống nút Back của điện thoại: đang làm bài thì hỏi "Dừng lượt này?"; ở màn kết quả thì về trang trước khi vào bài.
- Mở thẳng một trang con (không có trang trước trong app) thì nút đưa về trang cha (vd. Luyện tập), rồi Trang chủ.
- **Giữ 0,7 giây** → máy rung nhẹ, nút phóng to → kéo tới chỗ khác → thả tay (rung nhẹ lần nữa). App nhớ chỗ đó trên máy này (xoay ngang máy vẫn đúng chỗ). Nút không kéo đè lên thanh trên và thanh công cụ dưới. iPhone không cho trang web rung nên chỉ không có rung, kéo vẫn được.
- Sửa kèm: rời một lượt tự bắt đầu (Ôn từ đến hạn, Học từ mới, Ôn nhanh 3 phút, Nhắc lại từ mới…) xong bấm Back thì không còn bị mở lại lượt học đó.

**Nút nhỏ "Bật / tắt hiệu ứng nền"** (góc dưới bên phải, mọi trang)
- Đang chạy thì ghi **Tắt hiệu ứng nền**; đang tắt thì ghi **Bật hiệu ứng nền**. Tắt: hạt rơi, trời, mây, mưa, sao băng, máy bay, pháo hoa, chùm hạt khi trả lời đúng… dừng hẳn; **màu và hoa văn theo mùa vẫn giữ**. Bật lại khi giao diện mùa đang "Tắt" thì app bật lại "Theo tháng".
- Cài đặt → Giao diện mùa & hiệu ứng có thêm ô **Hiệu ứng nền** (cùng công tắc với nút nhỏ). Ô "Chuyển động mượt" giờ chỉ lo phần giao diện, không tắt hiệu ứng nền nữa. Máy bật "giảm chuyển động" thì hiệu ứng nền vẫn không chạy (bấm Bật sẽ có thông báo).
- Hai nút nổi nằm sát trên thanh công cụ; khi có khay nút (Tiếp, Đã thuộc…) thì nổi lên trên khay. Ôn nhanh 3 phút chừa chỗ để nút không đè đáp án. Cuối trang chừa thêm một khoảng để nút không che chữ.

**Thanh trên trong suốt**: thanh có tiêu đề "Tiếng Nhật Thực Chiến" trong suốt, liền với nền mùa phía dưới; cuộn trang xuống thì thanh thành kính mờ để chữ của trang không đè lên tiêu đề.

**Chọn phông chữ** (Cài đặt → Giao diện → Phông chữ Nhật / Phông chữ Việt; bấm mở mới tải mẫu xem trước)
- Chữ Nhật (14 kiểu): Thường — Gothic (mặc định của máy), Mincho, UD Gothic, Mincho thanh lịch · Viết tay — Viết tay chuẩn (giống chữ sách giáo khoa), Viết tay nhẹ nhàng, Viết tay tròn dễ thương, Bút dạ · Thư pháp — Thư pháp bút lông, Thư pháp nét đậm, Bút lông mềm · Mềm mại — Tròn mềm mại, Tròn nét bút, Tròn hiện đại.
- Chữ Việt (13 kiểu): Mặc định của máy, Be Vietnam Pro, Lexend, có chân như sách, có chân mềm · Viết tay, Viết tay bút bi, Viết tay chữ in, Viết tay tròn · Thư pháp nét liền, Thư pháp mềm · Tròn mềm mại, Tròn nét mảnh.
- Phông "mặc định" có sẵn trong máy. Phông khác tải từ Google Fonts lần đầu chọn (cần mạng; Google thấy địa chỉ mạng của máy), sau đó app giữ lại để dùng khi không có mạng. Phông tiếng Nhật chỉ tải phần chữ đang hiện. Chữ Hán hiếm mà phông không có thì hiện bằng phông của máy.

**Bảng hiện mượt hơn**: màn kết quả và bảng chi tiết phóng từ nhỏ ra, chậm dần về cuối (không còn nảy), các dòng kết quả nối nhau hiện lên; đóng bảng cũng mờ dần rồi mới biến mất.

**Tệp thay đổi**: `js/backfab.js` (mới), `js/fonts.js` (mới), `js/season.js`, `js/settings.js`, `js/settingspage.js`, `js/nav.js`, `js/app.js`, `js/ui.js`, `js/guides.js`, `js/util.js`, `css/app.css`, `sw.js`, `HUONG-DAN.md`.

Nếu chưa đưa bản v31 lên GitHub thì đưa thẳng gói v32 (đã gồm cả thay đổi của v31).

## 42. Bản v33 (19/10/2026): bảng "Bật / tắt hiệu ứng nền", toàn màn hình trên Android

**Nút "Bật / tắt hiệu ứng nền ▴"** (góc dưới bên phải, mọi trang; nhỏ và hơi trong như bản v32) giờ là nút **mở / thu gọn bảng**, giống hệt nút "Bảng thử" trong bản thử, chỉ khác tên. Bảng mở ra thì nút ghi **Đóng bảng ▾**. Trong bảng:
- Ô **Hiệu ứng nền** (tắt thì hạt rơi, trời, mưa, sao băng… dừng hẳn; màu và hoa văn theo mùa vẫn giữ).
- Giao diện mùa (Theo tháng / Tắt / Tháng 1–12), Nền (Theo máy / Sáng / Tối), Mưa, Mật độ hạt, Tốc độ rơi — là cài đặt thật, lưu lại như trong Cài đặt (hai nơi tự khớp nhau).
- **Xem thử (tạm thời)**: Buổi (bình minh, ngày, hoàng hôn, đêm), Mưa (không / nhẹ / to có giông), Ngày lễ (Tết, Trung thu, 2/9, các lễ Nhật…). Mở lại app là về như thật; nút "Về như thật" bỏ ngay.
- Bật / tắt từng hiệu ứng (16 ô, có cả "Chuyển động mượt") và 10 nút "Thử ngay".

**Toàn màn hình trên Android**: app cài trên màn hình chính chạy toàn màn hình, ẩn thanh trạng thái (giờ, pin, sóng) và thanh điều hướng của máy. Muốn xem giờ, pin thì vuốt từ mép trên xuống. Máy có tai thỏ / lỗ camera thì thanh trên của app tự chừa chỗ.
- Chrome tự nhận thay đổi này khi mở app (có thể mất tới một ngày). Muốn có ngay: gỡ biểu tượng app trên màn hình chính rồi cài lại từ Chrome (menu ⋮ → Cài đặt ứng dụng / Thêm vào màn hình chính). Trước khi gỡ, vào **Dữ liệu** bấm đồng bộ cho chắc (tiến độ được lưu trên GitHub); cài lại xong, nếu thấy trống thì đồng bộ để lấy về.
- iPhone không cho trang web ẩn thanh trạng thái nên trên iPhone vẫn như cũ.

**Tệp thay đổi**: `js/fxpanel.js` (mới), `js/season.js`, `js/app.js`, `js/settingspage.js`, `js/guides.js`, `js/util.js`, `css/app.css`, `manifest.webmanifest`, `sw.js`, `HUONG-DAN.md`.

## 43. Bản v34 (19/10/2026): sửa nghĩa các thể của động từ, tính từ

Rà lại nghĩa mà app tự ghép cho các thể (có thể …, đã …, đang …, bị / được …, không …) của **1.008 động từ** (409 nhóm 1, 224 nhóm 2, 6 nhóm 3, 369 danh từ + する) và **253 tính từ**.

- **Danh từ + する**: app lấy nghĩa động từ chứ không lấy nghĩa danh từ. 料理する: "có thể nấu ăn, đã nấu ăn" (trước là "có thể món ăn, đã món ăn"); 質問する: "có thể hỏi" (trước là "có thể câu hỏi"). Nghĩa ghi "sự …, việc …, cuộc …" thì bỏ chữ đó khi ghép (sự gia tăng → đã gia tăng).
- Sửa nghĩa trong dữ liệu của 61 từ để nghĩa động từ / tính từ đứng đầu: 料理, 合計, 注文, 表現, メモ, 機能, 乾燥, 左右, ミス, 言い訳, 契約, 希望, 志望, 意識, いたずら, 平均, 要求, 噂, 恋, 成人, 感謝, 呼吸, 苦労, スピーチ, 活動, 命令, 通勤, サイン, デート, 借金, 代表, 研修, 計画, 約束, 経験, 故障, 会話, 下宿, ごちそう, プレゼント, 食事, 質問, 滞納, 指示, 夜勤, けが, 控除, セット, 可能, 不自由, とんでもない, マジ, やばい, 平気, よろしい, 盛ん, 久しぶり, 散らす, 湿る, 欠く, 澄む (giữ nguyên mã từ nên tiến độ học không mất).
- Phần trong ngoặc không còn làm hỏng nghĩa ghép: "(trời) mưa" → "có thể mưa"; ghi chú sau dấu gạch dài bị bỏ (マジ "thật — khẩu ngữ giới trẻ" → "thật").
- Thể bị động của từ vốn đã mang chữ "bị" (刺さる bị đâm, けが bị thương) ghi "bị đâm (bị động)", không còn "bị / được bị đâm".
- Tính từ có nghĩa bắt đầu bằng "không" (だめ không được): phủ định ghi "không phải là không được", không còn "không không được".

**Tệp thay đổi**: `js/conj.js`, `js/adj.js`, `js/forms.js`, `js/practice.js`, `js/wordx.js`, `js/util.js`, `sw.js`, `HUONG-DAN.md`, `data/manifest.json` và 39 gói từ vựng (jlpt-n5-07, jlpt-n5-09, jlpt-n4-08…18, jlpt-n3-03…44, thuevisa-01, xuong-01, xuong-02).

## 44. Bản v35 (19/10/2026): đủ thẻ cho mọi chữ Hán trong app

- Thêm 3 gói `chuhan-48`, `chuhan-49`, `chuhan-50` — 86 thẻ cho các chữ trước đây chỉ gặp trong câu ví dụ, bài mở đầu, ghi chú (浮, 構, 領, 副, 旬, 縦, 潮, 簿, 痢, 塾, 庁, 捌, 鰓, 鰭, 串, 麺, 琵琶…). Kho có **1.487 thẻ**: chữ Hán nào xuất hiện ở bất kỳ đâu trong app cũng chạm vào mở được thẻ.
- Chữ người Nhật hay viết bằng kana (けんか, まぶしい, ほうき, つまずく, しつけ…) có ghi "thường viết …" trong ghi chú. 躾 là chữ người Nhật tự đặt, app tạm đọc MỸ.

**Tệp thay đổi**: `data/packs/chuhan-48.json`, `chuhan-49.json`, `chuhan-50.json` (mới), `data/manifest.json`, `js/util.js`, `sw.js`, `HUONG-DAN.md`.

## 45. Bản v36 (20/10/2026): giáo trình N2 đủ 40 bài

- **Giáo trình N2 (gói `baihoc-n2`)**: 40 bài theo mẫu ngữ pháp, mỗi bài có bài mở đầu, ngữ pháp, từ vựng và 5 chữ Hán mới. Trước đây N2 chỉ có bài tự sinh; nay giống N3.
  - Ngữ pháp: 40 gói `nguphap-n2-01` … `40`, **120 mẫu** (〜上で, 〜に際して, 〜あげく, 〜ばかりに, 〜限り, 〜にかかわらず, 〜に基づいて, 〜をめぐって, 〜かねない, 〜ざるを得ない, 〜ものの, 〜ことか, 〜つつ, 〜ものとする…). Mỗi mẫu đủ 7 phần và 10 câu ví dụ, có dữ liệu cho các bài tập.
  - Từ vựng: 40 gói `jlpt-n2-01` … `40`, **1.943 từ** theo chủ đề từng bài (hợp đồng, an toàn, đơn hàng, tuyển dụng, thuế và bảo hiểm, nội quy…). Câu ví dụ sát việc ở xưởng thủy sản, giấy tờ và đời sống ở Hyogo.
  - Bài mở đầu: 40 gói `modau-n2-01` … `40` (34 hội thoại, 6 bài đọc: thông báo thi công, bài báo kinh tế Hyogo, bản tin, thư trang trọng, thông báo của tòa thị chính, thông báo sửa nội quy). Câu chuyện nối tiếp: anh Nguyễn làm tổ trưởng, ôn và thi N2. Mỗi bài có 5 câu hỏi.
- **Thẻ chữ Hán**: thêm 9 gói `chuhan-51` … `chuhan-59`, tổng **256 thẻ**, gồm mọi chữ trong từ và câu N2 và các chữ thường dùng còn thiếu (竹, 往, 系, 童, 透, 露…). Có thêm chữ ngành thủy sản 鯛, 蟹, 鰹, 苔, 昆.
- **Sửa âm Hán Việt** của chữ nhiều âm ở 49 từ cũ, ví dụ:
  - 流行 LƯU HÀNH, 行動 HÀNH ĐỘNG, 計画 KẾ HOẠCH;
  - 社長 XÃ TRƯỞNG, 成長 THÀNH TRƯỞNG, 楽しい LẠC;
  - 貿易 MẬU DỊCH, 首相 THỦ TƯỚNG, 適当 THÍCH ĐÁNG, 食中毒 THỰC TRÚNG ĐỘC, 興味 HỨNG VỊ…
- **Chạm vào câu để xem nghĩa từ**: câu có 行きます, 休みたい, 思います trước đây bị dò thành danh từ (行き "lượt đi", 休み "ngày nghỉ"). Nay app nhận đúng là động từ 行く, 休む, 思う.

**Tệp thay đổi**: 
- Gói mới: `data/packs/baihoc-n2.json`, `nguphap-n2-*.json`, `jlpt-n2-*.json`, `modau-n2-*.json`, `chuhan-51` … `chuhan-59.json`.
- Gói sửa âm Hán Việt: 24 gói từ vựng N3, N4, thủy sản và xưởng.
- Khác: `data/manifest.json`, `js/explain.js`, `js/util.js`, `sw.js`, `HUONG-DAN.md`.

## 46. Bản v37 (20/10/2026): hiệu ứng mượt theo tần số quét màn hình (60 / 90 / 120 Hz)

- **Hiệu ứng nền**: trước đây tối đa 30 khung/giây. Nay vẽ theo tần số quét của màn hình: 60, 90, 120 Hz… thì vẽ đủ bấy nhiêu khung mỗi giây.
  - App tự đo tần số quét khi mở và khi đổi màn hình.
  - Ở Cài đặt → "Khung hình hiệu ứng nền" (hoặc bảng "Bật / tắt hiệu ứng nền") chọn được: **Theo màn hình** (mặc định), **60**, **90**, **120**. Chọn số nhỏ để đỡ tốn pin. Chọn số lớn hơn màn hình thì chạy tối đa bằng màn hình.
  - Có dòng đo trực tiếp, ví dụ: "Màn hình ~120 Hz · nền đang vẽ 120 khung/giây".
  - Tốc độ rơi, gió, pháo hoa tính theo thời gian thật, nên ở 60, 90 hay 120 khung trông như nhau, chỉ mượt hơn.
  - Máy không theo kịp (vẽ một khung tốn quá nửa thời gian cho phép, liên tục khoảng 1,5 giây) thì app tự giảm độ nét và số hạt một bậc, đỡ giật.
  - Vẽ nhẹ hơn: hạt vẽ sẵn thành ảnh nhỏ; sao gom theo độ sáng, mỗi nhóm tô một lần.
- **Chuyển trang, bảng chi tiết, màn kết quả** chạy hoàn toàn trên GPU, theo tần số quét màn hình.
  - Trang mới hiện bằng mờ + dịch (transform) thay vì đổi vị trí `top` (trước đây trình duyệt phải dựng lại bố cục mỗi khung).
  - Bảng chi tiết chờ dựng xong nội dung (2 khung) rồi mới trượt lên. Trên điện thoại bảng chỉ trượt, không phóng to, nên chữ nét và mượt hơn.
  - Nút nổi nhấc lên bằng translate. Đáp án đúng chỉ phóng nhẹ, bỏ vầng bóng phải vẽ lại mỗi khung.
- **Trang nặng mở nhanh hơn**: trang Chữ Hán (1.743 thẻ) chia khối 60 chữ, và các danh sách dài (Ngữ pháp, Từ vựng…) chỉ dựng phần đang thấy trên màn hình. Đo trên máy giả lập điện thoại chậm:
  - Chữ Hán: thời gian dựng bố cục từ 373 ms còn 29 ms; khung giật dài nhất khi mở trang từ 650 ms còn 117 ms.
  - Ngữ pháp: 146 ms còn 37 ms.

**Lưu ý**: một số điện thoại khóa trình duyệt ở 60 Hz khi bật tiết kiệm pin hoặc chế độ "tần số quét tiêu chuẩn". Khi đó dòng đo hiện "~60 Hz"; tắt tiết kiệm pin hoặc chọn "tần số quét cao / thích ứng" trong cài đặt màn hình của máy.

**Tệp thay đổi**: `js/season.js`, `js/fxpanel.js`, `js/settingspage.js`, `js/settings.js`, `js/ui.js`, `js/kanji.js`, `css/app.css`, `js/util.js`, `sw.js`, `HUONG-DAN.md`.

## 47. Bản v38 (20/10/2026): ghép 8 cặp giữa lượt, đánh dấu ★ để ôn, nghĩa sát nhất đứng đầu

- **Đổi trắc nghiệm ↔ ghép 8 cặp ngay trong lượt.** Lúc ôn, luyện từ của bài học, ôn chữ Hán, ôn bài cũ…, dưới thanh tiến độ có hai nút **Trắc nghiệm / Ghép 8 cặp**.
  - Bấm "Ghép 8 cặp" thì các từ còn lại của lượt đem ra ghép: nghĩa Việt ↔ từ Nhật. Với chữ Hán thì ghép chữ ↔ âm Hán Việt + nghĩa. Mỗi màn tối đa 8 cặp.
  - Bấm "Trắc nghiệm" thì quay lại hỏi tiếp những từ chưa ghép. Tiến độ và điểm của lượt giữ nguyên.
  - Ghép đúng ngay tính là đúng. Đã từng ghép nhầm thì tính là sai, vào danh sách "Từ trả lời sai". Cả hai đều ghi vào lịch ôn như trả lời trắc nghiệm.
  - Trang Trắc nghiệm (#/hoc) và Ôn chữ Hán có thêm mục **Kiểu luyện**, chọn được bắt đầu bằng ghép 8 cặp.
  - Câu ngữ pháp, câu gõ, câu sắp xếp vẫn hỏi như cũ, sau phần ghép.
- **Đánh dấu ★ để ôn riêng.**
  - Nút ★ có ở thẻ từ, thẻ chữ Hán, phần đáp án sau mỗi câu và mỗi dòng trong Kho từ. Bấm lần nữa để bỏ.
  - Dấu lưu cùng tiến độ học, nên đồng bộ và sao lưu được.
  - Trang mới **Luyện tập → Đã đánh dấu ★** liệt kê các từ và chữ đã đánh dấu, mỗi phần có nút "Trắc nghiệm" và "Ghép 8 cặp". Từ chưa học cũng hỏi luôn, không hiện thẻ giới thiệu.
  - Kho từ có bộ lọc "Đã đánh dấu ★". Trắc nghiệm và Ôn chữ Hán có nguồn "Đã đánh dấu ★".
- **Nghĩa sát nhất đứng đầu.** Từ có từ Hán Việt tương ứng mà người Việt dùng cùng nghĩa thì từ đó đứng đầu phần dịch, ví dụ:
  - 同時 "đồng thời, cùng lúc"; 確認 "xác nhận, kiểm tra"; 正確 "chính xác, chuẩn xác"; 突然 "đột nhiên, bất thình lình"; 管理 "quản lý, trông coi".
  - Đã soát hơn 2.700 từ, đổi 102 từ trong 57 gói.
  - Từ "giả bạn" giữ nguyên, ví dụ 品質 là chất lượng chứ không phải phẩm chất, 勉強 không phải miễn cưỡng, 工場 không phải công trường.
  - Danh từ + する thì phần đầu phải dùng được như động từ, để các thể chia ra vẫn đúng ("đã xác nhận").

**Tệp thay đổi**:
- Mã: `js/pairs8.js` (mới), `js/marks.js` (mới), `js/quiz.js`, `js/drill.js`, `js/kanji.js`, `js/words.js`, `js/wordx.js`, `js/practice.js`, `js/app.js`, `js/nav.js`, `css/app.css`, `js/util.js`, `sw.js`.
- Dữ liệu: 57 gói từ vựng, `data/manifest.json`.
- `HUONG-DAN.md`.

## 48. Bản v39 (20/10/2026): bấm sang trang không khựng; ghép 8 cặp có "Quên — xem đáp án"

**Bấm nút ở Trang chủ không còn khựng** (đo trên máy giả lập chạy chậm 4 lần, gần với điện thoại tầm trung):

| Trang | Trước | Nay (thấy phản hồi) | Nay (có nội dung) |
|---|---|---|---|
| Lộ trình | 9,5 giây | ~0,01 giây | ~0,1–0,2 giây |
| Ôn nhanh 3 phút | 1,8 giây | ~0,01 giây | ~0,1–0,3 giây |

- **Sửa tận gốc:**
  - Lộ trình trước đây, với mỗi bài, quét lại cả hơn 5.000 từ để tìm "từ liên quan". Nay dùng bảng tra chữ Hán → từ, dựng một lần (nhanh hơn khoảng 50 lần).
  - Ôn nhanh 3 phút, Ôn hỗn hợp chỉ dựng đáp án nhiễu cho câu đang hiện, không dựng trước cả 80 câu.
  - Thống kê từng cấp, danh sách mục đến hạn, chữ của ngày được nhớ tạm, chỉ tính lại khi tiến độ học đổi.
- **Tính trước lúc rảnh:** mở app xong, lúc máy rảnh app tính sẵn kho câu, danh sách bài, chỉ mục chữ Hán, trạng thái các bài, mục đến hạn.
- **Phản hồi ngay khi chạm:**
  - Vòng sáng loang dưới ngón tay; thẻ, dòng bài học, nút dưới đáy lún nhẹ.
  - Trang nào lần trước dựng lâu (từ 35 ms) thì hiện ngay khung trang (tiêu đề thật, khối xám lấp lánh) và thanh tiến trình mảnh ở mép trên, nội dung điền vào ở khung hình sau. Trang nhanh vẫn hiện thẳng, không nhấp nháy.
  - Mọi hiệu ứng này chạy trên GPU nên vẫn trôi khi máy đang bận.

**Ghép 8 cặp:**
- **Nút "💡 Quên — xem đáp án":** cột trái đứng yên, các ô bên phải trượt lên / xuống về đúng hàng của ô đúng bên trái (mọi ô trong màn cao bằng nhau nên ngang hàng thật). Ghép lại các cặp đó để nhớ.
- Xem đáp án tính là **sai**, trừ từ / chữ đã bấm **"Đã thuộc"**: không tính gì, vẫn giữ Đã thuộc.
- **Màn cuối chưa đủ 8 cặp thì thêm cho đủ**, áp dụng ở mọi lượt và ở trang Đã đánh dấu (đánh dấu 1 từ cũng ghép được).
  - Thứ tự lấy: mục đến hạn ôn (quá hạn lâu trước) → sắp quên (đến hạn trong 2 ngày, hoặc hay sai) → mới học 7 ngày qua.
  - Chỉ lấy mục đã học và chưa "Đã thuộc"; cùng kiểu (từ hoặc chữ Hán).
  - Ô của mục thêm có chấm nhỏ. Kết quả ghi vào lịch ôn nhưng không tính vào điểm lượt.

**Từ "Đã thuộc":**
- Không bao giờ đến hạn ôn nữa.
- Chọn sai đáp án ở bài luyện từ vựng / chữ Hán thì quay lại lịch ôn, kể cả bài "không đổi lịch ôn" (Đoán nghĩa Hán Việt…).
- Câu dài (dịch câu, ngữ pháp) giữ như cũ.

**Tệp thay đổi**:
- Mã: `js/app.js`, `js/lesson.js`, `js/dot6.js`, `js/practice.js`, `js/roadmap.js`, `js/srs.js`, `js/sync.js`, `js/kanji.js`, `js/pairs8.js`, `js/quiz.js`, `js/drill.js`, `js/marks.js`, `css/app.css`, `js/util.js`, `sw.js`.
- `HUONG-DAN.md`.

## 49. Bản v40 (20/10/2026): trang dựng từng phần, hiệu ứng nền chạy ở luồng riêng

Đo trên máy giả lập chạy chậm 4 lần (gần điện thoại tầm trung), thời gian đứng hình lâu nhất khi bấm sang trang:

| Trang | v39 | v40 |
|---|---|---|
| Kiểm tra trình độ | 1.124 ms | dưới 50 ms |
| Dữ liệu | 452 ms | ~80–100 ms |
| Ôn nhanh 3 phút | 260 ms | ~80–110 ms |
| Lộ trình | 241 ms | ~70–100 ms |
| Học từ mới · Luyện tập · Ngữ pháp · Ghép câu · Kho từ | 118–174 ms | ~50–100 ms |
| Sang câu sau trong lượt học | 55–110 ms | phần lớn dưới 50 ms |

Phần còn lại của mỗi lần chuyển trang chủ yếu là trình duyệt tính bố cục và dựng chữ Nhật lần đầu.

**Dựng từng phần:**
- Phần vừa đủ một màn hình hiện ngay; phần sau dựng dần, mỗi khung hình một mẻ nhỏ.
- Chỗ chưa xong có vòng ⟳ "Đang tải…". Vòng chỉ lộ ra nếu chờ quá 0,15 giây, nên không nhấp nháy. Ở chế độ giảm chuyển động thì vòng đứng yên.
- **Lộ trình:**
  - Chặng đang học hiện ngay, các chặng sau điền dần.
  - "Danh sách N bài" và "Theo gói dữ liệu" chỉ dựng khi mở.
  - Cuộn tới đâu ưu tiên dựng tới đó.
- **Kiểm tra trình độ:** đề soạn sẵn ở nền, từng phần; số câu hiện khi soạn xong; bấm Bắt đầu là dùng luôn đề đó.
- **Kiểm tra cuối bài, Ôn bài cũ, Tình huống thật:** soạn đề từng phần, có vòng chờ.
- **Danh sách dài (Dữ liệu, Ngữ pháp, Kho từ, Chữ Hán):** ghép dần từng mẻ. Dòng ngoài màn hình chưa được tính bố cục và vẽ cho tới khi cuộn tới.
- **Bài học:** các câu của bài đọc, các bước và dòng từ nằm ngoài màn hình cũng chưa được tính bố cục cho tới khi cuộn tới.
- **Luyện tập:** các thẻ hiện ngay, con số điền sau.
- **Các trang chọn bài luyện** (Ghép câu, Thể động từ trong câu…): dòng "Có N câu phù hợp" đếm sau khi trang đã hiện.
- **Thẻ từ mới:** phần dưới (ví dụ, bảng chia, đồng nghĩa…) dựng ở khung hình sau.

**Tính nhanh hơn:**
- Đáp án nhiễu: tra bảng "nghĩa → từ" thay vì so nghĩa với cả kho 5.000 từ, và chỉ giữ ~16 ứng viên tốt nhất thay vì xếp cả kho. Nhanh hơn khoảng 3 lần.
- Câu kế được soạn sẵn trong lúc đang làm câu hiện tại.
- Phần ngữ pháp của mọi câu ví dụ dựng thành bảng một lần.
- Cách chia mảnh câu ví dụ được nhớ lại, không chia lại mỗi lần.
- **Sửa lỗi của v39:** việc tính sẵn lúc rảnh trước đây có thể chạy khi dữ liệu chưa tải xong (điện thoại tải lâu hơn 1,2 giây), nên không có tác dụng. Nay chỉ chạy sau khi dữ liệu đã tải.
- Trình duyệt không còn phải tính lại kiểu cả trang mỗi khi trang dài thêm.

**Hiệu ứng nền chạy ở luồng riêng** (Web Worker + OffscreenCanvas):
- Trang dựng nặng cỡ nào nền cũng vẫn trôi đều. Đo thử: luồng chính bận 1,6 giây, nền vẫn vẽ đều, không khung nào trễ quá 17 ms.
- Máy hoặc trình duyệt không hỗ trợ thì tự vẽ ở luồng chính như trước.
- Bảng hiệu ứng nền ghi "(luồng riêng)" cạnh số khung/giây.
- Quầng sáng của mây, đom đóm, đèn lồng, trăng được vẽ sẵn một lần thay vì tạo lại dải màu ở mỗi khung.

**Tệp:**
- Mới: `js/lazy.js` (dựng từng phần, vòng ⟳), `js/fxcore.js` (lõi vẽ nền), `js/fxworker.js` (luồng vẽ nền).
- Sửa: `js/app.js`, `js/roadmap.js`, `js/lesson.js`, `js/level.js`, `js/practice.js`, `js/quiz.js`, `js/drill.js`, `js/gdrill.js`, `js/grammar.js`, `js/words.js`, `js/wordx.js`, `js/learn.js`, `js/kanji.js`, `js/datapage.js`, `js/season.js`, `js/fxpanel.js`, `js/util.js`, `css/app.css`, `sw.js`.

## 50. Bản v41 (20/10/2026): câu chữ Hán để trần theo trình độ, nút "Chưa học" cho chữ Hán

**Câu chữ Hán để trần (không furigana)** là câu "Kanji → cách đọc": hiện từ bằng chữ Hán không có furigana, chọn cách đọc. Công tắc nằm ở Cài đặt → Hiển thị, đồng bộ giữa các máy, có 3 mức:

- **Theo trình độ** (mặc định): chỉ hỏi để trần từ thoả **cả hai** điều kiện:
  - Từ thuộc cấp đã qua hoặc cấp đang học trong Lộ trình.
  - **Mọi** chữ Hán trong từ đều đã học thẻ chữ, và không chữ nào đang gắn nhãn "cần học lại".
- **Tắt:** không hỏi để trần ở mọi chỗ app tự trộn (Trộn, Ôn hỗn hợp, Ôn nhanh 3 phút, luyện và kiểm tra trong bài học, Đã đánh dấu, Đánh từ cứng đầu, Kiểm tra theo gói).
- **Luôn:** như trước v41.

Từ chưa đủ điều kiện thì lịch ôn hướng "đọc" của từ đó **chờ**: không tính là đến hạn, không dồn lại. Khi từ đủ điều kiện (hoặc bật lại công tắc), lịch ôn chạy tiếp từ chỗ cũ.

- **Tự chọn kiểu "Kanji → cách đọc"** trong Trắc nghiệm vẫn làm được ở mọi mức. Ở mức "Theo trình độ", app chỉ lấy các từ đủ điều kiện.
- **Gợi ý nghĩa tiếng Việt** dưới chữ để trần: mặc định bật, tắt được ở Cài đặt.
- **Xếp lớp, Thi vượt cấp, Thi thử:** không theo công tắc, luôn làm như đề thật để không đánh giá nhầm trình độ.
  - Màn kết quả có điểm từng phần (Từ vựng, Đọc chữ Hán, Thẻ chữ Hán, Ngữ pháp, Đọc hiểu, Nghe).
  - Thêm khung **Nhận xét** chỉ phần còn yếu và việc nên học. Ví dụ: "Đọc chữ Hán còn yếu trong khi nghĩa từ tốt → học thẻ chữ Hán cấp này…".
- **Nhóm luyện mặt chữ** (thẻ chữ Hán, Chữ Hán trông giống, bảng kana) giữ như cũ, không furigana.
- **Đếm số và Ghép cặp "Kana – Kanji":** ở mức "Theo trình độ" chỉ lấy chữ Hán đã học.

**Nút "Chưa học" cho chữ Hán:**
- **Nút nằm ở:**
  - Dải "Chữ Hán trong từ" hiện sau khi trả lời câu để trần.
  - Thẻ chữ Hán (khi chạm vào chữ).
- **Trong danh sách Chữ Hán,** chữ đang gắn nhãn có dấu ↺.
- **Bấm "Chưa học" thì:**
  1. Chữ đó gắn nhãn **cần học lại** (kể cả khi thuộc cấp đã học). Mọi từ có chữ này hiện lại furigana, không bị hỏi để trần.
  2. Nếu câu vừa làm trả lời **sai**, câu đó không tính điểm: không ghi sai vào lịch ôn, không hỏi lại cuối lượt, và câu hiện furigana.
  3. Chữ lên **đầu hàng "Học chữ Hán mới"**. Tiến độ cũ giữ nguyên.
  4. **Nhãn tự gỡ** khi trả lời đúng chữ đó trong "Học chữ Hán mới", hoặc trả lời đúng câu hỏi thẻ chữ đó 2 lần liền ở bất kỳ đâu.
  5. Thông báo có nút **Hoàn tác**. Trên thẻ chữ có nút **"Đã học lại ✓"** để tự gỡ nhãn.

**Tệp:**
- Mới: `js/bare.js`.
- Sửa: `js/srs.js` (nhãn cần học lại, bộ lọc hướng ôn), `js/sync.js` (đồng bộ nhãn), `js/quiz.js`, `js/drill.js`, `js/practice.js`, `js/level.js`, `js/dot6.js`, `js/marks.js`, `js/notes.js`, `js/match.js`, `js/kanji.js`, `js/app.js`, `js/settingspage.js`, `js/util.js`, `css/app.css`, `sw.js`.

## 51. Bản v42 (20/10/2026): nút nổi đứng yên; bầu trời đêm mới; bài tập ngữ pháp N5

**Hai nút nổi đứng yên một chỗ.** Nút ‹ (quay lại) và nút "Bật / tắt hiệu ứng nền" nay đặt cố định ngay trên chỗ của khay nút (Tiếp, Đã thuộc…).
- Không còn nhảy lên xuống mỗi lần trả lời câu hỏi.
- Không che nút Tiếp hay các nút khác.
- Nội dung cuối trang tự chừa chỗ để không bị nút che.

**Hiệu ứng nền:**
- **Mỗi ngày lễ có màu riêng như Tết:**
  - Trung thu vàng cam, Quốc khánh đỏ cờ, お正月 đỏ son, 節分 cam đất, こどもの日 xanh cờ cá chép.
  - 七夕 tím chàm, お盆 cam đèn lồng, 十五夜 vàng trăng, Giáng sinh xanh lá, 大晦日 vàng kim.
  - Đêm có mưa sao băng thì ngả tím.
- **Sao băng:** dày hơn (đêm thường vài giây một vệt, mưa sao băng gần như liên tục), có lúc hai vệt liền nhau. Nhiều màu (trắng, xanh băng, vàng, hồng, lục, tím), có đầu sáng, rơi theo hai hướng.
- **Máy bay:** nhiều hơn (khoảng 12–30 giây một chiếc). Có chiếc to (bay gần, nhanh), có chiếc nhỏ. Bay ngang, bay dọc hoặc bay chéo, có vệt khói; ban đêm có đèn nháy.
- **Đèn lồng:** ngày lễ dày gấp đôi, nhiều màu hơn. Đêm thường cũng có **đèn trời** (khổng minh) bay lên, lửa chập chờn.
- **Chòm sao theo mùa:** 3 chòm (màn rộng 4 chòm), gồm Bắc Đẩu, Thiên Hậu, Lạp Hộ (Orion), Song Tử, Xử Nữ, Sư Tử, Thiên Yết, Thiên Nga, Chức Nữ, Ngưu Lang.
  - Sao lấp lánh, đường nối sáng lên tắt xuống, có đốm sáng chạy dọc đường nối, tên chòm (tiếng Việt và tiếng Nhật) mờ mờ bên dưới; cả chòm trôi nhẹ.
  - Đêm 七夕 luôn có Chức Nữ và Ngưu Lang.
- **Dải ngân hà:** lõi sáng, mây sao hồng, tím, xanh, vệt bụi tối và hàng nghìn sao nhỏ. Dải xoay chậm, lúc vắt ngang, lúc vắt dọc, lúc chéo (khoảng 25 phút một vòng).
- **Hố đen:** hay xuất hiện hơn và hút xoáy **mọi** vật ở gần hoặc bay ngang qua: hạt rơi, sao băng, máy bay, đèn lồng, đom đóm, pháo hoa, cá chép.
  - Vật càng gần càng quay nhanh, nhỏ dần rồi biến mất; mỗi lần "nuốt" vành sáng lóe lên.
- **Công tắc mới:** "Chòm sao" và "Dải ngân hà", trong bảng hiệu ứng và trong Cài đặt.

**Bài tập ngữ pháp N5:** 39 mẫu của các gói `nguphap-n5-02` … `-12` trước đây chỉ có giải thích và câu ví dụ. Nay có đủ:
- Phương án sai (lỗi người Việt hay mắc) cho từng câu ví dụ.
- Câu tìm chỗ sai, tình huống chọn cách nói, câu đổi lối nói (thân mật / Kansai → lịch sự).
- Mảnh ghép cho câu đủ dài.

Nhờ vậy các dạng bài Sắp xếp câu, Tìm chỗ sai, Chọn cách nói, Đổi lối nói đều có câu N5.

**Tệp:**
- Mã: `css/app.css`, `js/fxcore.js`, `js/season.js`, `js/settings.js`, `js/fxpanel.js`, `js/settingspage.js`, `js/util.js`, `sw.js`.
- Dữ liệu: `data/packs/nguphap-n5-02.json` … `nguphap-n5-12.json`, `data/manifest.json`.

## 52. Bản v43 (20/10/2026): chòm sao hết giật; thêm gần 950 câu ví dụ từ vựng

**Chòm sao không còn thỉnh thoảng giật.** Trước đây bầu trời đêm bị gieo lại từ đầu (chòm sao, sao, mây nhảy sang chỗ khác) trong các trường hợp sau:
- Thanh địa chỉ của trình duyệt điện thoại hiện / ẩn khi cuộn trang.
- Quay lại app.
- Lưu một cài đặt bất kỳ.
- Mỗi 10 phút app làm mới thời tiết.

Nay bầu trời chỉ đặt lại khi thật sự cần: sang tháng mới (đổi chòm theo mùa), xoay máy, đổi mật độ hiệu ứng, bật / tắt chòm sao. Tên chòm sao cũng không phải đo lại mỗi khung hình.

**Câu ví dụ từ vựng:** thêm 948 câu, mỗi câu một tình huống khác với các câu đã có (đời sống, ở xưởng, giấy tờ, hội thoại, giọng Kansai):
- N5: mọi từ có ít nhất 2 câu, động từ và tính từ có ít nhất 3 câu.
- N3: động từ và tính từ có ít nhất 3 câu.
- Các gói chủ đề (xưởng, thủy sản, thuế – visa, Kansai) và hai gói N2.

Câu ví dụ cũ chưa ghi tình huống nay được gắn nhãn, nên thẻ từ xếp câu theo nhóm tình huống.

**Tệp:**
- Mã: `js/fxcore.js`, `js/season.js`, `js/util.js`, `sw.js`.
- Dữ liệu: các gói `jlpt-n5-*`, `jlpt-n3-*`, `xuong-*`, `thuysan-*`, `kansai-01`, `thuevisa-01`, `jlpt-n2-23`, `jlpt-n2-33`, `data/manifest.json`.
