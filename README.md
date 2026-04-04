# Turing Machine Music Engine

A functional simulation of a **Deterministic Turing Machine (DTM)** that maps logical state transitions to musical notes — a creative proof of the Church-Turing Thesis.

> *"Anything effectively calculable can be computed by a Turing Machine."*

---

## Theory of Computation: Conceptual Overview

This project is a creative implementation demonstrating the **Church-Turing Thesis** and core concepts from the Theory of Computation:

### **Turing Machine (TM) Model**

A **Deterministic Turing Machine (DTM)** is formally defined as a 7-tuple:

$$M = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$$

Where:
- **Q**: Finite set of states (control flow)
- **Σ**: Input alphabet (symbols the machine can read)
- **Γ**: Tape alphabet (symbols the machine can write, includes Σ)
- **δ**: Transition function mapping current state and symbol to next state, symbol to write, and head direction
- **q₀**: Initial state where computation begins
- **B**: Blank symbol (marker for tape boundaries)
- **F**: Set of final/accepting states (halting states)

### **Key Concepts Implemented**

1. **Deterministic Computation**: Each state + input symbol pair has exactly one transition rule. No ambiguity, no non-determinism.

2. **State Transitions (δ)**: The core logic. For each transition, the machine:
   - Reads a symbol from the current tape cell
   - Writes a new symbol
   - Moves the head left (L), right (R), or stays (N)
   - Transitions to the next state

3. **Instantaneous Description (ID)**: Represents the complete computational snapshot at any moment: `α q β` where α is the left tape, q is current state, β is the right tape.

4. **Halting & Acceptance**: Computation terminates when reaching a state in F. The final tape content is the output.

5. **Church-Turing Thesis**: *"Anything effectively calculable can be computed by a Turing Machine."* This project proves that musical composition—inherently creative—can be mechanically generated through deterministic rules.

### **Audio Integration**

Each transition rule optionally maps to a musical note. As the DTM executes, note sequences are generated, transforming abstract computation into audible output. This demonstrates that computational processes can be aesthetically meaningful.

---

## Quick Deploy

For rapid deployment, use **Vercel**, **GitHub Pages**, or any static host:

```bash
# Via Vercel CLI
npm install -g vercel
vercel --prod

# Via GitHub Pages
git push origin main
```

See [`vercel.json`](vercel.json) for configuration.

---

## Project Structure

```
turing-machine-music/
├── index.html              ← entry point
├── vercel.json             ← Vercel deployment config
├── src/
│   ├── app.js              ← top-level orchestrator
│   ├── engine/
│   │   ├── machine.js      ← DTM core (7-tuple logic)
│   │   └── programs.js     ← TM program definitions
│   ├── audio/
│   │   └── synth.js        ← Tone.js audio engine
│   └── ui/
│       ├── styles.css      ← all styles
│       ├── render.js       ← DOM rendering helpers
│       └── controls.js     ← keyboard shortcuts + event listeners
├── assets/
│   └── icons/
│       └── favicon.svg
├── docs/
│   └── THEORY.md
├── .gitignore
├── LICENSE
└── README.md
```

---

## Features

| Feature | Description |
|---------|-------------|
| Interactive Tape | Animated read/write head, scrollable |
| Step-by-Step | Fire one transition at a time |
| Auto-Run | Adjustable speed 100ms–1200ms |
| ID Display | Formal Instantaneous Description live |
| Transition Table | Active rule highlighted each step |
| Audio Synthesis | Tone.js maps transitions to notes |
| HALT Chord | Success chord on final state |
| Keyboard Shortcuts | `→`/`s` step · `Space` run/pause · `r` reset |

---

## Adding a New TM Program

Edit `src/engine/programs.js` — add an entry to `PROGRAMS`:

```js
"my-program": {
  name: "My Program",
  desc: "Short description",
  defaultInput: "101",
  Q: ["q0", "HALT"],
  sigma: ["0", "1"],
  gamma: ["0", "1", "B"],
  q0: "q0", B: "B", F: ["HALT"],
  transitions: [
    { state: "q0", read: "0", write: "1", move: "R", next: "q0",   note: "D4" },
    { state: "q0", read: "B", write: "B", move: "L", next: "HALT", note: "G4" },
  ],
},
```

Then add an `<option>` in `index.html`:

```html
<option value="my-program">My Program</option>
```

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| [Tone.js 14.7.77](https://tonejs.github.io/) | Web Audio synthesis |
| Google Fonts | JetBrains Mono + Syne typefaces |

No framework, no bundler, no build step. Pure HTML/CSS/JS.

---

## Theory

See [`docs/THEORY.md`](docs/THEORY.md) for formal definitions of the 7-tuple DTM model, transition function δ, Instantaneous Descriptions, and the Church-Turing Thesis.

---
