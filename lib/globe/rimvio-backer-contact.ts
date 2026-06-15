/** Founder inbox for support · investment · partnership inquiries. */
export const RIMVIO_BACKER_EMAIL = "paulop9504@gmail.com";

export type RimvioBackerInquiryKind = "support" | "invest" | "partner";

const INQUIRY_LABEL: Record<RimvioBackerInquiryKind, string> = {
  support: "지원",
  invest: "투자",
  partner: "파트너십",
};

export function buildRimvioBackerMailtoUrl(input?: {
  kind?: RimvioBackerInquiryKind;
  origin?: string;
}): string {
  const kind = input?.kind ?? "invest";
  const origin =
    input?.origin?.trim() ||
    (typeof window !== "undefined" ? window.location.href : "https://rimvio.vercel.app/globe");

  const subject = encodeURIComponent("Rimvio 지원·투자 문의");
  const body = encodeURIComponent(
    [
      "안녕하세요, Rimvio에 관심이 있어 연락드립니다.",
      "",
      `관심 분야: ${INQUIRY_LABEL[kind]}`,
      "이름:",
      "연락처:",
      "메시지:",
      "",
      `— Rimvio · ${origin}`,
    ].join("\n"),
  );

  return `mailto:${RIMVIO_BACKER_EMAIL}?subject=${subject}&body=${body}`;
}
