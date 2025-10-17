import { MeshWallet } from "@meshsdk/core";

export class CardanoWallet {
  private constructor(private meshWallet: MeshWallet) {}

  static async init(mnemonic: string): Promise<CardanoWallet> {
    const meshWallet = new MeshWallet({
      networkId: 0,
      // fetcher: blockchainProvider,
      // submitter: blockchainProvider,
      key: {
        type: "mnemonic",
        words: mnemonic.trim().split(" "),
      },
    });
    await meshWallet.init();
    const wallet = new CardanoWallet(meshWallet);
    return wallet;
  }

  static get nativeToken(): string {
    return "ADA";
  }

  static get allTokens(): string[] {
    return [CardanoWallet.nativeToken];
  }

  address(kind: "base" | "enterprise" | "reward" = "base"): string | undefined {
    const addresses = this.meshWallet.getAddresses();
    switch (kind) {
      case "base":
        return addresses.baseAddressBech32;
      case "enterprise":
        return addresses.enterpriseAddressBech32;
      case "reward":
        return addresses.rewardAddressBech32;
    }
  }

  async balance(): Promise<string> {
    return this.meshWallet.getLovelace();
  }
}
