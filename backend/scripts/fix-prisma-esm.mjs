#!/usr/bin/env node
/**
 * Adds .js extension to relative imports in Prisma generated ESM output
 * so Node.js ESM resolver can find the modules at runtime.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist', 'prisma', 'generated');

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) fixFile(full);
  }
}

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;
  // Add .js to relative specifiers: "./path" or "./path/sub" (not already .js)
  content = content.replace(
    /(from|export\s+\*\s+from)\s+(['"])(\.\/[^'"]+?)\2/g,
    (_, keyword, quote, spec) =>
      spec.endsWith('.js') ? `${keyword} ${quote}${spec}${quote}` : `${keyword} ${quote}${spec}.js${quote}`
  );
  if (content !== original) {
    writeFileSync(filePath, content);
    console.log('Fixed:', filePath.replace(DIST, ''));
  }
}

if (!DIST.includes('dist')) process.exit(1);
walk(DIST);
