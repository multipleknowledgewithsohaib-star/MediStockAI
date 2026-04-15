import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export function hashPassword(password: string) {
    const normalizedPassword = String(password ?? "");

    if (normalizedPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }

    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(normalizedPassword, salt, KEY_LENGTH).toString("hex");
    return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
    if (!storedHash || typeof storedHash !== "string") {
        return false;
    }

    const [prefix, salt, hash] = storedHash.split(":");
    if (prefix !== HASH_PREFIX || !salt || !hash) {
        return false;
    }

    const candidate = scryptSync(String(password ?? ""), salt, KEY_LENGTH);
    const target = Buffer.from(hash, "hex");

    if (candidate.length !== target.length) {
        return false;
    }

    return timingSafeEqual(candidate, target);
}
