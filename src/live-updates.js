const MAGIC = [0x50, 0x4c, 0x47, 0x01]; // PLG\x01

async function getUrls() {
  const res = await fetch("/config.json");
  const { backendUrl } = await res.json();
  if (backendUrl) {
    return {
      gridUrl: `${backendUrl}/grid`,
      wsUrl: `${backendUrl.replace(/^http/, "ws")}/ws`,
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
  const nRenters   = view.getUint32(8, true);
  const nRented    = view.getUint32(12, true);
  const metaOffset = view.getUint32(16, true);

  // Skip Section 1 (address table) — we don't use renter addresses yet.
  const bitmapStart = 20 + nRenters * 20;
  const totalCells  = width * height;
  const bitmapSize  = Math.ceil(totalCells / 8);
  const rgbStart    = bitmapStart + bitmapSize;

  // Section 2: presence bitmap + packed RGB. Accumulate into preallocated
  // typed arrays sized to the full grid so the worst case (1M colored cells)
  // allocates exactly once.
  const colorIds = new Uint32Array(totalCells);
  const colorR   = new Uint8Array(totalCells);
  const colorG   = new Uint8Array(totalCells);
  const colorB   = new Uint8Array(totalCells);
  let colorCount = 0;
  let rgbPos = rgbStart;
  for (let cellId = 0; cellId < totalCells; cellId++) {
    if (data[bitmapStart + (cellId >> 3)] & (1 << (cellId & 7))) {
      colorIds[colorCount] = cellId;
      colorR[colorCount] = data[rgbPos];
      colorG[colorCount] = data[rgbPos + 1];
      colorB[colorCount] = data[rgbPos + 2];
      colorCount++;
      rgbPos += 3;
    }
  }

  // Section 3: rental records — 11 bytes each.
  // cellId (u24 LE = u16 low + u8 high) + expiresTs (u32 LE) + renterIdx (u32 LE).
  const rentalIds     = new Uint32Array(nRented);
  const rentalExpires = new Uint32Array(nRented);
  let pos = metaOffset;
  for (let i = 0; i < nRented; i++) {
    rentalIds[i]     = view.getUint16(pos, true) | (data[pos + 2] << 16);
    rentalExpires[i] = view.getUint32(pos + 3, true);
    pos += 11;
  }

  return {
    colorIds,
    colorR,
    colorG,
    colorB,
    colorCount,
    rentalIds,
    rentalExpires,
    rentalCount: nRented,
  };
}

function parseCellUpdate(text) {
  const { i, r, g, b, expires_at } = JSON.parse(text);
  return { cellId: i, r, g, b, expiresAt: expires_at ?? 0 };
}

export function connectLiveUpdates({ cellStore, renderer }) {
  let gridUrl, wsUrl;
  let socket = null;
  let reconnectTimer = null;
  let manuallyClosed = false;
  let buffer = [];
  let snapshotApplied = false;

  function applyUpdate(data) {
    try {
      const { cellId, r, g, b, expiresAt } = parseCellUpdate(data);
      cellStore.updateCell(cellId, r, g, b, expiresAt);
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
      const snapshot = await parseSnapshot(await res.arrayBuffer());
      cellStore.applySnapshot(snapshot);
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

  async function connect() {
    if (!gridUrl) ({ gridUrl, wsUrl } = await getUrls());
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
