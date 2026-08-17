// AutoThi AI - Minimalist User Popup Controller

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const btnStart = document.getElementById("btn-start");
  const btnStop = document.getElementById("btn-stop");
  const modeAuto = document.getElementById("mode-auto");
  const modeHighlight = document.getElementById("mode-highlight");
  const chkAutoNext = document.getElementById("chk-auto-next");
  const chkAutoSubmit = document.getElementById("chk-auto-submit");
  const chkAutoPredict = document.getElementById("chk-auto-predict");
  const txtPredictNumber = document.getElementById("txt-predict-number");
  const speedBtns = document.querySelectorAll(".speed-btn");

  const statusPill = document.getElementById("status-pill");
  const statusText = document.getElementById("status-text");
  const footerBankCount = document.getElementById("footer-bank-count");
  const activeContestName = document.getElementById("active-contest-name");

  const updateBanner = document.getElementById("update-banner");
  const bannerTitle = document.getElementById("banner-title");
  const bannerSub = document.getElementById("banner-sub");
  const btnQuickUpdate = document.getElementById("btn-quick-update");
  const btnSyncNow = document.getElementById("btn-sync-now");

  let currentMode = "auto";
  let currentDelay = 2200;
  let pendingContest = null;

  // 1. Load Stored Data
  const storage = await chrome.storage.local.get(["settings", "questionBank", "installedContests"]);
  const settings = storage.settings || {};
  const questionBank = storage.questionBank || {};
  const installed = storage.installedContests || {};

  // Setup initial UI states
  currentMode = settings.mode || "auto";
  setModeUI(currentMode);

  chkAutoNext.checked = settings.autoNext !== false;
  chkAutoSubmit.checked = settings.autoSubmit !== false;
  chkAutoPredict.checked = settings.autoPredict !== false;
  txtPredictNumber.value = settings.predictNumber || "";

  currentDelay = settings.minDelay || 2200;
  setSpeedUI(currentDelay);

  updateBankUI(questionBank, installed);

  // 2. Mode Selection (Tự động vs Gợi ý)
  modeAuto.addEventListener("click", () => {
    currentMode = "auto";
    setModeUI("auto");
    saveSettings();
  });

  modeHighlight.addEventListener("click", () => {
    currentMode = "highlight";
    setModeUI("highlight");
    saveSettings();
  });

  function setModeUI(mode) {
    if (mode === "auto") {
      modeAuto.classList.add("active");
      modeHighlight.classList.remove("active");
    } else {
      modeHighlight.classList.add("active");
      modeAuto.classList.remove("active");
    }
  }

  // 3. Speed Selection
  speedBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      speedBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDelay = parseInt(btn.getAttribute("data-speed"));
      saveSettings();
    });
  });

  function setSpeedUI(delay) {
    speedBtns.forEach(btn => {
      const speed = parseInt(btn.getAttribute("data-speed"));
      if (Math.abs(speed - delay) < 500) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // 4. Settings change listeners
  chkAutoNext.addEventListener("change", saveSettings);
  chkAutoSubmit.addEventListener("change", saveSettings);
  chkAutoPredict.addEventListener("change", saveSettings);
  txtPredictNumber.addEventListener("input", saveSettings);

  async function saveSettings() {
    const current = (await chrome.storage.local.get("settings")).settings || {};
    const updated = {
      ...current,
      mode: currentMode,
      autoNext: chkAutoNext.checked,
      autoSubmit: chkAutoSubmit.checked,
      autoPredict: chkAutoPredict.checked,
      predictNumber: txtPredictNumber.value.trim(),
      minDelay: currentDelay,
      maxDelay: currentDelay + 1200,
      enabled: true
    };
    await chrome.storage.local.set({ settings: updated });
  }

  // 5. Big Action Buttons: Start & Stop
  btnStart.addEventListener("click", async () => {
    await saveSettings();
    sendActionToActiveTab("START_AUTO", { mode: currentMode });
    setRunningState(true);
    showToast("🚀 Đang làm bài tự động...");
  });

  btnStop.addEventListener("click", () => {
    sendActionToActiveTab("STOP_AUTO");
    setRunningState(false);
    showToast("⏹ Đã dừng lại!");
  });

  function setRunningState(isRunning) {
    if (isRunning) {
      btnStart.classList.add("hidden");
      btnStop.classList.remove("hidden");
      statusPill.className = "status-pill busy";
      statusText.innerText = "Đang chạy";
    } else {
      btnStart.classList.remove("hidden");
      btnStop.classList.add("hidden");
      statusPill.className = "status-pill ready";
      statusText.innerText = "Sẵn sàng";
    }
  }

  function sendActionToActiveTab(action, payload = {}) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action, ...payload }, () => {
          if (chrome.runtime.lastError) {
            console.log("Tab communication ready");
          }
        });
      }
    });
  }

  // 6. Bank UI
  function updateBankUI(bank, installedList) {
    const count = Object.keys(bank || {}).length;
    footerBankCount.innerText = `${count} câu hỏi`;

    const installedKeys = Object.keys(installedList || {});
    if (installedKeys.length > 0) {
      const latestContest = installedList[installedKeys[installedKeys.length - 1]];
      activeContestName.innerText = latestContest.name || "Đã sẵn sàng hỗ trợ làm bài";
    } else {
      activeContestName.innerText = "Đã sẵn sàng hỗ trợ làm bài";
    }
  }

  // 7. Silent Online Check for Updates
  async function checkForOnlineUpdates() {
    try {
      chrome.runtime.sendMessage({ action: "CHECK_ONLINE_UPDATES" }, async response => {
        if (!response || !response.success) return;
        const data = response.data;
        const contests = data.contests || [];

        // Find contest with updates
        const needUpdate = contests.find(c => c.hasUpdate);
        if (needUpdate) {
          pendingContest = needUpdate;
          bannerTitle.innerText = `Đề thi mới: ${needUpdate.name}`;
          bannerSub.innerText = `${needUpdate.total_questions || 50} câu • v${needUpdate.version || 1} • Nhấn để cập nhật`;
          updateBanner.classList.remove("hidden");
        } else {
          updateBanner.classList.add("hidden");
        }
      });
    } catch (e) {
      console.log("Check update handled");
    }
  }

  btnQuickUpdate.addEventListener("click", () => {
    if (!pendingContest) return;
    btnQuickUpdate.innerText = "⏳ Đang tải...";
    btnQuickUpdate.disabled = true;

    chrome.runtime.sendMessage({ action: "INSTALL_CONTEST_PACKAGE", contest: pendingContest }, async res => {
      if (res && res.success) {
        btnQuickUpdate.innerText = "✓ Xong!";
        setTimeout(() => {
          updateBanner.classList.add("hidden");
        }, 1200);

        const st = await chrome.storage.local.get(["questionBank", "installedContests"]);
        updateBankUI(st.questionBank, st.installedContests);
        showToast(`🎉 Đã cập nhật xong đề thi mới!`);
      } else {
        btnQuickUpdate.innerText = "Thử lại";
        btnQuickUpdate.disabled = false;
        showToast("❌ Lỗi khi tải gói đề!");
      }
    });
  });

  btnSyncNow.addEventListener("click", () => {
    showToast("🔄 Đang kiểm tra đề thi mới...");
    checkForOnlineUpdates();
  });

  // Helper
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 2500);
  }

  // Run initial check
  checkForOnlineUpdates();
});
