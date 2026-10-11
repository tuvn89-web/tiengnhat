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

## 2. Cài lên điện thoại và máy tính

- **Android:** mở địa chỉ trên bằng Chrome → menu ⋮ → **Cài đặt ứng dụng** (hoặc **Thêm vào màn hình chính**). Icon chữ 実 đỏ sẽ hiện ngoài màn hình.
- **Máy tính:** mở bằng Chrome hoặc Edge → bấm biểu tượng cài đặt ở cuối thanh địa chỉ.
- Mở app **một lần khi có mạng** để app tải hết dữ liệu. Sau đó dùng được khi không có mạng.

## 3. Đồng bộ tiến độ giữa điện thoại và máy tính

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
- Tên tài khoản GitHub
- Tên kho: `tiengnhat-tiendo`
- Token

Bấm **Đồng bộ ngay**. Làm y hệt trên máy thứ hai.

Từ đó app tự đồng bộ khi mở app, sau mỗi lượt học, khi có mạng trở lại và khi thoát app. Học offline cứ học, có mạng app tự gộp. Hai máy cùng học một từ thì lần học sau cùng được giữ.

**An toàn:** token chỉ có quyền trên kho tiến độ, không đụng được gì khác. Mất điện thoại → vào GitHub xoá token đó đi là xong.

## 4. Thêm dữ liệu mới từ skill `jp-v01-data`

Skill giao các file gói `.json` và một file `manifest.json` mới.

- **Cách chính (mọi máy đều có):**
  1. Kho `tiengnhat` → thư mục `data/packs` → **Add file → Upload files** → kéo các file gói vào → **Commit**.
  2. Vào thư mục `data` → **Add file → Upload files** → kéo `manifest.json` mới vào (ghi đè file cũ) → **Commit**.
  3. Đợi 1–2 phút, mở app khi có mạng là có gói mới.
- **Cách nhanh (thử trên một máy):** app → **Dữ liệu → Nhập gói từ skill** → chọn file. Gói nhập kiểu này cũng đi theo đồng bộ sang máy kia.

Muốn skill sửa từ sai, hoặc làm tiếp mà không trùng từ cũ: app → **Dữ liệu → Tải file gửi skill**, rồi gửi file đó cho Claude kèm yêu cầu.

## 5. Giọng đọc tiếng Nhật (để nghe phát âm, chơi kiểu "Nghe → nghĩa")

- **Android:** Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Dịch vụ của Google → Cài đặt → Cài đặt dữ liệu giọng nói → **Tiếng Nhật**. Tên mục có thể khác chút tùy hãng điện thoại.
- **Windows:** Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → **Tiếng Nhật**.

Xong thì mở lại app. Trong **Cài đặt → Giọng đọc** có nút **Nghe thử**.

## 6. Khi sửa code app

Mở `sw.js`, tăng `VERSION` (ví dụ `tnt-v1` → `tnt-v2`), rồi tải lên cùng các file đã sửa. Mở app sẽ hiện thông báo **Có bản cập nhật mới** → bấm **Cập nhật**.

Chỉ thêm hoặc sửa gói dữ liệu thì **không cần** đổi `VERSION`: tăng `pack.version` trong gói là đủ, và skill tự làm việc này.

## 7. Cấu trúc thư mục

```
index.html, manifest.webmanifest, sw.js   khung app, cài đặt PWA, chạy offline
css/app.css                               giao diện
js/                                       mã app (mỗi màn hình một file)
data/manifest.json                        danh mục gói (sinh bằng build_manifest.py của skill)
data/packs/*.json                         các gói từ vựng / ngữ pháp
icons/                                    biểu tượng app
```
