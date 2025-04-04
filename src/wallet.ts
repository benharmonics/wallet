import {
  parseEther,
  getDefaultProvider,
  parseUnits,
  Contract,
  Networkish,
  Provider,
  TransactionResponse,
  Wallet as EWallet,
} from "ethers";
import { providerRpcEndpoint, Protocol } from "./provider";
import bip44, { Bip44Coin } from "./bip44";
import erc20 from "../abi/erc20.json";

export type Erc20Balance = { balance: bigint; decimals: number };

export default class Wallet {
  private readonly mnemonic: string;
  private readonly provider: Provider;
  private readonly protocol: Protocol;

  constructor(
    mnemonic: string,
    protocol: Protocol = "ethereum",
    network: Networkish = "sepolia",
  ) {
    const rpcEndpoint = providerRpcEndpoint(protocol, network);
    this.provider = getDefaultProvider(rpcEndpoint);
    this.mnemonic = mnemonic;
    this.protocol = protocol;
  }

  async address(addressIndex: number = 0): Promise<string> {
    return this.wallet(addressIndex).then((w) => w.getAddress());
  }

  async balance(addressIndex: number = 0): Promise<bigint> {
    return this.provider.getBalance(await this.address(addressIndex));
  }

  async send(
    amount: string,
    to: string,
    addressIndex: number = 0,
  ): Promise<TransactionResponse> {
    const [fees, wallet] = await Promise.all([
      maxFees(this.provider),
      this.wallet(addressIndex),
    ]);
    const { maxPriorityFeePerGas, maxFeePerGas } = fees;
    return wallet.sendTransaction({
      to,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: parseEther(amount),
    });
  }

  async balanceErc20(
    contractAddress: string,
    addressIndex: number = 0,
  ): Promise<Erc20Balance> {
    const contract = new Contract(contractAddress, erc20, this.provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(await this.address(addressIndex)),
      contract.decimals(),
    ]);
    return { balance, decimals };
  }

  async sendErc20(
    contractAddress: string,
    amount: string,
    to: string,
    addressIndex: number = 0,
  ): Promise<TransactionResponse> {
    const contract = new Contract(contractAddress, erc20, this.provider);
    const [fees, wallet, decimals] = await Promise.all([
      maxFees(this.provider),
      this.wallet(addressIndex),
      contract.decimals(),
    ]);
    const { maxPriorityFeePerGas, maxFeePerGas } = fees;
    const data = contract.interface.encodeFunctionData("transfer", [
      to,
      parseUnits(amount, decimals),
    ]);
    return wallet.sendTransaction({
      to: contractAddress,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: 0n,
      data,
    });
  }

  private async wallet(addressIndex: number): Promise<EWallet> {
    const b44 = await bip44(this.mnemonic, {
      coin: this.bip44Coin(),
      addressIndex,
    });
    if (!b44.privateKey) {
      throw new Error("Failed to derive private key");
    }
    const sk = Buffer.from(b44.privateKey).toString("hex");
    return new EWallet(sk, this.provider);
  }

  private bip44Coin(): Bip44Coin {
    switch (this.protocol) {
      case "ethereum":
        return Bip44Coin.ethereum;
      default:
        throw new Error(
          `Unsupported protocol ${this.protocol} - unkown BIP44 coin`,
        );
    }
  }
}

type MaxFees = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

async function maxFees(provider: Provider): Promise<MaxFees> {
  const block = await provider.getBlock("latest");
  const baseFee = block?.baseFeePerGas;
  if (!baseFee) {
    throw new Error(`Could not get gas latest block`);
  }
  const maxPriorityFeePerGas = parseUnits("2", "gwei");
  const maxFeePerGas = 2n * baseFee + maxPriorityFeePerGas;
  return { maxPriorityFeePerGas, maxFeePerGas };
}
