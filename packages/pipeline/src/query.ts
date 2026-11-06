/**
 * The runnable Arkiv query for judges and teammates — read-only, needs no private key.
 *
 *   pnpm --filter pipeline run query -- --dataset 0x<datasetKey>
 *   pnpm --filter pipeline run query -- --patient 0x<wallet>
 */
import { parseArgs } from "node:util";
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { asc, eq } from "@arkiv-network/sdk/query";
import { addr, key } from "@arkiv-network/sdk/schema";
import { http, type Hex } from "viem";
import { GenomeDataset, GenomeSegment } from "@genomechain/shared/arkiv";

const { values } = parseArgs({ options: { dataset: { type: "string" }, patient: { type: "string" } } });
const client = createPublicClient({ chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }), transport: http() });

if (values.patient) {
  const page = await client
    .select({ $key: true, build: true, variantCount: true, segmentCount: true, qcPass: true, manifestRef: true })
    .from(GenomeDataset)
    .where(eq("patient", addr(values.patient as Hex)))
    .limit(10)
    .fetch();
  console.table(page.entities.map((e) => ({
    dataset: e.$key, build: e.build.value, variants: e.variantCount.value, segments: e.segmentCount.value,
    qcPass: e.qcPass.value, manifestRef: e.manifestRef.value,
  })));
} else if (values.dataset) {
  const page = await client
    .select({ $key: true, chrom: true, variantCount: true, swarmRef: true })
    .from(GenomeSegment)
    .where(eq("dataset", key(values.dataset as Hex)))
    .orderBy(asc("chromOrder"))
    .limit(100)
    .fetch();
  console.table(page.entities.map((e) => ({ chrom: e.chrom.value, variants: e.variantCount.value, swarmRef: e.swarmRef.value })));
} else {
  console.error("pass --dataset 0x… or --patient 0x…");
  process.exit(1);
}
