import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const specs = readdirSync(dir)
  .filter((f) => f.endsWith(".spec.mjs"))
  .sort();

let failed = false;
for (const spec of specs) {
  console.log(`\n=== ${spec} ===`);
  const res = spawnSync(process.execPath, [path.join(dir, spec)], {
    stdio: "inherit",
  });
  if (res.status !== 0) failed = true;
}

console.log(failed ? "\nE2E FAILED" : "\nE2E PASSED");
process.exit(failed ? 1 : 0);
