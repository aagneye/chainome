import { describe, expect, it, vi } from "vitest";
import { bash, pool, q, retry, run } from "../src/sh";

describe("q (shell quoting)", () => {
  it.each(["plain", "with space", "it's", "$(rm -rf /)", "a'b'c", "back`tick`", ""])("passes %j through bash unchanged", async (s) => {
    const { stdout } = await bash(`printf %s ${q(s)}`);
    expect(stdout).toBe(s);
  });
});

describe("run / bash", () => {
  it("captures stdout", async () => {
    expect((await run("bash", ["-c", "echo hello"])).stdout.trim()).toBe("hello");
  });

  it("rejects with the exit code and stderr tail", async () => {
    await expect(run("bash", ["-c", "echo boom >&2; exit 3"])).rejects.toThrow(/exited 3[\s\S]*boom/);
  });

  it("fails a pipeline when an inner command fails (pipefail on by default)", async () => {
    await expect(bash("false | cat")).rejects.toThrow();
  });

  it("tolerates head closing the pipe early when pipefail is off", async () => {
    const { stdout } = await bash("yes line | head -1", { pipefail: false });
    expect(stdout.trim()).toBe("line");
  });
});

describe("pool", () => {
  it("preserves input order in results", async () => {
    const out = await pool([30, 5, 20, 1], 2, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return i;
    });
    expect(out).toEqual([0, 1, 2, 3]);
  });

  it("never runs more than `limit` jobs at once", async () => {
    let active = 0;
    let peak = 0;
    await pool(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBe(3);
  });

  it("handles an empty list", async () => {
    expect(await pool([], 4, async () => 1)).toEqual([]);
  });
});

describe("retry", () => {
  it("returns once an attempt succeeds", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(new Error("flaky")).mockResolvedValueOnce("ok");
    const p = retry("upload", 3, fn);
    await vi.runAllTimersAsync();
    expect(await p).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("rethrows the last error after all attempts", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new Error("down"));
    const p = retry("upload", 3, fn);
    const assertion = expect(p).rejects.toThrow("down");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
