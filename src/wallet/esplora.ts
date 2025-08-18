import {
  fetchJson,
  JsonRequestOptions,
  DEFAULT_JSON_REQUEST_OPTIONS,
} from "@utils/http";

export type EsploraProvider = "mempool.space" | "blockstream";

export type EsploraUtxo = {
  txid: string;
  vout: number;
  value: number; // sats
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
};

export type AddressBalances = {
  confirmed: number; // sats
  mempool: number; // sats (unconfirmed outputs)
  total: number; // sats
};

export type AddressUtxoResult = {
  address: string;
  utxos: EsploraUtxo[];
  confirmedUtxos: EsploraUtxo[];
  unconfirmedUtxos: EsploraUtxo[];
  balances: AddressBalances;
};

export type AddressUtxosAndBalance = {
  requestOpts?: JsonRequestOptions;
  provider?: EsploraProvider;
  mainnet?: boolean;
};

function esploraUrl(provider: EsploraProvider, mainnet: boolean): string {
  switch (provider) {
    case "mempool.space":
      return mainnet
        ? "https://mempool.space/api"
        : "https://mempool.space/testnet/api";
    case "blockstream":
      throw new Error("TODO");
  }
}

/**
 * Fetch UTXOs for an address and compute confirmed/mempool balances.
 * Works with any Esplora-compatible endpoint.
 */
export async function addressUtxosAndBalance(
  address: string,
  opts: AddressUtxosAndBalance = {},
): Promise<AddressUtxoResult> {
  const baseUrl = esploraUrl(
    opts.provider ?? "mempool.space",
    opts.mainnet ?? false,
  );
  const url = `${baseUrl}/address/${address}/utxo`;
  const cfg = { ...DEFAULT_JSON_REQUEST_OPTIONS, ...opts.requestOpts };

  const utxos: EsploraUtxo[] = await fetchJson(url, cfg);

  // Basic sanity check on required fields
  for (const u of utxos) {
    if (
      typeof u.txid !== "string" ||
      typeof u.vout !== "number" ||
      typeof u.value !== "number" ||
      typeof u.status?.confirmed !== "boolean"
    ) {
      throw new Error("Unexpected UTXO shape from Esplora endpoint");
    }
  }

  const confirmedUtxos = utxos.filter((u) => u.status.confirmed);
  const unconfirmedUtxos = utxos.filter((u) => !u.status.confirmed);

  const sum = (xs: EsploraUtxo[]) => xs.reduce((acc, u) => acc + u.value, 0);

  const balances: AddressBalances = {
    confirmed: sum(confirmedUtxos),
    mempool: sum(unconfirmedUtxos),
    total: sum(utxos),
  };

  return {
    address,
    utxos,
    confirmedUtxos,
    unconfirmedUtxos,
    balances,
  };
}
