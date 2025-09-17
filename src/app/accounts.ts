import Wallet from "../wallet";
import { formatEther } from "ethers";
import { showModal, hideModal } from "./modal";
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
          <button id="decrement-address-index" class="text-xs bg-blue-700 hover:bg-blue-800 p-1 rounded">Prev</button>
          <button id="increment-address-index" class="text-xs bg-blue-700 hover:bg-blue-800 p-1 rounded">Next</button>
          <div class="flex space-x-2 items-end">
            <span id="address-index" class="text-sm">Address ${state.addressIndex}:</span>
            <span id="address" class="text-xs"></span>
          </div>
        </div>
        <button id="send" class="bg-linear-to-bl from-violet-500 to-fuchsia-500 py-2 px-4 rounded-xl text-xl text-white text-shadow font-semibold">Send</button>
      </div>
    </div>
  `;
}

export function bindWalletEvents() {
  document.getElementById("save")!.onclick = async () => {
    if (state.hasVault) {
      // TODO
    }
    const mnemonicWordsHtml: string[] = [];
    for (let wordNum = 1; wordNum <= 12; wordNum++) {
      mnemonicWordsHtml.push(`
        <div>
          <label class="col-span-2">${wordNum}</label>
          <span class="flex space-x-2">
            <input id="word${wordNum}" name="word${wordNum}" type="password" placeholder="Word ${wordNum}" class="border border-1 focus:border-blue-500 bg-neutral-100 rounded px-1" />
            <button id="word${wordNum}-btn" class="bg-neutral-300 hover:bg-neutral-400 rounded p-1 text-xs border border-1">Show</button>
          </span>
        </div>
      `);
    }
    showModal()
    const modal = document.getElementById("modal-content");
    modal!.innerHTML = `
      <h2 class="text-2xl font-semibold pb-5">Save new wallet</h2>
      <p class="px-2 py-1 bg-yellow-200 rounded ${state.hasVault ? "" : "hidden"}">
        <span class="font-semibold">WARNING: </span>
        You already have a wallet.
        If you remember your password, click the 'Unlock Vault' button instead.
      </p>
      <form id="save-form" class="grid" autocomplete="off">
        <div class="space-y-4">
          <div class="space-y-2">
            <div class="grid">
              <label>Password</label>
              <input name="password" type="password" name="password" placeholder="Choose a password to unlock your account" class="border border-1 focus:border-blue-500 bg-neutral-100 rounded px-1"/>
            </div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-2">
              <p class="col-span-2">Enter your 12-word mnemonic, one word at a time.</p>
              <p class="col-span-2">This information is encrypted saved in your local storage, never leaving your machine.</p>
              ${mnemonicWordsHtml.join("\n")}
            </div>
          </div>
          <div class="flex flex-1 justify-end space-x-4">
            <button id="save-cancel-btn" class="bg-linear-to-bl from-gray-800 to-gray-600 py-2 px-4 rounded-xl text-xl text-white text-shadow font-semibold">Cancel</button>
            <button type="submit" class="bg-linear-to-bl from-violet-500 to-fuchsia-500 py-2 px-4 rounded-xl text-xl text-white text-shadow font-semibold">Submit</button>
          </div>
        </div>
      </form>
    `;
    bindSaveFormEvents();
  };

  document.getElementById("unlock")!.onclick = async () => {
    showModal()
    const modal = document.getElementById("modal-content");
    modal!.innerHTML = `
      <h2 class="text-2xl font-semibold pb-5">Enter your password to unlock your wallet</h2>
      <form id="unlock-form" class="grid" autocomplete="off">
        <div class="space-y-4">
          <div class="space-y-2">
            <div class="grid">
              <label>Password</label>
              <input name="password" type="password" name="password" placeholder="Enter your password to unlock your account" class="border border-1 focus:border-blue-500 bg-neutral-100 rounded px-1"/>
            </div>
          </div>
          <div class="flex flex-1 justify-end space-x-4">
            <button id="unlock-cancel-btn" class="bg-linear-to-bl from-gray-800 to-gray-600 py-2 px-4 rounded-xl text-xl text-white text-shadow font-semibold">Cancel</button>
            <button type="submit" class="bg-linear-to-bl from-violet-500 to-fuchsia-500 py-2 px-4 rounded-xl text-xl text-white text-shadow font-semibold">Submit</button>
          </div>
        </div>
      </form>
    `;
    bindUnlockFormEvents();
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

function bindSaveFormEvents() {
  const form = document.getElementById("save-form");
  form!.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form as HTMLFormElement);
    const password = formData.get("password")!.toString();
    const words: string[] = [];
    for (let wordNum = 1; wordNum <= 12; wordNum++) {
      words.push(formData.get(`word${wordNum}`)!.toString())
    }
    const mnemonic = words.join(" ");

    await encryptVault(mnemonic, password);
    state.mnemonic = mnemonic;

    hideModal();
  })

  document.getElementById("save-cancel-btn")!.addEventListener("click", (e) => {
    e.preventDefault()
    hideModal()
  });

  for (let wordNum = 1; wordNum <= 12; wordNum++) {
    const input = document.getElementById(`word${wordNum}`) as HTMLInputElement;
    const button = document.getElementById(`word${wordNum}-btn`);
    button!.addEventListener("click", e => {
      e.preventDefault()
      if (input.type === "text") {
        input.type = "password";
        button!.textContent = "Show";
      } else {
        input.type = "text"
        button!.textContent = "Hide";
      }
    })
  }
}

function bindUnlockFormEvents() {
  const form = document.getElementById("unlock-form");
  form!.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideModal();

    const formData = new FormData(form as HTMLFormElement);
    const password = formData.get("password")!.toString();
    const result = await decryptVault(password);
    const output = document.getElementById("output");
    if (result) {
      const walletButtons = document.getElementById("wallet-buttons");
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
  })

  document.getElementById("unlock-cancel-btn")!.addEventListener("click", (e) => {
    e.preventDefault()
    hideModal()
  });
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
  document.getElementById("address-index")!.textContent = `Address ${addressIndex}:`;
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
