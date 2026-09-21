import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAC_SIGNING_ENV = [
  "APPLE_SIGNING_IDENTITY",
  "CSC_LINK",
  "CSC_KEY_PASSWORD",
  "APPLE_ID",
  "APPLE_APP_SPECIFIC_PASSWORD",
  "APPLE_TEAM_ID",
];

export const WIN_SIGNING_ENV = ["WIN_CSC_LINK", "WIN_CSC_KEY_PASSWORD"];

function missingEnv(env, keys) {
  return keys.filter((key) => !String(env[key] ?? "").trim());
}

/**
 * 签名材料必须成套。缺一仍走未签名发布，避免只签不公证的 macOS 包更难打开。
 * 一组都没有时保持安静；只配了一部分时返回 warning，让维护者看到缺了哪几个名字。
 */
export function planReleaseSigning(env, targetOs) {
  const macMissing = missingEnv(env, MAC_SIGNING_ENV);
  const winMissing = missingEnv(env, WIN_SIGNING_ENV);
  const macPartial = macMissing.length > 0 && macMissing.length < MAC_SIGNING_ENV.length;
  const winPartial = winMissing.length > 0 && winMissing.length < WIN_SIGNING_ENV.length;
  let warning = "";
  if (targetOs === "mac" && macPartial) {
    warning = `macOS signing skipped; missing ${macMissing.join(", ")}`;
  } else if (targetOs === "win" && winPartial) {
    warning = `Windows signing skipped; missing ${winMissing.join(", ")}`;
  }
  return {
    macSign: targetOs === "mac" && macMissing.length === 0,
    winSign: targetOs === "win" && winMissing.length === 0,
    warning,
  };
}

async function writeGitHubOutput(lines) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, lines);
    return;
  }
  process.stdout.write(lines);
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const plan = planReleaseSigning(process.env, process.env.TARGET_OS ?? "");
  if (plan.warning) {
    process.stderr.write(`${plan.warning}\n`);
  }
  await writeGitHubOutput(`mac_sign=${plan.macSign}\nwin_sign=${plan.winSign}\n`);
}
