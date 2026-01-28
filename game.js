// Build the Bridge — Kid Edition
// Left-to-right evaluation. No parentheses.
// Slots: N OP N OP N OP N

const SLOT_PATTERN = ["N", "O", "N", "O", "N", "O", "N"];
const DEFAULT_OPS = ["+", "−"]; // use the pretty minus
const MUL_OP = "×";

let puzzle = null;
let slots = Array(SLOT_PATTERN.length).fill(null);
let history = []; // stack of {index, value, tileType, tileValue}

const el = (id) => document.getElementById(id);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function resetMessage(text = "", kind = "muted") {
  const m = el("message");
  m.className = `message ${kind}`;
  m.textContent = text;
}

function setTarget(n) {
  el("target").textContent = String(n);
}

function setResult(text) {
  el("result").textContent = text;
}

function renderSlots() {
  const container = el("slots");
  container.innerHTML = "";

  slots.forEach((v, i) => {
    const d = document.createElement("div");
    d.className = "slot" + (v !== null ? " filled" : "");
    d.dataset.index = String(i);
    d.textContent = v === null ? (SLOT_PATTERN[i] === "N" ? "Number" : "Op") : String(v);
    container.appendChild(d);
  });
}

function renderTiles() {
  // Numbers tiles are single-use for this puzzle; ops are reusable.
  const numRow = el("numbers");
  numRow.innerHTML = "";

  puzzle.numbers.forEach((n) => {
    const b = document.createElement("button");
    b.className = "tile";
    b.textContent = String(n);
    b.dataset.type = "number";
    b.dataset.value = String(n);

    // Disable if already used in slots
    const usedCount = slots.filter((x) => x === n).length;
    const totalCount = puzzle.numbers.filter((x) => x === n).length;
    if (usedCount >= totalCount) b.disabled = true;

    b.addEventListener("click", () => placeTile("number", n));
    numRow.appendChild(b);
  });

  const opsRow = el("ops");
  opsRow.innerHTML = "";

  puzzle.ops.forEach((op) => {
    const b = document.createElement("button");
    b.className = "tile";
    b.textContent = op;
    b.dataset.type = "op";
    b.dataset.value = op;
    b.addEventListener("click", () => placeTile("op", op));
    opsRow.appendChild(b);
  });
}

function nextEmptySlotIndexFor(type) {
  const want = type === "number" ? "N" : "O";
  for (let i = 0; i < SLOT_PATTERN.length; i++) {
    if (SLOT_PATTERN[i] === want && slots[i] === null) return i;
  }
  return -1;
}

function placeTile(type, value) {
  const idx = nextEmptySlotIndexFor(type);
  if (idx === -1) {
    resetMessage(`No empty ${type === "number" ? "number" : "operator"} slots left.`, "muted");
    return;
  }

  slots[idx] = value;
  history.push({ index: idx, value });

  renderSlots();
  renderTiles();
  setResult("—");
  resetMessage("", "muted");

  // If completed, show a friendly hint to press Check
  if (slots.every((x) => x !== null)) {
    resetMessage("Bridge complete. Press Check!", "muted");
  }
}

function undo() {
  const last = history.pop();
  if (!last) {
    resetMessage("Nothing to undo.", "muted");
    return;
  }
  slots[last.index] = null;
  renderSlots();
  renderTiles();
  setResult("—");
  resetMessage("Undone.", "muted");
}

function clearAll() {
  slots = Array(SLOT_PATTERN.length).fill(null);
  history = [];
  renderSlots();
  renderTiles();
  setResult("—");
  resetMessage("Cleared.", "muted");
}

function toAsciiOp(op) {
  if (op === "−") return "-";
  if (op === "×") return "*";
  return op;
}

function evaluateLeftToRight(slotValues) {
  // slotValues: [n, op, n, op, n, op, n] all filled
  let current = Number(slotValues[0]);

  for (let i = 1; i < slotValues.length; i += 2) {
    const op = toAsciiOp(slotValues[i]);
    const next = Number(slotValues[i + 1]);

    if (op === "+") current = current + next;
    else if (op === "-") current = current - next;
    else if (op === "*") current = current * next;
    else throw new Error("Unknown operator: " + op);
  }
  return current;
}

function check() {
  if (slots.some((x) => x === null)) {
    resetMessage("Fill all the slots first.", "bad");
    return;
  }

  let value;
  try {
    value = evaluateLeftToRight(slots);
  } catch (e) {
    resetMessage("Something went wrong in the bridge. Try Clear.", "bad");
    return;
  }

  setResult(String(value));

  if (value === puzzle.target) {
    resetMessage("🎉 You built it! Perfect bridge!", "good");
  } else {
    resetMessage("Not quite. Try Undo or swap an operator.", "bad");
  }
}

function generatePuzzle({ allowMultiply }) {
  // Create 4 numbers; choose a target derived from a hidden LTR expression.
  // Then shuffle numbers so it feels like a puzzle.
  const numbers = Array.from({ length: 4 }, () => randInt(1, 9));
  const ops = allowMultiply ? [...DEFAULT_OPS, MUL_OP] : [...DEFAULT_OPS];

  // Build a hidden expression to get a target
  const hiddenSlots = [
    numbers[0],
    pick(ops),
    numbers[1],
    pick(ops),
    numbers[2],
    pick(ops),
    numbers[3],
  ];

  let target = evaluateLeftToRight(hiddenSlots);

  // Keep target reasonable for kids (avoid negative or huge)
  let tries = 0;
  while ((target < 0 || target > 60) && tries < 50) {
    hiddenSlots[1] = pick(ops);
    hiddenSlots[3] = pick(ops);
    hiddenSlots[5] = pick(ops);
    target = evaluateLeftToRight(hiddenSlots);
    tries++;
  }

  // Shuffle numbers for presentation
  const shuffled = [...numbers].sort(() => Math.random() - 0.5);

  return {
    numbers: shuffled,
    ops,
    target
  };
}

function newPuzzle() {
  const allowMultiply = el("mulToggle").checked;
  puzzle = generatePuzzle({ allowMultiply });
  setTarget(puzzle.target);
  clearAll();
  renderTiles();
  resetMessage("New puzzle ready. Build the bridge!", "muted");
}

function init() {
  el("undoBtn").addEventListener("click", undo);
  el("clearBtn").addEventListener("click", clearAll);
  el("checkBtn").addEventListener("click", check);
  el("newBtn").addEventListener("click", newPuzzle);

  el("mulToggle").addEventListener("change", () => {
    // Keep it simple: generate a new puzzle whenever difficulty changes
    newPuzzle();
  });

  renderSlots();
  newPuzzle();
}

init();
