/**
 * WelcomeScreen —— API Key 登录入口
 */
import { useKCodeIntl } from "./i18n/IntlProvider.js";
import { LoginApiKeyForm } from "./login/LoginApiKeyForm.js";
import { KCodeAboutLogo } from "@/components/ui/KCodeAboutLogo.js";
import { ThemeHeroVisual } from "./openWorkspacePageThemeHero.js";

interface WelcomeScreenProps {
  onComplete: (reason: LoginCompleteReason) => void | Promise<void>;
}

export type LoginCompleteReason = "apiKey" | "skip";

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { intl } = useKCodeIntl();

  return (
    <main className="relative flex h-full min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6">
      <ThemeHeroVisual className="absolute inset-0" />
      <div className="pointer-events-none absolute left-0 top-0 right-0 z-10 flex h-12 w-full items-center [app-region:drag]" />
      <section className="relative z-10 w-full flex flex-col gap-10 max-w-sm rounded-2xl border border-popover-border bg-background p-8 text-ui-base/relaxed shadow-md sm:p-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <LoginPanelLogo />
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              {intl.formatMessage({ id: "login.title" })}
            </h1>
            <p className="text-ui-base/relaxed text-foreground-subtle">
              {intl.formatMessage({ id: "login.description" })}
            </p>
          </div>
        </header>
        <LoginApiKeyForm
          onSaved={() => onComplete("apiKey")}
          onSkipped={() => onComplete("skip")}
        />
      </section>
    </main>
  );
}

function LoginPanelLogo() {
  return (
    // 登录 logo 壳是固定深色底，边框不能跟随浅色主题 token，否则浅色主题下边框过重。
    <div
      className="relative mb-1 flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-lg/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-[rgba(255,255,255,0.1)]"
      aria-label="KCode"
      role="img"
    >
      <KCodeAboutLogo className="h-auto w-10" />
    </div>
  );
}
