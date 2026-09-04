<?php
// API Xử Lý Backend Cho Trang Quản Trị AutoThi (autothi.tafinex.com)
// -------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

// Hàm gửi phản hồi JSON
function jsonResponse($success, $data = null, $error = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kiểm tra quyền Admin
function isAuthenticated() {
    return !empty($_SESSION['autothi_admin_logged']);
}

// File lưu trữ GitHub Token vĩnh viễn trên server
define('TOKEN_STORE_FILE', __DIR__ . '/.github_token.secret');

// Lấy GitHub Token từ config, file bí mật, session hoặc HTTP headers
function getEffectiveGithubToken() {
    if (!empty(GITHUB_TOKEN)) return GITHUB_TOKEN;
    if (file_exists(TOKEN_STORE_FILE)) {
        $saved = trim((string)@file_get_contents(TOKEN_STORE_FILE));
        if (!empty($saved)) return $saved;
    }
    if (!empty($_SESSION['github_token'])) return $_SESSION['github_token'];

    // Lấy từ HTTP header nếu client gửi kèm
    if (!empty($_SERVER['HTTP_X_GITHUB_TOKEN'])) {
        $hdrToken = trim($_SERVER['HTTP_X_GITHUB_TOKEN']);
        if (!empty($hdrToken)) {
            $_SESSION['github_token'] = $hdrToken;
            @file_put_contents(TOKEN_STORE_FILE, $hdrToken);
            return $hdrToken;
        }
    }

    return null;
}

// Nhận dữ liệu đầu vào JSON
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: [];
$action = $_GET['action'] ?? $input['action'] ?? '';

// -------------------------------------------------------------
// 1. Xác thực & Đăng nhập
// -------------------------------------------------------------
if ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    if ($username === ADMIN_USERNAME && $password === ADMIN_PASSWORD) {
        $_SESSION['autothi_admin_logged'] = true;
        if (!empty($input['github_token'])) {
            $token = trim($input['github_token']);
            $_SESSION['github_token'] = $token;
            @file_put_contents(TOKEN_STORE_FILE, $token);
        }
        $effectiveToken = getEffectiveGithubToken();
        jsonResponse(true, [
            'message' => 'Đăng nhập thành công!',
            'hasGithubToken' => !empty($effectiveToken),
            'tokenMasked' => $effectiveToken ? (substr($effectiveToken, 0, 8) . '...' . substr($effectiveToken, -4)) : ''
        ]);
    } else {
        jsonResponse(false, null, 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác!', 401);
    }
}

if ($action === 'check_auth') {
    $token = getEffectiveGithubToken();
    jsonResponse(true, [
        'isLoggedIn' => isAuthenticated(),
        'username' => ADMIN_USERNAME,
        'hasGithubToken' => !empty($token),
        'tokenMasked' => $token ? (substr($token, 0, 8) . '...' . substr($token, -4)) : '',
        'owner' => GITHUB_OWNER,
        'repo' => GITHUB_REPO
    ]);
}

if ($action === 'logout') {
    $_SESSION['autothi_admin_logged'] = false;
    session_destroy();
    jsonResponse(true, ['message' => 'Đã đăng xuất']);
}

// -------------------------------------------------------------
// Kiểm tra trạng thái tất cả API kết nối (Chính & Backup)
// -------------------------------------------------------------
if ($action === 'test_apis') {
    $results = [];

    // Helper kiểm tra AI model
    function pingAiModel($model) {
        $t0 = microtime(true);
        $payload = [
            'model' => $model,
            'messages' => [['role' => 'user', 'content' => 'ping']],
            'max_tokens' => 5
        ];
        $ch = curl_init(SHOPAIKEY_API_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . SHOPAIKEY_API_KEY
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 12
        ]);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        $latency = round((microtime(true) - $t0) * 1000);

        if ($err) {
            return ['status' => 'error', 'httpCode' => 0, 'latency' => $latency, 'message' => 'Lỗi kết nối: ' . $err];
        }
        $data = json_decode($res, true);
        if ($httpCode === 200 && !empty($data['choices'])) {
            return ['status' => 'ok', 'httpCode' => 200, 'latency' => $latency, 'message' => "Hoạt động hoàn hảo ({$latency}ms)"];
        }
        $msg = $data['error']['message'] ?? "Lỗi HTTP $httpCode";
        return ['status' => 'error', 'httpCode' => $httpCode, 'latency' => $latency, 'message' => $msg];
    }

    // 1. API AI Chính (gpt-4o-mini)
    $results['ai_primary'] = array_merge([
        'name' => 'Model AI Chính: gpt-4o-mini',
        'category' => 'Model Chính (Mặc định cho Web & Extension)',
        'model' => 'gpt-4o-mini',
        'is_primary' => true
    ], pingAiModel('gpt-4o-mini'));

    // 2. API AI Dự phòng 1 (deepseek-v3)
    $results['ai_backup_deepseek'] = array_merge([
        'name' => 'Model Dự Phòng 1: deepseek-v3',
        'category' => 'Model Backup (Tư duy phản biện 90%, siêu rẻ)',
        'model' => 'deepseek-v3',
        'is_primary' => false
    ], pingAiModel('deepseek-v3'));

    // 3. API AI Dự phòng 2 (gpt-4o)
    $results['ai_backup_gpt4o'] = array_merge([
        'name' => 'Model Dự Phòng 2: gpt-4o',
        'category' => 'Model Backup (Độ chính xác cao nhất 100%)',
        'model' => 'gpt-4o',
        'is_primary' => false
    ], pingAiModel('gpt-4o'));

    // 4. API AI Dự phòng 3 (qwen-flash)
    $results['ai_backup_qwen'] = array_merge([
        'name' => 'Model Dự Phòng 3: qwen-flash',
        'category' => 'Model Backup (Tốc độ phản hồi tức thì)',
        'model' => 'qwen-flash',
        'is_primary' => false
    ], pingAiModel('qwen-flash'));

    // 4. GitHub REST API (Commit & Repo)
    $t0 = microtime(true);
    $token = getEffectiveGithubToken();
    $headers = [
        'User-Agent: AutoThi-Admin',
        'Accept: application/vnd.github.v3+json'
    ];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    $ch = curl_init('https://api.github.com/repos/' . GITHUB_OWNER . '/' . GITHUB_REPO);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 8
    ]);
    $ghRes = curl_exec($ch);
    $ghCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ghErr = curl_error($ch);
    curl_close($ch);
    $ghLatency = round((microtime(true) - $t0) * 1000);

    if ($ghErr) {
        $ghStatus = ['status' => 'error', 'httpCode' => 0, 'latency' => $ghLatency, 'message' => 'Lỗi kết nối GitHub: ' . $ghErr];
    } else {
        $ghData = json_decode($ghRes, true);
        if ($ghCode === 200) {
            $hasWrite = !empty($token);
            $ghStatus = [
                'status' => 'ok',
                'httpCode' => 200,
                'latency' => $ghLatency,
                'message' => "Kết nối Repo thành công ({$ghLatency}ms)" . ($hasWrite ? ' [Token ghi hợp lệ]' : ' [Chưa nạp Token ghi]')
            ];
        } else {
            $ghStatus = [
                'status' => 'warning',
                'httpCode' => $ghCode,
                'latency' => $ghLatency,
                'message' => $ghData['message'] ?? "GitHub trả về mã $ghCode"
            ];
        }
    }
    $results['github_api'] = array_merge([
        'name' => 'GitHub REST API (Repo daitaiit/autothi)',
        'category' => 'Hệ thống Quản lý & Commit đề',
        'endpoint' => 'https://api.github.com/repos/' . GITHUB_OWNER . '/' . GITHUB_REPO
    ], $ghStatus);

    // 5. GitHub Raw CDN (Kênh tải về của Extension)
    $t0 = microtime(true);
    $rawUrl = 'https://raw.githubusercontent.com/' . GITHUB_OWNER . '/' . GITHUB_REPO . '/' . GITHUB_BRANCH . '/' . GITHUB_FILE_PATH . '?t=' . time();
    $ch = curl_init($rawUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => ['User-Agent: AutoThi-Admin']
    ]);
    $rawRes = curl_exec($ch);
    $rawCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $rawErr = curl_error($ch);
    curl_close($ch);
    $rawLatency = round((microtime(true) - $t0) * 1000);

    if ($rawErr) {
        $rawStatus = ['status' => 'error', 'httpCode' => 0, 'latency' => $rawLatency, 'message' => 'Lỗi kết nối CDN: ' . $rawErr];
    } elseif ($rawCode === 200) {
        $sizeKb = round(strlen($rawRes) / 1024, 1);
        $rawStatus = ['status' => 'ok', 'httpCode' => 200, 'latency' => $rawLatency, 'message' => "CDN phân phối sẵn sàng ({$sizeKb} KB, {$rawLatency}ms)"];
    } else {
        $rawStatus = ['status' => 'error', 'httpCode' => $rawCode, 'latency' => $rawLatency, 'message' => "CDN trả về mã $rawCode"];
    }
    $results['github_cdn'] = array_merge([
        'name' => 'GitHub Raw CDN (Kênh cập nhật của Extension)',
        'category' => 'Kênh phân phối dữ liệu cho tiện ích',
        'endpoint' => $rawUrl
    ], $rawStatus);

    jsonResponse(true, $results);
}

// Yêu cầu đăng nhập cho toàn bộ các hành động bên dưới
if (!isAuthenticated()) {
    jsonResponse(false, null, 'Vui lòng đăng nhập để tiếp tục!', 403);
}

// Lưu / Xóa GitHub Token vĩnh viễn trên server
if ($action === 'save_github_token') {
    if (!empty($input['clear'])) {
        unset($_SESSION['github_token']);
        if (file_exists(TOKEN_STORE_FILE)) @unlink(TOKEN_STORE_FILE);
        jsonResponse(true, ['message' => 'Đã xóa GitHub Token khỏi hệ thống!']);
    }

    $token = trim($input['token'] ?? '');
    if (!$token) {
        jsonResponse(false, null, 'Token không được để trống!');
    }
    $_SESSION['github_token'] = $token;
    @file_put_contents(TOKEN_STORE_FILE, $token);
    jsonResponse(true, [
        'message' => 'Đã lưu vĩnh viễn GitHub Token vào hệ thống! Từ nay không cần nhập lại nữa.',
        'tokenMasked' => substr($token, 0, 8) . '...' . substr($token, -4)
    ]);
}

// -------------------------------------------------------------
// 2. Lấy Danh Sách Cuộc Thi & Câu Hỏi Trực Quan Từ GitHub
// -------------------------------------------------------------
if ($action === 'get_contests') {
    $url = 'https://raw.githubusercontent.com/' . GITHUB_OWNER . '/' . GITHUB_REPO . '/' . GITHUB_BRANCH . '/' . GITHUB_FILE_PATH . '?t=' . time();
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 10,
            'header' => "User-Agent: AutoThi-Admin\r\n"
        ]
    ]);
    $json = @file_get_contents($url, false, $ctx);
    
    if ($json) {
        $manifest = json_decode($json, true);
        if ($manifest && isset($manifest['contests'])) {
            $formattedContests = [];
            $totalQuestionsAll = 0;

            foreach ($manifest['contests'] as $c) {
                $qList = [];
                if (!empty($c['questions'])) {
                    if (is_array($c['questions'])) {
                        $isAssoc = array_keys($c['questions']) !== range(0, count($c['questions']) - 1);
                        if ($isAssoc) {
                            foreach ($c['questions'] as $k => $qItem) {
                                $qList[] = [
                                    'question' => $qItem['question'] ?? $k,
                                    'correctAnswer' => $qItem['correctAnswer'] ?? $qItem['answer'] ?? '',
                                    'options' => $qItem['options'] ?? []
                                ];
                            }
                        } else {
                            $qList = $c['questions'];
                        }
                    }
                }
                $c['questions_normalized'] = $qList;
                $c['question_count'] = count($qList);
                $totalQuestionsAll += count($qList);
                $formattedContests[] = $c;
            }

            jsonResponse(true, [
                'contests' => $formattedContests,
                'total_questions_all' => $totalQuestionsAll,
                'manifest_version' => $manifest['version'] ?? $manifest['manifest_version'] ?? '1.0',
                'updated_at' => $manifest['updated_at'] ?? date('Y-m-d H:i:s'),
                'announcement' => $manifest['announcement'] ?? ''
            ]);
        }
    }

    // Fallback nếu không gọi được raw
    jsonResponse(true, [
        'contests' => [],
        'total_questions_all' => 0,
        'manifest_version' => '1.0',
        'updated_at' => date('Y-m-d')
    ]);
}

// -------------------------------------------------------------
// Xóa Câu Hỏi Trực Tiếp Khỏi GitHub
// -------------------------------------------------------------
if ($action === 'delete_github_question') {
    $token = getEffectiveGithubToken();
    if (empty($token)) {
        jsonResponse(false, null, 'Chưa có GitHub Token để thực hiện thao tác xóa!', 400);
    }

    $contestId = trim($input['contest_id'] ?? '');
    $qText = trim($input['question'] ?? '');

    if (empty($contestId) || empty($qText)) {
        jsonResponse(false, null, 'Thiếu thông tin cuộc thi hoặc câu hỏi cần xóa!');
    }

    $apiUrl = 'https://api.github.com/repos/' . GITHUB_OWNER . '/' . GITHUB_REPO . '/contents/' . GITHUB_FILE_PATH . '?ref=' . GITHUB_BRANCH;
    
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'User-Agent: AutoThi-Admin',
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github.v3+json'
        ],
        CURLOPT_TIMEOUT => 20
    ]);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(false, null, "Không thể đọc file từ GitHub (Mã HTTP $httpCode)", 500);
    }

    $fileData = json_decode($res, true);
    $sha = $fileData['sha'] ?? '';
    $manifest = json_decode(base64_decode($fileData['content'] ?? ''), true);

    function normStr($t) {
        return preg_replace('/[^\p{L}\p{N}]+/u', '', mb_strtolower(trim($t), 'UTF-8'));
    }
    $targetNorm = normStr($qText);
    $deleted = false;

    if (isset($manifest['contests'])) {
        foreach ($manifest['contests'] as &$c) {
            if ($c['id'] === $contestId) {
                if (isset($c['questions']) && is_array($c['questions'])) {
                    $isAssoc = array_keys($c['questions']) !== range(0, count($c['questions']) - 1);
                    if ($isAssoc) {
                        foreach ($c['questions'] as $k => $v) {
                            if (normStr($k) === $targetNorm || normStr($v['question'] ?? '') === $targetNorm) {
                                unset($c['questions'][$k]);
                                $deleted = true;
                                break;
                            }
                        }
                    } else {
                        foreach ($c['questions'] as $idx => $item) {
                            if (normStr($item['question'] ?? '') === $targetNorm) {
                                array_splice($c['questions'], $idx, 1);
                                $deleted = true;
                                break;
                            }
                        }
                    }
                }
                $c['total_questions'] = count($c['questions']);
                $c['question_count'] = count($c['questions']);
                break;
            }
        }
    }

    if (!$deleted) {
        jsonResponse(false, null, 'Không tìm thấy câu hỏi này trong cuộc thi để xóa!');
    }

    $manifest['updated_at'] = date('Y-m-d H:i:s');
    $updatedJsonStr = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $commitPayload = [
        'message' => "AutoThi Admin: Xoa 1 cau hoi khoi " . $contestId . " [" . date('d/m/Y H:i') . "]",
        'content' => base64_encode($updatedJsonStr),
        'sha' => $sha,
        'branch' => GITHUB_BRANCH
    ];

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_HTTPHEADER => [
            'User-Agent: AutoThi-Admin',
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/vnd.github.v3+json'
        ],
        CURLOPT_POSTFIELDS => json_encode($commitPayload),
        CURLOPT_TIMEOUT => 30
    ]);
    $putRes = curl_exec($ch);
    $putHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($putHttpCode === 200 || $putHttpCode === 201) {
        jsonResponse(true, ['message' => 'Đã xóa câu hỏi khỏi GitHub thành công!']);
    } else {
        jsonResponse(false, null, 'Lỗi commit lên GitHub khi xóa!', 500);
    }
}

// -------------------------------------------------------------
// 3. Phân Tích Văn Bản Thô Bằng GPT-4o-mini
// -------------------------------------------------------------
if ($action === 'parse_questions') {
    $rawText = trim($input['text'] ?? '');
    $model = trim($input['model'] ?? DEFAULT_AI_MODEL);

    if (empty($rawText)) {
        jsonResponse(false, null, 'Nội dung văn bản trống. Vui lòng dán câu hỏi!');
    }

    $systemInstruction = <<<EOT
Bạn là chuyên gia phân tích dữ liệu và bóc tách đề thi trắc nghiệm học thuật tại Việt Nam.
Nhiệm vụ: Hãy đọc kỹ văn bản thô do người dùng cung cấp (có thể copy từ Word, PDF, Web đề thi), bóc tách thành danh sách các câu hỏi trắc nghiệm hoàn chỉnh và chính xác, đồng thời nhận diện thông tin cuộc thi (Tên cuộc thi, Mã cuộc thi slug không dấu, Mô tả).

QUY TẮC BÓC TÁCH:
1. Nhận diện Cuộc Thi:
   - "contest_name": Tên cuộc thi đầy đủ, trang trọng (Ví dụ: "Hội nghị toàn quốc học tập, quán triệt Nghị quyết 2026" hoặc "Hội thi Tìm hiểu Tư tưởng Hồ Chí Minh 2026"). Nếu trong bài không ghi rõ, hãy đặt tên theo chủ đề chính của câu hỏi.
   - "contest_id": Mã định danh viết thường không dấu nối bằng dấu gạch ngang (slug), có kèm năm (Ví dụ: "hoi-nghi-nghi-quyet-tw-2026" hoặc "tu-tuong-hcm-2026").
   - "contest_desc": Mô tả ngắn gọn 1 câu về nội dung cuộc thi (Ví dụ: "Trọn bộ câu hỏi và đáp án trắc nghiệm tìm hiểu...").

2. Nhận diện từng câu hỏi: Nội dung câu hỏi đầy đủ, không cắt xén.
3. Nhận diện các lựa chọn (A, B, C, D...): Giữ nguyên định dạng tiền tố (ví dụ "A. ...", "B. ...").
4. Nhận diện đáp án đúng:
   - Nếu trong đề có ghi sẵn đáp án (ví dụ: "Chọn đáp án C", "Đáp án: A", in đậm, có dấu *, gạch chân...), hãy lấy chính xác đáp án đó.
   - Nếu đề KHÔNG ghi đáp án, bạn hãy tự vận dụng kiến thức chuyên gia để giải và chọn đáp án chính xác nhất.

5. Trả về định dạng JSON duy nhất dạng đối tượng:
{
  "contest_name": "<Tên cuộc thi đầy đủ>",
  "contest_id": "<slug-khong-dau-kem-nam>",
  "contest_desc": "<Mô tả ngắn cuộc thi>",
  "total": <tổng số câu bóc tách được>,
  "questions": [
    {
      "question": "<Nội dung câu hỏi>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "<Nội dung đáp án đúng đầy đủ, ví dụ: 'C. Tạp chí Học tập'>",
      "explanation": "<Giải thích ngắn gọn 1 câu vì sao đúng>"
    }
  ]
}
EOT;

    $payload = [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $systemInstruction],
            ['role' => 'user', 'content' => "Văn bản thô cần bóc tách đề thi:\n\n" . $rawText]
        ],
        'temperature' => 0.1,
        'response_format' => ['type' => 'json_object']
    ];

    $ch = curl_init(SHOPAIKEY_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . SHOPAIKEY_API_KEY
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 90
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        jsonResponse(false, null, 'Lỗi kết nối ShopAIKey API: ' . $curlError, 500);
    }

    $resData = json_decode($response, true);
    if ($httpCode !== 200 || !empty($resData['error'])) {
        $errMsg = $resData['error']['message'] ?? "Lỗi API ShopAIKey (Mã HTTP $httpCode)";
        jsonResponse(false, null, $errMsg, 500);
    }

    $rawContent = $resData['choices'][0]['message']['content'] ?? '';
    if (empty($rawContent)) {
        jsonResponse(false, null, 'Không nhận được kết quả từ mô hình AI!', 500);
    }

    // Parse JSON
    $cleanJson = trim($rawContent);
    if (preg_match('/\{[\s\S]*\}/', $cleanJson, $matches)) {
        $cleanJson = $matches[0];
    }
    $parsed = json_decode($cleanJson, true);

    if (!$parsed || !isset($parsed['questions'])) {
        jsonResponse(false, null, 'AI không xuất đúng định dạng JSON danh sách câu hỏi: ' . substr($cleanJson, 0, 200), 500);
    }

    jsonResponse(true, [
        'contest_name' => $parsed['contest_name'] ?? '',
        'contest_id' => $parsed['contest_id'] ?? '',
        'contest_desc' => $parsed['contest_desc'] ?? '',
        'total' => count($parsed['questions']),
        'questions' => $parsed['questions'],
        'modelUsed' => $model
    ]);
}

// -------------------------------------------------------------
// 4. Đồng Bộ & Đẩy Dữ Liệu Lên GitHub (Commit to contests_manifest.json)
// -------------------------------------------------------------
if ($action === 'push_to_github') {
    $token = getEffectiveGithubToken();
    if (empty($token)) {
        jsonResponse(false, null, 'Chưa có GitHub Token! Vui lòng nhập GitHub Personal Access Token (PAT) để đẩy dữ liệu.', 400);
    }

    $contestId = trim($input['contest_id'] ?? '');
    $contestName = trim($input['contest_name'] ?? '');
    $contestDesc = trim($input['contest_desc'] ?? '');
    $questions = $input['questions'] ?? [];

    if (empty($contestId) || empty($contestName)) {
        jsonResponse(false, null, 'Mã cuộc thi (ID) và Tên cuộc thi không được để trống!');
    }

    if (empty($questions) || !is_array($questions)) {
        jsonResponse(false, null, 'Danh sách câu hỏi cần đẩy lên trống!');
    }

    // B1: Lấy file hiện tại trên GitHub để lấy SHA và Content
    $apiUrl = 'https://api.github.com/repos/' . GITHUB_OWNER . '/' . GITHUB_REPO . '/contents/' . GITHUB_FILE_PATH . '?ref=' . GITHUB_BRANCH;
    
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'User-Agent: AutoThi-Admin',
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github.v3+json'
        ],
        CURLOPT_TIMEOUT => 20
    ]);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(false, null, "Không thể đọc file từ GitHub (Mã HTTP $httpCode). Kiểm tra lại Token có quyền 'Contents: Read and write' hay chưa.", 500);
    }

    $fileData = json_decode($res, true);
    $sha = $fileData['sha'] ?? '';
    $currentContentBase64 = $fileData['content'] ?? '';
    $currentJson = base64_decode($currentContentBase64);
    $manifest = json_decode($currentJson, true) ?: [
        'manifest_version' => '1.0',
        'contests' => []
    ];

    // B2: Tìm cuộc thi hoặc tạo mới
    $contestIndex = -1;
    foreach ($manifest['contests'] as $idx => $c) {
        if ($c['id'] === $contestId) {
            $contestIndex = $idx;
            break;
        }
    }

    $existingQuestions = [];
    if ($contestIndex !== -1) {
        $existingQuestions = $manifest['contests'][$contestIndex]['questions'] ?? [];
        $manifest['contests'][$contestIndex]['name'] = $contestName;
        if (!empty($contestDesc)) {
            $manifest['contests'][$contestIndex]['description'] = $contestDesc;
        }
        $manifest['contests'][$contestIndex]['last_updated'] = date('Y-m-d');
    } else {
        // Tạo cuộc thi mới
        $manifest['contests'][] = [
            'id' => $contestId,
            'name' => $contestName,
            'description' => $contestDesc ?: ('Ngân hàng câu hỏi ' . $contestName),
            'last_updated' => date('Y-m-d'),
            'questions' => []
        ];
        $contestIndex = count($manifest['contests']) - 1;
    }

    // B3: Chuẩn hóa và gộp câu hỏi mới (chống trùng lặp)
    function normalizeQ($text) {
        $t = mb_strtolower(trim($text), 'UTF-8');
        return preg_replace('/[^\p{L}\p{N}]+/u', '', $t);
    }

    $existingMap = [];
    foreach ($existingQuestions as $q) {
        $key = normalizeQ($q['question']);
        if ($key) $existingMap[$key] = true;
    }

    $addedCount = 0;
    $updatedCount = 0;
    foreach ($questions as $newQ) {
        $qText = trim($newQ['question'] ?? '');
        $ansText = trim($newQ['correctAnswer'] ?? $newQ['answer'] ?? '');
        $opts = $newQ['options'] ?? [];

        if (empty($qText) || empty($ansText)) continue;

        $key = normalizeQ($qText);
        if (isset($existingMap[$key])) {
            // Cập nhật đáp án nếu câu này đã có
            foreach ($existingQuestions as &$eq) {
                if (normalizeQ($eq['question']) === $key) {
                    $eq['correctAnswer'] = $ansText;
                    if (!empty($opts)) $eq['options'] = $opts;
                    $updatedCount++;
                }
            }
        } else {
            // Thêm mới
            $existingQuestions[] = [
                'question' => $qText,
                'correctAnswer' => $ansText,
                'options' => $opts
            ];
            $existingMap[$key] = true;
            $addedCount++;
        }
    }

    $manifest['contests'][$contestIndex]['questions'] = $existingQuestions;
    $manifest['contests'][$contestIndex]['question_count'] = count($existingQuestions);
    $manifest['updated_at'] = date('Y-m-d H:i:s');
    $manifest['announcement'] = 'Đã cập nhật thêm ' . $addedCount . ' câu hỏi mới cho cuộc thi: ' . $contestName;

    // B4: Gọi GitHub API commit & push
    $updatedJsonStr = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $commitPayload = [
        'message' => "AutoThi Admin: Cap nhat " . $addedCount . " cau moi, " . $updatedCount . " cau sua cho " . $contestName . " [" . date('d/m/Y H:i') . "]",
        'content' => base64_encode($updatedJsonStr),
        'sha' => $sha,
        'branch' => GITHUB_BRANCH
    ];

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_HTTPHEADER => [
            'User-Agent: AutoThi-Admin',
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/vnd.github.v3+json'
        ],
        CURLOPT_POSTFIELDS => json_encode($commitPayload),
        CURLOPT_TIMEOUT => 30
    ]);
    $putRes = curl_exec($ch);
    $putHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $putData = json_decode($putRes, true);
    if ($putHttpCode === 200 || $putHttpCode === 201) {
        $commitUrl = $putData['commit']['html_url'] ?? '';
        $msg = "🎉 Đã đồng bộ thành công lên GitHub!\n• Thêm mới: {$addedCount} câu\n• Cập nhật đáp án: {$updatedCount} câu\n• Tổng số câu hiện tại trong cuộc thi: " . count($existingQuestions) . " câu.";
        jsonResponse(true, [
            'addedCount' => $addedCount,
            'updatedCount' => $updatedCount,
            'totalInContest' => count($existingQuestions),
            'commitUrl' => $commitUrl,
            'message' => $msg
        ]);
    } else {
        $errMsg = $putData['message'] ?? "Lỗi Commit GitHub (Mã HTTP $putHttpCode)";
        jsonResponse(false, null, $errMsg, 500);
    }
}

jsonResponse(false, null, 'Yêu cầu không hợp lệ!', 400);
