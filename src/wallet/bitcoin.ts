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
import { btcToSatoshis, satsToBtc } from "@utils/blockchain";

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
function dustThreshold(
  feeRate: number,
  inputVBytes: number = P2WPKH_WEIGHTS.inputVBytes,
): bigint {
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

  constructor(mnemonic: string, network: "testnet" | "mainnet" = "testnet") {
    this.mnemonic = mnemonic;
    this.network =
      network === "mainnet"
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
  }

  private get mainnet(): boolean {
    return this.network === bitcoin.networks.bitcoin;
  }

  private bip32(addressIndex: number): BIP32Interface {
    return bip44(this.mnemonic, { coin: Bip44Coin.bitcoin, addressIndex });
  }

  async utxos(addressIndex: number): Promise<AddressUtxoResult> {
    const address = this.address(addressIndex);
    return addressUtxosAndBalance(address, { mainnet: this.mainnet });
  }

  address(addressIndex: number): string {
    const b32 = this.bip32(addressIndex);
    const { address } = bitcoin.payments.p2wpkh({
      network: this.network,
      pubkey: Buffer.from(b32.publicKey),
    });
    if (!address) {
      throw new Error("Unable to derive address");
    }
    return address;
  }

  async send(
    amountBtc: string,
    destination: string,
    addressIndex: number,
    changeAddress?: string,
  ): Promise<string> {
    const [utxos, feeRates] = await Promise.all([
      this.utxos(addressIndex),
      feeEstimates({ mainnet: this.mainnet }),
    ]);
    const b32 = this.bip32(addressIndex);
    if (!b32.privateKey) {
      throw new Error("Failed to generate private key");
    }
    console.log(
      `Found ${utxos.utxos.length} UTXO(s) on ${utxos.address} (${utxos.confirmedUtxos.length} confirmed)`,
    );

    const balance = BigInt(utxos.balances.confirmed);
    const amount = btcToSatoshis(amountBtc);
    const feeRate = feeRates.medium;
    const dust = dustThreshold(feeRate);

    const outputs = [{ address: destination, value: Number(amount) }];

    // Change outputs & fee
    let fee = feeForTx(feeRate, utxos.confirmedUtxos.length, 1);
    const changeOneOutput = balance - amount - fee;
    if (changeOneOutput < 0) {
      throw new Error(
        `Insufficient balance: have ${balance} sats, need a minimum of ${amount + fee}`,
      );
    } else if (changeOneOutput <= dust) {
      console.warn(
        `Change ${changeOneOutput} sats below dust threshold of ${dust} - folding into fee instead of returning to ${changeAddress}`,
      );
    } else {
      // General case - add change output if possible
      fee = feeForTx(feeRate, utxos.confirmedUtxos.length, 2);
      const changeTwoOutputs = balance - amount - fee;
      if (changeTwoOutputs <= dust) {
        // Extremely rare edge case: adding change output renders it to dust, so we can't add it after all
        console.warn(
          `Tried to return change to ${changeAddress}, but ${changeTwoOutputs} sats would have been below dust threshold of ${dust} when accounting for fees - folding into fee instead`,
        );
      } else {
        changeAddress ??= utxos.address; // send back to origin if no change address provided
        console.log(
          `Bitcoin: sending change ${satsToBtc(Number(changeTwoOutputs))} BTC from ${utxos.address} to ${changeAddress}`,
        );
        outputs.push({
          address: changeAddress,
          value: Number(changeTwoOutputs),
        });
      }
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
      .signAllInputs(signer(ECPair.fromPrivateKey(b32.privateKey)));
    if (!psbt.validateSignaturesOfAllInputs(validator)) {
      throw new Error("One or more invalid signatures");
    }

    const txHex = psbt.finalizeAllInputs().extractTransaction().toHex();
    console.log(
      `Bitcoin: sending ${satsToBtc(Number(amount))} BTC from ${utxos.address} to ${destination} with fee ${satsToBtc(Number(fee))}`,
    );
    console.log("Bitcoin: transacton hex:", txHex);

    return broadcastTx(txHex, { mainnet: this.mainnet });
  }
}

// // ------------------ BTC tests ------------------
// const btcWallet = new BitcoinWallet(
//   settings.mnemonic,
//   mainnet ? "mainnet" : "testnet",
// );
// const iAddress = settings.wallet.bitcoin.addressIndex;
// const iChange = iAddress + 1;
// const iTo = 100;
//
// console.log(
//   `UTXO(s) on wallet ${iAddress}:`,
//   await btcWallet.utxos(iAddress),
// );
// console.log(
//   `UTXO(s) on wallet ${iTo} (arbitrary destination wallet):`,
//   await btcWallet.utxos(iTo),
// );
//
// // Send transaction
// const [to, change] = await Promise.all([
//   btcWallet.address(iTo),
//   btcWallet.address(iChange),
// ]);
// const amount = "0.0007";
// const txId = await btcWallet.send(amount, to, iAddress, change);
// settings.wallet.bitcoin.addressIndex++;
// console.log(`Sent ${amount} BTC to ${to}: ${txId}`);
