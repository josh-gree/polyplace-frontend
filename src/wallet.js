export async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask is not installed.");
    return null;
  }
  const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
  return address;
}

export function onAccountsChanged(callback) {
  window.ethereum?.on("accountsChanged", callback);
}

export async function getConnectedAddress() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] ?? null;
}
