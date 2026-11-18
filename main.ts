/**
 * Nightfall City: Vela Bay — Build Pipeline & Release Dossier Packager
 * Custom build orchestrator for make.fun GTA 6 bounty entrypoint.
 *
 * Responsibilities:
 * 1. Target Directory Resolution via MAKEFUN_OUTPUT_DIR (or fallback to /output).
 * 2. Mirroring offline web runtime tree (game/) and verified screenshots (screenshots/).
 * 3. Compiling the canonical make.fun game dossier (dossier.json) using buildDossier.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve project root paths
const rootPath = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(rootPath, 'game');
const screenshotsDir = join(rootPath, 'screenshots');

// Target output directory passed by test harness or environment
const outputDirectory = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

export const RELEASE_SPEC = {
  id: 'nightfall-city',
  title: 'Nightfall City: Vela Bay (Gold Edition)',
  version: '1.3.0',
  maxScreenshotBytes: 262144, // 256 KiB cap per screenshot image
} as const;

// Authoritative competition boundary constraints
const COMPETITION_CAPS = {
  text_max_bytes: 163840,           // 160 KiB limit for code listing text in dossier
  screenshots: {
    max: 4,                         // 4 screenshots
    max_bytes: RELEASE_SPEC.maxScreenshotBytes,
  },
  game_max_files: 993,              // Bound within overall 1000-entry container cap
  game_max_bytes: 48 * 1024 * 1024, // 48 MiB game payload cap
  game_path_max_bytes: 1000,        // Max relative path length in UTF-8 bytes
} as const;

function packageRelease(): void {
  const clockStart = Date.now();
  console.log(`[Nightfall City] Packaging distribution to destination: ${outputDirectory}`);

  // Create destination container
  mkdirSync(outputDirectory, { recursive: true });

  // 1. Copy web game static tree
  const targetGameDir = join(outputDirectory, 'game');
  mkdirSync(targetGameDir, { recursive: true });
  cpSync(gameDir, targetGameDir, { recursive: true });
  console.log(`[Nightfall City] Packaged game runtime -> ${targetGameDir}`);

  // 2. Copy screenshots
  const targetScreenDir = join(outputDirectory, 'screenshots');
  mkdirSync(targetScreenDir, { recursive: true });
  if (existsSync(screenshotsDir)) {
    cpSync(screenshotsDir, targetScreenDir, { recursive: true });
    console.log(`[Nightfall City] Packaged screenshots -> ${targetScreenDir}`);
  }

  // 3. Compile canonical dossier
  console.log('[Nightfall City] Generating canonical dossier.json...');
  const dossierData = buildDossier(outputDirectory, COMPETITION_CAPS);
  const dossierFile = join(outputDirectory, 'dossier.json');
  writeFileSync(dossierFile, dossierData);

  const elapsed = Date.now() - clockStart;
  console.log(`[Nightfall City] Release bundle built successfully in ${elapsed}ms: ${dossierFile}`);
}

packageRelease();
