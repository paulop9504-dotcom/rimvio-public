import {

  attachCopyText,

  createCopyOnlyAction,

  createOpenAction,

} from "@/lib/enrichers/action-factory";

import type { LinkActionItem } from "@/types/database";



function toSpotifyUri(rawUrl: string): string | null {

  try {

    const parsed = new URL(rawUrl);

    const parts = parsed.pathname.split("/").filter(Boolean);



    if (parts.length >= 2 && /^(track|album|playlist|episode|show)$/i.test(parts[0])) {

      return `spotify:${parts[0]}:${parts[1]}`;

    }

  } catch {

    // Ignore invalid URLs.

  }



  return null;

}



function truncate(value: string, max = 18) {

  return value.length > max ? `${value.slice(0, max)}…` : value;

}



function withWebFallback(

  label: string,

  href: string,

  icon: string,

  webUrl: string,

  copyText: string | null

): LinkActionItem {

  return createOpenAction({

    label,

    href,

    icon,

    copyText,

    fallbackHref: webUrl,

  });

}



/** Extra app/deep-link actions for generic enricher fallback. */

export function buildDomainQuickActions(

  rawUrl: string,

  domain: string,

  title: string | null

): LinkActionItem[] {

  const target = `${domain} ${rawUrl}`.toLowerCase();

  const copyText = title?.trim() || null;

  const actions: LinkActionItem[] = [];



  const spotifyUri = toSpotifyUri(rawUrl);

  if (spotifyUri && /spotify|open\.spotify/i.test(target)) {

    actions.push(

      withWebFallback("🎧 Spotify에서 재생", spotifyUri, "spotify", rawUrl, copyText)

    );

  }



  if (/instagram\.com|instagr\.am/i.test(target)) {

    actions.push(

      withWebFallback("📷 Instagram 열기", rawUrl, "instagram", rawUrl, copyText)

    );

  }



  if (/figma\.com/i.test(target)) {

    actions.push(

      withWebFallback(

        "🎨 Figma 열기",

        rawUrl,

        "figma",

        rawUrl,

        copyText ?? "Figma"

      )

    );

  }



  if (/notion\.(so|site)/i.test(target)) {

    actions.push(

      withWebFallback("📝 Notion 열기", rawUrl, "notion", rawUrl, copyText)

    );

  }



  if (/linear\.app/i.test(target)) {

    actions.push(

      withWebFallback("📋 Linear 열기", rawUrl, "link", rawUrl, copyText)

    );

  }



  if (/twitter\.com|x\.com/i.test(target)) {

    actions.push(withWebFallback("🐦 X 열기", rawUrl, "twitter", rawUrl, copyText));

  }



  if (/threads\.net/i.test(target)) {

    actions.push(withWebFallback("🧵 Threads 열기", rawUrl, "link", rawUrl, copyText));

  }



  if (/t\.me|telegram\./i.test(target)) {

    actions.push(

      withWebFallback("✈️ Telegram 열기", rawUrl, "link", rawUrl, copyText)

    );

  }



  if (/linkedin\.com/i.test(target)) {

    actions.push(

      withWebFallback("💼 LinkedIn 열기", rawUrl, "link", rawUrl, copyText)

    );

  }



  if (/music\.apple\.com|itunes\.apple/i.test(target)) {

    actions.push(

      withWebFallback("🎵 Apple Music 열기", rawUrl, "link", rawUrl, copyText)

    );

  }



  if (/docs\.google\.com/i.test(target)) {

    actions.push(

      withWebFallback("📄 Google Docs 열기", rawUrl, "link", rawUrl, copyText)

    );

  }



  if (/github\.com/i.test(target)) {

    actions.push(

      withWebFallback("🐙 GitHub 열기", rawUrl, "link", rawUrl, copyText)

    );

  }



  if (copyText && actions.length === 0 && !/^(link|example)/i.test(domain)) {

    actions.push(

      attachCopyText(

        createOpenAction({

          label: `🔗 ${truncate(copyText)} 열기`,

          href: rawUrl,

          icon: "external-link",

          fallbackHref: rawUrl,

        }),

        copyText

      ),

      createCopyOnlyAction(`📋 ${truncate(copyText, 14)} 복사`, copyText)

    );

  }



  return actions.slice(0, 3);

}



export function hostnameActionLabel(domain: string) {

  const base = domain.replace(/^www\./, "").split(".")[0] ?? domain;

  return base.charAt(0).toUpperCase() + base.slice(1);

}


