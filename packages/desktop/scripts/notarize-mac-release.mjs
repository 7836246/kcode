import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status ?? "null"}`);
  }
}

async function findAppBundle(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const app = entries.find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
  if (!app) {
    throw new Error(`no .app bundle in ${directory}`);
  }
  return path.join(directory, app.name);
}

async function restapleZip(zipPath) {
  const workdir = await mkdtemp(path.join(tmpdir(), "kcode-notarize-"));
  try {
    run("ditto", ["-x", "-k", zipPath, workdir]);
    const appPath = await findAppBundle(workdir);
    run("xcrun", ["stapler", "staple", appPath]);
    run("ditto", ["-c", "-k", "--keepParent", appPath, zipPath]);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

export async function notarizeMacArtifacts(distDir, credentials) {
  const names = (await readdir(distDir)).filter(
    (name) => name.endsWith(".dmg") || name.endsWith(".zip"),
  );
  if (names.length === 0) {
    throw new Error(`no macOS artifacts in ${distDir}`);
  }
  for (const name of names) {
    run("xcrun", [
      "notarytool",
      "submit",
      path.join(distDir, name),
      "--apple-id",
      credentials.appleId,
      "--password",
      credentials.password,
      "--team-id",
      credentials.teamId,
      "--wait",
    ]);
  }
  for (const name of names.filter((item) => item.endsWith(".dmg"))) {
    run("xcrun", ["stapler", "staple", path.join(distDir, name)]);
  }
  for (const name of names.filter((item) => item.endsWith(".zip"))) {
    await restapleZip(path.join(distDir, name));
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const distDir = process.argv[2];
  const appleId = process.env.APPLE_ID?.trim();
  const password = process.env.APPLE_APP_SPECIFIC_PASSWORD?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!distDir || !appleId || !password || !teamId) {
    process.stderr.write("notarize-mac-release requires a dist directory and Apple credentials\n");
    process.exit(1);
  }
  await notarizeMacArtifacts(distDir, { appleId, password, teamId });
}
