import "dotenv/config";

export class AppConfiguration {
  private readonly configDir: string = process.env.CONFIG_DIR ?? "./.data";
  private readonly recoveryPhraseFile: string =
    process.env.RECOVERY_PHRASE_FILE ?? "wallet._phrase.json";
  private readonly walletDataFile: string =
    process.env.WALLET_DATA_FILE ?? "wallet._accounts.json";
  readonly mainnet: boolean = parseBoolOrNull(process.env.MAINNET) ?? true;

  get mnemonicPath(): string {
    const prefix = this.mainnet ? "" : "TESTNET-";
    return `${this.configDir}/${prefix + this.recoveryPhraseFile}`;
  }

  get walletDataPath(): string {
    const prefix = this.mainnet ? "" : "TESTNET-";
    return `${this.configDir}/${prefix + this.walletDataFile}`;
  }
}

function parseBoolOrNull(s?: string): boolean | null {
  if (s === null || s === undefined || s.length === 0) return null;
  return ["true", "t", "1"].includes(s.toLowerCase());
}
