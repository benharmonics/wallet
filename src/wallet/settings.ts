import {
  readJsonFile,
  writeFileAtomic,
  encryptToFile,
  decryptFromFile,
} from "@utils/fs";

type ConfigPaths = { wallet: string; mnemonic: string };

export type WalletState = {
  bitcoin: { addressIndex: number; rotateAddress: boolean };
  ethereum: { accounts: number[] };
  ripple: { accounts: number[] };
};

const DEFAULT_WALLET_SETTINGS: WalletState = {
  bitcoin: { addressIndex: 0, rotateAddress: true },
  ethereum: { accounts: [0] },
  ripple: { accounts: [0] },
};

export type WalletSettingsLoadOptions = {
  password: string;
  mnemonicPath: string;
  walletStatePath: string;
};

export class WalletSettings {
  private constructor(
    public wallet: WalletState,
    readonly mnemonic: string,
    private readonly configPaths: ConfigPaths,
  ) {}

  async save(): Promise<void> {
    return saveSettings(this.wallet, this.configPaths.wallet);
  }

  static async unsafeEncryptMnemonicFile(
    password: string,
    mnemonic: string,
    path: string,
  ): Promise<void> {
    await encryptToFile(password, mnemonic, path);
  }

  static async load(opts: WalletSettingsLoadOptions): Promise<WalletSettings> {
    const [settings, mnemonic] = await Promise.all([
      loadSettings(opts.walletStatePath),
      decryptFromFile(opts.password, opts.mnemonicPath),
    ]);
    const config: ConfigPaths = {
      mnemonic: opts.mnemonicPath,
      wallet: opts.walletStatePath,
    };
    return new WalletSettings(settings, mnemonic, config);
  }
}

export async function saveSettings(
  settings: WalletState,
  path: string,
): Promise<void> {
  return writeFileAtomic(path, JSON.stringify(settings));
}

export async function loadSettings(path: string): Promise<WalletState> {
  return readJsonFile<WalletState>(path).catch((_) => {
    saveSettings(DEFAULT_WALLET_SETTINGS, path).catch((e) =>
      console.error(`Failed to save wallet settings: ${e}`),
    );
    return DEFAULT_WALLET_SETTINGS;
  });
}
