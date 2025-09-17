import {
  readJsonFile,
  writeFileAtomic,
  encryptToFile,
  decryptFromFile,
} from "@utils/fs";

type ConfigPaths = { wallet: string; mnemonic: string };

export type WalletAccounts = {
  bitcoin: { addressIndex: number; rotateAddress: boolean };
  ethereum: { accounts: number[] };
  ripple: { accounts: number[] };
  stellar: { accounts: number[] };
};

const DEFAULT_WALLET_ACCOUNTS: WalletAccounts = {
  bitcoin: { addressIndex: 0, rotateAddress: true },
  ethereum: { accounts: [0] },
  ripple: { accounts: [0] },
  stellar: { accounts: [] },
};

export type WalletSettingsLoadOptions = {
  password: string;
  mnemonicPath: string;
  walletDataPath: string;
};

export class WalletSettings {
  private constructor(
    public accounts: WalletAccounts,
    readonly mnemonic: string,
    private readonly configPaths: ConfigPaths,
  ) {}

  async save(): Promise<void> {
    return saveSettings(this.accounts, this.configPaths.wallet);
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
      loadSettings(opts.walletDataPath),
      decryptFromFile(opts.password, opts.mnemonicPath),
    ]);
    const config: ConfigPaths = {
      mnemonic: opts.mnemonicPath,
      wallet: opts.walletDataPath,
    };
    return new WalletSettings(settings, mnemonic, config);
  }
}

export async function saveSettings(
  settings: WalletAccounts,
  path: string,
): Promise<void> {
  return writeFileAtomic(path, JSON.stringify(settings));
}

export async function loadSettings(path: string): Promise<WalletAccounts> {
  return readJsonFile<WalletAccounts>(path).catch((_) => {
    saveSettings(DEFAULT_WALLET_ACCOUNTS, path).catch((e) =>
      console.error(`Failed to save wallet settings: ${e}`),
    );
    return DEFAULT_WALLET_ACCOUNTS;
  });
}
