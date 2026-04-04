/**
 * render.js — DOM rendering helpers
 */

const Render = (() => {

  /* ── Tape ──────────────────────────────────────────────────── */

  function tape(tapeArr, head) {
    const container = document.getElementById("tape-cells");
    if (!container) return;
    const start = Math.max(0, head - 4);
    const end   = Math.min(tapeArr.length - 1, head + 11);
    container.innerHTML = "";
    for (let i = start; i <= end; i++) {
      const sym  = tapeArr[i] ?? "B";
      const cell = document.createElement("div");
      cell.className = "tape-cell sym-" + (sym === "B" ? "B" : sym);
      cell.id = "cell-" + i;
      if (i === head) cell.classList.add("active");
      if (i === head) {
        const arrow = document.createElement("div");
        arrow.className = "head-arrow";
        arrow.textContent = "▼";
        cell.appendChild(arrow);
      }
      const symEl = document.createElement("div");
      symEl.className = "cell-sym";
      symEl.textContent = sym === "B" ? "□" : sym;
      const idxEl = document.createElement("div");
      idxEl.className = "cell-idx";
      idxEl.textContent = i;
      cell.appendChild(symEl);
      cell.appendChild(idxEl);
      container.appendChild(cell);
    }
    const headEl = document.getElementById("cell-" + head);
    if (headEl) headEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    // Tape stats
    const nonBlank = tapeArr.filter(c => c !== "B").length;
    _setText("tape-length-stat", `Length: ${nonBlank}`);
    _setText("head-pos-stat", `Head: ${head}`);
    const pct = Math.min(100, Math.round((tapeArr.length / 500) * 100));
    const fill = document.getElementById("tape-progress");
    if (fill) fill.style.width = pct + "%";
  }

  /* ── Input validation icon ──────────────────────────────────── */

  function inputValidation(state, message) {
    const icon  = document.getElementById("input-validation-icon");
    const errEl = document.getElementById("tape-input-error");
    const input = document.getElementById("tape-input");
    if (!icon || !errEl || !input) return;
    icon.className    = "input-validation-icon";
    errEl.textContent = "";
    input.classList.remove("input-valid", "input-invalid");
    if (state === "valid") {
      icon.className = "input-validation-icon valid";
      icon.innerHTML = "✓";
      input.classList.add("input-valid");
    } else if (state === "invalid") {
      icon.className = "input-validation-icon invalid";
      icon.innerHTML = "✕";
      input.classList.add("input-invalid");
      errEl.textContent = message || "Invalid input";
    } else {
      icon.innerHTML = "";
    }
  }

  /* ── State boxes ────────────────────────────────────────────── */

  function stateBoxes(prevState, read, write, move, currentState) {
    _setText("disp-state", currentState || "—");
    _setText("disp-read",  read  || "—");
    _setText("disp-write", write || "—");
    _setText("disp-move",  _fmtMove(move));
    const box = document.getElementById("box-state");
    if (!box) return;
    box.classList.remove("active-state", "halt-state", "error-state");
    if      (currentState === "HALT")          box.classList.add("halt-state");
    else if (currentState === "ERROR")         box.classList.add("error-state");
    else if (currentState)                     box.classList.add("active-state");
  }

  /* ── ID display ─────────────────────────────────────────────── */

  function id(idObj) {
    const el = document.getElementById("id-display");
    if (!el) return;
    if (!idObj) { el.innerHTML = '<span class="id-placeholder">Load a tape to begin…</span>'; return; }
    el.innerHTML =
      `<span class="id-text">${_esc(idObj.left)}</span>` +
      `<span class="id-state">${_esc(idObj.state)}</span>` +
      `<span class="id-text">${_esc(idObj.right)}</span>`;
  }

  /* ── Transition table ───────────────────────────────────────── */

  function transitionTable(program) {
    const tbody = document.getElementById("trans-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    // Populate select options too
    const sel = document.getElementById("program-select");
    program.transitions.forEach((t, i) => {
      const tr = document.createElement("tr");
      tr.id = "rule-" + i;
      tr.innerHTML = `
        <td>(${_esc(t.state)}, ${_esc(t.read)})</td>
        <td>${_esc(t.write)} → ${_esc(t.next)}</td>
        <td>${_esc(_fmtMove(t.move))}</td>
        <td><span class="note-pill">${_esc(t.note || "—")}</span></td>
        <td class="col-fires"><span class="fire-count" id="fc-${i}">0</span></td>
      `;
      tbody.appendChild(tr);
    });
    updateTransCoverage({}, program.transitions.length);
  }

  function highlightRule(index, prevIndex) {
    if (prevIndex >= 0) {
      const prev = document.getElementById("rule-" + prevIndex);
      if (prev) prev.classList.remove("active-rule");
    }
    if (index >= 0) {
      const row = document.getElementById("rule-" + index);
      if (row) { row.classList.add("active-rule"); row.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    }
  }

  function updateFireCounts(ruleFireCounts, totalRules) {
    Object.entries(ruleFireCounts).forEach(([idx, count]) => {
      const el = document.getElementById("fc-" + idx);
      if (el) el.textContent = count;
    });
    updateTransCoverage(ruleFireCounts, totalRules);
  }

  function updateTransCoverage(counts, total) {
    const fired = Object.keys(counts).length;
    const el = document.getElementById("trans-coverage");
    if (el) el.textContent = `Coverage: ${fired} / ${total} rules fired`;
  }

  /* ── Flash cell ─────────────────────────────────────────────── */

  function flashCell(cellIndex) {
    const el = document.getElementById("cell-" + cellIndex);
    if (!el) return;
    el.classList.add("just-written");
    setTimeout(() => el.classList.remove("just-written"), 450);
  }

  /* ── Status bar ─────────────────────────────────────────────── */

  function status(type, message) {
    const bar = document.getElementById("status-bar");
    const txt = document.getElementById("status-text");
    if (!bar || !txt) return;
    bar.className = "status-bar " + type;
    txt.textContent = message;
  }

  /* ── Log ────────────────────────────────────────────────────── */

  function addLog(stepCount, message, cls) {
    const log = document.getElementById("exec-log");
    if (!log) return;
    const verbose = document.getElementById("log-verbose");
    if (!verbose?.checked && cls === "note-log") return; // skip verbose if off
    const entry = document.createElement("div");
    entry.className = "log-entry" + (cls ? " " + cls : "");
    const ts = document.createElement("span");
    ts.className = "ts";
    ts.textContent = "[" + String(stepCount).padStart(4, "0") + "]";
    entry.appendChild(ts);
    entry.appendChild(document.createTextNode(message));
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    // Update count
    const countEl = document.getElementById("log-count");
    if (countEl) {
      const n = log.querySelectorAll(".log-entry").length;
      countEl.textContent = n + (n === 1 ? " entry" : " entries");
    }
  }

  function clearLog() {
    const log = document.getElementById("exec-log");
    if (log) log.innerHTML = "";
    const countEl = document.getElementById("log-count");
    if (countEl) countEl.textContent = "0 entries";
  }

  /* ── Music ──────────────────────────────────────────────────── */

  function note(noteStr) { _setText("note-display", noteStr || "—"); }

  function melodyRow(melodyArr) {
    const row = document.getElementById("melody-row");
    if (!row) return;
    if (!melodyArr || melodyArr.length === 0) {
      row.innerHTML = '<span class="melody-empty">—</span>';
      return;
    }
    row.innerHTML = "";
    melodyArr.forEach((n, i) => {
      const span = document.createElement("span");
      span.className = "melody-note" + (i === melodyArr.length - 1 ? " current" : "");
      span.textContent = n;
      row.appendChild(span);
    });
  }

  function initMusicBars(scale) {
    const viz = document.getElementById("music-viz");
    if (!viz) return;
    viz.innerHTML = "";
    scale.forEach((n, i) => {
      const b = document.createElement("div");
      b.className = "music-bar";
      b.id = "bar-" + i;
      b.style.height = (14 + i * 2.2).toFixed(0) + "px";
      viz.appendChild(b);
    });
  }

  function musicBars(noteStr, scale) {
    document.querySelectorAll(".music-bar").forEach(b => b.classList.remove("active"));
    const idx = scale.indexOf(noteStr);
    if (idx < 0) return;
    const bar = document.getElementById("bar-" + idx);
    if (bar) { bar.classList.add("active"); setTimeout(() => bar.classList.remove("active"), 450); }
  }

  /* ── Stats ──────────────────────────────────────────────────── */

  function stats(s) {
    _setText("stat-steps",  s.steps  ?? 0);
    _setText("stat-writes", s.writes ?? 0);
    _setText("stat-left",   s.leftMoves  ?? 0);
    _setText("stat-right",  s.rightMoves ?? 0);
  }

  /* ── Loop warning ───────────────────────────────────────────── */

  function showLoopWarning(show) {
    const el = document.getElementById("loop-warning");
    if (el) el.hidden = !show;
  }

  /* ── Counters ───────────────────────────────────────────────── */

  function stepCounter(n) { _setText("step-counter", "Step: " + n); }

  function setButtonState({ step, run, runLabel }) {
    const btnStep = document.getElementById("btn-step");
    const btnRun  = document.getElementById("btn-run");
    const replay  = document.getElementById("replay-btn");
    if (btnStep) btnStep.disabled = !step;
    if (btnRun)  { btnRun.disabled = !run; if (runLabel) btnRun.textContent = runLabel; }
    if (replay)  replay.disabled = !step; // enabled when step is enabled (i.e. loaded)
  }

  /* ── Toast ──────────────────────────────────────────────────── */

  let _toastTimer = null;
  function toast(message, type = "info", duration = 3000) {
    const el = document.getElementById("toast");
    if (!el) return;
    clearTimeout(_toastTimer);
    el.textContent = message;
    el.className   = "toast toast-" + type + " toast-visible";
    _toastTimer = setTimeout(() => { el.className = "toast"; }, duration);
  }

  /* ── Computation history ────────────────────────────────────── */

  function addHistory(entry) {
    const list = document.getElementById("history-list");
    if (!list) return;
    const empty = list.querySelector(".history-empty");
    if (empty) empty.remove();

    const item = document.createElement("div");
    item.className = "history-item" + (entry.error ? " history-error" : entry.halted ? " history-ok" : "");
    item.innerHTML = `
      <div class="history-prog">${_esc(entry.programName)}</div>
      <div class="history-io">
        <span class="history-input">${_esc(entry.input)}</span>
        <span class="history-arrow">→</span>
        <span class="history-output ${entry.error ? "err" : "ok"}">${_esc(entry.output)}</span>
      </div>
      <div class="history-meta">${entry.steps} steps · ${entry.notes} notes · ${entry.time}</div>
    `;
    list.insertBefore(item, list.firstChild);

    // Cap at 10 entries
    const items = list.querySelectorAll(".history-item");
    if (items.length > 10) items[items.length - 1].remove();
  }

  function clearHistory() {
    const list = document.getElementById("history-list");
    if (list) list.innerHTML = '<span class="history-empty">No computations run yet.</span>';
  }

  /* ── Program select ─────────────────────────────────────────── */

  function buildProgramSelect(programs, currentKey) {
    const sel = document.getElementById("program-select");
    if (!sel) return;
    sel.innerHTML = "";
    Object.entries(programs).forEach(([key, prog]) => {
      const opt = document.createElement("option");
      opt.value    = key;
      opt.selected = key === currentKey;
      opt.textContent = prog.name;
      sel.appendChild(opt);
    });
    // Add custom divider + option
    const divider = document.createElement("option");
    divider.disabled = true;
    divider.textContent = "──────────────";
    sel.appendChild(divider);
    const custom = document.createElement("option");
    custom.value = "__custom__";
    custom.textContent = "Custom TM…";
    sel.appendChild(custom);
  }

  function updateProgMeta(prog) {
    const el = document.getElementById("prog-meta");
    if (!el) return;
    el.innerHTML = prog
      ? `<span class="meta-pill">${prog.Q.length} states</span>` +
        `<span class="meta-pill">${prog.transitions.length} rules</span>` +
        (prog.complexity ? `<span class="meta-pill">${prog.complexity}</span>` : "")
      : "";
  }

  /* ── Mute icon ──────────────────────────────────────────────── */

  function setMuteIcon(muted) {
    const waves = document.getElementById("sound-waves");
    if (!waves) return;
    waves.style.display = muted ? "none" : "";
    const btn = document.getElementById("mute-btn");
    if (btn) btn.classList.toggle("muted", muted);
  }

  /* ── Private ────────────────────────────────────────────────── */

  function _setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function _esc(str) {
    return String(str ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function _fmtMove(move) {
    if (move === "R") return "→ R";
    if (move === "L") return "← L";
    if (move === "N") return "· N";
    return "—";
  }

  return {
    tape, inputValidation, stateBoxes, id,
    transitionTable, highlightRule, updateFireCounts, flashCell,
    status, addLog, clearLog, note, melodyRow,
    initMusicBars, musicBars, stats, showLoopWarning,
    stepCounter, setButtonState, toast,
    addHistory, clearHistory, buildProgramSelect, updateProgMeta, setMuteIcon,
  };

})();
