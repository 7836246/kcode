interface AppLaunchGateLike {
  consume(): boolean;
}

interface RendererReadyInput {
  rendererId: number;
}

export function createAppLaunchCoordinator(appLaunchGate: AppLaunchGateLike) {
  return {
    onRendererReady(_input: RendererReadyInput): boolean {
      return appLaunchGate.consume();
    },
  };
}
