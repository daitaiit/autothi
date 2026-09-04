# 📖 HƯỚNG DẪN TRIỂN KHAI TRANG QUẢN TRỊ NẠP ĐỀ THI
### Tên miền: `autothi.tafinex.com`

---

## 1. Cơ sở dữ liệu MySQL (`u220481198_autothi`): Có cần dùng không?
👉 **BẠN CÓ THỂ XÓA DATABASE MYSQL ĐI.**
Hệ thống AutoThi Admin hoạt động trực tiếp với **GitHub API** và phân phối qua **GitHub Raw CDN** (`daitaiit/autothi`). Việc không dùng MySQL giúp:
- Tối ưu bộ nhớ và CPU của gói hosting.
- Không lo bị lỗi rớt kết nối database.
- Không cần cấu hình phức tạp, chỉ cần upload thư mục mã nguồn là chạy được ngay 100%!

---

## 2. Cách Triển Khai Lên Hosting `autothi.tafinex.com`

### Bước 1: Upload mã nguồn lên hosting
1. Đăng nhập vào cPanel / DirectAdmin / File Manager của hosting `autothi.tafinex.com`.
2. Truy cập vào thư mục gốc của tên miền con này (thường là `public_html` hoặc `domains/autothi.tafinex.com/public_html`).
3. Upload toàn bộ các file trong thư mục `admin/` lên:
   ```text
   public_html/
   ├── assets/
   │   ├── app.js
   │   └── style.css
   ├── config.php
   ├── api.php
   └── index.php
   ```

### Bước 2: Tạo GitHub Personal Access Token (PAT)
Để trang web có quyền tự động Commit & Push câu hỏi vào GitHub `daitaiit/autothi`:
1. Đăng nhập vào tài khoản GitHub của bạn (`daitaiit`).
2. Nhấp vào ảnh đại diện góc trên bên phải ➡️ Chọn **Settings**.
3. Cuộn xuống dưới cùng bên trái ➡️ Chọn **Developer settings**.
4. Chọn **Personal access tokens** ➡️ Chọn **Tokens (classic)** (hoặc Fine-grained tokens).
5. Bấm **Generate new token (classic)**:
   - **Note:** `AutoThi Admin Sync`
   - **Expiration:** Chọn `No expiration` (hoặc 90 days tùy ý bạn).
   - **Select scopes:** Tích chọn ô **`repo`** (Full control of private repositories / public repositories).
6. Bấm **Generate token** ở cuối trang và **Copy chuỗi token** (bắt đầu bằng `ghp_...`).

> **Mẹo bảo mật:** Bạn có thể mở file `config.php` trên hosting và dán token vào dòng:
> `define('GITHUB_TOKEN', 'ghp_chuoi_token_cua_ban_o_day');`
> Hoặc mỗi lần đăng nhập vào trang web Admin, bạn chỉ cần nhập vào ô cấu hình Token trên giao diện.

---

## 3. Cách Sử Dụng Trang Quản Trị `autothi.tafinex.com`

1. Truy cập vào trình duyệt: `https://autothi.tafinex.com`
2. **Đăng nhập:** 
   - Mật khẩu mặc định: `D@iT@i1998` *(có thể đổi tại `config.php`)*.
3. **Nạp đề thi:**
   - **Bước 1:** Chọn cuộc thi có sẵn (ví dụ: *Cuộc thi Trực tuyến 2026*) hoặc chọn *+ Tạo cuộc thi mới...*
   - **Bước 2:** Copy và dán nguyên văn đoạn đề cương, ngân hàng đề từ Word, PDF hoặc Web vào ô văn bản lớn.
   - **Bước 3:** Bấm nút **"🤖 Bắt Đầu Phân Tích Bằng AI"** (Sử dụng `gpt-4o-mini` tốc độ cực nhanh và siêu tiết kiệm token).
   - **Bước 4:** Xem lại danh sách câu hỏi AI vừa bóc tách ở cột bên phải. Bạn có thể xóa câu không ưng ý.
   - **Bước 5:** Bấm **"🚀 Đẩy Lên GitHub"**!

🎉 **Kết quả:** Hệ thống sẽ tự động commit vào file `contests_manifest.json` trên GitHub. Toàn bộ người dùng đang cài Extension AutoThi AI trên mọi máy tính sẽ tự động cập nhật bộ đề này trong vài phút!
