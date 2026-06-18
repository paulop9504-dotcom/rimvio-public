import type { LinkRow } from "@/types/database";
import funFeedLinksJson from "@/lib/demo/fun-feed-links.json";

export const funFeedLinks = funFeedLinksJson as unknown as LinkRow[];
