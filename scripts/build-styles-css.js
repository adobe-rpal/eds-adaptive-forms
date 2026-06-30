#!/usr/bin/env node
/**
 * Concatenates blocks/form/form.source.css (source with @imports) into
 * blocks/form/form.css so the critical request chain is one request instead
 * of form.css + 12+ imported files. No loader change: the app keeps loading
 * form.css.
 *
 * Developers edit form.source.css and the utility CSS files; run once before
 * commit: npm run build:form-css
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FORM_DIR = path.join(ROOT, 'styles');
const SOURCE_CSS = path.join(FORM_DIR, 'cc-journey-styles.css');
// const OUT_CSS = path.join(FORM_DIR, 'styles.css');

const IMPORT_RE = /^\s*@import\s+url\s*\(\s*['"](\.\/[^'"]+)['"]\s*\)\s*;?\s*$/;
const IMPORT_RE_ANY = /@import\s+url\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*/g;

function resolveImport(formDir, importPath) {
  const normalized = importPath.replace(/^\.\//, '');
  return path.join(formDir, normalized);
}

/** Inline nested @import url(...) in content; baseDir is the directory of the file this content came from. */
function inlineNestedImports(content, baseDir) {
  return content.replace(IMPORT_RE_ANY, (match, importPath) => {
    const resolved = path.resolve(baseDir, importPath);
    if (!fs.existsSync(resolved)) return match;
    let subContent = fs.readFileSync(resolved, 'utf8');
    const subDir = path.dirname(resolved);
    subContent = inlineNestedImports(subContent, subDir);
    return `\n/* === inlined: ${importPath} === */\n${subContent.trim()}\n`;
  });
}

function buildFormBundle() {
  if (!fs.existsSync(SOURCE_CSS)) {
    throw new Error('build-form-css: form.source.css not found. Create it from form.css (the version with @imports).');
  }
  const formCssContent = fs.readFileSync(SOURCE_CSS, 'utf8');
  const lines = formCssContent.split(/\r?\n/);
  const imports = [];
  const rest = [];
  let restStarted = false;
  for (const line of lines) {
    const m = line.match(IMPORT_RE);
    if (m) {
      imports.push(m[1]);
    } else {
      restStarted = true;
      rest.push(line);
    }
  }
  const out = [];
  out.push('/* Bundled from form.source.css + @imports. Edit form.source.css and run: npm run build:form-css */');
  out.push('');
  for (const imp of imports) {
    const absPath = resolveImport(FORM_DIR, imp);
    if (!fs.existsSync(absPath)) {
      throw new Error(`build-form-css: missing file: ${imp} (resolved: ${absPath})`);
    }
    let content = fs.readFileSync(absPath, 'utf8');
    content = inlineNestedImports(content, path.dirname(absPath));
    out.push(`/* === ${imp} === */`);
    out.push(content.trim());
    out.push('');
  }
  out.push('/* === form.source.css (base) === */');
  out.push(rest.join('\n').trim());
  out.push('');
  fs.writeFileSync(OUT_CSS, out.join('\n'), 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT_CSS)} (${imports.length} imports inlined).`);
}

buildFormBundle();