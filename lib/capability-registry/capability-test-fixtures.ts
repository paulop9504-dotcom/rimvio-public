import type { CapabilityDispatchRequest } from "@/lib/capability-registry/capability-contract";

export const FIXTURE_NAVIGATE_OSAKA: CapabilityDispatchRequest = {
  capabilityId: "NAVIGATE",
  inputs: { destination: "오사카" },
};

export const FIXTURE_BOOK_FLIGHT: CapabilityDispatchRequest = {
  capabilityId: "BOOK_FLIGHT",
  inputs: { title: "다음 주 오사카 여행" },
};

export const FIXTURE_ALARM: CapabilityDispatchRequest = {
  capabilityId: "ALARM",
  inputs: { title: "3분 뒤 알려줘" },
};
