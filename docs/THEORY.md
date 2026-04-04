# Theory Notes — Turing Machine Music Engine

## 1. The Formal Model

This project implements a **Deterministic Turing Machine (DTM)**, defined as a 7-tuple:

```
M = (Q, Σ, Γ, δ, q₀, B, F)
```

| Symbol | Name | Description |
|--------|------|-------------|
| Q | States | Finite set of machine states |
| Σ | Input alphabet | Symbols that can appear on the initial tape (Σ ⊆ Γ) |
| Γ | Tape alphabet | All symbols that can be written to the tape |
| δ | Transition function | δ: Q × Γ → Q × Γ × {L, R} |
| q₀ | Initial state | The state in which the machine begins |
| B | Blank symbol | The default symbol on empty tape cells (B ∉ Σ) |
| F | Accept states | Set of states that cause the machine to halt and accept |

---

## 2. Transition Function

The transition function δ is the "brain" of the machine. At each step:

```
δ(current_state, symbol_read) = (next_state, symbol_to_write, direction)
```

If no rule exists for the current (state, symbol) pair, the machine **halts** (and in this simulation, is marked as stuck).

---

## 3. Instantaneous Description (ID)

The ID captures the complete configuration of the machine at any step:

```
α q β
```

Where:
- `α` = the tape contents to the **left** of the head
- `q` = the **current state** (inserted at the head position)
- `β` = the tape contents from the head **rightward**

Example: Tape `1 0 1`, head at position 1, state `q0`:

```
1 q0 01
```

A computation is a sequence of IDs:  `I₀ ⊢ I₁ ⊢ I₂ ⊢ … ⊢ Iₙ`

---

## 4. Programs Included

### 4.1 Binary Inverter

Computes the function `f(w) = w̄` (bitwise NOT).

```
Q  = { q0, HALT }
Σ  = { 0, 1 }
Γ  = { 0, 1, B }

δ(q0, 0) = (q0, 1, R)   — flip 0 to 1, move right
δ(q0, 1) = (q0, 0, R)   — flip 1 to 0, move right
δ(q0, B) = (HALT, B, L) — end of input, halt
```

### 4.2 Palindrome Checker (Marking)

Checks whether a binary string is a palindrome by repeatedly marking matching symbols at both ends.

Uses 5 states: `q0, q1, q2, q3, HALT`

- `q0` — reads leftmost unmarked symbol, marks it as X or Y
- `q1` / `q2` — scans rightward looking for matching 0 or 1
- `q3` — scans leftward to return to the start
- `HALT` — reached when all symbols are matched

### 4.3 Unary Increment

Computes `f(1ⁿ) = 1ⁿ⁺¹`. Scans right past all 1s and writes one more.

```
δ(q0, 1) = (q0, 1, R)    — scan right
δ(q0, B) = (HALT, 1, R)  — write extra 1 and halt
```

---

## 5. Church-Turing Thesis & Musical Mapping

The **Church-Turing Thesis** states:

> Any function that is effectively calculable can be computed by a Turing Machine.

This project demonstrates the thesis creatively: the output of a computation is not just symbols on a tape — it is a **melody**. Each transition fires a note:

| Event | Note | Frequency |
|-------|------|-----------|
| Write `0` | C4 | 261.63 Hz |
| Write `1` | E4 | 329.63 Hz |
| Traverse (q1) | D4 | 293.66 Hz |
| Return (q3) | C5 | 523.25 Hz |
| Halt | C4+E4+G4+C5 chord | — |

The melody generated is **deterministic** — the same input always produces the same musical output. This is precisely what makes the machine a *function computer*: it maps inputs to outputs (musical or otherwise) reliably and mechanically.

---

## 6. References

- Sipser, M. *Introduction to the Theory of Computation*, 3rd ed. Cengage, 2012.
- Turing, A.M. "On Computable Numbers, with an Application to the Entscheidungsproblem." *Proceedings of the London Mathematical Society*, 1936.
- Church, A. "An Unsolvable Problem of Elementary Number Theory." *American Journal of Mathematics*, 1936.
