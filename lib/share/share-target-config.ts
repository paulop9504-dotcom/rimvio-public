/**
 * FROZEN Android/iOS PWA share target.
 *
 * Do not change action/method/enctype/field names without expecting users to
 * reinstall the installed PWA. New share payload types must be routed inside
 * `handleShareReceiverPost()` — never by editing this object again.
 */
export const FROZEN_SHARE_TARGET = {
  action: "/share",
  method: "POST" as const,
  enctype: "multipart/form-data" as const,
  params: {
    title: "title",
    text: "text",
    url: "url",
    files: [
      {
        name: "media",
        accept: ["image/*"],
      },
    ],
  },
};

export const FROZEN_SHARE_TARGET_ACTION = FROZEN_SHARE_TARGET.action;
