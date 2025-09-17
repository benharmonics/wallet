import "dotenv/config";

import { BitcoinWallet, WalletSettings } from "@wallet";
const RECOVERY_PHRASE_PATH =
  process.env.RECOVERY_PHRASE_PATH ?? "./.data/wallet._phrase.json";
const WALLET_DATA_PATH =
  process.env.WALLET_DATA_PATH ?? "./.data/wallet._accounts.json";

async function main() {
  const settings = await WalletSettings.load({
    mnemonicPath: RECOVERY_PHRASE_PATH,
    walletStatePath: WALLET_DATA_PATH,
    password: "password",
  });

  const btcWallet = new BitcoinWallet(settings.mnemonic);
  const iAddress = settings.wallet.bitcoin.addressIndex;
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
