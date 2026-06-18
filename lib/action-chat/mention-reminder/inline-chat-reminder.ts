/** Inline @알림 — link-reminder widget payload in chat. */

export type InlineChatReminderWire = {
  reminderId: string;
  linkId: string;
  title: string;
  url: string;
  fireAt: string;
  whenLabel: string;
};

export function buildInlineChatReminderWire(input: {
  reminderId: string;
  linkId: string;
  title: string;
  url: string;
  fireAt: string;
  whenLabel: string;
}): InlineChatReminderWire {
  return { ...input };
}
