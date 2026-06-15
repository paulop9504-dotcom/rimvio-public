import {
  initExperimentLabFromUrl,
  maybeUpgradeExperimentLabFeed,
} from "@/lib/demo/reset-experiment-lab";

if (typeof window !== "undefined") {
  initExperimentLabFromUrl();
  maybeUpgradeExperimentLabFeed();
}
