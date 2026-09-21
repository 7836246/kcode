import type { KCodeAccountAccess, KCodeProviderAccountAccess } from "@kcode/shared";

export interface AccountRequestAuthMaterial {
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface AccountRequestAuthInput {
  providerId: string;
  modelId?: string;
  accountAccess: KCodeProviderAccountAccess | KCodeAccountAccess;
  reason: "model-request" | "off-peak" | "usage";
}

export interface AccountAccessIdentityInput {
  providerId: string;
  accountAccess: KCodeProviderAccountAccess | KCodeAccountAccess;
}

export class AccountRequestCredentialUnavailableError extends Error {
  constructor(readonly providerId: string) {
    super(`Account request credential is unavailable: ${providerId}`);
    this.name = "AccountRequestCredentialUnavailableError";
  }
}

export interface AccountRequestAuthResolver {
  resolveAccessCurrent(access: KCodeProviderAccountAccess): Promise<KCodeAccountAccess | null>;
  resolveCurrent(input: AccountRequestAuthInput): Promise<AccountRequestAuthMaterial>;
  assertCurrent(input: AccountAccessIdentityInput): Promise<void>;
}

/**
 * 请求期 Account 鉴权边界。官方账号实现已移除；调用方可注入任意 resolver。
 * Host 不再装配官方智谱 / Z.ai / BigModel 解析器。
 */
export interface IAccountRequestAuthService {
  resolveAccessCurrent(access: KCodeProviderAccountAccess): Promise<KCodeAccountAccess | null>;
  resolveCurrent(input: AccountRequestAuthInput): Promise<AccountRequestAuthMaterial>;
  assertCurrent(input: AccountAccessIdentityInput): Promise<void>;
}

export function createAccountRequestAuthService(
  resolver: AccountRequestAuthResolver,
): IAccountRequestAuthService {
  return {
    resolveAccessCurrent(access) {
      return resolver.resolveAccessCurrent(access);
    },
    resolveCurrent(input) {
      return resolver.resolveCurrent(input);
    },
    assertCurrent(input) {
      return resolver.assertCurrent(input);
    },
  };
}
