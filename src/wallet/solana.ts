import {
  address,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  appendTransactionMessageInstructions,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstruction,
  mainnet,
  Rpc,
  testnet,
  SolanaRpcSubscriptionsApi,
  RpcSubscriptions,
  SolanaRpcApiMainnet,
} from "@solana/kit";
import { Protocol } from "../provider";
import bip44, { Bip44Coin } from "../bip44";

const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const MAINNET_SUBSCRIPTIONS_URL = "wss://api.mainnet-beta.solana.com";
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEVNET_SUBSCRIPTIONS_URL = "wss://api.devnet.solana.com";

export class SolanaWallet {
  private readonly protocol: Protocol = "solana";
  private readonly rpc: Rpc<SolanaRpcApiMainnet>;
  private readonly rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;

  constructor(private readonly mnemonic: string, isMainnet: boolean = false) {
    this.rpc = createSolanaRpc(isMainnet ? mainnet(MAINNET_RPC_URL) : testnet(DEVNET_RPC_URL));
    this.rpcSubscriptions = createSolanaRpcSubscriptions('ws://127.0.0.1:8900')
  }

  async address(addressIndex: number = 0): Promise<string> {
    const b44 = bip44(this.mnemonic, {
      coin: Bip44Coin.solana,
      addressIndex,
    });
    if (!b44.privateKey) {
      throw new Error("Failed to derive private key");
    }
    const signer = await createKeyPairSignerFromBytes(b44.privateKey);
    return signer.address;
  }

  /**
   * Send SOL to a destination.
   * @param destination base58 address
   * @param valueSol amount in SOL (use decimals)
   * @returns confirmed transaction signature (base58)
   */
  async send(valueSol: string, to: string, addressIndex: number = 0): Promise<string> {
    const b44 = bip44(this.mnemonic, {
      coin: Bip44Coin.solana,
      addressIndex,
    });
    if (!b44.privateKey) {
      throw new Error("Failed to derive private key");
    }
    const sender = await createKeyPairSignerFromBytes(b44.privateKey);

    const v = BigInt((Number(valueSol) * 1e9).toFixed(0));
    const amount = lamports(v);

    const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()

    let txMessage = pipe(
      createTransactionMessage({ version: 0}),
      tx => setTransactionMessageFeePayer(sender.address, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    throw new Error("Unimplemented");
  }

  /**
   * Get the native SOL balance for an address.
   * @returns { lamports: bigint, sol: number }
   */
  async balance(addessIndex: number = 0): Promise<{ lamports: bigint; sol: number }> {
    const sol = Number(value) / 1e9;
    return { lamports: value, sol };
  }
}
