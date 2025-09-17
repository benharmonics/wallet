import {
  parseEther,
  getDefaultProvider,
  parseUnits,
  Contract,
  Provider,
  TransactionResponse,
  Wallet as EWallet,
} from "ethers";
import { providerRpcEndpoint } from "../provider";
import bip44, { Bip44Coin } from "../bip44";
import erc20 from "../../abi/erc20.json";

// ERC-20 contract addresses
const erc20Contracts: Record<string, string> = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
};

export type EthereumNetwork = "mainnet" | "sepolia" | "holesky" | "hoodi";

export type Balance = { balance: bigint; decimals: number };
export type BalanceOptions = { symbol?: string, addressIndex?: number };

export type SendOptions = {
  amount: string,
  to: string,
  addressIndex?: number,
  symbol?: string,
}

export class EthereumWallet {
  private readonly mnemonic: string;
  private readonly provider: Provider;

  constructor(mnemonic: string, network: EthereumNetwork = "sepolia") {
    const rpcEndpoint = providerRpcEndpoint("ethereum", network);
    this.provider = getDefaultProvider(rpcEndpoint);
    this.mnemonic = mnemonic;
  }

  static get erc20Tokens(): string[] {
    return Object.keys(erc20Contracts);
  }

  async address(addressIndex: number = 0): Promise<string> {
    return this.wallet(addressIndex).getAddress();
  }

  async balance(opts: BalanceOptions): Promise<Balance> {
    if (opts.symbol && opts.symbol.toUpperCase() !== "ETH") {
      return this.balanceErc20(opts);
    }
    const address = await this.address(opts.addressIndex ?? 0);
    const wei = await this.provider.getBalance(address);
    return { balance: wei, decimals: 18 };
  }

  async send(opts: SendOptions): Promise<TransactionResponse> {
    if (opts.symbol && opts.symbol.toUpperCase() !== "ETH") {
      return this.sendErc20(opts);
    }
    const fees = await maxFees(this.provider);
    const { maxPriorityFeePerGas, maxFeePerGas } = fees;
    return this.wallet(opts.addressIndex ?? 0).sendTransaction({
      to: opts.to,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: parseEther(opts.amount),
    });
  }

  private async balanceErc20(opts: BalanceOptions): Promise<Balance> {
    const {symbol, addressIndex} = opts;
    const contractAddress = erc20Contracts[symbol!.toUpperCase()];
    if (!contractAddress) {
      throw new Error(`Unsupported asset ${symbol}`);
    }
    const contract = new Contract(contractAddress, erc20, this.provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(await this.address(addressIndex)),
      contract.decimals(),
    ]);
    return { balance, decimals };
  }

  private async sendErc20(opts: SendOptions): Promise<TransactionResponse> {
    const {symbol, to, amount, addressIndex} = opts;
    const contractAddress = erc20Contracts[symbol!.toUpperCase()];
    if (!contractAddress) {
      throw new Error(`Unsupported asset ${symbol}`);
    }
    const contract = new Contract(contractAddress, erc20, this.provider);
    const [fees, decimals] = await Promise.all([
      maxFees(this.provider),
      contract.decimals(),
    ]);
    const { maxPriorityFeePerGas, maxFeePerGas } = fees;
    const data = contract.interface.encodeFunctionData("transfer", [
      to,
      parseUnits(amount, decimals),
    ]);
    return this.wallet(addressIndex ?? 0).sendTransaction({
      to: contractAddress,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: 0n,
      data,
    });
  }

  private wallet(addressIndex: number): EWallet {
    const b44 = bip44(this.mnemonic, {
      coin: Bip44Coin.ethereum,
      addressIndex,
    });
    if (!b44.privateKey) {
      throw new Error("Failed to derive private key");
    }
    const sk = [...b44.privateKey]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return new EWallet(sk, this.provider);
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
