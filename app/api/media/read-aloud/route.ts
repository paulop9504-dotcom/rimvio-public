import { NextResponse } from "next/server";
import { fetchArticleSpeakText } from "@/lib/media/article-text";

export async function POST(request: Request) {
  let body: { url?: string; title?: string | null };

  try {
    body = (await request.json()) as { url?: string; title?: string | null };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const text = await fetchArticleSpeakText(url, body.title ?? null);
  if (!text) {
    return NextResponse.json({ error: "empty_text" }, { status: 422 });
  }

  return NextResponse.json({
    text,
    source: text.length >= 120 ? "article" : "fallback",
  });
}
