import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { providerRpcEndpoint, Protocol } from "../provider";
import bip44, { Bip44Coin } from "../bip44";
import { AddressUtxoResult, addressUtxosAndBalance } from "./esplora";

const ECPair = ECPairFactory(ecc);

export class BitcoinWallet {
  private readonly mnemonic: string;
  private readonly protocol: Protocol = "bitcoin";
  private readonly rpcEndpoint: string;
  private readonly network: bitcoin.networks.Network;

  constructor(mnemonic: string, network: string = "testnet") {
    this.mnemonic = mnemonic;
    this.network =
      network === "mainnet"
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    this.rpcEndpoint = providerRpcEndpoint(this.protocol, network);
  }

  async address(addressIndex: number = 0): Promise<string> {
    const b44 = await bip44(this.mnemonic, {
      coin: Bip44Coin.bitcoin,
      addressIndex,
    });
    const { address } = bitcoin.payments.p2wpkh({
      network: this.network,
      pubkey: Buffer.from(b44.publicKey),
    });
    if (!address) {
      throw new Error("Unable to derive address");
    }
    return address;
  }

  async utxos(addressIndex: number = 0): Promise<AddressUtxoResult> {
    const mainnet = this.network === bitcoin.networks.bitcoin;
    return this.address(addressIndex).then((a) =>
      addressUtxosAndBalance(a, { mainnet }),
    );
  }
}
