/**
 * Nightfall City — Production Entrypoint & Dossier Generator
 * 
 * Prepares the distributable package for Nightfall City (Vela Bay):
 * 1. Resolves repository root and destination output directory.
 * 2. Mirrors the static game assets and offline ES modules (`game/`).
 * 3. Copies verified gameplay screenshots into the output bundle (`screenshots/`).
 * 4. Compiles the authoritative make.fun dossier (`dossier.json`) enforcing competition bounds.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve directory paths relative to this script
const currentDir = fileURLToPath(new URL('.', import.meta.url));
const gameSourceDir = join(currentDir, 'game');
const screenSourceDir = join(currentDir, 'screenshots');

// Target directory provided by the test environment or grader container
const targetOutputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

export const BUNDLE_VERSION = '1.2.0';
export const GAME_DIST_TITLE = 'Nightfall City: Vela Bay (Shipped Gold Edition)';

// Strict competition constraints
const DOSSIER_LIMITS = {
  text_max_bytes: 163840, // 160 KiB limit for code listing text in dossier
  screenshots: {
    max: 4,               // Exactly 4 curated screenshots
    max_bytes: 262144,    // 256 KiB cap per screenshot image
  },
  game_max_files: 993,    // Fit within overall 1000-entry directory cap
  game_max_bytes: 48 * 1024 * 1024, // 48 MiB total game size cap
  game_path_max_bytes: 1000,        // Max UTF-8 byte length for any single relative path
} as const;

function bundleNightfallCity(): void {
  const startTime = Date.now();
  console.log(`[Nightfall City] Packaging distribution to: ${targetOutputDir}`);

  // Ensure root output container exists
  mkdirSync(targetOutputDir, { recursive: true });

  // 1. Copy the standalone web game tree
  const gameDest = join(targetOutputDir, 'game');
  mkdirSync(gameDest, { recursive: true });
  cpSync(gameSourceDir, gameDest, { recursive: true });
  console.log(`[Nightfall City] Copied web runtime to ${gameDest}`);

  // 2. Copy screenshots if present
  const screenDest = join(targetOutputDir, 'screenshots');
  mkdirSync(screenDest, { recursive: true });
  if (existsSync(screenSourceDir)) {
    cpSync(screenSourceDir, screenDest, { recursive: true });
    console.log(`[Nightfall City] Copied gameplay screenshots to ${screenDest}`);
  }

  // 3. Generate canonical dossier summary using make.fun engine
  console.log('[Nightfall City] Compiling dossier against competition caps...');
  const dossierPayload = buildDossier(targetOutputDir, DOSSIER_LIMITS);
  const dossierPath = join(targetOutputDir, 'dossier.json');
  writeFileSync(dossierPath, dossierPayload);

  const durationMs = Date.now() - startTime;
  console.log(`[Nightfall City: Vela Bay] Distribution bundle verified in ${durationMs}ms: ${dossierPath}`);
}

bundleNightfallCity();
