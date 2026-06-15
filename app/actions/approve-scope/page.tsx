import { AppShell } from "@/components/app-shell";

export default function ApproveScopePage() {
  return (
    <AppShell title="Approve scope" subtitle="Prefetch-ready action surface">
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Action detail view placeholder. Wire Supabase + optimistic submit here.
        </p>
      </div>
    </AppShell>
  );
}
