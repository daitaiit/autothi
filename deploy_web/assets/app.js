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
      }
    }
  });

  // Extension Settings tab events
  const btnReloadExt = document.getElementById("btn-reload-ext-settings");
  const btnSaveExtTop = document.getElementById("btn-save-ext-settings");
  const btnSaveExtBottom = document.getElementById("btn-save-ext-settings-bottom");
  if (btnReloadExt) btnReloadExt.addEventListener("click", loadExtensionSettings);
  if (btnSaveExtTop) btnSaveExtTop.addEventListener("click", handleSaveExtensionSettings);
  if (btnSaveExtBottom) btnSaveExtBottom.addEventListener("click", handleSaveExtensionSettings);

  // Speed selection in extension settings
  const speedOptBtns = document.querySelectorAll(".btn-speed-opt");
  speedOptBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      speedOptBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const speed = btn.getAttribute("data-speed");
      const delay = btn.getAttribute("data-delay");
      const speedInput = document.getElementById("val-global-speed");
      const delayInput = document.getElementById("val-global-delay");
      if (speedInput) speedInput.value = speed;
      if (delayInput) delayInput.value = delay;
    });
  });

  // Predict type radio switcher (range vs fixed)
  const radPredictRange = document.getElementById("rad-predict-range");
  const radPredictFixed = document.getElementById("rad-predict-fixed");
  const boxPredictRange = document.getElementById("box-predict-range");
  const boxPredictFixed = document.getElementById("box-predict-fixed");
  function updatePredictTypeUI() {
    if (radPredictFixed && radPredictFixed.checked) {
      if (boxPredictRange) boxPredictRange.style.display = "none";
      if (boxPredictFixed) boxPredictFixed.style.display = "block";
    } else {
      if (boxPredictRange) boxPredictRange.style.display = "flex";
      if (boxPredictFixed) boxPredictFixed.style.display = "none";
    }
  }
  if (radPredictRange) radPredictRange.addEventListener("change", updatePredictTypeUI);
  if (radPredictFixed) radPredictFixed.addEventListener("change", updatePredictTypeUI);

  // Live preview & preset handler for active contest
  const selExtPreset = document.getElementById("sel-ext-active-preset");
  const txtExtActiveName = document.getElementById("txt-ext-active-name");
  const txtExtActiveId = document.getElementById("txt-ext-active-id");
  const txtExtActiveDate = document.getElementById("txt-ext-active-date");
  const prevExtName = document.getElementById("preview-ext-contest-name");
  const prevExtDate = document.getElementById("preview-ext-contest-date");

  function updateActiveContestPreview() {
    if (prevExtName && txtExtActiveName) {
      prevExtName.innerText = txtExtActiveName.value.trim() || "Chưa đặt tên cuộc thi";
      prevExtName.title = txtExtActiveName.value.trim() || "";
    }
    if (prevExtDate && txtExtActiveDate) {
      prevExtDate.innerText = txtExtActiveDate.value.trim() || "03/09/2026";
    }
  }

  if (txtExtActiveName) txtExtActiveName.addEventListener("input", () => {
    if (txtExtActiveId && !txtExtActiveId.dataset.manual) {
      txtExtActiveId.value = slugifyVietnamese(txtExtActiveName.value);
    }
    updateActiveContestPreview();
  });
  if (txtExtActiveDate) txtExtActiveDate.addEventListener("input", updateActiveContestPreview);
  if (txtExtActiveId) txtExtActiveId.addEventListener("input", () => {
    txtExtActiveId.dataset.manual = "true";
  });

  if (selExtPreset) {
    selExtPreset.addEventListener("change", () => {
      const selectedId = selExtPreset.value;
      if (!selectedId) return;
      const found = availableContests.find(c => c.id === selectedId);
      if (found) {
        if (txtExtActiveName) txtExtActiveName.value = found.name;
        if (txtExtActiveId) {
          txtExtActiveId.value = found.id;
          txtExtActiveId.dataset.manual = "true";
        }
        if (txtExtActiveDate && found.last_updated) {
          const parts = found.last_updated.split("-");
          if (parts.length === 3) {
            txtExtActiveDate.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            txtExtActiveDate.value = found.last_updated;
          }
        }
        updateActiveContestPreview();
      }
    });
  }

  // Live preview for Announcement Banner
  const txtExtAnnounce = document.getElementById("txt-ext-announcement");
  const prevAnnBox = document.getElementById("preview-ext-announcement-box");
  const prevAnnText = document.getElementById("preview-ext-announcement-text");

  function updateAnnouncementPreview() {
    if (!prevAnnBox || !prevAnnText || !txtExtAnnounce) return;
    const val = txtExtAnnounce.value.trim();
    if (val) {
      prevAnnText.innerText = val;
      prevAnnText.title = val;
      prevAnnBox.style.display = "flex";
    } else {
      prevAnnBox.style.display = "none";
    }
  }

  if (txtExtAnnounce) {
    txtExtAnnounce.addEventListener("input", updateAnnouncementPreview);
  }

  // Load extension settings initially
  await loadExtensionSettings();
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

// Helper: Tự động trích xuất Tên, Mã ID và Mô tả từ đoạn văn bản thô (kể cả văn bản bắt đầu bằng câu hỏi)
function extractContestMetaFromRawText(text) {
  if (!text) return null;
  const clean = text.trim();
  if (!clean) return null;

  let title = "";

  // 1. Quét tìm dòng tiêu đề ở 10 dòng đầu tiên
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let l of lines.slice(0, 10)) {
    if (/(cuộc\s*thi|hội\s*thi|đề\s*thi|tìm\s*hiểu|hội\s*nghị|bộ\s*câu\s*hỏi|kiểm\s*tra|ôn\s*tập)/i.test(l)) {
      title = l;
      break;
    }
  }

  // 2. Nếu không có dòng tiêu đề ở đầu, quét toàn văn bản để tìm Văn kiện, Nghị quyết, Chỉ thị, Quyết định, Luật
  if (!title) {
    const docMatch = clean.match(/(Nghị\s*quyết|Chỉ\s*thị|Quyết\s*định|Luật|Thông\s*tư)\s*(số\s*[\w\-\/]+|[A-Za-z0-9\-\/]+)/i);
    if (docMatch) {
      const yearMatch = clean.match(/(202[4-9]|203[0-9])/);
      const yr = yearMatch ? yearMatch[0] : new Date().getFullYear();
      title = `Tìm hiểu ${docMatch[0].trim()} (${yr})`;
    }
  }

  // 3. Nếu vẫn chưa có, quét các chủ đề nổi bật
  if (!title) {
    if (/hồ\s*chí\s*minh/i.test(clean)) title = `Tìm hiểu Tư tưởng Hồ Chí Minh ${new Date().getFullYear()}`;
    else if (/chuyển\s*đổi\s*số/i.test(clean)) title = `Tìm hiểu Chuyển đổi số Quốc gia ${new Date().getFullYear()}`;
    else if (/an\s*toàn\s*giao\s*thông/i.test(clean)) title = `Tìm hiểu An toàn Giao thông ${new Date().getFullYear()}`;
    else if (/pháp\s*luật/i.test(clean)) title = `Tìm hiểu Pháp luật ${new Date().getFullYear()}`;
    else {
      // Lấy từ câu hỏi đầu tiên
      const firstQMatch = clean.match(/(?:câu\s*\d+[\.\:\)]*\s*)([^\?\n\r]+)/i);
      if (firstQMatch && firstQMatch[1]) {
        let qShort = firstQMatch[1].trim().slice(0, 45);
        title = `Cuộc thi - ${qShort}`;
      } else {
        title = `Cuộc thi Trắc nghiệm ${new Date().getFullYear()}`;
      }
    }
  }

  title = title.replace(/^(đề\s*thi|tên\s*cuộc\s*thi|chủ\s*đề|nội\s*dung|bộ\s*câu\s*hỏi\s*về)[\s\:\-]+/i, "").trim();
  if (title.length > 100) title = title.substring(0, 100).trim();

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

      // Update Extension Settings Preset Dropdown
      const selExtPreset = document.getElementById("sel-ext-active-preset");
      if (selExtPreset) {
        const curVal = selExtPreset.value;
        selExtPreset.innerHTML = '<option value="">-- Chọn cuộc thi từ ngân hàng đề --</option>';
        availableContests.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.innerText = `${c.name} (${c.question_count || 0} câu)`;
          if (c.id === curVal) opt.selected = true;
          selExtPreset.appendChild(opt);
        });
      }

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
  const loadingBox = document.getElementById("ai-loading-container");
  const bar = document.getElementById("ai-loading-bar");
  const percentEl = document.getElementById("ai-loading-percent");
  const statusText = document.getElementById("ai-loading-status-text");
  const parseBtn = document.getElementById("btn-parse");

  if (!rawText) {
    alert("Vui lòng dán văn bản câu hỏi vào ô!");
    return;
  }

  // Khởi động giao diện thanh loading tiến trình
  if (loadingBox) loadingBox.style.display = "block";
  if (bar) {
    bar.style.width = "15%";
    bar.style.background = "linear-gradient(90deg, #3b82f6, #06b6d4, #10b981)";
  }
  if (percentEl) percentEl.innerText = "15%";
  if (statusText) statusText.innerText = `Đang kết nối mô hình AI (${model})...`;
  if (statusEl) statusEl.innerHTML = "";
  parseBtn.disabled = true;
  parseBtn.innerHTML = `⏳ Đang Phân Tích Bằng AI...`;

  // Chạy hoạt ảnh tăng phần trăm mượt mà
  let currentPct = 15;
  const progressTimer = setInterval(() => {
    if (currentPct < 45) {
      currentPct += 6;
      if (statusText) statusText.innerText = "🧠 AI đang đọc hiểu & bóc tách từng câu hỏi...";
    } else if (currentPct < 78) {
      currentPct += 4;
      if (statusText) statusText.innerText = "🔍 Đang nhận diện tiêu đề, mã cuộc thi và đáp án chuẩn...";
    } else if (currentPct < 93) {
      currentPct += 1;
      if (statusText) statusText.innerText = "⚙️ Đang hoàn tất chuẩn hóa danh sách câu hỏi...";
    }
    if (bar) bar.style.width = `${currentPct}%`;
    if (percentEl) percentEl.innerText = `${currentPct}%`;
  }, 380);

  try {
    const res = await fetch("api.php?action=parse_questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText, model: model })
    });
    const json = await res.json();
    clearInterval(progressTimer);

    if (json.success && json.data.questions) {
      if (bar) bar.style.width = "100%";
      if (percentEl) percentEl.innerText = "100%";
      if (statusText) statusText.innerText = "✓ Hoàn tất bóc tách đề thi!";

      parsedQuestions = json.data.questions;

      // 1. Tự động nhận diện & điền Tên/Mã cuộc thi từ AI hoặc văn bản thô TRƯỚC TIÊN
      const selContest = document.getElementById("sel-contest");
      if (selContest && selContest.value === "__new__") {
        let cName = json.data.contest_name;
        let cId = json.data.contest_id;
        let cDesc = json.data.contest_desc;

        if (!cName || !cName.trim()) {
          const autoMeta = extractContestMetaFromRawText(rawText);
          if (autoMeta) {
            cName = autoMeta.name;
            cId = autoMeta.id;
            cDesc = autoMeta.desc;
          }
        }

        const txtName = document.getElementById("txt-contest-name");
        const txtId = document.getElementById("txt-contest-id");
        const txtDesc = document.getElementById("txt-contest-desc");

        if (txtName && cName) txtName.value = cName;
        if (txtId) txtId.value = cId || (cName ? slugifyVietnamese(cName) : "");
        if (txtDesc && cDesc) txtDesc.value = cDesc;
      }

      // 2. Render danh sách câu hỏi xem trước (kèm phát hiện trùng lặp với GitHub)
      renderParsedPreviewList();
      statusEl.innerHTML = `<span style="color: #34d399;">✓ AI đã bóc tách thành công <b>${parsedQuestions.length}</b> câu hỏi chuẩn xác!</span>`;
      document.getElementById("btn-push-github").disabled = parsedQuestions.length === 0;

      // Ẩn thanh loading sau 800ms
      setTimeout(() => {
        if (loadingBox) loadingBox.style.display = "none";
      }, 800);
    } else {
      if (bar) bar.style.background = "#ef4444";
      statusEl.innerHTML = `<span style="color: #f87171;">❌ Lỗi: ${json.error || "Không thể bóc tách đề thi!"}</span>`;
      setTimeout(() => {
        if (loadingBox) loadingBox.style.display = "none";
      }, 2500);
    }
  } catch (e) {
    clearInterval(progressTimer);
    if (bar) bar.style.background = "#ef4444";
    statusEl.innerHTML = `<span style="color: #f87171;">❌ Lỗi kết nối mạng: ${e.message}</span>`;
    setTimeout(() => {
      if (loadingBox) loadingBox.style.display = "none";
    }, 2500);
  } finally {
    parseBtn.disabled = false;
    parseBtn.innerHTML = `🤖 Bắt Đầu Phân Tích Bằng AI`;
  }
}

// 5. Render Parsed Preview List (Phát hiện trùng lặp trên GitHub)
function renderParsedPreviewList() {
  const container = document.getElementById("questions-list");
  const countEl = document.getElementById("parsed-count");

  if (parsedQuestions.length === 0) {
    countEl.innerText = `0 câu`;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Chưa có câu hỏi nào được nạp.</p>
        <p style="font-size: 12px; margin-top: 4px;">Dán đề thi vào ô bên trái và bấm "Bắt Đầu Phân Tích Bằng AI" để bắt đầu.</p>
      </div>
    `;
    return;
  }

  // Chuẩn hóa chuỗi so khớp: loại bỏ tiền tố "Câu 1.", "Bài 1.", dấu câu, dấu cách thừa
  const cleanQText = str => (str || "").trim().replace(/^(câu|bài|question)\s*\d+[\s:.-]*/i, "").trim();
  const norm = str => cleanQText(str).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

  // Lấy toàn bộ câu hỏi đã có trên GitHub để kiểm tra trùng
  const allGithubMap = new Map(); // normalized_question -> { contestName, contestId, correctAnswer }
  availableContests.forEach(c => {
    const qList = c.questions_normalized || c.questions || [];
    if (Array.isArray(qList)) {
      qList.forEach(q => {
        const k = norm(q.question);
        if (k && !allGithubMap.has(k)) {
          allGithubMap.set(k, {
            contestName: c.name,
            contestId: c.id,
            correctAnswer: q.correctAnswer || q.answer || ""
          });
        }
      });
    }
  });

  let newCount = 0;
  let dupCount = 0;
  const seenInBatch = new Set();

  let html = "";
  parsedQuestions.forEach((q, idx) => {
    const qKey = norm(q.question);
    const existingMatch = allGithubMap.get(qKey);
    const isDuplicateInBatch = seenInBatch.has(qKey);
    seenInBatch.add(qKey);

    let badgeHtml = "";
    if (existingMatch) {
      dupCount++;
      badgeHtml = `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); font-size: 11px; padding: 2px 7px;">🔄 Đã có trên GitHub (${escapeHtml(existingMatch.contestName)})</span>`;
    } else if (isDuplicateInBatch) {
      dupCount++;
      badgeHtml = `<span class="badge-tag" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3); font-size: 11px; padding: 2px 7px;">⚠️ Trùng lặp trong đề vừa dán</span>`;
    } else {
      newCount++;
      badgeHtml = `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3); font-size: 11px; padding: 2px 7px;">✨ Câu mới</span>`;
    }

    let optsHtml = "";
    (q.options || []).forEach(opt => {
      const isCorrect = isMatchingAnswer(opt, q.correctAnswer);
      optsHtml += `<div class="preview-option-item ${isCorrect ? 'correct' : ''}">
        ${isCorrect ? '✓ ' : ''}${escapeHtml(opt)}
      </div>`;
    });

    html += `
      <div class="question-card" id="q-card-${idx}">
        <div class="question-header" style="flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="question-num">Câu ${idx + 1}</span>
            ${badgeHtml}
          </div>
          <div class="card-actions">
            <button class="btn-icon" onclick="deleteParsedQuestion(${idx})" title="Xóa câu này">🗑️</button>
          </div>
          <div class="question-text" style="width: 100%; margin-top: 4px;">${escapeHtml(q.question)}</div>
        </div>
        <div class="preview-options">
          ${optsHtml}
        </div>
        <div style="font-size: 12px; color: #34d399; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
          <span>🎯 Đáp án AI chọn:</span>
          <span>${escapeHtml(q.correctAnswer || 'Chưa rõ')}</span>
        </div>
      </div>
    `;
  });

  countEl.innerHTML = `<b>${parsedQuestions.length}</b> câu (${newCount} mới, ${dupCount} trùng)`;
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
    const pinAsActive = document.getElementById("chk-pin-active-contest")?.checked ?? true;

    const res = await fetch("api.php?action=push_to_github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contest_id: contestId,
        contest_name: contestName,
        contest_desc: contestDesc,
        questions: parsedQuestions,
        pin_as_active: pinAsActive
      })
    });
    const json = await res.json();

    if (json.success) {
      alert(`🎉 THÀNH CÔNG!\n\n${json.data.message}\nTổng số câu trong cuộc thi: ${json.data.totalInContest}\n\nToàn bộ máy cài Extension sẽ nhận được đề mới!`);
      // Reload contests & extension settings
      await loadContests();
      await loadExtensionSettings();
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

// -------------------------------------------------------------
// 8. Quản Lý Cài Đặt Tập Trung Toàn Bộ Extension (Global Hub)
// -------------------------------------------------------------
async function loadExtensionSettings() {
  try {
    const res = await fetch("api.php?action=get_extension_settings");
    const json = await res.json();
    if (!json.success || !json.data) return;

    const data = json.data;
    const activeContest = data.active_contest || {};
    const globalSettings = data.global_settings || {};

    // 1. Gán thông tin cuộc thi ghim Header
    const txtName = document.getElementById("txt-ext-active-name");
    const txtId = document.getElementById("txt-ext-active-id");
    const txtDate = document.getElementById("txt-ext-active-date");
    const prevName = document.getElementById("preview-ext-contest-name");
    const prevDate = document.getElementById("preview-ext-contest-date");

    if (txtName) txtName.value = activeContest.name || "";
    if (txtId) txtId.value = activeContest.id || "";
    if (txtDate) txtDate.value = activeContest.date || (new Date().toLocaleDateString('vi-VN'));

    if (prevName) {
      prevName.innerText = activeContest.name || "Chưa đặt tên";
      prevName.title = activeContest.name || "";
    }
    if (prevDate) {
      prevDate.innerText = activeContest.date || (new Date().toLocaleDateString('vi-VN'));
    }

    // Populate preset dropdown
    const selPreset = document.getElementById("sel-ext-active-preset");
    if (selPreset && data.contests_list) {
      selPreset.innerHTML = '<option value="">-- Chọn cuộc thi từ ngân hàng đề --</option>';
      data.contests_list.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.innerText = `${c.name} (${c.question_count || 0} câu)`;
        if (c.id === activeContest.id) opt.selected = true;
        selPreset.appendChild(opt);
      });
    }

    // 2. Gán các Toggle mặc định
    const chkAutoNext = document.getElementById("chk-global-auto-next");
    const chkAutoSubmit = document.getElementById("chk-global-auto-submit");
    const chkAutoPredict = document.getElementById("chk-global-auto-predict");
    if (chkAutoNext) chkAutoNext.checked = globalSettings.autoNext !== false;
    if (chkAutoSubmit) chkAutoSubmit.checked = globalSettings.autoSubmit !== false;
    if (chkAutoPredict) chkAutoPredict.checked = globalSettings.autoPredict !== false;

    // 3. Gán Số Người Dự Đoán (Range / Fixed)
    const radRange = document.getElementById("rad-predict-range");
    const radFixed = document.getElementById("rad-predict-fixed");
    const numMin = document.getElementById("num-predict-min");
    const numMax = document.getElementById("num-predict-max");
    const numFixed = document.getElementById("num-predict-fixed");

    if (globalSettings.predictType === "fixed") {
      if (radFixed) radFixed.checked = true;
    } else {
      if (radRange) radRange.checked = true;
    }
    if (numMin) numMin.value = globalSettings.predictMin ?? 1500;
    if (numMax) numMax.value = globalSettings.predictMax ?? 3500;
    if (numFixed) numFixed.value = globalSettings.predictFixed ?? 2500;

    const boxRange = document.getElementById("box-predict-range");
    const boxFixed = document.getElementById("box-predict-fixed");
    if (boxRange && boxFixed) {
      if (globalSettings.predictType === "fixed") {
        boxRange.style.display = "none";
        boxFixed.style.display = "block";
      } else {
        boxRange.style.display = "flex";
        boxFixed.style.display = "none";
      }
    }

    // 4. Gán Tốc độ & Độ trễ
    const speed = globalSettings.solveSpeed || "normal";
    const delay = globalSettings.delayPerQuestion || 2200;
    const speedInput = document.getElementById("val-global-speed");
    const delayInput = document.getElementById("val-global-delay");
    if (speedInput) speedInput.value = speed;
    if (delayInput) delayInput.value = delay;

    document.querySelectorAll(".btn-speed-opt").forEach(btn => {
      const bSpeed = btn.getAttribute("data-speed");
      btn.classList.toggle("active", bSpeed === speed);
    });

    // 5. Gán Thông báo & Ghi đè
    const txtAnnounce = document.getElementById("txt-ext-announcement");
    if (txtAnnounce) {
      txtAnnounce.value = data.announcement || "";
      updateAnnouncementPreview();
    }

    const chkOverride = document.getElementById("chk-force-override");
    if (chkOverride) chkOverride.checked = !!globalSettings.forceOverrideUser;

  } catch (e) {
    console.warn("Lỗi tải cài đặt Extension:", e);
  }
}

async function handleSaveExtensionSettings() {
  const btnTop = document.getElementById("btn-save-ext-settings");
  const btnBottom = document.getElementById("btn-save-ext-settings-bottom");
  const alertBox = document.getElementById("ext-settings-alert");

  const name = document.getElementById("txt-ext-active-name")?.value.trim();
  const id = document.getElementById("txt-ext-active-id")?.value.trim();
  const date = document.getElementById("txt-ext-active-date")?.value.trim();

  if (!name) {
    alert("Vui lòng nhập Tên cuộc thi mới nhất hiển thị trên Header Extension!");
    document.getElementById("txt-ext-active-name")?.focus();
    return;
  }

  const isFixed = document.getElementById("rad-predict-fixed")?.checked;
  const predictMin = parseInt(document.getElementById("num-predict-min")?.value, 10) || 1500;
  const predictMax = parseInt(document.getElementById("num-predict-max")?.value, 10) || 3500;
  const predictFixed = parseInt(document.getElementById("num-predict-fixed")?.value, 10) || 2500;

  if (predictMin > predictMax) {
    alert("Số dự đoán ngẫu nhiên Từ (Min) không được lớn hơn Đến (Max)!");
    return;
  }

  const payload = {
    active_contest: {
      id: id || slugifyVietnamese(name),
      name: name,
      date: date || (new Date().toLocaleDateString('vi-VN'))
    },
    global_settings: {
      autoNext: document.getElementById("chk-global-auto-next")?.checked ?? true,
      autoSubmit: document.getElementById("chk-global-auto-submit")?.checked ?? true,
      autoPredict: document.getElementById("chk-global-auto-predict")?.checked ?? true,
      predictType: isFixed ? "fixed" : "range",
      predictMin: predictMin,
      predictMax: predictMax,
      predictFixed: predictFixed,
      solveSpeed: document.getElementById("val-global-speed")?.value || "normal",
      delayPerQuestion: parseInt(document.getElementById("val-global-delay")?.value, 10) || 2200,
      forceOverrideUser: document.getElementById("chk-force-override")?.checked ?? false
    },
    announcement: document.getElementById("txt-ext-announcement")?.value.trim() || ""
  };

  const oldTopText = btnTop ? btnTop.innerText : "";
  const oldBottomText = btnBottom ? btnBottom.innerText : "";
  if (btnTop) { btnTop.disabled = true; btnTop.innerText = "⏳ Đang lưu & đồng bộ..."; }
  if (btnBottom) { btnBottom.disabled = true; btnBottom.innerText = "⏳ Đang lưu & đồng bộ..."; }

  try {
    const res = await fetch("api.php?action=save_extension_settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.success) {
      if (alertBox) {
        alertBox.style.display = "block";
        alertBox.innerHTML = `
          <div class="alert-box success" style="margin: 0; padding: 14px 16px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: #34d399;">${escapeHtml(json.data.message)}</div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.6;">
              • Cuộc thi ghim: <b style="color: #60a5fa;">${escapeHtml(json.data.active_contest.name)}</b> (Ngày: ${escapeHtml(json.data.active_contest.date)})<br>
              • Trạng thái mặc định: Tự làm &amp; chuyển câu: <b>${payload.global_settings.autoNext ? 'BẬT' : 'TẮT'}</b> | Tự nộp: <b>${payload.global_settings.autoSubmit ? 'BẬT' : 'TẮT'}</b> | Điền dự đoán: <b>${payload.global_settings.autoPredict ? 'BẬT' : 'TẮT'} (${payload.global_settings.predictType === 'range' ? `Random ${payload.global_settings.predictMin} - ${payload.global_settings.predictMax}` : `Cố định ${payload.global_settings.predictFixed}`})</b><br>
              • Toàn bộ Extension người dùng sẽ nhận ngay cấu hình này khi mở popup hoặc qua tự động đồng bộ ngầm định kỳ.
            </div>
            ${json.data.commitUrl ? `<div style="margin-top: 8px;"><a href="${escapeHtml(json.data.commitUrl)}" target="_blank" style="color: #60a5fa; text-decoration: underline; font-size: 11.5px;">🔗 Xem Commit trên GitHub</a></div>` : ''}
          </div>
        `;
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        alert(json.data.message);
      }
      await loadExtensionSettings();
    } else {
      if (json.error && json.error.includes("Chưa có GitHub Token")) {
        document.getElementById("token-modal").classList.remove("hidden");
      }
      alert(`❌ Lỗi đồng bộ: ${json.error}`);
    }
  } catch (e) {
    alert(`❌ Lỗi mạng: ${e.message}`);
  } finally {
    if (btnTop) { btnTop.disabled = false; btnTop.innerText = oldTopText; }
    if (btnBottom) { btnBottom.disabled = false; btnBottom.innerText = oldBottomText; }
  }
}

