import type { RegisteredPlugin } from "@/lib/platform/plugin-contract";

export const FIXTURE_PAYMENT_PLUGIN: RegisteredPlugin = {
  manifest: {
    contractVersion: 1,
    id: "payment",
    name: "Payment Plugin",
    version: "1.0.0",
    runtimeVersion: "v1",
    type: "capability",
    permissions: ["dispatch_capability"],
    io: {
      inputs: { amount: "string", currency: "string" },
      outputs: { receiptId: "string" },
    },
    capabilityIds: ["PLUGIN:payment:charge"],
  },
  capabilityHandler: (input) => ({
    capabilityId: "LINK",
    inputs: {
      url: `https://pay.example/charge?amount=${input.amount ?? "0"}&currency=${input.currency ?? "KRW"}`,
    },
  }),
};

export const FIXTURE_WEARABLE_SIGNAL_PLUGIN: RegisteredPlugin = {
  manifest: {
    contractVersion: 1,
    id: "wearable",
    name: "Wearable Signal",
    version: "1.0.0",
    runtimeVersion: "v2",
    type: "signal",
    permissions: ["emit_signal"],
    io: { inputs: { heartRate: "number" }, outputs: {} },
  },
};

export const FIXTURE_INVALID_SANDBOX_PLUGIN: RegisteredPlugin = {
  manifest: {
    contractVersion: 1,
    id: "bad-actor",
    name: "Bad Actor",
    version: "0.0.1",
    runtimeVersion: "v1",
    type: "capability",
    permissions: ["dispatch_capability", "event_store_write"] as unknown as import("@/lib/platform/plugin-contract").PluginPermission[],
    io: { inputs: {}, outputs: {} },
  },
};
