/**
 * controls.js — Event listeners, keyboard shortcuts, UI helpers
 */

const UI = (() => {
  function openShortcuts()  { _setModal("shortcuts-overlay", true);  }
  function closeShortcuts() { _setModal("shortcuts-overlay", false); }
  function openCustom()     { _setModal("custom-overlay", true);     }
  function closeCustom()    { _setModal("custom-overlay", false); document.getElementById("custom-error").textContent = ""; }
  function _setModal(id, open) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("modal-open", open);
    el.setAttribute("aria-hidden", String(!open));
  }
  return { openShortcuts, closeShortcuts, openCustom, closeCustom };
})();

const Controls = (() => {

  function init() {
    // Speed slider
    const speedSlider = document.getElementById("speed");
    const speedLabel  = document.getElementById("speed-label");
    if (speedSlider && speedLabel) {
      speedSlider.addEventListener("input", () => {
        speedLabel.textContent = speedSlider.value + "ms";
        App.onSpeedChange(parseInt(speedSlider.value, 10));
      });
    }

    // Volume slider
    const volSlider = document.getElementById("volume-slider");
    if (volSlider) {
      volSlider.addEventListener("input", () => {
        AudioEngine.setVolume(parseInt(volSlider.value, 10));
      });
    }

    // Program selector
    const programSelect = document.getElementById("program-select");
    if (programSelect) {
      programSelect.addEventListener("change", () => {
        const val = programSelect.value;
        if (val === "__custom__") { UI.openCustom(); programSelect.value = App.getCurrentKey(); return; }
        App.selectProgram(val);
      });
    }

    // Tape input — live validation
    const tapeInput = document.getElementById("tape-input");
    if (tapeInput) {
      tapeInput.addEventListener("input",   () => App.validateInput());
      tapeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") App.loadTape(); });
    }

    // Log verbose toggle
    const logVerbose = document.getElementById("log-verbose");
    if (logVerbose) {
      logVerbose.addEventListener("change", () => {
        if (!logVerbose.checked) Render.addLog(0, "Verbose logging disabled", "highlight");
      });
    }

    // Close modals on overlay click
    document.getElementById("shortcuts-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "shortcuts-overlay") UI.closeShortcuts();
    });
    document.getElementById("custom-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "custom-overlay") UI.closeCustom();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Close modal on Escape
      if (e.key === "Escape") { UI.closeShortcuts(); UI.closeCustom(); return; }

      // Don't intercept when typing
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      switch (e.key) {
        case "ArrowRight": case "s": e.preventDefault(); App.stepTM();     break;
        case " ":                    e.preventDefault(); App.toggleRun();  break;
        case "r": case "R":          e.preventDefault(); App.resetTM();    break;
        case "l": case "L":          e.preventDefault(); App.loadTape();   break;
        case "m": case "M":          e.preventDefault(); App.toggleMute(); break;
        case "+": case "=":          e.preventDefault(); App.speedUp();    break;
        case "-": case "_":          e.preventDefault(); App.speedDown();  break;
        case "?":                    e.preventDefault(); UI.openShortcuts(); break;
      }
    });
  }

  return { init };
})();
