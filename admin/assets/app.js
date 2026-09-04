// AutoThi Admin Frontend Controller
// -------------------------------------------------------------

let parsedQuestions = [];
let availableContests = [];
let allGithubContestsData = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Check auth
  await checkAuth();

  // Load contests list & live bank from GitHub
  await loadContests();

  // Bind Events
  document.getElementById("btn-login").addEventListener("click", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-parse").addEventListener("click", handleParse);
  document.getElementById("btn-push-github").addEventListener("click", handlePushGitHub);
  document.getElementById("btn-save-token").addEventListener("click", handleSaveToken);
  document.getElementById("btn-refresh-bank").addEventListener("click", loadContests);

  document.getElementById("btn-open-token-modal").addEventListener("click", () => {
    document.getElementById("token-modal").classList.remove("hidden");
  });
  document.getElementById("btn-close-token-modal").addEventListener("click", () => {
    document.getElementById("token-modal").classList.add("hidden");
  });

  // API Health Check modal events
  const btnOpenHealth = document.getElementById("btn-open-api-health");
  const btnCloseHealth = document.getElementById("btn-close-api-health");
  const btnRetestHealth = document.getElementById("btn-retest-apis");
  if (btnOpenHealth) {
    btnOpenHealth.addEventListener("click", () => {
      document.getElementById("api-health-modal").classList.remove("hidden");
      runApiHealthCheck();
    });
  }
  if (btnCloseHealth) {
    btnCloseHealth.addEventListener("click", () => {
      document.getElementById("api-health-modal").classList.add("hidden");
    });
  }
  if (btnRetestHealth) {
    btnRetestHealth.addEventListener("click", runApiHealthCheck);
  }

  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  // Search & Filter live bank
  const txtBankSearch = document.getElementById("txt-bank-search");
  const selBankFilterContest = document.getElementById("sel-bank-filter-contest");
  if (txtBankSearch) txtBankSearch.addEventListener("input", renderGitHubBank);
  if (selBankFilterContest) selBankFilterContest.addEventListener("change", renderGitHubBank);

  // Select contest handler in upload tab
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
  const usr = (document.getElementById("txt-username")?.value || "").trim();
  const pwd = document.getElementById("txt-password").value;
  const token = document.getElementById("txt-login-token").value;
  const msgEl = document.getElementById("login-msg");

  if (!usr || !pwd) {
    msgEl.innerText = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
    return;
  }

  msgEl.innerText = "Đang kiểm tra...";

  try {
    const res = await fetch("api.php?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usr, password: pwd, github_token: token })
    });
    const json = await res.json();
    if (json.success) {
      document.getElementById("login-modal").classList.add("hidden");
      await loadContests();
      checkAuth();
    } else {
      msgEl.innerText = json.error || "Tài khoản hoặc mật khẩu không đúng!";
    }
  } catch (e) {
    msgEl.innerText = "Lỗi kết nối server!";
  }
}

async function handleLogout() {
  await fetch("api.php?action=logout");
  location.reload();
}

// 1.1 API & Model Health Check Runner
async function runApiHealthCheck() {
  const container = document.getElementById("api-health-list");
  const summaryEl = document.getElementById("api-health-summary");
  const retestBtn = document.getElementById("btn-retest-apis");

  if (!container) return;

  container.innerHTML = `
    <div class="empty-state" style="padding: 24px;">
      <div class="empty-icon">⏳</div>
      <p style="font-size: 14px; font-weight: 600;">Đang kiểm tra kết nối tới Model Chính, Model Backup và GitHub...</p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Đo lường độ trễ mạng (latency) và phản hồi...</p>
    </div>
  `;
  summaryEl.innerText = "Đang kiểm tra...";
  if (retestBtn) retestBtn.disabled = true;

  try {
    const res = await fetch("api.php?action=test_apis");
    const json = await res.json();

    if (json.success && json.data) {
      let html = "";
      let okCount = 0;
      let totalCount = Object.keys(json.data).length;

      for (const [key, item] of Object.entries(json.data)) {
        const isOk = item.status === "ok";
        if (isOk) okCount++;

        const statusColor = isOk ? "#34d399" : (item.status === "warning" ? "#f59e0b" : "#f87171");
        const statusBadge = isOk ? "🟢 Sẵn sàng" : (item.status === "warning" ? "🟡 Cảnh báo" : "🔴 Lỗi kết nối");

        html += `
          <div style="background: rgba(11, 19, 41, 0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 700; font-size: 13.5px; color: #ffffff;">${escapeHtml(item.name)}</span>
                ${item.is_primary ? '<span class="pill-mini" style="background: #3b82f6;">Mặc định</span>' : ''}
              </div>
              <div style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">
                ${escapeHtml(item.category || item.type || '')}
              </div>
              <div style="font-size: 12px; color: ${statusColor}; margin-top: 4px; font-weight: 600;">
                ${escapeHtml(item.message)}
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge-tag" style="background: rgba(255, 255, 255, 0.05); color: ${statusColor}; border-color: ${statusColor}44;">
                ${statusBadge}
              </span>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-family: monospace;">
                ${item.latency}ms
              </div>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
      summaryEl.innerText = `Hoàn tất: ${okCount}/${totalCount} hệ thống hoạt động tốt`;
    } else {
      container.innerHTML = `<div class="alert-box error">Lỗi: ${json.error || 'Không kiểm tra được API'}</div>`;
      summaryEl.innerText = "Lỗi";
    }
  } catch (e) {
    container.innerHTML = `<div class="alert-box error">Lỗi mạng: ${e.message}</div>`;
    summaryEl.innerText = "Lỗi kết nối";
  } finally {
    if (retestBtn) retestBtn.disabled = false;
  }
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

// 2. Load contests & live bank from GitHub
async function loadContests() {
  try {
    const btnRef = document.getElementById("btn-refresh-bank");
    if (btnRef) btnRef.innerText = "⏳ Đang tải...";

    const res = await fetch("api.php?action=get_contests");
    const json = await res.json();
    if (json.success) {
      availableContests = json.data.contests || [];
      allGithubContestsData = availableContests;

      // Update upload selector
      const sel = document.getElementById("sel-contest");
      sel.innerHTML = '<option value="__new__">+ Tạo cuộc thi mới...</option>';
      
      const filterSel = document.getElementById("sel-bank-filter-contest");
      filterSel.innerHTML = '<option value="ALL">Tất cả các cuộc thi</option>';

      availableContests.forEach(c => {
        const count = c.question_count || 0;
        
        const opt1 = document.createElement("option");
        opt1.value = c.id;
        opt1.innerText = `${c.name} (${count} câu)`;
        sel.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = c.id;
        opt2.innerText = `${c.name} (${count} câu)`;
        filterSel.appendChild(opt2);
      });

      if (availableContests.length > 0) {
        sel.value = availableContests[0].id;
        sel.dispatchEvent(new Event("change"));
      }

      // Update stats banner
      document.getElementById("stat-contests-count").innerText = `${availableContests.length} cuộc thi`;
      document.getElementById("stat-questions-count").innerText = `${json.data.total_questions_all || 0} câu`;
      document.getElementById("stat-last-sync").innerText = json.data.updated_at || "Vừa xong";
      document.getElementById("badge-bank-total").innerText = `${json.data.total_questions_all || 0}`;

      // Render live GitHub bank list
      renderGitHubBank();
    }
  } catch (e) {
    console.warn("Không tải được danh sách cuộc thi:", e);
  } finally {
    const btnRef = document.getElementById("btn-refresh-bank");
    if (btnRef) btnRef.innerText = "🔄 Tải Lại Từ GitHub";
  }
}

// 3. Render GitHub Bank Questions Categorized by Contest
function renderGitHubBank() {
  const container = document.getElementById("github-contests-container");
  if (!container) return;

  const searchQuery = (document.getElementById("txt-bank-search")?.value || "").toLowerCase().trim();
  const selectedContestId = document.getElementById("sel-bank-filter-contest")?.value || "ALL";

  let filteredContests = allGithubContestsData;
  if (selectedContestId !== "ALL") {
    filteredContests = filteredContests.filter(c => c.id === selectedContestId);
  }

  if (filteredContests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>Không tìm thấy cuộc thi nào phù hợp.</p>
      </div>
    `;
    return;
  }

  let totalQuestionsMatched = 0;
  let html = "";

  filteredContests.forEach(contest => {
    let questions = contest.questions_normalized || [];
    
    // Filter by search query
    if (searchQuery) {
      questions = questions.filter(q => {
        const qText = (q.question || "").toLowerCase();
        const ansText = (q.correctAnswer || "").toLowerCase();
        const optsText = (q.options || []).join(" ").toLowerCase();
        return qText.includes(searchQuery) || ansText.includes(searchQuery) || optsText.includes(searchQuery);
      });
    }

    if (searchQuery && questions.length === 0) {
      return; // Skip contest if no matching questions
    }

    totalQuestionsMatched += questions.length;

    let questionsCardsHtml = "";
    questions.forEach((q, qIdx) => {
      let optsHtml = "";
      (q.options || []).forEach(opt => {
        const isCorrect = isMatchingAnswer(opt, q.correctAnswer);
        optsHtml += `
          <div class="preview-option-item ${isCorrect ? 'correct' : ''}">
            ${isCorrect ? '✓ ' : ''}${escapeHtml(opt)}
          </div>
        `;
      });

      questionsCardsHtml += `
        <div class="question-card" style="background: rgba(11, 19, 41, 0.65);">
          <div class="question-header">
            <span class="question-num" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">Câu ${qIdx + 1}</span>
            <div class="question-text">${escapeHtml(q.question)}</div>
            <button class="btn-icon" style="color: #f87171;" onclick="deleteQuestionFromGithub('${contest.id}', '${escapeAttr(q.question)}')" title="Xóa câu này khỏi GitHub">
              🗑️ Xóa
            </button>
          </div>
          <div class="preview-options">
            ${optsHtml}
          </div>
          <div style="font-size: 12.5px; color: #34d399; font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>🎯 Đáp án chuẩn đã lưu:</span>
            <span>${escapeHtml(q.correctAnswer || 'Chưa rõ')}</span>
          </div>
        </div>
      `;
    });

    html += `
      <div class="contest-block">
        <div class="contest-header" onclick="toggleContestBody('${contest.id}')">
          <div class="contest-title-wrap">
            <span style="font-size: 20px;">🏆</span>
            <span class="contest-name">${escapeHtml(contest.name)}</span>
            <span class="contest-id-tag">ID: ${escapeHtml(contest.id)}</span>
            ${contest.domain_match ? `<span class="badge-tag" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">🌐 ${escapeHtml(contest.domain_match)}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge-tag" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">
              ${questions.length} câu hỏi
            </span>
            <span id="arrow-${contest.id}" style="color: #94a3b8; font-size: 14px;">▼</span>
          </div>
        </div>

        <div class="contest-body" id="body-${contest.id}">
          <div style="font-size: 13px; color: #94a3b8; margin-bottom: 6px;">
            ${escapeHtml(contest.description || 'Chưa có mô tả chi tiết.')}
          </div>
          ${questionsCardsHtml || '<div style="color: #94a3b8; font-size: 13px;">Chưa có câu hỏi nào trong cuộc thi này.</div>'}
        </div>
      </div>
    `;
  });

  if (totalQuestionsMatched === 0 && searchQuery) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Không tìm thấy câu hỏi nào chứa từ khóa: "<b>${escapeHtml(searchQuery)}</b>"</p>
      </div>
    `;
    return;
  }

  container.innerHTML = html;
}

function toggleContestBody(contestId) {
  const body = document.getElementById("body-" + contestId);
  const arrow = document.getElementById("arrow-" + contestId);
  if (body) {
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "flex" : "none";
    if (arrow) arrow.innerText = isHidden ? "▼" : "▶";
  }
}

async function deleteQuestionFromGithub(contestId, questionText) {
  if (!confirm(`Bạn có chắc muốn XÓA câu hỏi này vĩnh viễn khỏi GitHub?\n\nCâu hỏi: "${questionText.slice(0, 70)}..."\n\nToàn bộ Extension trên mọi máy sẽ không còn nhận câu này nữa.`)) {
    return;
  }

  try {
    const res = await fetch("api.php?action=delete_github_question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contest_id: contestId,
        question: questionText
      })
    });
    const json = await res.json();
    if (json.success) {
      alert("✓ " + json.data.message);
      await loadContests();
    } else {
      if (json.error && json.error.includes("Chưa có GitHub Token")) {
        document.getElementById("token-modal").classList.remove("hidden");
      }
      alert("❌ Lỗi: " + json.error);
    }
  } catch (e) {
    alert("❌ Lỗi mạng: " + e.message);
  }
}

// 4. AI Parse Questions
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
      renderParsedPreviewList();
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

// 5. Render Parsed Preview List
function renderParsedPreviewList() {
  const container = document.getElementById("questions-list");
  const countEl = document.getElementById("parsed-count");
  countEl.innerText = `${parsedQuestions.length} câu`;

  if (parsedQuestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Chưa có câu hỏi nào được nạp.</p>
        <p style="font-size: 12px; margin-top: 4px;">Dán đề thi vào ô bên trái và bấm "Bắt Đầu Phân Tích Bằng AI" để bắt đầu.</p>
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
            <button class="btn-icon" onclick="deleteParsedQuestion(${idx})" title="Xóa câu này">🗑️</button>
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

function deleteParsedQuestion(index) {
  if (confirm(`Bạn có chắc muốn xóa Câu ${index + 1}?`)) {
    parsedQuestions.splice(index, 1);
    renderParsedPreviewList();
    document.getElementById("btn-push-github").disabled = parsedQuestions.length === 0;
  }
}

// 6. Push to GitHub
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
      // Switch to Bank Tab
      document.getElementById("nav-tab-bank").click();
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

// 7. Save Token
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

function escapeAttr(text) {
  if (!text) return "";
  return text
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;");
}
