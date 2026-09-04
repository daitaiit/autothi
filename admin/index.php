<?php
require_once __DIR__ . '/config.php';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hệ Thống Quản Trị Đề Thi - AutoThi Admin (Tafinex)</title>
  <link rel="stylesheet" href="assets/style.css">
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
    </div>

    <div class="nav-actions">
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

  <!-- Login Modal -->
  <div id="login-modal" class="modal-overlay hidden">
    <div class="modal-box">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 36px; margin-bottom: 8px;">🔐</div>
        <h2 style="font-size: 18px; color: #ffffff;">Đăng Nhập Quản Trị AutoThi</h2>
        <p style="font-size: 12.5px; color: #94a3b8; margin-top: 4px;">autothi.tafinex.com</p>
      </div>

      <div class="form-group">
        <label class="form-label">Mật khẩu Admin:</label>
        <input type="password" id="txt-password" class="form-control" placeholder="Nhập mật khẩu quản trị...">
      </div>

      <div class="form-group">
        <label class="form-label">GitHub Token (Tùy chọn nếu chưa lưu trong config):</label>
        <input type="password" id="txt-login-token" class="form-control" placeholder="ghp_xxxx hoặc github_pat_xxxx">
      </div>

      <div id="login-msg" style="color: #f87171; font-size: 12.5px; margin-bottom: 12px; text-align: center;"></div>

      <button id="btn-login" class="btn btn-primary btn-block">
        Đăng Nhập
      </button>
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

      <div class="alert-box info" style="font-size: 12px; line-height: 1.5;">
        Token dùng để tự động Commit & Push câu hỏi mới vào repo <b>daitaiit/autothi</b>. Bạn có thể tạo tại: <br>
        <i>GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens</i>.
      </div>

      <div class="form-group">
        <label class="form-label">Nhập GitHub Token (PAT):</label>
        <input type="password" id="txt-token-input" class="form-control" placeholder="ghp_xxxxxxxxxxxxxx">
      </div>

      <div style="display: flex; gap: 10px; margin-top: 18px;">
        <button id="btn-close-token-modal" class="btn" style="flex: 1; background: rgba(255,255,255,0.08); color: #fff;">Đóng</button>
        <button id="btn-save-token" class="btn btn-primary" style="flex: 1;">Lưu Token</button>
      </div>
    </div>
  </div>

  <script src="assets/app.js"></script>
</body>
</html>
