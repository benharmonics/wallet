import { AppConfiguration } from "./config";
import { BitcoinWallet, WalletSettings } from "@wallet";

async function main() {
  const { mnemonicPath, walletDataPath, mainnet } = new AppConfiguration();
  const settings = await WalletSettings.load({
    mnemonicPath,
    walletDataPath,
    password: "password",
  });

  const btcWallet = new BitcoinWallet(
    settings.mnemonic,
    mainnet ? "mainnet" : "testnet",
  );
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

  // // Send transaction
  // const [to, change] = await Promise.all([
  //   btcWallet.address(iTo),
  //   btcWallet.address(iChange),
  // ]);
  // const amount = "0.0007";
  // const txId = await btcWallet.send(amount, to, iAddress, change);
  // settings.wallet.bitcoin.addressIndex++;
  // console.log(`Sent ${amount} BTC to ${to}: ${txId}`);
}

main().catch(console.error);
