import { FALLBACK_COMMAND, isRimvioCommandToken } from "@/lib/command-router/command-registry";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

export type RoutedCommand = {
  line: string;
  command: string;
  argument: string;
};

function formatLine(command: string, argument = ""): RoutedCommand {
  const cmd = command.trim().toLowerCase();
  const arg = argument.trim();
  const line = arg.length > 0 ? `@${cmd} ${arg}` : `@${cmd}`;
  return { line, command: cmd, argument: arg };
}

/** Pass-through / normalize existing @ input. */
function normalizeAtCommand(trimmed: string): RoutedCommand {
  const body = trimmed.slice(1).trim();
  if (!body) {
    return formatLine(FALLBACK_COMMAND, "");
  }

  const space = body.search(/\s/u);
  const command = (space === -1 ? body : body.slice(0, space)).trim().toLowerCase();
  const argument = space === -1 ? "" : body.slice(space).trim();

  if (isRimvioCommandToken(command)) {
    return formatLine(command, argument);
  }

  const fallbackArg = body.trim();
  return formatLine(FALLBACK_COMMAND, fallbackArg);
}

function matchAlarm(text: string): RoutedCommand | null {
  const minuteLater = text.match(/(\d+)\s*분\s*(?:뒤|후|후에)?/u);
  if (minuteLater) {
    return formatLine("알림", `${minuteLater[1]}분`);
  }

  if (/(?:알람|알림|깨워|리마인드|리마인더)/u.test(text)) {
    const time = text.match(
      /(\d{1,2}\s*시\s*\d{0,2}\s*분?|\d+\s*분|\d{1,2}:\d{2}|내일|모레|오늘|am|pm)/iu,
    );
    return formatLine("알림", time?.[0]?.trim() ?? text);
  }

  if (/\d{1,2}\s*시/u.test(text) && /(?:알려|알림|리마인)/u.test(text)) {
    return formatLine("알림", text);
  }

  return null;
}

function matchChat(text: string): RoutedCommand | null {
  const toPerson = text.match(
    /(.+?)(?:한테|에게)\s*(?:톡|메시지|문자|연락|DM|dm)(?:\s*(?:보내|전송|줘|해줘|해 줘))?/u,
  );
  if (toPerson?.[1]) {
    return formatLine("톡", toPerson[1].trim());
  }

  const sendTalk = text.match(/(?:톡|메시지|쪽지)\s*(?:보내|전송|줘)?\s*(.+)/u);
  if (sendTalk?.[1]) {
    return formatLine("톡", sendTalk[1].trim());
  }

  if (/^(?:톡|dm|DM)\s+/u.test(text)) {
    return formatLine("톡", text.replace(/^(?:톡|dm|DM)\s+/iu, "").trim());
  }

  return null;
}

function matchNavigation(text: string): RoutedCommand | null {
  const explicitNav = text.match(
    /@?네비\s+(.+)|(.+?)\s*(?:까지\s*)?(?:길찾|네비|가자|가줘|가서|어떻게\s*가|가\s*고\s*싶)/u,
  );
  if (explicitNav) {
    const dest = (explicitNav[1] ?? explicitNav[2] ?? "").trim();
    if (dest) {
      return formatLine("네비", dest.replace(/\s*까지\s*$/u, "").trim());
    }
  }

  const station = text.match(/(.+?)\s*역(?:\s*까지|\s*가자|\s*가줘)?/u);
  if (station?.[1] && /가|길|이동|출발/u.test(text)) {
    return formatLine("네비", `${station[1].trim()}역`);
  }

  if (/^길찾기\s+/u.test(text)) {
    return formatLine("길찾기", text.replace(/^길찾기\s+/u, "").trim());
  }

  if (/택시\s*(?:불러|호출|타|탈)/u.test(text) || /^택시\s+/u.test(text)) {
    const dest = text.replace(/^택시\s*/u, "").replace(/(?:불러|호출|타|줘|해줘)/gu, "").trim();
    return formatLine("택시", dest);
  }

  if (/주유소|주유/u.test(text)) {
    const loc = text.replace(/주유소?|찾아|검색|근처/gu, "").trim();
    return formatLine("주유", loc);
  }

  if (/가까운\s*역|근처\s*역|지하철\s*역/u.test(text)) {
    const loc = text.replace(/가까운|근처|지하철|역|찾아|검색/gu, "").trim();
    return formatLine("역", loc);
  }

  return null;
}

function matchDailyAction(text: string): RoutedCommand | null {
  if (/맛집|식당|먹을\s*데|점심|런치|밥\s*뭐|먹을까|식사/u.test(text)) {
    const query = text
      .replace(/맛집|식당|점심|런치|밥|뭐|먹|지|추천|할까|어디|식사/gu, "")
      .trim();
    return formatLine("식사", query);
  }
  if (/일정\s*정리|스케줄\s*정리/u.test(text)) {
    return formatLine("일정정리", text);
  }
  if (/캘린더|달력|일정\s*보여/u.test(text)) {
    return formatLine("캘린더", text);
  }
  if (/할\s*일|todo|투두/u.test(text)) {
    return formatLine("할일", text.replace(/할\s*일|todo|투두/giu, "").trim());
  }
  return null;
}

function matchContextCommand(text: string): RoutedCommand | null {
  const rules: Array<{ test: RegExp; command: string; strip?: RegExp }> = [
    { test: /송금|이체|보내줘.*돈/u, command: "송금" },
    { test: /더치|n빵|더치페이/u, command: "더치" },
    { test: /영수증/u, command: "영수증" },
    { test: /배달|배민|요기/u, command: "배달" },
    { test: /픽업/u, command: "픽업" },
    { test: /주차/u, command: "주차" },
    { test: /친구\s*추가|친추/u, command: "친추" },
    { test: /링크시트|스프레드시트/u, command: "링크시트" },
    { test: /링크|url|http/u, command: "링크" },
    { test: /대화끝|톡끝|피드\s*복귀/u, command: "대화끝" },
    { test: /설명서|도움말|명령어/u, command: "설명서" },
  ];

  for (const rule of rules) {
    if (rule.test.test(text)) {
      const arg = rule.strip ? text.replace(rule.strip, "").trim() : text;
      return formatLine(rule.command, arg === text ? "" : arg);
    }
  }

  return null;
}

function routeNaturalLanguage(trimmed: string): RoutedCommand {
  const text = trimmed.replace(/\s+/gu, " ").trim();

  return (
    matchAlarm(text) ??
    matchChat(text) ??
    matchNavigation(text) ??
    matchDailyAction(text) ??
    matchContextCommand(text) ??
    formatLine(FALLBACK_COMMAND, text)
  );
}

/**
 * Rimvio Command Router — Korean NL or @ shortcuts → exactly one `@command argument` line.
 */
export function routeRimvioCommand(raw: string): string {
  const trimmed = normalizeAtMentionInput(raw);
  if (!trimmed) {
    return formatLine(FALLBACK_COMMAND, "").line;
  }
  if (trimmed.startsWith("@")) {
    return normalizeAtCommand(trimmed).line;
  }
  return routeNaturalLanguage(trimmed).line;
}

export function routeRimvioCommandDetailed(raw: string): RoutedCommand {
  const trimmed = normalizeAtMentionInput(raw);
  if (!trimmed) {
    return formatLine(FALLBACK_COMMAND, "");
  }
  if (trimmed.startsWith("@")) {
    return normalizeAtCommand(trimmed);
  }
  return routeNaturalLanguage(trimmed);
}
