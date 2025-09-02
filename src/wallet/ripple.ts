import * as xrpl from "xrpl";
import { Bip44Change, Bip44Coin } from "../bip44";
import { providerRpcEndpoint, Protocol } from "../provider";

export type RippleNetwork = "mainnet" | "testnet" | "devnet";

export class RippleWallet {
  private readonly mnemonic: string;
  private readonly protocol: Protocol = "ripple";
  private readonly network: RippleNetwork;
  private client?: xrpl.Client;

  constructor(mnemonic: string, network: RippleNetwork = "testnet") {
    this.mnemonic = mnemonic;
    this.network = network;
  }

  async connect() {
    if (this.client) return;
    this.client = new xrpl.Client(
      providerRpcEndpoint(this.protocol, this.network),
    );
    await this.client.connect();
  }

  async disconnect() {
    await this.client?.disconnect();
    this.client = undefined;
  }

  private wallet(addressIndex: number) {
    return xrpl.Wallet.fromMnemonic(this.mnemonic, {
      derivationPath: `m/44'/${Bip44Coin.ripple}/0'/${Bip44Change.External}/${addressIndex}`,
    });
  }

  async address(addressIndex: number = 0): Promise<string> {
    return this.wallet(addressIndex).address;
  }

  /**
   * Balance in XRP
   */
  async balance(addressIndex: number = 0): Promise<number> {
    await this.connect();
    const wallet = this.wallet(addressIndex);
    return this.client!.getXrpBalance(wallet.address);
  }

  async send(
    amountXrp: string,
    destination: string,
    addressIndex: number = 0,
  ): Promise<xrpl.TxResponse> {
    await this.connect();
    const wallet = this.wallet(addressIndex);
    const prepared = await this.client!.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Amount: xrpl.xrpToDrops(amountXrp),
      Destination: destination,
    });
    const signed = wallet.sign(prepared);
    const result = await this.client!.submitAndWait(signed.tx_blob);
    return result;
  }
}
