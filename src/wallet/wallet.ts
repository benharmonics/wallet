import { EthereumWallet } from "./ethereum";
import { BitcoinWallet } from "./bitcoin";
import { WalletSettings } from "./settings";
import { RippleWallet } from "./ripple";
import { formatEther } from "ethers";
import { satsToBtc } from "@utils/blockchain";
import { StellarWallet } from "./stellar";
import { AppConfiguration } from "../config";

export type BitcoinAddressOptions = { protocol: "bitcoin" };
export type GenericAddressOptions = {
  protocol: "ethereum" | "ripple" | "stellar";
  addressIndex?: number;
  asset?: string;
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

export type NewWalletSettings = {
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
    this.stellar = new StellarWallet(
      settings.mnemonic,
      mainnet,
    );
  }

  public static async new(settings: NewWalletSettings): Promise<Wallet> {
    const wallet = new Wallet(
      await WalletSettings.load(settings),
      settings.mainnet,
    );
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
        const addressIndex = this.settings.wallet.bitcoin.addressIndex;
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
        const addressIndex = this.settings.wallet.bitcoin.addressIndex;
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
        if (!opts.asset || ["NATIVE", "XLM"].includes(opts.asset.toUpperCase())) {
          const acc = await this.stellar.account(opts.addressIndex);
          const native = acc.balances.find(b => b.asset_type === "native")!;
          return native.balance;
        }
        throw new Error("Non-native token balances unimplemented for Stellar");
    }
  }

  async send(opts: WalletSendOptions): Promise<string> {
    switch (opts.protocol) {
      case "bitcoin":
        const addressIndex = this.settings.wallet.bitcoin.addressIndex;
        const rotateAddress = this.settings.wallet.bitcoin.rotateAddress;
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
          this.settings.wallet.bitcoin.addressIndex++;
          this.settings
            .save()
            .catch((e) =>
              console.error(
                `CRITICAL: failed to upate Bitcoin address index. Was ${addressIndex}, now ${this.settings.wallet.bitcoin.addressIndex}. ${e}`,
              ),
            );
        }
        return txHash;
      case "ethereum":
        if (!opts.asset || opts.asset.toUpperCase() === "ETH") {
          const res = await this.ethereum.send(
            opts.amount,
            opts.destination,
            opts.addressIndex,
          );
          return res.hash;
        }
        throw new Error("Non-native token balances unimplemented for Ethereum");
      case "ripple":
        if (!opts.asset || opts.asset.toUpperCase() === "XRP") {
          const res = await this.ripple.send(
            opts.amount,
            opts.destination,
            opts.addressIndex,
          );
          return typeof res.id === "string" ? res.id : `${res.id}`;
        }
        throw new Error("Non-native token balances unimplemented for Ripple");
      case "stellar":
        const _opts = { valueXlm: opts.amount, destination: opts.destination, asset: opts.asset };
        const res = await this.stellar.send(_opts, opts.addressIndex);
        console.log("Sent Stellar transaction:", res);
        return res.hash;
    }
  }
}

let wallet: Wallet | null = null;
let lastAuth: Date | null = null;

export class WalletManager {
  private static appConfiguration = new AppConfiguration();
  private static logoutTimeout = 30 * 60 * 1000; // 30 minutes
  private static active = false;

  // Delete static Wallet intermittently
  private static authCheckSetInterval() {
    if (WalletManager.active) return;
    WalletManager.active = true;
    setInterval(() => {
      const authTimedOut = !WalletManager.lastAuth || new Date().getTime() - WalletManager.lastAuth.getTime() > WalletManager.logoutTimeout;
      const isAuthenticated = wallet !== null;
      if (authTimedOut && isAuthenticated) {
        console.log("Logging out - last auth:", WalletManager.lastAuth?.toLocaleString());
        wallet?.disconnect();
        wallet = null;
      }
    }, 10 * 1000);
  }

  static get wallet(): Wallet | null {
    return wallet;
  };

  static get lastAuth(): Date | null {
    return lastAuth;
  }

  static async auth(password: string = "password") {
    WalletManager.authCheckSetInterval();
    const { mnemonicPath, walletDataPath, mainnet } = WalletManager.appConfiguration;
    wallet = await Wallet.new({
      mnemonicPath,
      walletDataPath,
      mainnet,
      password,
    });
    lastAuth = new Date();
  }
}

