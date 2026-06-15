export type EntityQuickPickOption = {
  id: string;
  label: string;
  prompt: string;
};

export type EntityQuickPickWire = {
  entity: string;
  lead: string;
  options: EntityQuickPickOption[];
};
