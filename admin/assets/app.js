// AutoThi Admin Frontend Controller
// -------------------------------------------------------------

let parsedQuestions = [];
let availableContests = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Check auth
  await checkAuth();

  // Load contests list
  await loadContests();

  // Bind Events
  document.getElementById("btn-login").addEventListener("click", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-parse").addEventListener("click", handleParse);
  document.getElementById("btn-push-github").addEventListener("click", handlePushGitHub);
  document.getElementById("btn-save-token").addEventListener("click", handleSaveToken);
  document.getElementById("btn-open-token-modal").addEventListener("click", () => {
    document.getElementById("token-modal").classList.remove("hidden");
  });
  document.getElementById("btn-close-token-modal").addEventListener("click", () => {
    document.getElementById("token-modal").classList.add("hidden");
  });

  // Select contest handler
  const selContest = document.getElementById("sel-contest");
  selContest.addEventListener("change", () => {
    const val = selContest.value;
    if (val === "__new__") {
      document.getElementById("new-contest-fields").style.display = "block";
      document.getElementById("txt-contest-id").value = "";
      document.getElementById("txt-contest-name").value = "";
      document.getElementById("txt-contest-desc").value = "";
    } else {
      document.getElementById("new-contest-fields").style.display = "none";
      const found = availableContests.find(c => c.id === val);
      if (found) {
        document.getElementById("txt-contest-id").value = found.id;
        document.getElementById("txt-contest-name").value = found.name;
        document.getElementById("txt-contest-desc").value = found.description || "";
      }
    }
  });
});

// 1. Auth check
async function checkAuth() {
  try {
    const res = await fetch("api.php?action=check_auth");
    const json = await res.json();
    if (json.success && json.data.isLoggedIn) {
      document.getElementById("login-modal").classList.add("hidden");
      updateTokenStatus(json.data.hasGithubToken);
    } else {
      document.getElementById("login-modal").classList.remove("hidden");
    }
  } catch (e) {
    console.error("Lỗi kiểm tra đăng nhập:", e);
  }
}

async function handleLogin() {
  const pwd = document.getElementById("txt-password").value;
  const token = document.getElementById("txt-login-token").value;
  const msgEl = document.getElementById("login-msg");
  msgEl.innerText = "Đang kiểm tra...";

  try {
    const res = await fetch("api.php?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd, github_token: token })
    });
    const json = await res.json();
    if (json.success) {
      document.getElementById("login-modal").classList.add("hidden");
      await loadContests();
      checkAuth();
    } else {
      msgEl.innerText = json.error || "Mật khẩu không đúng!";
    }
  } catch (e) {
    msgEl.innerText = "Lỗi kết nối server!";
  }
}

async function handleLogout() {
  await fetch("api.php?action=logout");
  location.reload();
}

function updateTokenStatus(hasToken) {
  const tag = document.getElementById("token-status-tag");
  if (hasToken) {
    tag.innerHTML = "🟢 GitHub: Đã kết nối";
    tag.style.color = "#34d399";
  } else {
    tag.innerHTML = "🟠 GitHub: Chưa nhập Token";
    tag.style.color = "#f59e0b";
  }
}

// 2. Load contests
async function loadContests() {
  try {
    const res = await fetch("api.php?action=get_contests");
    const json = await res.json();
    if (json.success) {
      availableContests = json.data.contests || [];
      const sel = document.getElementById("sel-contest");
      sel.innerHTML = '<option value="__new__">+ Tạo cuộc thi mới...</option>';
      
      availableContests.forEach(c => {
        const count = c.questions ? c.questions.length : (c.question_count || 0);
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.innerText = `${c.name} (${count} câu)`;
        sel.appendChild(opt);
      });

      if (availableContests.length > 0) {
        sel.value = availableContests[0].id;
        sel.dispatchEvent(new Event("change"));
      }
    }
  } catch (e) {
    console.warn("Không tải được danh sách cuộc thi:", e);
  }
}

// 3. AI Parse Questions
async function handleParse() {
  const rawText = document.getElementById("txt-raw-input").value.trim();
  const model = document.getElementById("sel-ai-model").value;
  const statusEl = document.getElementById("parse-status");

  if (!rawText) {
    alert("Vui lòng dán văn bản câu hỏi vào ô!");
    return;
  }

  statusEl.innerHTML = `<span style="color: #60a5fa;">⏳ Đang gọi AI (${model}) phân tích và bóc tách đề thi... Vui lòng đợi vài giây...</span>`;
  document.getElementById("btn-parse").disabled = true;

  try {
    const res = await fetch("api.php?action=parse_questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText, model: model })
    });
    const json = await res.json();

    if (json.success && json.data.questions) {
      parsedQuestions = json.data.questions;
      renderQuestionsList();
      statusEl.innerHTML = `<span style="color: #34d399;">✓ AI đã bóc tách thành công <b>${parsedQuestions.length}</b> câu hỏi chuẩn xác!</span>`;
      document.getElementById("btn-push-github").disabled = parsedQuestions.length === 0;
    } else {
      statusEl.innerHTML = `<span style="color: #f87171;">❌ Lỗi: ${json.error || "Không thể bóc tách đề thi!"}</span>`;
    }
  } catch (e) {
    statusEl.innerHTML = `<span style="color: #f87171;">❌ Lỗi kết nối mạng: ${e.message}</span>`;
  } finally {
    document.getElementById("btn-parse").disabled = false;
  }
}

// 4. Render Questions List
function renderQuestionsList() {
  const container = document.getElementById("questions-list");
  const countEl = document.getElementById("parsed-count");
  countEl.innerText = `${parsedQuestions.length} câu`;

  if (parsedQuestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Chưa có câu hỏi nào được nạp.</p>
        <p style="font-size: 12px; margin-top: 4px;">Dán đề thi vào ô bên trái và bấm "Phân tích bằng AI" để bắt đầu.</p>
      </div>
    `;
    return;
  }

  let html = "";
  parsedQuestions.forEach((q, idx) => {
    let optsHtml = "";
    (q.options || []).forEach(opt => {
      const isCorrect = isMatchingAnswer(opt, q.correctAnswer);
      optsHtml += `<div class="preview-option-item ${isCorrect ? 'correct' : ''}">
        ${isCorrect ? '✓ ' : ''}${escapeHtml(opt)}
      </div>`;
    });

    html += `
      <div class="question-card" id="q-card-${idx}">
        <div class="question-header">
          <span class="question-num">Câu ${idx + 1}</span>
          <div class="question-text">${escapeHtml(q.question)}</div>
          <div class="card-actions">
            <button class="btn-icon" onclick="deleteQuestion(${idx})" title="Xóa câu này">🗑️</button>
          </div>
        </div>
        <div class="preview-options">
          ${optsHtml}
        </div>
        <div style="font-size: 12px; color: #34d399; font-weight: 600;">
          Đáp án đúng: ${escapeHtml(q.correctAnswer || 'Chưa xác định')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function isMatchingAnswer(optionText, correctAnswer) {
  if (!correctAnswer || !optionText) return false;
  const o = optionText.trim().toLowerCase();
  const c = correctAnswer.trim().toLowerCase();
  return o === c || c.includes(o) || o.includes(c);
}

function deleteQuestion(index) {
  if (confirm(`Bạn có chắc muốn xóa Câu ${index + 1}?`)) {
    parsedQuestions.splice(index, 1);
    renderQuestionsList();
    document.getElementById("btn-push-github").disabled = parsedQuestions.length === 0;
  }
}

// 5. Push to GitHub
async function handlePushGitHub() {
  if (parsedQuestions.length === 0) {
    alert("Không có câu hỏi nào để đẩy lên!");
    return;
  }

  const contestId = document.getElementById("txt-contest-id").value.trim();
  const contestName = document.getElementById("txt-contest-name").value.trim();
  const contestDesc = document.getElementById("txt-contest-desc").value.trim();

  if (!contestId || !contestName) {
    alert("Vui lòng nhập Mã cuộc thi (ID) và Tên cuộc thi!");
    return;
  }

  if (!confirm(`Xác nhận đẩy ${parsedQuestions.length} câu hỏi vào cuộc thi "${contestName}" lên GitHub?`)) {
    return;
  }

  const btn = document.getElementById("btn-push-github");
  btn.disabled = true;
  btn.innerText = "⏳ Đang commit lên GitHub...";

  try {
    const res = await fetch("api.php?action=push_to_github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contest_id: contestId,
        contest_name: contestName,
        contest_desc: contestDesc,
        questions: parsedQuestions
      })
    });
    const json = await res.json();

    if (json.success) {
      alert(`🎉 THÀNH CÔNG!\n\n${json.data.message}\nTổng số câu trong cuộc thi: ${json.data.totalInContest}\n\nToàn bộ máy cài Extension sẽ nhận được đề mới!`);
      // Reload contests
      await loadContests();
    } else {
      if (json.error && json.error.includes("Chưa có GitHub Token")) {
        document.getElementById("token-modal").classList.remove("hidden");
      }
      alert(`❌ Lỗi đẩy GitHub: ${json.error}`);
    }
  } catch (e) {
    alert(`❌ Lỗi mạng: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = "🚀 Đẩy Lên GitHub (Commit)";
  }
}

// 6. Save Token
async function handleSaveToken() {
  const token = document.getElementById("txt-token-input").value.trim();
  if (!token) {
    alert("Vui lòng nhập GitHub Token!");
    return;
  }

  const res = await fetch("api.php?action=save_github_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token })
  });
  const json = await res.json();

  if (json.success) {
    alert("✓ Đã lưu GitHub Token vào phiên làm việc!");
    document.getElementById("token-modal").classList.add("hidden");
    checkAuth();
  } else {
    alert(`Lỗi: ${json.error}`);
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
