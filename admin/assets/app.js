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

  const btnClearToken = document.getElementById("btn-clear-token");
  if (btnClearToken) btnClearToken.addEventListener("click", handleClearToken);

  const btnToggleToken = document.getElementById("btn-toggle-change-token");
  if (btnToggleToken) {
    btnToggleToken.addEventListener("click", () => {
      const g = document.getElementById("login-token-group");
      if (g) g.style.display = g.style.display === "none" ? "block" : "none";
    });
  }

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

  // Tự động sinh Slug khi người dùng gõ Tên cuộc thi
  const txtContestName = document.getElementById("txt-contest-name");
  const txtContestId = document.getElementById("txt-contest-id");
  if (txtContestName && txtContestId) {
    txtContestName.addEventListener("input", () => {
      if (document.getElementById("sel-contest").value === "__new__") {
        txtContestId.value = slugifyVietnamese(txtContestName.value);
      }
    });
  }

  // Tự động phân tích tiêu đề khi người dùng DÁN hoặc NHẬP đề thô
  const txtRaw = document.getElementById("txt-raw-input");
  if (txtRaw) {
    const autoDetectContest = () => {
      const sel = document.getElementById("sel-contest");
      if (sel && sel.value === "__new__") {
        const meta = extractContestMetaFromRawText(txtRaw.value);
        if (meta) {
          if (!txtContestName.value || txtContestName.dataset.autoFilled === "true") {
            txtContestName.value = meta.name;
            txtContestName.dataset.autoFilled = "true";
          }
          if (!txtContestId.value || txtContestId.dataset.autoFilled === "true") {
            txtContestId.value = meta.id;
            txtContestId.dataset.autoFilled = "true";
          }
          const txtDesc = document.getElementById("txt-contest-desc");
          if (txtDesc && (!txtDesc.value || txtDesc.dataset.autoFilled === "true")) {
            txtDesc.value = meta.desc;
            txtDesc.dataset.autoFilled = "true";
          }
        }
      }
    };

    txtRaw.addEventListener("input", autoDetectContest);
    txtRaw.addEventListener("paste", () => setTimeout(autoDetectContest, 60));
  }

  // Select contest handler in upload tab
  const selContest = document.getElementById("sel-contest");
  selContest.addEventListener("change", () => {
    const val = selContest.value;
    if (val === "__new__") {
      document.getElementById("new-contest-fields").style.display = "block";
      const meta = extractContestMetaFromRawText(document.getElementById("txt-raw-input")?.value || "");
      if (meta) {
        document.getElementById("txt-contest-id").value = meta.id;
        document.getElementById("txt-contest-name").value = meta.name;
        document.getElementById("txt-contest-desc").value = meta.desc;
      } else {
        document.getElementById("txt-contest-id").value = "";
        document.getElementById("txt-contest-name").value = "";
        document.getElementById("txt-contest-desc").value = "";
      }
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

// Helper: Chuyển tiếng Việt có dấu thành slug không dấu
function slugifyVietnamese(text) {
  if (!text) return "";
  let str = text.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[^a-z0-9\s-]/g, "");
  str = str.trim().replace(/[\s_]+/g, "-");
  str = str.replace(/-+/g, "-");
  return str;
}

// Helper: Tự động trích xuất Tên, Mã ID và Mô tả từ đoạn văn bản thô
function extractContestMetaFromRawText(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Lấy các dòng tiêu đề trước khi xuất hiện câu hỏi trắc nghiệm đầu tiên
  let headerLines = [];
  for (let line of lines.slice(0, 10)) {
    if (/^(câu\s*\d+|bài\s*\d+|\d+[\.\:\)\/])/i.test(line)) {
      break;
    }
    headerLines.push(line);
  }

  let title = "";
  if (headerLines.length > 0) {
    let foundLine = headerLines.find(l => /(cuộc\s*thi|hội\s*thi|đề\s*thi|tìm\s*hiểu|nghị\s*quyết|bộ\s*câu\s*hỏi|kiểm\s*tra|ôn\s*tập|hội\s*nghị)/i.test(l));
    title = foundLine || headerLines[0];
  }

  if (!title) return null;

  title = title.replace(/^(đề\s*thi|tên\s*cuộc\s*thi|chủ\s*đề|nội\s*dung|bộ\s*câu\s*hỏi\s*về)[\s\:\-]+/i, "").trim();
  if (title.length > 120) title = title.substring(0, 120).trim();

  let slug = slugifyVietnamese(title);
  if (!slug) slug = "cuoc-thi-" + new Date().getFullYear();
  const curYear = new Date().getFullYear().toString();
  if (!slug.includes(curYear) && !slug.includes("202")) {
    slug += "-" + curYear;
  }

  return {
    name: title,
    id: slug,
    desc: `Trọn bộ câu hỏi và đáp án trắc nghiệm ${title}`
  };
}

// Cập nhật trạng thái Token hiển thị trên giao diện
function updateTokenStatus(hasToken, tokenMasked = "") {
  const tag = document.getElementById("token-status-tag");
  if (tag) {
    if (hasToken) {
      tag.className = "badge-tag";
      tag.style.background = "rgba(16, 185, 129, 0.15)";
      tag.style.color = "#34d399";
      tag.style.borderColor = "rgba(16, 185, 129, 0.3)";
      tag.innerHTML = `🟢 GitHub: Đã kết nối ${tokenMasked ? `(${tokenMasked})` : ""}`;
    } else {
      tag.className = "badge-tag";
      tag.style.background = "rgba(245, 158, 11, 0.15)";
      tag.style.color = "#fbbf24";
      tag.style.borderColor = "rgba(245, 158, 11, 0.3)";
      tag.innerHTML = "⚠️ GitHub: Chưa có Token";
    }
  }

  // Token modal status box
  const statusInfo = document.getElementById("token-current-status");
  if (statusInfo) {
    if (hasToken) {
      statusInfo.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px;">
          <div style="color: #34d399; font-weight: 600; margin-bottom: 3px;">🟢 Đã kích hoạt &amp; lưu vĩnh viễn trên máy chủ</div>
          <div style="color: #cbd5e1;">Mã Token: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #60a5fa;">${tokenMasked || "ghp_••••••••••••"}</code></div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">Mọi lần đăng nhập sau không cần nhập lại. Bạn có thể nhập mã mới để thay thế hoặc bấm nút Xóa.</div>
        </div>
      `;
    } else {
      statusInfo.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px;">
          <div style="color: #fbbf24; font-weight: 600; margin-bottom: 3px;">⚠️ Chưa cấu hình GitHub Token</div>
          <div style="color: #cbd5e1; font-size: 11.5px;">Nhập Token bên dưới một lần duy nhất để tự động đẩy câu hỏi vào repo <b>daitaiit/autothi</b>.</div>
        </div>
      `;
    }
  }

  // Login modal token box
  const savedBox = document.getElementById("login-token-saved-box");
  const tokenGroup = document.getElementById("login-token-group");
  const savedLabel = document.getElementById("login-token-saved-label");
  if (savedBox && tokenGroup) {
    if (hasToken) {
      savedBox.style.display = "block";
      tokenGroup.style.display = "none";
      if (savedLabel) {
        savedLabel.innerHTML = `🟢 <b>GitHub Token:</b> Đã lưu sẵn (${tokenMasked || "Đang hoạt động"})`;
      }
    } else {
      const localPat = localStorage.getItem("autothi_github_pat");
      if (localPat) {
        savedBox.style.display = "block";
        tokenGroup.style.display = "none";
        if (savedLabel) {
          savedLabel.innerHTML = `🟢 <b>GitHub Token:</b> Đã lưu từ trước (${localPat.substring(0, 8)}...${localPat.substring(localPat.length - 4)})`;
        }
        const txtLoginToken = document.getElementById("txt-login-token");
        if (txtLoginToken) txtLoginToken.value = localPat;
      } else {
        savedBox.style.display = "none";
        tokenGroup.style.display = "block";
      }
    }
  }
}

// 1. Auth check
async function checkAuth() {
  try {
    const res = await fetch("api.php?action=check_auth");
    const json = await res.json();
    if (json.success) {
      updateTokenStatus(json.data.hasGithubToken, json.data.tokenMasked);
      if (json.data.isLoggedIn) {
        document.getElementById("login-modal").classList.add("hidden");
      } else {
        document.getElementById("login-modal").classList.remove("hidden");
      }
    }
  } catch (e) {
    console.error("Lỗi kiểm tra đăng nhập:", e);
  }
}

async function handleLogin() {
  const usr = (document.getElementById("txt-username")?.value || "").trim();
  const pwd = document.getElementById("txt-password").value;
  let token = (document.getElementById("txt-login-token")?.value || "").trim();
  const msgEl = document.getElementById("login-msg");

  if (!usr || !pwd) {
    msgEl.innerText = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
    return;
  }

  // Tự động dùng token đã lưu ở localStorage nếu ô input trống
  if (!token) {
    token = localStorage.getItem("autothi_github_pat") || "";
  }

  msgEl.innerText = "Đang kiểm tra...";

  try {
    const res = await fetch("api.php?action=login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "X-Github-Token": token } : {})
      },
      body: JSON.stringify({ username: usr, password: pwd, github_token: token })
    });
    const json = await res.json();
    if (json.success) {
      if (token) {
        localStorage.setItem("autothi_github_pat", token);
      }
      document.getElementById("login-modal").classList.add("hidden");
      await checkAuth();
      await loadContests();
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

      // Tự động nhận diện & cập nhật Tên/Mã cuộc thi từ AI nếu đang tạo cuộc thi mới
      const selContest = document.getElementById("sel-contest");
      if (selContest && selContest.value === "__new__") {
        if (json.data.contest_name) {
          const txtName = document.getElementById("txt-contest-name");
          if (txtName) txtName.value = json.data.contest_name;
        }
        if (json.data.contest_id) {
          const txtId = document.getElementById("txt-contest-id");
          if (txtId) txtId.value = json.data.contest_id;
        }
        if (json.data.contest_desc) {
          const txtDesc = document.getElementById("txt-contest-desc");
          if (txtDesc) txtDesc.value = json.data.contest_desc;
        }
      }
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

// 7. Save & Clear Token
async function handleSaveToken() {
  const token = document.getElementById("txt-token-input").value.trim();
  if (!token) {
    alert("Vui lòng nhập GitHub Token!");
    return;
  }

  try {
    const res = await fetch("api.php?action=save_github_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token })
    });
    const json = await res.json();

    if (json.success) {
      localStorage.setItem("autothi_github_pat", token);
      alert("✓ Đã lưu vĩnh viễn GitHub Token vào hệ thống! Từ nay mọi lần đăng nhập không cần nhập lại nữa.");
      document.getElementById("txt-token-input").value = "";
      document.getElementById("token-modal").classList.add("hidden");
      await checkAuth();
    } else {
      alert(`Lỗi: ${json.error}`);
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ khi lưu token!");
  }
}

async function handleClearToken() {
  if (!confirm("Bạn có chắc chắn muốn xóa GitHub Token đã lưu trên hệ thống?")) return;
  try {
    const res = await fetch("api.php?action=save_github_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true })
    });
    const json = await res.json();
    if (json.success) {
      localStorage.removeItem("autothi_github_pat");
      alert("✓ Đã xóa GitHub Token khỏi hệ thống!");
      document.getElementById("token-modal").classList.add("hidden");
      await checkAuth();
    } else {
      alert("Lỗi: " + json.error);
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ!");
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
