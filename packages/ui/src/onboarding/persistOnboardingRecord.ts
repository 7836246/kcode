import type { InterfaceMode } from "@/lib/interfaceMode.js";
import type { useOnboardingRecordService } from "@/hooks/useOnboardingRecordService.js";
import type { OccupationValue } from "@/onboarding/occupationOptions.js";
import { logger } from "@/logger.js";

const ONBOARDING_RECORD_TIMEOUT_MS = 5000;

type OnboardingRecordService = NonNullable<ReturnType<typeof useOnboardingRecordService>>;

async function withOnboardingRecordTimeout<T>(task: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    task,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ONBOARDING_RECORD_TIMEOUT_MS),
    ),
  ]);
}

/** 追加本地引导记录（userId 由 host 补全）；channel 缺失挂起时按写失败处理。 */
export async function appendOnboardingRecord(
  service: OnboardingRecordService,
  deviceMid: string,
  entry: Parameters<OnboardingRecordService["appendRecord"]>[1],
): Promise<void> {
  await withOnboardingRecordTimeout(service.appendRecord(deviceMid, entry), "appendRecord");
}

export async function persistDismissedAutoOnboarding(
  service: OnboardingRecordService,
  deviceMid: string,
): Promise<void> {
  await withOnboardingRecordTimeout(
    service.dismissAutoOnboarding(deviceMid),
    "dismissAutoOnboarding",
  );
}

export function scheduleDismissAutoOnboarding(options: {
  needsOnboarding: boolean | null;
  service: OnboardingRecordService | null;
  deviceMid: string;
  markOnboarded: () => void;
}): void {
  if (options.needsOnboarding !== true || !options.service) {
    return;
  }
  void persistDismissedAutoOnboarding(options.service, options.deviceMid)
    .then(() => options.markOnboarded())
    .catch((cause: unknown) => {
      logger.warn("[occupation-onboarding] 关闭引导落盘失败", { error: String(cause) });
    });
}

export async function persistCompletedOnboardingRecord(options: {
  service: OnboardingRecordService | null;
  deviceMid: string;
  occupation: OccupationValue | null;
  mode: InterfaceMode | null;
  memory: boolean;
  suggestions: boolean;
  skip: boolean;
  markOnboarded: () => void;
}): Promise<void> {
  if (!options.service) {
    return;
  }
  try {
    await appendOnboardingRecord(options.service, options.deviceMid, {
      occupation: options.occupation,
      interfaceMode: options.mode,
      memoryEnabled: options.skip ? null : options.memory,
      proactiveSuggestionsEnabled: options.skip
        ? null
        : options.mode === "office" && options.suggestions,
      completedAt: new Date().toISOString(),
    });
    options.markOnboarded();
  } catch (cause) {
    logger.warn("[occupation-onboarding] 写入引导记录失败", { error: String(cause) });
  }
}
