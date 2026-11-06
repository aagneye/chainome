import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived upload tokens. The app's server asks the job service for a job (with the shared
 * service token); the browser then PUTs the VCF straight to the lab node with this token, so a
 * 1–2 GB file never passes through Vercel, and nobody can upload into someone else's job.
 */
export function signUploadToken(secret: string, jobId: string, ttlSeconds: number, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${exp}.${mac(secret, jobId, exp)}`;
}

export function verifyUploadToken(secret: string, jobId: string, token: string | null, now = Date.now()): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig || exp < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(mac(secret, jobId, exp), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function mac(secret: string, jobId: string, exp: number): string {
  return createHmac("sha256", secret).update(`${jobId}.${exp}`).digest("hex");
}
