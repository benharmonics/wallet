//import Wallet from "../wallet";
//import { formatUnits } from "ethers";
import { encryptVault, decryptVault, hasVault } from "./vault";

type WalletState = {
  mnemonic?: string | null;
  hasVault: boolean;
}

const state: WalletState = { hasVault: hasVault() };

export function enterCredentials() {
  return `
    <h1>Wallet</h1>
    <div id="vault-status"></div>
    <button id="save">🔑 ${state.hasVault ? "Enter New" : "Save"} Mnemonic</button>
    <button id="unlock">🔓 Unlock Vault</button>
    <pre id="output" class="vault-output"></pre>
    <div class="space-y-5">
      <button id="send" class="wallet-send">Send</button>
      <button id="send" class="wallet-send">Balance</button>
    </div>
  `;
}

export function bindWalletEvents() {
  document.getElementById("save")!.onclick = async () => {
    if (state.hasVault) {
    }
    const password = prompt("Choose a password:") ?? "";
    if (!password) {
      return;
    }
    const mnemonic = prompt("Enter your seed phrase") ?? "";
    if (!mnemonic) {
      console.error("Missing mnemonic");
      return;
    };
    await encryptVault(mnemonic, password);
  }

  document.getElementById("unlock")!.onclick =  async () => {
    const password = prompt("Enter your password:") ?? "";
    const result = await decryptVault(password);
    const output = document.getElementById("output");
    if (result) {
      state.mnemonic = result;
      showHelpText();
      output!.textContent = `🔓 Vault unlocked!`;
    } else {
      output!.textContent = "❌ Failed to unlock vault.";
    }
  }

  showHelpText()
}

function showHelpText() {
  console.log(`State: ${JSON.stringify(state, null, 2)}`);
  const vaultStatus = document.getElementById("vault-status");
  if (state.hasVault && !state.mnemonic) {
    vaultStatus!.textContent = `Enter your password to unlock your wallet`;
  } else if (state.mnemonic) {
    vaultStatus!.textContent = "Your wallet has been unlocked.";
  }
}
