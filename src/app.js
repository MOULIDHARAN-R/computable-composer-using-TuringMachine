/**
 * app.js — Top-level application orchestrator
 */

const App = (() => {

  const machine    = new Machine();
  let currentKey   = "inverter";
  let running      = false;
  let runInterval  = null;
  let melody       = [];
  let lastRuleIdx  = -1;
  let speedMs      = 500;
  let muted        = false;
  let computationStartTime = null;
  let loopWarningShown = false;

  const STEP_WARN_THRESHOLD = 500; // show loop warning after N steps without halt

  /* ── Init ──────────────────────────────────────────────────── */

  function init() {
    try {
      Controls.init();
      Render.initMusicBars(AudioEngine.getNoteScale());
      Render.buildProgramSelect(PROGRAMS, currentKey);
      selectProgram("inverter");
    } catch (e) {
      console.error("App.init failed:", e);
      Render.toast("Failed to initialise application. Please refresh.", "error", 8000);
    }
  }

  /* ── Program selection ─────────────────────────────────────── */

  function selectProgram(key) {
    if (!PROGRAMS[key]) {
      Render.toast(`Unknown program: '${key}'`, "error");
      return;
    }
    currentKey = key;
    const prog = PROGRAMS[key];
    const descEl = document.getElementById("prog-desc");
    if (descEl) descEl.textContent = prog.desc;
    const inputEl = document.getElementById("tape-input");
    if (inputEl) inputEl.value = prog.defaultInput;
    Render.transitionTable(prog);
    Render.updateProgMeta(prog);
    _hardReset();
    loadTape();
  }

  function getCurrentKey() { return currentKey; }

  /* ── Custom program loader ─────────────────────────────────── */

  function loadCustomProgram() {
    const name  = document.getElementById("custom-name")?.value.trim() || "Custom TM";
    const input = document.getElementById("custom-input")?.value.trim() || "";
    const q0Val = document.getElementById("custom-q0")?.value.trim() || "q0";
    const fVal  = document.getElementById("custom-F")?.value.trim() || "HALT";
    const txRaw = document.getElementById("custom-transitions")?.value.trim() || "";
    const errEl = document.getElementById("custom-error");
    errEl.textContent = "";

    const F = fVal.split(",").map(s => s.trim()).filter(Boolean);
    const transitions = [];
    const errors = [];
    const states = new Set([q0Val, ...F]);
    const gamma  = new Set(["B"]);

    txRaw.split("\n").forEach((line, i) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const parts = line.split(",").map(s => s.trim());
      if (parts.length < 5) { errors.push(`Line ${i+1}: expected state,read,write,dir,next[,note]`); return; }
      const [state, read, write, move, next, note] = parts;
      if (!["L","R","N"].includes(move.toUpperCase())) { errors.push(`Line ${i+1}: direction must be L, R, or N`); return; }
      states.add(state); states.add(next);
      gamma.add(read); gamma.add(write);
      transitions.push({ state, read, write, move: move.toUpperCase(), next, note: note || "C4" });
    });

    if (errors.length > 0) { errEl.textContent = errors[0]; return; }
    if (transitions.length === 0) { errEl.textContent = "No valid transition rules found"; return; }

    const prog = {
      name, desc: "Custom program", defaultInput: input,
      Q: [...states], sigma: [...gamma].filter(c => c !== "B"),
      gamma: [...gamma], q0: q0Val, B: "B", F: [...F], transitions,
    };

    const validationErrors = Machine.validateProgram(prog);
    if (validationErrors.length > 0) { errEl.textContent = validationErrors[0]; return; }

    // Add to PROGRAMS and select it
    const key = "__custom__" + Date.now();
    PROGRAMS[key] = prog;
    currentKey = key;
    Render.buildProgramSelect(PROGRAMS, key);

    const descEl = document.getElementById("prog-desc");
    if (descEl) descEl.textContent = prog.desc;
    const inputEl = document.getElementById("tape-input");
    if (inputEl) inputEl.value = input;
    Render.transitionTable(prog);
    Render.updateProgMeta(prog);
    _hardReset();
    UI.closeCustom();
    loadTape();
    Render.toast("Custom TM loaded successfully!", "success");
  }

  /* ── Input validation (live) ───────────────────────────────── */

  function validateInput() {
    const inputEl = document.getElementById("tape-input");
    if (!inputEl) return true;
    const raw = inputEl.value;
    if (raw.trim() === "") { Render.inputValidation(""); return true; }
    const prog = PROGRAMS[currentKey];
    if (!prog) return true;
    const errors = Machine.validateInput(raw, prog);
    if (errors.length > 0) {
      Render.inputValidation("invalid", errors[0]);
      return false;
    }
    Render.inputValidation("valid");
    return true;
  }

  /* ── Load tape ─────────────────────────────────────────────── */

  function loadTape() {
    _stopRun();
    const inputEl = document.getElementById("tape-input");
    const raw = inputEl ? inputEl.value : "";
    const prog = PROGRAMS[currentKey];

    if (!prog) { Render.toast("No program selected", "error"); return; }

    // Validate before loading
    if (!validateInput()) {
      Render.toast("Fix input errors before loading", "error");
      return;
    }

    try {
      machine.load(raw, prog);
    } catch (e) {
      Render.inputValidation("invalid", e.message);
      Render.toast(e.message, "error");
      Render.addLog(0, "✗ Load failed: " + e.message, "highlight");
      return;
    }

    melody       = [];
    lastRuleIdx  = -1;
    loopWarningShown = false;
    computationStartTime = null;

    Render.tape(machine.tape, machine.head);
    Render.id(machine.getID());
    Render.stateBoxes("", "", "", "", machine.state);
    Render.status("idle", "Tape loaded · Ready to compute");
    Render.stepCounter(0);
    Render.note("—");
    Render.melodyRow([]);
    Render.clearLog();
    Render.highlightRule(-1, -1);
    Render.stats({ steps: 0, writes: 0, leftMoves: 0, rightMoves: 0 });
    Render.showLoopWarning(false);
    Render.setButtonState({ step: true, run: true, runLabel: "Run ▶" });
    Render.updateFireCounts({}, prog.transitions.length);
    const replayBtn = document.getElementById("replay-btn");
    if (replayBtn) replayBtn.disabled = true;

    Render.addLog(0, "Tape loaded: " + machine.getTapeContent(), "highlight");
    Render.addLog(0, `Program: ${prog.name} · ${prog.transitions.length} rules · ${prog.Q.length} states`, "highlight");
  }

  /* ── Step ──────────────────────────────────────────────────── */

  async function stepTM() {
    if (machine.isHalted) return;
    await AudioEngine.init();

    if (!computationStartTime) computationStartTime = Date.now();

    const prevHead = machine.head;
    const result   = machine.step();

    if (!result) return;

    // Flash written cell
    if (result.didWrite) Render.flashCell(prevHead);

    Render.tape(machine.tape, machine.head);
    Render.id(machine.getID());
    Render.stateBoxes(result.prevState, result.read, result.write, result.move, machine.state);
    Render.stepCounter(result.stepCount);
    Render.highlightRule(result.ruleIndex, lastRuleIdx);
    lastRuleIdx = result.ruleIndex;

    // Stats
    if (result.stats) {
      Render.stats({
        steps:      result.stepCount,
        writes:     result.stats.writes,
        leftMoves:  result.stats.leftMoves,
        rightMoves: result.stats.rightMoves,
      });
      Render.updateFireCounts(result.stats.ruleFireCounts, PROGRAMS[currentKey]?.transitions.length || 0);
    }

    // Loop detection
    if (!loopWarningShown && result.stepCount >= STEP_WARN_THRESHOLD) {
      loopWarningShown = true;
      Render.showLoopWarning(true);
      Render.addLog(result.stepCount, `⚠ ${STEP_WARN_THRESHOLD}+ steps — possible infinite loop`, "highlight");
    }

    if (!result.ok) {
      _stopRun();
      AudioEngine.playErrorTone();
      let msg = result.error?.message || "Unknown error";
      if (result.error?.code === "STEP_LIMIT") {
        Render.status("error", "Step limit reached — possible infinite loop");
        Render.showLoopWarning(true);
      } else if (result.error?.code === "NO_TRANSITION") {
        Render.status("error", `No transition for (${result.prevState}, '${result.read}')`);
        Render.stateBoxes(result.prevState, result.read, "", "", "ERROR");
      } else if (result.error?.code === "TAPE_OVERFLOW") {
        Render.status("error", "Tape overflow — computation terminated");
      } else {
        Render.status("error", msg);
      }
      Render.addLog(result.stepCount ?? machine.stepCount, "✗ " + msg, "log-error");
      Render.setButtonState({ step: false, run: false });
      Render.toast(msg, "error");
      _recordHistory(false, msg);
      return;
    }

    // Music
    AudioEngine.playNote(result.note);
    Render.note(result.note);
    Render.musicBars(result.note, AudioEngine.getNoteScale());
    melody.push(result.note);
    Render.melodyRow(melody);

    // Log
    const verbose = document.getElementById("log-verbose");
    if (verbose?.checked) {
      Render.addLog(
        result.stepCount,
        `δ(${result.prevState}, ${result.read}) → (${result.nextState}, ${result.write}, ${result.move})  ♪ ${result.note}`,
        "note-log"
      );
    }

    // Halt
    if (result.halted) {
      _stopRun();
      AudioEngine.playHaltChord();
      Render.status("halted", "HALTED · Computation complete!");
      Render.addLog(result.stepCount, "✓ Machine halted successfully", "success");
      Render.addLog(result.stepCount, `Final tape: ${machine.getTapeContent()}`, "success");
      Render.setButtonState({ step: false, run: false });
      Render.stateBoxes(result.prevState, result.read, result.write, result.move, "HALT");
      Render.showLoopWarning(false);
      const replayBtn = document.getElementById("replay-btn");
      if (replayBtn) replayBtn.disabled = false;
      _recordHistory(true);
      Render.toast(`Done in ${result.stepCount} steps!`, "success");
    }
  }

  /* ── Run / Pause ────────────────────────────────────────────── */

  function toggleRun() {
    if (machine.isHalted) return;
    if (running) {
      _stopRun();
      Render.status("idle", "Paused");
      Render.setButtonState({ step: true, run: true, runLabel: "Run ▶" });
    } else {
      _startRun();
    }
  }

  function _startRun() {
    running = true;
    Render.status("running", "Computing…");
    Render.setButtonState({ step: false, run: true, runLabel: "Pause ⏸" });
    runInterval = setInterval(async () => {
      if (machine.isHalted || !running) { _stopRun(); return; }
      await stepTM();
    }, speedMs);
  }

  function _stopRun() {
    if (runInterval) { clearInterval(runInterval); runInterval = null; }
    running = false;
  }

  /* ── Reset ──────────────────────────────────────────────────── */

  function resetTM() {
    _stopRun();
    try { machine.reset(); } catch (e) { Render.toast("Reset failed: " + e.message, "error"); return; }
    melody       = [];
    lastRuleIdx  = -1;
    loopWarningShown = false;
    computationStartTime = null;

    Render.tape(machine.tape, machine.head);
    Render.id(machine.getID());
    Render.stateBoxes("", "", "", "", machine.state);
    Render.status("idle", "Reset · Load a tape to begin");
    Render.stepCounter(0);
    Render.note("—");
    Render.melodyRow([]);
    Render.clearLog();
    Render.highlightRule(-1, -1);
    Render.stats({ steps: 0, writes: 0, leftMoves: 0, rightMoves: 0 });
    Render.showLoopWarning(false);
    Render.setButtonState({ step: true, run: true, runLabel: "Run ▶" });
    Render.updateFireCounts({}, PROGRAMS[currentKey]?.transitions.length || 0);
    const replayBtn = document.getElementById("replay-btn");
    if (replayBtn) replayBtn.disabled = true;
  }

  function _hardReset() {
    _stopRun();
    melody = []; lastRuleIdx = -1; loopWarningShown = false; computationStartTime = null;
    Render.clearLog(); Render.note("—"); Render.melodyRow([]);
    Render.stats({ steps: 0, writes: 0, leftMoves: 0, rightMoves: 0 });
    Render.showLoopWarning(false);
    Render.inputValidation("");
  }

  /* ── Speed ──────────────────────────────────────────────────── */

  function onSpeedChange(ms) {
    speedMs = ms;
    if (running) { _stopRun(); _startRun(); }
  }

  function speedUp() {
    const slider = document.getElementById("speed");
    const label  = document.getElementById("speed-label");
    if (!slider) return;
    const next = Math.max(50, parseInt(slider.value) - 100);
    slider.value = next;
    if (label) label.textContent = next + "ms";
    onSpeedChange(next);
  }

  function speedDown() {
    const slider = document.getElementById("speed");
    const label  = document.getElementById("speed-label");
    if (!slider) return;
    const next = Math.min(1500, parseInt(slider.value) + 100);
    slider.value = next;
    if (label) label.textContent = next + "ms";
    onSpeedChange(next);
  }

  /* ── Mute ───────────────────────────────────────────────────── */

  function toggleMute() {
    muted = !muted;
    AudioEngine.setMuted(muted);
    Render.setMuteIcon(muted);
    Render.toast(muted ? "Audio muted" : "Audio unmuted", "info", 1500);
  }

  /* ── Export log ─────────────────────────────────────────────── */

  function exportLog() {
    const log = document.getElementById("exec-log");
    if (!log || log.children.length === 0) { Render.toast("Log is empty", "info"); return; }
    const lines = [...log.querySelectorAll(".log-entry")].map(el => el.textContent).join("\n");
    const blob  = new Blob([lines], { type: "text/plain" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href      = url;
    a.download  = `tm-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    Render.toast("Log exported!", "success");
  }

  /* ── Replay melody ──────────────────────────────────────────── */

  async function replayMelody() {
    if (melody.length === 0) { Render.toast("No melody to replay", "info"); return; }
    await AudioEngine.init();
    Render.toast("Replaying melody…", "info", melody.length * 260);
    await AudioEngine.replaySequence(melody, Math.max(100, speedMs * 0.5));
  }

  /* ── Clear log ──────────────────────────────────────────────── */

  function clearLog() { Render.clearLog(); }

  /* ── Clear history ──────────────────────────────────────────── */

  function clearHistory() { Render.clearHistory(); }

  /* ── Record history ─────────────────────────────────────────── */

  function _recordHistory(halted, errorMsg) {
    const prog      = PROGRAMS[currentKey];
    const inputEl   = document.getElementById("tape-input");
    const inputStr  = inputEl?.value.replace(/\s+/g,"").toUpperCase() || "—";
    const elapsed   = computationStartTime ? ((Date.now() - computationStartTime) / 1000).toFixed(2) + "s" : "—";
    Render.addHistory({
      programName: prog?.name || currentKey,
      input:  inputStr.length > 12 ? inputStr.slice(0, 12) + "…" : inputStr,
      output: halted ? machine.getTapeContent().replace(/B+$/,"") || "B" : ("Error: " + (errorMsg || "?")),
      steps:  machine.stepCount,
      notes:  melody.length,
      time:   elapsed,
      halted,
      error:  !halted,
    });
  }

  return {
    init, selectProgram, getCurrentKey,
    loadTape, loadCustomProgram, validateInput,
    stepTM, toggleRun, resetTM,
    onSpeedChange, speedUp, speedDown,
    toggleMute, exportLog, replayMelody,
    clearLog, clearHistory,
  };

})();

document.addEventListener("DOMContentLoaded", () => App.init());
