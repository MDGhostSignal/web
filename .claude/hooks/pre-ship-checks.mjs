#!/usr/bin/env node
// Pre-ship checks hook (PreToolUse on Bash).
//
// Whenever Claude is about to run a Bash command containing `git commit`,
// runs the four mandatory AGENTS.md gates (typecheck, lint, lint:css,
// assets:audit) in apps/web. Blocks the commit (exit 2 + stderr → Claude)
// if any gate fails. Exits cleanly if the command isn't a commit, or if
// no apps/web files are staged.

import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PASS = 0;
const BLOCK = 2;

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const raw = readStdin();
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(PASS);
}

const cmd = payload?.tool_input?.command;
if (typeof cmd !== "string" || !/\bgit\s+commit\b/.test(cmd)) {
  process.exit(PASS);
}

const repoRoot = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const webDir = resolve(repoRoot, "apps/web");

let staged = "";
try {
  staged = execSync("git diff --cached --name-only", {
    cwd: repoRoot,
    encoding: "utf8",
  });
} catch {
  process.exit(PASS);
}

const webChanges = staged.split("\n").filter((f) => f.startsWith("apps/web/"));
if (webChanges.length === 0) {
  process.exit(PASS);
}

const gates = [
  ["typecheck", ["run", "typecheck"]],
  ["lint", ["run", "lint"]],
  ["lint:css", ["run", "lint:css"]],
  ["assets:audit", ["run", "assets:audit"]],
];

const failures = [];
for (const [name, args] of gates) {
  const res = spawnSync("npm", args, {
    cwd: webDir,
    encoding: "utf8",
    shell: true,
  });
  if (res.status !== 0) {
    const out = ((res.stdout ?? "") + (res.stderr ?? "")).trim();
    failures.push({ name, output: out.slice(-2000) });
  }
}

if (failures.length === 0) {
  process.exit(PASS);
}

console.error(
  `Pre-ship checks failed (${failures.length}/${gates.length} gate(s)). ` +
    `Fix before committing — these checks are mandatory per apps/web/AGENTS.md.\n`,
);
for (const f of failures) {
  console.error(`\n=== ${f.name} ===\n${f.output}\n`);
}
process.exit(BLOCK);
