"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runLinkAction } from "@/lib/actions/execute-link-action";
import type { BeamSnapshot } from "@/lib/beam/types";
import {
  findBeamInPocket,
  saveBeamToPocket,
} from "@/lib/beam/save-beam-to-pocket";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO } from "@/lib/brand/rimvio";
import { cn } from "@/lib/utils";

export function BeamPageClient({ slug }: { slug: string }) {
  const [beam, setBeam] = useState<BeamSnapshot | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [inPocket, setInPocket] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/beam/${slug}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("not found");
        }

        const snapshot = (await response.json()) as BeamSnapshot;
        setBeam(snapshot);
        setInPocket(Boolean(findBeamInPocket(slug)));
        setPhase("ready");
      } catch {
        setPhase("error");
      }
    };

    void load();
  }, [slug]);

  const handleSaveToPocket = () => {
    if (!beam || inPocket) {
      return;
    }

    const result = saveBeamToPocket(beam);
    setInPocket(true);

    if (result.status === "already") {
      toast.message(copy.beam.alreadyInPocket);
      return;
    }

    toast.success(copy.beam.savedToPocket, {
      action: {
        label: copy.beam.openInbox,
        onClick: () => {
          window.location.href = "/inbox";
        },
      },
    });
  };

  const handlePrimary = async () => {
    if (!beam) {
      return;
    }

    const action = beam.actions[0] ?? {
      id: "beam-primary",
      label: beam.primary_action_label,
      kind: "open" as const,
      href: beam.primary_action_href,
    };

    const { copiedText } = await runLinkAction(action);

    if (copiedText) {
      toast.success(`복사해 뒀어요 — ${copiedText}`);
    }
  };

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">{copy.beam.loading}</p>
      </div>
    );
  }

  if (phase === "error" || !beam) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">{copy.beam.notFound}</p>
        <p className="text-sm text-muted-foreground">
          시간이 지났거나, 아직 저장이 안 됐을 수도 있어요.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">{RIMVIO.homeLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {copy.beam.brand}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{beam.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{beam.domain}</p>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-6">
        {beam.thumbnail_url ? (
          <div className="relative size-36 overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
            <Image
              src={beam.thumbnail_url}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          {copy.beam.hint}
        </p>

        <Button
          className={cn(
            "h-16 w-full rounded-full text-lg font-semibold shadow-sm",
            /youtube/i.test(beam.domain) &&
              "border-red-500/20 bg-red-500/10 text-red-700 hover:bg-red-500/15"
          )}
          onClick={() => void handlePrimary()}
        >
          <ExternalLink className="mr-2 size-5" />
          {beam.primary_action_label}
        </Button>

        <div className="w-full space-y-2">
          <Button
            variant="outline"
            className="h-14 w-full rounded-full text-base font-semibold"
            disabled={inPocket}
            onClick={handleSaveToPocket}
          >
            <Inbox className="mr-2 size-5" />
            {inPocket ? copy.beam.alreadyInPocket : copy.beam.saveToPocket}
          </Button>
          {!inPocket ? (
            <p className="text-center text-xs text-muted-foreground">
              {copy.beam.pocketHint}
            </p>
          ) : (
            <Button asChild variant="ghost" className="w-full rounded-full text-muted-foreground">
              <Link href="/inbox">{copy.beam.openInbox}</Link>
            </Button>
          )}
        </div>

        <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
          <Link href="/welcome">{RIMVIO.name} 설치하기</Link>
        </Button>
      </div>
    </div>
  );
}
