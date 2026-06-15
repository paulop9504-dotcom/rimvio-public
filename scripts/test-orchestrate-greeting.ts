import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";

async function main() {
  for (const message of ["안녕", "배고파"]) {
    try {
      const result = await orchestrateUserMessage({
        message,
        masterContext: {
          currentDate: "2026-05-31",
          trustLevel: "L1",
          existingSchedule: [],
          allReminders: [],
          userGoals: [],
          activitySources: [],
          conversationMemories: [],
          activeContainers: [],
          activeChains: [],
          activeChain: null,
          userDefinedActions: [],
          mapApp: "kakao",
        },
      });
      console.log(message, "OK", result.summary);
    } catch (error) {
      console.log(message, "ERR", error);
    }
  }
}

void main();
