// Assembles ./dist for Cloudflare Pages.
//
// Deliberately an allowlist rather than a copy-everything-minus-ignores: this
// repo root also holds server.js, submissions.json and node_modules, none of
// which should ever be published as static assets.

import { cp, rm, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

const FILES = ["index.html", "work.html", "services.html", "about.html", "contact.html", "styles.css", "script.js", "favicon.svg"];
const DIRS = ["work-media"];

async function directorySize(dir) {
  let bytes = 0;
  let count = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await directorySize(full);
      bytes += nested.bytes;
      count += nested.count;
    } else {
      bytes += (await stat(full)).size;
      count += 1;
    }
  }
  return { bytes, count };
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const missing = [];

for (const file of FILES) {
  if (!existsSync(path.join(root, file))) {
    missing.push(file);
    continue;
  }
  await cp(path.join(root, file), path.join(dist, file));
}

for (const dir of DIRS) {
  if (!existsSync(path.join(root, dir))) {
    missing.push(dir + "/");
    continue;
  }
  await cp(path.join(root, dir), path.join(dist, dir), { recursive: true });
}

if (missing.length > 0) {
  console.error("Build failed — expected files are missing:", missing.join(", "));
  process.exit(1);
}

const { bytes, count } = await directorySize(dist);
console.log(`Built dist/ — ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
