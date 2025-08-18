export function satsToBtc(sats: number): string {
  const sign = sats < 0 ? "-" : "";
  const abs = Math.abs(sats);
  const whole = Math.floor(abs / 1e8);
  const frac = (abs % 1e8).toString().padStart(8, "0");
  return `${sign}${whole}.${frac}`;
}

/**
 * Convert a BTC amount (string) to satoshis (BigInt).
 * @param btc - BTC amount as string (e.g. "0.00123456")
 * @returns Satoshis as BigInt
 */
export function btcToSatoshis(btc: string): bigint {
  // Multiply by 1e8 (100,000,000 satoshis per BTC) with string math to avoid floating-point errors
  const [intPart, fracPart = ""] = btc.split(".");
  const fracPadded = (fracPart + "00000000").slice(0, 8); // ensure 8 decimal places
  const satoshisStr = intPart + fracPadded;
  return BigInt(satoshisStr);
}
