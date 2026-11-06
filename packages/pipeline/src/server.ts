/**
 * Lab-node job service (runs on the Azure VM, behind Caddy for TLS).
 *
 *   POST /jobs              server→server, Bearer PIPELINE_API_TOKEN: { patient, patientPubKey, nullifier? }
 *                           → { jobId, uploadUrl, expiresAt }
 *   PUT  /jobs/:id/vcf      browser (CORS), ?token=<upload token>: raw VCF bytes (≤ 2 GB), streamed to disk
 *   GET  /jobs/:id          server→server, Bearer: job status (state, step, log tail, result)
 *   GET  /healthz           liveness + whether Swarm/Arkiv are configured
 *
 * Jobs run one at a time (the VM has ~20 GB free). The plaintext input and the work directory
 * are deleted when a job finishes; only the result JSON (refs, keys, QC — no genotypes) is kept.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, statfs, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { isAddress } from "viem";
import { MAX_INPUT_BYTES } from "./config";
import { signUploadToken, verifyUploadToken } from "./upload-token";

export type JobState = "awaiting_upload" | "uploading" | "queued" | "processing" | "done" | "failed";

export interface Job {
  id: string;
  state: JobState;
  patient: string;
  patientPubKey: string;
  nullifier?: string;
  createdAt: string;
  updatedAt: string;
  uploadedBytes?: number;
  step?: string;
  log: string[];
  result?: unknown;
  error?: string;
}

export interface RunInput {
  job: Job;
  inputPath: string;
  workDir: string;
  resultPath: string;
  onLog: (line: string) => void;
}

export interface ServiceOptions {
  dataDir: string; // jobs/, in/, work/ live here
  apiToken: string;
  publicUrl: string; // e.g. https://lab.example.org — used in uploadUrl
  allowedOrigins: string[]; // browser origins allowed to PUT uploads
  uploadTtlSeconds?: number;
  maxInputBytes?: number;
  run?: (input: RunInput) => Promise<void>; // injectable for tests
  status?: () => Record<string, unknown>;
}

const LOG_LINES = 200;

/** Default runner: the pipeline CLI as a child process, so a crash can't take the service down. */
export function cliRunner({ dryRun }: { dryRun: boolean }) {
  return ({ job, inputPath, workDir, resultPath, onLog }: RunInput) =>
    new Promise<void>((resolve, reject) => {
      const args = [
        "src/cli.ts", "--vcf", inputPath, "--patient", job.patient, "--patient-pubkey", job.patientPubKey,
        "--work", workDir, "--result", resultPath,
        ...(job.nullifier ? ["--nullifier", job.nullifier] : []),
        ...(dryRun ? ["--dry-run"] : []),
      ];
      const child = spawn(process.execPath, [join("node_modules", "tsx", "dist", "cli.mjs"), ...args], { stdio: ["ignore", "pipe", "pipe"] });
      const lines = (chunk: Buffer) => chunk.toString().split("\n").filter(Boolean).forEach(onLog);
      child.stdout.on("data", lines);
      child.stderr.on("data", lines);
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`pipeline exited ${code}`))));
    });
}

export async function createJobService(opts: ServiceOptions): Promise<Server> {
  const jobsDir = join(opts.dataDir, "jobs");
  const inDir = join(opts.dataDir, "in", "jobs");
  const workRoot = join(opts.dataDir, "work", "jobs");
  await Promise.all([jobsDir, inDir, workRoot].map((d) => mkdir(d, { recursive: true })));

  const maxBytes = opts.maxInputBytes ?? MAX_INPUT_BYTES;
  const ttl = opts.uploadTtlSeconds ?? 3600;
  const run = opts.run ?? cliRunner({ dryRun: false });
  const jobs = new Map<string, Job>();
  const queue: string[] = [];
  let running = false;

  const save = async (job: Job) => {
    job.updatedAt = new Date().toISOString();
    await writeFile(join(jobsDir, `${job.id}.json`), JSON.stringify(job, null, 2));
  };

  async function load(id: string): Promise<Job | undefined> {
    if (jobs.has(id)) return jobs.get(id);
    try {
      const job = JSON.parse(await readFile(join(jobsDir, `${id}.json`), "utf8")) as Job;
      jobs.set(id, job);
      return job;
    } catch {
      return undefined;
    }
  }

  async function drain() {
    if (running) return;
    const id = queue.shift();
    if (!id) return;
    running = true;
    const job = jobs.get(id)!;
    const inputPath = join(inDir, `${id}.vcf.gz`);
    const workDir = join(workRoot, id);
    const resultPath = join(jobsDir, `${id}.result.json`);
    job.state = "processing";
    await save(job);
    try {
      await run({
        job, inputPath, workDir, resultPath,
        onLog: (line) => {
          job.log.push(line);
          if (job.log.length > LOG_LINES) job.log.splice(0, job.log.length - LOG_LINES);
          const m = line.match(/^\[\d\d:\d\d:\d\d\] (\S+)/);
          if (m) job.step = m[1];
        },
      });
      job.result = JSON.parse(await readFile(resultPath, "utf8"));
      job.state = "done";
    } catch (err) {
      job.state = "failed";
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      // Plaintext genome data never outlives the job.
      await rm(inputPath, { force: true });
      await rm(workDir, { recursive: true, force: true });
      await save(job);
      running = false;
      void drain();
    }
  }

  function cors(req: IncomingMessage, res: ServerResponse) {
    const origin = req.headers.origin;
    if (origin && opts.allowedOrigins.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
      res.setHeader("access-control-allow-methods", "PUT, OPTIONS");
      res.setHeader("access-control-allow-headers", "content-type");
      res.setHeader("access-control-max-age", "600");
    }
  }

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const authed = (req: IncomingMessage) => req.headers.authorization === `Bearer ${opts.apiToken}`;
  const publicJob = (j: Job) => ({ ...j, patientPubKey: undefined, nullifier: undefined });

  async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 10_000) throw new Error("body too large");
    }
    return JSON.parse(raw || "{}");
  }

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean); // ["jobs", id, "vcf"]
    try {
      if (req.method === "GET" && url.pathname === "/healthz") {
        return json(res, 200, { ok: true, queue: queue.length, running, ...(opts.status?.() ?? {}) });
      }

      if (req.method === "POST" && url.pathname === "/jobs") {
        if (!authed(req)) return json(res, 401, { error: "unauthorized" });
        const body = await readJson(req);
        const patient = String(body.patient ?? "");
        const patientPubKey = String(body.patientPubKey ?? "").replace(/^0x/, "");
        const nullifier = body.nullifier ? String(body.nullifier) : undefined;
        if (!isAddress(patient)) return json(res, 400, { error: "patient must be a wallet address" });
        if (!/^[0-9a-f]{64}$/i.test(patientPubKey)) return json(res, 400, { error: "patientPubKey must be 32-byte hex" });
        if (nullifier && !/^(0x)?[0-9a-f]{1,64}$/i.test(nullifier)) return json(res, 400, { error: "invalid nullifier" });
        const now = new Date().toISOString();
        const job: Job = { id: randomUUID(), state: "awaiting_upload", patient, patientPubKey, nullifier, createdAt: now, updatedAt: now, log: [] };
        jobs.set(job.id, job);
        await save(job);
        const token = signUploadToken(opts.apiToken, job.id, ttl);
        return json(res, 201, {
          jobId: job.id,
          uploadUrl: `${opts.publicUrl.replace(/\/$/, "")}/jobs/${job.id}/vcf?token=${token}`,
          expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
          maxBytes,
        });
      }

      if (parts[0] === "jobs" && parts[1] && parts[2] === "vcf") {
        cors(req, res);
        if (req.method === "OPTIONS") return res.writeHead(204).end();
        if (req.method !== "PUT") return json(res, 405, { error: "method not allowed" });
        const id = parts[1];
        if (!verifyUploadToken(opts.apiToken, id, url.searchParams.get("token"))) return json(res, 403, { error: "invalid or expired upload token" });
        const job = await load(id);
        if (!job) return json(res, 404, { error: "no such job" });
        if (job.state !== "awaiting_upload") return json(res, 409, { error: `job is ${job.state}` });
        const declared = Number(req.headers["content-length"] ?? 0);
        if (declared > maxBytes) return json(res, 413, { error: "VCF over 2 GB" });
        const fs = await statfs(opts.dataDir);
        if (declared && fs.bavail * fs.bsize < declared * 4) return json(res, 507, { error: "lab node is low on disk; try later" });

        job.state = "uploading";
        await save(job);
        let received = 0;
        const limit = new Transform({
          transform(chunk: Buffer, _e, cb) {
            received += chunk.length;
            cb(received > maxBytes ? new Error("VCF over 2 GB") : null, chunk);
          },
        });
        const inputPath = join(inDir, `${id}.vcf.gz`);
        try {
          await pipeline(req, limit, createWriteStream(inputPath));
        } catch (err) {
          await rm(inputPath, { force: true });
          job.state = "failed";
          job.error = `upload failed: ${(err as Error).message}`;
          await save(job);
          return json(res, received > maxBytes ? 413 : 400, { error: job.error });
        }
        job.uploadedBytes = received;
        job.state = "queued";
        await save(job);
        queue.push(id);
        void drain();
        return json(res, 202, { jobId: id, state: job.state, uploadedBytes: received, position: queue.length });
      }

      if (req.method === "GET" && parts[0] === "jobs" && parts[1] && parts.length === 2) {
        if (!authed(req)) return json(res, 401, { error: "unauthorized" });
        const job = await load(parts[1]);
        return job ? json(res, 200, publicJob(job)) : json(res, 404, { error: "no such job" });
      }

      return json(res, 404, { error: "not found" });
    } catch (err) {
      return json(res, 500, { error: err instanceof Error ? err.message : "internal error" });
    }
  });
}

// Entrypoint: `tsx src/server.ts`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("server.ts")) {
  const required = (name: string) => {
    const v = process.env[name]?.trim();
    if (!v) throw new Error(`${name} is required`);
    return v;
  };
  const dryRun = process.env.PIPELINE_DRY_RUN === "1";
  const server = await createJobService({
    dataDir: process.env.PIPELINE_DATA_DIR ?? "/gc",
    apiToken: required("PIPELINE_API_TOKEN"),
    publicUrl: required("PIPELINE_PUBLIC_URL"),
    allowedOrigins: required("PIPELINE_ALLOWED_ORIGINS").split(",").map((s) => s.trim()),
    run: cliRunner({ dryRun }),
    status: () => ({
      mode: dryRun ? "dry-run (no Swarm/Arkiv writes)" : "live",
      swarmConfigured: !!process.env.SWARM_BATCH_ID,
      arkivConfigured: !!process.env.ARKIV_PRIVATE_KEY,
      labAttestationConfigured: !!process.env.LAB_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_LAB_ATTESTATION,
    }),
  });
  const port = Number(process.env.PORT ?? 8080);
  server.listen(port, () => console.log(`job service on :${port} (${dryRun ? "dry-run" : "live"})`));
}
