<?php
require_once __DIR__ . '/config.php';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hệ Thống Quản Trị Đề Thi - AutoThi Admin (Tafinex)</title>
  <link rel="stylesheet" href="assets/style.css?v=<?= time() ?>">
</head>
<body>

  <!-- Top Navbar -->
  <header class="navbar">
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <div>
        <div class="brand-name">AutoThi Admin</div>
        <div style="font-size: 11px; color: #94a3b8;">Quản lý & Nạp đề thi AI • autothi.tafinex.com</div>
      </div>
    </div>

    <!-- Main Tabs Switcher -->
    <div class="tab-nav">
      <button class="tab-btn active" data-tab="tab-upload" id="nav-tab-upload">
        📥 Nạp Đề Mới (AI)
      </button>
      <button class="tab-btn" data-tab="tab-github-bank" id="nav-tab-bank">
        📚 Ngân Hàng Đề Trên GitHub
        <span id="badge-bank-total" class="pill-mini">0</span>
      </button>
      <button class="tab-btn" data-tab="tab-extension-settings" id="nav-tab-ext-settings">
        ⚙️ Cấu Hình Extension
      </button>
    </div>

    <div class="nav-actions">
      <button id="btn-open-api-health" class="nav-btn" style="color: #60a5fa;" title="Kiểm tra trạng thái kết nối tất cả API">
        🩺 Kiểm tra API
      </button>
      <span id="token-status-tag" class="badge-tag">GitHub: Đang kiểm tra...</span>
      <button id="btn-open-token-modal" class="nav-btn" title="Cấu hình GitHub Token">
        🔑 Cài đặt Token
      </button>
      <button id="btn-logout" class="nav-btn" style="color: #f87171;">
        🚪 Đăng xuất
      </button>
    </div>
  </header>

  <!-- ============================================================= -->
  <!-- TAB 1: NẠP & BÓC TÁCH ĐỀ MỚI BẰNG AI                         -->
  <!-- ============================================================= -->
  <main class="main-content tab-pane active" id="tab-upload">
    
    <!-- Left Column: Input & AI Extraction -->
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">📥 1. Dán Văn Bản & Gọi AI Bóc Tách</h2>
        <span class="badge-tag" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3);">
          ShopAIKey AI
        </span>
      </div>

      <!-- Cuộc thi đích -->
      <div class="form-group">
        <label class="form-label">Chọn Cuộc Thi Đích Đến (Hoặc tạo mới):</label>
        <select id="sel-contest" class="form-control">
          <option value="__new__">+ Tạo cuộc thi mới...</option>
        </select>
      </div>

      <!-- Thông tin cuộc thi nếu tạo mới -->
      <div id="new-contest-fields">
        <div class="form-group">
          <label class="form-label">Mã Cuộc Thi (ID không dấu, vd: tu-tuong-hcm-2026):</label>
          <input type="text" id="txt-contest-id" class="form-control" placeholder="ma-cuoc-thi-2026">
        </div>
        <div class="form-group">
          <label class="form-label">Tên Cuộc Thi Hiển Thị:</label>
          <input type="text" id="txt-contest-name" class="form-control" placeholder="Hội thi Tìm hiểu Tư tưởng Hồ Chí Minh 2026">
        </div>
        <div class="form-group">
          <label class="form-label">Mô Tả Cuộc Thi (Không bắt buộc):</label>
          <input type="text" id="txt-contest-desc" class="form-control" placeholder="Trọn bộ câu hỏi và đáp án chuẩn...">
        </div>
        <div class="form-group" style="margin-top: 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 10px 12px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #38bdf8; font-size: 13px; font-weight: 600; margin: 0;">
            <input type="checkbox" id="chk-pin-active-contest" checked style="width: 17px; height: 17px; accent-color: #38bdf8;">
            <span>📌 Ghim làm Cuộc thi hoạt động chính thức trên toàn hệ thống Extension</span>
          </label>
          <div style="font-size: 11px; color: #94a3b8; margin-left: 25px; margin-top: 4px;">
            Khi nạp xong, tên cuộc thi này sẽ tự động xuất hiện ở phần đầu (Header) của mọi máy đang cài Extension AutoThi.
          </div>
        </div>
      </div>

      <!-- Mô hình AI -->
      <div class="form-group">
        <label class="form-label">Mô Hình AI Bóc Tách:</label>
        <select id="sel-ai-model" class="form-control">
          <option value="gpt-4o-mini" selected>gpt-4o-mini (⚡ Siêu nhanh & Tiết kiệm token tối đa)</option>
          <option value="deepseek-v3">deepseek-v3 (🧠 Giá rẻ, tư duy phản biện cao)</option>
          <option value="gpt-4o">gpt-4o (👑 Độ chính xác cao nhất)</option>
        </select>
      </div>

      <!-- Dán văn bản thô -->
      <div class="form-group" style="flex: 1; display: flex; flex-direction: column;">
        <label class="form-label">Dán Văn Bản Đề Thi Thô (Copy từ Word, PDF, Web đề thi):</label>
        <textarea id="txt-raw-input" class="form-control" style="flex: 1; min-height: 220px;" placeholder="Ví dụ: Dán nguyên văn đoạn câu hỏi từ Word, PDF, Web:

Câu 1: Ngày Chuyển đổi số quốc gia của Việt Nam là ngày nào?
A. Ngày 10/10
B. Ngày 15/10
C. Ngày 02/09
D. Ngày 30/04
Đáp án: A

Câu 2: Cơ quan quyền lực nhà nước cao nhất là gì?
A. Quốc hội
B. Chính phủ
... (Dù có đáp án hay chưa có đáp án, AI sẽ tự động phân tích và bóc tách chuẩn xác)"></textarea>
      </div>

      <div id="parse-status" style="margin-bottom: 12px; font-size: 13px;"></div>

      <button id="btn-parse" class="btn btn-primary btn-block">
        🤖 Bắt Đầu Phân Tích Bằng AI
      </button>

      <!-- Thanh tiến trình Loading khi AI đang phân tích -->
      <div id="ai-loading-container" style="display: none; margin-top: 14px; background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span id="ai-loading-status" style="color: #60a5fa; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
            <span class="spinner-ring"></span>
            <span id="ai-loading-status-text">Đang kết nối AI...</span>
          </span>
          <span id="ai-loading-percent" style="color: #34d399; font-weight: 800; font-size: 13px;">15%</span>
        </div>
        <div class="progress-track">
          <div id="ai-loading-bar" class="progress-bar-fill" style="width: 15%;"></div>
        </div>
        <div id="ai-loading-tip" style="font-size: 11.5px; color: #94a3b8; margin-top: 8px; text-align: center; line-height: 1.4;">
          💡 AI đang đọc hiểu văn bản, trích xuất câu hỏi, đối chiếu đáp án và chuẩn hóa tiêu đề cuộc thi...
        </div>
      </div>
    </section>

    <!-- Right Column: Live Preview & Push to GitHub -->
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">📋 2. Xem Trước Câu Hỏi & Đáp Án Chuẩn</h2>
        <span id="parsed-count" class="badge-tag">0 câu</span>
      </div>

      <div id="questions-list" class="questions-container">
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Chưa có câu hỏi nào được nạp.</p>
          <p style="font-size: 12px; margin-top: 4px;">Dán đề thi vào ô bên trái và bấm <b>"Bắt Đầu Phân Tích Bằng AI"</b>.</p>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
        <button id="btn-push-github" class="btn btn-success btn-block" disabled>
          🚀 Đẩy Lên GitHub (Commit to contests_manifest.json)
        </button>
        <p style="font-size: 11.5px; color: #94a3b8; text-align: center; margin-top: 8px;">
          Sau khi đẩy lên GitHub, toàn bộ người dùng cài Extension AutoThi AI sẽ tự động đồng bộ đề mới!
        </p>
      </div>
    </section>

  </main>

  <!-- ============================================================= -->
  <!-- TAB 2: NGÂN HÀNG ĐỀ HIỆN TẠI TRÊN GITHUB (LIVE DATABASE)      -->
  <!-- ============================================================= -->
  <main class="main-content-single tab-pane" id="tab-github-bank">
    
    <!-- Stats Banner -->
    <div class="stats-banner">
      <div class="stat-item">
        <div class="stat-icon">🏆</div>
        <div>
          <div class="stat-label">Tổng số cuộc thi</div>
          <div class="stat-val" id="stat-contests-count">0</div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">📝</div>
        <div>
          <div class="stat-label">Tổng số câu hỏi trên GitHub</div>
          <div class="stat-val" id="stat-questions-count" style="color: #34d399;">0</div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">🕒</div>
        <div>
          <div class="stat-label">Đồng bộ gần nhất</div>
          <div class="stat-val" id="stat-last-sync" style="font-size: 15px; font-weight: 600; color: #94a3b8;">Đang tải...</div>
        </div>
      </div>

      <div style="margin-left: auto;">
        <button id="btn-refresh-bank" class="btn btn-primary" style="padding: 9px 16px;">
          🔄 Tải Lại Từ GitHub
        </button>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="bank-filters">
      <div style="flex: 1; position: relative;">
        <input type="text" id="txt-bank-search" class="form-control" placeholder="🔍 Tìm kiếm câu hỏi hoặc nội dung đáp án...">
      </div>
      <div style="width: 320px;">
        <select id="sel-bank-filter-contest" class="form-control">
          <option value="ALL">Tất cả các cuộc thi</option>
        </select>
      </div>
    </div>

    <!-- GitHub Contests & Questions Display -->
    <div id="github-contests-container" class="github-contests-list">
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <p>Đang tải dữ liệu từ GitHub repository daitaiit/autothi...</p>
      </div>
    </div>

  </main>

  <!-- ============================================================= -->
  <!-- TAB 3: QUẢN LÝ & CẤU HÌNH TẬP TRUNG TOÀN BỘ EXTENSION         -->
  <!-- ============================================================= -->
  <main class="main-content-single tab-pane" id="tab-extension-settings">
    
    <!-- Header Banner -->
    <div class="stats-banner" style="margin-bottom: 20px;">
      <div class="stat-item" style="flex: 2;">
        <div class="stat-icon" style="font-size: 28px;">⚙️</div>
        <div>
          <div class="stat-val" style="font-size: 17px; color: #38bdf8;">Trung Tâm Điều Khiển Extension</div>
          <div class="stat-label" style="font-size: 12px; margin-top: 2px;">
            Thiết lập cài đặt mặc định &amp; Ghim tên cuộc thi mới nhất để đồng bộ trực tiếp tới toàn bộ Extension người dùng qua GitHub.
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; margin-left: auto;">
        <button id="btn-reload-ext-settings" class="btn" style="background: rgba(255,255,255,0.08); color: #fff; padding: 9px 14px;">
          🔄 Tải Lại Cài Đặt
        </button>
        <button id="btn-save-ext-settings" class="btn btn-primary" style="padding: 9px 20px; font-weight: 600; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
          🚀 Lưu &amp; Đồng Bộ Đến Toàn Bộ Extension
        </button>
      </div>
    </div>

    <!-- Status Alert Area -->
    <div id="ext-settings-alert" style="display: none; margin-bottom: 18px;"></div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      
      <!-- CỘT TRÁI: CUỘC THI MỚI NHẤT ĐƯỢC GHIM TRÊN HEADER EXTENSION -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">📌 1. Cuộc Thi Mới Nhất (Ghim Trên Extension)</h2>
            <span class="badge-tag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">
              Header Extension
            </span>
          </div>

          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 14px; line-height: 1.5;">
            Khi bạn nhập hoặc chọn cuộc thi mới tại đây, mọi Extension của học viên/người dùng khi mở lên sẽ lập tức hiển thị tên cuộc thi này ở góc trên cùng kèm ngày cập nhật.
          </div>

          <!-- Live Preview Banner of Extension Header -->
          <div style="background: #0b1329; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              👁️ Xem Trước Hiển Thị Trên Extension:
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 8px 12px; border-radius: 8px; border: 1px solid #1e293b;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <span style="background: #2563eb; color: #fff; width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">⚡</span>
                <div style="min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12px; font-weight: 700; color: #fff;">AutoThi AI</span>
                    <span id="preview-ext-contest-name" style="font-size: 12px; color: #cbd5e1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">Đang tải...</span>
                    <span style="color: #f43f5e; font-size: 13px;">📌</span>
                  </div>
                  <div style="font-size: 10.5px; color: #10b981; margin-top: 1px;">
                    🕒 Cập nhật đề: <span id="preview-ext-contest-date">03/09/2026</span>
                  </div>
                </div>
              </div>
              <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">Sẵn sàng</span>
            </div>

            <!-- Live Preview of Announcement Banner (Nằm ngay dưới Header và trên nút Bắt đầu) -->
            <div id="preview-ext-announcement-box" style="margin-top: 8px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.15)); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 7px 10px; display: none; align-items: center; justify-content: space-between; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                <span style="font-size: 13px;">📢</span>
                <span id="preview-ext-announcement-text" style="font-size: 11.5px; color: #fbbf24; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px;"></span>
              </div>
              <span style="color: #94a3b8; font-size: 11px;">✕</span>
            </div>
          </div>

          <!-- Select from existing contest or custom -->
          <div class="form-group">
            <label class="form-label">Chọn Nhanh Từ Cuộc Thi Đã Có:</label>
            <select id="sel-ext-active-preset" class="form-control">
              <option value="">-- Chọn cuộc thi từ ngân hàng đề --</option>
            </select>
          </div>

          <!-- Custom Contest Name Input -->
          <div class="form-group">
            <label class="form-label">Tên Cuộc Thi Mới Nhất Hiển Thị:</label>
            <input type="text" id="txt-ext-active-name" class="form-control" placeholder="Ví dụ: Hội nghị toàn quốc học tập, quán triệt Nghị quyết...">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Mã Cuộc Thi (ID):</label>
              <input type="text" id="txt-ext-active-id" class="form-control" placeholder="hoi-nghi-bct-2026">
            </div>
            <div class="form-group">
              <label class="form-label">Ngày Cập Nhật Hiển Thị:</label>
              <input type="text" id="txt-ext-active-date" class="form-control" placeholder="04/09/2026">
            </div>
          </div>
        </section>

        <!-- THÔNG BÁO TOÀN HỆ THỐNG (BROADCAST ANNOUNCEMENT) -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">📢 2. Thông Báo Toàn Hệ Thống</h2>
            <span class="badge-tag" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);">
              Popup Banner
            </span>
          </div>
          <div class="form-group">
            <label class="form-label">Nội Dung Thông Báo Gửi Đến Toàn Bộ Extension:</label>
            <textarea id="txt-ext-announcement" class="form-control" style="min-height: 80px;" placeholder="Ví dụ: Đã cập nhật 120 câu hỏi mới nhất ngày 04/09/2026. Mọi người làm bài bình thường!"></textarea>
            <div style="font-size: 11.5px; color: #38bdf8; margin-top: 6px; line-height: 1.4;">
              📍 <b>Vị trí hiển thị:</b> Banner thông báo này xuất hiện <b>ngay trên Popup Extension (nằm giữa thanh Tiêu đề và nút "⚡ BẮT ĐẦU LÀM BÀI")</b> của mọi máy người dùng.
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              💡 Để trống nếu không muốn hiển thị banner thông báo trên giao diện Extension.
            </div>
          </div>
        </section>
      </div>

      <!-- CỘT PHẢI: CÀI ĐẶT MẶC ĐỊNH CHO MỌI EXTENSION (GLOBAL TOGGLES) -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">⚡ 3. Cài Đặt Mặc Định Cho Toàn Bộ Extension</h2>
            <span class="badge-tag" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
              Tất Cả Extension
            </span>
          </div>

          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px; line-height: 1.5;">
            Thiết lập trạng thái BẬT/TẮT mặc định. Nếu bạn để ON, toàn bộ Extension khi mở lên sẽ luôn tick sẵn. Nếu để OFF, toàn bộ Extension sẽ tự động tắt ô đó.
          </div>

          <!-- TOGGLES LIST -->
          <div style="display: flex; flex-direction: column; gap: 14px; background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 10px; border: 1px solid var(--border);">
            
            <!-- Toggle 1: Tự động bấm câu tiếp theo -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 13.5px; font-weight: 600; color: #f1f5f9;">Tự động bấm câu tiếp theo</div>
                <div style="font-size: 11.5px; color: #94a3b8;">Sau khi giải xong câu thì tự động chuyển tiếp sang câu kế tiếp</div>
              </div>
              <label class="switch-ui">
                <input type="checkbox" id="chk-global-auto-next" checked>
                <span class="slider-ui"></span>
              </label>
            </div>

            <div style="height: 1px; background: var(--border);"></div>

            <!-- Toggle 2: Tự động nộp bài khi làm xong -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 13.5px; font-weight: 600; color: #f1f5f9;">Tự động nộp bài khi làm xong</div>
                <div style="font-size: 11.5px; color: #94a3b8;">Tự động bấm nút Nộp bài và xác nhận ở câu cuối cùng</div>
              </div>
              <label class="switch-ui">
                <input type="checkbox" id="chk-global-auto-submit" checked>
                <span class="slider-ui"></span>
              </label>
            </div>

            <div style="height: 1px; background: var(--border);"></div>

            <!-- Toggle 3: Tự điền số người dự đoán -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 13.5px; font-weight: 600; color: #f1f5f9;">Tự điền số người dự đoán</div>
                <div style="font-size: 11.5px; color: #94a3b8;">Tự động nhập vào ô câu hỏi phụ dự đoán số người tham gia</div>
              </div>
              <label class="switch-ui">
                <input type="checkbox" id="chk-global-auto-predict" checked>
                <span class="slider-ui"></span>
              </label>
            </div>
          </div>

          <!-- CHI TIẾT CẤU HÌNH SỐ NGƯỜI DỰ ĐOÁN (RANDOM RANGE HOẶC CỐ ĐỊNH) -->
          <div id="predict-config-box" style="margin-top: 16px; background: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px; padding: 14px;">
            <div style="font-size: 12.5px; font-weight: 600; color: #60a5fa; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span>🎯</span> Quy Định Số Người Dự Đoán Cho Toàn Hệ Thống:
            </div>

            <div style="display: flex; gap: 16px; margin-bottom: 12px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12.5px; color: #e2e8f0;">
                <input type="radio" name="predictType" id="rad-predict-range" value="range" checked style="accent-color: #3b82f6;">
                <span>🎲 Ngẫu nhiên trong khoảng (Random Range)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12.5px; color: #e2e8f0;">
                <input type="radio" name="predictType" id="rad-predict-fixed" value="fixed" style="accent-color: #3b82f6;">
                <span>🎯 Cố định một con số</span>
              </label>
            </div>

            <!-- Khối nhập khoảng Random -->
            <div id="box-predict-range" style="display: flex; align-items: center; gap: 10px;">
              <div style="flex: 1;">
                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Ngẫu nhiên Từ (Min):</label>
                <input type="number" id="num-predict-min" class="form-control" value="1500" placeholder="1500">
              </div>
              <span style="color: #64748b; margin-top: 18px; font-weight: bold;">➜</span>
              <div style="flex: 1;">
                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Đến (Max):</label>
                <input type="number" id="num-predict-max" class="form-control" value="3500" placeholder="3500">
              </div>
            </div>

            <!-- Khối nhập cố định (ẩn khi chọn range) -->
            <div id="box-predict-fixed" style="display: none;">
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Số dự đoán cố định:</label>
              <input type="number" id="num-predict-fixed" class="form-control" value="2500" placeholder="2500">
            </div>

            <div style="font-size: 11px; color: #94a3b8; margin-top: 8px; line-height: 1.4;">
              💡 <b>Lợi ích:</b> Khi chọn ngẫu nhiên từ 1500 đến 3500, mỗi thí sinh khi làm bài xong sẽ tự động nhận một con số ngẫu nhiên khác nhau, tránh trùng lặp số dự đoán giữa các tài khoản.
            </div>
          </div>

          <!-- TỐC ĐỘ LÀM BÀI -->
          <div style="margin-top: 16px;">
            <label class="form-label">Tốc Độ Làm Bài Mặc Định:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <button type="button" class="btn-speed-opt" data-speed="fast" data-delay="800">
                ⚡ Nhanh (800ms)
              </button>
              <button type="button" class="btn-speed-opt active" data-speed="normal" data-delay="2200">
                👌 Vừa phải (2.2s)
              </button>
              <button type="button" class="btn-speed-opt" data-speed="safe" data-delay="3500">
                🛡️ An toàn (3.5s)
              </button>
            </div>
            <input type="hidden" id="val-global-speed" value="normal">
            <input type="hidden" id="val-global-delay" value="2200">
          </div>

          <!-- GHI ĐÈ BẮT BUỘC -->
          <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border);">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #cbd5e1; font-size: 12.5px;">
              <input type="checkbox" id="chk-force-override" style="width: 16px; height: 16px; accent-color: #38bdf8;">
              <span><b>Ép buộc áp dụng</b> (Ghi đè cả những máy người dùng đã tự chỉnh cài đặt trước đó)</span>
            </label>
          </div>

          <button id="btn-save-ext-settings-bottom" class="btn btn-primary btn-block" style="margin-top: 20px; padding: 12px; font-size: 14px; font-weight: 600;">
            🚀 Lưu &amp; Đồng Bộ Đến Toàn Bộ Extension
          </button>
        </section>
      </div>
    </div>
  </main>

  <!-- Login Modal -->
  <div id="login-modal" class="modal-overlay hidden">
    <div class="modal-box">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 36px; margin-bottom: 8px;">🔐</div>
        <h2 style="font-size: 18px; color: #ffffff;">Đăng Nhập Quản Trị AutoThi</h2>
        <p style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">autothi.tafinex.com</p>
      </div>

      <div class="form-group">
        <label class="form-label">Tài khoản Admin:</label>
        <input type="text" id="txt-username" class="form-control" placeholder="Nhập tên đăng nhập...">
      </div>

      <div class="form-group">
        <label class="form-label">Mật khẩu Admin:</label>
        <input type="password" id="txt-password" class="form-control" placeholder="Nhập mật khẩu quản trị...">
      </div>

      <!-- Trạng thái GitHub Token khi đã lưu sẵn -->
      <div id="login-token-saved-box" style="display: none; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="login-token-saved-label" style="color: #34d399; font-weight: 500;">🟢 GitHub Token: Đã lưu sẵn</span>
          <button type="button" id="btn-toggle-change-token" style="background: none; border: none; color: #60a5fa; cursor: pointer; text-decoration: underline; font-size: 11px; padding: 0;">Đổi Token khác</button>
        </div>
      </div>

      <!-- Ô nhập GitHub Token nếu chưa lưu hoặc muốn đổi -->
      <div class="form-group" id="login-token-group">
        <label class="form-label" style="display: flex; justify-content: space-between;">
          <span>GitHub Token (PAT):</span>
          <span style="font-weight: normal; color: #94a3b8; font-size: 11px;">Chỉ cần nhập 1 lần duy nhất</span>
        </label>
        <input type="password" id="txt-login-token" class="form-control" placeholder="ghp_xxxx hoặc github_pat_xxxx">
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          💡 Sau khi lưu, hệ thống sẽ <b>tự động lưu vĩnh viễn</b> trên server, các lần đăng nhập sau không cần nhập lại.
        </div>
      </div>

      <div id="login-msg" style="color: #f87171; font-size: 12.5px; margin-bottom: 12px; text-align: center;"></div>

      <button id="btn-login" class="btn btn-primary btn-block">
        Đăng Nhập
      </button>
    </div>
  </div>

  <!-- API Health Check Modal -->
  <div id="api-health-modal" class="modal-overlay hidden">
    <div class="modal-box" style="max-width: 650px; width: 95%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
        <div>
          <h2 style="font-size: 17px; color: #ffffff; display: flex; align-items: center; gap: 8px;">
            <span>🩺</span> Trạng Thái Kết Nối Tất Cả API
          </h2>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Kiểm tra API Chính, Dự phòng, GitHub API &amp; CDN của Extension và Web</p>
        </div>
        <button id="btn-close-api-health" class="btn-icon" style="font-size: 16px;">✕</button>
      </div>

      <div id="api-health-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 420px; overflow-y: auto; padding-right: 4px;">
        <div class="empty-state" style="padding: 20px;">
          <div class="empty-icon">⏳</div>
          <p>Đang kiểm tra kết nối tới các hệ thống API...</p>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border);">
        <span id="api-health-summary" style="font-size: 12px; color: #94a3b8;">Đang sẵn sàng</span>
        <button id="btn-retest-apis" class="btn btn-primary" style="padding: 8px 16px; font-size: 12.5px;">
          🔄 Kiểm Tra Lại
        </button>
      </div>
    </div>
  </div>

  <!-- GitHub Token Settings Modal -->
  <div id="token-modal" class="modal-overlay hidden">
    <div class="modal-box">
      <div style="text-align: center; margin-bottom: 18px;">
        <div style="font-size: 32px; margin-bottom: 6px;">🔑</div>
        <h2 style="font-size: 18px; color: #ffffff;">Cấu Hình GitHub Token</h2>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Quyền cần thiết: Contents (Read and Write)</p>
      </div>

      <div id="token-current-status" style="margin-bottom: 14px;"></div>

      <div class="alert-box info" style="font-size: 12px; line-height: 1.5; margin-bottom: 14px;">
        Token dùng để tự động Commit & Push câu hỏi mới vào repo <b>daitaiit/autothi</b>. Bạn có thể tạo tại: <br>
        <i>GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens</i> (Quyền Contents: Read &amp; Write).
      </div>

      <div class="form-group">
        <label class="form-label">Nhập GitHub Token mới (PAT):</label>
        <input type="password" id="txt-token-input" class="form-control" placeholder="ghp_xxxxxxxxxxxxxx">
      </div>

      <div style="display: flex; gap: 10px; margin-top: 18px;">
        <button id="btn-close-token-modal" class="btn" style="flex: 1; background: rgba(255,255,255,0.08); color: #fff;">Đóng</button>
        <button id="btn-clear-token" class="btn" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">Xóa</button>
        <button id="btn-save-token" class="btn btn-primary" style="flex: 1.5;">Lưu Vĩnh Viễn</button>
      </div>
    </div>
  </div>

  <script src="assets/app.js?v=<?= time() ?>"></script>
</body>
</html>
