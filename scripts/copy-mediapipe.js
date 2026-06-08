#!/usr/bin/env node
// scripts/copy-mediapipe.js
// ── Copies MediaPipe face_mesh files from node_modules → public/mediapipe/ ──
//
// Runs automatically via postinstall. Also called by `npm run build`.
// Safe to run multiple times — skips files already up to date.

const fs   = require('fs')
const path = require('path')

const SRC  = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'face_mesh')
const DEST = path.join(__dirname, '..', 'public', 'mediapipe')

const FILES = [
  'face_mesh.js',
  'face_mesh_solution_packed_assets.data',
  'face_mesh_solution_packed_assets_loader.js',
  'face_mesh_solution_simd_wasm_bin.js',
  'face_mesh_solution_simd_wasm_bin.wasm',
  'face_mesh_solution_wasm_bin.js',
  'face_mesh_solution_wasm_bin.wasm',
]

if (!fs.existsSync(SRC)) {
  // Not installed yet — this is fine during a fresh `npm install` before
  // node_modules is populated. The CDN fallback handles this case.
  console.log('ℹ  @mediapipe/face_mesh not in node_modules yet — skipping copy.')
  console.log('   Run `node scripts/copy-mediapipe.js` after install completes.')
  process.exit(0)
}

fs.mkdirSync(DEST, { recursive: true })

let copied  = 0
let skipped = 0

for (const file of FILES) {
  const src  = path.join(SRC, file)
  const dest = path.join(DEST, file)

  if (!fs.existsSync(src)) {
    console.warn(`⚠️   Missing in node_modules: ${file} (skipping)`)
    continue
  }

  // Skip if destination is already identical (same size = same content for binaries)
  if (fs.existsSync(dest)) {
    const srcSize  = fs.statSync(src).size
    const destSize = fs.statSync(dest).size
    if (srcSize === destSize) {
      skipped++
      continue
    }
  }

  fs.copyFileSync(src, dest)
  const kb = Math.round(fs.statSync(dest).size / 1024)
  console.log(`✅  ${file.padEnd(52)} ${kb} KB`)
  copied++
}

if (copied > 0) {
  console.log(`\n✔  Copied ${copied} file(s) to public/mediapipe/`)
} else {
  console.log(`✔  public/mediapipe/ already up to date (${skipped} files unchanged)`)
}