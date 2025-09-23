import {
  address,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  lamports,
  pipe,
  appendTransactionMessageInstruction,
  mainnet,
  Rpc,
  testnet,
  SolanaRpcSubscriptionsApi,
  RpcSubscriptions,
  SolanaRpcApiMainnet,
  createKeyPairSignerFromPrivateKeyBytes,
  KeyPairSigner,
  TransactionSigner,
  SolanaRpcApiTestnet,
  MessagePartialSigner,
  createSignableMessage,
  SignatureBytes,
  TransactionPartialSigner,
  TransactionMessage,
  TransactionMessageWithFeePayer,
  TransactionMessageWithLifetime,
  compileTransaction,
  assertIsSendableTransaction,
  getSignatureFromTransaction,
  Signature,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import bip44, { Bip44Coin } from "../bip44";
import { intToDecimal } from "@utils/blockchain";

const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAINNET_SUBSCRIPTIONS_URL = "wss://api.mainnet-beta.solana.com";
const DEVNET_SUBSCRIPTIONS_URL = "wss://api.devnet.solana.com";

export type SolanaSendOptions = {
  valueSol: string;
  destination: string;
  addressIndex?: number;
  asset?: string;
};

export class SolanaWallet {
  private readonly rpc: Rpc<SolanaRpcApiMainnet>;
  private readonly rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
  private sendAndConfirmTransaction: ReturnType<
    typeof sendAndConfirmTransactionFactory
  >;

  constructor(
    private readonly mnemonic: string,
    isMainnet: boolean = false,
  ) {
    this.rpc = createSolanaRpc(
      isMainnet ? mainnet(MAINNET_RPC_URL) : testnet(DEVNET_RPC_URL),
    );
    this.rpcSubscriptions = createSolanaRpcSubscriptions(
      isMainnet
        ? mainnet(MAINNET_SUBSCRIPTIONS_URL)
        : testnet(DEVNET_SUBSCRIPTIONS_URL),
    );
    this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions: this.rpcSubscriptions,
    });
  }

  async address(addressIndex: number = 0): Promise<string> {
    const signer = await this.signer(addressIndex);
    return signer.address;
  }

  /**
   * Send SOL to a destination.
   * @param destination base58 address
   * @param valueSol amount in SOL (use decimals)
   * @returns confirmed transaction signature (base58)
   */
  async send({
    valueSol,
    destination,
    addressIndex,
    asset,
  }: SolanaSendOptions): Promise<Signature> {
    if (asset && asset.toUpperCase() !== "SOL") {
      throw new Error("Non-native token withdrawals unimplemented for Solana");
    }
    const sender = await this.signer(addressIndex ?? 0);
    const txMessage = await getTransferSolTransactionMessage(
      sender,
      valueSol,
      destination,
      this.rpc,
    );
    const signedTx = await signTransactionMessageWithSigners(txMessage);
    assertIsSendableTransaction(signedTx);
    await this.sendAndConfirmTransaction(signedTx, { commitment: "processed" });
    return getSignatureFromTransaction(signedTx);
  }

  /**
   * Get the native SOL balance for an address.
   */
  async balance(
    addressIndex: number = 0,
  ): Promise<{ lamports: bigint; sol: string }> {
    const addr = address(await this.address(addressIndex));
    const bal = await this.rpc.getBalance(addr).send();
    return { lamports: bal.value, sol: intToDecimal(bal.value, 9) };
  }

  private async signer(addressIndex: number): Promise<KeyPairSigner> {
    return createKeyPairSignerFromPrivateKeyBytes(
      this.privateKey(addressIndex),
    );
  }

  private privateKey(addressIndex: number): Uint8Array {
    const b44 = bip44(this.mnemonic, {
      coin: Bip44Coin.solana,
      addressIndex,
    });
    if (!b44.privateKey) {
      throw new Error("Failed to derive private key");
    }
    return b44.privateKey;
  }
}

async function getTransferSolTransactionMessage(
  signer: TransactionSigner,
  valueSol: string,
  destination: string,
  rpc: Rpc<SolanaRpcApiMainnet> | Rpc<SolanaRpcApiTestnet>,
) {
  const v = BigInt((Number(valueSol) * 1e9).toFixed(0));
  const amount = lamports(v);

  const instruction = getTransferSolInstruction({
    amount,
    destination: address(destination),
    source: signer,
  });
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  return pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => appendTransactionMessageInstruction(instruction, tx),
  );
}

async function signMessage(
  signer: MessagePartialSigner,
  message: string,
): Promise<SignatureBytes> {
  const [signatureDictionary] = await signer.signMessages([
    createSignableMessage(message),
  ]);
  return signatureDictionary[signer.address];
}

async function signTransaction(
  signer: TransactionPartialSigner,
  transactionMessage: TransactionMessage &
    TransactionMessageWithFeePayer &
    TransactionMessageWithLifetime,
): Promise<SignatureBytes> {
  const transaction = compileTransaction(transactionMessage);
  const [signatureDictionary] = await signer.signTransactions([transaction]);
  return signatureDictionary[signer.address];
}
