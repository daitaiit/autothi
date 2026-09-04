<?php
// Cấu hình Hệ thống Admin AutoThi - autothi.tafinex.com
// -------------------------------------------------------------

// Thiết lập múi giờ Việt Nam (GMT+7)
date_default_timezone_set('Asia/Ho_Chi_Minh');

// 1. Tài khoản đăng nhập trang Quản trị Admin
define('ADMIN_USERNAME', 'daitaiadmin');
define('ADMIN_PASSWORD', 'D@iT@i1998');

// 2. Cấu hình AI ShopAIKey (Mặc định dùng gpt-4o-mini để siêu tiết kiệm token)
define('SHOPAIKEY_API_KEY', 'sk-4OmuvVaeLHVgJozU3EjsteCapGXuwZu5rUBUkRcVrjXeLHXd');
define('SHOPAIKEY_API_URL', 'https://api.shopaikey.com/v1/chat/completions');
define('DEFAULT_AI_MODEL', 'gpt-4o-mini');

// 3. Cấu hình GitHub Repository
define('GITHUB_OWNER', 'daitaiit');
define('GITHUB_REPO', 'autothi');
define('GITHUB_BRANCH', 'main');
define('GITHUB_FILE_PATH', 'contests_manifest.json');

// 4. GitHub Personal Access Token (PAT)
// Bạn có thể điền trực tiếp Token vào đây hoặc nhập trên giao diện web Admin
// Cách tạo Token: GitHub Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens (Quyền: Contents: Read and write)
define('GITHUB_TOKEN', ''); 

// 5. Cài đặt bảo mật Session
ini_set('session.cookie_httponly', 1);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
