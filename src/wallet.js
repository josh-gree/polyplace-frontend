import {
  connect,
  disconnect,
  getConnections,
  injected,
  reconnect,
  watchConnections,
} from "@wagmi/core";
import { config } from "./wagmi.js";

function currentAddress() {
  return getConnections(config)[0]?.accounts[0] ?? null;
}

export async function connectWallet() {
  try {
    const { accounts } = await connect(config, { connector: injected() });
    return accounts[0] ?? null;
  } catch (err) {
    if (!window.ethereum) alert("MetaMask is not installed.");
    else console.error(err);
    return null;
  }
}

export async function disconnectWallet() {
  await disconnect(config);
}

export function onAccountChanged(callback) {
  return watchConnections(config, {
    onChange() {
      callback(currentAddress());
    },
  });
}

export async function getConnectedAddress() {
  await reconnect(config);
  return currentAddress();
}
