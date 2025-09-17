import * as StellarSdk from "@stellar/stellar-sdk"

import bip44, { Bip44Coin } from "../bip44";
import { providerRpcEndpoint } from "src/provider";

const standardTimebounds = 300; // 5 minutes to sign/review/submit

export type SendOptions = {
  valueXlm: string,
  destination: string,
  asset?: string,
  memo?: any,
}

export class StellarWallet {
  constructor(private readonly mnemonic: string, private readonly mainnet: boolean = false) {
  }

  async pubKey(addressIndex: number = 0): Promise<string> {
    const pair = await this.keypair(addressIndex);
    return pair.publicKey();
  }

  async account(addressIndex: number = 0): Promise<StellarSdk.Horizon.AccountResponse> {
    const pubKey = await this.pubKey(addressIndex);
    return this.server().loadAccount(pubKey);
  }

  async send(opts: SendOptions, addressIndex: number = 0): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    const server = this.server();
    const [signer, source, fee] = await Promise.all([
      this.keypair(addressIndex),
      this.account(addressIndex),
      server.fetchBaseFee(),
    ]);
    const txBuilder = new StellarSdk.TransactionBuilder(source, {
      networkPassphrase: this.mainnet ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
      fee: fee.toString(),
    });
    if (opts.memo) {
      if (typeof opts.memo === "string") {
        txBuilder.addMemo(StellarSdk.Memo.text(opts.memo));
      } else if (typeof opts.memo === "object") {
        txBuilder.addMemo(StellarSdk.Memo.hash(opts.memo.toString("hex")));
      }
    }
    let asset = StellarSdk.Asset.native()
    if (opts.asset && opts.asset !== "native") {
      const parts = opts.asset.split(":");
      asset = new StellarSdk.Asset(parts[0], parts[1]);
    }
    txBuilder.addOperation(StellarSdk.Operation.payment({
      amount: opts.valueXlm,
      asset,
      destination: opts.destination,
    }));
    const tx = txBuilder.setTimeout(standardTimebounds).build();
    tx.sign(signer);
    return server.submitTransaction(tx);
  }

  private server(): StellarSdk.Horizon.Server {
    const horizonUrl = providerRpcEndpoint("stellar", this.mainnet ? "mainnet" : "testnet");
    return new StellarSdk.Horizon.Server(horizonUrl);
  }

  private async keypair(addressIndex: number): Promise<StellarSdk.Keypair> {
    const privKey = await this.bip44PrivateKey(addressIndex);
    return StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(privKey));
  }

  private async bip44PrivateKey(addressIndex: number): Promise<Uint8Array> {
    const b44 = await bip44(this.mnemonic, {
      coin: Bip44Coin.stellar,
      addressIndex,
    });
    if (!b44.privateKey) {
      throw new Error("Failed to derive private key");
    }
    return b44.privateKey;
  }
}
