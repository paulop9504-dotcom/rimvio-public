import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { RimvioLogo } from "@/components/rimvio-logo";
import { RIMVIO } from "@/lib/brand/rimvio";
import { rimvioHeaderChromeClass } from "@/lib/brand/rimvio-neon-theme";
import { GOLDEN } from "@/lib/ui/golden-layout";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  subtitle?: string;
  /** Hide visible page title (kept for screen readers) */
  hideTitle?: boolean;
  immersive?: boolean;
  compact?: boolean;
  /** Grouped list surface — neon OS base layer */
  iosSurface?: boolean;
  /** Action Chat — feed renders its own header */
  hideBranding?: boolean;
  /** compact: shell body 좌우·하단 패딩 제거 (대화방 등) */
  fullBleed?: boolean;
  /** compact: 하단 탭 숨김 (대화방 전체 화면) */
  hideBottomNav?: boolean;
  /** Home globe — full-width column beside nav rail */
  globeHome?: boolean;
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  hideTitle = false,
  immersive = false,
  compact = false,
  iosSurface = false,
  hideBranding = false,
  fullBleed = false,
  hideBottomNav = false,
  globeHome = false,
  children,
}: AppShellProps) {
  return (
    <div className={GRID.viewport}>
      <div className={cn(GRID.shell, globeHome && "app-shell-grid--globe-home")}>
        <Suspense fallback={null}>
          <AppNav placement="side" />
        </Suspense>

        <div
          className={cn(
            GRID.column,
            "app-shell-viewport flex h-dvh flex-col overflow-hidden",
            fullBleed && "app-shell-column--chat",
            globeHome && "app-shell-column--globe-home",
            globeHome ? "bg-[#f2f4f6]" : "bg-background",
          )}
        >
          <header
            className={
              hideBranding
                ? "sr-only"
                : immersive
                ? "absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-background/90 to-transparent px-[var(--space-phi)] pb-[var(--space-u)] pt-[max(0.75rem,env(safe-area-inset-top))]"
                : compact
                  ? cn(
                      rimvioHeaderChromeClass,
                      "sticky top-0 z-10 px-[var(--space-phi)] pb-[var(--space-u)] pt-[max(0.75rem,env(safe-area-inset-top))]",
                      iosSurface ? "bg-rimvio-base/90" : "bg-rimvio-base/85",
                    )
                  : cn(
                      rimvioHeaderChromeClass,
                      "sticky top-0 z-10 bg-rimvio-base/80 px-[var(--space-phi)] pb-[var(--space-phi)] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl",
                    )
            }
          >
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 transition-opacity hover:opacity-90",
                immersive &&
                  "rounded-full bg-background/55 px-2 py-1 backdrop-blur-md ring-1 ring-border/30"
              )}
              aria-label={`${RIMVIO.name} 홈`}
            >
              <RimvioLogo
                size={immersive ? "xs" : "sm"}
                framed={!immersive}
                showWordmark
                showKo={!immersive}
                wordmarkClassName={cn(
                  immersive
                    ? "text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90"
                    : "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                )}
              />
            </Link>
            <h1
              className={
                immersive || hideTitle
                  ? "sr-only"
                  : compact
                    ? "mt-[var(--space-u)] text-[22px] font-semibold tracking-tight text-foreground"
                    : "mt-2 text-[28px] font-semibold tracking-tight text-foreground"
              }
            >
              {title}
            </h1>
            {subtitle && !immersive && !compact ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </header>

          <main
            className={
              immersive
                ? "relative flex min-h-0 flex-1 flex-col pb-0"
                : compact
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "flex-1 px-[var(--space-phi)] pb-[max(var(--space-phi2),env(safe-area-inset-bottom))]"
            }
          >
            {compact ? (
              <div
                className={cn(
                  GOLDEN.shellBody,
                  "min-h-0 flex-1 overscroll-y-contain",
                  fullBleed
                    ? "flex flex-col overflow-hidden"
                    : "overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-[var(--space-phi)] pb-[var(--space-phi)]",
                )}
              >
                {children}
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {!hideBottomNav ? (
        <Suspense fallback={null}>
          <AppNav placement="fixed" />
        </Suspense>
      ) : null}
    </div>
  );
}
