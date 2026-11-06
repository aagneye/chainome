import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/health-insights
 *
 * Returns demo genomic insights for the /insights page, which is gated by a
 * World ID Agent Pass proof. Scores are sample values derived from the
 * genome CID, not a real analysis.
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
  source:            "demo";
}

// ── Demo insights ───────────────────────────────────────────────────────────
function generateDemoInsights(genomeCID: string): HealthInsights {
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
    source: "demo",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();

    if (!body.genomeCID) {
      return NextResponse.json({ error: "genomeCID required" }, { status: 400 });
    }

    const insights: HealthInsights = generateDemoInsights(body.genomeCID);
    return NextResponse.json(insights);
  } catch (err) {
    console.error("[health-insights]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
