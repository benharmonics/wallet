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

export type EsploraOptions = {
  requestOpts?: JsonRequestOptions;
  provider: EsploraProvider;
  mainnet: boolean;
};

export type FeeEstimateResult = {
  fast: number; // next block
  medium: number; // next half hour
  slow: number; // next hour
  economy: number; // cheapest today
  biweekly: number; // cheapest in about 3.5 days
  weekly: number; // cheapest in about a week
};

const DEFAULT_ESPLORA_OPTS: EsploraOptions = { provider: "mempool.space", mainnet: false };

function baseEsploraUrl(opts: EsploraOptions): string {
  switch (opts.provider) {
    case "mempool.space":
      return opts.mainnet
        ? "https://mempool.space/api"
        : "https://mempool.space/testnet/api";
    case "blockstream":
      return opts.mainnet
        ? "https://blockstream.info/api"
        : "https://blockstream.info/testnet/api";
  }
}

export async function broadcastTx(txHex: string, opts: Partial<EsploraOptions>): Promise<string> {
  const baseUrl = baseEsploraUrl({ ...DEFAULT_ESPLORA_OPTS, ...opts });
  const res = await fetch(`${baseUrl}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: txHex,
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Broadcast failed: ${res.status} ${res.statusText} - ${body}`);
  }
  return body.trim(); // txid
}

export async function feeEstimates(
  opts: Partial<EsploraOptions>,
): Promise<FeeEstimateResult> {
  const baseUrl = baseEsploraUrl({ ...DEFAULT_ESPLORA_OPTS, ...opts });
  const res: Record<string, number> = await fetchJson(
    `${baseUrl}/fee-estimates`,
  );
  return {
    fast: res["1"],
    medium: res["3"],
    slow: res["6"],
    economy: res["144"],
    biweekly: res["504"],
    weekly: res["1008"],
  };
}

/**
 * Fetch UTXOs for an address and compute confirmed/mempool balances.
 * Works with any Esplora-compatible endpoint.
 */
export async function addressUtxosAndBalance(
  address: string,
  opts: Partial<EsploraOptions>,
): Promise<AddressUtxoResult> {
  const baseUrl = baseEsploraUrl({ ...DEFAULT_ESPLORA_OPTS, ...opts });
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
