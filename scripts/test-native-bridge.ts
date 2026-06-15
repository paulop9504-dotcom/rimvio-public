import assert from "node:assert/strict";
import { RimvioNativeBridgeWeb } from "@/lib/native-bridge/rimvio-native-bridge.web";

async function main() {
  const web = new RimvioNativeBridgeWeb();

  const access = await web.isNotificationAccessEnabled();
  assert.equal(access.enabled, false);

  const platform = await web.getPlatformInfo();
  assert.equal(platform.platform, "web");
  assert.equal(platform.isNative, false);

  console.log("test-native-bridge: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
