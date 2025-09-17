/**
 * @description - Executes a given function `n` times at fixed intervals specified by `timeout`.
 *
 * @example
 * retry(() => {
 *   console.log("Attempted at", new Date().toISOString());
 * }, 5, 1000);
 */
export function repeat(fn: () => void, n: number, timeout: number): void {
  let attempts = 0;
  const interval = setInterval(() => {
    fn();
    attempts++;
    if (attempts >= n) {
      clearInterval(interval);
    }
  }, timeout);
}
