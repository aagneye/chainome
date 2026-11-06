/**
 * Swarm upload of ciphertext. Swarm splits every upload into 4 KB chunks and
 * returns one 64-hex root reference. We upload already-encrypted bytes WITHOUT
 * Swarm's own encryption: Swarm-encrypted references embed their key, and these
 * references are published in public Arkiv entities.
 */
import { readFile } from "node:fs/promises";
import { Bee } from "@ethersphere/bee-js";
import { env } from "./config";
import { retry } from "./sh";

let bee: Bee | undefined;

function client(): Bee {
  if (!env.swarmBatchId) throw new Error("SWARM_BATCH_ID is not set — get a postage batch first (see arkiv/swarm.md)");
  bee ??= new Bee(env.beeUrl);
  return bee;
}

/** Fail fast before hours of processing: node reachable and batch usable. */
export async function checkSwarm(): Promise<string> {
  const b = client();
  await b.status.getHealth();
  const batch = await b.stamp.get(env.swarmBatchId!);
  if (!batch.usable) throw new Error(`Postage batch ${env.swarmBatchId} exists but is not usable yet`);
  return `${env.beeUrl} (batch ${env.swarmBatchId!.slice(0, 10)}…)`;
}

/** Segments are a few to tens of MB; a Buffer body avoids chunked-encoding quirks with some gateways. */
export async function uploadFile(path: string, label: string): Promise<string> {
  const body = await readFile(path);
  return retry(`swarm upload ${label}`, 3, async () => {
    const res = await client().data.upload(env.swarmBatchId!, body, { pin: true });
    return res.reference.toHex();
  });
}

export async function uploadJson(value: unknown, label: string): Promise<string> {
  return retry(`swarm upload ${label}`, 3, async () => {
    const res = await client().data.upload(env.swarmBatchId!, JSON.stringify(value, null, 2), { pin: true });
    return res.reference.toHex();
  });
}
