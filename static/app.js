// CodeRefine – Frontend Logic

// ── Language groups ──────────────────────────────────────────────────────────
const LANG_GROUPS = [
  { group: "Web",               langs: ["JavaScript","TypeScript","HTML","CSS","SCSS"] },
  { group: "General Purpose",   langs: ["Python","Java","C","C++","C#","Go","Rust","Kotlin","Swift","Dart","Scala","Groovy"] },
  { group: "Scripting / Shell", langs: ["PHP","Ruby","Perl","Lua","Bash / Shell","PowerShell"] },
  { group: "Data / Query",      langs: ["SQL","R","MATLAB"] },
  { group: "Systems",           langs: ["Assembly","Zig","Nim"] },
  { group: "Functional",        langs: ["Haskell","Elixir","Erlang","F#","Clojure","OCaml"] },
  { group: "Legacy",            langs: ["Visual Basic","COBOL","Fortran","Lisp"] },
  { group: "Config / Data",     langs: ["YAML","JSON","XML","TOML"] },
  { group: "Mobile",            langs: ["Objective-C"] },
  { group: "Other",             langs: ["Other"] },
];

// ── Metric donut config ───────────────────────────────────────────────────────
const METRIC_CFG = [
  { key: "code_quality",           label: "Code Quality",       color: "#6366f1" },
  { key: "bug_free",               label: "Bug-Free",            color: "#22c55e" },
  { key: "security_score",         label: "Security",            color: "#f97316" },
  { key: "optimization_potential", label: "Opt. Potential",      color: "#facc15" },
  { key: "readability",            label: "Readability",         color: "#38bdf8" },
  { key: "maintainability",        label: "Maintainability",     color: "#a78bfa" },
];

// ── Grade config ─────────────────────────────────────────────────────────────
const GRADE_CFG = {
  "A+": { color:"text-green-300",  border:"border-green-500",  bg:"bg-green-900/40" },
  "A":  { color:"text-green-400",  border:"border-green-600",  bg:"bg-green-900/30" },
  "B":  { color:"text-blue-300",   border:"border-blue-500",   bg:"bg-blue-900/30" },
  "C":  { color:"text-yellow-300", border:"border-yellow-500", bg:"bg-yellow-900/30" },
  "D":  { color:"text-orange-300", border:"border-orange-500", bg:"bg-orange-900/30" },
  "F":  { color:"text-red-300",    border:"border-red-500",    bg:"bg-red-900/30" },
};

// ── Sample code ───────────────────────────────────────────────────────────────
const SAMPLE_CODE = `import sqlite3

def get_user(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"
    cursor.execute(query)
    return cursor.fetchone()

def calculate_factorial(n):
    result = 1
    for i in range(1, n):  # Bug: should be range(1, n+1)
        result = result * i
    return result

def load_config():
    API_KEY = "sk-prod-abc123secretkey"  # Hardcoded secret
    DB_PASSWORD = "admin123"
    return {"api_key": API_KEY, "db_password": DB_PASSWORD}

def find_duplicates(items):
    duplicates = []
    for i in range(len(items)):         # O(n^3) - very slow
        for j in range(len(items)):
            if i != j and items[i] == items[j]:
                if items[i] not in duplicates:
                    duplicates.append(items[i])
    return duplicates
`;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const langSel     = document.getElementById("language");
const provSel     = document.getElementById("provider");
const codeInput   = document.getElementById("codeInput");
const analyzeBtn  = document.getElementById("analyzeBtn");
const btnText     = document.getElementById("btnText");
const btnSpin     = document.getElementById("btnSpin");
const sampleBtn   = document.getElementById("sampleBtn");
const clearBtn    = document.getElementById("clearBtn");
const lineCount   = document.getElementById("lineCount");
const results     = document.getElementById("results");
const emptyState  = document.getElementById("emptyState");
const scoreRing   = document.getElementById("scoreRing");
const scoreVal    = document.getElementById("scoreVal");
const gradeBox    = document.getElementById("gradeBox");
const summaryText = document.getElementById("summaryText");
const provBadge   = document.getElementById("provBadge");
const bugCount    = document.getElementById("bugCount");
const optCount    = document.getElementById("optCount");
const secCount    = document.getElementById("secCount");
const bugBadge    = document.getElementById("bugBadge");
const optBadge    = document.getElementById("optBadge");
const secBadge    = document.getElementById("secBadge");
const bugBar      = document.getElementById("bugBar");
const optBar      = document.getElementById("optBar");
const secBar      = document.getElementById("secBar");
const bugLbl      = document.getElementById("bugLbl");
const optLbl      = document.getElementById("optLbl");
const secLbl      = document.getElementById("secLbl");
const metricsGrid = document.getElementById("metricsGrid");
const tabContent  = document.getElementById("tabContent");
const rewriteLang = document.getElementById("rewriteLang");
const rewriteBox  = document.getElementById("rewriteBox");
const copyBtn     = document.getElementById("copyBtn");
const toast       = document.getElementById("toast");
const btnTimer    = document.getElementById("btnTimer");
const detectedBadge      = document.getElementById("detectedBadge");
const detectedName       = document.getElementById("detectedName");
const mismatchBanner     = document.getElementById("mismatchBanner");
const mismatchDetectedEl = document.getElementById("mismatchDetected");
const mismatchSelectedEl = document.getElementById("mismatchSelected");

let activeTab = "bugs";
let currentData = null;
let optimizedCode = "";
let historyItems = JSON.parse(localStorage.getItem("coderefine_history") || "[]");
let _detectedLang  = null;   // last auto-detected language
let _mismatchOk    = false;  // user explicitly dismissed the mismatch

// ── Build language dropdown ──────────────────────────────────────────────────
function buildLangSelect() {
  langSel.innerHTML = "";
  LANG_GROUPS.forEach(({ group, langs }) => {
    const og = document.createElement("optgroup");
    og.label = group;
    langs.forEach(lang => {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      if (lang === "Python") opt.selected = true;
      og.appendChild(opt);
    });
    langSel.appendChild(og);
  });
}

// ── Init: load providers from API ────────────────────────────────────────────
async function init() {
  buildLangSelect();
  try {
    const res  = await fetch("/api/meta");
    const meta = await res.json();
    Object.entries(meta.providers).forEach(([key, label]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = label;
      provSel.appendChild(opt);
    });
    // Default to Groq (faster, no quota issues)
    if ([...provSel.options].some(o => o.value === "groq")) provSel.value = "groq";
  } catch {
    showToast("Cannot connect to server. Make sure main.py is running.", "error");
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
analyzeBtn.addEventListener("click", runAnalysis);

clearBtn.addEventListener("click", () => {
  codeInput.value = "";
  updateLineCount();
  codeInput.focus();
});

sampleBtn.addEventListener("click", () => {
  codeInput.value = SAMPLE_CODE;
  langSel.value = "Python";
  updateLineCount();
  showToast("Sample Python code loaded", "info");
});

codeInput.addEventListener("input", () => {
  updateLineCount();
  scheduleDetect();
});

langSel.addEventListener("change", () => {
  if (_detectedLang) runAutoDetect();
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeTab = btn.dataset.tab;
    if (currentData) renderTabs(currentData, activeTab);
  });
});

copyBtn.addEventListener("click", () => {
  if (!optimizedCode) return;
  navigator.clipboard.writeText(optimizedCode)
    .then(() => showToast("Code copied!", "success"))
    .catch(() => showToast("Copy failed", "error"));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateLineCount() {
  const n = codeInput.value.split("\n").length;
  lineCount.textContent = `${n} line${n !== 1 ? "s" : ""}`;
}

let _timerInterval = null;
const ANALYSIS_STAGES = [
  "Connecting to AI…",
  "Sending code…",
  "AI is reviewing…",
  "Checking security…",
  "Finding optimizations…",
  "Building report…",
];

function setLoading(on) {
  analyzeBtn.disabled = on;
  btnSpin.classList.toggle("hidden", !on);
  if (on) {
    let secs = 0, stageIdx = 0;
    btnText.textContent = ANALYSIS_STAGES[0];
    btnTimer.textContent = "0s";
    btnTimer.classList.remove("hidden");
    _timerInterval = setInterval(() => {
      secs++;
      btnTimer.textContent = secs + "s";
      // Rotate through stage messages every 3 seconds
      stageIdx = Math.min(Math.floor(secs / 3), ANALYSIS_STAGES.length - 1);
      btnText.textContent = ANALYSIS_STAGES[stageIdx];
    }, 1000);
  } else {
    clearInterval(_timerInterval);
    btnText.textContent = "Analyze Code";
    btnTimer.classList.add("hidden");
    btnTimer.textContent = "";
  }
}

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function getGrade(s) {
  if (s >= 95) return "A+";
  if (s >= 85) return "A";
  if (s >= 70) return "B";
  if (s >= 55) return "C";
  if (s >= 40) return "D";
  return "F";
}

function scoreColor(s) {
  if (s >= 80) return "#22c55e";
  if (s >= 60) return "#f59e0b";
  if (s >= 40) return "#f97316";
  return "#ef4444";
}

function severityPct(items) {
  if (!items.length) return 0;
  const w = { critical:100, high:70, medium:40, low:15 };
  return Math.min(Math.round(items.reduce((s,i) => s + (w[(i.severity||"low").toLowerCase()] || 15), 0) / items.length), 100);
}

function pctLabel(p) {
  if (p >= 80) return "Critical";
  if (p >= 55) return "High";
  if (p >= 30) return "Medium";
  if (p > 0)   return "Low";
  return "None";
}

function setBar(barEl, lblEl, pct) {
  barEl.style.setProperty("--w", pct + "%");
  barEl.style.width = pct + "%";
  lblEl.textContent = pctLabel(pct);
}

function animNum(el, from, to, ms, setter) {
  const start = performance.now();
  const tick = ts => {
    const p = Math.min((ts - start) / ms, 1);
    const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    setter ? setter(v) : (el.textContent = v);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

let toastTimer;
function showToast(msg, type = "info") {
  clearTimeout(toastTimer);
  const styles = {
    success: "bg-green-900 border-green-700 text-green-100",
    error:   "bg-red-950 border-red-800 text-red-100",
    warning: "bg-yellow-950 border-yellow-800 text-yellow-100",
    info:    "bg-gray-800 border-gray-700 text-gray-100",
  };
  const icons = { success:"✅", error:"❌", warning:"⚠️", info:"ℹ️" };
  toast.className = `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border flex items-center gap-2 transition-all duration-300 ${styles[type]}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${esc(msg)}</span>`;
  toast.style.opacity = "1";
  toastTimer = setTimeout(() => { toast.style.opacity = "0"; }, 3800);
}

// ── Language detection engine ─────────────────────────────────────────────
const DETECT_RULES = [
  { lang: "Python",       score: c =>
      (c.match(/^\s*def\s+\w+\s*\(/m) ? 4 : 0) +
      (c.match(/^\s*import\s+\w/m) ? 2 : 0) +
      (c.match(/^\s*from\s+\w+\s+import/m) ? 2 : 0) +
      (c.match(/\bprint\s*\(/g)||[]).length +
      (c.match(/\belif\b/) ? 3 : 0) +
      (c.match(/:\s*$\s*^ {4}/m) ? 2 : 0) +
      (c.match(/#.*$/) ? 1 : 0) },
  { lang: "JavaScript",   score: c =>
      (c.match(/\b(const|let|var)\s+\w+\s*=/) ? 3 : 0) +
      (c.match(/=>/) ? 3 : 0) +
      (c.match(/\bconsole\.log\b/) ? 3 : 0) +
      (c.match(/function\s+\w+\s*\(/) ? 2 : 0) +
      (c.match(/document\.|window\.|require\(/) ? 2 : 0) +
      (c.match(/===|!==/) ? 2 : 0) },
  { lang: "TypeScript",   score: c =>
      (c.match(/:\s*(string|number|boolean|any|void|never)\b/) ? 5 : 0) +
      (c.match(/\binterface\s+\w+/) ? 5 : 0) +
      (c.match(/\btype\s+\w+\s*=/) ? 4 : 0) +
      (c.match(/<[A-Z]\w*>/) ? 2 : 0) +
      (c.match(/\bimport\s+.*from\s+['".]/) ? 2 : 0) },
  { lang: "Java",         score: c =>
      (c.match(/public\s+(class|interface|enum)\s+\w+/) ? 6 : 0) +
      (c.match(/public\s+static\s+void\s+main/) ? 5 : 0) +
      (c.match(/System\.out\.print/) ? 4 : 0) +
      (c.match(/\bimport\s+java\./) ? 3 : 0) +
      (c.match(/\bnew\s+[A-Z]\w+\s*\(/) ? 2 : 0) },
  { lang: "C#",           score: c =>
      (c.match(/using\s+System/) ? 5 : 0) +
      (c.match(/Console\.Write/) ? 4 : 0) +
      (c.match(/namespace\s+\w+/) ? 4 : 0) +
      (c.match(/\bvar\s+\w+\s*=\s*new\b/) ? 2 : 0) +
      (c.match(/\.cs\b|\[.*Attribute\]/) ? 2 : 0) },
  { lang: "C++",          score: c =>
      (c.match(/#include\s*<(iostream|vector|string|algorithm)>/) ? 6 : 0) +
      (c.match(/std::/) ? 5 : 0) +
      (c.match(/cout\s*<</) ? 5 : 0) +
      (c.match(/\btemplate\s*</) ? 3 : 0) +
      (c.match(/#include/) ? 1 : 0) },
  { lang: "C",            score: c =>
      (c.match(/#include\s*<(stdio|stdlib|string)\.h>/) ? 6 : 0) +
      (c.match(/printf\s*\(/) ? 4 : 0) +
      (c.match(/int\s+main\s*\(/) ? 4 : 0) +
      (c.match(/malloc\s*\(|free\s*\(/) ? 3 : 0) +
      (c.match(/#include/) ? 1 : 0) },
  { lang: "Go",           score: c =>
      (c.match(/^package\s+main\b/m) ? 6 : 0) +
      (c.match(/^func\s+\w+/m) ? 4 : 0) +
      (c.match(/fmt\.Print/) ? 4 : 0) +
      (c.match(/\bimport\s+"fmt"/) ? 3 : 0) +
      (c.match(/:=\s/) ? 3 : 0) },
  { lang: "Rust",         score: c =>
      (c.match(/fn\s+main\s*\(\)/) ? 5 : 0) +
      (c.match(/let\s+mut\s+\w+/) ? 5 : 0) +
      (c.match(/println!\s*\(/) ? 4 : 0) +
      (c.match(/use\s+std::/) ? 4 : 0) +
      (c.match(/->\s*\w+\s*\{/) ? 2 : 0) },
  { lang: "Kotlin",       score: c =>
      (c.match(/fun\s+main\s*\(/) ? 5 : 0) +
      (c.match(/\bval\s+\w+\s*:/) ? 4 : 0) +
      (c.match(/println\s*\(/) ? 3 : 0) +
      (c.match(/data\s+class\s+\w+/) ? 4 : 0) },
  { lang: "Swift",        score: c =>
      (c.match(/import\s+(UIKit|Foundation|SwiftUI)/) ? 6 : 0) +
      (c.match(/\bvar\s+\w+\s*:\s*\w+/) ? 2 : 0) +
      (c.match(/print\s*\(/) ? 1 : 0) +
      (c.match(/guard\s+let|if\s+let/) ? 4 : 0) },
  { lang: "PHP",          score: c =>
      (c.match(/<\?php/) ? 8 : 0) +
      (c.match(/\$[a-zA-Z_]\w*\s*=/) ? 3 : 0) +
      (c.match(/echo\s+/) ? 2 : 0) },
  { lang: "Ruby",         score: c =>
      (c.match(/^\s*def\s+\w+/m) ? 3 : 0) +
      (c.match(/\bend\b.*$\n.*\bdef\b|^end$/m) ? 4 : 0) +
      (c.match(/puts\s+/) ? 4 : 0) +
      (c.match(/require\s+'\w+/) ? 3 : 0) +
      (c.match(/do\s*\|\w+\|/) ? 3 : 0) },
  { lang: "SQL",          score: c =>
      (c.match(/\bSELECT\b.*\bFROM\b/i) ? 7 : 0) +
      (c.match(/\bINSERT\s+INTO\b/i) ? 5 : 0) +
      (c.match(/\bCREATE\s+TABLE\b/i) ? 5 : 0) +
      (c.match(/\bWHERE\b/i) ? 2 : 0) },
  { lang: "HTML",         score: c =>
      (c.match(/<!DOCTYPE\s+html/i) ? 8 : 0) +
      (c.match(/<html[\s>]/i) ? 6 : 0) +
      (c.match(/<\/(div|p|span|h[1-6]|body|head)>/i) ? 3 : 0) },
  { lang: "CSS",          score: c =>
      (c.match(/[a-z#.*\[][^{]*\{\s*[a-z-]+\s*:/) ? 4 : 0) +
      (c.match(/:\s*\d+(px|em|rem|%|vh|vw)/) ? 3 : 0) +
      (c.match(/@media|@keyframes|@import/) ? 4 : 0) },
  { lang: "Bash / Shell", score: c =>
      (c.match(/^#!\/bin\/(bash|sh)/m) ? 8 : 0) +
      (c.match(/\becho\s+["']/) ? 3 : 0) +
      (c.match(/if\s+\[/) ? 3 : 0) +
      (c.match(/\$\{?\w+\}?/) ? 2 : 0) },
  { lang: "JSON",         score: c => {
      try { JSON.parse(c.trim()); return 10; } catch { return 0; } } },
  { lang: "YAML",         score: c =>
      (c.match(/^\w[\w ]*:\s*\S/m) ? 3 : 0) +
      (c.match(/^\s*-\s+\w/m) ? 2 : 0) +
      !c.match(/[{};]/) ? 1 : 0 },
  { lang: "XML",          score: c =>
      (c.match(/<\?xml\s/) ? 8 : 0) +
      (c.match(/<[A-Za-z][^>]*>.*<\/[A-Za-z]/) ? 5 : 0) },
  { lang: "R",            score: c =>
      (c.match(/<-\s/) ? 5 : 0) +
      (c.match(/library\s*\(/) ? 4 : 0) +
      (c.match(/c\(\d/) ? 2 : 0) },
  { lang: "Scala",        score: c =>
      (c.match(/object\s+\w+\s*\{/) ? 5 : 0) +
      (c.match(/def\s+\w+.*:\s*\w+\s*=/) ? 4 : 0) +
      (c.match(/println\s*\(/) ? 2 : 0) },
];

function detectLanguage(code) {
  if (!code.trim() || code.trim().length < 20) return null;
  let best = null, bestScore = 0;
  for (const { lang, score } of DETECT_RULES) {
    const s = score(code);
    if (s > bestScore) { bestScore = s; best = lang; }
  }
  return bestScore >= 3 ? best : null;
}

// ── Auto-detect wiring ────────────────────────────────────────────────────
let _detectTimer;
function scheduleDetect() {
  clearTimeout(_detectTimer);
  if (!codeInput) return;
  _detectTimer = setTimeout(() => runAutoDetect(), 700);
}

function runAutoDetect() {
  const code = codeInput.value;
  _detectedLang = detectLanguage(code);
  _mismatchOk   = true; // auto-applied, never block

  // Always hide mismatch banner — we auto-fix instead
  mismatchBanner.classList.add("hidden");
  mismatchBanner.classList.remove("flex");
  langSel.classList.remove("border-yellow-600");

  if (_detectedLang) {
    // ── AUTO-SWITCH the dropdown to match detected language ──
    const prev = langSel.value;
    langSel.value = _detectedLang;

    // Show green detected badge
    detectedName.textContent = _detectedLang;
    detectedBadge.classList.remove("hidden");
    detectedBadge.classList.add("inline-flex");

    // Toast only when language actually changed
    if (prev !== _detectedLang) {
      showToast(`🔍 Language auto-detected: ${_detectedLang}`, "success");
    }
  } else {
    detectedBadge.classList.add("hidden");
    detectedBadge.classList.remove("inline-flex");
  }
}

function applyDetectedLang() {
  if (_detectedLang) langSel.value = _detectedLang;
  _mismatchOk = true;
  mismatchBanner.classList.add("hidden");
  mismatchBanner.classList.remove("flex");
  langSel.classList.remove("border-yellow-600");
  showToast(`Language set to ${_detectedLang}`, "success");
}

function dismissMismatch() {
  _mismatchOk = true;
  mismatchBanner.classList.add("hidden");
  mismatchBanner.classList.remove("flex");
  langSel.classList.remove("border-yellow-600");
}

// ── Main analysis ─────────────────────────────────────────────────────────────
async function runAnalysis() {
  const code = codeInput.value.trim();
  if (!code) { showToast("Paste some code first", "warning"); return; }

  setLoading(true);
  const t0 = Date.now();
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language: langSel.value, provider: provSel.value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(err.detail || `Server error ${res.status}`);
    }
    currentData = await res.json();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    saveToHistory(currentData, code);
    renderResults(currentData);
    showToast(`✅ Analysis done in ${elapsed}s`, "success");
  } catch (e) {
    let msg = e.message || "Unknown error";
    if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      msg = "API quota exceeded — wait 1 minute and try again, or switch to a different AI Provider.";
    } else if (msg.includes("404") || msg.includes("NOT_FOUND")) {
      msg = "AI model not available. Try switching the AI Provider.";
    } else if (msg.includes("401") || msg.includes("403")) {
      msg = "Invalid API key. Check your .env file.";
    } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = "Cannot reach server. Make sure main.py is running.";
    }
    showToast(msg, "error");
  } finally {
    setLoading(false);
  }
}

// ── Mismatch error result (0%) ──────────────────────────────────────────────
function showMismatchError(detected, selected) {
  const fakeData = {
    score: 0,
    summary: `❌ Language Mismatch: The code appears to be ${detected}, but "${selected}" is selected. Fix the language dropdown or click "Use Detected" and try again.`,
    provider: provSel.options[provSel.selectedIndex]?.text || "",
    language: selected,
    bugs: [{
      severity: "critical",
      line: null,
      title: "Wrong language selected",
      description: `Code was detected as ${detected} but you selected ${selected}. Analysis cannot proceed accurately.`,
      fix: `Change the Language dropdown to "${detected}" and re-run the analysis.`,
    }],
    optimizations: [],
    security: [],
    metrics: { code_quality:0, bug_free:0, security_score:0, optimization_potential:0, readability:0, maintainability:0 },
    optimized_code: "",
    _isMismatch: true,
  };

  // Show the mismatch banner too
  mismatchDetectedEl.textContent = detected;
  mismatchSelectedEl.textContent = selected;
  mismatchBanner.classList.remove("hidden");
  mismatchBanner.classList.add("flex");

  renderResults(fakeData);
  showToast(`Language mismatch! Detected ${detected} ≠ ${selected} selected — showing 0% score.`, "error");
}
// ── Save Report ─────────────────────────────────────────────────────────────────
function saveReport() {
  if (!currentData) { showToast("Run an analysis first", "warning"); return; }
  const d = currentData;
  const grade = getGrade(d.score);
  const now = new Date().toLocaleString();
  const bugRows = (d.bugs || []).map(b => `
    <tr><td>${esc(b.severity||'')}</td><td>${esc(b.title||'')}</td><td>${esc(b.description||'')}</td><td><pre>${esc(b.fix||'')}</pre></td></tr>`).join("");
  const secRows = (d.security || []).map(s => `
    <tr><td>${esc(s.severity||'')}</td><td>${esc(s.vulnerability||'')}</td><td>${esc(s.description||'')}</td><td><pre>${esc(s.fix||'')}</pre></td></tr>`).join("");
  const optRows = (d.optimizations || []).map(o => `
    <tr><td>${esc(o.category||'')}</td><td>${esc(o.title||'')}</td><td>${esc(o.description||'')}</td><td><pre>${esc(o.suggestion||'')}</pre></td></tr>`).join("");
  const metricRows = Object.entries(d.metrics || {}).map(([k,v]) =>
    `<tr><td>${esc(k.replace(/_/g,' '))}</td><td><div style="background:#1e293b;border-radius:4px;overflow:hidden;height:14px;width:200px"><div style="background:#6366f1;height:100%;width:${v}%"></div></div></td><td>${v}%</td></tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>CodeRefine Report – ${esc(d.language)} – ${now}</title>
<style>
  *{box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px}
  h1{color:#a5b4fc;margin-bottom:4px}h2{color:#94a3b8;font-size:1rem;margin:24px 0 8px}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.75rem;font-weight:700}
  .score-block{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;display:inline-block;margin-bottom:16px}
  .score{font-size:3rem;font-weight:900;color:#a5b4fc}.grade{font-size:1.4rem;font-weight:700;margin-left:12px}
  .summary{background:#1e293b;border-left:3px solid #6366f1;padding:12px 16px;border-radius:6px;font-style:italic;color:#cbd5e1;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:.82rem}
  th{background:#1e293b;color:#94a3b8;text-align:left;padding:8px 10px;border-bottom:1px solid #334155}
  td{padding:7px 10px;border-bottom:1px solid #1e293b;vertical-align:top}
  tr:hover td{background:#1e293b40}
  pre{white-space:pre-wrap;word-break:break-word;background:#0f172a;padding:8px;border-radius:4px;margin:0;color:#86efac;font-size:.78rem}
  .crit{color:#f87171}.high{color:#fb923c}.med{color:#facc15}.low{color:#60a5fa}
  .optimized{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;white-space:pre-wrap;font-family:monospace;font-size:.8rem;color:#86efac;overflow-x:auto}
  footer{margin-top:32px;font-size:.72rem;color:#475569;border-top:1px solid #1e293b;padding-top:12px}
</style>
</head>
<body>
<h1>🔍 CodeRefine Analysis Report</h1>
<p style="color:#64748b;margin:0 0 20px">${esc(now)} &nbsp;·&nbsp; ${esc(d.language)} &nbsp;·&nbsp; ${esc(d.provider)}</p>
<div class="score-block">
  <span class="score">${d.score}</span><span style="color:#94a3b8">/100</span><span class="grade" style="color:#a5b4fc">&nbsp;Grade ${grade}</span>
</div>
<div class="summary">${esc(d.summary)}</div>

<h2>Metrics</h2>
<table><tr><th>Metric</th><th>Bar</th><th>Value</th></tr>${metricRows}</table>

${bugRows ? `<h2>🐛 Bugs (${d.bugs.length})</h2><table><tr><th>Severity</th><th>Title</th><th>Description</th><th>Fix</th></tr>${bugRows}</table>`:""}
${secRows ? `<h2>🔒 Security Issues (${d.security.length})</h2><table><tr><th>Severity</th><th>Vulnerability</th><th>Description</th><th>Fix</th></tr>${secRows}</table>`:""}
${optRows ? `<h2>⚡ Optimizations (${d.optimizations.length})</h2><table><tr><th>Category</th><th>Title</th><th>Description</th><th>Suggestion</th></tr>${optRows}</table>`:""}

${d.optimized_code ? `<h2>✨ Improved Code</h2><div class="optimized">${esc(d.optimized_code)}</div>` : ""}

<footer>Generated by CodeRefine &nbsp;·&nbsp; Powered by ${esc(d.provider)}</footer>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `codereview_${(d.language||"").toLowerCase().replace(/[^a-z0-9]/g,"_")}_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("💾 Report saved!", "success");
}
// ── Render results ────────────────────────────────────────────────────────────
function renderResults(data) {
  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
  results.classList.add("flex");

  // Score ring
  const offset = 352 - (data.score / 100) * 352;
  scoreRing.style.setProperty("--t", offset);
  scoreRing.setAttribute("stroke", scoreColor(data.score));
  animNum(scoreVal, 0, data.score, 1200);

  // Grade
  const grade = getGrade(data.score);
  const gc = GRADE_CFG[grade];
  gradeBox.textContent = `Grade: ${grade}`;
  gradeBox.className = `px-5 py-1.5 rounded-full text-lg font-extrabold border-2 ${gc.color} ${gc.border} ${gc.bg}`;
  gradeBox.classList.remove("hidden");

  // Summary
  summaryText.textContent = data.summary;
  provBadge.textContent   = data.provider;

  // Counts
  bugCount.textContent = optCount.textContent = secCount.textContent = 0;
  bugBadge.textContent = optBadge.textContent = secBadge.textContent = 0;
  animNum(bugCount, 0, data.bugs.length, 600);
  animNum(optCount, 0, data.optimizations.length, 600);
  animNum(secCount, 0, data.security.length, 600);
  bugBadge.textContent = data.bugs.length;
  optBadge.textContent = data.optimizations.length;
  secBadge.textContent = data.security.length;

  // Bars
  setBar(bugBar, bugLbl, severityPct(data.bugs));
  setBar(optBar, optLbl, Math.min(data.optimizations.length * 12, 100));
  setBar(secBar, secLbl, severityPct(data.security));

  // Tabs
  activeTab = "bugs";
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === "bugs"));
  renderTabs(data, "bugs");

  // Metrics donuts
  renderMetrics(data.metrics || {});

  // Improved code
  renderImprovedCode(data);

  results.scrollIntoView({ behavior: "smooth" });
}

// ── Metric donut rings ────────────────────────────────────────────────────────
function renderMetrics(metrics) {
  metricsGrid.innerHTML = "";
  METRIC_CFG.forEach(({ key, label, color }) => {
    const pct    = Math.min(100, Math.max(0, Math.round(Number(metrics[key]) || 0)));
    const circ   = 163;
    const offset = circ - (pct / 100) * circ;
    const id     = `dm-${key}`;
    const card   = document.createElement("div");
    card.className = "flex flex-col items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-xl p-3";
    card.innerHTML = `
      <div class="relative">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="26" fill="none" stroke="#1f2937" stroke-width="7"/>
          <circle id="${id}" cx="36" cy="36" r="26" fill="none"
            stroke="${color}" stroke-width="7" stroke-linecap="round"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
            transform="rotate(-90 36 36)" style="--d:${offset}" class="donut-anim"/>
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <span id="${id}-v" class="text-sm font-extrabold text-white">0%</span>
        </div>
      </div>
      <p class="text-[11px] font-semibold text-gray-300 text-center">${esc(label)}</p>`;
    metricsGrid.appendChild(card);
    const v = card.querySelector(`#${id}-v`);
    animNum(null, 0, pct, 1300, n => v.textContent = n + "%");
  });
}

// ── Improved code panel ───────────────────────────────────────────────────────
function renderImprovedCode(data) {
  optimizedCode = data.optimized_code || "";
  rewriteLang.textContent = data.language || "";
  if (!optimizedCode.trim()) {
    rewriteBox.innerHTML = `<div class="flex items-center justify-center h-32 text-gray-600 text-sm">No rewrite returned.</div>`;
    return;
  }
  const lang = (data.language || "plaintext").toLowerCase().split(/[\s/]/)[0];
  rewriteBox.innerHTML = `<pre class="p-4 text-[12.5px] leading-relaxed"><code id="rwCode" class="language-${esc(lang)}">${esc(optimizedCode)}</code></pre>`;
  const el = document.getElementById("rwCode");
  if (el) hljs.highlightElement(el);
}

// ── Issue tabs ─────────────────────────────────────────────────────────────────
function renderTabs(data, tab) {
  tabContent.innerHTML = "";
  const items = tab === "bugs" ? data.bugs : tab === "optimizations" ? data.optimizations : data.security;
  if (!items.length) {
    const msgs = {
      bugs: ["No bugs found 🎉", "No bugs detected."],
      optimizations: ["No optimizations needed", "Code follows good practices."],
      security: ["No vulnerabilities found 🔒", "Passed security scan."],
    };
    const [t, d] = msgs[tab];
    tabContent.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-center gap-2">
      <p class="font-semibold text-gray-400">${t}</p>
      <p class="text-sm text-gray-600">${d}</p></div>`;
    return;
  }
  items.forEach(item => {
    const el = tab === "bugs" ? bugCard(item) : tab === "optimizations" ? optCard(item) : secCard(item);
    tabContent.appendChild(el);
  });
}

const SEV = {
  critical: { bg:"bg-red-950/60",    border:"border-red-900",    badge:"bg-red-950 text-red-400",    icon:"🔴" },
  high:     { bg:"bg-orange-950/50", border:"border-orange-900", badge:"bg-orange-950 text-orange-400", icon:"🟠" },
  medium:   { bg:"bg-yellow-950/40", border:"border-yellow-900", badge:"bg-yellow-950 text-yellow-400", icon:"🟡" },
  low:      { bg:"bg-blue-950/40",   border:"border-blue-900",   badge:"bg-blue-950 text-blue-400",   icon:"🔵" },
};

const CAT = {
  performance:     { icon:"⚡", badge:"bg-yellow-950 text-yellow-400" },
  readability:     { icon:"📖", badge:"bg-blue-950 text-blue-400" },
  best_practice:   { icon:"✅", badge:"bg-green-950 text-green-400" },
  maintainability: { icon:"🔧", badge:"bg-purple-950 text-purple-400" },
};

function bugCard(bug) {
  const sev = (bug.severity || "medium").toLowerCase();
  const c = SEV[sev] || SEV.medium;
  const d = document.createElement("div");
  d.className = `rounded-xl border p-4 ${c.bg} ${c.border} fade-in`;
  d.innerHTML = `
    <div class="flex items-start gap-2 mb-2">
      <span>${c.icon}</span>
      <span class="font-semibold text-sm text-white flex-1">${esc(bug.title || "Bug")}</span>
      ${bug.line ? `<span class="text-xs text-gray-500">L${bug.line}</span>` : ""}
      <span class="text-xs px-2 py-0.5 rounded-full ${c.badge}">${esc(sev)}</span>
    </div>
    <p class="text-sm text-gray-300 mb-2">${esc(bug.description)}</p>
    ${bug.fix ? `<div class="bg-gray-900/60 rounded-lg p-3 text-xs font-mono text-green-300 whitespace-pre-wrap">${esc(bug.fix)}</div>` : ""}`;
  return d;
}

function optCard(opt) {
  const cat = (opt.category || "performance").toLowerCase();
  const c = CAT[cat] || CAT.performance;
  const d = document.createElement("div");
  d.className = "rounded-xl border border-gray-700 p-4 bg-gray-800/40 fade-in";
  d.innerHTML = `
    <div class="flex items-start gap-2 mb-2">
      <span>${c.icon}</span>
      <span class="font-semibold text-sm text-white flex-1">${esc(opt.title || "Optimization")}</span>
      ${opt.line ? `<span class="text-xs text-gray-500">L${opt.line}</span>` : ""}
      <span class="text-xs px-2 py-0.5 rounded-full ${c.badge}">${esc(cat)}</span>
    </div>
    <p class="text-sm text-gray-300 mb-2">${esc(opt.description)}</p>
    ${opt.suggestion ? `<div class="bg-gray-900/60 rounded-lg p-3 text-xs font-mono text-blue-300 whitespace-pre-wrap">${esc(opt.suggestion)}</div>` : ""}`;
  return d;
}

function secCard(sec) {
  const sev = (sec.severity || "medium").toLowerCase();
  const c = SEV[sev] || SEV.medium;
  const d = document.createElement("div");
  d.className = `rounded-xl border p-4 ${c.bg} ${c.border} fade-in`;
  d.innerHTML = `
    <div class="flex items-start gap-2 mb-2">
      <span>🔒</span>
      <span class="font-semibold text-sm text-white flex-1">${esc(sec.vulnerability || "Vulnerability")}</span>
      ${sec.line ? `<span class="text-xs text-gray-500">L${sec.line}</span>` : ""}
      <span class="text-xs px-2 py-0.5 rounded-full ${c.badge}">${esc(sev)}</span>
    </div>
    <p class="text-sm text-gray-300 mb-2">${esc(sec.description)}</p>
    ${sec.fix ? `<div class="bg-gray-900/60 rounded-lg p-3 text-xs font-mono text-orange-300 whitespace-pre-wrap">${esc(sec.fix)}</div>` : ""}`;
  return d;
}

// ── History ──────────────────────────────────────────────────────────────────
const HISTORY_KEY = "coderefine_history";
const MAX_HISTORY = 20;

function saveToHistory(data, code) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    language: data.language,
    provider: data.provider,
    score: data.score,
    summary: data.summary,
    codeSnippet: code.slice(0, 120),
    fullData: data,
    fullCode: code,
  };
  historyItems.unshift(entry);
  if (historyItems.length > MAX_HISTORY) historyItems.length = MAX_HISTORY;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyItems)); } catch {}
  renderHistoryPanel();
}

function updateHistoryBadge() {
  // sidebar is always visible — no badge needed; count shown in sidebar header
  const cnt = document.getElementById("historyCount");
  if (cnt) cnt.textContent = historyItems.length;
}

function openHistory()  { /* sidebar is always open */ }
function closeHistory() { /* sidebar is always open */ }

function clearHistory() {
  if (!confirm("Clear all history?")) return;
  historyItems = [];
  localStorage.removeItem(HISTORY_KEY);
  renderHistoryPanel();
}

function deleteHistory(id, e) {
  e.stopPropagation();
  historyItems = historyItems.filter(h => h.id !== id);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyItems)); } catch {}
  renderHistoryPanel();
}

function restoreHistory(id) {
  const entry = historyItems.find(e => e.id === id);
  if (!entry) return;
  currentData = entry.fullData;
  codeInput.value = entry.fullCode;
  updateLineCount();
  langSel.value = entry.language;
  renderResults(entry.fullData);
  showToast("History entry restored", "info");
}

function renderHistoryPanel() {
  const list  = document.getElementById("historyList");
  const count = document.getElementById("historyCount");
  if (!list) return;
  if (count) count.textContent = historyItems.length;
  if (!historyItems.length) {
    list.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span class="text-4xl">\ud83d\udd50</span>
      <p class="text-sm text-gray-500">No history yet.<br>Run an analysis to get started.</p>
    </div>`;
    return;
  }
  list.innerHTML = historyItems.map(entry => {
    const grade   = getGrade(entry.score);
    const gc      = GRADE_CFG[grade];
    const date    = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString(undefined, { month:"short", day:"numeric" });
    const timeStr = date.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
    return `
    <div class="rounded-lg border border-gray-700/80 bg-gray-800/50 p-2.5 hover:border-indigo-600 hover:bg-gray-800 transition-all cursor-pointer group" onclick="restoreHistory(${entry.id})">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${gc.color} ${gc.border} ${gc.bg}">${grade}</span>
          <span class="text-xs font-bold text-white">${entry.score}<span class="text-[10px] text-gray-500">/100</span></span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[9px] text-gray-600">${dateStr} ${timeStr}</span>
          <button onclick="deleteHistory(${entry.id}, event)" class="text-gray-700 hover:text-red-500 text-xs leading-none px-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">×</button>
        </div>
      </div>
      <div class="flex items-center gap-1 mb-1 flex-wrap">
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">${esc(entry.language)}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400">${esc(entry.provider)}</span>
      </div>
      <p class="text-[10px] text-gray-500 leading-relaxed" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(entry.summary)}</p>
      <p class="text-[10px] text-gray-700 mt-1 font-mono truncate">${esc(entry.codeSnippet)}</p>
    </div>`;
  }).join("");
}

// ── Start ─────────────────────────────────────────────────────────────────────
renderHistoryPanel();
init();
