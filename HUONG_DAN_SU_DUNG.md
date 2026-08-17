# 🚀 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG EXTENSION AUTOTHI AI

Trợ lý mở rộng (Chrome Extension Manifest V3) tự động phân tích câu hỏi, giải đề trắc nghiệm bằng **Gemini AI** và **Ngân hàng đề thông minh**.

---

## 📌 1. Cách cài đặt vào trình duyệt (Chrome / Edge / Cốc Cốc / Brave)

1. Mở trình duyệt Chrome (hoặc Edge / Cốc Cốc / Brave).
2. Truy cập vào đường dẫn quản lý tiện ích:
   - Trên Chrome/Cốc Cốc: gõ `chrome://extensions` vào thanh địa chỉ rồi nhấn **Enter**.
   - Trên Edge: gõ `edge://extensions` rồi nhấn **Enter**.
3. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
4. Nhấn vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
5. Chọn thư mục dự án: `d:\Tool\AutoThi`
6. Tiện ích **"AutoThi AI - Trợ Lý Tự Động Làm Bài Thi & Trắc Nghiệm"** sẽ xuất hiện ngay lập tức! Bạn hãy bấm vào biểu tượng chiếc ghim (Pin) trên thanh công cụ trình duyệt để ghim extension ra ngoài.

---

## 🔑 2. Cấu hình API Key Gemini

Extension đã được cấu hình sẵn API Key bạn cung cấp:
`AIzaSyBsWhAEb7UaJcjGYiVZ0obLJPj3olo77Cw`

- Bạn có thể bấm vào icon extension -> chọn tab **"Gemini AI"** -> bấm nút **"Kiểm tra kết nối API Key"** để kiểm tra trạng thái hoạt động bất kỳ lúc nào.
- Sử dụng mô hình `Gemini 1.5 Flash` (mặc định) cho tốc độ siêu nhanh và hoàn toàn miễn phí.

---

## 🎯 3. Cách sử dụng khi vào trang thi (cuocthi.vn hoặc trang trắc nghiệm bất kỳ)

Khi bạn mở một trang thi trắc nghiệm trực tuyến:

### Cách 1: Sử dụng Thanh Điều Khiển Nổi (Floating HUD)
- Ngay khi vào trang thi, ở góc trên bên phải màn hình sẽ có thanh công cụ nổi **AutoThi AI**.
- Bấm **"⚡ Tự động làm"**: Hệ thống sẽ tự động phân tích từng câu hỏi, gọi AI chọn đáp án và bấm câu tiếp theo (có delay chống phát hiện bot).
- Bấm **"🎯 Chỉ gợi ý"**: Hệ thống sẽ chỉ tô viền xanh neon quanh đáp án đúng nhất để bạn tự bấm.
- Bấm **"🔍 Giải trang này"**: Giải hàng loạt tất cả các câu hỏi đang hiển thị trên trang cùng lúc.
- Bấm **"⏹ Dừng"**: Dừng ngay lập tức.
- Thanh công cụ có thể kéo thả tự do trên màn hình hoặc bấm dấu `_` để thu gọn.

### Cách 2: Sử dụng Popup Extension
- Bấm vào icon **AutoThi AI** trên thanh tiện ích của trình duyệt.
- Chọn chế độ mong muốn và bấm **"Tự động làm bài ngay"**.

---

## 🧪 4. Thử nghiệm ngay trên trang mẫu offline
Trong thư mục `d:\Tool\AutoThi\`, chúng tôi đã tạo sẵn file [test_quiz_page.html](file:///d:/Tool/AutoThi/test_quiz_page.html).
- Bạn có thể kéo thả file `test_quiz_page.html` vào Chrome để chạy thử nghiệm tính năng tự động giải và tô màu đáp án ngay lập tức!

---

## ⚙️ 5. Các tính năng nâng cao
- **Anti-Detection (Mô phỏng người thật)**: Cho phép tùy chỉnh thanh trượt độ trễ (1.5s - 4.0s) giữa các câu hỏi để tránh bị hệ thống thi nghi ngờ dùng bot.
- **Ngân hàng đề thông minh (Auto-Learn)**: Tự động lưu các câu hỏi & đáp án vào bộ nhớ. Bạn có thể xuất ra file JSON để chia sẻ cho bạn bè hoặc sao lưu.
