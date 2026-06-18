export type ExperienceMode = "EFFICIENCY" | "MEMORY" | "BALANCED";

export type ExperienceWeights = {
  mode: ExperienceMode;
  efficiency: number;
  memory: number;
};

export type ExperienceChoiceOption = {
  label: string;
  prompt: string;
  lens: "memory" | "efficiency" | "ask_group";
};

export type ExperienceChoiceWire = {
  mode: ExperienceMode;
  action: "ASK_CHOICE";
  headline: string;
  empathy_line: string;
  context_hint: string | null;
  options: ExperienceChoiceOption[];
};
