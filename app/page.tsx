import { AppShell } from "@/components/app-shell";
import { GlobeHomeClient } from "@/components/globe/globe-home-client";

/** Globe-first home — giant earth, pins only. */
export default function HomePage() {
  return (
    <AppShell title="지구" hideBranding immersive hideTitle globeHome>
      <GlobeHomeClient />
    </AppShell>
  );
}
