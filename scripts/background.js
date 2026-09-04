// AutoThi AI - Service Worker (Background Script)

const DEFAULT_API_KEY = "sk-4OmuvVaeLHVgJozU3EjsteCapGXuwZu5rUBUkRcVrjXeLHXd";
const DEFAULT_API_URL = "https://api.shopaikey.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_SERVER_URL = "https://raw.githubusercontent.com/daitaiit/autothi/main/contests_manifest.json";

const DEFAULT_SETTINGS = {
  apiKey: DEFAULT_API_KEY,
  model: DEFAULT_MODEL,
  mode: "auto", // 'auto' | 'highlight'
  autoNext: true,
  autoSubmit: true,
  autoPredict: true,
  predictNumber: "",
  minDelay: 1500,
  maxDelay: 3000,
  autoLearn: true,
  enabled: true,
  showFloatingDock: false,
  serverUrl: DEFAULT_SERVER_URL,
  autoCheckUpdate: true
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["settings", "questionBank", "installedContests"]);
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  } else {
    const updated = { ...DEFAULT_SETTINGS, ...data.settings };
    if (!updated.apiKey || updated.apiKey.startsWith("AIzaSy")) {
      updated.apiKey = DEFAULT_API_KEY;
    }
    if (!updated.model || updated.model.includes("gemini") || updated.model.includes("1.5") || updated.model.includes("2.0") || updated.model === "gpt-4o-mini") {
      updated.model = DEFAULT_MODEL;
    }
    await chrome.storage.local.set({ settings: updated });
  }

  // Tải trực tiếp gói đề thi nội bộ và đồng bộ tự động từ GitHub
  await loadDefaultQuestionBank();
  await syncLatestOnlineQuestions(true);

  // Tạo định kỳ tự động cập nhật mỗi 15 phút
  try {
    chrome.alarms.create("AUTO_SYNC_ALARM", { periodInMinutes: 15 });
  } catch (e) {}

  console.log("AutoThi AI Extension đã sẵn sàng!");
});

// Periodic background check & startup sync
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get("settings");
  if (data.settings) {
    let changed = false;
    if (data.settings.apiKey && data.settings.apiKey.startsWith("AIzaSy")) {
      data.settings.apiKey = DEFAULT_API_KEY;
      changed = true;
    }
    if (!data.settings.model || data.settings.model.includes("gemini") || data.settings.model.includes("1.5") || data.settings.model.includes("2.0") || data.settings.model === "gpt-4o-mini") {
      data.settings.model = DEFAULT_MODEL;
      changed = true;
    }
    if (changed) {
      await chrome.storage.local.set({ settings: data.settings });
    }
  }
  syncLatestOnlineQuestions(true);
});

// Alarm listener for automatic background updates
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === "AUTO_SYNC_ALARM") {
      syncLatestOnlineQuestions(true);
    }
  });
}

async function loadDefaultQuestionBank() {
  try {
    const res = await fetch(chrome.runtime.getURL("contests_manifest.json"));
    if (res.ok) {
      const manifest = await res.json();
      if (manifest.contests && Array.isArray(manifest.contests)) {
        for (const contest of manifest.contests) {
          await installContestPackage(contest);
        }
        console.log("✓ Đã nạp sẵn tất cả bộ đề thi chính thức!");
      }
    }
  } catch (e) {
    console.log("Load initial bank notice:", e);
  }
}

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_QUESTION") {
    handleSolveQuestion(request.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "TEST_API_KEY") {
    testApiKey(request.apiKey, request.model)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "SAVE_LEARNED_QUESTIONS") {
    saveLearnedQuestions(request.questions)
      .then(count => sendResponse({ success: true, count }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "CHECK_ONLINE_UPDATES") {
    syncLatestOnlineQuestions(true, request.serverUrl)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "INSTALL_CONTEST_PACKAGE") {
    installContestPackage(request.contest)
      .then(count => sendResponse({ success: true, count }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// -------------------------------------------------------------
// Online Update & Question Package Management (Full Auto-Sync)
// -------------------------------------------------------------

async function syncLatestOnlineQuestions(autoInstall = true, customUrl = null) {
  const serverUrl = customUrl || (await getSetting("serverUrl")) || DEFAULT_SERVER_URL;

  try {
    const res = await fetch(serverUrl + (serverUrl.includes("?") ? "&" : "?") + "t=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`Máy chủ phản hồi HTTP ${res.status}: ${res.statusText}`);
    }

    const manifest = await res.json();
    const storage = await chrome.storage.local.get(["installedContests"]);
    const installed = storage.installedContests || {};

    let updateCount = 0;
    let autoInstalledCount = 0;

    const contestsWithStatus = [];
    for (const contest of (manifest.contests || [])) {
      const local = installed[contest.id];
      const hasUpdate = !local || (contest.version > (local.version || 0));
      
      if (hasUpdate) {
        updateCount++;
        if (autoInstall) {
          try {
            await installContestPackage(contest);
            autoInstalledCount++;
          } catch (instErr) {
            console.warn("Lỗi tự động cài gói đề:", contest.id, instErr);
          }
        }
      }

      contestsWithStatus.push({
        ...contest,
        hasUpdate: autoInstall ? false : hasUpdate,
        installedVersion: contest.version,
        isInstalled: true
      });
    }

    // Sau khi tự động cập nhật xong, xóa thông báo badge
    chrome.action.setBadgeText({ text: "" });

    if (autoInstalledCount > 0) {
      console.log(`🎉 AutoThi: Đã tự động cập nhật & nạp ${autoInstalledCount} bộ đề mới nhất từ máy chủ GitHub!`);
    }

    return {
      isConfigured: true,
      serverUrl,
      announcement: manifest.announcement || "",
      updateCount: autoInstall ? 0 : updateCount,
      autoInstalledCount,
      contests: contestsWithStatus
    };
  } catch (err) {
    console.warn("Lỗi kiểm tra cập nhật online (sử dụng dữ liệu offline có sẵn):", err);
    // Fallback load local
    await loadDefaultQuestionBank();
    return {
      isConfigured: true,
      serverUrl,
      announcement: "Đang sử dụng dữ liệu ngoại tuyến có sẵn.",
      updateCount: 0,
      contests: []
    };
  }
}

async function installContestPackage(contest) {
  let questionsToMerge = contest.questions;

  // If questions are hosted at external package_url
  if (!questionsToMerge && contest.package_url) {
    const res = await fetch(contest.package_url + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Không thể tải gói câu hỏi từ URL");
    const pkg = await res.json();
    questionsToMerge = pkg.questions || pkg;
  }

  if (!questionsToMerge || typeof questionsToMerge !== "object") {
    throw new Error("Dữ liệu câu hỏi trong gói không hợp lệ");
  }

  const storage = await chrome.storage.local.get(["questionBank", "installedContests"]);
  const bank = storage.questionBank || {};
  const installed = storage.installedContests || {};

  let count = 0;
  // If questions is an array
  if (Array.isArray(questionsToMerge)) {
    for (const item of questionsToMerge) {
      const key = normalizeText(item.question);
      if (key) {
        bank[key] = {
          question: item.question,
          correctAnswer: item.correctAnswer || item.answer,
          options: item.options || [],
          contestId: contest.id,
          updatedAt: new Date().toISOString()
        };
        count++;
      }
    }
  } else {
    // If questions is a dictionary
    for (const [rawKey, item] of Object.entries(questionsToMerge)) {
      const key = normalizeText(item.question || rawKey);
      if (key) {
        bank[key] = {
          question: item.question || rawKey,
          correctAnswer: item.correctAnswer || item.answer,
          options: item.options || [],
          contestId: contest.id,
          updatedAt: new Date().toISOString()
        };
        count++;
      }
    }
  }

  // Update installed contests record
  installed[contest.id] = {
    id: contest.id,
    name: contest.name,
    version: contest.version,
    domain_match: contest.domain_match || "",
    contest_url: contest.contest_url || "",
    updatedAt: new Date().toISOString(),
    displayDate: contest.updated_at || "27/08/2026",
    totalQuestions: count
  };

  await chrome.storage.local.set({
    questionBank: bank,
    installedContests: installed
  });

  // Re-check updates to clear badge
  checkOnlineUpdates();

  return count;
}

// -------------------------------------------------------------
// ShopAIKey AI Solver (OpenAI-Compatible Standard)
// -------------------------------------------------------------

async function handleSolveQuestion({ questionText, options, apiKey, model }) {
  const key = apiKey || (await getSetting("apiKey")) || DEFAULT_API_KEY;
  let targetModel = model || (await getSetting("model")) || DEFAULT_MODEL;
  if (!targetModel || targetModel.includes("gemini") || targetModel === "gpt-4o-mini") {
    targetModel = DEFAULT_MODEL;
  }

  const optionsFormatted = options
    .map((opt, idx) => `[${idx}] ${opt.text}`)
    .join("\n");

  const systemInstruction = `Bạn là một chuyên gia tư duy phản biện và giải đề thi trắc nghiệm học thuật, kỹ thuật, lịch sử, chính trị, pháp luật, triết học và kiến thức chung đỉnh cao tại Việt Nam.
Nhiệm vụ của bạn: Giải quyết câu hỏi trắc nghiệm một cách chính xác tuyệt đối 100%.

QUY TRÌNH TƯ DUY PHẢN BIỆN (CHAIN-OF-THOUGHT BẮT BUỘC):
1. Phân tích ngữ cảnh và yêu cầu cốt lõi của câu hỏi:
   - Xác định chính xác sự kiện lịch sử, nhân vật, mốc thời gian, công thức, định lý, quy định pháp luật (Hiến pháp, Luật hiện hành) hoặc đặc tính công nghệ.
   - Nhận diện và cẩn trọng với các bẫy ngữ nghĩa: đảo ngược thứ tự chuyển đổi (ví dụ: "chuyển từ A sang B" khác hoàn toàn với "chuyển từ B sang A"), từ phủ định ("KHÔNG", "NGOẠI TRỪ"), hoặc các mốc ngưỡng số liệu tiệm cận.
2. Phân tích phản biện từng phương án ([0], [1], [2], [3]...):
   - So sánh kỹ lưỡng các phương án gần giống nhau.
   - Phân tích rõ ràng tại sao từng phương án sai hoặc đúng dựa trên căn cứ khoa học/lịch sử thực tế để loại trừ phương án gây nhiễu.
3. Chốt phương án chính xác nhất.

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT (phải xuất thinking_process trước để kích hoạt tư duy rồi mới kết luận best_index):
{
  "thinking_process": "<phân tích tư duy logic chi tiết từng bước, phản biện và loại trừ các phương án gây nhiễu>",
  "best_index": <số nguyên index của phương án đúng nhất từ 0 đến ${options.length - 1}>,
  "answer_text": "<nội dung phương án đã chọn>",
  "confidence": 0.99,
  "reason": "<kết luận ngắn gọn súc tích lý do chọn>"
}`;

  const prompt = `Câu hỏi:\n${questionText}\n\nCác lựa chọn:\n${optionsFormatted}`;
  const modelsToTry = [targetModel, "gpt-4o", "deepseek-v3", "qwen3.7-max", "gpt-4o-mini"];
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError = null;

  for (const mod of uniqueModels) {
    try {
      const url = DEFAULT_API_URL;
      const isReasoningOnly = mod.includes("r1") || mod.includes("o1") || mod.includes("o3");
      const payload = {
        model: mod,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ]
      };

      if (!isReasoningOnly) {
        payload.temperature = 0.1;
        payload.response_format = { type: "json_object" };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) throw new Error("Không nhận được phản hồi từ AI");

      let cleanJson = rawText.trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }
      const parsed = JSON.parse(cleanJson);

      if (typeof parsed.best_index !== "number" || parsed.best_index < 0 || parsed.best_index >= options.length) {
        const matchIdx = options.findIndex(opt => 
          opt.text.toLowerCase().includes(parsed.answer_text?.toLowerCase() || "") ||
          (parsed.answer_text && parsed.answer_text.toLowerCase().includes(opt.text.toLowerCase()))
        );
        parsed.best_index = matchIdx !== -1 ? matchIdx : 0;
      }

      return {
        best_index: parsed.best_index,
        answer_text: options[parsed.best_index]?.text || parsed.answer_text,
        confidence: parsed.confidence || 0.99,
        reason: parsed.reason || parsed.thinking_process?.slice(0, 100) || "Giải bằng ShopAIKey AI",
        thinking: parsed.thinking_process || "",
        modelUsed: mod
      };
    } catch (err) {
      console.warn(`Thử model ${mod} thất bại:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Không thể kết nối với ShopAIKey API.");
}

async function testApiKey(apiKey, model = "gpt-4o-mini") {
  const key = apiKey || (await getSetting("apiKey")) || DEFAULT_API_KEY;
  const targetModel = model || "gpt-4o-mini";
  const url = DEFAULT_API_URL;
  const payload = {
    model: targetModel,
    messages: [
      { role: "user", content: "Trả lời ngắn gọn chữ 'OK' nếu bạn nhận được tin này." }
    ],
    max_tokens: 10
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Lỗi ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content || "OK";
  return { status: "success", reply: answer.trim() };
}

async function saveLearnedQuestions(newQuestions) {
  const data = await chrome.storage.local.get("questionBank");
  const bank = data.questionBank || {};
  let count = 0;

  for (const item of newQuestions) {
    const key = normalizeText(item.question);
    if (key && !bank[key]) {
      bank[key] = {
        question: item.question,
        correctAnswer: item.correctAnswer,
        options: item.options || [],
        learnedAt: new Date().toISOString()
      };
      count++;
    }
  }

  await chrome.storage.local.set({ questionBank: bank });
  return count;
}

async function getSetting(key) {
  const data = await chrome.storage.local.get("settings");
  return data.settings?.[key] ?? DEFAULT_SETTINGS[key];
}

function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/^(câu\s*\d+[\s:.-]*|bài\s*\d+[\s:.-]*|question\s*\d+[\s:.-]*)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
