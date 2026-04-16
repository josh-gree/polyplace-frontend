import { applyCellUpdates } from "./board.js";
import { CONFIG } from "./config.js";

const MAGIC = [0x50, 0x4c, 0x47, 0x01]; // PLG\x01

function getUrls() {
  const base = import.meta.env.VITE_BACKEND_URL;
  if (base) {
    return {
      gridUrl: `${base}/grid`,
      wsUrl: `${base.replace(/^http/, "ws")}/ws`,
    };
  }
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return {
    gridUrl: "/grid",
    wsUrl: `${proto}//${location.host}/ws`,
  };
}

async function parseSnapshot(buf) {
  const data = new Uint8Array(buf);
  const view = new DataView(buf);

  for (let i = 0; i < 4; i++) {
    if (data[i] !== MAGIC[i]) throw new Error("Bad magic bytes in snapshot");
  }

  const width      = view.getUint16(4, true);
  const height     = view.getUint16(6, true);
  const nRenderers = view.getUint32(8, true);
  let pos = 20 + nRenderers * 20;

  const totalCells  = width * height;
  const bitmapSize  = Math.ceil(totalCells / 8);
  const bitmapStart = pos;
  pos += bitmapSize;
  const rgbStart = pos;

  const cells = [];
  let rgbPos = rgbStart;

  for (let cellId = 0; cellId < totalCells; cellId++) {
    if (data[bitmapStart + (cellId >> 3)] & (1 << (cellId & 7))) {
      const r = data[rgbPos].toString(16).padStart(2, "0");
      const g = data[rgbPos + 1].toString(16).padStart(2, "0");
      const b = data[rgbPos + 2].toString(16).padStart(2, "0");
      cells.push([cellId % width, Math.floor(cellId / width), `#${r}${g}${b}`]);
      rgbPos += 3;
    }
  }

  return cells;
}

function parseCellUpdate(text) {
  const { i, r, g, b } = JSON.parse(text);
  const x = i % CONFIG.GRID_SIZE;
  const y = Math.floor(i / CONFIG.GRID_SIZE);
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  return [[x, y, hex]];
}

export function connectLiveUpdates({ board, renderer }) {
  const { gridUrl, wsUrl } = getUrls();
  let socket = null;
  let reconnectTimer = null;
  let manuallyClosed = false;
  let buffer = [];
  let snapshotApplied = false;

  function applyUpdate(data) {
    try {
      applyCellUpdates(board, parseCellUpdate(data));
      renderer.scheduleRender();
    } catch (err) {
      console.error("live-updates: failed to apply update", err);
    }
  }

  function handleMessage(event) {
    if (!snapshotApplied) {
      buffer.push(event.data);
    } else {
      applyUpdate(event.data);
    }
  }

  async function loadSnapshot() {
    try {
      const res = await fetch(gridUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cells = await parseSnapshot(await res.arrayBuffer());
      applyCellUpdates(board, cells);
      renderer.scheduleRender();
      const queued = buffer;
      buffer = [];
      snapshotApplied = true;
      for (const data of queued) applyUpdate(data);
    } catch (err) {
      console.error("live-updates: failed to load snapshot", err);
    }
  }

  function scheduleReconnect() {
    if (manuallyClosed || reconnectTimer) return;
    snapshotApplied = false;
    buffer = [];
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 1000);
  }

  function connect() {
    socket = new WebSocket(wsUrl);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", scheduleReconnect);
    socket.addEventListener("error", () => socket.close());
    loadSnapshot();
  }

  connect();

  return {
    close() {
      manuallyClosed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
