import { formatJson } from "@kcode/core";
import type { GlobalOptions, RunContext } from "@kcode/shared-types";
import { loadBootstrapModule } from "./bootstrap-loader.js";
import { loadCliDotenv } from "./env.js";
import type { RunDependencies } from "./cli-types.js";

const OFFICIAL_LOGIN_UNSUPPORTED =
  "Official Z.ai / BigModel login is no longer supported. Configure a generic API-key provider instead.";

export async function runLoginCommand(
  ctx: RunContext,
  options: GlobalOptions,
  deps: RunDependencies,
  _noBrowser: boolean,
  _args: readonly string[] = [],
): Promise<number> {
  try {
    loadDotenvOrThrow(deps);
    ctx.stderr.write(`Error: ${OFFICIAL_LOGIN_UNSUPPORTED}\n`);
    return 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Error: ${message}\n`);
    if (options.verbose && error instanceof Error && error.stack) {
      ctx.stderr.write(`${error.stack}\n`);
    }
    return 1;
  }
}

export async function runLogoutCommand(
  ctx: RunContext,
  options: GlobalOptions,
  deps: RunDependencies,
): Promise<number> {
  try {
    const env = deps.env ?? process.env;
    loadDotenvOrThrow(deps);
    const logout = deps.logoutKCodeCli ?? (await loadBootstrapModule()).logoutKCodeCli;
    const result = await logout({ env });

    if (options.json) {
      ctx.stdout.write(
        formatJson({
          status: "logged_out",
          credentialsPath: result.credentialsPath,
        }),
      );
      return 0;
    }

    ctx.stdout.write(`Cleared leftover official account credentials: ${result.credentialsPath}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Error: ${message}\n`);
    if (options.verbose && error instanceof Error && error.stack) {
      ctx.stderr.write(`${error.stack}\n`);
    }
    return 1;
  }
}

function loadDotenvOrThrow(deps: RunDependencies): void {
  const env = deps.env ?? process.env;
  const workingDirectory = (deps.cwd ?? process.cwd)();
  const dotenvResult = (deps.loadDotenv ?? loadCliDotenv)({
    cwd: workingDirectory,
    env,
  });
  if (dotenvResult.error) {
    throw new Error(`Failed to load environment file: ${dotenvResult.path}`, {
      cause: dotenvResult.error,
    });
  }
}
