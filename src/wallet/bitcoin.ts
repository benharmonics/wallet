import ECPairFactory, { ECPairInterface } from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { providerRpcEndpoint, Protocol } from "../provider";
import bip44, { Bip44Coin } from "../bip44";
import {
  AddressUtxoResult,
  addressUtxosAndBalance,
  broadcastTx,
  EsploraUtxo,
  feeEstimates,
} from "./esplora";
import { BIP32Interface } from "bip32";
import { btcToSatoshis } from "@utils/blockchain";

const ECPair = ECPairFactory(ecc);

type Weights = {
  inputVBytes: number; // ≈ 68 for P2WPKH
  outputVBytes: number; // ≈ 31 for P2WPKH
  overheadVBytes: number; // ≈ 10 (version+locktime+varints)
};

const P2WPKH_WEIGHTS: Weights = {
  inputVBytes: 68,
  outputVBytes: 31,
  overheadVBytes: 10,
};

function feeForTx(
  feeRate: number,
  numInputs: number,
  numOutputs: number,
  weights: Weights = P2WPKH_WEIGHTS,
): bigint {
  const vbytes =
    weights.overheadVBytes +
    numInputs * weights.inputVBytes +
    numOutputs * weights.outputVBytes;
  return BigInt(Math.ceil(vbytes * feeRate));
}

/**
 * Dust threshold per Bitcoin Core heuristic: 3 * inputVBytes * feeRate.
 * (Change below this should be added to the fee instead of creating an output.)
 */
function dustThreshold(feeRate: number, inputVBytes: number = P2WPKH_WEIGHTS.inputVBytes): bigint {
  const sats = Math.ceil(3 * inputVBytes * feeRate);
  return BigInt(sats);
}

const validator = (
  pubkey: Uint8Array,
  msghash: Uint8Array,
  signature: Uint8Array,
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);

const signer = (ecpair: ECPairInterface): bitcoin.Signer => ({
  publicKey: Buffer.from(ecpair.publicKey),
  sign: (hash: Buffer) => Buffer.from(ecpair.sign(hash)),
});

export class BitcoinWallet {
  private readonly mnemonic: string;
  private readonly protocol: Protocol = "bitcoin";
  private readonly network: bitcoin.networks.Network;
  private readonly rpcEndpoint: string;

  constructor(mnemonic: string, network: "testnet" | "mainnet" = "testnet") {
    this.mnemonic = mnemonic;
    this.network =
      network === "mainnet"
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    this.rpcEndpoint = providerRpcEndpoint(this.protocol, network);
  }

  private get mainnet(): boolean {
    return this.network === bitcoin.networks.bitcoin;
  }

  async utxos(addressIndex: number): Promise<AddressUtxoResult> {
    const address = await this.address(addressIndex);
    return addressUtxosAndBalance(address, { mainnet: this.mainnet });
  }

  private async bip32(addressIndex: number): Promise<BIP32Interface> {
    return bip44(this.mnemonic, { coin: Bip44Coin.bitcoin, addressIndex });
  }

  async address(addressIndex: number): Promise<string> {
    const b32 = await this.bip32(addressIndex);
    const { address } = bitcoin.payments.p2wpkh({
      network: this.network,
      pubkey: Buffer.from(b32.publicKey),
    });
    if (!address) {
      throw new Error("Unable to derive address");
    }
    return address;
  }

  async send(amountBtc: string, to: string, addressIndex: number): Promise<string> {
    const [b32, utxos, feeRate, changeAddress] = await Promise.all([
      this.bip32(addressIndex),
      this.utxos(addressIndex),
      feeEstimates({ mainnet: this.mainnet }),
      this.address(addressIndex + 1),
    ]);
    if (!b32.privateKey) {
      throw new Error("Failed to generate private key");
    }
    const keypair = ECPair.fromPrivateKey(b32.privateKey);

    const balance = BigInt(utxos.balances.confirmed);
    const amount = btcToSatoshis(amountBtc);
    const _feeRate = feeRate.medium;
    const dust = dustThreshold(_feeRate);

    const outputs = [{ address: to, value: Number(amount) }];

    // Fee & change outputs
    let fee = feeForTx(_feeRate, utxos.confirmedUtxos.length, 1)
    const changeOneOutput = balance - amount - fee;
    if (changeOneOutput < 0) {
      throw new Error(`Insufficient balance: have ${balance}, need ${amount + fee}`);
    } else if (changeOneOutput > dust) {
      fee = feeForTx(_feeRate, utxos.confirmedUtxos.length, 2);
      const changeTwoOutputs = balance - amount - fee;
      if (changeTwoOutputs > dust) {
        console.log(`Sending change ${changeTwoOutputs} to ${changeAddress}`);
        outputs.push({ address: changeAddress, value: Number(changeTwoOutputs) });
      } else {
        console.warn(`Tried to return change to ${changeAddress}, but change would have been below dust threshold of ${dust} when accounting for fees - folding into fee instead`);
      }
    } else {
      console.warn(`Change ${changeOneOutput} below dust threshold of ${dust} - folding into fee instead of returning to ${changeAddress}`);
    }

    const toInput = (utxo: EsploraUtxo) => ({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(utxos.address, this.network),
        value: utxo.value,
      },
    });

    const psbt = new bitcoin.Psbt({ network: this.network })
      .addInputs(utxos.confirmedUtxos.map(toInput))
      .addOutputs(outputs)
      .signAllInputs(signer(keypair));
    if (!psbt.validateSignaturesOfAllInputs(validator)) {
      throw new Error("One or more invalid signatures");
    }

    const txHex = psbt.finalizeAllInputs().extractTransaction().toHex();
    console.log(`Bitcoin transaction: sending ${amount} from ${utxos.address} to ${to}`);
    console.log("Transacton hex:", txHex);

    return broadcastTx(txHex, { mainnet: this.mainnet });
  }
}
