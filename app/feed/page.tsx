import { redirect } from "next/navigation";

type FeedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /feed → globe home (recall deep links preserved). */
export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) {
      next.set(key, value.trim());
    } else if (Array.isArray(value)) {
      const first = value.find((row) => typeof row === "string" && row.trim());
      if (typeof first === "string") {
        next.set(key, first.trim());
      }
    }
  }

  const query = next.toString();
  redirect(query ? `/?${query}` : "/");
}
