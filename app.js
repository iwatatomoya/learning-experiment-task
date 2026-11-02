// 状態管理（仮データ記録用）
let currentQuestionIndex = 0;
let questionStartTime = 0;

// 現在選択されているツール: null | "highlight-mark" | "underline-mark"
let activeTool = null;

// ドラッグ操作の状態管理
let isDragging = false;
let dragStartIndex = null;
let dragMode = "add"; // "add"（引く） または "remove"（消す）
let initialMarkedSnapshot = []; // ドラッグ開始時点の各文字のマーク状態

const sessionData = {
  participant: {
    name: "",
    studentId: ""
  },
  startedAt: null,
  finishedAt: null,
  responses: []
};

// DOM要素の取得
const startScreen = document.getElementById("start-screen");
const taskScreen = document.getElementById("task-screen");
const endScreen = document.getElementById("end-screen");

const startBtn = document.getElementById("start-btn");
const submitBtn = document.getElementById("submit-btn");
const restartBtn = document.getElementById("restart-btn");

const highlightBtn = document.getElementById("highlight-btn");
const underlineBtn = document.getElementById("underline-btn");
const clearFormatBtn = document.getElementById("clear-format-btn");

const studentNameInput = document.getElementById("student-name");
const studentIdInput = document.getElementById("student-id");
const displayUser = document.getElementById("display-user");

const currentQNum = document.getElementById("current-q-num");
const totalQNum = document.getElementById("total-q-num");
const qAttribute = document.getElementById("q-attribute");
const passageText = document.getElementById("passage-text");
const questionText = document.getElementById("question-text");
const answerInput = document.getElementById("answer-input");
const memoInput = document.getElementById("memo-input");
const logPreview = document.getElementById("log-preview");
const resultReviewList = document.getElementById("result-review-list");

// --- 画面切り替え関数 ---
function showScreen(targetScreen) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  targetScreen.classList.add("active");
}

// --- 1. 実験開始処理 ---
startBtn.addEventListener("click", () => {
  const name = studentNameInput.value.trim() || "未入力";
  const studentId = studentIdInput.value.trim() || "未入力";

  sessionData.participant.name = name;
  sessionData.participant.studentId = studentId;
  sessionData.startedAt = new Date().toISOString();
  sessionData.responses = [];

  displayUser.textContent = `${name} (${studentId})`;
  totalQNum.textContent = questionList.length;

  currentQuestionIndex = 0;
  memoInput.value = "";
  setActiveTool(null);
  loadQuestion(currentQuestionIndex);
  showScreen(taskScreen);
});

// --- 2. 問題の読み込みと表示 ---
function loadQuestion(index) {
  const q = questionList[index];
  currentQNum.textContent = index + 1;
  qAttribute.textContent = q.attribute;
  passageText.innerHTML = formatPassageIntoChars(q.passage);
  questionText.textContent = q.question;
  answerInput.value = "";
  questionStartTime = performance.now();

  if (index === questionList.length - 1) {
    submitBtn.textContent = "回答を提出して終了する";
  } else {
    submitBtn.textContent = "回答を提出して次へ";
  }
}

// 文章を1文字ずつ <span class="char" data-idx="..."> に分割して生成
function formatPassageIntoChars(text) {
  let charIndex = 0;
  const paragraphs = text.split("\n");

  return paragraphs
    .map((line) => {
      if (line.trim() === "") return "";
      const charsHtml = Array.from(line)
        .map((ch) => {
          const span = `<span class="char" data-idx="${charIndex}">${escapeHtml(ch)}</span>`;
          charIndex++;
          return span;
        })
        .join("");
      return `<p>${charsHtml}</p>`;
    })
    .join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- 3. 回答提出と次の問題への遷移 ---
submitBtn.addEventListener("click", () => {
  const answer = answerInput.value.trim();
  if (!answer) {
    const proceed = confirm("回答欄が空欄ですが、このまま提出して進みますか？");
    if (!proceed) return;
  }

  const currentQ = questionList[currentQuestionIndex];
  const elapsedSec = ((performance.now() - questionStartTime) / 1000).toFixed(2);

  // マーカーや下線が引かれたテキストの記録（仮データ用）
  const highlightedText = Array.from(passageText.querySelectorAll(".char.highlight-mark"))
    .map((el) => el.textContent)
    .join("");
  const underlinedText = Array.from(passageText.querySelectorAll(".char.underline-mark"))
    .map((el) => el.textContent)
    .join("");

  sessionData.responses.push({
    questionId: currentQ.id,
    attribute: currentQ.attribute,
    answer: answer,
    memoSnapshot: memoInput.value,
    highlightedChars: highlightedText,
    underlinedChars: underlinedText,
    elapsedSeconds: Number(elapsedSec),
    submittedAt: new Date().toISOString()
  });

  currentQuestionIndex++;

  if (currentQuestionIndex < questionList.length) {
    loadQuestion(currentQuestionIndex);
  } else {
    finishExperiment();
  }
});

// --- 4. 実験終了処理 ---
function finishExperiment() {
  sessionData.finishedAt = new Date().toISOString();
  logPreview.textContent = JSON.stringify(sessionData, null, 2);
  renderResultReview();
  showScreen(endScreen);
}

// 各問題の「自分の回答」と「模範解答」を並べて一覧表示する
function renderResultReview() {
  if (!resultReviewList) return;

  resultReviewList.innerHTML = questionList
    .map((q, idx) => {
      const response = sessionData.responses[idx];
      const userAnswer = response && response.answer ? response.answer : "（未回答）";
      const modelAnswer = q.modelAnswer || "（模範解答なし）";

      return `
        <div class="result-item">
          <div class="result-item-question">${escapeHtml(q.question)}</div>
          <div class="result-compare-grid">
            <div class="result-column user-ans">
              <span class="result-col-label">あなたの回答</span>
              <div class="result-col-text">${escapeHtml(userAnswer)}</div>
            </div>
            <div class="result-column model-ans">
              <span class="result-col-label">模範解答</span>
              <div class="result-col-text">${escapeHtml(modelAnswer)}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

restartBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

// --- 5. マーカー・下線ツールの切り替え制御 ---
function setActiveTool(toolClass) {
  // 同じツールボタンをもう一度押した場合はOFFにする
  if (activeTool === toolClass) {
    activeTool = null;
  } else {
    activeTool = toolClass;
  }

  // ボタンの見た目（ON/OFF状態）を更新
  const isHighlight = activeTool === "highlight-mark";
  const isUnderline = activeTool === "underline-mark";

  highlightBtn.classList.toggle("active", isHighlight);
  highlightBtn.setAttribute("aria-pressed", String(isHighlight));

  underlineBtn.classList.toggle("active", isUnderline);
  underlineBtn.setAttribute("aria-pressed", String(isUnderline));

  // ツール選択中はブラウザ標準の青いテキスト選択を無効化し、専用カーソルを適用
  passageText.classList.toggle("tool-active", activeTool !== null);
  passageText.classList.toggle("tool-highlight", isHighlight);
  passageText.classList.toggle("tool-underline", isUnderline);

  // 既存のブラウザ選択範囲があればクリア
  const sel = window.getSelection();
  if (sel) sel.removeAllRanges();
}

highlightBtn.addEventListener("click", () => {
  setActiveTool("highlight-mark");
});

underlineBtn.addEventListener("click", () => {
  setActiveTool("underline-mark");
});

clearFormatBtn.addEventListener("click", () => {
  const q = questionList[currentQuestionIndex];
  passageText.innerHTML = formatPassageIntoChars(q.passage);
});

// --- 6. ドラッグ選択によるマーカー・下線の描画／消去 ---

// マウスイベントの位置から文字インデックスを取得するヘルパー
function getCharIndexFromEvent(e) {
  const targetChar = e.target.closest(".char");
  if (targetChar) {
    return Number(targetChar.dataset.idx);
  }

  // 少し隙間をクリック・ドラッグした場合でも座標から一番近い文字を取得
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (range && range.startContainer) {
      const parentChar =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer.closest(".char")
          : range.startContainer.parentElement?.closest(".char");
      if (parentChar && passageText.contains(parentChar)) {
        return Number(parentChar.dataset.idx);
      }
    }
  }
  return null;
}

// ドラッグ開始（mousedown）
passageText.addEventListener("mousedown", (e) => {
  if (!activeTool) return;
  if (e.button !== 0) return; // 左クリックのみ対象

  const idx = getCharIndexFromEvent(e);
  if (idx === null) return;

  e.preventDefault(); // ブラウザの標準選択を防止
  isDragging = true;
  dragStartIndex = idx;

  const allChars = passageText.querySelectorAll(".char");
  // ドラッグ開始時点の各文字のマーク状態を保存
  initialMarkedSnapshot = Array.from(allChars).map((el) =>
    el.classList.contains(activeTool)
  );

  // ドラッグを開始した文字にすでにその印がついている場合は「消去モード」、ついていなければ「引くモード」
  dragMode = initialMarkedSnapshot[dragStartIndex] ? "remove" : "add";
  passageText.classList.toggle("dragging-add", dragMode === "add");
  passageText.classList.toggle("dragging-remove", dragMode === "remove");

  // 1文字目にも即座に適用
  updateMarksInRange(dragStartIndex, dragStartIndex);
});

// ドラッグ中（mousemove）
window.addEventListener("mousemove", (e) => {
  if (!isDragging || !activeTool || dragStartIndex === null) return;

  const currentIdx = getCharIndexFromEvent(e);
  if (currentIdx === null) return;

  updateMarksInRange(dragStartIndex, currentIdx);
});

// ドラッグ終了（mouseup）
window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  dragStartIndex = null;
  initialMarkedSnapshot = [];
  passageText.classList.remove("dragging-add", "dragging-remove");
});

// 開始位置〜現在位置の文字に対して印を付与または消去する
function updateMarksInRange(startIdx, endIdx) {
  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);
  const allChars = passageText.querySelectorAll(".char");

  allChars.forEach((el, idx) => {
    if (idx >= minIdx && idx <= maxIdx) {
      // 現在のドラッグ範囲内
      if (dragMode === "add") {
        el.classList.add(activeTool);
      } else {
        el.classList.remove(activeTool);
      }
    } else {
      // ドラッグ範囲外（行き過ぎて戻した場合などに元の状態を復元）
      if (initialMarkedSnapshot[idx]) {
        el.classList.add(activeTool);
      } else {
        el.classList.remove(activeTool);
      }
    }
  });
}

// --- 7. 解答欄・メモ欄へのペースト（貼り付け）禁止 ---
const pasteToast = document.getElementById("paste-toast");
let toastTimer = null;

function showPasteBlockedToast() {
  if (!pasteToast) return;
  pasteToast.classList.add("visible");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    pasteToast.classList.remove("visible");
  }, 2200);
}

[answerInput, memoInput].forEach((inputEl) => {
  // ショートカット（Cmd+V / Ctrl+V）や右クリックからの貼り付けを禁止
  inputEl.addEventListener("paste", (e) => {
    e.preventDefault();
    showPasteBlockedToast();
  });

  // 選択した文字のドラッグ＆ドロップによる貼り付けも禁止
  inputEl.addEventListener("drop", (e) => {
    e.preventDefault();
    showPasteBlockedToast();
  });
});
