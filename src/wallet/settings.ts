import { readJsonFile, writeFileAtomic } from "@utils/fs";

export type WalletSettings = {
  bitcoin: { addressIndex: number; rotateAddress: boolean };
  ethereum: { accounts: number[] };
  ripple: { accounts: number[] };
};

const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  bitcoin: { addressIndex: 0, rotateAddress: true },
  ethereum: { accounts: [0] },
  ripple: { accounts: [0] },
};

export async function saveSettings(
  settings: WalletSettings,
  path: string,
): Promise<void> {
  return writeFileAtomic(path, JSON.stringify(settings));
}

export async function loadSettings(path: string): Promise<WalletSettings> {
  return readJsonFile<WalletSettings>(path).catch((_) => {
    saveSettings(DEFAULT_WALLET_SETTINGS, path).catch((e) =>
      console.error(`Failed to save wallet settings: ${e}`),
    );
    return DEFAULT_WALLET_SETTINGS;
  });
}
