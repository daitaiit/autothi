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
      // Chỉ hiển thị thông báo phát thanh thực tế do Quản trị viên nhập từ Web Admin
      if (typeof msg === "string" && msg.trim() && !msg.toLowerCase().includes("ngoại tuyến") && !msg.toLowerCase().includes("offline")) {
        annText.innerText = msg.trim();
        annBanner.classList.remove("hidden");
      } else {
        annBanner.classList.add("hidden");
        annText.innerText = "";
        // Nếu bộ nhớ trình duyệt còn vướng thông báo kỹ thuật cũ, tự động dọn sạch
        if (typeof msg === "string" && (msg.toLowerCase().includes("ngoại tuyến") || msg.toLowerCase().includes("offline"))) {
          chrome.storage.local.set({ announcement: "" });
        }
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

      // 1. Lấy thông tin cuộc thi đang ghim (activeContest)
      let activeC = activeContestOverride;
      if (!activeC) {
        try {
          const st = await chrome.storage.local.get("activeContest");
          activeC = st.activeContest;
        } catch (e) {}
      }

      // Tự động kiểm tra file manifest nội bộ nếu storage chưa có hoặc đang vướng cuộc thi cũ
      try {
        const manifestRes = await fetch(chrome.runtime.getURL("contests_manifest.json"));
        if (manifestRes.ok) {
          const manifestJson = await manifestRes.json();
          if (manifestJson.active_contest) {
            // Luôn đồng bộ activeContest mới nhất từ manifest nếu có
            if (!activeC || activeC.id !== manifestJson.active_contest.id) {
              activeC = manifestJson.active_contest;
              chrome.storage.local.set({ activeContest: activeC });
            }
          }
        }
      } catch (mErr) {}

      let targetContest = null;
      const installedValues = Object.values(installedList || {});

      // 2. Nhận diện cuộc thi thông minh:
      // A. Nếu URL hiện tại khớp chính xác đường dẫn bài thi cụ thể (path match)
      if (currentUrl) {
        const lowerUrl = currentUrl.toLowerCase();
        for (const c of installedValues) {
          if (c.contest_url && c.contest_url.length > 25) {
            try {
              const cPath = new URL(c.contest_url).pathname.toLowerCase();
              if (cPath && cPath !== "/" && lowerUrl.includes(cPath)) {
                targetContest = c;
                break;
              }
            } catch (err) {
              if (lowerUrl.includes(c.contest_url.toLowerCase())) {
                targetContest = c;
                break;
              }
            }
          }
        }
      }

      // B. Nếu đang ở trên trang thi (ví dụ danguyccqdanglamdong.vn) nhưng không phải link bài cũ cụ thể:
      // PHẢI ưu tiên cuộc thi ghim đang diễn ra hôm nay (activeContest)
      if (!targetContest && activeC && activeC.name) {
        const matched = (installedList && installedList[activeC.id]) ? { ...installedList[activeC.id] } : {};
        targetContest = {
          ...matched,
          id: activeC.id || matched.id,
          name: activeC.name,
          displayDate: activeC.date || matched.displayDate || matched.updated_at || "30/09/2026",
          updated_at: activeC.date || matched.updated_at || matched.displayDate || "30/09/2026"
        };
      }

      // C. Nếu không có activeContest, tìm cuộc thi có domain khớp và ngày mới nhất
      if (!targetContest && currentUrl) {
        const lowerUrl = currentUrl.toLowerCase();
        const matchedByDomain = installedValues.filter(c =>
          c.domain_match && c.domain_match !== "*" && lowerUrl.includes(c.domain_match.toLowerCase())
        );
        if (matchedByDomain.length > 0) {
          matchedByDomain.sort((a, b) => {
            const dateA = a.updated_at || a.displayDate || "";
            const dateB = b.updated_at || b.displayDate || "";
            return dateB.localeCompare(dateA);
          });
          targetContest = matchedByDomain[0];
        }
      }

      // D. Cuối cùng: Lấy cuộc thi đầu tiên trong danh sách (sắp xếp theo ngày mới nhất)
      if (!targetContest && installedValues.length > 0) {
        const sorted = [...installedValues].sort((a, b) => {
          const dateA = a.updated_at || a.displayDate || "";
          const dateB = b.updated_at || b.displayDate || "";
          return dateB.localeCompare(dateA);
        });
        targetContest = sorted[0];
      }

      // Cập nhật thông tin ngày hiển thị
      const lastUpdatedText = document.getElementById("last-updated-text");
      if (lastUpdatedText) {
        const dateToShow = (targetContest && (targetContest.displayDate || targetContest.updated_at))
          || (activeC && (activeC.date || activeC.updated_at))
          || "30/09/2026";
        lastUpdatedText.innerText = dateToShow;
      }

      // Cập nhật tên cuộc thi hiển thị
      if (activeContestName) {
        const nameToShow = (targetContest && targetContest.name)
          || (activeC && activeC.name)
          || "Đã sẵn sàng hỗ trợ làm bài";
        activeContestName.innerText = nameToShow;
        activeContestName.title = nameToShow;
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
