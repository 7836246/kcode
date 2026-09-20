#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateContext } from "../../../../scripts/architecture/index.mjs";

const [, , moduleId, ...args] = process.argv;
if (!moduleId) {
  console.error(
    "用法: node .agents/skills/architecture-governance/scripts/context-package.mjs <module-id> [--output <file>]",
  );
  process.exit(1);
}

const outputIndex = args.indexOf("--output");
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
const content = await generateContext({ cwd: process.cwd(), moduleId });
if (output) {
  await fs.writeFile(path.resolve(process.cwd(), output), `${content}\n`);
} else {
  process.stdout.write(`${content}\n`);
}
