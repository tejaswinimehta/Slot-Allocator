const ROWS = 5, COLS = 5;
let grid = [];
let itemGrid = [];
let itemNames = [];
let lastRow = -1, lastCol = -1;
let usedSlots = 0;
let editR = -1, editC = -1;
let selectedR = -1, selectedC = -1;

/* ─── PAGE NAVIGATION ──────────────────────────────────────── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ─── INIT ──────────────────────────────────────────────────── */
function initialize() {
  grid     = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  itemGrid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  itemNames= Array.from({length: ROWS}, () => Array(COLS).fill(''));
  usedSlots = 0;
  selectedR = -1; selectedC = -1;
}

/* ─── BFS SLOT FINDER ───────────────────────────────────────── */
function bfs(isHeavy, isHigh) {
  const dr = [-1,1,0,0];
  const dc = [0,0,-1,1];
  const vis = Array.from({length: ROWS}, () => Array(COLS).fill(false));
  const q = [];

  if (isHigh) {
    q.push([0,0]);
    vis[0][0] = true;
  } else {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r===0 || c===0 || r===ROWS-1 || c===COLS-1) {
          q.push([r,c]);
          vis[r][c] = true;
        }
      }
    }
  }

  while (q.length) {
    const [r,c] = q.shift();
    if (grid[r][c] === 0 && !(isHeavy && r < 2)) return [r, c];
    for (let i = 0; i < 4; i++) {
      const nr = r + dr[i], nc = c + dc[i];
      if (nr >= 0 && nc >= 0 && nr < ROWS && nc < COLS && !vis[nr][nc]) {
        vis[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
  }
  return [-1, -1];
}

/* ─── ADD ITEM ──────────────────────────────────────────────── */
function addItem(name, weight, priority) {
  const [r, c] = bfs(weight === 2, priority === 2);
  if (r === -1) return false;
  grid[r][c]      = 1;
  itemGrid[r][c]  = {weight, priority};
  itemNames[r][c] = name;
  lastRow = r; lastCol = c;
  usedSlots++;
  return true;
}

/* ─── DELETE CELL ───────────────────────────────────────────── */
function deleteCell(r, c) {
  if (grid[r][c] === 0) return;
  const name = itemNames[r][c] || 'Item';
  grid[r][c]      = 0;
  itemGrid[r][c]  = null;
  itemNames[r][c] = '';
  if (selectedR === r && selectedC === c) {
    selectedR = -1; selectedC = -1;
  }
  usedSlots--;
  render();
  logEntry(`✕  ${name} removed from [${r},${c}]`, 'delete');
}

/* ─── OPEN EDIT MODAL ───────────────────────────────────────── */
function openEdit(r, c) {
  editR = r; editC = c;
  const {weight, priority} = itemGrid[r][c];
  document.getElementById('editItemName').value = itemNames[r][c] || '';
  document.querySelector(`input[name="editWeight"][value="${weight}"]`).checked   = true;
  document.querySelector(`input[name="editPriority"][value="${priority}"]`).checked = true;
  document.getElementById('editCoordLabel').textContent = `[${r},${c}]`;
  document.getElementById('editModal').classList.add('open');
}

/* ─── CLOSE EDIT MODAL ──────────────────────────────────────── */
function closeEdit() {
  document.getElementById('editModal').classList.remove('open');
  editR = -1; editC = -1;
}

/* ─── RENDER GRID ───────────────────────────────────────────── */
function render(newR = -1, newC = -1) {
  const root = document.getElementById("gridRoot");
  root.innerHTML = "";

  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement("div");
    row.className = "grid-row";

    for (let c = 0; c < COLS; c++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<div class="coord">[${r},${c}]</div>`;

      if (grid[r][c] === 0) {
        cell.classList.add("empty");
      } else {
        const {weight, priority} = itemGrid[r][c];
        const itemName = itemNames[r][c] || "Item";
        cell.classList.add(["light","medium","heavy"][weight]);
        if (priority === 2) cell.classList.add("high-p");
        if (r === newR && c === newC) cell.classList.add("new");
        if (r === selectedR && c === selectedC) cell.classList.add("selected");

        cell.innerHTML = `
          <div class="coord">[${r},${c}]</div>
          <div class="item-name">${itemName}</div>
          <div class="icon">${["🪶","📦","🏋️"][weight]}</div>
          <div class="cell-label">${["LOW","MED","HIGH"][priority]}</div>
        `;
      }

      const occupied = grid[r][c] !== 0;
      const actions = document.createElement("div");
      actions.className = "cell-actions";
      actions.innerHTML = `
        <button class="btn-edit">✏ EDIT</button>
        <button class="btn-delete">✕ DEL</button>
      `;

      const editBtn = actions.querySelector('.btn-edit');
      const deleteBtn = actions.querySelector('.btn-delete');
      editBtn.disabled = !occupied;
      deleteBtn.disabled = !occupied;

      if (occupied) {
        const rr = r, cc = c;
        cell.onclick = () => {
          const sameCell = selectedR === rr && selectedC === cc;
          selectedR = sameCell ? -1 : rr;
          selectedC = sameCell ? -1 : cc;
          render();
        };
        if (r === selectedR && c === selectedC) actions.classList.add("visible");
        editBtn.onclick = e => { e.stopPropagation(); openEdit(rr, cc); };
        deleteBtn.onclick = e => { e.stopPropagation(); deleteCell(rr, cc); };
      }

      slot.appendChild(cell);
      slot.appendChild(actions);
      row.appendChild(slot);
    }
    root.appendChild(row);
  }

  /* Update capacity bar (lives on page 1 but DOM update is fine while hidden) */
  document.getElementById("capBar").style.width  = (usedSlots / 25 * 100) + "%";
  document.getElementById("capLabel").innerText  = `${usedSlots} / 25 slots used`;
}

/* ─── STATUS (page 1) ───────────────────────────────────────── */
function showStatus(msg, err = false) {
  const el = document.getElementById("status");
  el.innerText   = msg;
  el.style.color = err ? "var(--red)" : "var(--green)";
}

/* ─── LOG ENTRY ─────────────────────────────────────────────── */
function logEntry(text, type = 'info') {
  const logEl = document.getElementById("log");
  const e = document.createElement("div");
  e.className = "entry";
  const palette = {
    add    : 'var(--green)',
    delete : 'var(--red)',
    edit   : 'var(--yellow)',
    info   : 'var(--text)',
    reset  : 'var(--muted)'
  };
  e.style.color = palette[type] || palette.info;
  e.innerText = text;
  logEl.prepend(e);
}

/* ══════════════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════════════ */

/* ALLOCATE SLOT → go to page 2 */
document.getElementById("submitBtn").onclick = () => {
  const name = document.getElementById("itemName").value.trim() || "Item";
  const w = parseInt(document.querySelector('input[name="weight"]:checked').value);
  const p = parseInt(document.querySelector('input[name="priority"]:checked').value);

  const ok = addItem(name, w, p);

  if (ok) {
    render(lastRow, lastCol);
    showStatus(`Placed at [${lastRow},${lastCol}]`);
    logEntry(
      `+ ${name} → [${lastRow},${lastCol}]  (${["L","M","H"][w]} | ${["LOW","MED","HIGH"][p]})`,
      'add'
    );
    document.getElementById("itemName").value = "";
    showPage('page2');
  } else {
    showStatus("Warehouse Full!", true);
  }
};

/* BACK button */
document.getElementById("backBtn").onclick = () => {
  showPage('page1');
};

/* RESET WAREHOUSE (page 2) → clear everything, go to page 1 */
document.getElementById("resetBtnGrid").onclick = () => {
  initialize();
  render();
  document.getElementById("log").innerHTML = "";
  logEntry("— Warehouse reset —", 'reset');
  showStatus("Warehouse reset.");
  showPage('page1');
};

/* SAVE EDIT */
document.getElementById("saveEditBtn").onclick = () => {
  if (editR === -1) return;
  const newName = document.getElementById("editItemName").value.trim() || "Item";
  const w = parseInt(document.querySelector('input[name="editWeight"]:checked').value);
  const p = parseInt(document.querySelector('input[name="editPriority"]:checked').value);
  const old = itemGrid[editR][editC];
  const oldName = itemNames[editR][editC] || 'Item';

  itemGrid[editR][editC] = {weight: w, priority: p};
  itemNames[editR][editC] = newName;
  const namePart = oldName === newName ? `${newName}` : `${oldName}→${newName}`;

  logEntry(
    `✏ ${namePart} [${editR},${editC}]: ${["🪶","📦","🏋️"][old.weight]}→${["🪶","📦","🏋️"][w]}  ${["LOW","MED","HIGH"][old.priority]}→${["LOW","MED","HIGH"][p]}`,
    'edit'
  );

  closeEdit();
  render();
};

/* CANCEL EDIT */
document.getElementById("cancelEditBtn").onclick = closeEdit;

/* Close modal on backdrop click */
document.getElementById("editModal").onclick = e => {
  if (e.target === document.getElementById("editModal")) closeEdit();
};

/* ─── START ─────────────────────────────────────────────────── */
initialize();
render();
