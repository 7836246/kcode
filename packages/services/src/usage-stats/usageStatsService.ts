import type {
  AppUsageRequest,
  AppUsageSnapshot,
  CodingPlanUsageRequest,
  CodingPlanUsageSnapshot,
  CodingPlanResetOpportunityRequest,
  CodingPlanResetOpportunityResult,
  CodingPlanResetScopeRequest,
  CodingPlanResetStatusSnapshot,
  CodingPlanResetUseRequest,
  CodingPlanResetUseResult,
  UsageEntitlementRequest,
  UsageEntitlementSnapshot,
  UsageStatsRequest,
  UsageStatsSnapshot,
} from "@kcode/shared";
import type { IKCodeAgentService } from "../kcode-agent/kcodeAgent.js";
import type { IUsageStatsService } from "./usageStats.js";

const OFFICIAL_CODING_PLAN_UNSUPPORTED = "official_coding_plan_unsupported";

interface UsageStatsServiceDependencies {
  /** App Usage 经 KCode Protocol 读取 agent 数据库真实统计。 */
  kcodeAgentService: Pick<IKCodeAgentService, "getAppUsageStats">;
}

function unsupportedCodingPlan(): never {
  throw new Error(OFFICIAL_CODING_PLAN_UNSUPPORTED);
}

export function createUsageStatsService(
  dependencies: UsageStatsServiceDependencies,
): IUsageStatsService {
  return {
    async getAppUsageSnapshot(request: AppUsageRequest): Promise<AppUsageSnapshot> {
      return dependencies.kcodeAgentService.getAppUsageStats({
        range: request.range,
        timeZone: request.timeZone,
      });
    },
    async getCodingPlanUsageSnapshot(
      _request: CodingPlanUsageRequest,
    ): Promise<CodingPlanUsageSnapshot> {
      unsupportedCodingPlan();
    },
    async getCodingPlanResetStatus(
      _request: CodingPlanResetScopeRequest,
    ): Promise<CodingPlanResetStatusSnapshot> {
      unsupportedCodingPlan();
    },
    async requestCodingPlanResetOpportunity(
      _request: CodingPlanResetOpportunityRequest,
    ): Promise<CodingPlanResetOpportunityResult> {
      unsupportedCodingPlan();
    },
    async useCodingPlanReset(_request: CodingPlanResetUseRequest): Promise<CodingPlanResetUseResult> {
      unsupportedCodingPlan();
    },
    async markCodingPlanResetHistoryRead(_request: CodingPlanResetScopeRequest): Promise<void> {
      unsupportedCodingPlan();
    },
    async getSnapshot(_request: UsageStatsRequest): Promise<UsageStatsSnapshot> {
      unsupportedCodingPlan();
    },
    async getEntitlementSnapshot(
      _request: UsageEntitlementRequest = {},
    ): Promise<UsageEntitlementSnapshot> {
      return {
        generatedAt: Date.now(),
        authenticated: false,
        unavailableReason: "unavailable",
        provider: null,
        remaining: null,
        subscription: null,
        quota: null,
      };
    },
  };
}
