import { CONFIG } from "./config.js";

function parseClearColor() {
  const n = parseInt(CONFIG.CLEAR_COLOR.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Flat typed-array-backed store of cell source colors + expiries, plus an
// ImageData mirror that holds the currently displayed (possibly desaturated)
// pixels. A separate canvas is exposed so the renderer can drawImage it
// through the viewport transform exactly as it did with the old board canvas.
export function createCellStore() {
  const size = CONFIG.GRID_SIZE;
  const total = size * size;
  const fadeWindow = CONFIG.FADE_WINDOW_SECONDS;

  const sourceR = new Uint8Array(total);
  const sourceG = new Uint8Array(total);
  const sourceB = new Uint8Array(total);
  const expiresAt = new Uint32Array(total);
  const hasColor = new Uint8Array(total);

  const imageData = new ImageData(size, size);
  const pixels = imageData.data;
  const [cr, cg, cb] = parseClearColor();
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = cr;
    pixels[i + 1] = cg;
    pixels[i + 2] = cb;
    pixels[i + 3] = 255;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);

  // Cells that still need periodic repainting — rented and not yet fully
  // greyscale. A cell stays in here until its expiry is past (at which point
  // its displayed colour is a stable grey and won't change again without a
  // fresh update).
  const active = new Set();
  let dirty = false;

  function paint(cellId, nowSec) {
    if (!hasColor[cellId]) return;
    const r = sourceR[cellId];
    const g = sourceG[cellId];
    const b = sourceB[cellId];
    const exp = expiresAt[cellId];

    let dr = r, dg = g, db = b;
    if (exp !== 0) {
      const remaining = exp - nowSec;
      if (remaining <= 0) {
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
        dr = dg = db = gray;
      } else if (remaining < fadeWindow) {
        const s = remaining / fadeWindow;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        dr = (gray + (r - gray) * s) | 0;
        dg = (gray + (g - gray) * s) | 0;
        db = (gray + (b - gray) * s) | 0;
      }
    }

    const off = cellId * 4;
    pixels[off] = dr;
    pixels[off + 1] = dg;
    pixels[off + 2] = db;
    dirty = true;
  }

  function updateCell(cellId, r, g, b, expires) {
    if (cellId < 0 || cellId >= total) return;
    sourceR[cellId] = r;
    sourceG[cellId] = g;
    sourceB[cellId] = b;
    expiresAt[cellId] = expires || 0;
    hasColor[cellId] = 1;
    paint(cellId, Math.floor(Date.now() / 1000));
    if (expires) active.add(cellId);
    else active.delete(cellId);
  }

  function applySnapshot(snapshot) {
    const { colorIds, colorR, colorG, colorB, colorCount, rentalIds, rentalExpires, rentalCount } = snapshot;
    // Apply rentals first so that painting below uses correct expiry.
    for (let i = 0; i < rentalCount; i++) {
      const id = rentalIds[i];
      expiresAt[id] = rentalExpires[i];
      active.add(id);
    }
    const nowSec = Math.floor(Date.now() / 1000);
    for (let i = 0; i < colorCount; i++) {
      const id = colorIds[i];
      sourceR[id] = colorR[i];
      sourceG[id] = colorG[i];
      sourceB[id] = colorB[i];
      hasColor[id] = 1;
      paint(id, nowSec);
    }
  }

  function tick() {
    const nowSec = Math.floor(Date.now() / 1000);
    const expired = [];
    for (const cellId of active) {
      const remaining = expiresAt[cellId] - nowSec;
      // Cells outside the fade window don't change displayed colour tick-to-tick.
      if (remaining >= fadeWindow) continue;
      paint(cellId, nowSec);
      // Once fully expired the cell is a stable grey; stop watching it.
      if (remaining <= 0) expired.push(cellId);
    }
    for (const id of expired) active.delete(id);
  }

  // Flush pending ImageData writes to the backing canvas. Called once per
  // frame from the renderer's beforeDraw hook — batching many per-cell writes
  // into a single putImageData.
  function commit() {
    if (!dirty) return;
    ctx.putImageData(imageData, 0, 0);
    dirty = false;
  }

  return {
    canvas,
    updateCell,
    applySnapshot,
    tick,
    commit,
    get activeCount() {
      return active.size;
    },
  };
}
