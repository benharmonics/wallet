import "dotenv/config";
import { formatUnits } from "ethers";

import Wallet from "./wallet";
import { Erc20ContractAddresses } from "./contract";

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("MNEMONIC is required");
  }
  const wallet = new Wallet(mnemonic);
  const [address0, address1, balanceRvl0, balanceRvl1] = await Promise.all([
    wallet.address(),
    wallet.address(1),
    wallet.balanceErc20(Erc20ContractAddresses.ravelSepolia),
    wallet.balanceErc20(Erc20ContractAddresses.ravelSepolia, 1),
  ]);
  console.log(
    "Balances (RVL):",
    formatUnits(balanceRvl0.balance, balanceRvl0.decimals),
    formatUnits(balanceRvl1.balance, balanceRvl1.decimals),
  );

  //const amount = "0.05";
  //const res = await wallet.send(amount, address1);
  //console.log(`Sent ${amount} ETH to ${address1} from ${address0}.`);
  //console.log("Transaction response:", JSON.stringify(res, null, 2));

  //const amount = "10";
  //const res = await wallet.sendErc20(Erc20ContractAddresses.ravelSepolia, amount, address1);
  //console.log(`Sent ${amount} RVL to ${address1} from ${address0}.`);
  //console.log("Transaction response:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
