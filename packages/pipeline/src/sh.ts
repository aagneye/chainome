import { spawn } from "node:child_process";

export interface RunResult {
  stdout: string;
  stderr: string;
}

/** Run a command (no shell), fail loudly with its stderr. */
export function run(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/**
 * Run a bash pipeline (bcftools stream chains). Arguments must be pre-quoted.
 * Use { pipefail: false } for pipelines that end in "head", which closes the pipe early.
 */
export function bash(script: string, opts: { cwd?: string; pipefail?: boolean } = {}): Promise<RunResult> {
  return run("bash", [...(opts.pipefail === false ? [] : ["-o", "pipefail"]), "-c", script], opts);
}

export function q(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Run async jobs with bounded concurrency, preserving input order in the result. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function retry<T>(label: string, attempts: number, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let a = 1; a <= attempts; a++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`  ↻ ${label} failed (attempt ${a}/${attempts}): ${(err as Error).message.split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, 1500 * a));
    }
  }
  throw last;
}

export function log(step: string, msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${step.padEnd(9)} ${msg}`);
}
