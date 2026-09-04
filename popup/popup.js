// AutoThi AI - Minimalist User Popup Controller

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Elements
    const btnStart = document.getElementById("btn-start");
    const btnStop = document.getElementById("btn-stop");
    const btnToggleDock = document.getElementById("btn-toggle-dock");
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
    const storage = await chrome.storage.local.get(["settings", "questionBank", "installedContests", "activeContest", "globalSettings", "announcement"]);
    const settings = storage.settings || {};
    const questionBank = storage.questionBank || {};
    const installed = storage.installedContests || {};
    const activeContest = storage.activeContest || null;

    // Announcement Banner
    const annBanner = document.getElementById("announcement-banner");
    const annText = document.getElementById("announcement-text");
    const btnCloseAnn = document.getElementById("btn-close-announcement");

    function renderAnnouncement(msg) {
      if (!annBanner || !annText) return;
      if (typeof msg === "string" && msg.trim()) {
        annText.innerText = msg.trim();
        annBanner.classList.remove("hidden");
      } else {
        annBanner.classList.add("hidden");
        annText.innerText = "";
      }
    }

    renderAnnouncement(storage.announcement);

    if (btnCloseAnn) {
      btnCloseAnn.addEventListener("click", () => {
        if (annBanner) annBanner.classList.add("hidden");
      });
    }

    // Setup initial UI states
    currentMode = settings.mode || "auto";
    setModeUI(currentMode);

    if (chkAutoNext) chkAutoNext.checked = settings.autoNext !== false;
    if (chkAutoSubmit) chkAutoSubmit.checked = settings.autoSubmit !== false;
    if (chkAutoPredict) chkAutoPredict.checked = settings.autoPredict !== false;
    if (txtPredictNumber) {
      if (settings.predictType === "fixed" && settings.predictFixed) {
        txtPredictNumber.value = settings.predictNumber || settings.predictFixed.toString();
        txtPredictNumber.placeholder = settings.predictFixed.toString();
      } else {
        txtPredictNumber.value = settings.predictNumber || "";
        txtPredictNumber.placeholder = `Random ${settings.predictMin || 1500}-${settings.predictMax || 3500}`;
      }
    }

    currentDelay = settings.minDelay || 2200;
    setSpeedUI(currentDelay);

    if (btnToggleDock) {
      btnToggleDock.classList.toggle("active", !!settings.showFloatingDock);
    }

    updateBankUI(questionBank, installed, activeContest);

    // 2. Mode Selection (Tự động vs Gợi ý)
    if (modeAuto) {
      modeAuto.addEventListener("click", () => {
        currentMode = "auto";
        setModeUI("auto");
        saveSettings();
      });
    }

    if (modeHighlight) {
      modeHighlight.addEventListener("click", () => {
        currentMode = "highlight";
        setModeUI("highlight");
        saveSettings();
      });
    }

    function setModeUI(mode) {
      if (modeAuto && modeHighlight) {
        if (mode === "auto") {
          modeAuto.classList.add("active");
          modeHighlight.classList.remove("active");
        } else {
          modeHighlight.classList.add("active");
          modeAuto.classList.remove("active");
        }
      }
    }

    // 3. Speed Selection
    speedBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        speedBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentDelay = parseInt(btn.getAttribute("data-speed")) || 2200;
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
    if (chkAutoNext) chkAutoNext.addEventListener("change", saveSettings);
    if (chkAutoSubmit) chkAutoSubmit.addEventListener("change", saveSettings);
    if (chkAutoPredict) chkAutoPredict.addEventListener("change", saveSettings);
    if (txtPredictNumber) txtPredictNumber.addEventListener("input", saveSettings);

    async function saveSettings() {
      const current = (await chrome.storage.local.get("settings")).settings || {};
      const updated = {
        ...current,
        mode: currentMode,
        autoNext: chkAutoNext ? chkAutoNext.checked : true,
        autoSubmit: chkAutoSubmit ? chkAutoSubmit.checked : true,
        autoPredict: chkAutoPredict ? chkAutoPredict.checked : true,
        predictNumber: txtPredictNumber ? txtPredictNumber.value.trim() : "",
        minDelay: currentDelay,
        maxDelay: currentDelay + 1200,
        enabled: true
      };
      await chrome.storage.local.set({ settings: updated });
    }

    // 5. Big Action Buttons: Start & Stop
    if (btnStart) {
      btnStart.addEventListener("click", async () => {
        await saveSettings();
        const success = await sendActionToActiveTab("START_AUTO", { mode: currentMode });
        if (success) {
          setRunningState(true);
          showToast("🚀 Đang làm bài tự động...");
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener("click", () => {
        sendActionToActiveTab("STOP_AUTO");
        setRunningState(false);
        showToast("⏹ Đã dừng lại!");
      });
    }

    if (btnToggleDock) {
      btnToggleDock.addEventListener("click", async () => {
        const res = await sendActionToActiveTab("TOGGLE_FLOATING_DOCK");
        if (res && res.status === "toggled") {
          btnToggleDock.classList.toggle("active", !!res.isVisible);
          showToast(res.isVisible ? "📌 Đã mở thanh nổi trên trang web!" : "📌 Đã ẩn thanh nổi trên web!");
        } else {
          showToast("📌 Đã bật / ẩn thanh nổi trên trang web!");
        }
      });
    }

    function setRunningState(isRunning) {
      if (btnStart && btnStop && statusPill && statusText) {
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
    }

    async function sendActionToActiveTab(action, payload = {}) {
      return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
          const tab = tabs[0];
          if (!tab || !tab.id) {
            showToast("⚠️ Không tìm thấy tab hoạt động.");
            return resolve(false);
          }

          if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("chrome-extension://"))) {
            showToast("⚠️ Vui lòng mở trang web thi trước khi bấm Bắt đầu!");
            return resolve(false);
          }

          // Try sending message
          chrome.tabs.sendMessage(tab.id, { action, ...payload }, async response => {
            if (chrome.runtime.lastError) {
              // If content script was not injected (e.g. page was opened before extension installed)
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ["scripts/content.js"]
                });
                await chrome.scripting.insertCSS({
                  target: { tabId: tab.id },
                  files: ["scripts/content.css"]
                });
                // Retry sending message after script injection
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action, ...payload }, () => {
                    resolve(true);
                  });
                }, 300);
              } catch (injectErr) {
                showToast("⚠️ Hãy tải lại (F5) trang bài thi rồi bấm lại!");
                resolve(false);
              }
            } else {
              resolve(true);
            }
          });
        });
      });
    }

    // 6. Bank UI (Tự động nhận diện cuộc thi theo Tab web đang mở hoặc đề mới nhất)
    async function updateBankUI(bank, installedList, activeContestOverride = null) {
      if (footerBankCount) {
        const count = Object.keys(bank || {}).length;
        footerBankCount.innerText = `${count} câu hỏi`;
      }

      let currentUrl = "";
      try {
        const tabs = await new Promise(res => chrome.tabs.query({ active: true, currentWindow: true }, res));
        if (tabs && tabs[0]) {
          currentUrl = tabs[0].url || "";
        }
      } catch (e) {}

      let targetContest = null;
      const installedValues = Object.values(installedList || {});

      // 1. Khớp theo tên miền của trang web người dùng đang mở
      if (currentUrl) {
        for (const c of installedValues) {
          if (c.domain_match && c.domain_match !== "*" && currentUrl.toLowerCase().includes(c.domain_match.toLowerCase())) {
            targetContest = c;
            break;
          }
          if (c.contest_url && (currentUrl.toLowerCase().includes("danguyccqdanglamdong.vn") || currentUrl.toLowerCase().includes("chuyendoiso.cuocthi.vn"))) {
            if (c.contest_url.toLowerCase().includes("danguyccqdanglamdong.vn") && currentUrl.toLowerCase().includes("danguyccqdanglamdong.vn")) {
              targetContest = c;
              break;
            }
          }
        }
      }

      // 2. Lấy thông tin cuộc thi được ghim toàn hệ thống từ Web Admin
      let activeC = activeContestOverride;
      if (!activeC) {
        try {
          const st = await chrome.storage.local.get("activeContest");
          activeC = st.activeContest;
        } catch (e) {}
      }

      if (!targetContest) {
        if (activeC && activeC.name) {
          const matched = (installedList && installedList[activeC.id]) ? { ...installedList[activeC.id] } : {};
          targetContest = {
            ...matched,
            id: activeC.id || matched.id,
            name: activeC.name, // Luôn ưu tiên tên cuộc thi được ghim từ Web Admin
            displayDate: activeC.date || matched.displayDate || "04/09/2026", // Luôn ưu tiên ngày từ Web Admin
            updated_at: activeC.date || matched.updated_at || "04/09/2026"
          };
        } else {
          targetContest = (installedList && (installedList["hoi_nghi_bct_03092026"] || installedList["bch_tw_khoa_xiv_2026"])) || (installedValues.length > 0 ? installedValues[0] : null);
        }
      } else if (activeC && targetContest.id === activeC.id) {
        if (activeC.name) targetContest.name = activeC.name;
        if (activeC.date) targetContest.displayDate = activeC.date;
      }

      const lastUpdatedText = document.getElementById("last-updated-text");
      if (lastUpdatedText) {
        if (targetContest) {
          lastUpdatedText.innerText = targetContest.displayDate || targetContest.updated_at || "04/09/2026";
        } else {
          lastUpdatedText.innerText = (activeC && activeC.date) ? activeC.date : "04/09/2026";
        }
      }

      if (activeContestName) {
        if (targetContest) {
          activeContestName.innerText = targetContest.name || "Đã sẵn sàng hỗ trợ làm bài";
          activeContestName.title = targetContest.name || "";
        } else {
          activeContestName.innerText = (activeC && activeC.name) ? activeC.name : "Đã sẵn sàng hỗ trợ làm bài";
        }
      }
    }

    // 7. Silent Online Check for Updates
    async function checkForOnlineUpdates() {
      try {
        chrome.runtime.sendMessage({ action: "CHECK_ONLINE_UPDATES" }, async response => {
          const st = await chrome.storage.local.get(["questionBank", "installedContests", "activeContest", "settings", "announcement"]);
          await updateBankUI(st.questionBank, st.installedContests, st.activeContest);

          // Cập nhật thông báo hệ thống (nếu có thông báo từ server hoặc từ local storage)
          const latestAnn = (response && response.data && response.data.announcement !== undefined)
            ? response.data.announcement
            : (st.announcement || "");
          renderAnnouncement(latestAnn);

          // Cập nhật lại các toggle nếu có cài đặt mới từ admin
          if (st.settings) {
            if (chkAutoNext && st.settings.autoNext !== undefined) chkAutoNext.checked = st.settings.autoNext;
            if (chkAutoSubmit && st.settings.autoSubmit !== undefined) chkAutoSubmit.checked = st.settings.autoSubmit;
            if (chkAutoPredict && st.settings.autoPredict !== undefined) chkAutoPredict.checked = st.settings.autoPredict;
            if (txtPredictNumber) {
              if (st.settings.predictType === "fixed" && st.settings.predictFixed) {
                txtPredictNumber.placeholder = st.settings.predictFixed.toString();
              } else {
                txtPredictNumber.placeholder = `Random ${st.settings.predictMin || 1500}-${st.settings.predictMax || 3500}`;
              }
            }
          }

          if (!response || !response.success || !updateBanner) return;
          const data = response.data;
          const contests = (data && data.contests) || [];

          const needUpdate = contests.find(c => c.hasUpdate);
          if (needUpdate) {
            pendingContest = needUpdate;
            if (bannerTitle) bannerTitle.innerText = `Đề thi mới: ${needUpdate.name}`;
            if (bannerSub) bannerSub.innerText = `${needUpdate.total_questions || 50} câu • v${needUpdate.version || 1} • Nhấn để cập nhật`;
            updateBanner.classList.remove("hidden");
          } else {
            updateBanner.classList.add("hidden");
          }
        });
      } catch (e) {
        console.log("Check update handled");
      }
    }

    if (btnQuickUpdate) {
      btnQuickUpdate.addEventListener("click", () => {
        if (!pendingContest) return;
        btnQuickUpdate.innerText = "⏳ Đang tải...";
        btnQuickUpdate.disabled = true;

        chrome.runtime.sendMessage({ action: "INSTALL_CONTEST_PACKAGE", contest: pendingContest }, async res => {
          if (res && res.success) {
            btnQuickUpdate.innerText = "✓ Xong!";
            setTimeout(() => {
              if (updateBanner) updateBanner.classList.add("hidden");
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
    }

    if (btnSyncNow) {
      btnSyncNow.addEventListener("click", () => {
        showToast("🔄 Đang đồng bộ đề thi & thông báo...");
        checkForOnlineUpdates();
      });
    }

    // Helper
    function showToast(msg) {
      const toast = document.getElementById("toast");
      if (!toast) return;
      toast.innerText = msg;
      toast.classList.remove("hidden");
      setTimeout(() => {
        toast.classList.add("hidden");
      }, 2800);
    }

    // Run initial check
    checkForOnlineUpdates();
  } catch (err) {
    console.error("AutoThi Popup Error:", err);
  }
});
