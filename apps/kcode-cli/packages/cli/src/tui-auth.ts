import { loadCliDotenv } from "./env.js";
import type { RunDependencies } from "./cli-types.js";

const OFFICIAL_LOGIN_UNSUPPORTED =
  "Official Z.ai / BigModel login is no longer supported. Configure a generic API-key provider instead.";

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

export async function loginForTui(_deps: RunDependencies, _options?: unknown): Promise<never> {
  throw new Error(OFFICIAL_LOGIN_UNSUPPORTED);
}

export async function loginBigmodelForTui(
  _deps: RunDependencies,
  _options?: unknown,
): Promise<never> {
  throw new Error(OFFICIAL_LOGIN_UNSUPPORTED);
}

export async function configureApiKeyForTui(
  _deps: RunDependencies,
  _options: unknown,
): Promise<never> {
  throw new Error(OFFICIAL_LOGIN_UNSUPPORTED);
}

export async function logoutForTui(deps: RunDependencies) {
  loadDotenvOrThrow(deps);
  const { loadBootstrapModule } = await import("./bootstrap-loader.js");
  const logout = deps.logoutKCodeCli ?? (await loadBootstrapModule()).logoutKCodeCli;
  return await logout({ env: deps.env ?? process.env });
}
