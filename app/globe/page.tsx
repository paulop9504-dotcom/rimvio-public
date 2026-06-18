import { redirect } from "next/navigation";

type GlobePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /globe → globe home recall deep link. */
export default async function GlobePage({ searchParams }: GlobePageProps) {
  const params = await searchParams;
  const next = new URLSearchParams();

  const event = params.event;
  const cluster = params.cluster;
  const media = params.media;

  if (typeof event === "string" && event.trim()) {
    next.set("recallEvent", event.trim());
  }
  if (typeof cluster === "string" && cluster.trim()) {
    next.set("recallCluster", cluster.trim());
  }
  if (typeof media === "string" && media.trim()) {
    next.set("recallMedia", media.trim());
  }

  const query = next.toString();
  redirect(query ? `/?${query}` : "/");
}
