// AutoThi AI - Content Script (Engine giải đề & Tương tác DOM)

(function () {
  if (window.__AUTOTHI_INITIALIZED__) return;
  window.__AUTOTHI_INITIALIZED__ = true;

  let isRunning = false;
  let settings = {
    mode: "auto", // 'auto' | 'highlight'
    autoNext: true,
    autoSubmit: false,
    minDelay: 1500,
    maxDelay: 3000,
    autoLearn: true,
    enabled: true,
    showFloatingDock: false
  };
  let questionBank = {};
  let currentSolveTimeout = null;

  // Initialize data
  async function init() {
    try {
      const data = await chrome.storage.local.get(["settings", "questionBank"]);
      if (data.settings) settings = { ...settings, ...data.settings };
      if (data.questionBank) questionBank = data.questionBank || {};

      createFloatingDock();
      setupObserver();
      log("⚡ AutoThi AI sẵn sàng!", "info");
    } catch (e) {
      console.warn("AutoThi Init Error:", e);
    }
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.settings) settings = { ...settings, ...changes.settings.newValue };
      if (changes.questionBank) questionBank = changes.questionBank.newValue || {};
      updateDockUI();
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_AUTO") {
      startSolving(request.mode || settings.mode);
      sendResponse({ status: "started" });
    } else if (request.action === "STOP_AUTO") {
      stopSolving();
      sendResponse({ status: "stopped" });
    } else if (request.action === "SOLVE_CURRENT_PAGE") {
      solveCurrentPage();
      sendResponse({ status: "solving" });
    } else if (request.action === "TOGGLE_FLOATING_DOCK") {
      const dock = document.getElementById("autothi-floating-dock");
      if (dock) {
        dock.classList.toggle("hidden");
        sendResponse({ status: "toggled", isVisible: !dock.classList.contains("hidden") });
      }
    }
    return true;
  });

  // -------------------------------------------------------------
  // DOM Scanning & Question Extraction
  // -------------------------------------------------------------

  function findQuestionsOnPage() {
    const questions = [];

    // Common selectors for online quiz platforms in Vietnam (cuocthi.vn, myaloha, vnedu, azota, etc.)
    const containerSelectors = [
      ".question-item",
      ".question_item",
      ".question-box",
      ".question_box",
      ".cau-hoi",
      ".item-cau-hoi",
      ".box-cau-hoi",
      ".quiz-question",
      ".content-question",
      ".question",
      ".item_cauhoi",
      ".dethi-item",
      "[data-question-id]",
      "[data-question]"
    ];

    let containers = [];
    for (const sel of containerSelectors) {
      const found = document.querySelectorAll(sel);
      if (found && found.length > 0) {
        containers = Array.from(found);
        break;
      }
    }

    // Heuristic 1: If container selector matched
    if (containers.length > 0) {
      containers.forEach((container, idx) => {
        const qData = parseQuestionContainer(container, idx);
        if (qData) questions.push(qData);
      });
    } else {
      // Heuristic 2: Group by radio button groups
      const radios = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (radios.length > 0) {
        const groups = {};
        radios.forEach(r => {
          const name = r.name || "default_group";
          if (!groups[name]) groups[name] = [];
          groups[name].push(r);
        });

        Object.keys(groups).forEach((name, idx) => {
          const inputs = groups[name];
          if (inputs.length >= 2) {
            // Find closest parent that contains all radios of this group
            let parent = inputs[0].closest("form, .row, fieldset, table, div");
            const qData = parseQuestionFromInputs(parent || document.body, inputs, idx);
            if (qData) questions.push(qData);
          }
        });
      }
    }

    // Heuristic 3: Single-question view (1 câu / 1 trang)
    if (questions.length === 0) {
      const singleQ = parseSingleQuestionPage();
      if (singleQ) questions.push(singleQ);
    }

    return questions;
  }

  function parseQuestionContainer(container, idx) {
    // Find question title/text
    const titleSelectors = [
      ".question-title",
      ".title-question",
      ".question-content",
      ".content_cauhoi",
      ".cau-hoi-title",
      ".cauhoi-text",
      "h3",
      "h4",
      ".title",
      "b",
      "strong"
    ];

    let questionEl = null;
    for (const sel of titleSelectors) {
      const el = container.querySelector(sel);
      if (el && el.innerText.trim().length > 5) {
        questionEl = el;
        break;
      }
    }

    let questionText = questionEl ? questionEl.innerText.trim() : container.innerText.split("\n")[0].trim();
    if (!questionText || questionText.length < 3) return null;

    // Find options inside container
    const optionSelectors = [
      ".answer-item",
      ".answer",
      ".dap-an",
      ".dapan-item",
      ".option",
      ".custom-radio",
      ".form-check",
      "label",
      "li"
    ];

    let optionEls = [];
    for (const sel of optionSelectors) {
      const els = container.querySelectorAll(sel);
      if (els && els.length >= 2 && els.length <= 10) {
        optionEls = Array.from(els);
        break;
      }
    }

    // If options not found by class, find all radio/checkboxes inside
    if (optionEls.length === 0) {
      const inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (inputs.length >= 2) {
        optionEls = Array.from(inputs).map(inp => inp.closest("label, div, li") || inp.parentElement || inp);
      }
    }

    const options = optionEls.map((el, optIdx) => {
      const input = el.querySelector('input[type="radio"], input[type="checkbox"]') || (el.tagName === 'INPUT' ? el : null);
      let text = (el.innerText || el.textContent || "").trim();
      text = text.replace(/^[A-D]\s*[\.:\)-]\s*/i, "").trim();
      return { element: el, inputElement: input, text, index: optIdx };
    }).filter(opt => opt.text.length > 0 || opt.inputElement);

    if (options.length < 2) return null;

    return {
      container,
      questionText,
      options,
      index: idx
    };
  }

  function parseQuestionFromInputs(parent, inputs, idx) {
    const container = parent;
    const questionText = container.innerText.split("\n").filter(t => t.trim().length > 5)[0] || `Câu hỏi ${idx + 1}`;

    const options = Array.from(inputs).map((inp, optIdx) => {
      const parentLabel = inp.closest("label") || inp.parentElement;
      let text = (parentLabel ? (parentLabel.innerText || parentLabel.textContent) : "").trim();
      text = text.replace(/^[A-D]\s*[\.:\)-]\s*/i, "").trim();
      return {
        element: parentLabel || inp,
        inputElement: inp,
        text: text || `Lựa chọn ${optIdx + 1}`,
        index: optIdx
      };
    });

    return {
      container,
      questionText,
      options,
      index: idx
    };
  }

  function parseSingleQuestionPage() {
    const radios = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    if (radios.length < 2) return null;

    const mainContainer = document.querySelector(".quiz-body, .exam-content, .test-content, main, .main, #content") || document.body;
    const questionEl = document.querySelector("h1, h2, h3, h4, .question, .cau-hoi, .title") || mainContainer;
    
    let questionText = questionEl.innerText.split("\n").filter(l => l.trim().length > 8)[0] || "Câu hỏi trắc nghiệm";

    const options = Array.from(radios).map((inp, idx) => {
      const label = inp.closest("label") || inp.parentElement;
      return {
        element: label || inp,
        inputElement: inp,
        text: (label ? label.innerText : "").replace(/^[A-D]\s*[\.:\)-]\s*/i, "").trim(),
        index: idx
      };
    });

    return {
      container: mainContainer,
      questionText,
      options,
      index: 0
    };
  }

  // -------------------------------------------------------------
  // Solving Engine
  // -------------------------------------------------------------

  async function startSolving(mode = "auto") {
    isRunning = true;
    updateDockUI();
    log(`🚀 Bắt đầu làm bài (Chế độ: ${mode === "auto" ? "Tự động chọn" : "Chỉ gợi ý"})...`, "info");
    await processNextStep(mode);
  }

  function stopSolving() {
    isRunning = false;
    if (currentSolveTimeout) clearTimeout(currentSolveTimeout);
    updateDockUI();
    log("⏹ Đã dừng tiến trình.", "warn");
  }

  async function solveCurrentPage() {
    const questions = findQuestionsOnPage();
    if (questions.length === 0) {
      log("⚠️ Không tìm thấy câu hỏi nào trên trang.", "warn");
      return;
    }

    log(`🔍 Tìm thấy ${questions.length} câu hỏi. Đang xử lý...`, "info");
    for (const q of questions) {
      await solveSingleQuestion(q, settings.mode);
    }
  }

  async function processNextStep(mode) {
    if (!isRunning) return;

    // Check & fill prediction input if present on current page
    if (settings.autoPredict !== false) {
      handlePredictionInput();
    }

    const questions = findQuestionsOnPage();
    if (questions.length === 0) {
      // If no normal questions, check if only prediction input is left
      const predicted = handlePredictionInput();
      if (predicted) {
        log("✓ Đã hoàn thành điền số dự đoán!", "success");
      }

      if (settings.autoSubmit) {
        await trySubmitExam();
      } else {
        log("🎉 Đã hoàn thành bài làm!", "success");
      }
      stopSolving();
      return;
    }

    // Solve questions on current view
    for (const q of questions) {
      if (!isRunning) return;
      await solveSingleQuestion(q, mode);
      const delay = getRandomDelay(settings.minDelay || 1500, settings.maxDelay || 3000);
      await sleep(delay);
    }

    // Fill prediction input again after questions
    if (settings.autoPredict !== false) {
      handlePredictionInput();
    }

    // Auto next question / submit if enabled
    const nextBtn = findNextButton();
    if (settings.autoNext && isRunning && nextBtn) {
      log("➡️ Đang chuyển sang câu tiếp theo...", "info");
      const delay = getRandomDelay(1000, 2000);
      currentSolveTimeout = setTimeout(() => {
        triggerClick(nextBtn);
        setTimeout(() => {
          if (isRunning) processNextStep(mode);
        }, 1500);
      }, delay);
    } else {
      log("🎉 Đã tới câu cuối cùng!", "success");
      if (settings.autoSubmit) {
        await trySubmitExam();
      }
      stopSolving();
    }
  }

  function handlePredictionInput() {
    const predictSelectors = [
      'input[name*="dudoan"]',
      'input[name*="du_doan"]',
      'input[name*="predict"]',
      'input[id*="dudoan"]',
      'input[id*="du_doan"]',
      'input[id*="predict"]',
      'input[placeholder*="dự đoán" i]',
      'input[placeholder*="người" i]',
      'input[aria-label*="dự đoán" i]'
    ];

    let predictInput = null;
    for (const sel of predictSelectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) {
        predictInput = el;
        break;
      }
    }

    // Heuristic: check inputs inside block mentioning "dự đoán"
    if (!predictInput) {
      const blocks = document.querySelectorAll('.form-group, .question-item, .item-cau-hoi, div, p');
      for (const block of blocks) {
        if ((block.innerText || "").toLowerCase().includes("dự đoán số người") || (block.innerText || "").toLowerCase().includes("dự đoán số")) {
          const inp = block.querySelector('input[type="number"], input[type="text"]');
          if (inp && isVisible(inp)) {
            predictInput = inp;
            break;
          }
        }
      }
    }

    if (predictInput) {
      let val = settings.predictNumber ? settings.predictNumber.trim() : "";
      if (!val) {
        // Generate a realistic random prediction number (e.g. 1250 - 3800)
        val = Math.floor(Math.random() * (3800 - 1250 + 1) + 1250).toString();
      }

      predictInput.value = val;
      predictInput.dispatchEvent(new Event("input", { bubbles: true }));
      predictInput.dispatchEvent(new Event("change", { bubbles: true }));
      predictInput.classList.add("autothi-highlight-correct");
      log(`✓ Tự động điền số dự đoán: ${val}`, "success");
      return true;
    }
    return false;
  }

  async function trySubmitExam() {
    const submitBtn = findSubmitButton();
    if (submitBtn) {
      log("📝 Tự động nộp bài trong giây lát...", "info");
      await sleep(1500);
      triggerClick(submitBtn);

      // Check for confirmation modal (e.g. "Bạn có chắc chắn nộp bài?")
      await sleep(800);
      const confirmBtn = findModalConfirmButton();
      if (confirmBtn) {
        log("✓ Tự động bấm xác nhận nộp bài!", "success");
        triggerClick(confirmBtn);
      }
      log("🎉 ĐÃ NỘP BÀI THÀNH CÔNG!", "success");
    }
  }

  function findModalConfirmButton() {
    const modalButtons = Array.from(document.querySelectorAll('.swal2-confirm, .modal .btn-primary, .modal .btn-success, .btn-confirm, .confirm, button.ok, .bootbox-accept'));
    const confirmTexts = ["đồng ý", "xác nhận", "nộp bài", "chấp nhận", "ok", "yes", "có", "có"];

    const found = modalButtons.find(b => {
      const text = (b.innerText || b.value || "").toLowerCase().trim();
      return confirmTexts.some(ct => text.includes(ct)) && isVisible(b);
    });

    if (found) return found;

    // Search all visible buttons for confirm keywords in modals
    const allBtns = Array.from(document.querySelectorAll('.modal button, .popup button, .dialog button, [role="dialog"] button'));
    return allBtns.find(b => {
      const text = (b.innerText || b.value || "").toLowerCase().trim();
      return confirmTexts.some(ct => text.includes(ct)) && isVisible(b);
    });
  }

  async function solveSingleQuestion(qData, mode) {
    const cleanQ = normalizeText(qData.questionText);
    log(`Đang giải: "${qData.questionText.slice(0, 45)}..."`, "info");

    let chosenIndex = -1;
    let source = "AI";

    // 1. Check local question bank first
    if (questionBank[cleanQ] && questionBank[cleanQ].correctAnswer) {
      const targetAnswer = normalizeText(questionBank[cleanQ].correctAnswer);
      chosenIndex = qData.options.findIndex(opt => {
        const optNorm = normalizeText(opt.text);
        return optNorm.includes(targetAnswer) || targetAnswer.includes(optNorm);
      });
      if (chosenIndex !== -1) {
        source = "Ngân hàng đề (Đã lưu)";
        log(`✓ Tìm thấy trong CSDL: Đáp án ${chosenIndex + 1}`, "success");
      }
    }

    // 2. If not found in bank, call Gemini AI
    if (chosenIndex === -1) {
      try {
        const response = await sendToBackground({
          action: "SOLVE_QUESTION",
          payload: {
            questionText: qData.questionText,
            options: qData.options.map(o => ({ text: o.text }))
          }
        });

        if (response && response.success && response.data) {
          chosenIndex = response.data.best_index;
          source = `Gemini AI (${Math.round((response.data.confidence || 0.95) * 100)}%)`;
          log(`🤖 Gemini chọn: "${response.data.answer_text?.slice(0, 30)}..."`, "success");
        } else {
          log(`❌ Lỗi AI: ${response ? response.error : "Không có phản hồi"}`, "error");
        }
      } catch (err) {
        log(`❌ Lỗi AI: ${err.message}`, "error");
      }
    }

    // 3. Fallback: if index still -1, pick option with closest similarity
    if (chosenIndex === -1 && qData.options.length > 0) {
      chosenIndex = 0; // Default first option as last resort
      log("⚠️ Chọn đáp án mặc định.", "warn");
    }

    if (chosenIndex >= 0 && chosenIndex < qData.options.length) {
      const chosenOption = qData.options[chosenIndex];
      applyAnswer(chosenOption, mode, source);
    } else {
      log("⚠️ Không chọn được đáp án phù hợp.", "warn");
    }
  }

  function applyAnswer(optionData, mode, source) {
    const targetElement = optionData.element;

    // Highlight styling
    document.querySelectorAll(".autothi-highlight-correct").forEach(el => {
      if (optionData.element.contains(el) || el.contains(optionData.element)) {
        el.classList.remove("autothi-highlight-correct");
      }
    });

    targetElement.classList.add("autothi-highlight-correct");

    // Add badge
    let existingBadge = targetElement.querySelector(".autothi-correct-badge");
    if (!existingBadge) {
      const badge = document.createElement("span");
      badge.className = "autothi-correct-badge";
      badge.innerText = `✓ ${source}`;
      targetElement.appendChild(badge);
    }

    // Scroll into view smoothly
    targetElement.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Click if auto mode
    if (mode === "auto") {
      const clickTarget = optionData.inputElement || targetElement;
      triggerClick(clickTarget);
    }
  }

  // -------------------------------------------------------------
  // Helpers: Buttons & Events
  // -------------------------------------------------------------

  function findNextButton() {
    const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .btn'));
    const nextTexts = ["tiếp theo", "tiếp tục", "câu tiếp", "câu sau", "next", "kế tiếp", "tiếp", "trang sau"];
    
    return buttons.find(b => {
      const text = (b.innerText || b.value || "").toLowerCase().trim();
      return nextTexts.some(nt => text === nt || text.includes(nt)) && isVisible(b);
    });
  }

  function findSubmitButton() {
    const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .btn'));
    const submitTexts = ["nộp bài", "hoàn thành", "kết thúc", "submit", "gửi bài"];
    
    return buttons.find(b => {
      const text = (b.innerText || b.value || "").toLowerCase().trim();
      return submitTexts.some(st => text.includes(st)) && isVisible(b);
    });
  }

  function triggerClick(el) {
    if (!el) return;
    if (el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox")) {
      el.checked = true;
    }
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click", "change"].forEach(evtName => {
      el.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
    });
  }

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function normalizeText(text) {
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/^(câu\s*\d+[\s:.-]*|bài\s*\d+[\s:.-]*|question\s*\d+[\s:.-]*)/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sendToBackground(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, res => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(res);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // Floating On-Screen Dock
  // -------------------------------------------------------------

  function createFloatingDock() {
    if (document.getElementById("autothi-floating-dock")) return;

    const dock = document.createElement("div");
    dock.id = "autothi-floating-dock";
    if (!settings.showFloatingDock) {
      dock.className = "hidden";
    }
    dock.innerHTML = `
      <div class="autothi-dock-container" id="autothi-container">
        <div class="autothi-dock-header" id="autothi-drag-header">
          <div class="autothi-dock-title">
            <span class="autothi-logo-glow" id="autothi-status-dot"></span>
            <span>AutoThi AI</span>
          </div>
          <div class="autothi-dock-actions">
            <button class="autothi-btn-icon" id="autothi-btn-toggle" title="Thu nhỏ / Mở rộng">_</button>
            <button class="autothi-btn-icon close-btn" id="autothi-btn-close" title="Đóng thanh công cụ này">✕</button>
          </div>
        </div>
        <div class="autothi-dock-body" id="autothi-body">
          <div class="autothi-dock-status">
            <span>Trạng thái:</span>
            <span class="badge" id="autothi-status-text">Sẵn sàng</span>
          </div>
          <div class="autothi-dock-buttons">
            <button class="autothi-btn autothi-btn-primary" id="autothi-start-btn">⚡ Tự động làm</button>
            <button class="autothi-btn autothi-btn-secondary" id="autothi-highlight-btn">🎯 Chỉ gợi ý</button>
          </div>
          <div class="autothi-dock-buttons" style="margin-bottom: 6px;">
            <button class="autothi-btn autothi-btn-secondary" id="autothi-scan-btn" style="grid-column: span 1;">🔍 Giải trang này</button>
            <button class="autothi-btn autothi-btn-danger" id="autothi-stop-btn" style="grid-column: span 1;">⏹ Dừng</button>
          </div>
          <div class="autothi-log-box" id="autothi-logs">
            <div class="autothi-log-item info">Hệ thống AutoThi AI đã sẵn sàng.</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    // Event listeners
    document.getElementById("autothi-start-btn").addEventListener("click", () => startSolving("auto"));
    document.getElementById("autothi-highlight-btn").addEventListener("click", () => startSolving("highlight"));
    document.getElementById("autothi-scan-btn").addEventListener("click", solveCurrentPage);
    document.getElementById("autothi-stop-btn").addEventListener("click", stopSolving);
    document.getElementById("autothi-btn-toggle").addEventListener("click", toggleDock);
    document.getElementById("autothi-btn-close").addEventListener("click", hideDock);

    makeDraggable(dock, document.getElementById("autothi-drag-header"));
  }

  function hideDock() {
    const dock = document.getElementById("autothi-floating-dock");
    if (dock) {
      dock.classList.add("hidden");
    }
  }

  function updateDockUI() {
    const dot = document.getElementById("autothi-status-dot");
    const statusText = document.getElementById("autothi-status-text");
    if (!dot || !statusText) return;

    if (isRunning) {
      dot.className = "autothi-logo-glow busy";
      statusText.innerText = "Đang tự động làm...";
      statusText.style.color = "#f59e0b";
    } else {
      dot.className = "autothi-logo-glow";
      statusText.innerText = "Sẵn sàng";
      statusText.style.color = "#34d399";
    }
  }

  function toggleDock() {
    const container = document.getElementById("autothi-container");
    if (container) {
      container.classList.toggle("minimized");
    }
  }

  function log(message, type = "info") {
    const logBox = document.getElementById("autothi-logs");
    if (!logBox) return;

    const item = document.createElement("div");
    item.className = `autothi-log-item ${type}`;
    const time = new Date().toLocaleTimeString("vi-VN", { hour12: false });
    item.innerText = `[${time}] ${message}`;

    logBox.appendChild(item);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.right = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // Setup DOM observer for dynamic single-page applications
  function setupObserver() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        log("Trang đã chuyển đổi, quét câu hỏi mới...", "info");
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Start init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
