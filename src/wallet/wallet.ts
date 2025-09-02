import { EthereumWallet } from "./ethereum";
import { BitcoinWallet } from "./bitcoin";
import { WalletSettings } from "./settings";
import { RippleWallet } from "./ripple";

export type BitcoinAddressOptions = { protocol: "bitcoin" };
export type GenericAddressOptions = {
  protocol: "ethereum" | "ripple";
  addressIndex?: number;
  asset?: string;
};
export type WalletAddressOptions =
  | BitcoinAddressOptions
  | GenericAddressOptions;

export type BitcoinBalanceOptions = { protocol: "bitcoin" };
export type GenericBalanceOptions = {
  protocol: "ethereum" | "ripple";
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
  protocol: "ethereum" | "ripple";
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
        return this.ethereum.address(opts.addressIndex ?? 0);
      case "ripple":
        return this.ripple.address(opts.addressIndex ?? 0);
    }
  }

  async balance(opts: WalletBalanceOptions): Promise<number> {
    switch (opts.protocol) {
      case "bitcoin":
        const addressIndex = this.settings.wallet.bitcoin.addressIndex;
        const utxos = await this.bitcoin.utxos(addressIndex);
        return utxos.confirmedUtxos.reduce((s, u) => s + u.value, 0);
      case "ethereum":
        if (!opts.asset || opts.asset.toUpperCase() === "ETH") {
          return Number(this.ethereum.balance(opts.addressIndex ?? 0));
        }
        throw new Error("Non-native token balances unimplemented for Ethereum");
      case "ripple":
        if (!opts.asset || opts.asset.toUpperCase() === "XRP") {
          return Number(this.ripple.balance(opts.addressIndex ?? 0));
        }
        throw new Error("Non-native token balances unimplemented for Ripple");
    }
  }

  async send(opts: WalletSendOptions): Promise<string> {
    switch (opts.protocol) {
      case "bitcoin":
        const addressIndex = this.settings.wallet.bitcoin.addressIndex;
        const rotateAddress = this.settings.wallet.bitcoin.rotateAddress;
        const changeAddress = rotateAddress
          ? await this.bitcoin.address(addressIndex + 1)
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
    }
  }
}
