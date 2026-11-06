import { existsSync } from "node:fs";
import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJobService, type RunInput } from "../src/server";
import { signUploadToken, verifyUploadToken } from "../src/upload-token";

const TOKEN = "service-secret";
const ORIGIN = "https://chainome.example";
const PATIENT = "0x000000000000000000000000000000000000dEaD";
const PUBKEY = "ab".repeat(32);

let server: Server;
let base: string;
let dataDir: string;
let run: ReturnType<typeof vi.fn<(input: RunInput) => Promise<void>>>;

async function start(extra: Partial<Parameters<typeof createJobService>[0]> = {}) {
  dataDir = await mkdtemp(join(tmpdir(), "gc-svc-"));
  server = await createJobService({
    dataDir, apiToken: TOKEN, publicUrl: "https://lab.example", allowedOrigins: [ORIGIN], run, ...extra,
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const auth = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };
async function createJob(body: object = { patient: PATIENT, patientPubKey: PUBKEY }) {
  return fetch(`${base}/jobs`, { method: "POST", headers: auth, body: JSON.stringify(body) });
}
function localUploadUrl(uploadUrl: string) {
  return uploadUrl.replace("https://lab.example", base);
}
async function waitFor(id: string, state: string) {
  for (let i = 0; i < 100; i++) {
    const job = await (await fetch(`${base}/jobs/${id}`, { headers: auth })).json();
    if (job.state === state) return job;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`job never reached ${state}`);
}

beforeEach(async () => {
  run = vi.fn(async ({ resultPath, onLog }: RunInput) => {
    onLog("[12:00:00] normalize wrote final.vcf.gz");
    onLog("[12:00:05] swarm     manifest abcd");
    await writeFile(resultPath, JSON.stringify({ manifestRef: "cd".repeat(32), datasetKey: "0x01" }));
  });
  await start();
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

describe("upload tokens", () => {
  it("verifies for the same job until expiry", () => {
    const t = signUploadToken("s", "job-1", 60, 1_000_000);
    expect(verifyUploadToken("s", "job-1", t, 1_000_000)).toBe(true);
    expect(verifyUploadToken("s", "job-1", t, 1_000_000 + 61_000)).toBe(false);
  });
  it("is bound to the job and the secret", () => {
    const t = signUploadToken("s", "job-1", 60);
    expect(verifyUploadToken("s", "job-2", t)).toBe(false);
    expect(verifyUploadToken("other", "job-1", t)).toBe(false);
  });
  it("rejects malformed or tampered tokens", () => {
    const t = signUploadToken("s", "job-1", 60);
    expect(verifyUploadToken("s", "job-1", null)).toBe(false);
    expect(verifyUploadToken("s", "job-1", "garbage")).toBe(false);
    expect(verifyUploadToken("s", "job-1", t.replace(/.$/, (c) => (c === "0" ? "1" : "0")))).toBe(false);
    const [exp, sig] = t.split(".");
    expect(verifyUploadToken("s", "job-1", `${Number(exp) + 3600}.${sig}`)).toBe(false); // can't extend expiry
  });
});

describe("job service", () => {
  it("healthz reports liveness", async () => {
    expect(await (await fetch(`${base}/healthz`)).json()).toMatchObject({ ok: true, queue: 0, running: false });
  });

  it("requires the service token to create or read jobs", async () => {
    expect((await fetch(`${base}/jobs`, { method: "POST", body: "{}" })).status).toBe(401);
    expect((await fetch(`${base}/jobs/x`)).status).toBe(401);
  });

  it("validates patient address, public key and nullifier", async () => {
    expect((await createJob({ patient: "bob", patientPubKey: PUBKEY })).status).toBe(400);
    expect((await createJob({ patient: PATIENT, patientPubKey: "short" })).status).toBe(400);
    expect((await createJob({ patient: PATIENT, patientPubKey: PUBKEY, nullifier: "not hex!" })).status).toBe(400);
  });

  it("runs the full lifecycle: create → upload → process → done, then deletes plaintext", async () => {
    const created = await createJob({ patient: PATIENT, patientPubKey: PUBKEY, nullifier: "0x1234" });
    expect(created.status).toBe(201);
    const { jobId, uploadUrl } = await created.json();
    expect(uploadUrl).toMatch(new RegExp(`^https://lab.example/jobs/${jobId}/vcf\\?token=`));

    const vcf = "##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS\n";
    const put = await fetch(localUploadUrl(uploadUrl), { method: "PUT", body: vcf, headers: { origin: ORIGIN } });
    expect(put.status).toBe(202);
    expect(put.headers.get("access-control-allow-origin")).toBe(ORIGIN);

    const job = await waitFor(jobId, "done");
    expect(job.result).toEqual({ manifestRef: "cd".repeat(32), datasetKey: "0x01" });
    expect(job.uploadedBytes).toBe(vcf.length);
    expect(job.step).toBe("swarm");
    expect(job.log).toHaveLength(2);
    expect(job.patientPubKey).toBeUndefined(); // not echoed back
    expect(job.nullifier).toBeUndefined();

    const input = run.mock.calls[0][0];
    expect(input.job.nullifier).toBe("0x1234");
    expect(existsSync(input.inputPath)).toBe(false); // plaintext VCF removed
    expect(existsSync(input.workDir)).toBe(false); // normalized VCF + segments removed
    expect(await readdir(join(dataDir, "jobs"))).toEqual(expect.arrayContaining([`${jobId}.json`, `${jobId}.result.json`]));
  });

  it("marks the job failed and still deletes plaintext when the pipeline fails", async () => {
    run.mockImplementationOnce(async ({ onLog }) => {
      onLog("[12:00:00] qc        boom");
      throw new Error("pipeline exited 1");
    });
    const { jobId, uploadUrl } = await (await createJob()).json();
    await fetch(localUploadUrl(uploadUrl), { method: "PUT", body: "x" });
    const job = await waitFor(jobId, "failed");
    expect(job.error).toBe("pipeline exited 1");
    expect(existsSync(run.mock.calls[0][0].inputPath)).toBe(false);
  });

  it("rejects uploads with a missing, wrong-job or expired token", async () => {
    const a = await (await createJob()).json();
    const b = await (await createJob()).json();
    expect((await fetch(`${base}/jobs/${a.jobId}/vcf`, { method: "PUT", body: "x" })).status).toBe(403);
    const bToken = new URL(b.uploadUrl).searchParams.get("token");
    expect((await fetch(`${base}/jobs/${a.jobId}/vcf?token=${bToken}`, { method: "PUT", body: "x" })).status).toBe(403);
  });

  it("accepts a job's upload only once", async () => {
    const { jobId, uploadUrl } = await (await createJob()).json();
    expect((await fetch(localUploadUrl(uploadUrl), { method: "PUT", body: "x" })).status).toBe(202);
    await waitFor(jobId, "done");
    expect((await fetch(localUploadUrl(uploadUrl), { method: "PUT", body: "x" })).status).toBe(409);
  });

  it("rejects an oversized declared Content-Length before reading, leaving the job open", async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await start({ maxInputBytes: 100 });
    const { jobId, uploadUrl } = await (await createJob()).json();
    const res = await fetch(localUploadUrl(uploadUrl), { method: "PUT", body: "x".repeat(500) });
    expect(res.status).toBe(413);
    expect(run).not.toHaveBeenCalled();
    expect((await (await fetch(`${base}/jobs/${jobId}`, { headers: auth })).json()).state).toBe("awaiting_upload");
  });

  it("enforces the size limit while streaming when no length is declared", async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await start({ maxInputBytes: 100 });
    const { jobId, uploadUrl } = await (await createJob()).json();
    const body = new ReadableStream({
      start(c) {
        for (let i = 0; i < 10; i++) c.enqueue(new TextEncoder().encode("x".repeat(50)));
        c.close();
      },
    });
    const res = await fetch(localUploadUrl(uploadUrl), { method: "PUT", body, duplex: "half" } as RequestInit);
    expect(res.status).toBe(413);
    expect(run).not.toHaveBeenCalled();
    const job = await (await fetch(`${base}/jobs/${jobId}`, { headers: auth })).json();
    expect(job.state).toBe("failed");
    expect(await readdir(join(dataDir, "in", "jobs"))).toEqual([]); // partial upload removed
  });

  it("answers CORS preflight only for allowed origins", async () => {
    const { uploadUrl } = await (await createJob()).json();
    const ok = await fetch(localUploadUrl(uploadUrl), { method: "OPTIONS", headers: { origin: ORIGIN } });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-methods")).toContain("PUT");
    const evil = await fetch(localUploadUrl(uploadUrl), { method: "OPTIONS", headers: { origin: "https://evil.example" } });
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("runs jobs one at a time", async () => {
    let active = 0;
    let peak = 0;
    run.mockImplementation(async ({ resultPath }) => {
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 20));
      await writeFile(resultPath, "{}");
      active--;
    });
    const jobsCreated = await Promise.all([createJob(), createJob(), createJob()].map(async (p) => (await p).json()));
    await Promise.all(jobsCreated.map((j) => fetch(localUploadUrl(j.uploadUrl), { method: "PUT", body: "x" })));
    await Promise.all(jobsCreated.map((j) => waitFor(j.jobId, "done")));
    expect(peak).toBe(1);
  });
});
