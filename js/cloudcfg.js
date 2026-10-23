// v56: cấu hình dự án Firebase của app (đăng nhập Google, đồng bộ theo tài khoản, quản trị).
// Lấy ở bảng điều khiển Firebase → Project settings → Your apps → đoạn firebaseConfig.
// Các dòng này KHÔNG phải mật khẩu (app web nào dùng Firebase cũng để công khai); dữ liệu được bảo vệ bằng firestore.rules.
// Để null = bản app này chưa bật tài khoản (mọi phần khác vẫn chạy như cũ).
// v60: đã bật — dự án Firebase tiengnhat-app.
export const FIREBASE = {
  apiKey: 'AIzaSyCLC_EGSOp7EnVKCj3S5MxjkCUqY8k3rJs',
  authDomain: 'tiengnhat-app.firebaseapp.com',
  projectId: 'tiengnhat-app',
  storageBucket: 'tiengnhat-app.firebasestorage.app',
  messagingSenderId: '845343230402',
  appId: '1:845343230402:web:cc79eb544890a6430fee5b',
};
