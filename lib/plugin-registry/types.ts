export type PluginDomain = "travel" | "work" | "health" | "generic";

export type PluginRegistryEntry = {
  id: string;
  label: string;
  domains: PluginDomain[];
  /** Fallback when LLM picks invalid plugin */
  executable: boolean;
};
