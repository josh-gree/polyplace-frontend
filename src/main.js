import "./styles.css";

import { connectWallet, getConnectedAddress, onAccountsChanged } from "./wallet.js";
import { createEmptyBoard } from "./board.js";
import { createInputController } from "./input.js";
import { connectLiveUpdates } from "./live-updates.js";
import { createRenderer } from "./renderer.js";
import { createViewport } from "./viewport.js";

const canvas = document.getElementById("gridCanvas");
const miniMap = document.getElementById("miniMap");

// Shared UI state that is not part of viewport math. Keeping it in one object
// lets input and rendering communicate without creating a framework.
const state = {
  hoveredCell: null,
  selectedCell: null,
};

const board = createEmptyBoard();
const viewport = createViewport();
const renderer = createRenderer({
  canvas,
  miniMap,
  board,
  viewport,
  state,
});

const input = createInputController({
  canvas,
  miniMap,
  viewport,
  renderer,
  state,
});

connectLiveUpdates({
  board,
  renderer,
});

let initialized = false;

function resize() {
  viewport.resizeCanvas(canvas);
  input.updateScaleExtent();

  if (!initialized) {
    initialized = true;
    input.applyTransform(viewport.fitTransform());
  } else {
    input.applyTransform(viewport.getTransform());
  }
}

window.addEventListener("resize", resize);
resize();

// Wallet
const btn = document.getElementById("connectWallet");

function setConnected(address) {
  btn.textContent = address.slice(0, 6) + "…" + address.slice(-4);
  btn.classList.add("connected");
  btn.disabled = true;
}

btn.addEventListener("click", async () => {
  const address = await connectWallet();
  if (address) setConnected(address);
});

onAccountsChanged((accounts) => {
  if (accounts[0]) {
    setConnected(accounts[0]);
  } else {
    btn.textContent = "Connect Wallet";
    btn.classList.remove("connected");
    btn.disabled = false;
  }
});

// Restore if already connected from a prior session
getConnectedAddress().then((address) => {
  if (address) setConnected(address);
});
