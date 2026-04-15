import { applyCellUpdates } from "./board.js";
import { CONFIG } from "./config.js";

export function connectLiveUpdates({ board, renderer, url = CONFIG.LIVE_UPDATES_URL }) {
  let socket = null;
  let reconnectTimer = null;
  let manuallyClosed = false;

  function scheduleReconnect() {
    if (manuallyClosed || reconnectTimer) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 1000);
  }

  function handleMessage(event) {
    const message = JSON.parse(event.data);

    if (message.type === "cell") {
      applyCellUpdates(board, [[message.x, message.y, message.color]]);
      renderer.scheduleRender();
      return;
    }

    if (message.type === "cells" && Array.isArray(message.cells)) {
      applyCellUpdates(board, message.cells);
      renderer.scheduleRender();
    }
  }

  function connect() {
    socket = new WebSocket(url);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", scheduleReconnect);
    socket.addEventListener("error", () => {
      socket.close();
    });
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
