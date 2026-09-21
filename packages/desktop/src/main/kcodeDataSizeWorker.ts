import { isMainThread, parentPort, workerData } from "node:worker_threads";

import { scanKCodeDataDirectory, type KCodeDataSizeScanRequest } from "./kcodeDataSizeScanner.js";

type WorkerResponse =
  | { ok: true; result: Awaited<ReturnType<typeof scanKCodeDataDirectory>> }
  | { ok: false; error: string };

const workerParentPort = parentPort;
if (!isMainThread && workerParentPort) {
  void scanKCodeDataDirectory(workerData as KCodeDataSizeScanRequest)
    .then((result) => {
      workerParentPort.postMessage({ ok: true, result } satisfies WorkerResponse);
    })
    .catch((error) => {
      workerParentPort.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : "unknown worker error",
      } satisfies WorkerResponse);
    });
}
