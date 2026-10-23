// v56: cấu hình dự án Firebase của app (đăng nhập Google, đồng bộ theo tài khoản, quản trị).
// Lấy ở bảng điều khiển Firebase → Project settings → Your apps → đoạn firebaseConfig.
// Các dòng này KHÔNG phải mật khẩu (app web nào dùng Firebase cũng để công khai); dữ liệu được bảo vệ bằng firestore.rules.
// Để null = bản app này chưa bật tài khoản (mọi phần khác vẫn chạy như cũ).
export const FIREBASE = null;
