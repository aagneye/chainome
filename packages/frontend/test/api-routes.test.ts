import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── mocks for the storage SDKs used by /api/records and /api/genome ─────────────
const beeUpload = vi.fn();
vi.mock("@ethersphere/bee-js", () => ({
  Bee: class {
    data = { upload: beeUpload };
  },
}));

const createEntity = vi.fn();
vi.mock("@arkiv-network/sdk", async (orig) => ({
  ...(await orig<typeof import("@arkiv-network/sdk")>()),
  createWalletClient: () => ({ createEntity }),
}));

const getGenomeForPatient = vi.fn();
vi.mock("@/lib/arkiv-server", () => ({ getGenomeForPatient }));

const PATIENT = "0x000000000000000000000000000000000000dEaD";
const ENV_KEYS = ["BEE_URL", "SWARM_BATCH_ID", "ARKIV_PRIVATE_KEY", "SWARM_GATEWAY"];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  beeUpload.mockReset();
  createEntity.mockReset();
  getGenomeForPatient.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// ── /api/swarm/[ref] ───────────────────────────────────────────────────────────
describe("GET /api/swarm/[ref]", () => {
  async function get(ref: string) {
    const { GET } = await import("@/app/api/swarm/[ref]/route");
    return GET(new NextRequest(`http://x/api/swarm/${ref}`), { params: { ref } });
  }

  it.each(["xyz", "ab".repeat(31), "ab".repeat(64), "../../etc/passwd"])("rejects invalid reference %j", async (ref) => {
    vi.stubGlobal("fetch", vi.fn());
    expect((await get(ref)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("streams bytes from the gateway's /bytes endpoint as immutable octet-stream", async () => {
    process.env.SWARM_GATEWAY = "https://gw.example/";
    vi.resetModules(); // the gateway URL is read once at module load
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]))));
    const res = await get("0x" + "ab".repeat(32));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`https://gw.example/bytes/${"ab".repeat(32)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("maps upstream errors to 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect((await get("ab".repeat(32))).status).toBe(502);
  });
});

// ── /api/genome ────────────────────────────────────────────────────────────────
describe("GET /api/genome", () => {
  async function get(qs: string) {
    const { GET } = await import("@/app/api/genome/route");
    return GET(new NextRequest(`http://x/api/genome${qs}`));
  }

  it("requires a wallet address", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("?patient=not-an-address")).status).toBe(400);
    expect(getGenomeForPatient).not.toHaveBeenCalled();
  });

  it("returns the genome read from Arkiv", async () => {
    getGenomeForPatient.mockResolvedValue({ dataset: { key: "0x1" }, segments: [], features: null });
    const res = await get(`?patient=${PATIENT}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ genome: { dataset: { key: "0x1" }, segments: [], features: null } });
    expect(getGenomeForPatient).toHaveBeenCalledWith(PATIENT);
  });

  it("returns genome: null when the wallet has none", async () => {
    getGenomeForPatient.mockResolvedValue(null);
    expect(await (await get(`?patient=${PATIENT}`)).json()).toEqual({ genome: null });
  });

  it("maps Arkiv failures to 502 with the message", async () => {
    getGenomeForPatient.mockRejectedValue(new Error("rate limited"));
    const res = await get(`?patient=${PATIENT}`);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("rate limited");
  });
});

// ── /api/records ───────────────────────────────────────────────────────────────
describe("POST /api/records", () => {
  const cipher = () => {
    const b = new Uint8Array(64);
    b.set(new TextEncoder().encode("GCv1"));
    return b;
  };
  const meta = (over: Record<string, unknown> = {}) => ({
    patient: PATIENT, anonId: "0123456789abcdef0123", recordType: "lab_report", mimeType: "application/pdf",
    plainBytes: 32, sha256Plain: "p".repeat(64), sha256Cipher: "c".repeat(64), wrappedKey: { epk: "a", iv: "b", ct: "c" }, ...over,
  });

  async function post(form: FormData) {
    const { POST } = await import("@/app/api/records/route");
    return POST(new NextRequest("http://x/api/records", { method: "POST", body: form }));
  }
  function form(bytes: Uint8Array | null, m: object | null) {
    const f = new FormData();
    if (bytes) f.append("cipher", new Blob([bytes as BlobPart]));
    if (m) f.append("meta", JSON.stringify(m));
    return f;
  }
  function configure() {
    process.env.BEE_URL = "http://bee:1633";
    process.env.SWARM_BATCH_ID = "b".repeat(64);
    process.env.ARKIV_PRIVATE_KEY = "0x" + "11".repeat(32);
  }

  it("is 503 until Swarm and Arkiv are configured", async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    expect((await post(form(cipher(), meta()))).status).toBe(503);
  });

  it("requires both multipart fields", async () => {
    configure();
    expect((await post(form(null, meta()))).status).toBe(400);
    expect((await post(form(cipher(), null))).status).toBe(400);
  });

  it("refuses plaintext — only GCv1 ciphertext is stored", async () => {
    configure();
    const res = await post(form(new TextEncoder().encode("%PDF-1.7 patient report"), meta()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/plaintext/);
    expect(beeUpload).not.toHaveBeenCalled();
  });

  it("validates patient address and record type", async () => {
    configure();
    expect((await post(form(cipher(), meta({ patient: "bob" })))).status).toBe(400);
    expect((await post(form(cipher(), meta({ recordType: "selfie" })))).status).toBe(400);
  });

  it("rejects records over 25 MB", async () => {
    configure();
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    big.set(new TextEncoder().encode("GCv1"));
    expect((await post(form(big, meta()))).status).toBe(413);
  });

  it("stores ciphertext + manifest on Swarm and indexes the record on Arkiv", async () => {
    configure();
    beeUpload
      .mockResolvedValueOnce({ reference: { toHex: () => "f1".repeat(32) } })
      .mockResolvedValueOnce({ reference: { toHex: () => "f2".repeat(32) } });
    createEntity.mockResolvedValue({ entityKey: "0xentity", txHash: "0xtx" });

    const res = await post(form(cipher(), meta()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ manifestRef: "f2".repeat(32), fileRef: "f1".repeat(32), entityKey: "0xentity", arkivTx: "0xtx" });

    // 1st upload: the exact ciphertext, without Swarm encryption
    expect(beeUpload.mock.calls[0][0]).toBe("b".repeat(64));
    expect(new TextDecoder().decode(beeUpload.mock.calls[0][1].subarray(0, 4))).toBe("GCv1");
    expect(beeUpload.mock.calls[0][2]).toEqual({ pin: true });

    // 2nd upload: the record manifest — points at the file, holds the wrapped key, no filename
    const manifest = JSON.parse(beeUpload.mock.calls[1][1]);
    expect(manifest).toMatchObject({ version: 1, fileRef: "f1".repeat(32), cipherBytes: 64, wrappedKey: { epk: "a", iv: "b", ct: "c" } });
    expect(Object.keys(manifest)).not.toContain("name");

    // Arkiv: anonId truncated to 16 chars, manifest ref indexed, expiry set
    const [, values, opts] = createEntity.mock.calls[0];
    expect(values).toMatchObject({ anonId: "0123456789abcdef", recordType: "lab_report", manifestRef: "f2".repeat(32) });
    expect(opts.expiration).toBeDefined();
  });

  it("reports storage failures as 502", async () => {
    configure();
    beeUpload.mockRejectedValue(new Error("batch expired"));
    const res = await post(form(cipher(), meta()));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("batch expired");
  });
});
