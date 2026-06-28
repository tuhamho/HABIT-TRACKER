const state = {
  db: null,
  today: getLocalDateKey(new Date()),
  monthDate: new Date(),
  selectedEventDate: null,
  habitModalMode: "add",
  editingHabitId: null,
  activeScreen: "dashboard",
  categoryDonutChart: null,
  disciplineTrendChart: null,
  focusTimeChart: null,
  aiEvidence: null,
  aiEvidenceFile: null,
  focusElapsedMs: 0,
  focusStartedAt: null,
  focusInterval: null,
  audioContext: null
};

let conversationHistory = [];
let categories = ["Tinh thần", "Sức khỏe", "Trí tuệ", "Tài chính", "Kỷ luật", "Mối quan hệ"];

const elements = {
  settingsButton: document.getElementById("settingsButton"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  exportDataButton: document.getElementById("exportDataButton"),
  importDataButton: document.getElementById("importDataButton"),
  manageCategoriesButton: document.getElementById("manageCategoriesButton"),
  dashboardNavButton: document.getElementById("dashboardNavButton"),
  analyticsNavButton: document.getElementById("analyticsNavButton"),
  aiCoachNavButton: document.getElementById("nav-aicoach"),
  dashboardScreen: document.getElementById("dashboardScreen"),
  analyticsScreen: document.getElementById("analyticsScreen"),
  aiCoachView: document.getElementById("aicoach-view"),
  geminiApiKeyInput: document.getElementById("gemini-api-key"),
  saveAiConfigButton: document.getElementById("btn-save-ai-config"),
  aiEvidenceInput: document.getElementById("ai-evidence-input"),
  aiUploadDropzone: document.getElementById("ai-upload-dropzone"),
  imagePreviewContainer: document.getElementById("image-preview-container"),
  generateAiButton: document.getElementById("btn-generate-ai"),
  aiChatForm: document.getElementById("ai-chat-form"),
  aiChatInput: document.getElementById("ai-chat-input"),
  sendChatButton: document.getElementById("btn-send-chat"),
  aiCoachAlert: document.getElementById("ai-coach-alert"),
  chatHistoryContainer: document.getElementById("chat-history-container"),
  categoryDonutChart: document.getElementById("categoryDonutChart"),
  disciplineTrendChart: document.getElementById("disciplineTrendChart"),
  focusTimeChart: document.getElementById("focusTimeChart"),
  focusTodaySummary: document.getElementById("focusTodaySummary"),
  focusWeekSummary: document.getElementById("focusWeekSummary"),
  focusMonthSummary: document.getElementById("focusMonthSummary"),
  realtimeClock: document.getElementById("realtime-clock"),
  todayLabel: document.getElementById("todayLabel"),
  milestoneTitle: document.getElementById("milestoneTitle"),
  editGoalButton: document.getElementById("editGoalButton"),
  goalTitleInput: document.getElementById("goalTitleInput"),
  milestoneFill: document.getElementById("milestoneFill"),
  milestoneXp: document.getElementById("milestoneXp"),
  milestonePercent: document.getElementById("milestonePercent"),
  levelLabel: document.getElementById("levelLabel"),
  rankLabel: document.getElementById("rankLabel"),
  levelFill: document.getElementById("levelFill"),
  levelXp: document.getElementById("levelXp"),
  totalXp: document.getElementById("totalXp"),
  focusTimerDisplay: document.getElementById("focusTimerDisplay"),
  focusToggleButton: document.getElementById("focusToggleButton"),
  focusSaveButton: document.getElementById("focusSaveButton"),
  monthLabel: document.getElementById("monthLabel"),
  prevMonthButton: document.getElementById("prevMonthButton"),
  nextMonthButton: document.getElementById("nextMonthButton"),
  monthCompletion: document.getElementById("monthCompletion"),
  bestStreak: document.getElementById("bestStreak"),
  tableWrap: document.getElementById("tableWrap"),
  gridHead: document.getElementById("gridHead"),
  gridBody: document.getElementById("gridBody"),
  addHabitButton: document.getElementById("addHabitButton"),
  habitModal: document.getElementById("habitModal"),
  habitModalTitle: document.getElementById("habitModalTitle"),
  closeHabitModalButton: document.getElementById("closeHabitModalButton"),
  cancelHabitButton: document.getElementById("cancelHabitButton"),
  confirmHabitButton: document.getElementById("confirmHabitButton"),
  habitNameInput: document.getElementById("habitNameInput"),
  habitCategoryInput: document.getElementById("habitCategoryInput"),
  categoriesModal: document.getElementById("categoriesModal"),
  closeCategoriesButton: document.getElementById("closeCategoriesButton"),
  cancelCategoriesButton: document.getElementById("cancelCategoriesButton"),
  saveCategoriesButton: document.getElementById("saveCategoriesButton"),
  categoriesEditorList: document.getElementById("categoriesEditorList"),
  eventModal: document.getElementById("eventModal"),
  closeEventModalButton: document.getElementById("closeEventModalButton"),
  cancelEventButton: document.getElementById("cancelEventButton"),
  saveEventButton: document.getElementById("saveEventButton"),
  clearEventButton: document.getElementById("clearEventButton"),
  eventDateLabel: document.getElementById("eventDateLabel"),
  eventTextInput: document.getElementById("eventTextInput"),
  noteDateLabel: document.getElementById("noteDateLabel"),
  noteInput: document.getElementById("noteInput"),
  saveNoteButton: document.getElementById("saveNoteButton"),
  noteStatus: document.getElementById("noteStatus"),
  toastRoot: document.getElementById("toastRoot")
};

document.addEventListener("DOMContentLoaded", startApp);

async function startApp() {
  bindEvents();
  hydrateAiCoachSettings();
  startRealtimeClock();

  try {
    state.db = await window.habitApi.invoke("db:get");
    categories = getCategories();
    renderCategorySelect();
    renderAll();
    showToast("Dashboard đã sẵn sàng", "Dữ liệu thói quen offline đã được tải.");
  } catch (error) {
    showToast("Lỗi khởi động", error.message || "Không thể tải dữ liệu local.");
  }
}

function startRealtimeClock() {
  updateRealtimeClock();
  window.setInterval(updateRealtimeClock, 1000);
}

function updateRealtimeClock() {
  if (!elements.realtimeClock) {
    return;
  }

  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  elements.realtimeClock.textContent = time;
}

function switchScreen(screen) {
  state.activeScreen = screen;

  const showDashboard = screen === "dashboard";
  const showAnalytics = screen === "analytics";
  const showAiCoach = screen === "aicoach";

  elements.dashboardScreen.hidden = !showDashboard;
  elements.analyticsScreen.hidden = !showAnalytics;
  elements.aiCoachView.style.display = showAiCoach ? "grid" : "none";
  elements.dashboardNavButton.classList.toggle("active", showDashboard);
  elements.analyticsNavButton.classList.toggle("active", showAnalytics);
  elements.aiCoachNavButton.classList.toggle("active", showAiCoach);

  if (showAnalytics) {
    window.requestAnimationFrame(renderAnalyticsCharts);
  }

  if (showAiCoach) {
    hydrateAiCoachSettings();
  }
}

function openSettingsModal() {
  elements.settingsModal.hidden = false;
}

function closeSettingsModal() {
  elements.settingsModal.hidden = true;
}

function getCategories() {
  const saved = state.db && state.db.settings && Array.isArray(state.db.settings.categories)
    ? state.db.settings.categories
    : categories;
  const clean = [];

  saved.forEach((item) => {
    const category = String(item || "").trim();
    if (category && !clean.includes(category)) {
      clean.push(category);
    }
  });

  if (state.db && Array.isArray(state.db.habits)) {
    state.db.habits.forEach((habit) => {
      const category = String((habit && habit.category) || "").trim();
      if (category && !clean.includes(category)) {
        clean.push(category);
      }
    });
  }

  return clean.length > 0 ? clean : ["Tinh thần", "Sức khỏe", "Trí tuệ", "Tài chính", "Kỷ luật", "Mối quan hệ"];
}

function renderCategorySelect(selectedCategory) {
  categories = getCategories();
  elements.habitCategoryInput.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.habitCategoryInput.appendChild(option);
  });

  if (selectedCategory && categories.includes(selectedCategory)) {
    elements.habitCategoryInput.value = selectedCategory;
  }
}

function openCategoriesModal() {
  categories = getCategories();
  renderCategoriesEditor();
  closeSettingsModal();
  elements.categoriesModal.hidden = false;
}

function closeCategoriesModal() {
  elements.categoriesModal.hidden = true;
}

function renderCategoriesEditor() {
  elements.categoriesEditorList.innerHTML = "";

  categories.forEach((category, index) => {
    const row = document.createElement("label");
    row.className = "category-editor-row";
    row.innerHTML = `
      <span>Category ${index + 1}</span>
      <input class="text-input category-editor-input" type="text" maxlength="40" value="${escapeHtml(category)}" data-original-category="${escapeHtml(category)}" />
    `;
    elements.categoriesEditorList.appendChild(row);
  });
}

async function saveCategories() {
  const inputs = Array.from(elements.categoriesEditorList.querySelectorAll("[data-original-category]"));
  const nextCategories = [];
  const renames = [];

  inputs.forEach((input) => {
    const oldName = input.getAttribute("data-original-category");
    const newName = input.value.trim();

    if (!newName) {
      return;
    }

    if (!nextCategories.includes(newName)) {
      nextCategories.push(newName);
    }

    if (oldName !== newName) {
      renames.push({ oldName, newName });
    }
  });

  if (nextCategories.length === 0) {
    showToast("Thiếu category", "Cần ít nhất một category.");
    return;
  }

  if (nextCategories.length !== inputs.filter((input) => input.value.trim()).length) {
    showToast("Trùng category", "Mỗi category cần có tên riêng.");
    return;
  }

  elements.saveCategoriesButton.disabled = true;

  try {
    state.db = await window.habitApi.invoke("categories:update", {
      categories: nextCategories,
      renames
    });
    categories = getCategories();
    renderCategorySelect();
    closeCategoriesModal();
    renderAll();
    showToast("Đã cập nhật category", "Dropdown, habits và biểu đồ Analytics đã được đồng bộ.");
  } catch (error) {
    showToast("Lỗi lưu category", error.message || "Không thể cập nhật category.");
  } finally {
    elements.saveCategoriesButton.disabled = false;
  }
}

async function exportDatabase() {
  try {
    const result = await window.habitApi.invoke("db:export");

    if (!result.canceled) {
      showToast("Đã export dữ liệu", "File JSON backup đã được lưu.");
    }
  } catch (error) {
    showToast("Export thất bại", error.message || "Không thể export dữ liệu.");
  }
}

async function importDatabase() {
  const confirmed = window.confirm("Import sẽ ghi đè toàn bộ database hiện tại. Bạn chắc chứ?");

  if (!confirmed) {
    return;
  }

  try {
    const result = await window.habitApi.invoke("db:import");

    if (!result.canceled) {
      state.db = result.db;
      closeSettingsModal();
      renderAll();
      showToast("Đã import dữ liệu", "Dashboard đã được tải lại từ file backup.");
    }
  } catch (error) {
    showToast("Import thất bại", error.message || "File backup không hợp lệ.");
  }
}

function hydrateAiCoachSettings() {
  const storedKey = window.localStorage.getItem("habitDashboard.geminiApiKey") || "";

  if (elements.geminiApiKeyInput && elements.geminiApiKeyInput.value !== storedKey) {
    elements.geminiApiKeyInput.value = storedKey;
  }
}

function saveAiCoachConfig() {
  const key = elements.geminiApiKeyInput.value.trim();

  if (!key) {
    window.localStorage.removeItem("habitDashboard.geminiApiKey");
    setAiCoachAlert("API key đã được xóa khỏi cấu hình cục bộ.");
    showToast("AI Coach", "Đã xóa Gemini API key khỏi máy này.");
    return;
  }

  window.localStorage.setItem("habitDashboard.geminiApiKey", key);
  setAiCoachAlert("");
  showToast("AI Coach", "Đã lưu Gemini API key cục bộ.");
}

function handleAiEvidenceFile(event) {
  const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;

  if (file) {
    processAiEvidenceFile(file);
  }

  event.target.value = "";
}

function processAiEvidenceFile(file) {
  if (!file.type || !file.type.startsWith("image/")) {
    setAiCoachAlert("File không hợp lệ. Hãy chọn ảnh PNG, JPG hoặc WEBP.");
    return;
  }

  state.aiEvidenceFile = file;

  const reader = new FileReader();

  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    const commaIndex = dataUrl.indexOf(",");

    if (commaIndex < 0) {
      setAiCoachAlert("Không thể đọc dữ liệu ảnh. Hãy thử chọn ảnh khác.");
      return;
    }

    state.aiEvidence = {
      base64: dataUrl.slice(commaIndex + 1),
      dataUrl,
      mimeType: file.type,
      name: file.name
    };

    renderAiImagePreview();
    setAiCoachAlert("");
  };

  reader.onerror = () => {
    setAiCoachAlert("Không thể đọc ảnh đã chọn.");
  };

  reader.readAsDataURL(file);
}

function renderAiImagePreview() {
  if (!state.aiEvidence) {
    elements.imagePreviewContainer.innerHTML = "";
    return;
  }

  elements.imagePreviewContainer.innerHTML = `
    <div class="image-preview">
      <button id="remove-ai-image" class="remove-image-button" type="button" aria-label="Xóa ảnh">x</button>
      <img src="${escapeHtml(state.aiEvidence.dataUrl)}" alt="AI evidence preview" />
      <div class="image-preview-meta">
        <span>${escapeHtml(state.aiEvidence.name)}</span>
        <span>${escapeHtml(state.aiEvidence.mimeType)}</span>
      </div>
    </div>
  `;

  document.getElementById("remove-ai-image").addEventListener("click", clearAiEvidence);
}

function clearAiEvidence() {
  state.aiEvidence = null;
  state.aiEvidenceFile = null;
  elements.imagePreviewContainer.innerHTML = "";
}

function readImageFileAsInlineData(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const commaIndex = dataUrl.indexOf(",");

      if (commaIndex < 0) {
        reject(new Error("Invalid image data URL."));
        return;
      }

      resolve({
        inlineData: {
          data: dataUrl.slice(commaIndex + 1),
          mimeType: file.type
        }
      });
    };

    reader.onerror = () => {
      reject(new Error("Could not read selected image file."));
    };

    reader.readAsDataURL(file);
  });
}

async function prepareCurrentEvidenceImage() {
  if (state.aiEvidenceFile) {
    return readImageFileAsInlineData(state.aiEvidenceFile);
  }

  if (state.aiEvidence && state.aiEvidence.base64 && state.aiEvidence.mimeType) {
    return {
      inlineData: {
        data: state.aiEvidence.base64,
        mimeType: state.aiEvidence.mimeType
      }
    };
  }

  return null;
}

async function getLastSevenDaysAiContext() {
  if (!state.db) {
    return [];
  }

  const today = parseDateKey(state.today);
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - offset);
    const date = getLocalDateKey(cursor);

    days.push({
      date,
      weekday: cursor.toLocaleDateString("vi-VN", { weekday: "long" }),
      focusMinutes: Math.round(getFocusSeconds(date) / 60),
      habits: state.db.habits.map((habit) => ({
        name: habit.name,
        category: getHabitCategory(habit),
        completed: isHabitCompleted(habit.id, date)
      }))
    });
  }

  return days;
}

async function buildAiCoachPrompt() {
  const weeklyData = await getLastSevenDaysAiContext();
  const completedCount = weeklyData.reduce((total, day) => {
    return total + day.habits.filter((habit) => habit.completed).length;
  }, 0);
  const totalPossible = weeklyData.reduce((total, day) => total + day.habits.length, 0);
  const focusMinutes = weeklyData.reduce((total, day) => total + day.focusMinutes, 0);
  const completionRate = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

  return [
    "System Prompt Context:",
    "You are a world-class, strict but highly motivating discipline and software engineering coach. Analyze the user's weekly habit performance and focus metrics. If an image is provided, it is their direct workspace/study evidence for today - analyze it to give contextual feedback. Keep your analysis to exactly 3 impact sentences, followed by 1 highly actionable advice for the upcoming days. Reply in Vietnamese.",
    "",
    "Here is my habit data for the last 7 days:",
    JSON.stringify(
      {
        summary: {
          completedHabitCheckins: completedCount,
          totalPossibleHabitCheckins: totalPossible,
          completionRatePercent: completionRate,
          totalFocusMinutes: focusMinutes
        },
        days: weeklyData
      },
      null,
      2
    ),
    "",
    "Act as a strict but encouraging discipline coach. Give me a short, 3-sentence analysis and 1 actionable advice."
  ].join("\n");
}

async function generateAiCoachReport() {
  const storedKey = getGeminiApiKey();

  if (!storedKey) {
    setAiCoachAlert("Hãy nhập và lưu Gemini API Key trước khi tạo báo cáo.");
    elements.geminiApiKeyInput.focus();
    return;
  }

  window.localStorage.setItem("habitDashboard.geminiApiKey", storedKey);
  setAiCoachAlert("");
  clearChatHistory();

  let loadingBubble = null;

  try {
    const prompt = await buildAiCoachPrompt();
    const parts = [{ text: prompt }];

    if (state.aiEvidence) {
      parts.push({
        inlineData: {
          data: state.aiEvidence.base64,
          mimeType: state.aiEvidence.mimeType
        }
      });
    }

    conversationHistory = [{ role: "user", parts }];
    appendChatBubble("user", state.aiEvidence ? "Tạo Weekly AI Report từ dữ liệu 7 ngày gần nhất kèm ảnh workspace." : "Tạo Weekly AI Report từ dữ liệu 7 ngày gần nhất.");
    loadingBubble = appendChatLoadingBubble("AI Coach đang phân tích dữ liệu 7 ngày gần nhất...");
    setAiCoachLoading(true);

    const payload = await callGeminiConversation(storedKey);
    const text = extractGeminiText(payload);
    const finalText = text || "Gemini không trả về nội dung. Hãy thử lại sau.";
    removeChatBubble(loadingBubble);
    conversationHistory.push({ role: "model", parts: [{ text: finalText }] });
    appendChatBubble("model", finalText);
  } catch (error) {
    console.error("Gemini weekly report failed:", error);
    removeChatBubble(loadingBubble);
    setAiCoachAlert(error.message || "Không thể tạo báo cáo AI Coach.");
    appendChatBubble("model", "Không thể tạo báo cáo lúc này. Kiểm tra API key, kết nối mạng hoặc quota Gemini rồi thử lại.");
  } finally {
    setAiCoachLoading(false);
  }
}

async function sendAiChatMessage(event) {
  event.preventDefault();

  const storedKey = getGeminiApiKey();
  const message = elements.aiChatInput.value.trim();

  if (!storedKey) {
    setAiCoachAlert("Hãy nhập và lưu Gemini API Key trước khi chat với AI Coach.");
    elements.geminiApiKeyInput.focus();
    return;
  }

  if (!message) {
    return;
  }

  if (conversationHistory.length === 0) {
    const prompt = await buildAiCoachPrompt();
    conversationHistory.push({ role: "user", parts: [{ text: prompt }] });
  }

  elements.aiChatInput.value = "";
  setAiCoachAlert("");
  appendChatBubble("user", message);

  const userMessageParts = [{ text: message }];
  const evidenceImagePart = await prepareCurrentEvidenceImage();

  if (evidenceImagePart) {
    userMessageParts.push(evidenceImagePart);
  }

  conversationHistory.push({ role: "user", parts: userMessageParts });

  const loadingBubble = appendChatLoadingBubble("AI Coach đang trả lời...");
  setAiCoachLoading(true);

  try {
    const payload = await callGeminiConversation(storedKey);
    const text = extractGeminiText(payload);
    const finalText = text || "Gemini không trả về nội dung. Hãy thử lại sau.";

    removeChatBubble(loadingBubble);
    conversationHistory.push({ role: "model", parts: [{ text: finalText }] });
    appendChatBubble("model", finalText);

    if (evidenceImagePart) {
      clearAiEvidence();
    }
  } catch (error) {
    console.error("Gemini chat message failed:", error);
    removeChatBubble(loadingBubble);
    setAiCoachAlert(error.message || "Không thể gửi tin nhắn tới AI Coach.");
    appendChatBubble("model", "Mình chưa thể trả lời lúc này. Kiểm tra API key, mạng hoặc quota Gemini rồi thử lại.");
  } finally {
    setAiCoachLoading(false);
  }
}

function getGeminiApiKey() {
  return (
    window.localStorage.getItem("habitDashboard.geminiApiKey") ||
    elements.geminiApiKeyInput.value ||
    ""
  ).trim();
}

async function callGeminiConversation(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: conversationHistory,
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const apiMessage = data?.error?.message || "Gemini API request failed.";
      throw new Error(apiMessage);
    }

    return data;
  } catch (error) {
    console.error("Gemini fetch/parsing error:", error);
    setAiCoachAlert("Không thể kết nối hoặc đọc phản hồi từ Gemini. Hãy kiểm tra API key, mạng hoặc quota.");
    throw error;
  }
}

function extractGeminiText(data) {
  const primaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof primaryText === "string" && primaryText.trim()) {
    return primaryText.trim();
  }

  const allParts = data?.candidates?.[0]?.content?.parts || [];
  return allParts
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function setAiCoachLoading(isLoading) {
  elements.generateAiButton.disabled = isLoading;
  elements.sendChatButton.disabled = isLoading;
  elements.aiChatInput.disabled = isLoading;
  elements.generateAiButton.textContent = isLoading ? "Generating..." : "Generate Weekly AI Report";
}

function clearChatHistory() {
  elements.chatHistoryContainer.innerHTML = "";
}

function appendChatBubble(role, text) {
  if (elements.chatHistoryContainer.querySelector(".ai-empty-state")) {
    clearChatHistory();
  }

  const row = document.createElement("div");
  row.className = `chat-message-row ${role === "model" ? "model" : "user"}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  renderSafeTextIntoBubble(bubble, text);

  row.appendChild(bubble);
  elements.chatHistoryContainer.appendChild(row);
  scrollChatToBottom();

  return row;
}

function appendChatLoadingBubble(message) {
  const row = document.createElement("div");
  row.className = "chat-message-row model";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble loading";

  const spinner = document.createElement("span");
  spinner.className = "ai-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = message;

  bubble.appendChild(spinner);
  bubble.appendChild(label);
  row.appendChild(bubble);
  elements.chatHistoryContainer.appendChild(row);
  scrollChatToBottom();
  return row;
}

function removeChatBubble(node) {
  if (node && node.parentElement) {
    node.remove();
  }
}

function scrollChatToBottom() {
  window.requestAnimationFrame(() => {
    elements.chatHistoryContainer.scrollTop = elements.chatHistoryContainer.scrollHeight;
  });
}

function renderSafeTextIntoBubble(bubble, text) {
  bubble.replaceChildren();

  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    const paragraph = document.createElement("p");
    paragraph.textContent = "";
    bubble.appendChild(paragraph);
    return;
  }

  paragraphs.forEach((paragraphText) => {
    const paragraph = document.createElement("p");
    const lines = paragraphText.split("\n");

    lines.forEach((line, index) => {
      if (index > 0) {
        paragraph.appendChild(document.createElement("br"));
      }

      paragraph.appendChild(document.createTextNode(line));
    });

    bubble.appendChild(paragraph);
  });
}

function setAiCoachAlert(message) {
  if (!message) {
    elements.aiCoachAlert.hidden = true;
    elements.aiCoachAlert.textContent = "";
    return;
  }

  elements.aiCoachAlert.hidden = false;
  elements.aiCoachAlert.textContent = message;
}

function bindEvents() {
  elements.settingsButton.addEventListener("click", openSettingsModal);
  elements.closeSettingsButton.addEventListener("click", closeSettingsModal);
  elements.exportDataButton.addEventListener("click", exportDatabase);
  elements.importDataButton.addEventListener("click", importDatabase);
  elements.manageCategoriesButton.addEventListener("click", openCategoriesModal);
  elements.settingsModal.addEventListener("click", (event) => {
    if (event.target === elements.settingsModal) {
      closeSettingsModal();
    }
  });
  elements.focusToggleButton.addEventListener("click", toggleFocusTimer);
  elements.focusSaveButton.addEventListener("click", saveAndResetFocusTimer);
  elements.dashboardNavButton.addEventListener("click", () => switchScreen("dashboard"));
  elements.analyticsNavButton.addEventListener("click", () => switchScreen("analytics"));
  elements.aiCoachNavButton.addEventListener("click", () => switchScreen("aicoach"));
  elements.saveAiConfigButton.addEventListener("click", saveAiCoachConfig);
  elements.aiEvidenceInput.addEventListener("change", handleAiEvidenceFile);
  elements.generateAiButton.addEventListener("click", generateAiCoachReport);
  elements.aiChatForm.addEventListener("submit", sendAiChatMessage);

  elements.aiUploadDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.aiUploadDropzone.classList.add("drag-over");
  });

  elements.aiUploadDropzone.addEventListener("dragleave", () => {
    elements.aiUploadDropzone.classList.remove("drag-over");
  });

  elements.aiUploadDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.aiUploadDropzone.classList.remove("drag-over");

    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) {
      processAiEvidenceFile(file);
    }
  });

  elements.gridBody.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-habit-id]");

    if (editButton) {
      openEditHabitModal(editButton.getAttribute("data-edit-habit-id"));
      return;
    }

    const deleteButton = event.target.closest("[data-delete-habit-id]");

    if (deleteButton) {
      await deleteHabit(deleteButton.getAttribute("data-delete-habit-id"));
      return;
    }

    const button = event.target.closest("[data-habit-id][data-date]");

    if (!button || button.disabled) {
      return;
    }

    await toggleCompletion(button.getAttribute("data-habit-id"), button.getAttribute("data-date"), button);
  });

  elements.gridHead.addEventListener("click", async (event) => {
    const dateButton = event.target.closest("[data-event-date]");

    if (!dateButton) {
      return;
    }

    openEventModal(dateButton.getAttribute("data-event-date"));
  });

  elements.prevMonthButton.addEventListener("click", () => changeMonth(-1));
  elements.nextMonthButton.addEventListener("click", () => changeMonth(1));
  elements.addHabitButton.addEventListener("click", openHabitModal);
  elements.closeHabitModalButton.addEventListener("click", closeHabitModal);
  elements.cancelHabitButton.addEventListener("click", closeHabitModal);
  elements.confirmHabitButton.addEventListener("click", saveHabitFromModal);

  elements.habitModal.addEventListener("click", (event) => {
    if (event.target === elements.habitModal) {
      closeHabitModal();
    }
  });

  elements.habitNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveHabitFromModal();
    }
  });

  elements.closeCategoriesButton.addEventListener("click", closeCategoriesModal);
  elements.cancelCategoriesButton.addEventListener("click", closeCategoriesModal);
  elements.saveCategoriesButton.addEventListener("click", saveCategories);

  elements.categoriesModal.addEventListener("click", (event) => {
    if (event.target === elements.categoriesModal) {
      closeCategoriesModal();
    }
  });

  elements.closeEventModalButton.addEventListener("click", closeEventModal);
  elements.cancelEventButton.addEventListener("click", closeEventModal);
  elements.saveEventButton.addEventListener("click", saveEventFromModal);
  elements.clearEventButton.addEventListener("click", clearEventFromModal);

  elements.eventModal.addEventListener("click", (event) => {
    if (event.target === elements.eventModal) {
      closeEventModal();
    }
  });

  elements.eventTextInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      saveEventFromModal();
    }
  });

  elements.editGoalButton.addEventListener("click", startGoalTitleEdit);
  elements.goalTitleInput.addEventListener("blur", finishGoalTitleEdit);
  elements.goalTitleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      elements.goalTitleInput.blur();
    }

    if (event.key === "Escape") {
      cancelGoalTitleEdit();
    }
  });

  elements.noteInput.addEventListener("input", () => {
    elements.noteStatus.textContent = "Có thay đổi chưa lưu";
  });

  elements.saveNoteButton.addEventListener("click", saveTodayNote);
}

async function toggleCompletion(habitId, date, button) {
  const previousLevel = calculateLevel(getTotalXp()).level;
  button.disabled = true;

  try {
    const result = await window.habitApi.invoke("completion:toggle", { habitId, date });
    state.db = result.db;
    renderAll();

    const nextLevel = calculateLevel(getTotalXp()).level;
    const habit = state.db.habits.find((item) => item.id === habitId);
    const habitName = habit ? habit.name : "Thói quen";

    if (result.changed.completed) {
      playPopSound();
      showToast("Đã ghi nhận hoàn thành", `${habitName} nhận ${getXpPerCompletion()} XP.`);
    } else {
      showToast("Đã bỏ hoàn thành", `${habitName} đã được mở lại.`);
    }

    if (nextLevel > previousLevel) {
      const levelInfo = calculateLevel(getTotalXp());
      triggerLevelUpConfetti();
      showToast("Lên cấp", `Bạn đạt Cấp ${levelInfo.level}: ${levelInfo.rank}.`);
    }
  } catch (error) {
    renderAll();
    showToast("Lỗi lưu", error.message || "Không thể cập nhật dữ liệu local.");
  }
}

function playPopSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    if (!state.audioContext) {
      state.audioContext = new AudioContext();
    }

    const context = state.audioContext;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(740, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.085);
  } catch {
    // Audio is intentionally non-critical.
  }
}

function triggerLevelUpConfetti() {
  if (typeof window.confetti !== "function") {
    return;
  }

  window.confetti({
    particleCount: 120,
    spread: 70,
    startVelocity: 42,
    origin: { y: 0.62 },
    colors: ["#34d399", "#818cf8", "#f59e0b", "#38bdf8", "#f4f4f5"]
  });
}

function openEventModal(date) {
  state.selectedEventDate = date;
  elements.eventDateLabel.textContent = formatDisplayDate(date);
  elements.eventTextInput.value = getEventText(date);
  elements.eventModal.hidden = false;
  window.setTimeout(() => {
    elements.eventTextInput.focus();
    elements.eventTextInput.select();
  }, 0);
}

function closeEventModal() {
  elements.eventModal.hidden = true;
  state.selectedEventDate = null;
}

async function saveEventFromModal() {
  if (!state.selectedEventDate) {
    return;
  }

  await saveDateEvent(state.selectedEventDate, elements.eventTextInput.value);
}

async function clearEventFromModal() {
  if (!state.selectedEventDate) {
    return;
  }

  await saveDateEvent(state.selectedEventDate, "");
}

async function saveDateEvent(date, text) {
  const label = formatDisplayDate(date);
  elements.saveEventButton.disabled = true;
  elements.clearEventButton.disabled = true;

  try {
    state.db = await window.habitApi.invoke("event:save", {
      date,
      text
    });
    closeEventModal();
    renderAll();

    if (text.trim()) {
      showToast("Đã lưu deadline", `Đã thêm nhắc việc cho ${label}.`);
    } else {
      showToast("Đã xóa deadline", `Đã bỏ nhắc việc cho ${label}.`);
    }
  } catch (error) {
    showToast("Lỗi lưu deadline", error.message || "Không thể lưu nhắc việc.");
  } finally {
    elements.saveEventButton.disabled = false;
    elements.clearEventButton.disabled = false;
  }
}

function changeMonth(delta) {
  state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + delta, 1);
  renderAll();
}

function openHabitModal() {
  state.habitModalMode = "add";
  state.editingHabitId = null;
  renderCategorySelect();
  elements.habitModal.hidden = false;
  elements.habitModalTitle.textContent = "Thêm thói quen";
  elements.confirmHabitButton.textContent = "Thêm";
  elements.habitNameInput.value = "";
  elements.habitCategoryInput.value = categories.includes("Sức khỏe") ? "Sức khỏe" : categories[0];
  window.setTimeout(() => elements.habitNameInput.focus(), 0);
}

function openEditHabitModal(habitId) {
  const habit = state.db.habits.find((item) => item.id === habitId);

  if (!habit) {
    return;
  }

  state.habitModalMode = "edit";
  state.editingHabitId = habitId;
  renderCategorySelect();
  elements.habitModal.hidden = false;
  elements.habitModalTitle.textContent = "Sửa thói quen";
  elements.confirmHabitButton.textContent = "Lưu thay đổi";
  elements.habitNameInput.value = habit.name;
  elements.habitCategoryInput.value = getHabitCategory(habit);
  window.setTimeout(() => {
    elements.habitNameInput.focus();
    elements.habitNameInput.select();
  }, 0);
}

function closeHabitModal() {
  elements.habitModal.hidden = true;
  state.habitModalMode = "add";
  state.editingHabitId = null;
}

async function saveHabitFromModal() {
  const name = elements.habitNameInput.value.trim();
  const category = elements.habitCategoryInput.value;

  if (!name) {
    showToast("Thiếu tên thói quen", "Hãy nhập tên trước khi thêm.");
    elements.habitNameInput.focus();
    return;
  }

  elements.confirmHabitButton.disabled = true;

  try {
    const wasEditing = state.habitModalMode === "edit" && state.editingHabitId;

    if (wasEditing) {
      state.db = await window.habitApi.invoke("habit:update", {
        habitId: state.editingHabitId,
        name,
        category
      });
    } else {
      state.db = await window.habitApi.invoke("habit:add", { name, category, priority: "medium" });
    }

    closeHabitModal();
    renderAll();
    showToast(
      wasEditing ? "Đã cập nhật thói quen" : "Đã thêm thói quen",
      wasEditing ? `${name} đã được lưu.` : `${name} đã được đưa vào bảng theo dõi.`
    );
  } catch (error) {
    showToast("Lỗi lưu thói quen", error.message || "Không thể lưu thói quen.");
  } finally {
    elements.confirmHabitButton.disabled = false;
  }
}

async function deleteHabit(habitId) {
  const habit = state.db.habits.find((item) => item.id === habitId);

  if (!habit) {
    return;
  }

  const confirmed = window.confirm(`Xóa thói quen "${habit.name}" và toàn bộ dữ liệu tick của nó?`);

  if (!confirmed) {
    return;
  }

  try {
    state.db = await window.habitApi.invoke("habit:delete", { habitId });
    renderAll();
    showToast("Đã xóa thói quen", `${habit.name} đã được xóa khỏi dashboard.`);
  } catch (error) {
    showToast("Lỗi xóa thói quen", error.message || "Không thể xóa thói quen.");
  }
}

function startGoalTitleEdit() {
  elements.goalTitleInput.value = state.db.settings.milestoneTitle;
  elements.editGoalButton.hidden = true;
  elements.goalTitleInput.hidden = false;
  elements.goalTitleInput.focus();
  elements.goalTitleInput.select();
}

function cancelGoalTitleEdit() {
  elements.goalTitleInput.hidden = true;
  elements.editGoalButton.hidden = false;
}

async function finishGoalTitleEdit() {
  if (elements.goalTitleInput.hidden) {
    return;
  }

  const nextTitle = elements.goalTitleInput.value.trim();
  const previousTitle = state.db.settings.milestoneTitle;

  if (!nextTitle || nextTitle === previousTitle) {
    cancelGoalTitleEdit();
    return;
  }

  try {
    state.db = await window.habitApi.invoke("settings:updateGoalTitle", { title: nextTitle });
    cancelGoalTitleEdit();
    renderAll();
    showToast("Đã đổi mục tiêu", "Tên mục tiêu dài hạn đã được lưu.");
  } catch (error) {
    elements.goalTitleInput.value = previousTitle;
    showToast("Lỗi đổi mục tiêu", error.message || "Không thể lưu tên mục tiêu.");
    cancelGoalTitleEdit();
  }
}

async function saveTodayNote() {
  elements.saveNoteButton.disabled = true;
  elements.noteStatus.textContent = "Đang lưu...";

  try {
    state.db = await window.habitApi.invoke("note:save", {
      date: state.today,
      note: elements.noteInput.value
    });
    elements.noteStatus.textContent = "Đã lưu trên máy";
    showToast("Đã lưu ghi chú", "Nhật ký hôm nay đã được lưu trên máy này.");
  } catch (error) {
    elements.noteStatus.textContent = "Lưu thất bại";
    showToast("Lỗi ghi chú", error.message || "Không thể lưu ghi chú.");
  } finally {
    elements.saveNoteButton.disabled = false;
  }
}

function toggleFocusTimer() {
  if (state.focusStartedAt) {
    pauseFocusTimer();
  } else {
    startFocusTimer();
  }
}

function startFocusTimer() {
  state.focusStartedAt = Date.now();
  elements.focusToggleButton.textContent = "Pause";

  if (state.focusInterval) {
    window.clearInterval(state.focusInterval);
  }

  state.focusInterval = window.setInterval(updateFocusTimerDisplay, 250);
  updateFocusTimerDisplay();
}

function pauseFocusTimer() {
  if (!state.focusStartedAt) {
    return;
  }

  state.focusElapsedMs += Date.now() - state.focusStartedAt;
  state.focusStartedAt = null;
  elements.focusToggleButton.textContent = "Play";

  if (state.focusInterval) {
    window.clearInterval(state.focusInterval);
    state.focusInterval = null;
  }

  updateFocusTimerDisplay();
}

async function saveAndResetFocusTimer() {
  const elapsedMs = getCurrentFocusElapsedMs();
  const seconds = Math.floor(elapsedMs / 1000);

  if (seconds <= 0) {
    showToast("Focus timer trống", "Hãy chạy timer trước khi lưu.");
    return;
  }

  pauseFocusTimer();
  elements.focusSaveButton.disabled = true;

  try {
    state.db = await window.habitApi.invoke("focus:save", {
      date: state.today,
      seconds
    });
    resetFocusTimer();
    renderAll();
    showToast("Đã lưu focus time", `Đã thêm ${formatDurationShort(seconds)} vào hôm nay.`);
  } catch (error) {
    showToast("Lỗi lưu focus time", error.message || "Không thể lưu focus session.");
  } finally {
    elements.focusSaveButton.disabled = false;
  }
}

function resetFocusTimer() {
  state.focusElapsedMs = 0;
  state.focusStartedAt = null;
  if (state.focusInterval) {
    window.clearInterval(state.focusInterval);
    state.focusInterval = null;
  }
  elements.focusToggleButton.textContent = "Play";
  updateFocusTimerDisplay();
}

function getCurrentFocusElapsedMs() {
  return state.focusElapsedMs + (state.focusStartedAt ? Date.now() - state.focusStartedAt : 0);
}

function updateFocusTimerDisplay() {
  elements.focusTimerDisplay.textContent = formatHms(Math.floor(getCurrentFocusElapsedMs() / 1000));
}

function renderAll() {
  const db = state.db;
  categories = getCategories();
  renderCategorySelect(elements.habitCategoryInput.value);
  const days = getCurrentMonthDays();
  const totalXp = getTotalXp();
  const level = calculateLevel(totalXp);
  const milestone = calculateMilestone(totalXp);
  const monthCompletion = calculateMonthlyCompletion(days);
  const bestCurrentStreak = Math.max(
    0,
    ...db.habits.map((habit) => calculateStreaks(habit.id, days).current)
  );

  elements.todayLabel.textContent = formatDisplayDate(state.today);
  elements.milestoneTitle.textContent = db.settings.milestoneTitle;
  elements.milestoneFill.style.width = `${milestone.percent}%`;
  elements.milestoneXp.textContent = `${totalXp} / ${db.settings.milestoneTargetXp} XP`;
  elements.milestonePercent.textContent = `${milestone.percent}%`;
  elements.levelLabel.textContent = `Cấp ${level.level}`;
  elements.rankLabel.textContent = level.rank;
  elements.levelFill.style.width = `${level.percent}%`;
  elements.levelXp.textContent = `${level.xpIntoLevel} / ${level.levelSize} XP`;
  elements.totalXp.textContent = `Tổng ${totalXp} XP`;
  elements.monthLabel.textContent = state.monthDate.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric"
  });
  elements.monthCompletion.textContent = `Hoàn thành ${monthCompletion}%`;
  elements.bestStreak.innerHTML = `${bestCurrentStreak} ngày${renderFire(bestCurrentStreak)}`;
  elements.noteDateLabel.textContent = formatDisplayDate(state.today);

  const noteRecord = db.notes[state.today];
  const savedNote = noteRecord && typeof noteRecord.note === "string" ? noteRecord.note : "";

  if (document.activeElement !== elements.noteInput && elements.noteInput.value !== savedNote) {
    elements.noteInput.value = savedNote;
    elements.noteStatus.textContent = "Đã lưu trên máy";
  }

  renderGrid(days);
  scrollToTodayColumn();

  if (state.activeScreen === "analytics") {
    renderAnalyticsCharts();
  }
}

function renderGrid(days) {
  elements.gridHead.innerHTML = "";
  elements.gridBody.innerHTML = "";

  const headerRow = document.createElement("tr");
  const habitHead = document.createElement("th");
  habitHead.className = "habit-head";
  habitHead.textContent = "Thói quen / Chuỗi";
  headerRow.appendChild(habitHead);

  days.forEach((day) => {
    const eventText = getEventText(day.date);
    const hasEvent = eventText.length > 0;
    const th = document.createElement("th");
    th.className = `day-head${day.date === state.today ? " today-column" : ""}${hasEvent ? " has-event" : ""}`;
    th.dataset.date = day.date;
    th.title = hasEvent ? eventText : `Click để thêm deadline cho ${formatDisplayDate(day.date)}`;
    th.innerHTML = `
      <button
        class="day-header-button"
        type="button"
        data-event-date="${day.date}"
        title="${escapeHtml(hasEvent ? eventText : `Click để thêm deadline cho ${formatDisplayDate(day.date)}`)}"
        aria-label="Thêm hoặc sửa deadline cho ${escapeHtml(formatDisplayDate(day.date))}"
      >
        <span class="day-number">${day.day}</span>
        ${hasEvent ? '<span class="event-dot" aria-hidden="true"></span>' : '<span class="event-dot-placeholder" aria-hidden="true"></span>'}
        <span class="day-weekday">${day.weekday}</span>
      </button>
    `;
    headerRow.appendChild(th);
  });

  elements.gridHead.appendChild(headerRow);

  state.db.habits.forEach((habit) => {
    const row = document.createElement("tr");
    const streaks = calculateStreaks(habit.id, days);
    const nameCell = document.createElement("td");
    nameCell.className = "habit-name-cell";
    row.className = "habit-row";
    nameCell.innerHTML = `
      <div class="habit-name-main">
        <div class="habit-title-wrap">
          <span class="habit-name">${escapeHtml(habit.name)}</span>
          <button class="delete-habit-button" type="button" data-delete-habit-id="${escapeHtml(habit.id)}" aria-label="Xóa ${escapeHtml(habit.name)}">x</button>
        </div>
        <div class="habit-meta-actions">
          <span class="priority-pill">${escapeHtml(getHabitCategory(habit))}</span>
          <button class="edit-habit-button" type="button" data-edit-habit-id="${escapeHtml(habit.id)}" aria-label="Sửa ${escapeHtml(habit.name)}">Edit</button>
        </div>
      </div>
      <div class="streak-row">
        <span>Hiện tại: ${streaks.current}${renderFire(streaks.current)}</span>
        <span>Dài nhất: ${streaks.longest}${renderFire(streaks.longest)}</span>
      </div>
    `;
    row.appendChild(nameCell);

    days.forEach((day) => {
      const td = document.createElement("td");
      const isToday = day.date === state.today;
      const isCompleted = isHabitCompleted(habit.id, day.date);
      td.className = `cell-wrap${isToday ? " today-column" : ""}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = `habit-toggle${isCompleted ? " completed" : ""}`;
      button.setAttribute("aria-label", `${isCompleted ? "Bỏ hoàn thành" : "Hoàn thành"} ${habit.name} ngày ${day.day}`);
      button.setAttribute("data-habit-id", habit.id);
      button.setAttribute("data-date", day.date);
      button.textContent = "";

      td.appendChild(button);
      row.appendChild(td);
    });

    elements.gridBody.appendChild(row);
  });
}

function scrollToTodayColumn() {
  if (!isSameMonth(parseDateKey(state.today), state.monthDate)) {
    return;
  }

  window.requestAnimationFrame(() => {
    const todayColumn = elements.gridHead.querySelector(`[data-date="${state.today}"]`);

    if (!todayColumn) {
      return;
    }

    const target =
      todayColumn.offsetLeft -
      elements.tableWrap.clientWidth / 2 +
      todayColumn.offsetWidth / 2;

    elements.tableWrap.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth"
    });
  });
}

function getCurrentMonthDays() {
  const year = state.monthDate.getFullYear();
  const monthIndex = state.monthDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = getLocalDateKey(new Date(year, monthIndex, day));
    const weekday = new Date(year, monthIndex, day).toLocaleDateString("vi-VN", { weekday: "short" });

    days.push({
      day,
      date,
      weekday
    });
  }

  return days;
}

function renderAnalyticsCharts() {
  if (!window.Chart || !elements.categoryDonutChart || !elements.disciplineTrendChart || !elements.focusTimeChart || !state.db) {
    return;
  }

  const categoryData = getCategoryDistributionData();
  const trendData = getDisciplineTrendData();
  const focusData = getFocusTrendData();
  const focusSummary = getFocusSummaryData();
  const palette = ["#34d399", "#818cf8", "#f59e0b", "#38bdf8", "#a78bfa", "#f472b6"];
  const commonTextColor = "#d4d4d8";

  Chart.defaults.font.family = '"Inter", ui-sans-serif, system-ui, sans-serif';
  Chart.defaults.color = commonTextColor;

  if (!state.categoryDonutChart) {
    state.categoryDonutChart = new Chart(elements.categoryDonutChart, {
      type: "doughnut",
      data: {
        labels: categoryData.labels,
        datasets: [
          {
            data: categoryData.values,
            backgroundColor: palette,
            borderColor: "#27272a",
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        animation: {
          duration: 650,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              padding: 18,
              color: commonTextColor
            }
          },
          tooltip: {
            backgroundColor: "rgba(24, 24, 27, 0.96)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            padding: 12
          }
        }
      }
    });
  } else {
    state.categoryDonutChart.data.labels = categoryData.labels;
    state.categoryDonutChart.data.datasets[0].data = categoryData.values;
    state.categoryDonutChart.update();
  }

  if (!state.disciplineTrendChart) {
    state.disciplineTrendChart = new Chart(elements.disciplineTrendChart, {
      type: "line",
      data: {
        labels: trendData.labels,
        datasets: [
          {
            label: "Completed habits",
            data: trendData.values,
            borderColor: "#34d399",
            backgroundColor: "rgba(52, 211, 153, 0.14)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 700,
          easing: "easeOutQuart"
        },
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(24, 24, 27, 0.96)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: "#a1a1aa",
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: "#a1a1aa",
              precision: 0
            }
          }
        }
      }
    });
  } else {
    state.disciplineTrendChart.data.labels = trendData.labels;
    state.disciplineTrendChart.data.datasets[0].data = trendData.values;
    state.disciplineTrendChart.update();
  }

  elements.focusTodaySummary.textContent = formatDurationShort(focusSummary.today);
  elements.focusWeekSummary.textContent = formatDurationShort(focusSummary.week);
  elements.focusMonthSummary.textContent = formatDurationShort(focusSummary.month);

  if (!state.focusTimeChart) {
    state.focusTimeChart = new Chart(elements.focusTimeChart, {
      type: "bar",
      data: {
        labels: focusData.labels,
        datasets: [
          {
            label: "Focus minutes",
            data: focusData.values,
            backgroundColor: "rgba(52, 211, 153, 0.72)",
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 22
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 700,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(24, 24, 27, 0.96)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label(context) {
                return `${context.raw} minutes`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: "#a1a1aa",
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: "#a1a1aa",
              precision: 0
            }
          }
        }
      }
    });
  } else {
    state.focusTimeChart.data.labels = focusData.labels;
    state.focusTimeChart.data.datasets[0].data = focusData.values;
    state.focusTimeChart.update();
  }
}

function getCategoryDistributionData() {
  const categoryLabels = getCategories();
  const counts = Object.fromEntries(categoryLabels.map((category) => [category, 0]));
  const days = getCurrentMonthDays();

  state.db.habits.forEach((habit) => {
    const category = getHabitCategory(habit);

    days.forEach((day) => {
      if (isHabitCompleted(habit.id, day.date)) {
        counts[category] = (counts[category] || 0) + 1;
      }
    });
  });

  return {
    labels: categoryLabels,
    values: categoryLabels.map((category) => counts[category] || 0)
  };
}

function getDisciplineTrendData() {
  const days = getCurrentMonthDays();

  return {
    labels: days.map((day) => String(day.day)),
    values: days.map((day) =>
      state.db.habits.reduce((total, habit) => {
        return total + (isHabitCompleted(habit.id, day.date) ? 1 : 0);
      }, 0)
    )
  };
}

function getFocusTrendData() {
  const days = getCurrentMonthDays();

  return {
    labels: days.map((day) => String(day.day)),
    values: days.map((day) => Math.round(getFocusSeconds(day.date) / 60))
  };
}

function getFocusSummaryData() {
  const today = parseDateKey(state.today);
  const weekStart = new Date(today);
  const dayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayOffset);

  let week = 0;
  for (let index = 0; index < 7; index += 1) {
    const cursor = new Date(weekStart);
    cursor.setDate(weekStart.getDate() + index);
    week += getFocusSeconds(getLocalDateKey(cursor));
  }

  const month = getCurrentMonthDays().reduce((total, day) => total + getFocusSeconds(day.date), 0);

  return {
    today: getFocusSeconds(state.today),
    week,
    month
  };
}

function getFocusSeconds(date) {
  return Math.max(0, Math.floor(Number(state.db.focus && state.db.focus[date]) || 0));
}

function getTotalXp() {
  let completions = 0;

  Object.values(state.db.completions).forEach((habitCompletions) => {
    Object.values(habitCompletions).forEach((completed) => {
      if (completed === true) {
        completions += 1;
      }
    });
  });

  return completions * getXpPerCompletion();
}

function getXpPerCompletion() {
  const value = Number(state.db.settings.xpPerCompletion);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function calculateLevel(totalXp) {
  const levelSize = Number(state.db.settings.levelSize) > 0 ? Number(state.db.settings.levelSize) : 250;
  const level = Math.floor(totalXp / levelSize) + 1;
  const xpIntoLevel = totalXp % levelSize;
  const percent = Math.min(100, Math.round((xpIntoLevel / levelSize) * 100));
  const rank = getRankName(level);

  return {
    level,
    levelSize,
    xpIntoLevel,
    percent,
    rank
  };
}

function getRankName(level) {
  if (level >= 30) return "Huyền thoại kỷ luật";
  if (level >= 20) return "Chiến lược gia đỉnh cao";
  if (level >= 15) return "Tinh anh vận hành";
  if (level >= 10) return "Kiến trúc sư thép";
  if (level >= 5) return "Tân thủ kỷ luật";
  return "Tân binh kỷ luật";
}

function calculateMilestone(totalXp) {
  const target = Number(state.db.settings.milestoneTargetXp) > 0 ? Number(state.db.settings.milestoneTargetXp) : 10000;
  const percent = Math.min(100, Math.round((totalXp / target) * 100));
  return { target, percent };
}

function calculateMonthlyCompletion(days) {
  const totalPossible = state.db.habits.length * days.length;

  if (totalPossible === 0) {
    return 0;
  }

  let completed = 0;

  state.db.habits.forEach((habit) => {
    days.forEach((day) => {
      if (isHabitCompleted(habit.id, day.date)) {
        completed += 1;
      }
    });
  });

  return Math.round((completed / totalPossible) * 100);
}

function calculateStreaks(habitId, days) {
  let longest = 0;
  let running = 0;
  let latestCompletedIndex = -1;

  days.forEach((day, index) => {
    if (isHabitCompleted(habitId, day.date)) {
      running += 1;
      latestCompletedIndex = index;
    } else {
      running = 0;
    }

    longest = Math.max(longest, running);
  });

  let current = 0;

  if (latestCompletedIndex >= 0) {
    for (let index = latestCompletedIndex; index >= 0; index -= 1) {
      if (!isHabitCompleted(habitId, days[index].date)) {
        break;
      }

      current += 1;
    }
  }

  return { current, longest };
}

function renderFire(value) {
  return value > 3 ? '<span class="streak-fire" aria-label="Chuỗi mạnh">🔥</span>' : "";
}

function priorityLabel(priority) {
  if (priority === "high") return "Cao";
  if (priority === "low") return "Thấp";
  return "Trung bình";
}

function getHabitCategory(habit) {
  if (habit && categories.includes(habit.category)) {
    return habit.category;
  }

  if (habit && habit.id === "gym") return "Sức khỏe";
  if (habit && (habit.id === "code" || habit.id === "read")) return "Trí tuệ";
  return categories[0] || "Kỷ luật";
}

function getEventText(date) {
  const record = state.db.events && state.db.events[date];
  return record && typeof record.text === "string" ? record.text : "";
}

function isHabitCompleted(habitId, date) {
  return Boolean(state.db.completions[habitId] && state.db.completions[habitId][date] === true);
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameMonth(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHms(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDurationShort(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function formatDisplayDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("vi-VN", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function showToast(title, message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  elements.toastRoot.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "opacity 160ms ease, transform 160ms ease";
    window.setTimeout(() => toast.remove(), 180);
  }, 3200);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
