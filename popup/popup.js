// AutoThi AI - Popup Controller

const DEFAULT_API_KEY = "AIzaSyBsWhAEb7UaJcjGYiVZ0obLJPj3olo77Cw";

document.addEventListener("DOMContentLoaded", async () => {
  // Tabs & Nav
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const cloudBadge = document.getElementById("cloud-update-badge");

  // Actions
  const btnStartAuto = document.getElementById("btn-start-auto");
  const btnStartHighlight = document.getElementById("btn-start-highlight");
  const btnStop = document.getElementById("btn-stop");
  const btnSave = document.getElementById("btn-save-settings");
  const btnToggleHud = document.getElementById("btn-toggle-hud");

  // Cloud Tab
  const btnCheckUpdates = document.getElementById("btn-check-updates");
  const contestList = document.getElementById("contest-list");
  const cloudAnnouncement = document.getElementById("cloud-announcement");
  const cloudAnnouncementText = document.getElementById("cloud-announcement-text");
  const txtServerUrl = document.getElementById("txt-server-url");
  const cloudLastSync = document.getElementById("cloud-last-sync");

  // Settings Tab
  const chkAutoNext = document.getElementById("chk-auto-next");
  const chkAutoSubmit = document.getElementById("chk-auto-submit");
  const chkAutoLearn = document.getElementById("chk-auto-learn");
  const chkShowDock = document.getElementById("chk-show-dock");
  const rngDelay = document.getElementById("rng-delay");
  const valDelay = document.getElementById("val-delay");

  // API Tab
  const txtApiKey = document.getElementById("txt-api-key");
  const btnToggleKey = document.getElementById("btn-toggle-key-visibility");
  const selModel = document.getElementById("sel-model");
  const btnTestApi = document.getElementById("btn-test-api");
  const apiTestResult = document.getElementById("api-test-result");

  // Bank Tab
  const bankCount = document.getElementById("bank-count");
  const btnExportBank = document.getElementById("btn-export-bank");
  const fileImportBank = document.getElementById("file-import-bank");
  const btnClearBank = document.getElementById("btn-clear-bank");

  // 1. Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // 2. Load stored settings
  const storage = await chrome.storage.local.get(["settings", "questionBank", "installedContests"]);
  const settings = storage.settings || {};
  const questionBank = storage.questionBank || {};

  txtApiKey.value = settings.apiKey || DEFAULT_API_KEY;
  selModel.value = settings.model || "gemini-1.5-flash";
  txtServerUrl.value = settings.serverUrl || "";
  chkAutoNext.checked = settings.autoNext !== false;
  chkAutoSubmit.checked = !!settings.autoSubmit;
  chkAutoLearn.checked = settings.autoLearn !== false;
  chkShowDock.checked = !!settings.showFloatingDock;
  rngDelay.value = settings.minDelay || 2000;
  valDelay.innerText = (rngDelay.value / 1000).toFixed(1) + "s";

  const modeRadio = document.querySelector(`input[name="mode"][value="${settings.mode || "auto"}"]`);
  if (modeRadio) modeRadio.checked = true;

  updateBankCount(questionBank);

  // 3. Delay Range Input
  rngDelay.addEventListener("input", () => {
    valDelay.innerText = (rngDelay.value / 1000).toFixed(1) + "s";
  });

  // 4. Toggle Key Visibility
  btnToggleKey.addEventListener("click", () => {
    if (txtApiKey.type === "password") {
      txtApiKey.type = "text";
      btnToggleKey.innerText = "🔒";
    } else {
      txtApiKey.type = "password";
      btnToggleKey.innerText = "👁️";
    }
  });

  // -------------------------------------------------------------
  // 5. Cloud Updates & Contest Packages
  // -------------------------------------------------------------

  btnCheckUpdates.addEventListener("click", () => {
    triggerCheckUpdates(true);
  });

  async function triggerCheckUpdates(showToastNotice = false) {
    contestList.innerHTML = `<div class="empty-cloud-state">⏳ Đang kết nối máy chủ và kiểm tra gói đề thi mới...</div>`;
    btnCheckUpdates.disabled = true;

    try {
      const serverUrl = txtServerUrl.value.trim() || undefined;
      chrome.runtime.sendMessage({ action: "CHECK_ONLINE_UPDATES", serverUrl }, async response => {
        btnCheckUpdates.disabled = false;
        if (!response || !response.success) {
          // If server fetch failed, load sample demo contests for user experience
          loadSampleDemoContests();
          if (showToastNotice) showToast("⚠️ Không kết nối được URL, đang hiển thị gói mẫu.");
          return;
        }

        const data = response.data;
        renderContestList(data.contests || []);

        if (data.announcement) {
          cloudAnnouncement.classList.remove("hidden");
          cloudAnnouncementText.innerText = data.announcement;
        } else {
          cloudAnnouncement.classList.add("hidden");
        }

        if (data.updateCount > 0) {
          cloudBadge.innerText = `${data.updateCount} MỚI`;
          cloudBadge.classList.remove("hidden");
        } else {
          cloudBadge.classList.add("hidden");
        }

        cloudLastSync.innerText = `Đã kiểm tra: ${new Date().toLocaleTimeString("vi-VN")}`;
        if (showToastNotice) showToast(`✅ Tìm thấy ${(data.contests || []).length} cuộc thi trực tuyến!`);
      });
    } catch (err) {
      btnCheckUpdates.disabled = false;
      loadSampleDemoContests();
    }
  }

  function renderContestList(contests) {
    if (!contests || contests.length === 0) {
      contestList.innerHTML = `
        <div class="empty-cloud-state">
          <div class="cloud-icon-placeholder">✨</div>
          <p>Hiện tại chưa có cuộc thi mới nào trên máy chủ.</p>
        </div>
      `;
      return;
    }

    contestList.innerHTML = "";
    contests.forEach(contest => {
      const card = document.createElement("div");
      card.className = `contest-card ${contest.hasUpdate ? "has-update" : ""}`;

      const totalQ = contest.total_questions || (contest.questions ? Object.keys(contest.questions).length : 0);
      const isNewOrUpdate = contest.hasUpdate;

      card.innerHTML = `
        <div class="contest-card-top">
          <div>
            <div class="contest-name">${escapeHtml(contest.name)}</div>
            <div class="contest-organizer">🏛️ ${escapeHtml(contest.organizer || "Cuộc thi trực tuyến")}</div>
          </div>
          <div class="contest-badges">
            ${isNewOrUpdate ? `<span class="badge-tag update">⚡ Cần cập nhật</span>` : `<span class="badge-tag installed">✓ Đã cài v${contest.version || 1}</span>`}
          </div>
        </div>
        ${contest.description ? `<p style="font-size:11px; color:#94a3b8; line-height:1.3;">${escapeHtml(contest.description)}</p>` : ""}
        <div class="contest-card-bottom">
          <div class="contest-meta">
            📊 ${totalQ} câu • v${contest.version || 1} • ${contest.updated_at || "2026"}
          </div>
          <button class="btn-update-package ${isNewOrUpdate ? "" : "installed"}" data-contest-id="${contest.id}">
            ${isNewOrUpdate ? "📥 Cập nhật ngay" : "🔄 Cài lại"}
          </button>
        </div>
      `;

      // Button click to install
      const btnInstall = card.querySelector(".btn-update-package");
      btnInstall.addEventListener("click", async () => {
        btnInstall.innerText = "⏳ Đang tải...";
        btnInstall.disabled = true;

        chrome.runtime.sendMessage({ action: "INSTALL_CONTEST_PACKAGE", contest }, async res => {
          if (res && res.success) {
            btnInstall.innerText = "✓ Đã cập nhật!";
            btnInstall.className = "btn-update-package installed";
            card.classList.remove("has-update");
            const tag = card.querySelector(".badge-tag");
            if (tag) {
              tag.className = "badge-tag installed";
              tag.innerText = `✓ Đã cài v${contest.version || 1}`;
            }

            // Refresh bank count
            const st = await chrome.storage.local.get("questionBank");
            updateBankCount(st.questionBank);
            showToast(`🎉 Đã tải ${res.count} câu hỏi của "${contest.name}"!`);
          } else {
            btnInstall.innerText = "❌ Lỗi tải";
            btnInstall.disabled = false;
            showToast("❌ Không thể tải gói đề thi!");
          }
        });
      });

      contestList.appendChild(card);
    });
  }

  // Load sample demo if server URL is not yet connected
  function loadSampleDemoContests() {
    const demoContests = [
      {
        id: "lam_dong_2026",
        name: "Cuộc thi trực tuyến Thanh niên số - Công dân số Tỉnh Lâm Đồng 2026",
        organizer: "Tỉnh Đoàn Lâm Đồng",
        domain_match: "chuyendoiso.cuocthi.vn",
        version: 1,
        total_questions: 3,
        updated_at: "17/08/2026",
        description: "Bộ câu hỏi & đáp án chuẩn cuộc thi Thanh niên số Tỉnh Lâm Đồng 2026.",
        hasUpdate: true,
        questions: {
          "ngày chuyển đổi số quốc gia của việt nam được chọn là ngày nào hằng năm?": {
            "question": "Ngày Chuyển đổi số quốc gia của Việt Nam được chọn là ngày nào hằng năm?",
            "correctAnswer": "Ngày 10 tháng 10",
            "options": ["Ngày 10 tháng 10", "Ngày 02 tháng 09", "Ngày 26 tháng 03", "Ngày 19 tháng 08"]
          },
          "đâu là 3 trụ cột chính trong chiến lược chuyển đổi số quốc gia của việt nam?": {
            "question": "Đâu là 3 trụ cột chính trong Chiến lược Chuyển đổi số quốc gia của Việt Nam?",
            "correctAnswer": "Chính phủ số, Kinh tế số và Xã hội số",
            "options": ["Chính phủ số, Kinh tế số và Xã hội số", "Nông nghiệp số, Giáo dục số và Y tế số", "An ninh số, Dữ liệu số và Hạ tầng số", "Công nghiệp số, Tài chính số và Dịch vụ số"]
          },
          "ứng dụng định danh điện tử quốc gia của bộ công an việt nam có tên gọi là gì?": {
            "question": "Ứng dụng định danh điện tử quốc gia của Bộ Công an Việt Nam có tên gọi là gì?",
            "correctAnswer": "VNeID",
            "options": ["PC-Covid", "VNeID", "VssID", "eGov"]
          }
        }
      }
    ];

    renderContestList(demoContests);
    cloudBadge.innerText = "1 MỚI";
    cloudBadge.classList.remove("hidden");
  }

  // Auto trigger update check on load
  triggerCheckUpdates(false);

  // -------------------------------------------------------------
  // 6. Test Gemini API
  // -------------------------------------------------------------
  btnTestApi.addEventListener("click", async () => {
    const key = txtApiKey.value.trim() || DEFAULT_API_KEY;
    const model = selModel.value;

    apiTestResult.className = "api-result-box";
    apiTestResult.innerText = "⏳ Đang kiểm tra kết nối tới Gemini AI...";
    apiTestResult.classList.remove("hidden");

    try {
      chrome.runtime.sendMessage(
        { action: "TEST_API_KEY", apiKey: key, model },
        response => {
          if (response && response.success) {
            apiTestResult.className = "api-result-box success";
            apiTestResult.innerText = `✅ Kết nối thành công! Gemini phản hồi: "${response.data.reply}"`;
          } else {
            apiTestResult.className = "api-result-box error";
            apiTestResult.innerText = `❌ Lỗi kết nối: ${response ? response.error : "Không có phản hồi"}`;
          }
        }
      );
    } catch (err) {
      apiTestResult.className = "api-result-box error";
      apiTestResult.innerText = `❌ Lỗi: ${err.message}`;
    }
  });

  // 7. Save Settings
  btnSave.addEventListener("click", async () => {
    await saveCurrentSettings();
    showToast("💾 Đã lưu cấu hình thành công!");
  });

  async function saveCurrentSettings() {
    const activeMode = document.querySelector('input[name="mode"]:checked')?.value || "auto";
    const newSettings = {
      apiKey: txtApiKey.value.trim() || DEFAULT_API_KEY,
      model: selModel.value,
      serverUrl: txtServerUrl.value.trim(),
      mode: activeMode,
      autoNext: chkAutoNext.checked,
      autoSubmit: chkAutoSubmit.checked,
      autoLearn: chkAutoLearn.checked,
      showFloatingDock: chkShowDock.checked,
      minDelay: parseInt(rngDelay.value),
      maxDelay: parseInt(rngDelay.value) + 1500,
      enabled: true
    };

    await chrome.storage.local.set({ settings: newSettings });
    return newSettings;
  }

  // 8. Actions: Start / Stop
  btnStartAuto.addEventListener("click", async () => {
    await saveCurrentSettings();
    sendActionToActiveTab("START_AUTO", { mode: "auto" });
    showRunningState(true);
    showToast("🚀 Bắt đầu tự động làm bài!");
  });

  btnStartHighlight.addEventListener("click", async () => {
    await saveCurrentSettings();
    sendActionToActiveTab("START_AUTO", { mode: "highlight" });
    showRunningState(true);
    showToast("🎯 Đã bật chế độ gợi ý đáp án!");
  });

  btnStop.addEventListener("click", () => {
    sendActionToActiveTab("STOP_AUTO");
    showRunningState(false);
    showToast("⏹ Đã dừng làm bài!");
  });

  btnToggleHud.addEventListener("click", () => {
    sendActionToActiveTab("TOGGLE_FLOATING_DOCK");
    showToast("🖥️ Đã thay đổi trạng thái thanh nổi!");
  });

  function showRunningState(isRunning) {
    if (isRunning) {
      btnStartAuto.classList.add("hidden");
      btnStartHighlight.classList.add("hidden");
      btnStop.classList.remove("hidden");
      document.getElementById("global-status-dot").className = "status-dot busy";
      document.getElementById("global-status-text").innerText = "Đang chạy";
    } else {
      btnStartAuto.classList.remove("hidden");
      btnStartHighlight.classList.remove("hidden");
      btnStop.classList.add("hidden");
      document.getElementById("global-status-dot").className = "status-dot ready";
      document.getElementById("global-status-text").innerText = "Sẵn sàng";
    }
  }

  function sendActionToActiveTab(action, payload = {}) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action, ...payload }, res => {
          if (chrome.runtime.lastError) {
            console.warn("Could not send to tab:", chrome.runtime.lastError.message);
          }
        });
      }
    });
  }

  // 9. Bank Management (Export / Import / Clear)
  function updateBankCount(bank) {
    const count = Object.keys(bank || {}).length;
    bankCount.innerText = count.toLocaleString();
  }

  btnExportBank.addEventListener("click", async () => {
    const data = await chrome.storage.local.get("questionBank");
    const bank = data.questionBank || {};
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autothi_question_bank_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📥 Đã xuất dữ liệu ngân hàng đề!");
  });

  fileImportBank.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const imported = JSON.parse(event.target.result);
        const data = await chrome.storage.local.get("questionBank");
        const currentBank = data.questionBank || {};
        const merged = { ...currentBank, ...imported };
        await chrome.storage.local.set({ questionBank: merged });
        updateBankCount(merged);
        showToast(`📤 Đã nhập thành công ${Object.keys(imported).length} câu hỏi!`);
      } catch (err) {
        showToast("❌ File JSON không hợp lệ!");
      }
    };
    reader.readAsText(file);
  });

  btnClearBank.addEventListener("click", async () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ ngân hàng câu hỏi đã ghi nhớ?")) {
      await chrome.storage.local.set({ questionBank: {}, installedContests: {} });
      updateBankCount({});
      showToast("🗑️ Đã xóa sạch ngân hàng đề!");
    }
  });

  // Helpers
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
});
