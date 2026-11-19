// Leonida Trophy Guide — entrypoint (Node 22, standard library only).
// Hands the guide in: copies app/ and screenshots/ from this repository to
// /output and writes /output/dossier.json with the kit's vendored library.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The grader mounts /output as a volume, so never remove the directory itself:
// create it if missing, then clear only its contents before writing.
mkdirSync(outputDir, { recursive: true });
for (const name of readdirSync(outputDir)) rmSync(join(outputDir, name), { recursive: true, force: true });
// Pre-flight: refuse to hand in a broken entry instead of building a bad dossier.
// Screenshots must be 3–4 real renders, each within the gate's 256 KiB cap, and
// the trophy file must parse with all 55 trophies named.
const shotDir = join(repoRoot, 'screenshots');
const shotNames = existsSync(shotDir) ? readdirSync(shotDir).filter((n) => !n.startsWith('.')) : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3–4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) {
  if (statSync(join(shotDir, name)).size > 262144) throw new Error(`screenshot ${name} is over the 256 KiB cap`);
}
const trophyData = JSON.parse(readFileSync(join(repoRoot, 'app', 'data', 'trophies.json'), 'utf8'));
if (!Array.isArray(trophyData.trophies) || trophyData.trophies.length !== 55) {
  throw new Error(`expected 55 trophies in app/data/trophies.json, found ${trophyData.trophies?.length ?? 0}`);
}
if (trophyData.trophies.some((t) => !t.name || !String(t.guide || '').trim())) {
  throw new Error('every trophy needs a name and a non-blank guide');
}

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierText = buildDossier(outputDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 });
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
console.log(`leonida-trophy-guide: 55 trophies, ${shotNames.length} screenshots, wrote ${join(outputDir, 'dossier.json')} (${dossierText.length} bytes)`);
