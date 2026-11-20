// Vice Key Art Studio — packaging entrypoint.
//
// What this program does, in plain terms: it stages a clean copy of the
// playable app plus its gallery shots into the judge's output folder and
// then asks the bundled make.fun library to describe that exact staging
// in a dossier file. The judge re-derives the dossier from the staged
// files, so the copy has to be faithful and the dossier has to be built
// from the output folder itself — never from the source tree.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The folder this file lives in is the repository root. Deriving it from
// the module URL (instead of the caller's working directory) keeps the
// program correct no matter where the judge invokes it from.
const repoRoot: string = dirname(fileURLToPath(import.meta.url));

// Where the finished package goes. The harness may point us at a scratch
// folder through the environment; the historical default is /output.
function pickOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  const chosen = fromEnv !== undefined && fromEnv.trim() !== '' ? fromEnv : '/output';
  return resolve(chosen);
}

// Caps handed to buildDossier. These mirror the bounty's gate values:
// the text budget shapes the dossier bytes, the remaining limits only
// cause a refusal when the entry is oversized, exactly as the scorer's
// own run would refuse it.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

// Replace one staged piece (a directory tree or the dossier file) inside
// the output folder. The output folder itself is never removed: it may
// be a mount point or a directory the harness owns, so only the three
// things we put inside it are ever cleared and rewritten.
function clearStaged(target: string): void {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

function stageTree(name: 'app' | 'screenshots', outDir: string): void {
  const source = join(repoRoot, name);
  const target = join(outDir, name);
  clearStaged(target);
  // A plain recursive copy is all we need: the dossier hashes contents
  // only, so timestamps and link targets carry no weight here.
  cpSync(source, target, { recursive: true });
}

function main(): void {
  const outDir = pickOutputDir();

  // The repository may be mounted read-only; everything we write lands
  // under outDir, and creating it when missing is the only courtesy the
  // harness expects from us.
  mkdirSync(outDir, { recursive: true });

  stageTree('app', outDir);
  stageTree('screenshots', outDir);

  // Build the dossier last, from the staged copy, so it describes the
  // bytes the judge will actually receive. Writing it also replaces any
  // stale dossier left over from a previous run.
  const dossierBytes = buildDossier(outDir, DOSSIER_CAPS);
  clearStaged(join(outDir, 'dossier.json'));
  writeFileSync(join(outDir, 'dossier.json'), dossierBytes);

  console.log(`packaged app/ + screenshots/ + dossier.json (${dossierBytes.length} bytes) into ${outDir}`);
}

main();
