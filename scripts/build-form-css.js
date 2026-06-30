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
const FORM_DIR = path.join(ROOT, 'blocks', 'form');
const SOURCE_CSS = path.join(FORM_DIR, 'form.source.css');
const OUT_CSS = path.join(FORM_DIR, 'form.css');

const IMPORT_RE = /^\s*@import\s+url\s*\(\s*['"](\.\/[^'"]+)['"]\s*\)\s*;?\s*$/;
const IMPORT_RE_ANY = /@import\s+url\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*/g;
const URL_RE = /url\s*\(\s*['"]?([^)'"]+)['"]?\s*\)/g;

function resolveImport(formDir, importPath) {
  const normalized = importPath.replace(/^\.\//, '');
  return path.join(formDir, normalized);
}

const ICONS_DIR = path.join(ROOT, 'icons');

/**
 * Rewrite url() paths in content so they are relative to outputDir (form.css location).
 * Icon URLs are always forced to eds-li/icons so they resolve correctly from the bundle.
 */
function rewriteUrlsForBundle(content, baseDir, outputDir) {
  return content.replace(URL_RE, (match, urlPath) => {
    const trimmed = urlPath.trim();
    if (trimmed.startsWith('data:')) return match;
    let resolved = path.resolve(baseDir, trimmed);
    if (trimmed.includes('icons')) {
      const basename = path.basename(resolved);
      resolved = path.join(ICONS_DIR, basename);
    }
    const relative = path.relative(outputDir, resolved);
    const normalized = relative.replace(/\\/g, '/');
    return `url('${normalized}')`;
  });
}

/** Inline nested @import url(...) in content; baseDir is the directory of the file this content came from. */
function inlineNestedImports(content, baseDir, outputDir) {
  return content.replace(IMPORT_RE_ANY, (match, importPath) => {
    const resolved = path.resolve(baseDir, importPath);
    if (!fs.existsSync(resolved)) return match;
    let subContent = fs.readFileSync(resolved, 'utf8');
    const subDir = path.dirname(resolved);
    subContent = inlineNestedImports(subContent, subDir, outputDir);
    subContent = rewriteUrlsForBundle(subContent, subDir, outputDir);
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
    content = inlineNestedImports(content, path.dirname(absPath), FORM_DIR);
    content = rewriteUrlsForBundle(content, path.dirname(absPath), FORM_DIR);
    out.push(`/* === ${imp} === */`);
    out.push(content.trim());
    out.push('');
  }
  out.push('/* === form.source.css (base) === */');
  let baseContent = rest.join('\n').trim();
  baseContent = rewriteUrlsForBundle(baseContent, FORM_DIR, FORM_DIR);
  out.push(baseContent);
  out.push('');
  fs.writeFileSync(OUT_CSS, out.join('\n'), 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT_CSS)} (${imports.length} imports inlined).`);
}

buildFormBundle();