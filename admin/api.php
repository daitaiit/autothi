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

// Lấy GitHub Token từ config hoặc session
function getEffectiveGithubToken() {
    if (!empty(GITHUB_TOKEN)) return GITHUB_TOKEN;
    if (!empty($_SESSION['github_token'])) return $_SESSION['github_token'];
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
    $password = trim($input['password'] ?? '');
    if ($password === ADMIN_PASSWORD) {
        $_SESSION['autothi_admin_logged'] = true;
        if (!empty($input['github_token'])) {
            $_SESSION['github_token'] = trim($input['github_token']);
        }
        jsonResponse(true, ['message' => 'Đăng nhập thành công!']);
    } else {
        jsonResponse(false, null, 'Mật khẩu quản trị không chính xác!', 401);
    }
}

if ($action === 'check_auth') {
    jsonResponse(true, [
        'isLoggedIn' => isAuthenticated(),
        'hasGithubToken' => !empty(getEffectiveGithubToken()),
        'owner' => GITHUB_OWNER,
        'repo' => GITHUB_REPO
    ]);
}

if ($action === 'logout') {
    $_SESSION['autothi_admin_logged'] = false;
    session_destroy();
    jsonResponse(true, ['message' => 'Đã đăng xuất']);
}

// Yêu cầu đăng nhập cho toàn bộ các hành động bên dưới
if (!isAuthenticated()) {
    jsonResponse(false, null, 'Vui lòng đăng nhập để tiếp tục!', 403);
}

// Lưu GitHub Token vào Session
if ($action === 'save_github_token') {
    $token = trim($input['token'] ?? '');
    if (!$token) {
        jsonResponse(false, null, 'Token không được để trống!');
    }
    $_SESSION['github_token'] = $token;
    jsonResponse(true, ['message' => 'Đã lưu GitHub Token vào phiên làm việc!']);
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
Nhiệm vụ: Hãy đọc kỹ văn bản thô do người dùng cung cấp (có thể copy từ Word, PDF, Web đề thi), bóc tách thành danh sách các câu hỏi trắc nghiệm hoàn chỉnh và chính xác.

QUY TẮC BÓC TÁCH:
1. Nhận diện từng câu hỏi: Nội dung câu hỏi đầy đủ, không cắt xén.
2. Nhận diện các lựa chọn (A, B, C, D...): Giữ nguyên định dạng tiền tố (ví dụ "A. ...", "B. ...").
3. Nhận diện đáp án đúng:
   - Nếu trong đề có ghi sẵn đáp án (ví dụ: "Chọn đáp án C", "Đáp án: A", in đậm, có dấu *, gạch chân...), hãy lấy chính xác đáp án đó.
   - Nếu đề KHÔNG ghi đáp án, bạn hãy tự vận dụng kiến thức chuyên gia để giải và chọn đáp án chính xác nhất.
4. Trả về định dạng JSON duy nhất dạng danh sách (Array of Objects):
{
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
        'message' => "AutoThi Admin: Cap nhat " . $addedCount . " cau hoi cho " . $contestName . " [" . date('d/m/Y H:i') . "]",
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
        jsonResponse(true, [
            'addedCount' => $addedCount,
            'totalInContest' => count($existingQuestions),
            'commitUrl' => $commitUrl,
            'message' => "🎉 Đã đẩy thành công " . $addedCount . " câu hỏi lên GitHub! Tất cả Extension sẽ tự động cập nhật."
        ]);
    } else {
        $errMsg = $putData['message'] ?? "Lỗi Commit GitHub (Mã HTTP $putHttpCode)";
        jsonResponse(false, null, $errMsg, 500);
    }
}

jsonResponse(false, null, 'Yêu cầu không hợp lệ!', 400);
