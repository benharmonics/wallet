const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVault(
  secret: string,
  password: string,
): Promise<void> {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(secret),
  );

  const payload = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(encrypted)),
  };

  localStorage.setItem("vault", JSON.stringify(payload));
  alert("Vault encrypted and saved.");
}

export async function decryptVault(password: string): Promise<string | null> {
  const payload = loadVault();
  if (!payload) return null;

  const { salt, iv, ciphertext } = payload;
  const key = await deriveKey(password, new Uint8Array(salt));

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ciphertext),
    );
    return decoder.decode(decrypted);
  } catch (err) {
    console.error("Failed to decrypt vault:", err);
    return null;
  }
}

export function hasVault(): boolean {
  return Boolean(localStorage.getItem("vault"));
}

function loadVault(): {
  salt: number[];
  iv: number[];
  ciphertext: number[];
} | null {
  const raw = localStorage.getItem("vault");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
