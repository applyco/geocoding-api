/**
 * ETL Pipeline Orchestrator
 * Runs all steps in sequence: download → convert → build_zones → apply_overrides → validate → index
 */

import { spawn } from "child_process";
import * as path from "path";

const STEPS = [
  { num: "01", name: "Download data files", script: "01_download.ts" },
  { num: "02", name: "Convert formats", script: "02_convert.ts" },
  { num: "03", name: "Build Zone polygons", script: "03_build_zones.ts" },
  { num: "04", name: "Apply name overrides", script: "04_apply_overrides.ts" },
  { num: "05", name: "Validate geometries", script: "05_validate.ts" },
  { num: "06", name: "Index to Elasticsearch", script: "06_index.ts" },
];

async function runStep(stepNum: string, stepName: string, script: string): Promise<boolean> {
  return new Promise((resolve) => {
    const scriptPath = path.join(import.meta.dirname || process.cwd(), "steps", script);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step ${stepNum}: ${stepName}`);
    console.log(`${"=".repeat(60)}\n`);

    // Use npx tsx which works cross-platform
    const child = spawn("npx", ["tsx", scriptPath], {
      stdio: "inherit",
      env: process.env,
      shell: true, // Needed for Windows compatibility
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });

    child.on("error", (err) => {
      console.error(`Error running step ${stepNum}:`, err);
      resolve(false);
    });
  });
}

async function main() {
  console.log("🚀 Geocoding API - ETL Pipeline\n");

  let stepCount = 0;
  let successCount = 0;

  for (const step of STEPS) {
    stepCount++;
    const success = await runStep(step.num, step.name, step.script);

    if (success) {
      successCount++;
    } else {
      console.error(`\n❌ Pipeline stopped at step ${step.num}`);
      process.exit(1);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Pipeline complete! (${successCount}/${stepCount} steps)`);
  console.log(`${"=".repeat(60)}\n`);
}

main().catch(console.error);
