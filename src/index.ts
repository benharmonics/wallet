import "dotenv/config";
// import { formatUnits } from "ethers";

import { RippleWallet } from "@wallet";
// import { Erc20ContractAddresses } from "./contract";

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("MNEMONIC is required");
  }
  const wallet = new RippleWallet(mnemonic);
  console.log("Address:", await wallet.address());
  console.log("Balance:", await wallet.balance());
  console.log("Address 2:", await wallet.address(1));
  console.log("Balance 2:", await wallet.balance(1));
  // const res = await wallet.send("20", await wallet.address(1))
  // console.log("Sent XRP:", res);
  await wallet.disconnect();
  // const btcWallet = new BitcoinWallet(mnemonic);
  //
  // const iAddress = 0;
  // const iChange = iAddress + 1;
  // const iTo = 100;
  //
  // console.log(
  //   `UTXO(s) on wallet ${iAddress}:`,
  //   await btcWallet.utxos(iAddress),
  // );

  // Send transaction
  // const [to, change] = await Promise.all([
  //   btcWallet.address(iTo),
  //   btcWallet.address(iChange),
  // ]);
  // const amount = "0.001";
  // const txId = await btcWallet.send(amount, to, iAddress, change);
  // console.log(`Sent ${amount} BTC to ${to}: ${txId}`);
}

main().catch(console.error);
