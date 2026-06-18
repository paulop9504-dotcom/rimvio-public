import type { EnqueueExecutionInput } from "@/lib/execution/execution-contract";

export const FIXTURE_NAVIGATE_JOB: EnqueueExecutionInput = {
  capabilityId: "NAVIGATE",
  providerId: "kakao_navi",
  inputs: { destination: "오사카" },
};

export const FIXTURE_CALL_JOB: EnqueueExecutionInput = {
  capabilityId: "CALL",
  providerId: "tel_default",
  inputs: { phone: "01012345678" },
};

export const FIXTURE_ALARM_JOB: EnqueueExecutionInput = {
  capabilityId: "ALARM",
  providerId: "system_alarm",
  inputs: { title: "3분 뒤 알려줘" },
};
