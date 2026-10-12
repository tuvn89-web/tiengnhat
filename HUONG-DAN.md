# Tiếng Nhật Thực Chiến — hướng dẫn cài đặt

App là một trang web cài được như ứng dụng (PWA). Mở một lần khi có mạng, từ đó dùng offline trên điện thoại Android và máy tính. Tất cả miễn phí.

Gồm hai kho trên GitHub:

| Kho | Chế độ | Chứa gì |
|---|---|---|
| `tiengnhat` | **Công khai** (GitHub Pages miễn phí chỉ chạy với kho công khai) | Code app + gói từ vựng, ngữ pháp. Không có thông tin cá nhân. |
| `tiengnhat-tiendo` | **Riêng tư** | Tiến độ học, từ tự thêm. Chỉ Cậu Cả xem được. |

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
> App của Cậu Cả ở `https://tuvn89-web.github.io/tiengnhat/`, nên tên tài khoản là **`tuvn89-web`**.
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
  - **Thể động từ trong câu:** câu ngẫu nhiên ở các thể Cậu Cả đánh dấu đã học (bị động, sai khiến, sai khiến bị động, khả năng…). Chạm vào thể để bật / tắt — danh sách "thể đã học" đồng bộ sang mọi máy.
  - **Tính từ trong câu**, **Chia động từ**, **Đếm số** (trợ số từ có âm biến), Bài tập ngữ pháp, Thi thử.
- **Thi thử:** chọn đáp án rồi bấm **Tiếp tục** mới sang câu sau; nút ← để quay lại câu cũ đổi đáp án; **Để sau** để bỏ qua tạm; mục **Danh sách câu** để nhảy tới câu bất kỳ. Câu cuối là nút **Nộp bài** (còn câu chưa làm thì app hỏi lại). Kết quả hiện cả đáp án Cậu Cả đã chọn.
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
