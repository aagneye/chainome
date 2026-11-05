import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/health-insights
 *
 * Routes genome + records through 0G Private Computer for privacy-preserving
 * AI inference. Raw data never leaves the patient's encrypted node — only
 * the CIDs are passed; 0G compute fetches and processes them inside a
 * confidential execution environment.
 *
 * 0G Private Computer track: $5,000 prize at ETHGlobal Mumbai 2026.
 *
 * Production: replace stub with real 0G API call.
 * Docs: https://docs.0g.ai/build-with-0g/compute-network
 */

interface InsightRequest {
  genomeCID:   string;
  recordCIDs:  string[];
  nullifierHash?: string; // anonymous patient ID — no wallet address sent
}

interface RiskScore {
  condition:   string;
  risk:        "low" | "moderate" | "high";
  percentile:  number;
  confidence:  number;
  variants?:   string[];
}

interface PharmacogenomicsEntry {
  gene:       string;
  variant:    string;
  drug:       string;
  effect:     string;
  action:     string;
}

interface HealthInsights {
  riskScores:        RiskScore[];
  pharmacogenomics:  PharmacogenomicsEntry[];
  ancestryMarkers:   { population: string; proportion: number }[];
  computedAt:        number;
  source:            "0g-private-compute" | "stub";
}

// ── Stub — replace with real 0G Private Computer call ──────────────────────
function generateStubInsights(genomeCID: string): HealthInsights {
  // Deterministic variation from CID so it feels real per-patient
  const seed = genomeCID.charCodeAt(2) % 10;

  return {
    riskScores: [
      {
        condition:  "Type 2 Diabetes",
        risk:       seed < 3 ? "high" : seed < 7 ? "moderate" : "low",
        percentile: 45 + seed * 5,
        confidence: 0.78,
        variants:   ["TCF7L2 rs7903146", "PPARG rs1801282"],
      },
      {
        condition:  "Cardiovascular Disease",
        risk:       seed < 2 ? "high" : "low",
        percentile: 32 + seed * 3,
        confidence: 0.82,
        variants:   ["LDL-C rs11591147", "Factor V Leiden rs6025"],
      },
      {
        condition:  "BRCA-Associated Cancer",
        risk:       seed === 7 ? "high" : "low",
        percentile: seed === 7 ? 92 : 8,
        confidence: 0.95,
        variants:   ["BRCA1 185delAG", "BRCA2 6174delT"],
      },
    ],
    pharmacogenomics: [
      {
        gene:    "CYP2C19",
        variant: seed < 5 ? "*2/*2 (poor metabolizer)" : "*1/*1 (normal)",
        drug:    "Clopidogrel (Plavix)",
        effect:  seed < 5 ? "Reduced platelet inhibition — drug less effective" : "Normal response expected",
        action:  seed < 5 ? "Consider alternative antiplatelet therapy" : "Standard dosing appropriate",
      },
      {
        gene:    "CYP2D6",
        variant: "*1/*4 (intermediate metabolizer)",
        drug:    "Codeine / Tramadol",
        effect:  "Reduced conversion to morphine",
        action:  "Use alternative analgesics; avoid high opioid doses",
      },
      {
        gene:    "CYP2C9",
        variant: seed > 6 ? "*3/*3 (poor metabolizer)" : "*1/*2",
        drug:    "Warfarin",
        effect:  seed > 6 ? "Markedly reduced clearance — bleeding risk 3x elevated" : "Mildly reduced clearance",
        action:  seed > 6 ? "Use lower starting dose; increase INR monitoring" : "Slight dose reduction recommended",
      },
    ],
    ancestryMarkers: [
      { population: "South Asian",  proportion: 0.72 + seed * 0.01 },
      { population: "Central Asian", proportion: 0.18 },
      { population: "East Asian",   proportion: 0.10 - seed * 0.01 },
    ],
    computedAt: Date.now(),
    source: "stub",
  };
}

// ── Real 0G Private Computer call (uncomment when API key available) ────────
async function call0GPrivateCompute(req: InsightRequest): Promise<HealthInsights> {
  const apiKey = process.env.ZERO_G_API_KEY;
  if (!apiKey) throw new Error("ZERO_G_API_KEY not set");

  // 0G Private Computer: confidential execution environment
  // Raw data fetched by 0G node from IPFS inside the TEE — never exposed
  const response = await fetch("https://api.0g.ai/v1/private-compute/infer", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:    "genomic-risk-v1",
      inputs: {
        genome_cid:   req.genomeCID,
        record_cids:  req.recordCIDs,
        patient_id:   req.nullifierHash, // anonymous — no PII
      },
      privacy: {
        mode: "confidential",
        output_only: true, // only computed insights returned, never raw data
      },
    }),
  });

  if (!response.ok) throw new Error(`0G API error: ${response.status}`);
  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();

    if (!body.genomeCID) {
      return NextResponse.json({ error: "genomeCID required" }, { status: 400 });
    }

    let insights: HealthInsights;

    if (process.env.ZERO_G_API_KEY) {
      insights = await call0GPrivateCompute(body);
    } else {
      // Stub mode — deterministic from genomeCID
      insights = generateStubInsights(body.genomeCID);
    }

    return NextResponse.json(insights);
  } catch (err) {
    console.error("[health-insights]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
