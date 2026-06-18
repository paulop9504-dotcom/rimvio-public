"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Globe, Plus, Users } from "lucide-react";
import { CaptureSheet } from "@/components/globe/capture-sheet";
import { useCopy } from "@/hooks/use-copy";
import { rimvioNavBarClass } from "@/lib/brand/rimvio-neon-theme";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

type AppNavProps = {
  immersive?: boolean;
  /** side = desktop rail; fixed = mobile bottom bar (portaled to body) */
  placement?: "side" | "inline" | "fixed";
};

type NavTab = {
  href?: string;
  action?: "capture";
  label: string;
  isActive: (pathname: string) => boolean;
  icon: "globe" | "people" | "capture";
};

function isGlobePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/feed" ||
    pathname.startsWith("/feed/") ||
    pathname === "/globe" ||
    pathname.startsWith("/globe/")
  );
}

const NAV_ICON_CLASS = "size-6 shrink-0 pointer-events-none";
const NAV_ICON_STROKE = 2;
const NAV_ICON_SLOT =
  "rimvio-bottom-nav-slot pointer-events-none select-none";

function NavIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className={NAV_ICON_SLOT} aria-hidden>
      {children}
    </span>
  );
}

function NavTabIcon({
  icon,
  active,
}: {
  icon: NavTab["icon"];
  active: boolean;
}) {
  const tone = active ? "text-foreground" : "text-foreground/70";
  switch (icon) {
    case "globe":
      return (
        <NavIconSlot>
          <Globe className={cn(NAV_ICON_CLASS, tone)} strokeWidth={NAV_ICON_STROKE} />
        </NavIconSlot>
      );
    case "people":
      return (
        <NavIconSlot>
          <Users className={cn(NAV_ICON_CLASS, tone)} strokeWidth={NAV_ICON_STROKE} />
        </NavIconSlot>
      );
    case "capture":
      return (
        <NavIconSlot>
          <Plus className={cn(NAV_ICON_CLASS, tone)} strokeWidth={NAV_ICON_STROKE} />
        </NavIconSlot>
      );
  }
}

function NavTabButton({
  tab,
  active,
  onNavigate,
  onCapture,
  className,
}: {
  tab: NavTab;
  active: boolean;
  onNavigate: (href: string) => void;
  onCapture: () => void;
  className?: string;
}) {
  const activate = () => {
    if (tab.action === "capture") {
      onCapture();
      return;
    }
    if (tab.href) {
      onNavigate(tab.href);
    }
  };

  return (
    <button
      type="button"
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      data-nav-href={tab.href ?? "capture"}
      data-nav-action={tab.action}
      onTouchEnd={(event) => {
        event.preventDefault();
        event.stopPropagation();
        activate();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        activate();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        activate();
      }}
      className={cn(
        "rimvio-bottom-nav-tab relative z-10 flex h-full w-full min-h-11 min-w-11 items-center justify-center border-0 bg-transparent p-0 transition-opacity active:opacity-60 touch-manipulation",
        className,
      )}
    >
      <span className="pointer-events-none flex items-center justify-center">
        <NavTabIcon icon={tab.icon} active={active} />
      </span>
    </button>
  );
}

function MobileNavLinks({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.href ?? tab.action ?? tab.label}
          tab={tab}
          active={tab.isActive(pathname)}
          onNavigate={onNavigate}
          onCapture={onCapture}
        />
      ))}
    </>
  );
}

function SideNavLinks({
  tabs,
  pathname,
  onNavigate,
  onCapture,
  linkClassName,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
  linkClassName?: string;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.href ?? tab.action ?? tab.label}
          tab={tab}
          active={tab.isActive(pathname)}
          onNavigate={onNavigate}
          onCapture={onCapture}
          className={linkClassName}
        />
      ))}
    </>
  );
}

function SideNavRail({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  return (
    <nav className={cn(GRID.navSide, "hidden lg:flex")} aria-label="Primary">
      <div className="flex flex-col items-center gap-[var(--space-phi2)]">
        <SideNavLinks
          tabs={tabs}
          pathname={pathname}
          onNavigate={onNavigate}
          onCapture={onCapture}
          linkClassName="size-11 rounded-2xl hover:bg-foreground/[0.04]"
        />
      </div>
    </nav>
  );
}

function BottomNavGrid({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  return (
    <>
      <div className="rimvio-bottom-nav-safe" aria-hidden />
      <div className="rimvio-bottom-nav-grid rimvio-bottom-nav-grid--3">
        <MobileNavLinks
          tabs={tabs}
          pathname={pathname}
          onNavigate={onNavigate}
          onCapture={onCapture}
        />
      </div>
    </>
  );
}

function PortaledBottomNavBar({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  const bar = (
    <nav
      className={cn(
        GRID.navBottomFrame,
        "rimvio-bottom-nav-shell lg:hidden",
        rimvioNavBarClass,
        "flex flex-col",
      )}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
      data-rimvio-bottom-nav-portal
    >
      <BottomNavGrid
        tabs={tabs}
        pathname={pathname}
        onNavigate={onNavigate}
        onCapture={onCapture}
      />
    </nav>
  );

  return createPortal(bar, document.body);
}

export function AppNav({ placement }: AppNavProps) {
  const pathname = usePathname() ?? "/";
  const copy = useCopy();
  const [captureOpen, setCaptureOpen] = useState(false);
  const lastNavRef = useRef<{ href: string; at: number } | null>(null);

  const navigate = useCallback(
    (href: string) => {
      const isSame =
        (href === "/" && isGlobePath(pathname)) ||
        pathname === href ||
        pathname.startsWith(`${href}/`);
      if (isSame) {
        return;
      }

      const now = Date.now();
      if (
        lastNavRef.current?.href === href &&
        now - lastNavRef.current.at < 420
      ) {
        return;
      }
      lastNavRef.current = { href, at: now };

      window.location.assign(href);
    },
    [pathname],
  );

  const tabs = useMemo<NavTab[]>(
    () => [
      {
        href: "/",
        label: copy.nav.globe,
        isActive: (p) => isGlobePath(p),
        icon: "globe",
      },
      {
        href: "/peers",
        label: copy.nav.people,
        isActive: (p) => p.startsWith("/peers"),
        icon: "people",
      },
      {
        action: "capture",
        label: copy.nav.capture,
        isActive: () => false,
        icon: "capture",
      },
    ],
    [copy],
  );

  const navChrome = (
    <>
      {placement === "side" ? (
        <SideNavRail
          tabs={tabs}
          pathname={pathname}
          onNavigate={navigate}
          onCapture={() => setCaptureOpen(true)}
        />
      ) : (
        <PortaledBottomNavBar
          tabs={tabs}
          pathname={pathname}
          onNavigate={navigate}
          onCapture={() => setCaptureOpen(true)}
        />
      )}
      <CaptureSheet open={captureOpen} onOpenChange={setCaptureOpen} />
    </>
  );

  if (placement === "side") {
    return navChrome;
  }

  return navChrome;
}
