/**
 * machine.js — Deterministic Turing Machine core engine
 * M = (Q, Σ, Γ, δ, q₀, B, F)
 */

const MachineErrors = {
  NO_PROGRAM:      "NO_PROGRAM",
  ALREADY_HALTED:  "ALREADY_HALTED",
  NO_TRANSITION:   "NO_TRANSITION",
  TAPE_OVERFLOW:   "TAPE_OVERFLOW",
  STEP_LIMIT:      "STEP_LIMIT",
  INVALID_INPUT:   "INVALID_INPUT",
  INVALID_PROGRAM: "INVALID_PROGRAM",
};

const MAX_TAPE_LENGTH = 500;
const DEFAULT_STEP_LIMIT = 10000;

class MachineError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.code = code;
    this.context = context;
    this.name = "MachineError";
  }
}

class Machine {

  constructor() {
    this.tape          = [];
    this.head          = 0;
    this.state         = "";
    this.program       = null;
    this.stepCount     = 0;
    this.isHalted      = false;
    this.isError       = false;
    this.lastError     = null;
    this.stepLimit     = DEFAULT_STEP_LIMIT;
    this._inputSnapshot = [];
    // Stats
    this.stats = { writes: 0, leftMoves: 0, rightMoves: 0, ruleFireCounts: {} };
  }

  /* ── Validation ─────────────────────────────────────────────── */

  static validateProgram(prog) {
    const errors = [];
    if (!prog) { errors.push("Program is null or undefined"); return errors; }
    if (!Array.isArray(prog.Q) || prog.Q.length === 0) errors.push("Q (states) must be a non-empty array");
    if (!Array.isArray(prog.F) || prog.F.length === 0) errors.push("F (accept states) must be a non-empty array");
    if (!prog.q0 || typeof prog.q0 !== "string") errors.push("q0 (initial state) must be a string");
    if (!prog.B  || typeof prog.B  !== "string") errors.push("B (blank symbol) must be a string");
    if (!Array.isArray(prog.gamma) || prog.gamma.length === 0) errors.push("Γ (tape alphabet) must be a non-empty array");
    if (!Array.isArray(prog.transitions)) errors.push("transitions must be an array");
    if (prog.q0 && prog.Q && !prog.Q.includes(prog.q0)) errors.push(`Initial state '${prog.q0}' not in Q`);
    if (prog.F && prog.Q) {
      prog.F.forEach(f => { if (!prog.Q.includes(f)) errors.push(`Accept state '${f}' not in Q`); });
    }
    if (Array.isArray(prog.transitions)) {
      prog.transitions.forEach((t, i) => {
        const prefix = `Rule[${i}]`;
        if (!t.state) errors.push(`${prefix}: missing state`);
        if (t.read  === undefined) errors.push(`${prefix}: missing read symbol`);
        if (t.write === undefined) errors.push(`${prefix}: missing write symbol`);
        if (!["L","R","N"].includes(t.move)) errors.push(`${prefix}: move must be L, R, or N`);
        if (!t.next) errors.push(`${prefix}: missing next state`);
        if (prog.Q && t.state && !prog.Q.includes(t.state)) errors.push(`${prefix}: state '${t.state}' not in Q`);
        if (prog.Q && t.next  && !prog.Q.includes(t.next))  errors.push(`${prefix}: next state '${t.next}' not in Q`);
        if (prog.gamma && t.write !== undefined && !prog.gamma.includes(t.write)) errors.push(`${prefix}: write symbol '${t.write}' not in Γ`);
      });
      // Check for duplicate rules (same state + read)
      const seen = new Set();
      prog.transitions.forEach((t, i) => {
        const key = `${t.state}:${t.read}`;
        if (seen.has(key)) errors.push(`Duplicate rule for (${t.state}, ${t.read})`);
        seen.add(key);
      });
    }
    return errors;
  }

  static validateInput(inputStr, prog) {
    const errors = [];
    if (!inputStr && inputStr !== "") { errors.push("Input is null"); return errors; }
    if (!prog) { errors.push("No program loaded"); return errors; }
    const cleaned = inputStr.replace(/\s+/g, "").toUpperCase();
    if (cleaned.length > MAX_TAPE_LENGTH - 4) {
      errors.push(`Input too long (max ${MAX_TAPE_LENGTH - 4} symbols)`);
    }
    const invalid = cleaned.split("").filter(c => !prog.gamma.includes(c));
    if (invalid.length > 0) {
      const unique = [...new Set(invalid)];
      errors.push(`Invalid symbols: ${unique.map(c => `'${c}'`).join(", ")} — not in Γ = {${prog.gamma.join(", ")}}`);
    }
    return errors;
  }

  /* ── Load ───────────────────────────────────────────────────── */

  load(inputStr, program) {
    // Validate program
    const progErrors = Machine.validateProgram(program);
    if (progErrors.length > 0) {
      throw new MachineError(MachineErrors.INVALID_PROGRAM, progErrors[0], { errors: progErrors });
    }
    // Validate input
    const inputErrors = Machine.validateInput(inputStr, program);
    if (inputErrors.length > 0) {
      throw new MachineError(MachineErrors.INVALID_INPUT, inputErrors[0], { errors: inputErrors });
    }

    this.program = program;
    const cleaned = inputStr.replace(/\s+/g, "").toUpperCase();
    const chars   = cleaned.split("").filter(c => program.gamma.includes(c));
    const valid   = chars.length > 0 ? chars : [program.B];

    this.tape           = [...valid, program.B, program.B, program.B, program.B];
    this._inputSnapshot = [...this.tape];
    this.head           = 0;
    this.state          = program.q0;
    this.stepCount      = 0;
    this.isHalted       = false;
    this.isError        = false;
    this.lastError      = null;
    this.stats          = { writes: 0, leftMoves: 0, rightMoves: 0, ruleFireCounts: {} };
  }

  /* ── Step ───────────────────────────────────────────────────── */

  step() {
    if (!this.program) {
      const err = new MachineError(MachineErrors.NO_PROGRAM, "No program loaded");
      this.isError = true; this.lastError = err; this.isHalted = true;
      return { ok: false, error: err };
    }
    if (this.isHalted) {
      return { ok: false, error: new MachineError(MachineErrors.ALREADY_HALTED, "Machine is already halted") };
    }
    if (this.stepCount >= this.stepLimit) {
      const err = new MachineError(MachineErrors.STEP_LIMIT,
        `Step limit of ${this.stepLimit} reached — possible infinite loop`, { limit: this.stepLimit });
      this.isError = true; this.lastError = err; this.isHalted = true;
      return { ok: false, error: err, stepLimitReached: true };
    }
    if (this.tape.length > MAX_TAPE_LENGTH) {
      const err = new MachineError(MachineErrors.TAPE_OVERFLOW,
        `Tape overflow: exceeded ${MAX_TAPE_LENGTH} cells`, { length: this.tape.length });
      this.isError = true; this.lastError = err; this.isHalted = true;
      return { ok: false, error: err };
    }

    const sym  = this._read();
    const rule = this._findRule(this.state, sym);

    if (!rule) {
      const err = new MachineError(MachineErrors.NO_TRANSITION,
        `No transition defined for (${this.state}, '${sym}')`,
        { state: this.state, symbol: sym });
      this.isError = true; this.lastError = err; this.isHalted = true;
      return { ok: false, error: err, prevState: this.state, read: sym };
    }

    const prevState  = this.state;
    const prevHead   = this.head;
    const ruleIndex  = this.program.transitions.indexOf(rule);
    const prevSymbol = sym;

    // Write
    const didWrite = rule.write !== sym;
    this._write(rule.write);
    if (didWrite) this.stats.writes++;

    // Move
    this._moveHead(rule.move);
    if (rule.move === "L") this.stats.leftMoves++;
    if (rule.move === "R") this.stats.rightMoves++;

    // Fire count
    this.stats.ruleFireCounts[ruleIndex] = (this.stats.ruleFireCounts[ruleIndex] || 0) + 1;

    // Transition
    this.state = rule.next;
    this.stepCount++;

    if (this.program.F.includes(this.state)) {
      this.isHalted = true;
    }

    return {
      ok: true,
      prevState,
      prevHead,
      read:      prevSymbol,
      write:     rule.write,
      move:      rule.move,
      nextState: rule.next,
      note:      rule.note,
      ruleIndex,
      stepCount: this.stepCount,
      halted:    this.isHalted,
      didWrite,
      tape:      [...this.tape],
      head:      this.head,
      stats:     { ...this.stats },
    };
  }

  /* ── Reset ──────────────────────────────────────────────────── */

  reset() {
    this.tape      = [...this._inputSnapshot];
    this.head      = 0;
    this.state     = this.program ? this.program.q0 : "";
    this.stepCount = 0;
    this.isHalted  = false;
    this.isError   = false;
    this.lastError = null;
    this.stats     = { writes: 0, leftMoves: 0, rightMoves: 0, ruleFireCounts: {} };
  }

  /* ── ID ─────────────────────────────────────────────────────── */

  getID() {
    const t = this.tape.map(c => c === "B" ? "□" : c);
    return {
      left:  t.slice(0, this.head).join(""),
      state: this.state,
      right: t.slice(this.head).join("") || "□",
    };
  }

  /* ── Tape content summary ───────────────────────────────────── */

  getTapeContent() {
    const content = this.tape.join("").replace(/B+$/, "");
    return content.length === 0 ? "B" : content;
  }

  /* ── Private helpers ────────────────────────────────────────── */

  _read() {
    while (this.head >= this.tape.length) this.tape.push("B");
    return this.tape[this.head];
  }

  _write(symbol) {
    while (this.head >= this.tape.length) this.tape.push("B");
    this.tape[this.head] = symbol;
  }

  _moveHead(direction) {
    if (direction === "R") {
      this.head++;
      while (this.head >= this.tape.length) this.tape.push("B");
    } else if (direction === "L") {
      if (this.head > 0) this.head--;
    }
  }

  _findRule(state, symbol) {
    return this.program.transitions.find(t => t.state === state && t.read === symbol) || null;
  }
}
