import Wallet from "../wallet";
//import { formatUnits } from "ethers";
import { encryptVault, decryptVault, hasVault } from "./vault";

type WalletState = {
  mnemonic?: string | null;
  hasVault: boolean;
};

const state: WalletState = { hasVault: hasVault() };

export function enterCredentials() {
  return `
    <h1 class="text-4xl">Wallet</h1>
    <div class="flex flex-col space-y-2">
      <div id="vault-status"></div>
      <div class="flex space-x-5">
        <button id="unlock" class="text-white font-semibold rounded-3xl p-5 bg-blue-600 hover:bg-blue-700">🔓 Unlock Vault</button>
        <button id="save" class="text-white font-semibold rounded-3xl p-5 bg-gray-800 hover:bg-gray-900">🔑 ${state.hasVault ? "Enter New" : "Save"} Mnemonic</button>
      </div>
      <pre id="output" class="py-2 px-5 bg-rose-500 hidden"></pre>
      <div id="wallet-buttons" class="flex space-x-5 items-center hidden">
        <button id="send" class="rounded-4xl">Send</button>
        <div class="flex space-x-5 items-center">
          <span>Balance:</span>
          <span id="balance"></span>
        </div>
      </div>
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
    }
    await encryptVault(mnemonic, password);
  };

  document.getElementById("unlock")!.onclick = async () => {
    const password = prompt("Enter your password:") ?? "";
    const result = await decryptVault(password);
    const output = document.getElementById("output");
    const walletButtons = document.getElementById("wallet-buttons");
    if (result) {
      state.mnemonic = result;
      showHelpText();
      getBalance();
      output!.textContent = `🔓 Vault unlocked!`;
      output!.classList.remove("hidden");
      walletButtons!.classList.remove("hidden");
    } else {
      output!.textContent = "❌ Failed to unlock vault.";
    }
  };

  showHelpText();
}

async function getBalance() {
  if (!state.mnemonic) {
    return "Unavailable - please enter a mnemonic.";
  }
  const wallet = new Wallet(state.mnemonic);
  const balance = document.getElementById("balance");
  balance!.textContent = await wallet.balance().then((bal) => bal.toString());
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
