import { normalizePhoneE164 } from "@/lib/peer-chat/phone";

export type DeviceContactEntry = {
  name: string;
  phoneE164: string;
};

type ContactTel = { tel?: string[] };
type ContactName = { name?: string[] };
type PickedContact = ContactTel & ContactName;

/** Contact Picker API (Chrome Android 등 — iOS Safari는 미지원). */
export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof (navigator as Navigator & { contacts?: { select?: unknown } })
      .contacts?.select === "function"
  );
}

export async function pickDeviceContacts(): Promise<DeviceContactEntry[]> {
  if (!isContactPickerSupported()) {
    throw new Error("UNSUPPORTED_CONTACT_PICKER");
  }

  const nav = navigator as Navigator & {
    contacts: {
      select: (
        props: string[],
        opts?: { multiple?: boolean },
      ) => Promise<PickedContact[]>;
    };
  };

  const picked = await nav.contacts.select(["name", "tel"], { multiple: true });
  const byPhone = new Map<string, DeviceContactEntry>();

  for (const row of picked) {
    const name =
      row.name?.[0]?.trim() ||
      row.tel?.[0]?.trim() ||
      "친구";
    for (const rawTel of row.tel ?? []) {
      const phoneE164 = normalizePhoneE164(rawTel);
      if (!phoneE164 || byPhone.has(phoneE164)) {
        continue;
      }
      byPhone.set(phoneE164, { name, phoneE164 });
    }
  }

  return [...byPhone.values()];
}
