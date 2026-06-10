import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
  return `scrypt$v1$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, version, salt, hash] = passwordHash.split("$");
  if (algorithm !== "scrypt" || version !== "v1" || !salt || !hash) return false;

  const storedKey = Buffer.from(hash, "hex");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
  if (storedKey.length !== derivedKey.length) return false;

  return timingSafeEqual(storedKey, derivedKey);
}
