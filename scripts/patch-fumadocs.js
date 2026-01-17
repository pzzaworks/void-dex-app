#!/usr/bin/env node

/**
 * Patches fumadocs-ui sidebar.js files to be webpack-compatible
 *
 * fumadocs-ui uses a destructuring export pattern that webpack's static analysis
 * can't handle: `export const { SidebarProvider: Sidebar, ... } = Base;`
 *
 * This script converts it to direct exports that webpack can analyze.
 */

const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'node_modules/fumadocs-ui/dist/layouts/notebook/sidebar.js',
  'node_modules/fumadocs-ui/dist/layouts/docs/sidebar.js',
];

const oldPattern = 'export const { SidebarProvider: Sidebar, SidebarFolder, SidebarCollapseTrigger, SidebarViewport, SidebarTrigger, } = Base;';
const newPattern = `export const Sidebar = Base.SidebarProvider;
export const SidebarFolder = Base.SidebarFolder;
export const SidebarCollapseTrigger = Base.SidebarCollapseTrigger;
export const SidebarViewport = Base.SidebarViewport;
export const SidebarTrigger = Base.SidebarTrigger;`;

let patchedCount = 0;

for (const relPath of filesToPatch) {
  const filePath = path.join(process.cwd(), relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${relPath} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content);
    console.log(`Patched: ${relPath}`);
    patchedCount++;
  } else if (content.includes('export const Sidebar = Base.SidebarProvider;')) {
    console.log(`Already patched: ${relPath}`);
  } else {
    console.log(`Pattern not found in ${relPath} - may need manual inspection`);
  }
}

if (patchedCount > 0) {
  console.log(`\nSuccessfully patched ${patchedCount} file(s) for webpack compatibility.`);
}
