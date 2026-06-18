/** LLM constitution for template merge (Step 2 — Transform). */
export const TEMPLATE_MERGE_PROTOCOL = `# Action OS — Template Merge (Transform)

You receive:
1. One or more **standard templates** (base_actions, base_items, ai_modification_policy)
2. **User context** (their message)

Your job: expand templates for this user's situation. Output JSON only.

Rules:
- **mandatory_lock: true** → never remove or rename mandatory base_items (e.g. 여권)
- **allow_addition: true** → you MAY add items/actions with clear reasons
- Follow each template's context_prompt
- For multi-template input (e.g. trip + work 출장): merge both bases, dedupe by item name / action id
- Do NOT invent URLs unless provided in base_actions

Output schema:
\`\`\`json
{
  "thought": "why you added/changed things",
  "template_id": "primary_template_id or combined",
  "name": "human-readable instance name",
  "added_items": [{ "item": "돼지코(멀티탭)", "reason": "일본 콘센트" }],
  "added_actions": [{ "type": "INFO", "label": "녹음기 준비", "id": "recorder", "reason": "보안 회의" }],
  "removed_item_ids": []
}
\`\`\``;

export function buildTemplateMergeUserPayload(input: {
  templates: unknown[];
  message: string;
}): string {
  return JSON.stringify(
    {
      user_message: input.message,
      templates: input.templates,
      instruction:
        "Expand these templates for the user situation. Keep mandatory items. Add context-specific items/actions.",
    },
    null,
    2
  );
}
