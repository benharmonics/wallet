import "dotenv/config";

import { BitcoinWallet, loadSettings } from "@wallet";
import { decryptFromFile } from "@utils/fs";
const RECOVERY_PHRASE_PATH =
  process.env.RECOVERY_PHRASE_PATH ?? "/data/wallet._phrase.json";
const WALLET_DATA_PATH =
  process.env.WALLET_DATA_PATH ?? "/data/wallet._accounts.json";

async function main() {
  // await encryptToFile("password", mnemonic, WALLET_DATA_PATH);
  const mnemonic = await decryptFromFile("password", RECOVERY_PHRASE_PATH);
  const settings = await loadSettings(WALLET_DATA_PATH);

  const btcWallet = new BitcoinWallet(mnemonic);
  const iAddress = settings.bitcoin.addressIndex;
  const iChange = iAddress + 1;
  const iTo = 100;

  console.log(
    `UTXO(s) on wallet ${iAddress}:`,
    await btcWallet.utxos(iAddress),
  );
  console.log(
    `UTXO(s) on wallet ${iTo} (arbitrary destination wallet):`,
    await btcWallet.utxos(iTo),
  );
  //
  // // Send transaction
  // const [to, change] = await Promise.all([
  //   btcWallet.address(iTo),
  //   btcWallet.address(iChange),
  // ]);
  // const amount = "0.001";
  // const txId = await btcWallet.send(amount, to, iAddress, change);
  // console.log(`Sent ${amount} BTC to ${to}: ${txId}`);
}

main().catch(console.error);
