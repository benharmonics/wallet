import Wallet from "../wallet";
import { formatEther } from "ethers";
import { encryptVault, decryptVault, hasVault } from "./vault";

type WalletState = {
  mnemonic?: string | null;
  wallet?: Wallet | null;
  hasVault: boolean;
  addressIndex: number;
};

const state: WalletState = { hasVault: hasVault(), addressIndex: 0 };

export function walletPage() {
  return `
    <h1 class="text-4xl p-5 min-w-128 text-white font-semibold bg-linear-to-bl from-violet-500 to-fuchsia-500 rounded">Wallet</h1>
    <div class="flex flex-col space-y-5">
      <div id="vault-status"></div>
      <div class="flex space-x-5">
        <button id="unlock" class="text-white font-semibold rounded-3xl px-5 py-2 bg-blue-700 hover:bg-blue-800">🔓 Unlock Vault</button>
        <button id="save" class="text-white font-semibold rounded-3xl px-5 py-2 bg-gray-800 hover:bg-gray-900">🔑 ${state.hasVault ? "Enter New" : "Save"} Mnemonic</button>
      </div>
      <pre id="output" class="py-2 px-5 bg-neutral-300 text-gray-900 rounded-3xl hidden"></pre>
      <div id="wallet-buttons" class="hidden space-y-5">
        <div class="flex space-x-5 items-center">
          <span class="text-lg">Balance:</span>
          <span id="balance" class="text-xl font-semibold"></span>
        </div>
        <div class="flex space-x-2 items-center">
          <div class="flex space-x-1 items-center">
            <button id="decrement-address-index" class="text-xs bg-blue-700 hover:bg-blue-800 p-1 rounded">Prev</button>
            <button id="increment-address-index" class="text-xs bg-blue-700 hover:bg-blue-800 p-1 rounded">Next</button>
          </div>
          <span id="address-index" class="text-sm">Address ${state.addressIndex}:</span>
          <span id="address" class="text-xs"></span>
        </div>
        <button id="send" class="bg-linear-to-bl from-violet-500 to-fuchsia-500 py-2 px-4 rounded-xl text-xl text-white text-shadow font-semibold">Send</button>
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
      getAddress();
      output!.textContent = `🔓 Vault unlocked!`;
      output!.classList.remove("hidden");
      walletButtons!.classList.remove("hidden");
    } else {
      output!.textContent = "❌ Failed to unlock vault.";
    }
  };

  document.getElementById("increment-address-index")!.onclick = async () => {
    state.addressIndex++;
    await setAddressIndex(state.addressIndex);
  }

  document.getElementById("decrement-address-index")!.onclick = async () => {
    if (state.addressIndex <= 0) return;
    state.addressIndex--;
    await setAddressIndex(state.addressIndex);
  }

  showHelpText();
}

async function getBalance(wallet?: Wallet) {
  if (!state.mnemonic) {
    return "Unavailable - please enter a mnemonic.";
  }
  const balance = document.getElementById("balance");
  balance!.textContent = "Loading...";
  wallet ??= new Wallet(state.mnemonic);
  const balanceWei = await wallet.balance(state.addressIndex);
  balance!.textContent = `${formatEther(balanceWei)} ETH`;
}

async function getAddress(wallet?: Wallet) {
  if (!state.mnemonic) {
    return "Unavailable - please enter a mnemonic.";
  }
  wallet ??= new Wallet(state.mnemonic);
  document.getElementById("address")!.textContent = await wallet.address(state.addressIndex);
}

async function setAddressIndex(addressIndex: number, wallet?: Wallet) {
  if (!state.mnemonic) {
    return "Unavailable - please enter a mnemonic.";
  }
  document.getElementById("address-index")!.textContent = `Address: ${addressIndex}`;
  getBalance(wallet);
  getAddress(wallet);
}

function showHelpText() {
  const vaultStatus = document.getElementById("vault-status");
  if (state.hasVault && !state.mnemonic) {
    vaultStatus!.textContent = `Enter your password to unlock your wallet`;
  } else if (state.mnemonic) {
    vaultStatus!.textContent = "Your wallet has been unlocked.";
  }
}
