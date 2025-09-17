import "dotenv/config";
import { formatUnits } from "ethers";

import { BitcoinWallet, EthereumWallet } from "@wallet";
import { Erc20ContractAddresses } from "./contract";

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("MNEMONIC is required");
  }
  const btcWallet = new BitcoinWallet(mnemonic);
  console.log(await btcWallet.utxos(0));
}

main().catch(console.error);
