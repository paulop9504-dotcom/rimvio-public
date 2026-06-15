import { tryExtractActionEventFromMessage } from "../lib/action-event-registry/extract-action-event-from-message";
import { orchestrateTemporalSchedule } from "../lib/global-brain/orchestrate-temporal-schedule";
import { orchestrateTimeDecision } from "../lib/time-decision/orchestrate-time-decision";
import { tryPlaceConfirmation } from "../lib/action-chat/confirmation-logic";
import { resolveTemporalExpression } from "../lib/time/temporal-resolver";

const msg = "내일 치과 있는데";
const ref = "2026-05-31";

console.log("temporal", resolveTemporalExpression({ message: msg, referenceDate: ref }));
console.log("extract", tryExtractActionEventFromMessage({ message: msg, referenceDate: ref }));
console.log("temporalOrch", orchestrateTemporalSchedule({ message: msg, referenceDate: ref })?.summary?.slice(0, 80));
console.log("timeDecision", orchestrateTimeDecision({ message: msg, referenceDate: ref, now: new Date(`${ref}T10:00:00`) })?.summary?.slice(0, 80));
console.log("placeConfirm", tryPlaceConfirmation({ message: msg, referenceDate: ref })?.summary?.slice(0, 80));
