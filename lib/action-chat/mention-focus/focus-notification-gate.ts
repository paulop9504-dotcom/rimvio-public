import {
  appendHeldShadowId,
  isFocusSessionRunning,
  readFocusSession,
} from "@/lib/action-chat/mention-focus/focus-session-store";
import type {
  NotificationEventInput,
  ShadowProcessedRecord,
} from "@/lib/notification-shadow/types";
import { ROUTE_THRESHOLDS } from "@/lib/notification-shadow/types";

const FOCUS_ABSORB_REASON = "집중 모드 흡수";

const KAKAO_PATTERN = /(?:kakaotalk|카카오톡|kakao(?:talk)?)/iu;
const EMAIL_PATTERN =
  /(?:gmail|google\s*mail|outlook|mail|email|이메일|네이버\s*메일|naver\s*mail|yahoo\s*mail)/iu;

export function notificationBlob(record: ShadowProcessedRecord | NotificationEventInput): string {
  if ("raw" in record) {
    return `${record.source_app} ${record.raw.title} ${record.raw.content}`;
  }
  return `${record.source_app} ${record.title} ${record.content}`;
}

export function isKakaoNotification(record: ShadowProcessedRecord): boolean {
  return KAKAO_PATTERN.test(notificationBlob(record));
}

export function isEmailNotification(record: ShadowProcessedRecord): boolean {
  return EMAIL_PATTERN.test(notificationBlob(record));
}

function shouldAbsorbForFocus(
  session: NonNullable<ReturnType<typeof readFocusSession>>,
  record: ShadowProcessedRecord,
): boolean {
  if (record.category === "CRITICAL") {
    return false;
  }

  if (isKakaoNotification(record) && session.absorbKakao) {
    return true;
  }
  if (isEmailNotification(record) && session.absorbEmail) {
    return true;
  }

  return session.absorbDistractions;
}

/** Write-path — force shadow route while focus session is active. */
export function applyFocusSessionRouteOverride(
  record: ShadowProcessedRecord,
): ShadowProcessedRecord {
  if (!isFocusSessionRunning()) {
    return record;
  }

  const session = readFocusSession();
  if (!session || session.status !== "running") {
    return record;
  }

  if (record.reason.includes(FOCUS_ABSORB_REASON)) {
    return record;
  }

  if (!shouldAbsorbForFocus(session, record)) {
    return record;
  }

  return {
    ...record,
    route: "shadow",
    priority_score: Math.min(record.priority_score, ROUTE_THRESHOLDS.action_stream - 1),
    shadow_record: {
      store: true,
      expires_in_hours: 168,
    },
    reason: `${record.reason} · ${FOCUS_ABSORB_REASON}`,
  };
}

export function registerFocusHeldShadow(record: ShadowProcessedRecord) {
  if (!isFocusSessionRunning()) {
    return;
  }
  if (!record.reason.includes(FOCUS_ABSORB_REASON)) {
    return;
  }
  appendHeldShadowId(record.id);
}
