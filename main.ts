// Leonida Trophy Guide — entrypoint (Node 22, standard library only).
// Hands the guide in: copies app/ and screenshots/ from this repository to
// /output and writes /output/dossier.json with the kit's vendored library.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory is a bind-mounted volume in the grader, so this program
// never removes the directory itself: it creates it, then clears only the
// files inside it, then copies the guide in fresh.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;

function clearContents(dir) {
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

// Pre-flight validation: the guide is refused by the gate if its trophy file
// does not name all 55 trophies with a guide each, or if a screenshot is out
// of limits, so check both here and fail loudly instead of handing in a
// broken entry.
function validateGuide() {
  const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
  const trophies = Array.isArray(data) ? data : data.trophies;
  if (!Array.isArray(trophies) || trophies.length !== 55) {
    throw new Error(`expected exactly 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'no array'}`);
  }
  for (const t of trophies) {
    if (typeof t.name !== 'string' || !t.name.trim()) throw new Error(`trophy id ${t.id} has no name`);
    if (typeof t.guide !== 'string' || !t.guide.trim()) throw new Error(`trophy ${t.name} has no guide`);
  }
  const shots = readdirSync(join(here, 'screenshots')).filter((f) => !f.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  const sizes = shots.map((f) => {
    const bytes = statSync(join(here, 'screenshots', f)).size;
    if (bytes > MAX_SCREENSHOT_BYTES) throw new Error(`screenshot ${f} is ${bytes} bytes, over the 256 KiB cap`);
    return { file: f, bytes };
  });
  return { trophyCount: trophies.length, screenshots: sizes };
}

mkdirSync(out, { recursive: true });
clearContents(out);
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const check = validateGuide();
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const appFiles = readdirSync(join(out, 'app'), { recursive: true }).length;
console.log(`Leonida Trophy Guide handed in: ${check.trophyCount} trophies with guides, ${appFiles} app entries, ${check.screenshots.length} screenshots (${check.screenshots.map((s) => `${s.file} ${s.bytes} B`).join(', ')}), dossier.json ${dossier.length} bytes in ${out}.`);
