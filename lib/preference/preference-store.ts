export type PreferenceEntry = {
  key: string;
  value: string;
  label: string;
  updatedAt: string;
};

const STORAGE_KEY = "rimvio-preference-store.v1";
let memoryStore: PreferenceEntry[] = [];

function readJson(): PreferenceEntry[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PreferenceEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: PreferenceEntry[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
}

export function resetPreferencesForTests(items: PreferenceEntry[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function upsertPreference(input: Omit<PreferenceEntry, "updatedAt">): PreferenceEntry {
  const record: PreferenceEntry = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  writeJson([record, ...readJson().filter((item) => item.key !== record.key)]);
  return record;
}

export function listPreferences(limit = 20): PreferenceEntry[] {
  return readJson().slice(0, limit);
}

export function serializePreferencesForApi() {
  return listPreferences(15).map((item) => ({
    key: item.key,
    value: item.value,
    label: item.label,
  }));
}

const PREFERENCE_PATTERNS: Array<{
  pattern: RegExp;
  key: string;
  label: string;
  value: string;
}> = [
  {
    pattern: /(?:커피|카페).*(?:쓴|bitter|진한)\s*(?:건\s*)?(?:싫|별로|안)/iu,
    key: "coffee_roast",
    label: "커피",
    value: "Mild",
  },
  {
    pattern: /(?:매운|spicy)\s*(?:건\s*)?(?:싫|별로|안\s*좋)/iu,
    key: "food_spice",
    label: "음식 매운맛",
    value: "Mild",
  },
];

export function extractPreferenceFromMessage(message: string): PreferenceEntry | null {
  for (const rule of PREFERENCE_PATTERNS) {
    if (rule.pattern.test(message)) {
      return {
        key: rule.key,
        value: rule.value,
        label: rule.label,
        updatedAt: new Date().toISOString(),
      };
    }
  }
  return null;
}

export function applyPreferencePatchFromApi(entry: PreferenceEntry | null | undefined) {
  if (!entry?.key) {
    return;
  }
  upsertPreference(entry);
}
