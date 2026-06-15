export type PlaceOpeningHours = {
  start: string | null;
  status: "open" | "closed" | "break" | "unknown";
  raw?: string | null;
};

/** Fixed schema — Ingestion Parser output. */
export type PlaceIngestionSchema = {
  name: string | null;
  address: string | null;
  opening_hours: PlaceOpeningHours;
  phone: string | null;
  homepage: string | null;
  features: string[];
};

export type PlaceContainerRecord = {
  id: string;
  schema: PlaceIngestionSchema;
  searchText: string;
  sourceText: string;
  createdAt: string;
  updatedAt: string;
};

export type PlaceIngestionResult = {
  schema: PlaceIngestionSchema;
  container: PlaceContainerRecord;
  entityIds: string[];
};
