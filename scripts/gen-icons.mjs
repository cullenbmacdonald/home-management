// Regenerate PWA icons: emerald (#059669) rounded square + white house glyph.
// Run: node scripts/gen-icons.mjs  (uses sharp from node_modules or npx sharp-cli)
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#059669"/>
  <g fill="none" stroke="#ffffff" stroke-width="34" stroke-linjoin="round" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 236 256 128 392 236"/>
    <path d="M154 214 154 384 358 384 358 214"/>
    <path d="M226 384 226 300 286 300 286 384"/>
  </g>
</svg>`;

writeFileSync("/tmp/icon.svg", svg(512));
for (const s of [192, 512]) {
  execSync(`npx --yes sharp-cli -i /tmp/icon.svg -o public/icon-${s}.png resize ${s} ${s}`, { stdio: "inherit" });
}
console.log("icons regenerated");
