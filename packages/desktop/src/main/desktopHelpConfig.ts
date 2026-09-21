import { net } from "electron";
import {
  buildHelpAppConfigUrl,
  buildKCodeSourceHeadersFromContext,
  createHelpAppConfigReader,
  KCODE_ENV,
} from "@kcode/shared";

export function createDesktopHelpConfigReader(options: {
  resolveEndpointOrigin: () => Promise<string>;
  appVersion: string;
  deviceMid: string;
}) {
  const read = createHelpAppConfigReader({ fetchImpl: (input, init) => net.fetch(input, init) });
  return async () => {
    const endpointOrigin = await options.resolveEndpointOrigin();
    return read(
      buildHelpAppConfigUrl(
        endpointOrigin,
        options.appVersion,
        `${process.platform}-${process.arch}`,
      ),
      buildKCodeSourceHeadersFromContext({
        endpointOrigin,
        appVersion: options.appVersion,
        deviceMid: options.deviceMid,
        platform: process.platform,
        arch: process.arch,
        releaseChannel: KCODE_ENV,
        sourceTitle: "electron",
      }),
    );
  };
}
