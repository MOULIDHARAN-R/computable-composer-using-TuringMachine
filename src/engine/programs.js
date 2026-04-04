/**
 * programs.js — TM program definitions (formal 7-tuples)
 */

const PROGRAMS = {

  inverter: {
    name: "Binary Inverter (0↔1)",
    desc: "Flips every bit on the tape: 0→1, 1→0",
    defaultInput: "1101",
    complexity: "O(n)",
    Q: ["q0","HALT"], sigma: ["0","1"], gamma: ["0","1","B"],
    q0: "q0", B: "B", F: ["HALT"],
    transitions: [
      { state:"q0", read:"0", write:"1", move:"R", next:"q0",   note:"C4" },
      { state:"q0", read:"1", write:"0", move:"R", next:"q0",   note:"E4" },
      { state:"q0", read:"B", write:"B", move:"L", next:"HALT", note:"G4" },
    ],
  },

  palindrome: {
    name: "Palindrome Checker",
    desc: "Checks if a binary string is a palindrome",
    defaultInput: "1001",
    complexity: "O(n²)",
    Q: ["q0","q1","q2","q3","HALT"], sigma: ["0","1"], gamma: ["0","1","X","Y","B"],
    q0: "q0", B: "B", F: ["HALT"],
    transitions: [
      { state:"q0", read:"0", write:"X", move:"R", next:"q1",   note:"C4" },
      { state:"q0", read:"1", write:"Y", move:"R", next:"q2",   note:"E4" },
      { state:"q0", read:"B", write:"B", move:"R", next:"HALT", note:"G5" },
      { state:"q0", read:"X", write:"X", move:"R", next:"HALT", note:"G5" },
      { state:"q1", read:"0", write:"0", move:"R", next:"q1",   note:"D4" },
      { state:"q1", read:"1", write:"1", move:"R", next:"q1",   note:"F4" },
      { state:"q1", read:"B", write:"B", move:"L", next:"q3",   note:"A4" },
      { state:"q1", read:"X", write:"X", move:"L", next:"q3",   note:"A4" },
      { state:"q2", read:"0", write:"0", move:"R", next:"q2",   note:"D4" },
      { state:"q2", read:"1", write:"1", move:"R", next:"q2",   note:"F4" },
      { state:"q2", read:"B", write:"B", move:"L", next:"q3",   note:"B4" },
      { state:"q2", read:"Y", write:"Y", move:"L", next:"q3",   note:"B4" },
      { state:"q3", read:"0", write:"X", move:"L", next:"q0",   note:"C5" },
      { state:"q3", read:"1", write:"Y", move:"L", next:"q0",   note:"E5" },
      { state:"q3", read:"B", write:"B", move:"R", next:"HALT", note:"G5" },
      { state:"q3", read:"X", write:"X", move:"R", next:"HALT", note:"G5" },
    ],
  },

  "unary-add": {
    name: "Unary Increment",
    desc: "Appends a 1 to a unary number (1ⁿ → 1ⁿ⁺¹)",
    defaultInput: "111",
    complexity: "O(n)",
    Q: ["q0","HALT"], sigma: ["1"], gamma: ["1","B"],
    q0: "q0", B: "B", F: ["HALT"],
    transitions: [
      { state:"q0", read:"1", write:"1", move:"R", next:"q0",   note:"C4" },
      { state:"q0", read:"B", write:"1", move:"R", next:"HALT", note:"G4" },
    ],
  },

  "binary-copy": {
    name: "Binary Copy",
    desc: "Copies a binary string after a separator B",
    defaultInput: "101",
    complexity: "O(n²)",
    Q: ["q0","q1","q2","q3","q4","HALT"],
    sigma: ["0","1"], gamma: ["0","1","X","Y","B"],
    q0: "q0", B: "B", F: ["HALT"],
    transitions: [
      { state:"q0", read:"0", write:"X", move:"R", next:"q1",   note:"C4" },
      { state:"q0", read:"1", write:"Y", move:"R", next:"q2",   note:"E4" },
      { state:"q0", read:"X", write:"X", move:"R", next:"q0",   note:"D4" },
      { state:"q0", read:"Y", write:"Y", move:"R", next:"q0",   note:"F4" },
      { state:"q0", read:"B", write:"B", move:"L", next:"q4",   note:"G4" },
      { state:"q1", read:"0", write:"0", move:"R", next:"q1",   note:"D4" },
      { state:"q1", read:"1", write:"1", move:"R", next:"q1",   note:"F4" },
      { state:"q1", read:"X", write:"X", move:"R", next:"q1",   note:"D4" },
      { state:"q1", read:"Y", write:"Y", move:"R", next:"q1",   note:"F4" },
      { state:"q1", read:"B", write:"0", move:"L", next:"q3",   note:"C5" },
      { state:"q2", read:"0", write:"0", move:"R", next:"q2",   note:"D4" },
      { state:"q2", read:"1", write:"1", move:"R", next:"q2",   note:"F4" },
      { state:"q2", read:"X", write:"X", move:"R", next:"q2",   note:"D4" },
      { state:"q2", read:"Y", write:"Y", move:"R", next:"q2",   note:"F4" },
      { state:"q2", read:"B", write:"1", move:"L", next:"q3",   note:"E5" },
      { state:"q3", read:"0", write:"0", move:"L", next:"q3",   note:"A4" },
      { state:"q3", read:"1", write:"1", move:"L", next:"q3",   note:"B4" },
      { state:"q3", read:"X", write:"X", move:"L", next:"q3",   note:"A4" },
      { state:"q3", read:"Y", write:"Y", move:"L", next:"q3",   note:"B4" },
      { state:"q3", read:"B", write:"B", move:"R", next:"q0",   note:"G4" },
      { state:"q4", read:"X", write:"0", move:"L", next:"q4",   note:"C4" },
      { state:"q4", read:"Y", write:"1", move:"L", next:"q4",   note:"E4" },
      { state:"q4", read:"B", write:"B", move:"R", next:"HALT", note:"G5" },
    ],
  },

  "busy-beaver-2": {
    name: "Busy Beaver (2-state)",
    desc: "Maximises 1s written with 2 states — writes 4 ones",
    defaultInput: "B",
    complexity: "Σ(2) = 4",
    Q: ["A","B","HALT"], sigma: ["0","1"], gamma: ["0","1","B"],
    q0: "A", B: "B", F: ["HALT"],
    transitions: [
      { state:"A", read:"0", write:"1", move:"R", next:"B",    note:"C4" },
      { state:"A", read:"1", write:"1", move:"L", next:"B",    note:"E4" },
      { state:"B", read:"0", write:"1", move:"L", next:"A",    note:"G4" },
      { state:"B", read:"1", write:"1", move:"R", next:"HALT", note:"C5" },
      { state:"A", read:"B", write:"1", move:"R", next:"B",    note:"D4" },
      { state:"B", read:"B", write:"1", move:"L", next:"A",    note:"F4" },
    ],
  },

};
