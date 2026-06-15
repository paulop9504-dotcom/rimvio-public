/** Map plugin ids to actionable deeplinks (web / app scheme). */

const PLUGIN_DEEPLINKS: Record<string, string | ((ctx: DeeplinkContext) => string)> = {
  "kakao.taxi": (ctx) => {
    const dest = encodeURIComponent(ctx.destination ?? "강남역");
    return `https://taxi.kakao.com/?dest=${dest}`;
  },
  navigation: (ctx) => {
    const dest = encodeURIComponent(ctx.destination ?? ctx.label ?? "목적지");
    return `https://map.kakao.com/link/search/${dest}`;
  },
  tel: () => "tel:",
  "ticket.view": () => "rimvio://ticket/view",
  "parking.register": () => "rimvio://parking/register",
  "zoom.join": () => "rimvio://zoom/join",
  "file.open": (ctx) => ctx.file_url ?? "rimvio://file/deck",
  "card.qr": () => "rimvio://card/qr",
  "order.pickup": (ctx) => {
    const item = encodeURIComponent(ctx.label ?? "샐러드");
    return `rimvio://order/pickup?item=${item}`;
  },
  "gym.barcode": () => "rimvio://gym/barcode",
  "calendar.view": () => "rimvio://calendar/today",
  "roaming.esim": () => "rimvio://roaming/esim",
  "finance.fx": () => "rimvio://finance/fx",
  "passport.check": () => "rimvio://passport/check",
  "transit.ic_card": () => "rimvio://transit/ic-card",
  "search.web": (ctx) => {
    const q = encodeURIComponent(ctx.label ?? "travel prep");
    return `https://www.google.com/search?q=${q}`;
  },
  "chat.followup": (ctx) => {
    const q = encodeURIComponent(ctx.label ?? "help me prepare");
    return `rimvio://chat/followup?q=${q}`;
  },
};

export type DeeplinkContext = {
  label?: string;
  destination?: string | null;
  file_url?: string | null;
};

export function resolvePluginDeeplink(
  plugin: string | null | undefined,
  context: DeeplinkContext = {},
): string | null {
  if (!plugin?.trim()) {
    return null;
  }

  const entry = PLUGIN_DEEPLINKS[plugin.trim()];
  if (!entry) {
    return `rimvio://${plugin.replace(/\./g, "/")}`;
  }

  return typeof entry === "function" ? entry(context) : entry;
}
