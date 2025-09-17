import { formatEther } from "ethers";
import { satsToBtc } from "@utils/blockchain";
import { EthereumWallet } from "./ethereum";
import { BitcoinWallet } from "./bitcoin";
import { WalletSettings, WalletAccounts } from "./settings";
import { RippleWallet } from "./ripple";
import { StellarWallet } from "./stellar";
import { AppConfiguration } from "../config";
import { Protocol } from "src/provider";

export type BitcoinAddressOptions = { protocol: "bitcoin" };
export type GenericAddressOptions = {
  protocol: "ethereum" | "ripple" | "stellar";
  addressIndex?: number;
};
export type WalletAddressOptions =
  | BitcoinAddressOptions
  | GenericAddressOptions;

export type BitcoinBalanceOptions = { protocol: "bitcoin" };
export type GenericBalanceOptions = {
  protocol: "ethereum" | "ripple" | "stellar";
  addressIndex?: number;
  asset?: string;
};
export type WalletBalanceOptions =
  | BitcoinBalanceOptions
  | GenericBalanceOptions;

export type BitcoinSendOptions = {
  protocol: "bitcoin";
  amount: string;
  destination: string;
};
export type GenericSendOptions = {
  protocol: "ethereum" | "ripple" | "stellar";
  amount: string;
  destination: string;
  addressIndex?: number;
  asset?: string;
};
export type WalletSendOptions = BitcoinSendOptions | GenericSendOptions;

export type TransactionResponse = {
  amount: string,
  asset: string,
  protocol: string,
  origin: string,
  destination: string,
  txHash: string,
};

export type WalletSaveDataOptions = {
  mnemonicPath: string;
  walletDataPath: string;
  password: string;
  mainnet: boolean;
};

export class Wallet {
  private bitcoin: BitcoinWallet;
  private ethereum: EthereumWallet;
  private ripple: RippleWallet;
  private stellar: StellarWallet;

  private constructor(
    private settings: WalletSettings,
    mainnet: boolean,
  ) {
    this.bitcoin = new BitcoinWallet(
      settings.mnemonic,
      mainnet ? "mainnet" : "testnet",
    );
    this.ethereum = new EthereumWallet(
      settings.mnemonic,
      mainnet ? "mainnet" : "sepolia",
    );
    this.ripple = new RippleWallet(
      settings.mnemonic,
      mainnet ? "mainnet" : "testnet",
    );
    this.stellar = new StellarWallet(settings.mnemonic, mainnet);
  }

  get accounts(): WalletAccounts {
    return this.settings.accounts;
  }

  updateAccount(action: "add" | "remove", protocol: Protocol, addressIndex: number) {
    function removeTrackedAddress(accounts: number[]) {
      const i = accounts.indexOf(addressIndex);
      if (i !== -1) accounts.splice(i, 1);
    }
    function addTrackedAddress(accounts: number[]) {
      accounts.push(addressIndex);
      accounts.sort();
      let write = 1;
      for (let i = 1; i < accounts.length; i++) {
        if (accounts[i] !== accounts[i - 1]) accounts[write++] = accounts[i];
      }
      accounts.length = Math.max(write, 1);
    }
    let accounts: number[];
    switch (protocol) {
      case "bitcoin":
        throw new Error("Bitcoin doesn't really have addresses in the same sense as some others - enable address rotation to send change to a new address on each transaction")
      case "ripple":
        accounts = this.settings.accounts.ripple.accounts;
        break;
      case "ethereum":
        accounts = this.settings.accounts.ethereum.accounts;
        break;
      case "stellar":
        accounts = this.settings.accounts.stellar.accounts;
        break;
      default:
        throw new Error(`Failed to update protocol ${protocol}`);
    }
    switch (action) {
      case "add":
        addTrackedAddress(accounts)
      case "remove":
        removeTrackedAddress(accounts);
    }
    this.settings.save().then(() => console.log("Saved settings")).catch((e) => console.log(`Failed to save settings: ${e}`));
  }

  static async saveNew(
    mnemonic: string,
    opts: WalletSaveDataOptions,
  ): Promise<Wallet> {
    await WalletSettings.unsafeEncryptMnemonicFile(
      opts.password,
      mnemonic,
      opts.mnemonicPath,
    );
    return Wallet.loadFromDisk(opts);
  }

  static async loadFromDisk(opts: WalletSaveDataOptions): Promise<Wallet> {
    const settings = await WalletSettings.load(opts);
    const wallet = new Wallet(settings, opts.mainnet);
    await wallet.connect();
    return wallet;
  }

  async connect(): Promise<void> {
    await this.ripple.connect();
  }

  async disconnect(): Promise<void> {
    await this.ripple.disconnect();
  }

  async address(opts: WalletAddressOptions): Promise<string> {
    switch (opts.protocol) {
      case "bitcoin":
        const addressIndex = this.settings.accounts.bitcoin.addressIndex;
        return this.bitcoin.address(addressIndex);
      case "ethereum":
        return this.ethereum.address(opts.addressIndex);
      case "ripple":
        return this.ripple.address(opts.addressIndex);
      case "stellar":
        return this.stellar.pubKey(opts.addressIndex);
    }
  }

  async balance(opts: WalletBalanceOptions): Promise<string> {
    switch (opts.protocol) {
      case "bitcoin":
        const addressIndex = this.settings.accounts.bitcoin.addressIndex;
        const utxos = await this.bitcoin.utxos(addressIndex);
        const balSats = utxos.confirmedUtxos.reduce((s, u) => s + u.value, 0);
        return satsToBtc(balSats);
      case "ethereum":
        if (!opts.asset || opts.asset.toUpperCase() === "ETH") {
          const balWei = await this.ethereum.balance(opts.addressIndex);
          return formatEther(balWei);
        }
        throw new Error("Non-native token balances unimplemented for Ethereum");
      case "ripple":
        if (!opts.asset || opts.asset.toUpperCase() === "XRP") {
          return `${await this.ripple.balance(opts.addressIndex)}`;
        }
        throw new Error("Non-native token balances unimplemented for Ripple");
      case "stellar":
        if (
          !opts.asset ||
          ["NATIVE", "XLM"].includes(opts.asset.toUpperCase())
        ) {
          const acc = await this.stellar.account(opts.addressIndex);
          const native = acc.balances.find((b) => b.asset_type === "native")!;
          return native.balance;
        }
        throw new Error("Non-native token balances unimplemented for Stellar");
    }
  }

  async send(opts: WalletSendOptions): Promise<TransactionResponse> {
    switch (opts.protocol) {
      case "bitcoin":
        const addressIndex = this.settings.accounts.bitcoin.addressIndex;
        const rotateAddress = this.settings.accounts.bitcoin.rotateAddress;
        const changeAddress = rotateAddress
          ? this.bitcoin.address(addressIndex + 1)
          : undefined;
        const txHash = await this.bitcoin.send(
          opts.amount,
          opts.destination,
          addressIndex,
          changeAddress,
        );
        if (rotateAddress) {
          this.settings.accounts.bitcoin.addressIndex++;
          this.settings
            .save()
            .catch((e) =>
              console.error(
                `CRITICAL: failed to upate Bitcoin address index. Was ${addressIndex}, now ${this.settings.accounts.bitcoin.addressIndex}. ${e}`,
              ),
            );
        }
        return {
          txHash,
          origin: this.bitcoin.address(addressIndex),
          destination: opts.destination,
          amount: opts.amount,
          protocol: opts.protocol,
          asset: "BTC",
        };
      case "ethereum":
        if (!opts.asset || opts.asset.toUpperCase() === "ETH") {
          const res = await this.ethereum.send(
            opts.amount,
            opts.destination,
            opts.addressIndex,
          );
          return {
            txHash: res.hash,
            origin: await this.ethereum.address(opts.addressIndex),
            destination: opts.destination,
            amount: opts.amount,
            protocol: opts.protocol,
            asset: "ETH",
          };
        }
        throw new Error("Non-native token balances unimplemented for Ethereum");
      case "ripple":
        if (!opts.asset || opts.asset.toUpperCase() === "XRP") {
          const res = await this.ripple.send(
            opts.amount,
            opts.destination,
            opts.addressIndex,
          );
          return {
            txHash: typeof res.id === "string" ? res.id : `${res.id}`,
            origin: this.ripple.address(opts.addressIndex),
            destination: opts.destination,
            amount: opts.amount,
            protocol: opts.protocol,
            asset: "XRP",
          };
        }
        throw new Error("Non-native token balances unimplemented for Ripple");
      case "stellar":
        const _opts = {
          valueXlm: opts.amount,
          destination: opts.destination,
          asset: opts.asset,
        };
        const res = await this.stellar.send(_opts, opts.addressIndex);
        return {
          txHash: res.hash,
          origin: this.stellar.pubKey(opts.addressIndex),
          destination: opts.destination,
          amount: opts.amount,
          protocol: opts.protocol,
          asset: "XLM",
        };
    }
  }
}

let wallet: Wallet | null = null;
let lastAuth: Date | null = null;

export class WalletManager {
  private static readonly appConfiguration = new AppConfiguration();
  private static readonly logoutTimeout = 30 * 60 * 1000; // 30 minutes
  private static active = false;

  // Delete static Wallet intermittently
  private static authCheckSetInterval() {
    if (WalletManager.active) return;
    WalletManager.active = true;
    setInterval(() => {
      const authTimedOut =
        !WalletManager.lastAuth ||
        new Date().getTime() - WalletManager.lastAuth.getTime() >
          WalletManager.logoutTimeout;
      if (authTimedOut && WalletManager.isAuthenticated) {
        console.log(
          `Logging out - last auth: ${WalletManager.lastAuth?.toLocaleString()}`,
        );
        wallet?.disconnect();
        wallet = null;
      }
    }, 10 * 1000);
  }

  static get wallet(): Wallet | null {
    return wallet;
  }

  static get lastAuth(): Date | null {
    return lastAuth;
  }

  static get isAuthenticated(): boolean {
    return wallet !== null;
  }

  static async saveNew(mnemonic: string, password: string) {
    const { mnemonicPath, walletDataPath, mainnet } =
      WalletManager.appConfiguration;
    wallet = await Wallet.saveNew(mnemonic, {
      mnemonicPath,
      walletDataPath,
      mainnet,
      password,
    });
  }

  static async auth(password: string) {
    WalletManager.authCheckSetInterval();
    const { mnemonicPath, walletDataPath, mainnet } =
      WalletManager.appConfiguration;
    wallet = await Wallet.loadFromDisk({
      mnemonicPath,
      walletDataPath,
      mainnet,
      password,
    });
    lastAuth = new Date();
  }
}
