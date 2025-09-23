import {
  parseEther,
  getDefaultProvider,
  parseUnits,
  Contract,
  Provider,
  TransactionResponse,
  Wallet,
} from "ethers";
import { providerRpcEndpoint } from "../provider";
import bip44, { Bip44Coin } from "../bip44";
import erc20 from "../../abi/erc20.json";

// ERC-20 contract addresses
const erc20Contracts: Record<string, string> = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  RETH: "0xae78736Cd615f374D3085123A210448E74Fc6393", // rETH
  STETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH
  BNB: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  SHIB: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
  PEPE: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
};

export type EthereumNetwork = "mainnet" | "sepolia" | "holesky" | "hoodi";

export type Balance = { balance: bigint; decimals: number };
export type BalanceOptions = { symbol?: string; addressIndex?: number };

export type SendOptions = {
  amount: string;
  to: string;
  addressIndex?: number;
  symbol?: string;
};

export class EthereumWallet {
  private readonly mnemonic: string;
  private readonly provider: Provider;

  constructor(mnemonic: string, network: EthereumNetwork = "sepolia") {
    const rpcEndpoint = providerRpcEndpoint("ethereum", network);
    this.provider = getDefaultProvider(rpcEndpoint);
    this.mnemonic = mnemonic;
  }

  static get nativeToken(): string {
    return "ETH";
  }

  static get erc20Tokens(): string[] {
    return Object.keys(erc20Contracts);
  }

  static get allTokens(): string[] {
    return [EthereumWallet.nativeToken, ...EthereumWallet.erc20Tokens];
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
    const { symbol, addressIndex } = opts;
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
    const { symbol, to, amount, addressIndex } = opts;
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

  private wallet(addressIndex: number): Wallet {
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
    return new Wallet(sk, this.provider);
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
