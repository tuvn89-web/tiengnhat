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

## 8. Các phần học (từ bản v4)

Thanh dưới cùng (điện thoại) hoặc cột trái (máy tính): **Trang chủ · Luyện từ · Chữ Hán · Ngữ pháp · Kho từ**. Dữ liệu và Cài đặt ở góc trên.

- **Trang chủ:** việc hôm nay (từ, chữ Hán, mẫu ngữ pháp đến hạn ôn), nút học từ mới, **Chữ Hán hôm nay** kèm câu lục bát, bảng tiến độ.
- **Luyện từ:** Trắc nghiệm (Việt → Nhật, Nhật → Việt, đọc kanji, nghe) và Ghép 6 cặp. **Không còn giới hạn số từ mới mỗi ngày** — học bao nhiêu tùy Cậu Cả.
- **Chữ Hán:**
  - *Danh sách:* lưới các chữ có thẻ, tìm theo chữ / âm Hán Việt / nghĩa, lọc theo nhóm (Nhãn sản phẩm, Giấy tờ & thuế, Công xưởng, Thủy sản…) và cấp.
  - *Thẻ chữ:* chữ to, âm Hán Việt, nghĩa, số nét, **câu lục bát nhớ mặt chữ**, bộ phận (chạm để mở thẻ bộ đó), âm On/Kun, các từ trong kho có chữ này, từ Hán Việt quen thuộc, chữ dễ nhầm.
  - **Chạm vào chữ kanji bất kỳ** trong app (câu ví dụ, giải thích ngữ pháp, thẻ từ) là mở thẻ chữ đó. Thẻ từ vựng có dải **Chữ Hán trong từ** để mở nhanh từng chữ.
  - *Ôn chữ Hán:* chữ → âm Hán Việt và nghĩa, âm Hán Việt → chữ. Đây là phần kiểm tra Hán nên chữ Hán không có furigana.
- **Ngữ pháp:**
  - *Bài học:* mỗi mẫu có giải thích, 10 ví dụ, nút **Luyện mẫu này**.
  - *Luyện tập:* Điền chỗ trống · Chia động từ · Sắp xếp câu · Câu ★ kiểu JLPT · Tìm chỗ sai · Chọn cách nói hợp hoàn cảnh · Ghép câu Việt → Nhật · Nghe → chọn (cần giọng đọc, mục 5) · Đổi lối nói (nói tắt, Kansai → chuẩn) · Trộn. Câu sai được hỏi lại một lần trong lượt.
  - *Thi thử:* đề ngắn kiểu phần Kiến thức ngôn ngữ của JLPT theo cấp, tính giờ 45 giây mỗi câu, làm xong mới xem đáp án và điểm từng phần.
- **Furigana:** mọi chữ kanji đều có furigana, trừ phần học và kiểm tra Hán (thẻ chữ, Ôn chữ Hán, câu hỏi đọc kanji, ghép Chữ mềm/cứng – Kanji).
