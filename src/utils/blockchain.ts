export function satsToBTC(sats: number): string {
  const sign = sats < 0 ? "-" : "";
  const abs = Math.abs(sats);
  const whole = Math.floor(abs / 1e8);
  const frac = (abs % 1e8).toString().padStart(8, "0");
  return `${sign}${whole}.${frac}`;
}
