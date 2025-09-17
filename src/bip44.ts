import BIP32Factory, { BIP32Interface } from "bip32";
import * as ecc from "tiny-secp256k1";
import { mnemonicToSeed } from "@scure/bip39";

const bip32 = BIP32Factory(ecc);

export enum Bip44Coin {
  bitcoin = "0'",
  ethereum = "60'",
  ripple = "144'",
  solana = "501'",
}

export enum Bip44Change {
  External = "0",
  Internal = "1",
}

export type Bip44Args = {
  coin: Bip44Coin;
  account?: number;
  change?: Bip44Change;
  addressIndex: number;
};

export async function bip44(
  mnemonic: string,
  args: Bip44Args,
): Promise<BIP32Interface> {
  return bip32
    .fromSeed(await mnemonicToSeed(mnemonic))
    .derivePath("44'")
    .derivePath(args.coin)
    .derivePath(`${args.account ?? 0}'`)
    .derivePath(args.change ?? Bip44Change.External)
    .derivePath(`${args.addressIndex}`);
}

export default bip44;
