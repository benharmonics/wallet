import { AppConfiguration } from "./config";
import { Wallet } from "@wallet";

async function run(): Promise<Wallet> {
  const { mnemonicPath, walletDataPath, mainnet } = new AppConfiguration();
  const wallet = await Wallet.new({
    mnemonicPath,
    walletDataPath,
    mainnet,
    password: "password",
  });
  const protocols = ["ethereum", "ripple", "bitcoin"] as const;
  protocols.forEach(async (protocol) => {
    const balance = await wallet.balance({ protocol });
    const address = await wallet.address({ protocol });
    console.log(
      `Protocol: ${protocol}, Address: ${address}, Balance: ${balance}`,
    );
  });
  return wallet;
}

function main() {
  run()
    .then((w) => w.disconnect())
    .catch(console.error);
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
}

main();
