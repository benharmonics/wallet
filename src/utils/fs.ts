import {
  randomBytes,
  scrypt as scryptCb,
  createCipheriv,
  createDecipheriv,
  type BinaryLike,
  type ScryptOptions,
} from "node:crypto";
import { constants, promises as fs } from "node:fs";
import { dirname } from "node:path";

/** Strongly-typed Promise wrapper around callback-based crypto.scrypt */
function scryptAsync(
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCb(password, salt, keylen, options ?? {}, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Tunable constants (safe defaults)
const SALT_LEN = 16; // bytes
const IV_LEN = 12; // bytes (12 for GCM)
const KEY_LEN = 32; // 32 bytes -> AES-256
const SCRYPT_N = 1 << 15;
const SCRYPT_r = 8;
const SCRYPT_p = 1;

type EncryptedFileV1 = {
  v: 1;
  kdf: "scrypt";
  kdfParams: {
    N: number;
    r: number;
    p: number;
    saltB64: string;
    keyLen: number;
  };
  cipher: "aes-256-gcm";
  ivB64: string;
  ctB64: string;
  tagB64: string;
};

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return scryptAsync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
    // raise if you bump N/r/p a lot:
    maxmem: 512 * 1024 * 1024,
  });
}

async function encrypt(
  password: string,
  plaintext: string,
): Promise<EncryptedFileV1> {
  const salt = randomBytes(SALT_LEN);
  const key = await deriveKey(password, salt);
  const iv = randomBytes(IV_LEN);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    kdf: "scrypt",
    kdfParams: {
      N: SCRYPT_N,
      r: SCRYPT_r,
      p: SCRYPT_p,
      saltB64: salt.toString("base64"),
      keyLen: KEY_LEN,
    },
    cipher: "aes-256-gcm",
    ivB64: iv.toString("base64"),
    ctB64: ciphertext.toString("base64"),
    tagB64: tag.toString("base64"),
  };
}

async function decrypt(
  password: string,
  enc: EncryptedFileV1,
): Promise<string> {
  if (enc.v !== 1 || enc.cipher !== "aes-256-gcm" || enc.kdf !== "scrypt") {
    throw new Error("Unsupported format");
  }

  const salt = Buffer.from(enc.kdfParams.saltB64, "base64");
  const key = await scryptAsync(password, salt, enc.kdfParams.keyLen, {
    N: enc.kdfParams.N,
    r: enc.kdfParams.r,
    p: enc.kdfParams.p,
    maxmem: 512 * 1024 * 1024,
  });

  const iv = Buffer.from(enc.ivB64, "base64");
  const ct = Buffer.from(enc.ctB64, "base64");
  const tag = Buffer.from(enc.tagB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Ensure directory exists with 0700 */
async function ensureDirSecure(path: string) {
  const dir = dirname(path);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  // In case it already existed, tighten perms (best-effort)
  await fs.chmod(dir, 0o700).catch(() => {});
}

/** Atomic write: write to temp, fsync, rename */
export async function writeFileAtomic(path: string, data: string) {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;

  const handle = await fs.open(tmp, "wx", 0o600); // exclusive create, file mode 0600
  try {
    await handle.writeFile(data, { encoding: "utf8" });
    await handle.sync(); // flush file data
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, path); // atomic on same filesystem
}

export async function readJsonFile<TData>(path: string): Promise<TData> {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw) as TData;
}

export async function fileExists(path: string): Promise<boolean> {
  return fs
    .access(path, constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export async function encryptToFile(
  password: string,
  plaintext: string,
  path: string,
) {
  // Restrictive process umask so created files default ≤ 0600
  process.umask(0o077);

  await ensureDirSecure(path);
  const enc = await encrypt(password, plaintext);
  await writeFileAtomic(path, JSON.stringify(enc));
}

export async function decryptFromFile(
  password: string,
  path: string,
): Promise<string> {
  const enc: EncryptedFileV1 = await readJsonFile(path);
  return decrypt(password, enc);
}
