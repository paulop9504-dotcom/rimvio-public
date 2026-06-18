/** Best-effort payment app opens — account is copied via action copyText. */
export const TOSS_APP_OPEN = "supertoss://";
export const TOSS_WEB = "https://toss.im/";
export const KAKAOPAY_APP_OPEN = "kakaopay://";
export const KAKAOPAY_WEB = "https://www.kakaopay.com/";

export function buildTossSendAction(accountDisplay: string) {
  return {
    href: TOSS_APP_OPEN,
    fallbackHref: TOSS_WEB,
    copyText: accountDisplay,
  };
}

export function buildKakaoPaySendAction(accountDisplay: string) {
  return {
    href: KAKAOPAY_APP_OPEN,
    fallbackHref: KAKAOPAY_WEB,
    copyText: accountDisplay,
  };
}
